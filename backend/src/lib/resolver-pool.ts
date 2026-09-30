import { AppError, createError, isConnectionLostError } from "./errors.js";
import { logger } from "./logger.js";
import { readBoundedInt, readNonNegativeInt, readPositiveInt } from "./env.js";
import { isDraining, registerCleanup } from "./shutdown.js";
import type { ResolverPoolSnapshot, ResolverWorkerSnapshot } from "./types.js";

/**
 * Centralized 3-worker load manager for the Instagram/Puppeteer resolver.
 *
 * Shape:
 *   resolveUrl → (cache → in-flight coalescing) → pool.run(fn) → provider.resolve
 *
 * This is deliberately NOT three independent Puppeteer processes. Workers are
 * admission lanes over the existing shared provider/browser infrastructure
 * (which keeps its own page-slot gate, per-resolve deadline, session handling
 * and timeouts untouched). The pool adds what the flat provider gate could
 * not express:
 *
 *  - least-loaded routing across exactly WORKER_COUNT lanes (default 3),
 *  - per-worker bounded queues with controlled 503 backpressure,
 *  - per-worker health with crash cooldown and half-open recovery,
 *  - a job execution bound (WORKER_JOB_TIMEOUT_MS) for callers that have no
 *    route-level timeout (audio extraction, stale-URL refresh),
 *  - stale-slot reclamation so an abandoned job can never wedge a worker,
 *  - event-driven dispatch: the next queued job starts synchronously inside
 *    the completing job's `finally` — no cooldown timers, no polling.
 *
 * Sizing rationale (defaults, all overridable): 3 workers × 2 concurrent
 * browser jobs = 6 simultaneous resolves, exactly the existing
 * MAX_CONCURRENT_PAGES default. Each Chromium page holds hundreds of MB, so
 * the ceiling stays where the process was already proven safe; the pool only
 * distributes that budget instead of letting one lane take it all.
 *
 * Duplicate-request safety: the pool executes every admitted job exactly
 * once and never retries. Dedup lives above it (in-flight coalescing in
 * resolvers/index.ts), so one user action still creates one provider call.
 * Rate limiting, SSRF validation and URL parsing live above it too; the pool
 * only ever receives an already-validated unit of work plus a signal.
 */

export interface ResolverPoolConfig {
  workerCount: number;
  maxConcurrency: number;
  maxQueue: number;
  loadThreshold: number;
  jobTimeoutMs: number;
  queueWaitMs: number;
  recoverCooldownMs: number;
  maxRecoverMs: number;
  maxConsecutiveFailures: number;
  staleMs: number;
}

export function resolvePoolConfig(): ResolverPoolConfig {
  // The execution bound defaults to the route-level resolver timeout so the
  // pool never outlives (or undercuts) the timeout operators already tune.
  const routeTimeoutMs = readPositiveInt("RESOLVER_TIMEOUT_MS", 15_000);
  const rawJobTimeout = process.env.WORKER_JOB_TIMEOUT_MS;
  const jobTimeoutMs = rawJobTimeout
    ? readBoundedInt("WORKER_JOB_TIMEOUT_MS", routeTimeoutMs, 1_000, 300_000)
    : Math.min(Math.max(routeTimeoutMs, 1_000), 300_000);
  return {
    workerCount: readBoundedInt("WORKER_COUNT", 3, 1, 8),
    maxConcurrency: readBoundedInt("WORKER_MAX_CONCURRENCY", 2, 1, 16),
    maxQueue: readBoundedInt("WORKER_MAX_QUEUE_SIZE", 4, 0, 64),
    loadThreshold: readBoundedInt("WORKER_LOAD_THRESHOLD", 85, 1, 100),
    jobTimeoutMs,
    queueWaitMs: readNonNegativeInt("WORKER_QUEUE_WAIT_MS", 8_000, 60_000),
    recoverCooldownMs: readNonNegativeInt("WORKER_RECOVER_COOLDOWN_MS", 10_000, 300_000),
    maxRecoverMs: readNonNegativeInt("WORKER_MAX_RECOVER_MS", 60_000, 600_000),
    maxConsecutiveFailures: readBoundedInt("WORKER_MAX_CONSECUTIVE_FAILURES", 5, 1, 100),
    staleMs: readNonNegativeInt(
      "WORKER_STALE_MS",
      Math.max(jobTimeoutMs * 4, 60_000),
      3_600_000
    ),
  };
}

export interface PoolRunOptions {
  /** Caller cancellation (client disconnect / shutdown / route timeout). */
  signal?: AbortSignal;
}

