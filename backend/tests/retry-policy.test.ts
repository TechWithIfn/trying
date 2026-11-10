import { describe, expect, it } from "vitest";
import { withRetry } from "@/lib/retry";

describe("withRetry Retry-After policy", () => {
  it("honors an upstream delay even when it exceeds maxDelayMs", async () => {
    const delays: number[] = [];
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          if (attempts < 2) throw new Error("busy");
          return "ok";
        },
        {
          attempts: 2,
          baseDelayMs: 1,
          maxDelayMs: 10,
          isRetryable: () => true,
          retryAfterMs: () => 50,
          onRetry: ({ delayMs }) => delays.push(delayMs),
        }
      )
    ).resolves.toBe("ok");

    // The upstream 50 ms floor must not be reduced to the 10 ms backoff cap.
    expect(delays).toEqual([50]);
  });

  it("still fails fast when the delay cannot fit the remaining budget", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error("busy");
        },
        {
          attempts: 3,
          baseDelayMs: 1,
          maxDelayMs: 10,
          isRetryable: () => true,
          retryAfterMs: () => 5_000,
          maxElapsedMs: 1_000,
        }
      )
    ).rejects.toThrow("busy");
    expect(attempts).toBe(1);
  });
});
