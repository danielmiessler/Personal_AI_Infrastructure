import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/NotebookLM/Tools/Authenticate.ts");

describe("Authenticate", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* Authenticate");
      expect(content).toContain("Manage NotebookLM authentication");
    });

    test("imports shell from bun", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { $ } from "bun"');
    });

    test("calculates skillDir from import.meta.dir", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import.meta.dir.replace("/Tools", "")');
    });
  });

  describe("commands", () => {
    test("supports status command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("status");
      expect(content).toContain("Check current authentication status");
    });

    test("supports setup command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("setup");
      expect(content).toContain("Initial setup");
      expect(content).toContain("opens browser for Google login");
    });

    test("supports reauth command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("reauth");
      expect(content).toContain("Re-authenticate");
    });

    test("supports clear command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("clear");
      expect(content).toContain("Clear all authentication data");
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
      expect(stdout).toContain("Authenticate");
      expect(stdout).toContain("Usage:");
    });

    test("displays help with -h flag", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "-h"], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Authenticate");
    });

    test("shows help and exits 1 when no args provided", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("Authenticate");
    });

    test("includes examples in help", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Examples:");
      expect(content).toContain("bun run Authenticate.ts status");
      expect(content).toContain("bun run Authenticate.ts setup");
    });

    test("notes about visible browser window", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("VISIBLE browser window");
      expect(content).toContain("manually complete Google login");
    });
  });

  describe("python script delegation", () => {
    test("calls auth_manager.py via run.py", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("python3");
      expect(content).toContain("${skillDir}/Scripts/run.py");
      expect(content).toContain("auth_manager.py");
    });

    test("passes args to python script", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("auth_manager.py ${args}");
    });
  });

  describe("error handling", () => {
    test("wraps execution in try-catch", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("try {");
      expect(content).toContain("} catch (error) {");
    });

    test("logs authentication errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('console.error("Error with authentication:"');
    });

    test("exits with code 1 on error", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(1)");
    });

    test("outputs result via console.log on success", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.log(result)");
    });
  });

  describe("argument handling", () => {
    test("slices argv to get args", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Bun.argv.slice(2)");
    });

    test("checks for help flags in condition", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('args[0] === "--help"');
      expect(content).toContain('args[0] === "-h"');
    });

    test("checks for empty args", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("args.length === 0");
    });
  });
});
