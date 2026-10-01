/**
 * Bounded backpressure regression tests.
 *
 * Production incident: cancelled video preloads hung forever inside an
 * unbounded `await res.once("drain")` (dead sockets never emit drain, and
 * cancellation was otherwise only checked between reads). Each hung stream
 * leaked its per-client slot; after 3 the endpoint 503d EVERY preview with
 * CAPACITY_EXHAUSTED while healthy capacity sat idle.
 *
 * These tests prove every drain wait terminates and releases its listeners,
 * using plain event emitters (deterministic, no sockets, no timing flakes).
 */
import { describe, it, expect } from "vitest";
import { EventEmitter } from "events";
import type { Request, Response as ExpressResponse } from "express";
import { waitForDrainOrGone } from "@/routes/stream";

function mocks() {
  const req = new EventEmitter() as unknown as Request;
  const res = new EventEmitter() as unknown as ExpressResponse;
  return { req, res, reqEm: req as unknown as EventEmitter, resEm: res as unknown as EventEmitter };
}

describe("waitForDrainOrGone", () => {
  it("resolves true on drain and detaches every listener", async () => {
    const { req, res, reqEm, resEm } = mocks();
    const pending = waitForDrainOrGone(req, res);
    resEm.emit("drain");
    await expect(pending).resolves.toBe(true);
    expect(reqEm.listenerCount("close")).toBe(0);
    expect(resEm.listenerCount("close")).toBe(0);
    expect(resEm.listenerCount("error")).toBe(0);
    expect(resEm.listenerCount("drain")).toBe(0);
  });

  it("resolves false when the request closes mid-wait (cancelled preload)", async () => {
    const { req, res, reqEm } = mocks();
    const pending = waitForDrainOrGone(req, res);
    reqEm.emit("close");
    await expect(pending).resolves.toBe(false);
  });

  it("resolves false on response error", async () => {
    const { req, res, resEm } = mocks();
    const pending = waitForDrainOrGone(req, res);
    resEm.emit("error", new Error("socket hang up"));
    await expect(pending).resolves.toBe(false);
  });

  it("resolves false immediately for an already-aborted signal", async () => {
    const { req, res } = mocks();
    const controller = new AbortController();
    controller.abort();
    await expect(waitForDrainOrGone(req, res, controller.signal)).resolves.toBe(false);
  });

  it("resolves false when abort fires during the wait (no hang)", async () => {
    const { req, res } = mocks();
    const controller = new AbortController();
    const pending = waitForDrainOrGone(req, res, controller.signal);
    setTimeout(() => controller.abort(), 10);
    await expect(pending).resolves.toBe(false);
  });

  it("a late drain after close does not flip the verdict", async () => {
    const { req, res, resEm, reqEm } = mocks();
    const pending = waitForDrainOrGone(req, res);
    reqEm.emit("close");
    resEm.emit("drain");
    await expect(pending).resolves.toBe(false);
  });
});
