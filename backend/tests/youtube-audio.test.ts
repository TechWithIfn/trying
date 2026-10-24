import { describe, expect, it } from "vitest";
import {
  DEFAULT_YOUTUBE_AUDIO_OPTION,
  YOUTUBE_AUDIO_OPTIONS,
  findYouTubeAudioOption,
  parseYouTubeAudioOption,
} from "@/lib/youtube/audio";

describe("YouTube audio options", () => {
  it("advertises only real MP3 bitrates and M4A/AAC", () => {
    expect(YOUTUBE_AUDIO_OPTIONS.map((option) => `${option.format}:${option.bitrateKbps}`)).toEqual([
      "mp3:320",
      "mp3:256",
      "mp3:128",
      "mp3:96",
      "mp3:64",
      "m4a:128",
    ]);
  });

  it("defaults to 128 kbps MP3 and accepts supported combinations", () => {
    expect(DEFAULT_YOUTUBE_AUDIO_OPTION).toMatchObject({ format: "mp3", bitrateKbps: 128 });
    expect(parseYouTubeAudioOption("mp3", undefined)).toMatchObject({
      format: "mp3",
      bitrateKbps: 128,
    });
    expect(parseYouTubeAudioOption("mp3", "320")).toMatchObject({
      format: "mp3",
      bitrateKbps: 320,
    });
    expect(parseYouTubeAudioOption("m4a", undefined)).toMatchObject({
      format: "m4a",
      bitrateKbps: 128,
    });
  });

  it("rejects fabricated bitrate and format combinations", () => {
    expect(parseYouTubeAudioOption("mp3", "999")).toBeNull();
    expect(parseYouTubeAudioOption("m4a", "320")).toBeNull();
    expect(parseYouTubeAudioOption("mp3", "128k")).toBeNull();
    expect(findYouTubeAudioOption("m4a", 256)).toBeNull();
  });
});
