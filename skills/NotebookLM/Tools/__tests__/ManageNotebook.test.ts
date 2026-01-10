import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/NotebookLM/Tools/ManageNotebook.ts");

describe("ManageNotebook", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* ManageNotebook");
      expect(content).toContain("Manage NotebookLM library");
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
    test("supports list command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("list");
      expect(content).toContain("List all notebooks in library");
    });

    test("supports add command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("add");
      expect(content).toContain("Add a notebook to library");
    });

    test("supports search command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("search");
      expect(content).toContain("Search notebooks by");
    });

    test("supports activate command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("activate");
      expect(content).toContain("Set active notebook");
    });

    test("supports remove command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("remove");
      expect(content).toContain("Remove notebook from library");
    });

    test("supports stats command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("stats");
      expect(content).toContain("Show library statistics");
    });
  });

  describe("add command options", () => {
    test("requires --url option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--url URL");
      expect(content).toContain("NotebookLM URL (required)");
    });

    test("requires --name option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--name NAME");
      expect(content).toContain("Descriptive name (required)");
    });

    test("requires --description option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--description DESC");
      expect(content).toContain("What the notebook contains (required)");
    });

    test("requires --topics option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--topics TOPICS");
      expect(content).toContain("Comma-separated topics (required)");
    });
  });

  describe("other command options", () => {
    test("search uses --query option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("search --query QUERY");
    });

    test("activate uses --id option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("activate --id ID");
    });

    test("remove uses --id option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("remove --id ID");
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
      expect(stdout).toContain("ManageNotebook");
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
      expect(stdout).toContain("ManageNotebook");
    });

    test("shows help and exits 1 when no args provided", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("ManageNotebook");
    });

    test("includes examples in help", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Examples:");
      expect(content).toContain("bun run ManageNotebook.ts list");
      expect(content).toContain("bun run ManageNotebook.ts add");
      expect(content).toContain("bun run ManageNotebook.ts search");
      expect(content).toContain("bun run ManageNotebook.ts activate");
      expect(content).toContain("bun run ManageNotebook.ts remove");
    });

    test("shows add example with all required options", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('--url "https://...');
      expect(content).toContain('--name "React Docs"');
      expect(content).toContain('--description "React documentation"');
      expect(content).toContain('--topics "react,hooks,components"');
    });
  });

  describe("python script delegation", () => {
    test("calls notebook_manager.py via run.py", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("python3");
      expect(content).toContain("${skillDir}/Scripts/run.py");
      expect(content).toContain("notebook_manager.py");
    });

    test("passes args to python script", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("notebook_manager.py ${args}");
    });
  });

  describe("error handling", () => {
    test("wraps execution in try-catch", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("try {");
      expect(content).toContain("} catch (error) {");
    });

    test("logs notebook management errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('console.error("Error managing notebooks:"');
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
