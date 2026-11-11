import fs from "fs";
import path from "path";

const apiPath = path.resolve("frontend/src/services/api.ts");
let content = fs.readFileSync(apiPath, "utf8");

// Remove YouTube section
const ytMarkerStart = "/* -------------------------------------------------------------------------- */\n/* YouTube                                                                     */";
const ytMarkerEnd = "export function getStreamUrl(mediaUrl: string, sourceUrl?: string): string {";

const startIndex = content.indexOf("/* YouTube");
const endIndex = content.indexOf(ytMarkerEnd);

if (startIndex !== -1 && endIndex !== -1) {
  // Find start of comment block
  const blockStart = content.lastIndexOf("/* -----", startIndex);
  content = content.slice(0, blockStart) + content.slice(endIndex);
  fs.writeFileSync(apiPath, content, "utf8");
  console.log("Successfully removed YouTube code from frontend/src/services/api.ts");
} else {
  console.error("Could not find markers in api.ts", { startIndex, endIndex });
}

