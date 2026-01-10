import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync } from "fs";

/**
 * VoiceInterface Tools Tests
 *
 * Tests for Record.ts, RemoteQuery.ts, SelfImprove.ts, Speak.ts, Stats.ts, Transcribe.ts
 * These tools handle voice recording, transcription, and remote queries.
 */

describe("VoiceInterface Tools", () => {
  const testDir = join(tmpdir(), `pai-voice-test-${Date.now()}`);
  const toolsDir = join(process.cwd(), "skills", "VoiceInterface", "Tools");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "history"), { recursive: true });
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

  describe("Record.ts", () => {
    const toolPath = join(toolsDir, "Record.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Record.ts");
      expect(stdout).toContain("--duration");
      expect(stdout).toContain("--output");
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
    });

    test("accepts duration option", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("duration");
      expect(stdout).toContain("default: 30");
    });
  });

  describe("RemoteQuery.ts", () => {
    const toolPath = join(toolsDir, "RemoteQuery.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("RemoteQuery");
      expect(stdout).toContain("--host");
      expect(stdout).toContain("--text");
      expect(stdout).toContain("--timeout");
    });

    test("shows environment variable info", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("VULTR_HOST");
    });

    test("defaults to vultr-claude host", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("vultr-claude");
    });
  });

  describe("SelfImprove.ts", () => {
    const toolPath = join(toolsDir, "SelfImprove.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("SelfImprove");
      expect(stdout).toContain("--auto-fix");
    });

    test("shows warning when no log file exists", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Self-Improvement Report");
    });

    test("analyzes existing log file", async () => {
      const logFile = join(testDir, "history", "voice-sessions.jsonl");
      const logEntries = [
        JSON.stringify({
          timestamp: new Date().toISOString(),
          session_id: "test-1",
          event: "complete",
          total_latency_ms: 5000,
        }),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          session_id: "test-2",
          event: "complete",
          total_latency_ms: 6000,
        }),
      ];
      writeFileSync(logFile, logEntries.join("\n"));

      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Self-Improvement Report");
    });

    test("detects high latency issues", async () => {
      const logFile = join(testDir, "history", "voice-sessions.jsonl");
      // Create entries with high latency
      const logEntries = Array(5)
        .fill(null)
        .map((_, i) =>
          JSON.stringify({
            timestamp: new Date().toISOString(),
            session_id: `test-${i}`,
            event: "complete",
            total_latency_ms: 15000, // 15s - above 12s threshold
          })
        );
      writeFileSync(logFile, logEntries.join("\n"));

      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("latency");
    });
  });

  describe("Speak.ts", () => {
    const toolPath = join(toolsDir, "Speak.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Speak.ts");
      expect(stdout).toContain("--text");
      expect(stdout).toContain("--voice-id");
      expect(stdout).toContain("--server");
    });

    test("shows environment variables", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("VOICE_SERVER");
      expect(stdout).toContain("ELEVENLABS_VOICE_ID");
    });

    test("defaults to localhost:8888", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("localhost:8888");
    });
  });

  describe("Stats.ts", () => {
    const toolPath = join(toolsDir, "Stats.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Stats.ts");
      expect(stdout).toContain("--since");
      expect(stdout).toContain("--format");
    });

    test("shows format options", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("json");
      expect(stdout).toContain("table");
    });

    test("fails gracefully when no log file exists", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Log file not found");
    });

    test("outputs JSON format", async () => {
      const logFile = join(testDir, "history", "voice-sessions.jsonl");
      writeFileSync(
        logFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          session_id: "test",
          event: "complete",
          total_latency_ms: 5000,
        })
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--format", "json"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    test("outputs table format by default", async () => {
      const logFile = join(testDir, "history", "voice-sessions.jsonl");
      writeFileSync(
        logFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          session_id: "test",
          event: "complete",
          total_latency_ms: 5000,
        })
      );

      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Voice Interface Statistics");
      expect(stdout).toContain("Total Sessions:");
    });

    test("filters by --since option", async () => {
      const logFile = join(testDir, "history", "voice-sessions.jsonl");
      writeFileSync(
        logFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          session_id: "test",
          event: "complete",
          total_latency_ms: 5000,
        })
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "24h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Voice Interface Statistics");
    });
  });

  describe("Transcribe.ts", () => {
    const toolPath = join(toolsDir, "Transcribe.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Transcribe.ts");
      expect(stdout).toContain("--input");
      expect(stdout).toContain("--provider");
    });

    test("shows available providers", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("whisperflow");
      expect(stdout).toContain("openai");
      expect(stdout).toContain("whisper-cpp");
    });

    test("shows environment variable info", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("WHISPER_PROVIDER");
      expect(stdout).toContain("OPENAI_API_KEY");
    });

    test("fails gracefully when input file not found", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--input", "/nonexistent/audio.wav"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("not found");
    });
  });
});
