/**
 * Puppeteer resolver state-machine tests (production Reel fix).
 *
 * Proves the settle/wait and failure-classification rules that decide
 * whether a public Reel resolves or fails in serverless production:
 *
 *  1. A healthy loaded page (HTTP 200, no login wall, no challenge, browser
 *     alive) keeps the COMPLETE configured settle budget even when zero
 *     media has been observed yet. Cutting it to 3000ms on
 *     "no-media-signals" killed public Reels whose video graph hydrated
 *     later — this is the production regression test.
 *  2. A page that already declares itself blocked gets only a short grace.
 *  3. "No video yet, no block evidence" classifies as TEMPORARY_NO_MEDIA —
 *     never CONTENT_UNAVAILABLE — and maps to the existing retryable codes.
 *  4. The empty-shell decision tree needs positive evidence for every
 *     non-retryable branch (stale credential / proven redirect-home).
 *  5. The controlled second extraction attempt is bounded by the resolve
 *     deadline with room kept for assembly/verification.
 */
import { describe, it, expect } from "vitest";
import {
  decideSettleBudget,
  classifyResolutionState,
  secondAttemptBudgetMs,
  decideEmptyShellError,
  assemblyFailureStage,
  shouldAttemptRedirectFallback,
  isRedirectSafeCandidate,
  classifyNormalizationRejection,
  parseEmbeddedByteWindow,
  responseMatchesEmbeddedWindow,
  mapWithLimit,
  FALLBACK_NAV_TIMEOUT_MS,
  MIN_FALLBACK_REMAINING_MS,
  LAUNCH_TIMEOUT_MS,
  RESOLVE_DEADLINE_MS,
} from "@/lib/providers/puppeteer.js";

describe("puppeteer settle budget", () => {
  it("healthy page with no media signals keeps the FULL budget (production regression)", () => {
    // The exact production failure: pageStatus 200, loginWall false,
    // challenge false, zero intercepted media — the old code shortened
    // 12000ms to 3000ms here and the Reel never had time to hydrate.
    const decision = decideSettleBudget(false, 12_000);
    expect(decision.budgetMs).toBe(12_000);
    expect(decision.reason).toBe("full-budget");
    expect(decision.budgetMs).toBeGreaterThan(3000);
  });

  it("healthy page WITH early signals also keeps the full budget", () => {
    // The decision is gate-based, not signal-based: posters present must
    // never shorten the video-graph wait.
    expect(decideSettleBudget(false, 12_000)).toEqual({
      budgetMs: 12_000,
      reason: "full-budget",
    });
  });

  it("declared block gets only a short grace, never the full budget", () => {
    const decision = decideSettleBudget(true, 12_000);
    expect(decision.reason).toBe("blocked-state");
    expect(decision.budgetMs).toBe(2000);
  });

  it("blocked grace respects a smaller configured budget", () => {
    expect(decideSettleBudget(true, 1500).budgetMs).toBe(1500);
  });

  it("custom full budgets are honored for healthy pages", () => {
    expect(decideSettleBudget(false, 8000).budgetMs).toBe(8000);
    expect(decideSettleBudget(false, 30_000).budgetMs).toBe(30_000);
  });
});

describe("resolution state classification", () => {
  it("login wall wins over everything (positive evidence)", () => {
    expect(
      classifyResolutionState({ loginWall: true, challenge: true, unavailable: true, emptyShell: false })
    ).toBe("LOGIN_REQUIRED");
  });

  it("challenge is distinguished from login wall", () => {
    expect(
      classifyResolutionState({ loginWall: false, challenge: true, unavailable: false, emptyShell: false })
    ).toBe("CHALLENGE");
  });

  it("explicit unavailable message is a content verdict", () => {
    expect(
      classifyResolutionState({ loginWall: false, challenge: false, unavailable: true, emptyShell: false })
    ).toBe("CONTENT_UNAVAILABLE");
  });

  it("private hint refines unavailable to PRIVATE_CONTENT", () => {
    expect(
      classifyResolutionState({
        loginWall: false,
        challenge: false,
        unavailable: true,
        emptyShell: false,
        privateHint: true,
      })
    ).toBe("PRIVATE_CONTENT");
  });

  it("empty shell with no gate is TEMPORARY, never unavailable", () => {
    expect(
      classifyResolutionState({ loginWall: false, challenge: false, unavailable: false, emptyShell: true })
    ).toBe("TEMPORARY_NO_MEDIA");
  });

  it("clean but videoless page is TEMPORARY, never unavailable", () => {
    expect(
      classifyResolutionState({ loginWall: false, challenge: false, unavailable: false, emptyShell: false })
    ).toBe("TEMPORARY_NO_MEDIA");
  });
});

