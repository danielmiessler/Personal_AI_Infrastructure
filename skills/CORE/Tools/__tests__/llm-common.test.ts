import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";

// Note: llm-common.ts evaluates PAI_DIR at module load time
// For proper isolation, we test via subprocess with explicit PAI_DIR

describe("llm-common via subprocess", () => {
  const testDir = join(tmpdir(), `pai-llm-test-${Date.now()}`);
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}

    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe("getApiKey", () => {
    test("returns null when key not found anywhere", async () => {
      const testScript = `
        const { getApiKey } = require('./skills/CORE/Tools/lib/llm-common.ts');
        console.log(JSON.stringify({ result: getApiKey('NONEXISTENT_KEY_XYZ') }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const { result } = JSON.parse(stdout.trim());
      expect(result).toBeNull();
    });

    test("returns key from environment variable", async () => {
      const testScript = `
        const { getApiKey } = require('./skills/CORE/Tools/lib/llm-common.ts');
        console.log(JSON.stringify({ result: getApiKey('TEST_API_KEY_ENV') }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        env: { ...process.env, PAI_DIR: testDir, TEST_API_KEY_ENV: "env-key-123" },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const { result } = JSON.parse(stdout.trim());
      expect(result).toBe("env-key-123");
    });

    test("returns key from .env file when not in environment", async () => {
      writeFileSync(join(testDir, ".env"), "MY_FILE_KEY=file-key-456\n");

      const testScript = `
        const { getApiKey } = require('./skills/CORE/Tools/lib/llm-common.ts');
        console.log(JSON.stringify({ result: getApiKey('MY_FILE_KEY') }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const { result } = JSON.parse(stdout.trim());
      expect(result).toBe("file-key-456");
    });

    test("environment variable takes precedence over .env file", async () => {
      writeFileSync(join(testDir, ".env"), "PRIORITY_KEY=from-file\n");

      const testScript = `
        const { getApiKey } = require('./skills/CORE/Tools/lib/llm-common.ts');
        console.log(JSON.stringify({ result: getApiKey('PRIORITY_KEY') }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        env: { ...process.env, PAI_DIR: testDir, PRIORITY_KEY: "from-env" },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const { result } = JSON.parse(stdout.trim());
      expect(result).toBe("from-env");
    });
  });

  describe("logAPICall", () => {
    test("creates log directory and file", async () => {
      const testScript = `
        const { logAPICall } = require('./skills/CORE/Tools/lib/llm-common.ts');
        logAPICall({
          provider: 'openai',
          model: 'gpt-4',
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          duration_ms: 1000,
          success: true,
          streaming: false,
        });
        console.log('done');
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      await proc.exited;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      const logDir = join(testDir, "history", "llm-api-calls", `${year}-${month}`);
      const logFile = join(logDir, `${year}-${month}-${day}_api-calls.jsonl`);

      expect(existsSync(logDir)).toBe(true);
      expect(existsSync(logFile)).toBe(true);
    });

    test("logs entry as valid JSONL", async () => {
      const testScript = `
        const { logAPICall } = require('./skills/CORE/Tools/lib/llm-common.ts');
        logAPICall({
          provider: 'gemini',
          model: 'gemini-1.5-pro',
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300,
          duration_ms: 2000,
          success: true,
          streaming: true,
          temperature: 0.7,
          max_tokens: 4096,
        });
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      await proc.exited;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      const logFile = join(
        testDir,
        "history",
        "llm-api-calls",
        `${year}-${month}`,
        `${year}-${month}-${day}_api-calls.jsonl`
      );

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.provider).toBe("gemini");
      expect(entry.model).toBe("gemini-1.5-pro");
      expect(entry.prompt_tokens).toBe(200);
      expect(entry.success).toBe(true);
      expect(entry.timestamp).toBeDefined();
    });

    test("logs error entries with error_code", async () => {
      const testScript = `
        const { logAPICall } = require('./skills/CORE/Tools/lib/llm-common.ts');
        logAPICall({
          provider: 'openai',
          model: 'gpt-4',
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          duration_ms: 500,
          success: false,
          error_code: 'RATE_LIMIT',
          streaming: false,
        });
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      await proc.exited;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      const logFile = join(
        testDir,
        "history",
        "llm-api-calls",
        `${year}-${month}`,
        `${year}-${month}-${day}_api-calls.jsonl`
      );

      const content = readFileSync(logFile, "utf-8");
      const entry = JSON.parse(content.trim());

      expect(entry.success).toBe(false);
      expect(entry.error_code).toBe("RATE_LIMIT");
    });
  });

  describe("formatError", () => {
    test("outputs JSON error format to stdout", async () => {
      const testScript = `
        const { formatError } = require('./skills/CORE/Tools/lib/llm-common.ts');
        formatError({
          code: 'INVALID_API_KEY',
          message: 'The API key provided is invalid',
          provider: 'openai',
        });
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const parsed = JSON.parse(stdout.trim());
      expect(parsed.error.code).toBe("INVALID_API_KEY");
      expect(parsed.error.message).toBe("The API key provided is invalid");
      expect(parsed.error.provider).toBe("openai");
    });
  });
});