interface Waiter {
  resolve: () => void;
  reject: (err: unknown) => void;
  timer: NodeJS.Timeout | null;
  detachSignal: (() => void) | null;
}

const CALLER_REASON = { kind: "caller-gone" } as const;

/**
 * One admission lane. Slots are released in a `finally`, exactly once, and a
 * slot whose job outlives `staleMs` is reclaimed on the next admission so a
 * wedged job degrades capacity instead of wedging the worker.
 */
export class ResolverWorker {
  readonly id: number;

  private active = 0;
  private readonly queue: Waiter[] = [];
  /** jobId -> start timestamp for the stale sweep. */
  private readonly activeJobs = new Map<number, number>();
  private jobSeq = 0;
  private healthy = true;
  private cooldownUntil = 0;
  /** Half-open trial running on a recovering worker (at most one). */
  private probing = false;
  private consecutiveFailures = 0;
  private admitted = 0;
  private completed = 0;
  private failed = 0;
  private rejected = 0;
  private reclaimed = 0;
  private lastCompletedAt: number | null = null;

  constructor(
    id: number,
    private readonly config: ResolverPoolConfig
  ) {
    this.id = id;
  }

  get activeCount(): number {
    return this.active;
  }

  get queuedCount(): number {
    return this.queue.length;
  }

  /** 0–100 from REAL active + queued work, never random, never unbounded. */
  loadPct(): number {
    const { maxConcurrency } = this.config;
    if (maxConcurrency <= 0) return 100;
    return Math.min(100, Math.round(((this.active + this.queue.length) / maxConcurrency) * 100));
  }

  isHealthy(now: number = Date.now()): boolean {
    if (this.healthy) return true;
    return now >= this.cooldownUntil;
  }

  /** True when the cooldown elapsed and no half-open trial is running. */
  isRecovering(now: number = Date.now()): boolean {
    return !this.healthy && now >= this.cooldownUntil;
  }

  /**
   * Eligible for a new job right now: draining is handled by the pool, but
   * the worker additionally refuses when its bounded queue is full or when a
   * half-open trial is already running on it.
   */
  canAccept(now: number = Date.now()): boolean {
    if (!this.isHealthy(now)) return false;
    if (this.queue.length >= this.config.maxQueue) return false;
    if (this.isRecovering(now) && this.probing) return false;
    return true;
  }

  private sweepStale(now: number): void {
    const { staleMs } = this.config;
    if (staleMs <= 0 || this.activeJobs.size === 0) return;
    const cutoff = now - staleMs;
    let removed = 0;
    for (const [jobId, startedAt] of this.activeJobs) {
      if (startedAt < cutoff) {
        this.activeJobs.delete(jobId);
        removed++;
      }
    }
    if (removed > 0) {
      this.active = Math.max(0, this.active - removed);
      this.reclaimed += removed;
      logger.warn("[resolver-pool] reclaimed stale worker slots", {
        worker: this.id,
        reclaimed: removed,
        staleMs,
        active: this.active,
      });
    }
  }

  private release(jobId: number): void {
    // Idempotent: a swept job settling late must not double-release.
    if (!this.activeJobs.delete(jobId)) return;
    this.active = Math.max(0, this.active - 1);
    this.lastCompletedAt = Date.now();
    this.pump();
  }

  /** Start the next queued job immediately — event-driven, no cooldown delay. */
  private pump(): void {
    while (this.queue.length > 0 && this.active < this.config.maxConcurrency) {
      const next = this.queue.shift();
      if (!next) break;
      if (next.timer) clearTimeout(next.timer);
      next.detachSignal?.();
      next.resolve();
    }
  }

  private markSuccess(): void {
    this.completed++;
    if (!this.healthy) {
      this.healthy = true;
      this.consecutiveFailures = 0;
      this.cooldownUntil = 0;
      logger.info("[resolver-pool] worker recovered", { worker: this.id });
    }
  }

  private recordFailure(err: unknown): void {
    this.failed++;
    // Only a dead browser transport implicates the worker itself. Ordinary
    // resolver failures (not found, unavailable content, throttling, genuine
    // timeouts) say nothing about worker health and must not sideline it —
    // otherwise one bad Instagram URL could drain the whole pool.
    if (!isConnectionLostError(err)) return;
    this.consecutiveFailures++;
    this.healthy = false;
    const backoff = Math.min(
      this.config.recoverCooldownMs * 2 ** Math.min(this.consecutiveFailures - 1, 4),
      this.config.maxRecoverMs
    );
    this.cooldownUntil = Date.now() + Math.max(backoff, 0);
    logger.warn("[resolver-pool] worker marked unhealthy (browser transport lost)", {
      worker: this.id,
      consecutiveFailures: this.consecutiveFailures,
      cooldownMs: backoff,
    });
  }