describe("second attempt budget", () => {
  it("fresh resolve gets the full second-attempt cap", () => {
    expect(secondAttemptBudgetMs(0, 45_000)).toBe(2000);
  });

  it("never reaches past the deadline: reserves room for assembly", () => {
    expect(secondAttemptBudgetMs(41_000, 45_000)).toBe(1000);
    expect(secondAttemptBudgetMs(43_000, 45_000)).toBe(0);
    expect(secondAttemptBudgetMs(60_000, 45_000)).toBe(0);
  });

  it("honors custom caps", () => {
    expect(secondAttemptBudgetMs(0, 45_000, 5000)).toBe(5000);
    // remaining (10000 - 3000) still covers the custom 5000 cap.
    expect(secondAttemptBudgetMs(0, 10_000, 5000)).toBe(5000);
    // ...but a nearer deadline clamps it.
    expect(secondAttemptBudgetMs(8000, 10_000, 5000)).toBe(0);
  });
});

describe("empty-shell decision tree", () => {
  it("stale credential needs no other evidence", () => {
    expect(
      decideEmptyShellError({ sessionConfigured: true, sessionAccepted: false, redirectHome: false })
    ).toEqual({ code: "INSTAGRAM_AUTH_INVALID", stage: "assembly-session-rejected" });
  });

  it("bounced home WITH proven session is genuinely not found", () => {
    expect(
      decideEmptyShellError({ sessionConfigured: true, sessionAccepted: true, redirectHome: true })
    ).toEqual({ code: "CONTENT_NOT_FOUND", stage: "assembly-empty-shell-redirect-home" });
  });

  it("bounced home WITHOUT proof stays retryable unavailable", () => {
    expect(
      decideEmptyShellError({ sessionConfigured: false, sessionAccepted: null, redirectHome: true })
    ).toEqual({ code: "CONTENT_UNAVAILABLE", stage: "assembly-empty-shell-redirect-home" });
  });

  it("rejected session without a configured session cannot blame credentials", () => {
    // First branch requires sessionConfigured: an anonymous resolve that
    // bounced home is retryable, never an auth verdict.
    expect(
      decideEmptyShellError({ sessionConfigured: false, sessionAccepted: false, redirectHome: true })
    ).toEqual({ code: "CONTENT_UNAVAILABLE", stage: "assembly-empty-shell-redirect-home" });
  });

  it("plain empty shell is the retryable infra code, never a content verdict", () => {
    const decision = decideEmptyShellError({
      sessionConfigured: false,
      sessionAccepted: null,
      redirectHome: false,
    });
    expect(decision).toEqual({ code: "EMPTY_INSTAGRAM_SHELL", stage: "assembly-empty-shell" });
    expect(decision.code).not.toBe("CONTENT_UNAVAILABLE");
  });
});

describe("assembly failure stage", () => {
  it("block evidence keeps the historic stage", () => {
    expect(assemblyFailureStage(true)).toBe("assembly-no-playable-video");
  });

  it("no gate means temporary-no-media (retryable, never 'currently unavailable')", () => {
    expect(assemblyFailureStage(false)).toBe("assembly-temporary-no-media");
  });
});

