/**
 * Resolve request-lifecycle regression tests (no test framework needed).
 *
 * Compiles the REAL frontend/src/services/api.ts with the project's own
 * TypeScript and asserts, against a fake EventSource/fetch:
 *
 *  A. Offline/disconnect classification: offline vs network vs server vs
 *     aborted — a disconnect must never look like an Instagram/rate-limit
 *     or resolver verdict.
 *  B. EventSource terminal paths close the stream first: repeated `error`
 *     events (the disconnect storm) invoke the transport fallback AT MOST
 *     once, so one user action can never spawn repeated POST /api/resolve.
 *  C. Server-verdict errors never trigger the POST fallback.
 *  D. Events after close are ignored (no late repaints, no extra jobs).
 *  E. resolveInstagramUrl attempts exactly one fetch (no client retry loop).
 *
 * Run: npm run test:lifecycle
 */
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let failures = 0;

function check(name, actual, expected) {
  const ok = Object.is(actual, expected);
  if (ok) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.closed = false;
    this.listeners = {};
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  close() {
    this.closed = true;
  }
  emit(type, event) {
    for (const fn of this.listeners[type] || []) fn(event);
  }
}

async function main() {
  // Browser globals the module touches at runtime (all guarded except these).
  // NOTE: modern Node ships a read-only global `navigator`, so plain
  // assignment is silently ignored — defineProperty actually installs the stub.
  globalThis.EventSource = FakeEventSource;
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
  const setOnline = (onLine) => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine },
      configurable: true,
      writable: true,
    });
  };

  const frontendDir = path.join(__dirname, "..");
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "downloadit-api-test-"));
  execSync(
    `npx tsc src/services/api.ts --outDir ${JSON.stringify(outDir)} --target es2022 --module es2022 --moduleResolution bundler --skipLibCheck --strict`,
    { cwd: frontendDir, stdio: "pipe" }
  );
  const api = await import(pathToFileURL(path.join(outDir, "api.js")).href);

  // ---- A. classification ----
  check("isBrowserOffline online", api.isBrowserOffline(), false);
  setOnline(false);
  check("isBrowserOffline offline", api.isBrowserOffline(), true);
  check("offline error is network failure", api.isNetworkFailure(new TypeError("Failed to fetch")), true);
  setOnline(true);
  check("TypeError Failed to fetch", api.isNetworkFailure(new TypeError("Failed to fetch")), true);
  check(
    "ERR_INTERNET_DISCONNECTED",
    api.isNetworkFailure(new TypeError("fetch failed: ERR_INTERNET_DISCONNECTED")),
    true
  );
  const netErr =
    typeof DOMException !== "undefined" ? new DOMException("NetworkError when attempting to fetch resource.", "NetworkError") : new Error("NetworkError");
  check("DOM NetworkError", api.isNetworkFailure(netErr), true);
  check("plain Error is not network failure", api.isNetworkFailure(new Error("boom")), false);
  // NOTE: DOMException.name is getter-only; the constructor arg sets it.
  const abortErr =
    typeof DOMException !== "undefined" ? new DOMException("aborted", "AbortError") : Object.assign(new Error("aborted"), { name: "AbortError" });
  check("AbortError is not network failure", api.isNetworkFailure(abortErr), false);

  const diag = (status, error) =>
    api.logApiFailure({ requestType: "resolve-post", requestUrl: "https://backend/api/resolve", status, error }).category;
  setOnline(false);
  check("offline category", diag(null, new TypeError("Failed to fetch")), "offline");
  setOnline(true);
  check("network category", diag(null, new TypeError("Failed to fetch")), "network");
  check("server category", diag(429, new Error("x")), "server");
  check("aborted category", diag(null, abortErr), "aborted");

  // ---- B/C/D. EventSource lifecycle ----
  const silence = () => {};
  console.warn = silence;

  let progressCalls = 0;
  let completeCalls = 0;
  let errorCalls = 0;
  let transportCalls = 0;
  const handle = api.startResolveStream("https://www.instagram.com/reel/AAA/", {
    onProgress: () => {
      progressCalls++;
    },
    onComplete: () => {
      completeCalls++;
    },
    onError: () => {
      errorCalls++;
    },
    onTransportError: () => {
      transportCalls++;
    },
  });
  const es = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  check("stream targets resolve endpoint", String(es.url).includes("/api/resolve/stream"), true);

  // Disconnect storm: three transport errors in a row (offline flapping).
  es.emit("error", { data: null });
  es.emit("error", { data: null });
  es.emit("error", {});
  check("stream closed after first terminal error", es.closed, true);
  check("transport fallback ran exactly once", transportCalls, 1);
  check("no server-error handler on transport failure", errorCalls, 0);

  // Late events after close are dead: no repaints, no extra jobs.
  es.emit("progress", { data: JSON.stringify({ progress: 90, stage: "late" }) });
  es.emit("complete", { data: JSON.stringify({ data: { media: [] } }) });
  check("late progress ignored", progressCalls, 0);
  check("late complete ignored", completeCalls, 0);
  handle.close();

  // Server verdict with payload: onError once, never the POST fallback.
  let errorCalls2 = 0;
  let transportCalls2 = 0;
  api.startResolveStream("https://www.instagram.com/reel/BBB/", {
    onProgress: () => {},
    onComplete: () => {},
    onError: () => {
      errorCalls2++;
    },
    onTransportError: () => {
      transportCalls2++;
    },
  });
  const es2 = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  es2.emit("error", { data: JSON.stringify({ code: "RATE_LIMITED", message: "slow down" }) });
  es2.emit("error", { data: JSON.stringify({ code: "RATE_LIMITED", message: "slow down" }) });
  check("server error delivered once", errorCalls2, 1);
  check("server error never triggers POST fallback", transportCalls2, 0);
  check("server-error stream closed", es2.closed, true);

  // ---- E. POST resolve: exactly one fetch attempt ----
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new TypeError("Failed to fetch");
  };
  let threw = null;
  try {
    await api.resolveInstagramUrl("https://www.instagram.com/reel/CCC/", undefined);
  } catch (err) {
    threw = err;
  }
  check("POST failure rethrown (component owns the message)", threw instanceof TypeError, true);
  check("POST attempted exactly once (no client retry)", fetchCalls, 1);

  fs.rmSync(outDir, { recursive: true, force: true });

  if (failures > 0) {
    console.error(`${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log("all resolve-lifecycle assertions passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
