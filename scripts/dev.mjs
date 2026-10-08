import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isWin = process.platform === "win32";

const jobs = [
  { name: "backend", shellCmd: "npm run dev:backend" },
  { name: "frontend", shellCmd: "npm run dev:frontend" },
];

const children = new Set();
for (const job of jobs) {
  const app = isWin ? process.env.comspec || "cmd.exe" : "/bin/sh";
  const args = isWin ? ["/d", "/s", "/c", job.shellCmd] : ["-c", job.shellCmd];
  const child = spawn(app, args, { cwd: root, stdio: "inherit" });
  children.add(child);
  child.on("exit", (code, signal) => {
    children.delete(child);
    console.error(`[dev] ${job.name} exited (code=${code} signal=${signal})`);
  });
  child.on("error", (err) => {
    console.error(`[dev] failed to start ${job.name}: ${err.message}`);
    process.exitCode = 1;
  });
}

function shutdown(code) {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // already gone
    }
  }
  setTimeout(() => process.exit(code || 0), 300).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("beforeExit", (code) => {
  if (children.size > 0) {
    shutdown(code);
  }
});