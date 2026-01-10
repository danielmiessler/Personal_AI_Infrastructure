import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/YouTubeDigest/Tools/SummarizeVideo.ts");

describe("SummarizeVideo", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* SummarizeVideo.ts");
      expect(content).toContain("Generate AI summary of a YouTube video");
    });

    test("imports parseArgs from util", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { parseArgs } from "util"');
    });

    test("imports Anthropic SDK", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import Anthropic from "@anthropic-ai/sdk"');
    });

    test("creates Anthropic client", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("const client = new Anthropic()");
    });
  });

  describe("environment configuration", () => {
    test("uses PAI_DIR environment variable", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.PAI_DIR");
    });

    test("defines path to Python venv", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/venv/bin/python3");
    });

    test("defines path to transcript script", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/Tools/fetch_transcript.py");
    });
  });

  describe("extractVideoId function", () => {
    test("handles youtu.be short URLs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("youtu\\.be\\/");
    });

    test("handles watch?v= URLs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("[?&]v=");
    });

    test("validates 11-char video IDs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("^[a-zA-Z0-9_-]{11}$");
    });
  });

  describe("summarizeTranscript function", () => {
    test("truncates long transcripts", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("maxLength = 100000");
      expect(content).toContain("[Transcript truncated...]");
    });

    test("uses Claude Sonnet model", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("claude-sonnet-4-20250514");
    });

    test("sets max_tokens limit", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("max_tokens: 1024");
    });

    test("includes video title in prompt", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Video Title: ${title}");
    });

    test("includes channel name when provided", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("channelName");
    });

    test("formats summary with Key Points section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("### Key Points");
    });

    test("formats summary with Bottom Line section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("### Bottom Line");
    });
  });

  describe("argument parsing", () => {
    test("defines --url option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('url: { type: "string" }');
    });

    test("defines --file option with -f shorthand", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('file: { type: "string", short: "f" }');
    });

    test("defines --stdin option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('stdin: { type: "boolean" }');
    });

    test("defines --title option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('title: { type: "string" }');
    });

    test("defines --channel option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('channel: { type: "string" }');
    });

    test("defines --json option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('json: { type: "boolean" }');
    });

    test("defines --transcript option for direct text", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('transcript: { type: "string" }');
    });
  });

  describe("input sources", () => {
    test("detects if any input is provided", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("values.url || values.transcript || values.file || values.stdin");
    });

    test("fetches transcript from YouTube URL", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (values.url)");
      expect(content).toContain("fetchTranscript(videoId)");
    });

    test("reads transcript from file", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (values.file)");
      expect(content).toContain("Bun.file(values.file).text()");
    });

    test("reads transcript from stdin", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (values.stdin)");
      expect(content).toContain("Bun.stdin.text()");
    });

    test("accepts direct transcript text", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("values.transcript");
    });
  });

  describe("title validation", () => {
    test("requires title with --file", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('--title is required when using --file"');
    });

    test("requires title with --stdin", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('--title is required when using --stdin"');
    });

    test("requires title with --transcript", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('--title is required when using --transcript"');
    });

    test("defaults to 'Untitled Video'", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('"Untitled Video"');
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
      expect(stdout).toContain("SummarizeVideo");
      expect(stdout).toContain("Usage:");
    });

    test("documents all input methods", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--url <url>");
      expect(content).toContain("--file, -f <path>");
      expect(content).toContain("--stdin");
      expect(content).toContain("--transcript <text>");
    });

    test("includes piping examples", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("cat transcript.txt | bun run SummarizeVideo.ts");
      expect(content).toContain("pbpaste |");
    });
  });

  describe("output modes", () => {
    test("outputs JSON when --json flag set", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (values.json)");
      expect(content).toContain("JSON.stringify");
    });

    test("JSON includes title and summary", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("title,");
      expect(content).toContain("summary,");
      expect(content).toContain("transcriptLength");
    });

    test("outputs plain summary by default", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.log(summary)");
    });
  });

  describe("error handling", () => {
    test("handles file read errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Could not read file:");
    });

    test("handles empty stdin", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("No input received from stdin");
    });

    test("has global error handler", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("main().catch((error)");
      expect(content).toContain("console.error(`Error: ${error.message}`)");
    });

    test("exits with code 1 on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(1)");
    });
  });

  describe("logging", () => {
    test("logs fetching status to stderr", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.error(`Fetching transcript for");
    });

    test("logs character counts", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("chars");
      expect(content).toContain("summarizing...");
    });
  });
});
