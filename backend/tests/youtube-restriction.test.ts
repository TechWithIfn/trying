import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import {
  activeYouTubeRestrictionError,
  applyYouTubeRestriction,
  clearYouTubeRestriction,
  recordYouTubeRestriction,
  resetYouTubeRestrictionForTests,
  youtubeRestrictionSnapshot,
} from "@/lib/youtube/restriction";

const T0 = 1_000_000;

describe("YouTube restriction cooldown", () => {
  beforeEach(() => {
    resetYouTubeRestrictionForTests();
    vi.stubEnv("YOUTUBE_BOT_COOLDOWN_MS", "60000");
    vi.stubEnv("YOUTUBE_RATE_LIMIT_COOLDOWN_MS", "120000");
    vi.stubEnv("YOUTUBE_MAX_COOLDOWN_MS", "900000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetYouTubeRestrictionForTests();
  });

  it("arms a bot-check cooldown and blocks new extractions", () => {
    const recorded = recordYouTubeRestriction("YOUTUBE_BOT_CHECK", { now: T0, source: "probe" });
    expect(recorded?.retryAfterMs).toBe(60_000);

    const error = activeYouTubeRestrictionError({ requestId: "req-1", youtubeVideoId: "abc" }, T0);
    expect(error?.code).toBe("YOUTUBE_BOT_CHECK");
    expect(error?.statusCode).toBe(503);
    expect(error?.retryAfterMs).toBe(60_000);
    expect(error?.toResponse().error.retryAfterSeconds).toBe(60);

    const snapshot = youtubeRestrictionSnapshot(T0);
    expect(snapshot.active).toBe(true);
    expect(snapshot.kind).toBe("bot_check");
    expect(snapshot.retryAfterSeconds).toBe(60);
    expect(snapshot.consecutive).toBe(1);
  });

  it("escalates after the cooldown expires and the block recurs", () => {
    recordYouTubeRestriction("YOUTUBE_BOT_CHECK", { now: T0 });
    // Exactly at expiry the first window is over, so this is a new failure.
    const second = recordYouTubeRestriction("YOUTUBE_BOT_CHECK", { now: T0 + 60_000 });
    expect(second?.retryAfterMs).toBe(120_000);
    expect(second?.consecutive).toBe(2);
  });

  it("uses a longer base window for an explicit 429", () => {
    const recorded = recordYouTubeRestriction("YOUTUBE_RATE_LIMITED", { now: T0 });
    expect(recorded?.kind).toBe("rate_limited");
    expect(recorded?.retryAfterMs).toBe(120_000);
  });

  it("expires without clearing the escalation streak", () => {
    recordYouTubeRestriction("YOUTUBE_BOT_CHECK", { now: T0 });
    expect(activeYouTubeRestrictionError(undefined, T0 + 60_000)).toBeNull();
    expect(youtubeRestrictionSnapshot(T0 + 60_000).active).toBe(false);
    expect(youtubeRestrictionSnapshot(T0 + 60_000).consecutive).toBe(1);
  });

  it("clears state only on a real success", () => {
    recordYouTubeRestriction("YOUTUBE_BOT_CHECK", { now: T0 });
    clearYouTubeRestriction("probe");
    const snapshot = youtubeRestrictionSnapshot(T0);
    expect(snapshot.active).toBe(false);
    expect(snapshot.consecutive).toBe(0);
    expect(snapshot.clearedAt).not.toBeNull();
  });

  it("attaches the cooldown to a classified AppError", () => {
    const error = new AppError("YOUTUBE_BOT_CHECK", "blocked", 503);
    const applied = applyYouTubeRestriction(error, "download");
    expect(applied).toBe(error);
    expect(applied.retryAfterMs).toBe(60_000);
    expect(activeYouTubeRestrictionError()?.code).toBe("YOUTUBE_BOT_CHECK");
  });

  it("does not attach a cooldown to unrelated verdicts", () => {
    const error = new AppError("YOUTUBE_VIDEO_NOT_FOUND", "missing", 404);
    expect(applyYouTubeRestriction(error, "probe").retryAfterMs).toBeUndefined();
    expect(youtubeRestrictionSnapshot(T0).active).toBe(false);
  });
});
