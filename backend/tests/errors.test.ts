import { describe, it, expect } from "vitest";
import { AppError, ERRORS, createError, createErrorResponse, withRequestDiagnostics } from "@/lib/errors";

describe("ERRORS", () => {
  it("has entries for all error codes", () => {
    const codes = [
      "INVALID_URL",
      "UNSUPPORTED_URL",
      "CONTENT_NOT_FOUND",
      "CONTENT_UNAVAILABLE",
      "UNSUPPORTED_CONTENT",
      "RESOLVER_ERROR",
      "RATE_LIMITED",
      "TEMPORARY_ERROR",
      "PROVIDER_UNAVAILABLE",
      "VALIDATION_ERROR",
      "REQUEST_TOO_LARGE",
    ] as const;

    for (const code of codes) {
      expect(ERRORS[code]).toBeDefined();
      expect(ERRORS[code].message).toBeTruthy();
      expect(ERRORS[code].status).toBeGreaterThan(0);
    }
  });
});

describe("createError", () => {
  it("creates an AppError with correct properties", () => {
    const error = createError("INVALID_URL");
    expect(error.code).toBe("INVALID_URL");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("The URL provided is not a valid Instagram link.");
  });

  it("creates a toResponse method", () => {
    const error = createError("CONTENT_NOT_FOUND");
    const response = error.toResponse();
    expect(response.success).toBe(false);
    expect(response.error.code).toBe("CONTENT_NOT_FOUND");
  });

  it("maps AUDIO_NO_SOURCE to a specific non-retryable audio error", () => {
    const error = createError("AUDIO_NO_SOURCE");
    expect(error.code).toBe("AUDIO_NO_SOURCE");
    expect(error.statusCode).toBe(502);
    const response = error.toResponse();
    expect(response.success).toBe(false);
    expect(response.error.retryable).toBe(false);
    expect(response.error.message).toContain("audio");
    expect(response.error.message).not.toBe("Audio extraction is currently unavailable. Please try again.");
  });

  it("maps VIDEO_SOURCE_NOT_FOUND to a retryable honest error", () => {
    const error = createError("VIDEO_SOURCE_NOT_FOUND");
    expect(error.statusCode).toBe(502);
    const response = error.toResponse();
    expect(response.success).toBe(false);
    expect(response.error.code).toBe("VIDEO_SOURCE_NOT_FOUND");
    expect(response.error.retryable).toBe(true);
    expect(response.error.message).toBeTruthy();
  });
});

describe("createErrorResponse", () => {
  it("returns a ResolveErrorResponse", () => {
    const response = createErrorResponse("RATE_LIMITED");
    expect(response.success).toBe(false);
    expect(response.error.code).toBe("RATE_LIMITED");
    expect(response.error.message).toBeTruthy();
  });

  it("omits diagnostics when no details are attached", () => {
    const response = createError("INVALID_URL").toResponse();
    expect(response.success).toBe(false);
    expect(response.error.diagnostics).toBeUndefined();
  });
});

describe("failure diagnostics", () => {
  it("carries safe stage details through toResponse", () => {
    const error = new AppError("VIDEO_SOURCE_NOT_FOUND", "video missing", 502, {
      provider: "puppeteer",
      runtime: "serverless",
      stage: "assembly-no-playable-video",
      pageStatus: 200,
      loginWall: false,
      challenge: false,
      interceptedMediaCount: 3,
      interceptedMediaTypes: ["image"],
      videoCandidateCount: 0,
      videoGraphFound: false,
      hydrationEntered: true,
      hydrationDurationMs: 12000,
      extractionAttempts: ["prefetch", "embed", "browser"],
      normalizedMediaCount: 3,
      normalizedMediaTypes: ["image"],
      totalDurationMs: 15000,
    });
    const response = error.toResponse();
    expect(response.error.code).toBe("VIDEO_SOURCE_NOT_FOUND");
    expect(response.error.diagnostics?.stage).toBe("assembly-no-playable-video");
    expect(response.error.diagnostics?.videoCandidateCount).toBe(0);
    expect(response.error.diagnostics?.hydrationEntered).toBe(true);
    const raw = JSON.stringify(response.error.diagnostics).toLowerCase();
    expect(raw).not.toContain("sessionid");
    expect(raw).not.toContain("cookie");
  });

  it("withRequestDiagnostics fills request scope without clobbering stage fields", () => {
    const error = new AppError("VIDEO_SOURCE_NOT_FOUND", "video missing", 502, {
      provider: "puppeteer",
      stage: "assembly-no-playable-video",
      videoCandidateCount: 0,
    });
    const merged = withRequestDiagnostics(error.toResponse(), {
      requestId: "req-1",
      build: "abc123",
      provider: "placeholder",
      totalDurationMs: 5,
    });
    expect(merged.error.diagnostics?.requestId).toBe("req-1");
    expect(merged.error.diagnostics?.build).toBe("abc123");
    // Provider stage fields win over request scope on conflict.
    expect(merged.error.diagnostics?.stage).toBe("assembly-no-playable-video");
    expect(merged.error.diagnostics?.videoCandidateCount).toBe(0);
    expect(merged.error.diagnostics?.provider).toBe("puppeteer");
  });
});
