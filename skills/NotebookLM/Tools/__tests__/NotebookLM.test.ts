import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync } from "fs";

/**
 * NotebookLM Tools Tests
 *
 * These tools wrap Python scripts for NotebookLM integration.
 * We test CLI behavior, argument parsing, and graceful error handling.
 */

describe("NotebookLM Tools", () => {
  const testDir = join(tmpdir(), `pai-notebooklm-test-${Date.now()}`);
  const toolsDir = join(process.cwd(), "skills", "NotebookLM", "Tools");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
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

  describe("AskQuestion.ts", () => {
    const toolPath = join(toolsDir, "AskQuestion.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("AskQuestion");
      expect(stdout).toContain("--question");
      expect(stdout).toContain("--notebook");
    });

    test("requires question parameter", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const exitCode = await proc.exited;
      // Exits with error when missing required params
      expect(exitCode).toBe(1);
    });

    test("accepts -q shorthand for question", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("-q");
    });

    test("accepts -n shorthand for notebook", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("-n");
    });
  });

  describe("Authenticate.ts", () => {
    const toolPath = join(toolsDir, "Authenticate.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Authenticate");
    });

    test("runs without args to show status", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      // May fail if Python not available, but should exit gracefully
      await proc.exited;
      // We just verify it doesn't hang
    });
  });

  describe("ManageNotebook.ts", () => {
    const toolPath = join(toolsDir, "ManageNotebook.ts");

    test("displays help with --help flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("ManageNotebook");
      expect(stdout).toContain("list");
    });

    test("supports list command", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("list");
    });

    test("supports add command", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("add");
    });
  });
});