  /**
   * Execute `fn` on this worker: run now when a slot is free, else wait in
   * the bounded FIFO queue. The slot is always released — on success,
   * failure, timeout, or caller cancellation.
   */
  async execute<T>(fn: (signal: AbortSignal) => Promise<T>, options: PoolRunOptions = {}): Promise<T> {
    const { signal } = options;
    const now = Date.now();
    this.sweepStale(now);

    if (signal?.aborted) {
      this.rejected++;
      throw createError("CAPACITY_EXHAUSTED");
    }

    if (this.active < this.config.maxConcurrency) {
      return this.runJob(fn, options);
    }

    if (this.queue.length >= this.config.maxQueue) {
      this.rejected++;
      logger.warn("[resolver-pool] worker queue full", {
        worker: this.id,
        queued: this.queue.length,
        maxQueue: this.config.maxQueue,
      });
      throw createError("CAPACITY_EXHAUSTED");
    }

    await this.enqueueWait(signal);
    return this.runJob(fn, options);
  }

  private enqueueWait(signal?: AbortSignal): Promise<void> {
    const { queueWaitMs } = this.config;
    if (!(queueWaitMs > 0)) {
      this.rejected++;
      throw createError("CAPACITY_EXHAUSTED");
    }
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve: () => {}, reject: () => {}, timer: null, detachSignal: null };
      const drop = (counted: boolean): void => {
        const i = this.queue.indexOf(waiter);
        if (i >= 0) this.queue.splice(i, 1);
        if (waiter.timer) clearTimeout(waiter.timer);
        waiter.detachSignal?.();
        if (counted) this.rejected++;
      };
      // Every exit path funnels through here so a waiter can never be left
      // hanging: shutdown, timeouts and aborts all answer the waiter.
      waiter.reject = (err: unknown): void => {
        drop(false);
        reject(err);
      };
      const timer = setTimeout(() => {
        drop(true);
        logger.warn("[resolver-pool] queue wait elapsed", {
          worker: this.id,
          waitedMs: queueWaitMs,
          active: this.active,
          queued: this.queue.length,
        });
        reject(createError("CAPACITY_EXHAUSTED"));
      }, queueWaitMs);
      // A queue timer must never keep the process alive on its own.
      timer.unref?.();
      waiter.timer = timer;

