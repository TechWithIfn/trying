// Temporary diagnostic: drive the real UI in headless Chrome and report where
// the Instagram preview flow breaks (resolve -> stream -> render).
// Usage: node scripts/preview-probe.mjs <siteUrl> <instagramUrl> [--click-preview]
import puppeteer from "puppeteer";

const siteUrl = process.argv[2] || "https://www.downloadit.pro/";
const igUrl = process.argv[3] || "https://www.instagram.com/reel/DcTZvgzsLuW/";
const clickPreview = process.argv.includes("--click-preview");
const nextCount = Number(process.argv[process.argv.indexOf("--next") + 1] || 0) || 0;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const logs = [];
const api = [];
page.on("console", (m) => logs.push(`[console:${m.type()}] ${m.text().slice(0, 500)}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${String(e.message).slice(0, 500)}`));
page.on("requestfailed", (r) =>
  logs.push(`[reqfail] ${r.failure()?.errorText ?? "?"} ${r.url().slice(0, 200)}`)
);
page.on("response", (res) => {
  const u = res.url();
  if (u.includes("/api/")) {
    const log = `${res.status()} ${u.replace(/^https?:\/\/[^/]+/, "").slice(0, 220)}`;
    api.push(log);
  }
});

async function snapshot(label) {
  const state = await page.evaluate(() => {
    const txt = document.body.innerText || "";
    const imgs = [...document.querySelectorAll("img")].map((i) => ({
      src: (i.currentSrc || i.src || "").slice(0, 160),
      nw: i.naturalWidth,
      nh: i.naturalHeight,
      complete: i.complete,
    }));
    const vids = [...document.querySelectorAll("video")].map((v) => ({
      src: (v.currentSrc || v.src || "").slice(0, 200),
      readyState: v.readyState,
      networkState: v.networkState,
      err: v.error ? v.error.code : null,
    }));
    return {
      hasResultCard: Boolean(document.querySelector(".result-card")),
      previewUnavailable: txt.includes("Preview unavailable"),
      imgs: imgs.filter((i) => i.src),
      vids,
    };
  });
  console.log(`--- ${label} ---`);
  console.log(JSON.stringify(state, null, 2));
  return state;
}

try {
  await page.goto(siteUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[aria-label="Instagram URL input"]', { timeout: 30000 });
  await page.type('input[aria-label="Instagram URL input"]', igUrl, { delay: 10 });
  await Promise.all([
    page.click('form button[type="submit"]'),
    page.waitForSelector(".result-card", { timeout: 120000 }),
  ]);
  console.log("RESULT CARD VISIBLE");
  await new Promise((r) => setTimeout(r, 8000));
  const before = await snapshot("after resolve");

  if (clickPreview && !before.previewUnavailable) {
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => (b.getAttribute("aria-label") || "").toLowerCase().includes("play video") ||
               (b.textContent || "").trim().toLowerCase() === "preview"
      );
      if (btn) {
        btn.click();
        return btn.getAttribute("aria-label") || btn.textContent?.trim();
      }
      return null;
    });
    console.log("CLICKED PREVIEW:", clicked);
    await new Promise((r) => setTimeout(r, 10000));
    await snapshot("after preview click");
  }

  for (let i = 0; i < nextCount; i++) {
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button[aria-label="Next image"]')].find(
        (b) => !b.disabled
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log("CLICKED NEXT:", clicked);
    await new Promise((r) => setTimeout(r, 6000));
    await snapshot(`after next #${i + 1}`);
  }
} catch (err) {
  console.log("PROBE ERROR:", err.message);
  await snapshot("on error");
}

console.log("--- API RESPONSES ---");
console.log(api.join("\n"));
console.log("--- CONSOLE / NETWORK ---");
console.log(logs.slice(-80).join("\n"));
await browser.close();
