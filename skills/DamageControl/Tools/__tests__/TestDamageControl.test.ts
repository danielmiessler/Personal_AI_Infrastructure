import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync } from "fs";

describe("TestDamageControl.ts CLI", () => {
  const testDir = join(tmpdir(), `pai-testdamagecontrol-test-${Date.now()}`);
  const toolPath = join(process.cwd(), "skills", "DamageControl", "Tools", "TestDamageControl.ts");
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

  describe("no args / help", () => {
    test("shows usage when no arguments", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("DamageControl Test Tool");
      expect(stdout).toContain("-i");
      expect(stdout).toContain("-t");
    });
  });

  describe("quick tests (-t flag)", () => {
    test("runs quick tests suite", { timeout: 30000 }, async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "-t"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Running Quick Tests");
      // Tests should run - output has "PASS" not "passed"
      expect(stdout).toContain("PASS");
    });

    test("runs with --test flag", { timeout: 30000 }, async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--test"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Running Quick Tests");
    });
  });

  describe("CLI mode testing", () => {
    test("tests bash dangerous command - should block", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "bash", "Bash", "rm -rf /tmp/test", "--expect-blocked"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("BLOCKED");
      expect(stdout).toContain("PASSED");
    });

    test("tests bash safe command - should allow", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "bash", "Bash", "ls -la", "--expect-allowed"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("ALLOWED");
      expect(stdout).toContain("PASSED");
    });

    test("tests edit sensitive path - should block", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "edit", "Edit", "~/.ssh/id_rsa", "--expect-blocked"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("BLOCKED");
    });

    test("tests write to .env - should block", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "write", "Write", ".env", "--expect-blocked"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("BLOCKED");
    });

    test("fails when expectation not met", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "bash", "Bash", "ls -la", "--expect-blocked"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("FAILED");
      expect(stdout).toContain("Expected BLOCKED but got ALLOWED");
    });
  });

  describe("usage help", () => {
    test("shows usage with insufficient args", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "bash"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("Examples:");
    });

    test("shows usage with two args", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "bash", "Bash"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("Usage:");
    });
  });

  describe("unknown hook handling", () => {
    test("exits with error for unknown hook type", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "unknown", "Unknown", "test"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Unknown hook");
    });
  });
});
