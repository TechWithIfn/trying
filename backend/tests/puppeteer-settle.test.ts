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
