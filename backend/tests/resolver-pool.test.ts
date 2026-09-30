/**
 * 3-worker resolver load-manager tests.
 *
 * Covers, against isolated pools (explicit config, real timers) plus one
 * end-to-end pass through resolveUrl with a mocked provider:
 *  - least-loaded + threshold routing and 3-worker distribution;
 *  - immediate slot release, FIFO queue draining, bounded backpressure;
 *  - crash isolation with cooldown + half-open recovery (no endless restart,
 *    no job duplication);
 *  - job-timeout cleanup, caller-abort handling, shutdown semantics;
 *  - honest error propagation (throttling passes through unchanged, worker
 *    health untouched by ordinary resolver failures).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createResolverPool, resetPoolForTests, getResolverPool } from "@/lib/resolver-pool.js";
import { AppError, createError } from "@/lib/errors.js";

vi.mock("@/lib/providers/index.js", () => ({
  createProvider: vi.fn(),
}));

import { createProvider } from "@/lib/providers/index.js";
import { resolveUrl, resetResolver } from "@/lib/resolvers/index.js";
import type { ResolverResult } from "@/lib/types.js";

function deferred<T = string>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A job that runs until released; records its execution signal behavior. */
function heldJob() {
  const gate = deferred<string>();
  let calls = 0;
  const fn = vi.fn((_signal: AbortSignal) => {
    calls++;
    return gate.promise;
  });
  return { fn, gate, calls: () => calls };
}

describe("resolver pool routing", () => {
  afterEach(() => {
    resetPoolForTests();
    vi.unstubAllEnvs();
  });

  it("routes to worker 0 when all workers are idle (deterministic tiebreak)", () => {
    const pool = createResolverPool({ workerCount: 3, maxConcurrency: 2 });
    expect(pool.selectWorker()?.snapshot().id).toBe(0);
  });

  it("prefers the least-loaded worker and never waits for 100% first", async () => {
    const pool = createResolverPool({ workerCount: 3, maxConcurrency: 2, maxQueue: 4 });
    const a = heldJob();
    const b = heldJob();
    // Occupy worker 0 fully (2/2 = 100%) and worker 1 halfway (1/2 = 50%).
    const p1 = pool.run(a.fn);
    const p2 = pool.run(a.fn);
    const p3 = pool.run(b.fn);
    await new Promise((r) => setTimeout(r, 20));
    expect(pool.snapshot().totalActive).toBe(3);
    // Next job must land on idle worker 2, not behind worker 0 or 1.
    const c = heldJob();
    const p4 = pool.run(c.fn);
    await new Promise((r) => setTimeout(r, 20));
    const snap = pool.snapshot();
    expect(snap.workers[2].active).toBe(1);
    expect(snap.workers[0].active).toBe(2);
    expect(snap.workers[1].active).toBe(1);
    expect(snap.workers[2].loadPct).toBe(50);
    a.gate.resolve("a");
    b.gate.resolve("b");
    c.gate.resolve("c");
    await Promise.all([p1, p2, p3, p4]);
  });

  it("distributes 6 concurrent jobs 2/2/2 across 3 workers", async () => {
    const pool = createResolverPool({ workerCount: 3, maxConcurrency: 2 });
    const jobs = Array.from({ length: 6 }, () => heldJob());
    const pending = jobs.map((j) => pool.run(j.fn));
    await new Promise((r) => setTimeout(r, 20));
    const snap = pool.snapshot();
    expect(snap.totalActive).toBe(6);
    expect(snap.workers.map((w) => w.active)).toEqual([2, 2, 2]);
    // One worker can never take everything while others sit idle.
    expect(Math.max(...snap.workers.map((w) => w.active))).toBe(2);
    for (const j of jobs) j.gate.resolve("done");
    await Promise.all(pending);
    // Immediate release: every slot freed on completion, load back to zero.
    const after = pool.snapshot();
    expect(after.totalActive).toBe(0);
    expect(after.workers.every((w) => w.loadPct === 0)).toBe(true);
  });

  it("computes loadPct from real active + queued work", async () => {
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 2, maxQueue: 4 });
    expect(pool.snapshot().workers[0].loadPct).toBe(0);
    const a = heldJob();
    const p1 = pool.run(a.fn);
    await new Promise((r) => setTimeout(r, 10));
    expect(pool.snapshot().workers[0].loadPct).toBe(50);
    // Fill the worker, then queue one more: (2 active + 1 queued) / 2 → 100.
    const b = heldJob();
    const p2 = pool.run(b.fn);
    const c = heldJob();
    const p3 = pool.run(c.fn);
    await new Promise((r) => setTimeout(r, 10));
    expect(pool.snapshot().workers[0].loadPct).toBe(100);
    a.gate.resolve("a");
    b.gate.resolve("b");
    c.gate.resolve("c");
    await Promise.all([p1, p2, p3]);
  });
});

