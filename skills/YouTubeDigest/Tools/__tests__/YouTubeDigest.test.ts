import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync } from "fs";

/**
 * YouTubeDigest Tools Tests
 *
 * Tests for CheckFeed.ts, FetchTranscript.ts, ManageChannels.ts, RunDigest.ts, SummarizeVideo.ts
 * These tools handle YouTube channel monitoring and video summarization.
 */

describe("YouTubeDigest Tools", () => {
  const testDir = join(tmpdir(), `pai-youtube-test-${Date.now()}`);
  const toolsDir = join(process.cwd(), "skills", "YouTubeDigest", "Tools");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "skills", "YouTubeDigest", "state"), { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}

    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe("CheckFeed.ts", () => {
    const toolPath = join(toolsDir, "CheckFeed.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("CheckFeed");
      expect(stdout).toContain("--json");
      expect(stdout).toContain("--all");
    });

    test("exits when no channels configured", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("No channels configured");
    });

    test("outputs JSON with --json flag", async () => {
      // Create channels config
      const channelsPath = join(testDir, "skills", "YouTubeDigest", "channels.json");
      writeFileSync(
        channelsPath,
        JSON.stringify({
          channels: [{ id: "UCtest123456789012345", name: "Test Channel" }],
        })
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--json"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      // Should output valid JSON (even if empty array)
      expect(() => JSON.parse(stdout)).not.toThrow();
    });
  });

  describe("FetchTranscript.ts", () => {
    const toolPath = join(toolsDir, "FetchTranscript.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("FetchTranscript");
      expect(stdout).toContain("--url");
      expect(stdout).toContain("--id");
    });

    test("shows examples in help", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Examples:");
      expect(stdout).toContain("youtube.com");
    });

    test("requires url or id parameter", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const exitCode = await proc.exited;
      // Shows help when no args
      expect(exitCode).toBe(0);
    });
  });

  describe("ManageChannels.ts", () => {
    const toolPath = join(toolsDir, "ManageChannels.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("ManageChannels");
      expect(stdout).toContain("--add");
      expect(stdout).toContain("--remove");
      expect(stdout).toContain("--list");
    });

    test("lists no channels when empty", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--list"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("No channels configured");
    });

    test("adds channel with --add", async () => {
      const channelsPath = join(testDir, "skills", "YouTubeDigest", "channels.json");
      mkdirSync(join(testDir, "skills", "YouTubeDigest"), { recursive: true });

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--add", "UCtest123456789012345678", "--name", "Test"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Added channel");
    });

    test("lists channels after adding", async () => {
      const channelsPath = join(testDir, "skills", "YouTubeDigest", "channels.json");
      mkdirSync(join(testDir, "skills", "YouTubeDigest"), { recursive: true });
      writeFileSync(
        channelsPath,
        JSON.stringify({
          channels: [{ id: "UCtest123456789012345", name: "Test Channel" }],
        })
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--list"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Monitored channels:");
      expect(stdout).toContain("Test Channel");
    });

    test("removes channel with --remove", async () => {
      const channelsPath = join(testDir, "skills", "YouTubeDigest", "channels.json");
      mkdirSync(join(testDir, "skills", "YouTubeDigest"), { recursive: true });
      writeFileSync(
        channelsPath,
        JSON.stringify({
          channels: [{ id: "UCtest123", name: "TestChannel" }],
        })
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--remove", "UCtest123"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Removed channel");
    });

    test("fails when removing non-existent channel", async () => {
      const channelsPath = join(testDir, "skills", "YouTubeDigest", "channels.json");
      mkdirSync(join(testDir, "skills", "YouTubeDigest"), { recursive: true });
      writeFileSync(channelsPath, JSON.stringify({ channels: [] }));

      const proc = Bun.spawn(["bun", "run", toolPath, "--remove", "nonexistent"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("not found");
    });
  });

  describe("RunDigest.ts", () => {
    const toolPath = join(toolsDir, "RunDigest.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("RunDigest");
      expect(stdout).toContain("--dry-run");
      expect(stdout).toContain("--limit");
    });

    test("exits when no channels configured", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("No channels configured");
    });

    test("supports dry-run mode", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("dry-run");
      expect(stdout).toContain("preview");
    });
  });

  describe("SummarizeVideo.ts", () => {
    const toolPath = join(toolsDir, "SummarizeVideo.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("SummarizeVideo");
      expect(stdout).toContain("--url");
      expect(stdout).toContain("--file");
      expect(stdout).toContain("--stdin");
      expect(stdout).toContain("--title");
    });

    test("shows input methods", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("--url");
      expect(stdout).toContain("--file");
      expect(stdout).toContain("--stdin");
      expect(stdout).toContain("--transcript");
    });

    test("requires title with --file", async () => {
      const transcriptFile = join(testDir, "transcript.txt");
      writeFileSync(transcriptFile, "This is a transcript");

      const proc = Bun.spawn(["bun", "run", toolPath, "--file", transcriptFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("--title is required");
    });

    test("requires title with --stdin", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--stdin"], {
        stdout: "pipe",
        stderr: "pipe",
        stdin: new Blob(["This is a transcript"]),
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("--title is required");
    });

    test("shows examples in help", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Examples:");
      expect(stdout).toContain("youtube.com");
    });

    test("requires some form of input", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const exitCode = await proc.exited;
      // Shows help when no input provided
      expect(exitCode).toBe(0);
    });
  });
});