      if (signal) {
        if (signal.aborted) {
          drop(false);
          reject(createError("CAPACITY_EXHAUSTED"));
          return;
        }
        const onAbort = (): void => {
          drop(false);
          reject(createError("CAPACITY_EXHAUSTED"));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        waiter.detachSignal = () => signal.removeEventListener("abort", onAbort);
      }

      waiter.resolve = () => resolve();
      waiter.reject = (err: unknown) => {
        drop(false);
        reject(err);
      };
      this.queue.push(waiter);
      this.pump();
    });
  }

  private async runJob<T>(fn: (signal: AbortSignal) => Promise<T>, options: PoolRunOptions): Promise<T> {
    const { signal, config } = { signal: options.signal, config: this.config };
    const jobId = ++this.jobSeq;
    const recovering = !this.healthy;
    if (recovering) this.probing = true;
    this.active++;
    this.activeJobs.set(jobId, Date.now());
    this.admitted++;

    // Caller cancellation aborts execution (a dead client must free its
    // browser page instead of finishing unseen). The job TIMEOUT deliberately
    // does NOT abort: like the route-level RESOLVER_TIMEOUT race, the caller
    // is answered now while the abandoned work keeps running so a slow
    // resolve still warms the cache for the immediate retry. The slot stays
    // honestly occupied until the work actually settles (bounded by the
    // provider deadline plus the stale sweep below).
    const exec = new AbortController();
    let timeoutFired = false;
    const onCallerAbort = (): void => exec.abort(CALLER_REASON);
    if (signal) {
      if (signal.aborted) {
        this.release(jobId);
        if (recovering) this.probing = false;
        throw createError("CAPACITY_EXHAUSTED");
      }
      signal.addEventListener("abort", onCallerAbort, { once: true });
    }

    // Frees the slot exactly once, whenever the underlying work finishes —
    // including after the caller was already answered on timeout.
    let slotFreed = false;
    const freeSlot = (): void => {
      if (slotFreed) return;
      slotFreed = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onCallerAbort);
      if (recovering) this.probing = false;
      this.release(jobId);
    };

    const work: Promise<T> = (async () => {
      try {
        const result = await fn(exec.signal);
        this.markSuccess();
        return result;
      } catch (err) {
        // A caller that went away is lifecycle, not failure: propagate the
        // cancellation without touching counters or worker health.
        if (!timeoutFired && exec.signal.aborted && exec.signal.reason === CALLER_REASON) {
          const cancelled = new Error("resolve cancelled by caller");
          cancelled.name = "AbortError";
          throw cancelled;
        }
        this.recordFailure(err);
        throw err;
      } finally {
        freeSlot();
      }
    })();
    // Observe the detached outcome so a timed-out job can never surface as
    // an unhandled rejection; counters and slot release happen above.
    void work.catch(() => {});

    // Single budget timer: on expiry the caller is answered with an honest
    // timeout while `work` above keeps running detached (cache warming) and
    // frees its slot on settle. Never aborts `exec` — see above.
    let timeoutReject: ((err: unknown) => void) | null = null;
    const timer = setTimeout(() => {
      timeoutFired = true;
      timeoutReject?.(createError("PROVIDER_TIMEOUT"));
    }, config.jobTimeoutMs);
    // A budget timer must never keep the process alive on its own.
    timer.unref?.();

    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timeoutReject = reject;
        }),
      ]);
    } finally {
      clearTimeout(timer);
      timeoutReject = null;
      // NOTE: the slot is intentionally NOT freed here on the timeout path —
      // freeSlot runs when `work` settles. Answering now while holding the
      // slot keeps admission honest about real browser load.
    }
  }

  /**
   * Refuse queued (not yet started) work with a controlled 503 for graceful
   * shutdown. Running jobs are untouched: they keep their slots and finish
   * bounded by the job timeout. Nothing is dropped silently — every waiter
   * receives an error its route turns into a response.
   */
  drainQueueForShutdown(): void {
    while (this.queue.length > 0) {
      const waiter = this.queue.shift();
      if (!waiter) break;
      if (waiter.timer) clearTimeout(waiter.timer);
      waiter.detachSignal?.();
      this.rejected++;
      waiter.reject(createError("SERVER_SHUTTING_DOWN"));
    }
  }

  snapshot(now: number = Date.now()): ResolverWorkerSnapshot {
    return {
      id: this.id,
      healthy: this.isHealthy(now),
      recovering: this.isRecovering(now),
      active: this.active,
      queued: this.queue.length,
      capacity: this.config.maxConcurrency,
      maxQueue: this.config.maxQueue,
      loadPct: this.loadPct(),
      admitted: this.admitted,
      completed: this.completed,
      failed: this.failed,
      rejected: this.rejected,
      reclaimed: this.reclaimed,
      consecutiveFailures: this.consecutiveFailures,
      lastCompletedAt: this.lastCompletedAt,
    };
  }

  /** Test-only: forget runtime state without touching configured limits. */
  reset(): void {
    for (const waiter of this.queue) {
      if (waiter.timer) clearTimeout(waiter.timer);
      waiter.detachSignal?.();
    }
    this.queue.length = 0;
    this.activeJobs.clear();
    this.active = 0;
    this.healthy = true;
    this.cooldownUntil = 0;
    this.probing = false;
    this.consecutiveFailures = 0;
    this.admitted = 0;
    this.completed = 0;
    this.failed = 0;
    this.rejected = 0;
    this.reclaimed = 0;
    this.lastCompletedAt = null;
  }
}

/**
 * Centralized pool: N bounded workers, least-loaded routing, controlled
 * backpressure, graceful shutdown. One instance per process (serverless
 * instances each enforce their own budget, like every other gate).
 */
export class ResolverPool {
  private draining = false;

  constructor(
    readonly config: ResolverPoolConfig,
    private readonly workers: ResolverWorker[]
  ) {}

  get workerCount(): number {
    return this.workers.length;
  }

  shutdown(): void {
    if (this.draining) return;
    this.draining = true;
    // Queued work has not started: refuse it now with a controlled 503 so no
    // caller hangs. Running jobs keep their slots and finish bounded by the
    // job timeout — never dropped silently.
    for (const worker of this.workers) {
      worker.drainQueueForShutdown();
    }
    logger.warn("[resolver-pool] draining — refusing new resolver jobs", {
      workers: this.workers.length,
    });
  }

  isDraining(): boolean {
    return this.draining || isDraining();
  }

