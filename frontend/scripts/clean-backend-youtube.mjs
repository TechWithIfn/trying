import fs from "fs";
import path from "path";

// 1. Copy ytdlp.ts to backend/src/lib/ytdlp.ts
const srcYtdlp = path.resolve("backend/src/lib/youtube/ytdlp.ts");
const dstYtdlp = path.resolve("backend/src/lib/ytdlp.ts");

if (fs.existsSync(srcYtdlp)) {
  let ytdlpCode = fs.readFileSync(srcYtdlp, "utf8");
  // Adjust import from "../media-binary.js" since it was inside lib/youtube/
  // Now inside lib/, it is "./media-binary.js" and "./logger.js"
  ytdlpCode = ytdlpCode.replace('../media-binary.js', './media-binary.js');
  ytdlpCode = ytdlpCode.replace('../logger.js', './logger.js');
  fs.writeFileSync(dstYtdlp, ytdlpCode, "utf8");
  console.log("Moved ytdlp.ts to backend/src/lib/ytdlp.ts");
}

// 2. Update import in backend/src/lib/twitter/resolve.ts
const twitterResolve = path.resolve("backend/src/lib/twitter/resolve.ts");
if (fs.existsSync(twitterResolve)) {
  let content = fs.readFileSync(twitterResolve, "utf8");
  content = content.replace('../youtube/ytdlp.js', '../ytdlp.js');
  fs.writeFileSync(twitterResolve, content, "utf8");
  console.log("Updated twitter/resolve.ts");
}

// 3. Update import in backend/src/routes/facebook.ts
const fbRoute = path.resolve("backend/src/routes/facebook.ts");
if (fs.existsSync(fbRoute)) {
  let content = fs.readFileSync(fbRoute, "utf8");
  content = content.replace('../lib/youtube/ytdlp.js', '../lib/ytdlp.js');
  fs.writeFileSync(fbRoute, content, "utf8");
  console.log("Updated routes/facebook.ts");
}

// 4. Update import in backend/src/routes/threads.ts
const threadsRoute = path.resolve("backend/src/routes/threads.ts");
if (fs.existsSync(threadsRoute)) {
  let content = fs.readFileSync(threadsRoute, "utf8");
  content = content.replace('../lib/youtube/ytdlp.js', '../lib/ytdlp.js');
  fs.writeFileSync(threadsRoute, content, "utf8");
  console.log("Updated routes/threads.ts");
}

// 5. Update import in backend/src/routes/health.ts
const healthRoute = path.resolve("backend/src/routes/health.ts");
if (fs.existsSync(healthRoute)) {
  let content = fs.readFileSync(healthRoute, "utf8");
  content = content.replace('../lib/youtube/ytdlp.js', '../lib/ytdlp.js');
  fs.writeFileSync(healthRoute, content, "utf8");
  console.log("Updated routes/health.ts");
}

// 6. Update import in backend/src/server.ts
const serverTs = path.resolve("backend/src/server.ts");
if (fs.existsSync(serverTs)) {
  let content = fs.readFileSync(serverTs, "utf8");
  content = content.replace('./lib/youtube/ytdlp.js', './lib/ytdlp.js');
  fs.writeFileSync(serverTs, content, "utf8");
  console.log("Updated server.ts");
}

// 7. Update backend/src/app.ts: replace youtubeRouter with 410 Gone handler
const appTs = path.resolve("backend/src/app.ts");
if (fs.existsSync(appTs)) {
  let content = fs.readFileSync(appTs, "utf8");
  content = content.replace('import youtubeRouter from "./routes/youtube.js";\r?\n', '');
  content = content.replace('import youtubeRouter from "./routes/youtube.js";\n', '');
  content = content.replace(
    'app.use("/api/youtube", youtubeRouter);',
    `app.all("/api/youtube*", (_req, res) => {
  res.status(410).json({
    success: false,
    error: {
      code: "FEATURE_DISCONTINUED",
      message: "The YouTube downloader feature has been permanently discontinued in compliance with content provider policies.",
    },
  });
});`
  );
  fs.writeFileSync(appTs, content, "utf8");
  console.log("Updated app.ts to serve 410 Gone on /api/youtube*");
}

// 8. Delete backend/src/routes/youtube.ts
const ytRoute = path.resolve("backend/src/routes/youtube.ts");
if (fs.existsSync(ytRoute)) {
  fs.unlinkSync(ytRoute);
  console.log("Deleted backend/src/routes/youtube.ts");
}

// 9. Delete backend/src/lib/validators/youtube-url.ts
const ytVal = path.resolve("backend/src/lib/validators/youtube-url.ts");
if (fs.existsSync(ytVal)) {
  fs.unlinkSync(ytVal);
  console.log("Deleted backend/src/lib/validators/youtube-url.ts");
}

// 10. Delete backend/src/lib/youtube directory
const ytDir = path.resolve("backend/src/lib/youtube");
if (fs.existsSync(ytDir)) {
  fs.rmSync(ytDir, { recursive: true, force: true });
  console.log("Deleted backend/src/lib/youtube directory");
}

// 11. Delete backend/tests/youtube-*.test.ts
const testsDir = path.resolve("backend/tests");
const testFiles = fs.readdirSync(testsDir).filter(f => f.startsWith("youtube-"));
for (const tf of testFiles) {
  fs.unlinkSync(path.join(testsDir, tf));
  console.log("Deleted test file:", tf);
}

console.log("Backend YouTube cleanup complete!");

