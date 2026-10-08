import type {
  ResolverResult,
  MediaItem,
  InstagramContentType,
  ExternalProviderResponse,
  Author,
} from "../types.js";
import { BaseProvider } from "./base.js";
import { createError, AppError } from "../errors.js";
import { logger } from "../logger.js";
import { decodeNullableText } from "../text.js";

const TIMEOUT_MS = 15_000;

export class ExternalProvider extends BaseProvider {
  readonly name = "external";
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    super();
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async resolve(url: string): Promise<ResolverResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      logger.info("External provider request", {
        provider: this.name,
        url: url.slice(0, 80),
      });

      const response = await fetch(this.apiUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": "Downloadit/1.0",
        },
        body: JSON.stringify({ url }),
      });

      if (response.status === 429) {
        throw createError("PROVIDER_RATE_LIMITED");
      }

      if (response.status === 401 || response.status === 403) {
        throw createError("PROVIDER_NOT_CONFIGURED");
      }

      if (response.status === 404) {
        throw createError("CONTENT_NOT_FOUND");
      }

      if (!response.ok) {
        throw createError("PROVIDER_UNAVAILABLE");
      }

      let data: ExternalProviderResponse;
      try {
        data = (await response.json()) as ExternalProviderResponse;
      } catch {
        throw createError("INVALID_PROVIDER_RESPONSE");
      }

      return this.normalizeResponse(data, url);
    } catch (error) {
      if (error instanceof AppError) throw error;

      if (error instanceof DOMException && error.name === "AbortError") {
        throw createError("PROVIDER_TIMEOUT");
      }

      throw createError("PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Story lookup against handle-based providers (e.g. profilequery
   * `GET /v1/profile/stories?handle=<username>`). Uses the SAME Bearer key
   * from the constructor — never hardcoded, never logged. Returns a
   * normalized STORY result; throws provider errors for the caller to map.
   */
  async resolveStoryUrl(url: string, username: string): Promise<ResolverResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const endpoint = `${this.apiUrl}?handle=${encodeURIComponent(username)}`;
      logger.info("External provider story request", {
        provider: this.name,
        // Username only — the key travels solely in the Authorization header.
        handle: username,
      });

      const response = await fetch(endpoint, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": "Downloadit/1.0",
        },
      });

      if (response.status === 429) {
        throw createError("PROVIDER_RATE_LIMITED");
      }

      if (response.status === 401 || response.status === 403) {
        throw createError("PROVIDER_NOT_CONFIGURED");
      }

      if (response.status === 404) {
        throw createError("CONTENT_NOT_FOUND");
      }

      if (!response.ok) {
        throw createError("PROVIDER_UNAVAILABLE");
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw createError("INVALID_PROVIDER_RESPONSE");
      }

      return this.normalizeStoryItems(data, url, username);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw createError("PROVIDER_TIMEOUT");
      }
      throw createError("PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Normalize a handle-based story payload (`data.items[]` with id,
   * shortcode, type, image_url, video_url, video_duration). Items missing
   * their required media URL are skipped — never success without media.
   */
  private normalizeStoryItems(data: unknown, sourceUrl: string, username: string): ResolverResult {
    if (!data || typeof data !== "object") {
      throw createError("INVALID_PROVIDER_RESPONSE");
    }
    const root = data as { data?: { items?: unknown[] }; items?: unknown[]; success?: boolean };
    const items = Array.isArray(root.data?.items)
      ? root.data.items
      : Array.isArray(root.items)
        ? root.items
        : null;
    if (root.success === false || !items) {
      throw createError("CONTENT_UNAVAILABLE");
    }
    const media: MediaItem[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const kind = typeof item["type"] === "string" ? (item["type"] as string).toLowerCase() : "";
      const videoUrl = this.firstValidUrl([item["video_url"], item["url"], item["media_url"]]);
      const imageUrl = this.firstValidUrl([item["image_url"], item["url"], item["media_url"]]);
      // A Story item that carries a playable video rendition IS a video
      // (footage + music), even when the provider labels it "photo"/"image".
      // Only genuinely still media (no video URL) resolves as an image — this
      // is what guarantees an MP4 download instead of a JPEG thumbnail.
      const isVideo = videoUrl !== null || kind === "video";
      const isImage = videoUrl === null && (kind === "photo" || kind === "image" || kind === "picture");
      if (!isVideo && !isImage) continue;
      const urlValue = isVideo ? videoUrl : imageUrl;
      if (!urlValue) continue;
      const thumbValue = this.firstValidUrl([item["image_url"], item["thumbnail"], item["thumbnail_url"]]);
      const duration = typeof item["video_duration"] === "number" ? (item["video_duration"] as number) : null;
      media.push({
        url: urlValue,
        type: isVideo ? "video" : "image",
        width: null,
        height: null,
        duration,
        thumbnail: thumbValue,
        format: isVideo ? "mp4" : null,
      });
    }
    if (media.length === 0) {
      throw createError("CONTENT_UNAVAILABLE");
    }
    return {
      type: "STORY",
      sourceUrl,
      thumbnail: media[0]?.thumbnail || null,
      title: null,
      author: { username, displayName: null },
      media,
    };
  }

  private firstValidUrl(candidates: unknown[]): string | null {
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate && this.validateMediaUrl(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private normalizeResponse(
    data: ExternalProviderResponse,
    sourceUrl: string
  ): ResolverResult {
    if (!data || typeof data !== "object") {
      throw createError("INVALID_PROVIDER_RESPONSE");
    }

    if (data.success === false || !data.data) {
      throw this.mapProviderFailure(data.error);
    }

    const { data: raw } = data;

    const type = this.mapContentType(raw.type);
    if (type === "UNKNOWN") {
      throw createError("UNSUPPORTED_CONTENT");
    }

    const author: Author | null = raw.author
      ? {
          username: raw.author.username || null,
          displayName: decodeNullableText(raw.author.display_name),
        }
      : null;

    const media: MediaItem[] = [];
    if (Array.isArray(raw.media)) {
      for (const item of raw.media) {
        // Provider dialects vary: accept url, video_url, image_url,
        // media_url, and the first usable video_versions / image_versions2
        // candidate. Every candidate URL still passes validateMediaUrl.
        const itemUrl = this.pickMediaUrl(item);
        if (!itemUrl) continue;

        const mediaType = item.type === "video" || item.type === "audio" ? item.type : "image";

        media.push({
          url: itemUrl,
          type: mediaType,
          width: typeof item.width === "number" ? item.width : null,
          height: typeof item.height === "number" ? item.height : null,
          duration:
            typeof item.duration === "number" ? item.duration : null,
          size: typeof item.size === "number" ? item.size : null,
          thumbnail: this.pickThumbnail(item),
          format:
            typeof item.format === "string"
              ? item.format
              : mediaType === "audio"
                ? "mp3"
                : mediaType === "video"
                  ? "mp4"
                  : null,
        });
      }
    }

    if (media.length === 0) {
      throw createError("CONTENT_UNAVAILABLE");
    }

    return {
      type,
      sourceUrl,
      thumbnail:
        this.pickThumbnail(raw) ?? media[0]?.thumbnail ?? null,
      title: decodeNullableText(raw.caption),
      author,
      media,
    };
  }

  /**
   * First usable media URL across provider dialects. Every candidate passes
   * validateMediaUrl (protocol/host checks) — an unparsable or unsafe value
   * degrades to the next variant, never to a thrown error or a fake URL.
   */
  private pickMediaUrl(item: {
    url?: string;
    video_url?: string;
    image_url?: string;
    media_url?: string;
    video_versions?: Array<{ url?: string }>;
    image_versions2?: { candidates?: Array<{ url?: string }> };
  }): string | null {
    const direct = [item.url, item.video_url, item.image_url, item.media_url];
    for (const candidate of direct) {
      if (typeof candidate === "string" && candidate && this.validateMediaUrl(candidate)) {
        return candidate;
      }
    }
    if (Array.isArray(item.video_versions)) {
      for (const v of item.video_versions) {
        if (v && typeof v.url === "string" && v.url && this.validateMediaUrl(v.url)) return v.url;
      }
    }
    const candidates = item.image_versions2?.candidates;
    if (Array.isArray(candidates)) {
      for (const c of candidates) {
        if (c && typeof c.url === "string" && c.url && this.validateMediaUrl(c.url)) return c.url;
      }
    }
    return null;
  }

  private pickThumbnail(item: { thumbnail?: string; thumbnail_url?: string }): string | null {
    for (const candidate of [item.thumbnail, item.thumbnail_url]) {
      if (typeof candidate === "string" && candidate && this.validateMediaUrl(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Map a provider-reported failure to our own canonical codes (with OUR
   * messages, never the provider's text). Unknown shapes stay
   * CONTENT_UNAVAILABLE, exactly as before.
   */
  private mapProviderFailure(error?: { code?: string; message?: string; reason?: string }): AppError {
    const signal = `${error?.code ?? ""} ${error?.reason ?? ""} ${error?.message ?? ""}`.toLowerCase();
    // Specific reasons outrank generic codes: a not_found carrying
    // reason=private_account is a privacy verdict, not a missing item.
    if (/(expired|gone)/.test(signal)) return createError("STORY_EXPIRED");
    if (/(private|forbidden|restricted|login|auth)/.test(signal)) {
      return createError("PRIVATE_ACCOUNT");
    }
    if (/(not_found|notfound|no_media|no_story|missing|deleted|no_public_data|media_not_found|account_not_found)/.test(signal)) {
      return createError("CONTENT_NOT_FOUND");
    }
    if (/(rate_limit|ratelimit|too_many|429)/.test(signal)) {
      return createError("PROVIDER_RATE_LIMITED");
    }
    if (/(insufficient_credits|upstream_error)/.test(signal)) {
      // Billing/operator-side states (out of credits, provider hiccup):
      // retryable service errors, never content verdicts.
      return createError("PROVIDER_UNAVAILABLE");
    }
    if (/(upstream_timeout|timeout|timed_out)/.test(signal)) {
      return createError("PROVIDER_TIMEOUT");
    }
    return createError("CONTENT_UNAVAILABLE");
  }

  private mapContentType(rawType: string | undefined): InstagramContentType {
    const map: Record<string, InstagramContentType> = {
      REEL: "REEL",
      reel: "REEL",
      POST: "POST",
      post: "POST",
      CAROUSEL: "CAROUSEL",
      carousel: "CAROUSEL",
      STORY: "STORY",
      story: "STORY",
      STORY_PROFILE: "STORY_PROFILE",
      story_profile: "STORY_PROFILE",
      HIGHLIGHT: "HIGHLIGHT",
      highlight: "HIGHLIGHT",
      VIDEO: "VIDEO",
      video: "VIDEO",
      PHOTO: "PHOTO",
      photo: "PHOTO",
      AUDIO: "AUDIO",
      audio: "AUDIO",
    };
    return map[rawType || ""] || "UNKNOWN";
  }
}