describe("resolver pool queues and backpressure", () => {
  afterEach(() => {
    resetPoolForTests();
  });

  it("drains queued jobs FIFO immediately on release (no cooldown delay)", async () => {
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 1, maxQueue: 4 });
    const order: string[] = [];
    const first = heldJob();
    const p1 = pool.run(async () => {
      order.push("first-start");
      await first.gate.promise;
      order.push("first-end");
      return "first";
    });
    const p2 = pool.run(async () => {
      order.push("second-start");
      return "second";
    });
    const p3 = pool.run(async () => {
      order.push("third-start");
      return "third";
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(pool.snapshot().workers[0].queued).toBe(2);
    first.gate.resolve("go");
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect([r1, r2, r3]).toEqual(["first", "second", "third"]);
    expect(order).toEqual(["first-start", "first-end", "second-start", "third-start"]);
    expect(pool.snapshot().totalActive).toBe(0);
    expect(pool.snapshot().totalQueued).toBe(0);
  });

  it("refuses with 503 CAPACITY_EXHAUSTED when every queue is full, keeps running jobs", async () => {
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 1, maxQueue: 1 });
    const running = heldJob();
    const p1 = pool.run(running.fn);
    const queued = heldJob();
    const p2 = pool.run(queued.fn);
    await new Promise((r) => setTimeout(r, 10));
    // Active 1 + queued 1 = full: the next job gets honest backpressure.
    let code: string | null = null;
    let status = 0;
    await pool.run(async () => "never").catch((err: unknown) => {
      if (err instanceof AppError) {
        code = err.code;
        status = err.statusCode;
      }
    });
    expect(code).toBe("CAPACITY_EXHAUSTED");
    expect(status).toBe(503);
    // The running and queued jobs are untouched by the refusal.
    running.gate.resolve("run");
    queued.gate.resolve("queue");
    await expect(p1).resolves.toBe("run");
    await expect(p2).resolves.toBe("queue");
  });

  it("aborts a queued wait on caller disconnect without disturbing others", async () => {
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 1, maxQueue: 4 });
    const running = heldJob();
    const p1 = pool.run(running.fn);
    await new Promise((r) => setTimeout(r, 10));
    const controller = new AbortController();
    const p2 = pool.run(
      async () => "cancelled",
      { signal: controller.signal }
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(pool.snapshot().workers[0].queued).toBe(1);
    controller.abort();
    await expect(p2).rejects.toMatchObject({ code: "CAPACITY_EXHAUSTED" });
    expect(pool.snapshot().workers[0].queued).toBe(0);
    running.gate.resolve("run");
    await expect(p1).resolves.toBe("run");
  });
});

