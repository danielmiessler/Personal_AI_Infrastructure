import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/YouTubeDigest/Tools/FetchTranscript.ts");

describe("FetchTranscript", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* FetchTranscript.ts");
      expect(content).toContain("Fetch transcript for a YouTube video");
    });

    test("imports parseArgs from util", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { parseArgs } from "util"');
    });

    test("imports shell from bun", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { $ } from "bun"');
    });
  });

  describe("environment configuration", () => {
    test("uses PAI_DIR environment variable", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.PAI_DIR");
    });

    test("falls back to ~/.claude", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('process.env.HOME || ""');
      expect(content).toContain('".claude"');
    });

    test("defines PYTHON path to venv", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/venv/bin/python3");
    });

    test("defines SCRIPT path to fetch_transcript.py", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("skills/YouTubeDigest/Tools/fetch_transcript.py");
    });
  });

  describe("extractVideoId function", () => {
    test("handles youtu.be short URLs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("youtu\\.be\\/([a-zA-Z0-9_-]+)");
    });

    test("handles watch?v= URLs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("[?&]v=([a-zA-Z0-9_-]+)");
    });

    test("handles embed URLs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("\\/embed\\/([a-zA-Z0-9_-]+)");
    });

    test("validates 11-char video IDs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("^[a-zA-Z0-9_-]{11}$");
    });

    test("returns null for invalid URLs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("return null");
    });
  });

  describe("fetchTranscript function", () => {
    test("calls Python script with video ID", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("${PYTHON} ${SCRIPT} ${videoId}");
    });

    test("parses JSON response", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("JSON.parse(result)");
    });

    test("throws on error response", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (data.error)");
      expect(content).toContain("throw new Error(data.error)");
    });

    test("returns transcript text", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("return data.transcript");
    });
  });

  describe("argument parsing", () => {
    test("defines --url option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('url: { type: "string" }');
    });

    test("defines --id option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('id: { type: "string" }');
    });

    test("defines --json output option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('json: { type: "boolean" }');
    });

    test("defines --help option with -h shorthand", async () => {
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
      expect(stdout).toContain("FetchTranscript");
      expect(stdout).toContain("Usage:");
    });

    test("shows both --url and --id options", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--url <url>");
      expect(content).toContain("--id <id>");
    });

    test("includes examples", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Examples:");
      expect(content).toContain("youtube.com/watch?v=");
    });
  });

  describe("validation", () => {
    test("shows help when no url or id provided", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!values.url && !values.id");
    });

    test("extracts video ID from url or uses id directly", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("values.id || extractVideoId(values.url");
    });

    test("exits with error on invalid URL", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Could not extract video ID from URL");
      expect(content).toContain("process.exit(1)");
    });
  });

  describe("output modes", () => {
    test("outputs JSON with metadata when --json flag set", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (values.json)");
      expect(content).toContain("JSON.stringify");
      expect(content).toContain("videoId");
      expect(content).toContain("transcript");
      expect(content).toContain("length");
    });

    test("outputs plain transcript by default", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.log(transcript)");
    });
  });

  describe("error handling", () => {
    test("wraps main execution in try-catch", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("try {");
      expect(content).toContain("} catch (error: any) {");
    });

    test("logs error message", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.error(`Error: ${error.message}`)");
    });

    test("exits with code 1 on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(1)");
    });

    test("has global catch handler", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("main().catch(console.error)");
    });
  });
});