describe("redirect fallback decision", () => {
  it("bounced Reel with healthy session and budget earns one retry", () => {
    expect(
      shouldAttemptRedirectFallback({ redirectedAway: true, sessionRejected: false, remainingMs: 30_000 })
    ).toBe(true);
  });

  it("no bounce means no fallback", () => {
    expect(
      shouldAttemptRedirectFallback({ redirectedAway: false, sessionRejected: false, remainingMs: 30_000 })
    ).toBe(false);
  });

  it("rejected session cannot be fixed by re-navigation", () => {
    expect(
      shouldAttemptRedirectFallback({ redirectedAway: true, sessionRejected: true, remainingMs: 30_000 })
    ).toBe(false);
  });

  it("insufficient remaining budget skips the fallback (fast verdict instead)", () => {
    expect(
      shouldAttemptRedirectFallback({
        redirectedAway: true,
        sessionRejected: false,
        remainingMs: MIN_FALLBACK_REMAINING_MS - 1,
      })
    ).toBe(false);
    expect(
      shouldAttemptRedirectFallback({
        redirectedAway: true,
        sessionRejected: false,
        remainingMs: MIN_FALLBACK_REMAINING_MS,
      })
    ).toBe(true);
  });

  it("fallback navigation cap is serverless-safe", () => {
    expect(FALLBACK_NAV_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
    expect(MIN_FALLBACK_REMAINING_MS).toBeGreaterThan(FALLBACK_NAV_TIMEOUT_MS);
  });
});

describe("candidate normalization rejection (trust gate, no extension rule)", () => {
  it("rejects non-http schemes without fetching", () => {
    expect(classifyNormalizationRejection("blob:https://example.com/x")).toBe("non-http-url");
    expect(classifyNormalizationRejection("data:video/mp4;base64,AAAA")).toBe("non-http-url");
    expect(classifyNormalizationRejection("javascript:alert(1)")).toBe("non-http-url");
  });

  it("rejects localhost/private/loopback hosts", () => {
    expect(classifyNormalizationRejection("https://localhost/x.mp4")).toBe("localhost-or-private-url");
    expect(classifyNormalizationRejection("https://127.0.0.1/x.mp4")).toBe("localhost-or-private-url");
    expect(classifyNormalizationRejection("https://10.0.0.1/x.mp4")).toBe("localhost-or-private-url");
    expect(classifyNormalizationRejection("https://192.168.1.10/x.mp4")).toBe("localhost-or-private-url");
  });

  it("rejects credential-bearing URLs", () => {
    expect(classifyNormalizationRejection("https://user:pass@cdn.example.com/x.mp4")).toBe(
      "credential-url"
    );
  });

  it("does not reject valid CDN URLs (extension-less included)", () => {
    // "invalid-url" here means "no normalization rejection" — these pass to
    // content verification, which never requires a .mp4 extension.
    expect(
      classifyNormalizationRejection("https://scontent-iad3-2.xx.fbcdn.net/o1/v/t16/clip?sig=a")
    ).toBe("invalid-url");
    expect(classifyNormalizationRejection("not a url")).toBe("invalid-url");
  });
});

describe("embedded byte-window parsing", () => {
  it("reads a sane window", () => {
    expect(
      parseEmbeddedByteWindow("https://cdn.example.com/v/a.mp4?oh=1&bytestart=824&byteend=927")
    ).toEqual({ start: 824, end: 927 });
  });

  it("rejects missing, malformed, or inverted windows", () => {
    expect(parseEmbeddedByteWindow("https://cdn.example.com/v/a.mp4?oh=1")).toBeNull();
    expect(parseEmbeddedByteWindow("https://cdn.example.com/v/a.mp4?bytestart=824")).toBeNull();
    expect(parseEmbeddedByteWindow("https://cdn.example.com/v/a.mp4?bytestart=x&byteend=927")).toBeNull();
    expect(parseEmbeddedByteWindow("https://cdn.example.com/v/a.mp4?bytestart=927&byteend=824")).toBeNull();
    expect(parseEmbeddedByteWindow("not a url")).toBeNull();
  });
});

describe("slice-symptom detection", () => {
  const headers = (entries: Record<string, string>) => ({
    get: (name: string) => entries[name.toLowerCase()] ?? null,
  });

  it("matches a 206 carrying exactly the window", () => {
    expect(
      responseMatchesEmbeddedWindow(
        { status: 206, headers: headers({ "content-range": "bytes 824-927/200000" }) },
        { start: 824, end: 927 }
      )
    ).toBe(true);
  });

  it("rejects a 206 answering the real range", () => {
    expect(
      responseMatchesEmbeddedWindow(
        { status: 206, headers: headers({ "content-range": "bytes 0-65535/200000" }) },
        { start: 824, end: 927 }
      )
    ).toBe(false);
  });

  it("matches a 200 whose body is exactly the window length", () => {
    expect(
      responseMatchesEmbeddedWindow(
        { status: 200, headers: headers({ "content-length": "104" }) },
        { start: 824, end: 927 }
      )
    ).toBe(true);
  });

  it("rejects full 200 bodies and rangeless 206s", () => {
    expect(
      responseMatchesEmbeddedWindow(
        { status: 200, headers: headers({ "content-length": "200000" }) },
        { start: 824, end: 927 }
      )
    ).toBe(false);
    expect(
      responseMatchesEmbeddedWindow({ status: 206, headers: headers({}) }, { start: 824, end: 927 })
    ).toBe(false);
  });
});

describe("bounded fan-out", () => {
  it("caps parallelism and preserves order", async () => {
    let live = 0;
    let peak = 0;
    const out = await mapWithLimit([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, async (n) => {
      live++;
      peak = Math.max(peak, live);
      await new Promise((r) => setTimeout(r, 5));
      live--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it("handles empty input and oversized limits", async () => {
    expect(await mapWithLimit([], 4, async (n: number) => n)).toEqual([]);
    expect(await mapWithLimit([1, 2], 10, async (n: number) => n + 1)).toEqual([2, 3]);
  });
});

describe("timeout hierarchy invariants", () => {
  it("launch budget defaults leave room for page work inside the deadline", () => {
    expect(LAUNCH_TIMEOUT_MS).toBe(30_000);
    expect(RESOLVE_DEADLINE_MS).toBe(45_000);
    expect(LAUNCH_TIMEOUT_MS).toBeLessThan(RESOLVE_DEADLINE_MS);
  });
});

describe("redirect-safe candidates", () => {
  it("prefetch seeds (requested-URL evidence) stay eligible after a bounce", () => {
    expect(isRedirectSafeCandidate("prefetch-og")).toBe(true);
    expect(isRedirectSafeCandidate("prefetch-embed")).toBe(true);
  });

  it("bounced-document evidence is never eligible, even when verified", () => {
    expect(isRedirectSafeCandidate("network-video-response")).toBe(false);
    expect(isRedirectSafeCandidate("dom")).toBe(false);
    expect(isRedirectSafeCandidate("video-graph")).toBe(false);
    expect(isRedirectSafeCandidate("api-json")).toBe(false);
    expect(isRedirectSafeCandidate("rendered-html")).toBe(false);
    expect(isRedirectSafeCandidate(undefined)).toBe(false);
  });
});