describe("resolver pool worker health", () => {
  afterEach(() => {
    resetPoolForTests();
  });

  function crashError(): Error {
    // Raw browser-transport death, as Puppeteer surfaces it before mapping.
    const err = new Error("Connection closed.");
    err.name = "ConnectionClosedError";
    return err;
  }

  it("isolates a crashed worker, routes around it, and recovers after cooldown", async () => {
    const pool = createResolverPool({
      workerCount: 2,
      maxConcurrency: 1,
      recoverCooldownMs: 40,
      maxRecoverMs: 40,
    });
    // Occupy worker 0 so the crashing job is forced onto worker 1.
    const busy = heldJob();
    const pBusy = pool.run(busy.fn);
    await new Promise((r) => setTimeout(r, 10));
    // Crash worker 1 with a raw transport death.
    await expect(pool.run(async () => {
      throw crashError();
    })).rejects.toThrow("Connection closed.");
    let snap = pool.snapshot();
    const crashed = snap.workers.find((w) => !w.healthy);
    expect(crashed).toBeDefined();
    expect(crashed!.consecutiveFailures).toBe(1);

    // While unhealthy, all new work avoids it.
    const probe = heldJob();
    const pProbe = pool.run(probe.fn);
    await new Promise((r) => setTimeout(r, 10));
    snap = pool.snapshot();
    expect(snap.workers.find((w) => w.id === crashed!.id)!.active).toBe(0);

    // After cooldown the crashed worker is eligible again: pin worker 0 busy
    // so the next job is forced onto it as a half-open trial, and it heals
    // on success. (The probe is queued behind busy, so busy must resolve
    // first — awaiting the queued job before freeing its worker deadlocks.)
    await new Promise((r) => setTimeout(r, 60));
    busy.gate.resolve("busy");
    await pBusy;
    probe.gate.resolve("probe");
    await pProbe;
    const busyAgain = heldJob();
    const pBusyAgain = pool.run(busyAgain.fn);
    await new Promise((r) => setTimeout(r, 10));
    const healed = heldJob();
    const pHealed = pool.run(healed.fn);
    await new Promise((r) => setTimeout(r, 10));
    snap = pool.snapshot();
    expect(snap.workers.find((w) => w.id === crashed!.id)!.active).toBe(1);
    healed.gate.resolve("healed");
    await pHealed;
    busyAgain.gate.resolve("busy-again");
    await pBusyAgain;
    snap = pool.snapshot();
    expect(snap.workers.every((w) => w.healthy)).toBe(true);
    expect(snap.workers.every((w) => w.consecutiveFailures === 0)).toBe(true);
  });

  it("never retries a crashed job: one admission means one execution", async () => {
    const pool = createResolverPool({ workerCount: 3, maxConcurrency: 2 });
    const fn = vi.fn(async (_signal: AbortSignal): Promise<string> => {
      throw crashError();
    });
    await expect(pool.run(fn)).rejects.toThrow("Connection closed.");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("ordinary resolver failures do not sideline a worker", async () => {
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 1 });
    await expect(pool.run(async () => {
      throw createError("CONTENT_NOT_FOUND");
    })).rejects.toMatchObject({ code: "CONTENT_NOT_FOUND" });
    await expect(pool.run(async () => {
      throw createError("PROVIDER_UNAVAILABLE");
    })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    const snap = pool.snapshot();
    expect(snap.workers[0].healthy).toBe(true);
    expect(snap.workers[0].failed).toBe(2);
    expect(snap.workers[0].consecutiveFailures).toBe(0);
  });

  it("passes upstream throttling through unchanged (never relabelled)", async () => {
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 1 });
    await expect(pool.run(async () => {
      throw createError("INSTAGRAM_RATE_LIMITED");
    })).rejects.toMatchObject({ code: "INSTAGRAM_RATE_LIMITED", statusCode: 429 });
    expect(pool.snapshot().workers[0].healthy).toBe(true);
  });
});

