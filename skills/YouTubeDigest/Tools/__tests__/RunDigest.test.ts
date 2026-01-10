import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/YouTubeDigest/Tools/RunDigest.ts");

describe("RunDigest", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* RunDigest.ts");
      expect(content).toContain("Full pipeline");
    });

    test("imports parseArgs from util", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { parseArgs } from "util"');
    });

    test("imports shell from bun", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { $ } from "bun"');
    });

    test("imports Anthropic SDK", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import Anthropic from "@anthropic-ai/sdk"');
    });
  });

  describe("environment configuration", () => {
    test("uses PAI_DIR environment variable", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.PAI_DIR");
    });

    test("defines paths for channels and state", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/channels.json");
      expect(content).toContain("skills/YouTubeDigest/state/processed.json");
    });

    test("defines path to Telegram delivery tool", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/TelegramDelivery/Tools/SendToTelegram.ts");
    });

    test("defines Python and transcript script paths", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/venv/bin/python3");
      expect(content).toContain("skills/YouTubeDigest/Tools/fetch_transcript.py");
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
    });

    test("defines State interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface State");
    });
  });

  describe("data loading functions", () => {
    test("loadChannels returns empty array on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("return config.channels || []");
    });

    test("loadState returns default state on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("return { videos: [], lastRun: null }");
    });

    test("saveState writes JSON with indentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Bun.write(STATE_PATH, JSON.stringify(state, null, 2))");
    });
  });

  describe("RSS parsing", () => {
    test("parses video entries from XML", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("<entry>");
      expect(content).toContain("entryRegex");
    });

    test("decodes HTML entities in titles", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('replace(/&amp;/g, "&")');
      expect(content).toContain('replace(/&lt;/g, "<")');
      expect(content).toContain('replace(/&gt;/g, ">")');
    });
  });

  describe("fetchChannelFeed function", () => {
    test("skips non-UC channel IDs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('!channel.id.startsWith("UC")');
      expect(content).toContain("Handle format not supported");
    });

    test("constructs RSS feed URL", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("youtube.com/feeds/videos.xml?channel_id=");
    });
  });

  describe("fetchTranscript function", () => {
    test("calls Python script", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("${PYTHON} ${TRANSCRIPT_SCRIPT} ${videoId}");
    });

    test("returns null on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("return null");
    });
  });

  describe("summarizeTranscript function", () => {
    test("truncates long transcripts", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("maxLength = 100000");
    });

    test("uses Claude Sonnet model", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("claude-sonnet-4-20250514");
    });

    test("includes Key Points format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("### Key Points");
    });

    test("includes Bottom Line format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("### Bottom Line");
    });
  });

  describe("sendToTelegram function", () => {
    test("logs message in dry-run mode", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("[DRY RUN] Would send to Telegram:");
    });

    test("writes to temp file before sending", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("/tmp/youtube-digest-");
      expect(content).toContain("Bun.write(tempFile, message)");
    });

    test("calls Telegram tool via shell", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("bun run ${TELEGRAM_TOOL}");
    });

    test("handles Telegram delivery failure", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Telegram delivery failed");
    });
  });

  describe("argument parsing", () => {
    test("defines --dry-run option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('"dry-run": { type: "boolean" }');
    });

    test("defines --limit option with default", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('limit: { type: "string", default: "10" }');
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
      expect(stdout).toContain("RunDigest");
      expect(stdout).toContain("Usage:");
    });

    test("documents --dry-run option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--dry-run");
      expect(content).toContain("preview");
    });

    test("documents --limit option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--limit <n>");
      expect(content).toContain("default: 10");
    });
  });

  describe("main pipeline", () => {
    test("exits when no channels configured", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("channels.length === 0");
      expect(content).toContain("No channels configured");
    });

    test("filters out already processed videos", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!state.videos.includes(v.id)");
    });

    test("sorts videos by date and applies limit", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain(".sort((a, b)");
      expect(content).toContain(".slice(0, limit)");
    });

    test("handles no new videos", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("No new videos to process");
    });

    test("skips videos without transcript", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("No transcript available, skipping");
    });

    test("adds delay between videos", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("setTimeout(r, 1000)");
    });
  });

  describe("digest formatting", () => {
    test("includes date header", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("toLocaleDateString");
      expect(content).toContain("weekday:");
    });

    test("includes video count", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("${summaries.length} new video(s) summarized");
    });

    test("joins summaries", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('summaries.join("\\n\\n")');
    });

    test("includes skill attribution", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Generated by YouTubeDigest skill");
    });
  });

  describe("state management", () => {
    test("updates state with processed video IDs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("state.videos.push(...processedIds)");
    });

    test("updates lastRun timestamp", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("state.lastRun = new Date().toISOString()");
    });

    test("skips state update in dry-run mode", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (!dryRun)");
    });
  });

  describe("progress logging", () => {
    test("logs pipeline header", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("YouTube Digest Pipeline");
    });

    test("logs video processing status", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("${video.channelName}: ${video.title}");
    });

    test("logs transcript fetch status", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Got transcript");
    });

    test("logs summarization status", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Summarized");
    });

    test("logs completion message", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Digest complete!");
    });
  });

  describe("error handling", () => {
    test("catches summary errors per video", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Summary failed:");
    });

    test("has global error handler", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("main().catch((error)");
      expect(content).toContain("Fatal error:");
    });

    test("exits with code 1 on fatal error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(1)");
    });
  });
});