  /**
   * Route one unit of resolver work to the least-loaded healthy worker:
   * prefer workers below the load threshold (so Worker 1 never has to hit
   * 100% before Worker 2 is considered), fall back to the least-loaded
   * worker when all are above it, and refuse with CAPACITY_EXHAUSTED only
   * when every worker's bounded queue is full. Each admitted job runs
   * exactly once — the pool never retries, so it can never duplicate an
   * Instagram request.
   */
  selectWorker(now: number = Date.now()): ResolverWorker | null {
    const eligible = this.workers.filter((w) => w.canAccept(now));
    if (eligible.length === 0) return null;
    const below = eligible.filter((w) => w.loadPct() < this.config.loadThreshold);
    const candidates = below.length > 0 ? below : eligible;
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const challenger = candidates[i];
      if (
        challenger.loadPct() < best.loadPct() ||
        (challenger.loadPct() === best.loadPct() && challenger.queuedCount < best.queuedCount) ||
        (challenger.loadPct() === best.loadPct() &&
          challenger.queuedCount === best.queuedCount &&
          challenger.id < best.id)
      ) {
        best = challenger;
      }
    }
    return best;
  }

  async run<T>(fn: (signal: AbortSignal) => Promise<T>, options: PoolRunOptions = {}): Promise<T> {
    if (typeof fn !== "function") {
      throw createError("VALIDATION_ERROR");
    }
    if (this.isDraining()) {
      throw createError("SERVER_SHUTTING_DOWN");
    }
    const now = Date.now();
    const worker = this.selectWorker(now);
    if (!worker) {
      logger.warn("[resolver-pool] all workers saturated — backpressure", {
        workers: this.workers.length,
        totalActive: this.totalActive(),
        totalQueued: this.totalQueued(),
      });
      throw createError("CAPACITY_EXHAUSTED");
    }
    logger.debug("[resolver-pool] admitted", {
      worker: worker.id,
      loadPct: worker.loadPct(),
    });
    return worker.execute(fn, options);
  }

  totalActive(): number {
    return this.workers.reduce((sum, w) => sum + w.activeCount, 0);
  }

  totalQueued(): number {
    return this.workers.reduce((sum, w) => sum + w.queuedCount, 0);
  }

  snapshot(): ResolverPoolSnapshot {
    const now = Date.now();
    return {
      workerCount: this.workers.length,
      loadThreshold: this.config.loadThreshold,
      draining: this.isDraining(),
      workers: this.workers.map((w) => w.snapshot(now)),
      totalActive: this.totalActive(),
      totalQueued: this.totalQueued(),
      totalCapacity: this.workers.reduce((sum, w) => sum + w.snapshot(now).capacity, 0),
    };
  }

  /** Test-only: forget runtime state on every worker. */
  reset(): void {
    this.draining = false;
    for (const worker of this.workers) worker.reset();
  }
}

/** Build an isolated pool (tests, one-off use). Production uses the singleton. */
export function createResolverPool(config?: Partial<ResolverPoolConfig>): ResolverPool {
  const full = { ...resolvePoolConfig(), ...(config ?? {}) };
  const workers = Array.from({ length: full.workerCount }, (_, i) => new ResolverWorker(i, full));
  return new ResolverPool(full, workers);
}

let singleton: ResolverPool | null = null;

/** Process-wide pool, built lazily so dotenv is loaded before env is read. */
export function getResolverPool(): ResolverPool {
  if (!singleton) {
    singleton = createResolverPool();
    logger.info("[resolver-pool] initialized", {
      workers: singleton.config.workerCount,
      concurrencyPerWorker: singleton.config.maxConcurrency,
      queuePerWorker: singleton.config.maxQueue,
      loadThreshold: singleton.config.loadThreshold,
      jobTimeoutMs: singleton.config.jobTimeoutMs,
    });
  }
  return singleton;
}

/** Sanitized snapshot for the /capacity debug endpoint (counts only). */
export function getResolverPoolSnapshot(): ResolverPoolSnapshot {
  return getResolverPool().snapshot();
}

/** Test-only: drop the singleton so the next access rebuilds from stubbed env. */
export function resetPoolForTests(): void {
  if (singleton) {
    singleton.shutdown();
    singleton.reset();
  }
  singleton = null;
}

// Release pool admission on graceful shutdown even when nothing calls
// shutdown() explicitly (mirrors the puppeteer-browser cleanup).
registerCleanup("resolver-pool", async () => {
  try {
    getResolverPool().shutdown();
  } catch (err) {
    logger.warn("[resolver-pool] shutdown cleanup failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
});