describe("resolver pool timeouts, shutdown and validation", () => {
  afterEach(() => {
    resetPoolForTests();
  });

  it("answers PROVIDER_TIMEOUT at budget while slow work detaches, then frees the slot", async () => {
    // Detach semantics (mirrors the route-level RESOLVER_TIMEOUT race): the
    // caller is answered at the budget, but the abandoned work is NOT killed
    // — it keeps running so a slow resolve still warms the cache, and the
    // slot frees honestly when the work actually settles.
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 1, jobTimeoutMs: 60 });
    const releaseWork = deferred<string>();
    const started = Date.now();
    const p = pool.run(async () => {
      await releaseWork.promise;
      return "late-success";
    });
    await expect(p).rejects.toMatchObject({ code: "PROVIDER_TIMEOUT", statusCode: 504 });
    expect(Date.now() - started).toBeLessThan(5000);
    // Slot honestly occupied while the detached work still runs...
    expect(pool.snapshot().workers[0].active).toBe(1);
    releaseWork.resolve("late-success");
    await new Promise((r) => setTimeout(r, 20));
    // ...then freed on settle, with the late success counted.
    const snap = pool.snapshot();
    expect(snap.workers[0].active).toBe(0);
    expect(snap.workers[0].loadPct).toBe(0);
    expect(snap.workers[0].completed).toBe(1);
  });

  it("shutdown refuses new and queued work with 503 but lets running jobs finish", async () => {
    const pool = createResolverPool({ workerCount: 1, maxConcurrency: 1, maxQueue: 4 });
    const running = heldJob();
    const p1 = pool.run(running.fn);
    await new Promise((r) => setTimeout(r, 10));
    const queued = heldJob();
    const p2 = pool.run(queued.fn);
    await new Promise((r) => setTimeout(r, 10));

    pool.shutdown();
    expect(pool.snapshot().draining).toBe(true);
    // Queued work is refused immediately — answered, never dropped silently.
    await expect(p2).rejects.toMatchObject({ code: "SERVER_SHUTTING_DOWN", statusCode: 503 });
    // Brand-new work is refused too.
    await expect(pool.run(async () => "new")).rejects.toMatchObject({ code: "SERVER_SHUTTING_DOWN" });
    // The running job still completes normally.
    running.gate.resolve("run");
    await expect(p1).resolves.toBe("run");
    expect(queued.calls()).toBe(0);
  });

  it("rejects invalid input without touching worker state", async () => {
    const pool = createResolverPool({ workerCount: 3, maxConcurrency: 2 });
    await expect(pool.run("nope" as unknown as () => Promise<string>)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(pool.snapshot().totalActive).toBe(0);
  });

  it("distributes concurrent resolveUrl calls across workers with no duplicates", async () => {
    // End-to-end through the real resolveUrl (cache + coalescing + pool):
    // three DISTINCT urls resolve concurrently with a held provider, so all
    // three must be admitted simultaneously — one per worker — and each
    // provider call happens exactly once.
    resetResolver();
    resetPoolForTests();
    const urls = [
      "https://www.instagram.com/reel/PoolDist001/",
      "https://www.instagram.com/reel/PoolDist002/",
      "https://www.instagram.com/reel/PoolDist003/",
    ];
    const gates = new Map<string, { resolve: (v: ResolverResult) => void }>();
    let providerCalls = 0;
    vi.mocked(createProvider).mockReturnValue({
      name: "test-mock",
      resolve: vi.fn((url: string) => {
        providerCalls++;
        return new Promise<ResolverResult>((resolve) => {
          gates.set(url, { resolve });
        });
      }),
    } as never);

    const pending = urls.map((url) => resolveUrl(url));
    const deadline = Date.now() + 5000;
    while (providerCalls < 3 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(providerCalls).toBe(3);

    const snap = getResolverPool().snapshot();
    expect(snap.totalActive).toBe(3);
    // Exactly one job per worker: no worker takes two while another is idle,
    // and no URL resolved twice (no duplicate Instagram work).
    expect(snap.workers.map((w) => w.active)).toEqual([1, 1, 1]);

    const mkResult = (url: string): ResolverResult => ({
      type: "REEL",
      sourceUrl: url,
      thumbnail: null,
      title: null,
      author: null,
      media: [],
    });
    for (const url of urls) gates.get(url)!.resolve(mkResult(url));
    const results = await Promise.all(pending);
    expect(results.map((r) => r.sourceUrl).sort()).toEqual([...urls].sort());
    expect(providerCalls).toBe(3);
    // Immediate release on completion: load back to zero, no stuck slots.
    expect(getResolverPool().snapshot().totalActive).toBe(0);
    resetPoolForTests();
    resetResolver();
  }, 20_000);

  it("exposes a sanitized snapshot (counts only, no URLs or secrets)", () => {
    const pool = createResolverPool({ workerCount: 3, maxConcurrency: 2, maxQueue: 4 });
    const snap = pool.snapshot();
    expect(snap.workerCount).toBe(3);
    expect(snap.loadThreshold).toBe(85);
    expect(snap.workers).toHaveLength(3);
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toMatch(/http|session|cookie|token/i);
    for (const w of snap.workers) {
      expect(w).toMatchObject({
        active: 0,
        queued: 0,
        capacity: 2,
        maxQueue: 4,
        loadPct: 0,
        healthy: true,
      });
    }
  });
});
