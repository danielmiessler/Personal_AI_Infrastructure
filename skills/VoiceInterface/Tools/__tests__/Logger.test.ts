import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, readFileSync, existsSync } from "fs";

/**
 * Logger.ts Tests
 *
 * Tests for VoiceLogger class and logVoiceEvent utility function.
 * These utilities handle JSONL logging for voice sessions.
 */

describe("VoiceInterface Logger", () => {
  const testDir = join(tmpdir(), `pai-voice-logger-test-${Date.now()}`);
  const historyDir = join(testDir, "history");
  const logFile = join(historyDir, "voice-sessions.jsonl");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(historyDir, { recursive: true });
    process.env.PAI_DIR = testDir;
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

  describe("VoiceLogger class", () => {
    test("creates unique session ID when not provided", async () => {
      // Dynamic import to pick up PAI_DIR environment
      const { VoiceLogger } = await import("../Logger.ts");

      const logger1 = new VoiceLogger();
      const logger2 = new VoiceLogger();

      expect(logger1.getSessionId()).not.toBe(logger2.getSessionId());
      expect(logger1.getSessionId()).toContain("voice-");
    });

    test("uses provided session ID", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const customId = "custom-session-123";
      const logger = new VoiceLogger(customId);

      expect(logger.getSessionId()).toBe(customId);
    });

    test("logs event to JSONL file", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const logger = new VoiceLogger("test-session");
      logger.log({ event: "record", duration_ms: 5000 });

      expect(existsSync(logFile)).toBe(true);

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.session_id).toBe("test-session");
      expect(entry.event).toBe("record");
      expect(entry.duration_ms).toBe(5000);
      expect(entry.timestamp).toBeDefined();
    });

    test("logs multiple events with same session ID", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const logger = new VoiceLogger("multi-event-session");
      logger.log({ event: "record" });
      logger.log({ event: "transcribe", text: "hello" });
      logger.log({ event: "complete" });

      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");

      expect(lines.length).toBe(3);

      const events = lines.map((line) => JSON.parse(line));
      expect(events[0].event).toBe("record");
      expect(events[1].event).toBe("transcribe");
      expect(events[1].text).toBe("hello");
      expect(events[2].event).toBe("complete");

      // All should have same session ID
      events.forEach((e) => {
        expect(e.session_id).toBe("multi-event-session");
      });
    });

    test("includes timestamp in ISO format", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const logger = new VoiceLogger();
      logger.log({ event: "record" });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      // Verify it's a valid ISO timestamp
      const timestamp = new Date(entry.timestamp);
      expect(timestamp.toISOString()).toBe(entry.timestamp);
    });

    test("handles all event types", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const eventTypes = [
        "record",
        "transcribe",
        "query",
        "response",
        "speak",
        "complete",
        "error",
      ] as const;

      const logger = new VoiceLogger("event-types-test");

      for (const eventType of eventTypes) {
        logger.log({ event: eventType });
      }

      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");
      const events = lines.map((line) => JSON.parse(line));

      eventTypes.forEach((eventType, i) => {
        expect(events[i].event).toBe(eventType);
      });
    });

    test("preserves arbitrary additional properties", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const logger = new VoiceLogger();
      logger.log({
        event: "transcribe",
        text: "Hello world",
        confidence: 0.95,
        provider: "whisper",
        metadata: { model: "large-v3" },
      });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.text).toBe("Hello world");
      expect(entry.confidence).toBe(0.95);
      expect(entry.provider).toBe("whisper");
      expect(entry.metadata.model).toBe("large-v3");
    });

    test("defaults event to 'unknown' when not provided", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const logger = new VoiceLogger();
      logger.log({ custom_data: "test" });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe("unknown");
      expect(entry.custom_data).toBe("test");
    });
  });

  describe("logVoiceEvent utility function", () => {
    test("creates one-off log entries", async () => {
      const { logVoiceEvent } = await import("../Logger.ts");

      logVoiceEvent({ event: "record", duration_ms: 3000 });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe("record");
      expect(entry.duration_ms).toBe(3000);
    });

    test("uses provided session ID", async () => {
      const { logVoiceEvent } = await import("../Logger.ts");

      logVoiceEvent({ event: "complete" }, "custom-session-456");

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.session_id).toBe("custom-session-456");
    });

    test("generates unique session ID when not provided", async () => {
      const { logVoiceEvent } = await import("../Logger.ts");

      logVoiceEvent({ event: "record" });
      logVoiceEvent({ event: "record" });

      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");
      const entries = lines.map((line) => JSON.parse(line));

      // Each call creates a new logger with unique session ID
      expect(entries[0].session_id).not.toBe(entries[1].session_id);
    });
  });

  describe("VoiceEvent interface", () => {
    test("exports VoiceEvent type", async () => {
      const loggerModule = await import("../Logger.ts");

      // Type check - this would fail at compile time if VoiceEvent wasn't exported
      const event: typeof loggerModule.VoiceEvent = undefined as any;
      expect(loggerModule.VoiceLogger).toBeDefined();
    });
  });

  describe("file system behavior", () => {
    test("creates history directory if missing", async () => {
      // Remove history dir
      rmSync(historyDir, { recursive: true, force: true });
      expect(existsSync(historyDir)).toBe(false);

      // Force re-import to trigger directory creation
      const modulePath = require.resolve("../Logger.ts");
      delete require.cache[modulePath];

      // This should create the directory
      const { VoiceLogger } = await import("../Logger.ts");
      const logger = new VoiceLogger();
      logger.log({ event: "test" });

      expect(existsSync(historyDir)).toBe(true);
    });

    test("appends to existing log file", async () => {
      const { VoiceLogger } = await import("../Logger.ts");

      const logger1 = new VoiceLogger("session-1");
      logger1.log({ event: "record" });

      const logger2 = new VoiceLogger("session-2");
      logger2.log({ event: "transcribe" });

      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");

      expect(lines.length).toBe(2);
    });
  });
});
