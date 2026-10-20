/**
 * Filename safety for the `Content-Disposition` header on downloads.
 *
 * A download's real name is chosen by the SERVER, never trusted blindly from
 * the client: the client only suggests a base (`Downloadit <title>`), and the
 * server strips every character that is illegal on Windows/Android/iOS, caps
 * the length without splitting a Unicode code point, and appends the extension
 * implied by the VERIFIED upstream content type. The original casing and the
 * spaces in the base are preserved on purpose — the requested pattern is
 * `Downloadit {title}.{ext}`, not a slug.
 */

const DEFAULT_MAX_BASE = 120;
const FALLBACK_BASE = "downloadit-media";

/**
 * Extension implied by the verified upstream content type. Anything that is
 * not a recognised image/audio type is treated as a video container, matching
 * the historical default (Instagram Reels/Posts are MP4).
 */
export function extensionForContentType(contentType: string | null | undefined): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("audio/mpeg") || ct.includes("audio/mp3")) return ".mp3";
  if (ct.includes("audio/mp4") || ct.includes("audio/x-m4a") || ct.includes("audio/m4a")) return ".m4a";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/gif")) return ".gif";
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return ".jpg";
  return ".mp4";
}

/**
 * Sanitize a suggested filename base: no path traversal, no control bytes, no
 * Windows/Android/iOS-reserved characters, no trailing dots/spaces (invalid on
 * Windows), capped to `maxBase` Unicode code points. Returns a safe fallback
 * when nothing usable remains.
 */
export function sanitizeFilenameBase(raw: unknown, maxBase: number = DEFAULT_MAX_BASE): string {
  let base = typeof raw === "string" ? raw.normalize("NFC") : "";
  // Control bytes (incl. CR/LF/NUL) could break the header — drop them.
  base = base.replace(/[\u0000-\u001f\u007f]/g, "");
  // Reserved on Windows/Android/iOS, and every path separator.
  base = base.replace(/[<>:"/\\|?*]/g, "-");
  // Collapse whitespace (incl. tabs) and dash runs so the name stays readable.
  base = base.replace(/\s+/g, " ").replace(/-{2,}/g, "-");
  // Kill any dot-run that could read as `..` traversal.
  base = base.replace(/\.{2,}/g, ".");
  // Trim leading/trailing spaces, dots and dashes: trailing dots/spaces are
  // invalid on Windows, leading dots create hidden files.
  base = base.replace(/^[\s.\-]+/, "").replace(/[\s.\-]+$/, "");
  // The server owns the extension — drop a trailing extension-looking token.
  base = base.replace(/\.[a-z0-9]{1,5}$/i, "");
  // Unicode-safe truncation: code points, not UTF-16 units, so an emoji or an
  // accented letter is never cut in half into a replacement char.
  const chars = Array.from(base);
  if (chars.length > maxBase) {
    base = chars.slice(0, maxBase).join("").replace(/[\s.\-]+$/, "");
  }
  return base || FALLBACK_BASE;
}

/** The final download name: sanitized base + server-decided extension. */
export function sanitizeDownloadFilename(
  raw: unknown,
  contentType: string | null | undefined,
  maxBase: number = DEFAULT_MAX_BASE
): string {
  return sanitizeFilenameBase(raw, maxBase) + extensionForContentType(contentType);
}

/**
 * Build an `attachment` Content-Disposition value carrying BOTH an ASCII
 * fallback and the RFC 5987 `filename*` form, so non-ASCII titles (e.g. Hindi,
 * emoji) survive on every browser instead of being mangled to underscores.
 */
export function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /['()*!~]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
