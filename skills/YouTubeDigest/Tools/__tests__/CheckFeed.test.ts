import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/YouTubeDigest/Tools/CheckFeed.ts");

describe("CheckFeed", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* CheckFeed.ts");
      expect(content).toContain("Check YouTube RSS feeds for new videos");
    });

    test("imports parseArgs from util", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { parseArgs } from "util"');
    });
  });

  describe("type definitions", () => {
    test("defines Channel interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface Channel");
    });

    test("defines Video interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface Video");
      expect(content).toContain("id: string");
      expect(content).toContain("title: string");
      expect(content).toContain("channelId: string");
      expect(content).toContain("published: string");
      expect(content).toContain("url: string");
    });

    test("defines State interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface State");
      expect(content).toContain("videos: string[]");
      expect(content).toContain("lastRun: string | null");
    });
  });

  describe("environment configuration", () => {
    test("uses PAI_DIR environment variable", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.PAI_DIR");
    });

    test("defines CHANNELS_PATH", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/channels.json");
    });

    test("defines STATE_PATH", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/state/processed.json");
    });
  });

  describe("parseRssFeed function", () => {
    test("extracts channel ID from feed", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("<yt:channelId>");
      expect(content).toContain("channelIdMatch");
    });

    test("extracts video entries", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("<entry>");
      expect(content).toContain("entryRegex");
    });

    test("extracts video ID", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("<yt:videoId>");
      expect(content).toContain("videoIdMatch");
    });

    test("extracts video title", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("<title>");
      expect(content).toContain("titleMatch");
    });

    test("extracts published date", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("<published>");
      expect(content).toContain("publishedMatch");
    });

    test("constructs video URL", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("https://www.youtube.com/watch?v=${videoIdMatch[1]}");
    });
  });

  describe("fetchChannelFeed function", () => {
    test("constructs RSS feed URL for UC channels", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("https://www.youtube.com/feeds/videos.xml?channel_id=");
    });

    test("handles @ handle format with warning", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('channel.id.startsWith("@")');
      expect(content).toContain("Handle format");
      expect(content).toContain("not supported for RSS");
    });

    test("fetches feed via fetch API", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("fetch(feedUrl)");
    });

    test("handles fetch errors gracefully", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Failed to fetch feed for");
      expect(content).toContain("return []");
    });
  });

  describe("argument parsing", () => {
    test("defines --json option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('json: { type: "boolean" }');
    });

    test("defines --all option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('all: { type: "boolean" }');
    });

    test("defines --help option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('help: { type: "boolean", short: "h" }');
    });
  });

  describe("help output", () => {
    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("CheckFeed");
      expect(stdout).toContain("Usage:");
    });

    test("documents --json option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--json");
      expect(content).toContain("Output as JSON");
    });

    test("documents --all option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--all");
      expect(content).toContain("Show all videos");
    });
  });

  describe("channel loading", () => {
    test("exits when no channels configured", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("channels.length === 0");
      expect(content).toContain("No channels configured");
      expect(content).toContain("process.exit(1)");
    });

    test("suggests using ManageChannels to add", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("ManageChannels.ts --add");
    });
  });

  describe("video filtering", () => {
    test("filters new videos by default", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!state.videos.includes(v.id)");
    });

    test("shows all videos with --all flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("values.all");
    });

    test("sorts by published date (newest first)", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("new Date(b.published).getTime() - new Date(a.published).getTime()");
    });
  });

  describe("output modes", () => {
    test("outputs JSON when --json flag set", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (values.json)");
      expect(content).toContain("JSON.stringify(newVideos, null, 2)");
    });

    test("displays formatted output by default", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Found ${newVideos.length} new video(s)");
    });

    test("handles no new videos case", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("No new videos found");
    });

    test("formats video output with date and channel", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("toLocaleDateString()");
      expect(content).toContain("video.channelName");
      expect(content).toContain("video.title");
      expect(content).toContain("video.url");
    });
  });

  describe("progress logging", () => {
    test("logs channel count", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Checking ${channels.length} channels");
    });

    test("logs fetching each channel", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Fetching ${channel.name}");
    });

    test("suppresses logging in JSON mode", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (!values.json)");
    });
  });

  describe("error handling", () => {
    test("has global error handler", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("main().catch(console.error)");
    });
  });
});
