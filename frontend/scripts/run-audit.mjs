import { spawn } from "child_process";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

async function run() {
  console.log("Starting Next.js production server on port 3333...");
  const server = spawn("npx", ["next", "start", "-p", "3333"], {
    cwd: process.cwd(),
    shell: true,
    stdio: "pipe",
  });

  server.stdout.on("data", (data) => {
    // console.log(`[server] ${data}`);
  });

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 4000));

  console.log("Launching Chrome...");
  const chrome = await chromeLauncher.launch({
    chromePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    chromeFlags: ["--headless", "--disable-gpu", "--no-sandbox"],
  });

  console.log(`Chrome launched on port ${chrome.port}. Running mobile Lighthouse audit...`);

  // Mobile audit options matching Lighthouse 13.6 mobile preset
  const options = {
    logLevel: "error",
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    port: chrome.port,
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
  };

  const routes = [
    { name: "Home Page", path: "/" },
    { name: "Instagram Video Downloader", path: "/instagram-video-downloader" },
    { name: "Pinterest Video Downloader", path: "/pinterest-video-downloader" },
    { name: "YouTube Video Downloader", path: "/youtube-video-downloader" },
    { name: "Facebook Video Downloader", path: "/facebook-video-downloader" },
    { name: "Twitter/X Video Downloader", path: "/twitter-video-downloader" },
    { name: "Threads Video Downloader", path: "/threads-video-downloader" },
  ];

  console.log("\n=================== ALL ROUTES MOBILE AUDIT REPORT ===================");

  for (const route of routes) {
    const url = `http://localhost:3333${route.path}`;
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;

    const perf = Math.round(lhr.categories.performance.score * 100);
    const a11y = Math.round(lhr.categories.accessibility.score * 100);
    const bp = Math.round(lhr.categories["best-practices"].score * 100);
    const seo = Math.round(lhr.categories.seo.score * 100);
    const fcp = lhr.audits["first-contentful-paint"].displayValue;
    const lcp = lhr.audits["largest-contentful-paint"].displayValue;
    const tbt = lhr.audits["total-blocking-time"].displayValue;
    const cls = lhr.audits["cumulative-layout-shift"].displayValue;
    const speedIndex = lhr.audits["speed-index"].displayValue;

    console.log(`\nRoute: ${route.name} (${route.path})`);
    console.log(`Scores: Perf: ${perf} | A11y: ${a11y} | BP: ${bp} | SEO: ${seo}`);
    console.log(`Metrics: FCP: ${fcp} | LCP: ${lcp} | TBT: ${tbt} | CLS: ${cls} | SI: ${speedIndex}`);
  }

  console.log("\n======================================================================\n");

  await chrome.kill();
  server.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
