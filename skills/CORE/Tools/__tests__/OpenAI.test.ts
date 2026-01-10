import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync } from "fs";

describe("OpenAI.ts CLI", () => {
  const testDir = join(tmpdir(), `pai-openai-test-${Date.now()}`);
  const toolPath = join(process.cwd(), "skills", "CORE", "Tools", "OpenAI.ts");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    process.env.PAI_DIR = testDir;
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

  describe("--help flag", () => {
    test("displays usage information", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Usage: bun run OpenAI.ts");
      expect(stdout).toContain("--prompt");
      expect(stdout).toContain("--model");
      expect(stdout).toContain("--system");
      expect(stdout).toContain("--temperature");
      expect(stdout).toContain("--max-tokens");
      expect(stdout).toContain("--stream");
    });

    test("lists available models", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Available Models:");
      expect(stdout).toContain("gpt-4o");
      expect(stdout).toContain("gpt-4o-mini");
    });

    test("shows environment variable requirement", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("OPENAI_API_KEY");
    });
  });

  describe("missing API key handling", () => {
    test("exits with error when API key is missing", async () => {
      delete process.env.OPENAI_API_KEY;

      const proc = Bun.spawn(["bun", "run", toolPath, "--prompt", "test"], {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          PAI_DIR: testDir,
          OPENAI_API_KEY: undefined,
        },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("MISSING_API_KEY");
    });

    test("accepts OPENAI_API_KEY from .env file", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-openai-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath, "--prompt", "test"], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir, OPENAI_API_KEY: undefined },
      });

      const stderr = await new Response(proc.stderr).text();
      // It will fail on API call but should get past the key check
      expect(stderr).toContain("Querying OpenAI");
    });
  });

  describe("missing prompt handling", () => {
    test("exits with error when no prompt provided", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      proc.stdin.write("");
      proc.stdin.end();

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("MISSING_PROMPT");
    });
  });

  describe("argument parsing", () => {
    test("accepts --model argument", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--model", "gpt-4-turbo"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("gpt-4-turbo");
    });

    test("accepts --temperature argument", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--temperature", "0.9"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying OpenAI");
    });

    test("accepts --system argument", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--system", "You are a pirate"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying OpenAI");
    });

    test("accepts --max-tokens argument", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--max-tokens", "500"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying OpenAI");
    });

    test("accepts --stream flag", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--stream"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying OpenAI");
    });

    test("reads prompt from stdin", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      proc.stdin.write("Hello from stdin to OpenAI");
      proc.stdin.end();

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying OpenAI");
    });
  });

  describe("default values", () => {
    test("uses gpt-4o as default model", async () => {
      writeFileSync(join(testDir, ".env"), "OPENAI_API_KEY=test-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath, "--prompt", "test"], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("gpt-4o");
    });
  });
});
