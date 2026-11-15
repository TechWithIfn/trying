import { describe, it, expect } from "vitest";
import {
  buildMergeArgs,
  isMediaMergeError,
  MediaMergeError,
} from "../src/lib/av-merge.js";

describe("DASH merge argument builder", () => {
  it("copies both streams into an MP4 without re-encoding", () => {
    const args = buildMergeArgs("video.mp4", "audio.m4a", "merged.mp4");
    expect(args).toContain("-c:v");
    expect(args[args.indexOf("-c:v") + 1]).toBe("copy");
    expect(args).toContain("-c:a");
    expect(args[args.indexOf("-c:a") + 1]).toBe("copy");
    expect(args).toContain("-movflags");
    expect(args[args.indexOf("-movflags") + 1]).toBe("+faststart");
    expect(args).toContain("-f");
    expect(args[args.indexOf("-f") + 1]).toBe("mp4");
    expect(args[args.length - 1]).toBe("merged.mp4");
  });

  it("maps the video to input 0 and audio to input 1", () => {
    const args = buildMergeArgs("/tmp/v.mp4", "/tmp/a.m4a", "/tmp/out.mp4");
    expect(args[args.indexOf("-i") + 1]).toBe("/tmp/v.mp4");
    expect(args.slice(args.indexOf("-i", args.indexOf("-i") + 1))).toContain("/tmp/a.m4a");
    expect(args).toContain("0:v:0");
    expect(args).toContain("1:a:0");
  });
});

describe("MediaMergeError", () => {
  it("carries a public error code and is recognized by the guard", () => {
    const error = new MediaMergeError("MEDIA_MERGE_UNAVAILABLE");
    expect(error.code).toBe("MEDIA_MERGE_UNAVAILABLE");
    expect(isMediaMergeError(error)).toBe(true);
    expect(isMediaMergeError(new Error("x"))).toBe(false);
  });
});
