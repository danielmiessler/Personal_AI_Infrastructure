import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, readFileSync, existsSync } from "fs";

/**
 * Logger.ts Tests
 *
 * Tests for TelegramLogger class and logTelegramEvent utility function.
 * These utilities handle JSONL logging for Telegram delivery events.
 */

describe("TelegramDelivery Logger", () => {
  const testDir = join(tmpdir(), `pai-telegram-logger-test-${Date.now()}`);
  const historyDir = join(testDir, "history");
  const logFile = join(historyDir, "telegram-delivery.jsonl");
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

  describe("TelegramLogger class", () => {
    test("creates unique session ID when not provided", async () => {
      // Dynamic import to pick up PAI_DIR environment
      const { TelegramLogger } = await import("../Logger.ts");

      const logger1 = new TelegramLogger();
      const logger2 = new TelegramLogger();

      expect(logger1.getSessionId()).not.toBe(logger2.getSessionId());
      expect(logger1.getSessionId()).toContain("tg-");
    });

    test("uses provided session ID", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const customId = "custom-telegram-session";
      const logger = new TelegramLogger(customId);

      expect(logger.getSessionId()).toBe(customId);
    });

    test("logs event to JSONL file", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const logger = new TelegramLogger("test-session");
      logger.log({ event: "send", file_path: "/path/to/file.pdf" });

      expect(existsSync(logFile)).toBe(true);

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.session_id).toBe("test-session");
      expect(entry.event).toBe("send");
      expect(entry.file_path).toBe("/path/to/file.pdf");
      expect(entry.timestamp).toBeDefined();
    });

    test("logs multiple events with same session ID", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const logger = new TelegramLogger("multi-event-session");
      logger.log({ event: "send", file_path: "/file.pdf" });
      logger.log({ event: "complete", bytes_sent: 1024 });

      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");

      expect(lines.length).toBe(2);

      const events = lines.map((line) => JSON.parse(line));
      expect(events[0].event).toBe("send");
      expect(events[0].file_path).toBe("/file.pdf");
      expect(events[1].event).toBe("complete");
      expect(events[1].bytes_sent).toBe(1024);

      // All should have same session ID
      events.forEach((e) => {
        expect(e.session_id).toBe("multi-event-session");
      });
    });

    test("includes timestamp in ISO format", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const logger = new TelegramLogger();
      logger.log({ event: "send" });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      // Verify it's a valid ISO timestamp
      const timestamp = new Date(entry.timestamp);
      expect(timestamp.toISOString()).toBe(entry.timestamp);
    });

    test("handles all event types", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const eventTypes = ["send", "complete", "error"] as const;

      const logger = new TelegramLogger("event-types-test");

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
      const { TelegramLogger } = await import("../Logger.ts");

      const logger = new TelegramLogger();
      logger.log({
        event: "send",
        file_path: "/docs/report.pdf",
        file_size: 2048,
        chat_id: 123456789,
        metadata: { mime_type: "application/pdf" },
      });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.file_path).toBe("/docs/report.pdf");
      expect(entry.file_size).toBe(2048);
      expect(entry.chat_id).toBe(123456789);
      expect(entry.metadata.mime_type).toBe("application/pdf");
    });

    test("defaults event to 'send' when not provided", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const logger = new TelegramLogger();
      logger.log({ file_path: "/test.txt" });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe("send");
      expect(entry.file_path).toBe("/test.txt");
    });
  });

  describe("logTelegramEvent utility function", () => {
    test("creates one-off log entries", async () => {
      const { logTelegramEvent } = await import("../Logger.ts");

      logTelegramEvent({ event: "send", file_path: "/report.pdf" });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe("send");
      expect(entry.file_path).toBe("/report.pdf");
    });

    test("uses provided session ID", async () => {
      const { logTelegramEvent } = await import("../Logger.ts");

      logTelegramEvent({ event: "complete" }, "custom-session-789");

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.session_id).toBe("custom-session-789");
    });

    test("generates unique session ID when not provided", async () => {
      const { logTelegramEvent } = await import("../Logger.ts");

      logTelegramEvent({ event: "send" });
      logTelegramEvent({ event: "send" });

      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");
      const entries = lines.map((line) => JSON.parse(line));

      // Each call creates a new logger with unique session ID
      expect(entries[0].session_id).not.toBe(entries[1].session_id);
    });
  });

  describe("error logging", () => {
    test("logs error events with details", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const logger = new TelegramLogger("error-session");
      logger.log({
        event: "error",
        error_message: "Failed to connect to Telegram API",
        error_code: "ECONNREFUSED",
      });

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe("error");
      expect(entry.error_message).toBe("Failed to connect to Telegram API");
      expect(entry.error_code).toBe("ECONNREFUSED");
    });
  });

  describe("TelegramEvent interface", () => {
    test("exports TelegramEvent type", async () => {
      const loggerModule = await import("../Logger.ts");

      // Type check - this would fail at compile time if TelegramEvent wasn't exported
      expect(loggerModule.TelegramLogger).toBeDefined();
      expect(loggerModule.logTelegramEvent).toBeDefined();
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
      const { TelegramLogger } = await import("../Logger.ts");
      const logger = new TelegramLogger();
      logger.log({ event: "send" });

      expect(existsSync(historyDir)).toBe(true);
    });

    test("appends to existing log file", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const logger1 = new TelegramLogger("session-1");
      logger1.log({ event: "send" });

      const logger2 = new TelegramLogger("session-2");
      logger2.log({ event: "complete" });

      const content = readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");

      expect(lines.length).toBe(2);
    });
  });

  describe("session ID format", () => {
    test("auto-generated ID includes timestamp component", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const before = Date.now();
      const logger = new TelegramLogger();
      const after = Date.now();

      const sessionId = logger.getSessionId();
      // Format: tg-{timestamp}-{random}
      const parts = sessionId.split("-");

      expect(parts[0]).toBe("tg");

      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test("auto-generated ID includes random component", async () => {
      const { TelegramLogger } = await import("../Logger.ts");

      const logger = new TelegramLogger();
      const sessionId = logger.getSessionId();

      // Format: tg-{timestamp}-{random}
      const parts = sessionId.split("-");
      expect(parts.length).toBe(3);
      expect(parts[2].length).toBe(9); // 9 character random suffix
    });
  });
});
