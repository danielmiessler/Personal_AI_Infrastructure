import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync } from "fs";

describe("Gemini.ts CLI", () => {
  const testDir = join(tmpdir(), `pai-gemini-test-${Date.now()}`);
  const toolPath = join(process.cwd(), "skills", "CORE", "Tools", "Gemini.ts");
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
      expect(stdout).toContain("Usage: bun run Gemini.ts");
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
      expect(stdout).toContain("gemini-2.5-flash");
      expect(stdout).toContain("gemini-2.5-pro");
    });

    test("shows environment variable requirement", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("GEMINI_API_KEY");
      expect(stdout).toContain("GOOGLE_API_KEY");
    });
  });

  describe("missing API key handling", () => {
    test("exits with error when API key is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const proc = Bun.spawn(["bun", "run", toolPath, "--prompt", "test"], {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          PAI_DIR: testDir,
          GEMINI_API_KEY: undefined,
          GOOGLE_API_KEY: undefined,
        },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("MISSING_API_KEY");
    });

    test("accepts GEMINI_API_KEY", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-gemini-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath, "--prompt", "test"], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      // It will fail on API call but should get past the key check
      expect(stderr).toContain("Querying Gemini");
    });

    test("falls back to GOOGLE_API_KEY", async () => {
      writeFileSync(join(testDir, ".env"), "GOOGLE_API_KEY=test-google-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath, "--prompt", "test"], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      // It will fail on API call but should get past the key check
      expect(stderr).toContain("Querying Gemini");
    });
  });

  describe("missing prompt handling", () => {
    test("exits with error when no prompt provided", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

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
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--model", "gemini-2.5-pro"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("gemini-2.5-pro");
    });

    test("accepts --temperature argument", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--temperature", "0.5"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying Gemini");
    });

    test("accepts --system argument", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--system", "You are helpful"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying Gemini");
    });

    test("accepts --max-tokens argument", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--prompt", "test", "--max-tokens", "100"],
        {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("Querying Gemini");
    });

    test("accepts --stream flag", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

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
      expect(stderr).toContain("Querying Gemini");
    });

    test("reads prompt from stdin", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      proc.stdin.write("Hello from stdin");
      proc.stdin.end();

      const stderr = await new Response(proc.stderr).text();
      // Should attempt to query (will fail on network, but shows stdin was read)
      expect(stderr).toContain("Querying Gemini");
    });
  });

  describe("default values", () => {
    test("uses gemini-2.5-flash as default model", async () => {
      writeFileSync(join(testDir, ".env"), "GEMINI_API_KEY=test-key\n");

      const proc = Bun.spawn(["bun", "run", toolPath, "--prompt", "test"], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      expect(stderr).toContain("gemini-2.5-flash");
    });
  });
});
