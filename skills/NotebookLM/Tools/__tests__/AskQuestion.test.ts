import { test, expect, describe } from "bun:test";
import { join } from "path";

const toolPath = join(process.cwd(), "skills/NotebookLM/Tools/AskQuestion.ts");

describe("AskQuestion", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* AskQuestion");
      expect(content).toContain("Query NotebookLM notebooks");
    });

    test("imports shell from bun", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { $ } from "bun"');
    });

    test("imports parseArgs from util", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import { parseArgs } from "util"');
    });

    test("calculates skillDir from import.meta.dir", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('import.meta.dir.replace("/Tools", "")');
    });
  });

  describe("argument parsing with parseArgs", () => {
    test("defines question option with string type", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('question: { type: "string"');
    });

    test("defines -q shorthand for question", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('short: "q"');
    });

    test("defines notebook-id option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('"notebook-id": { type: "string" }');
    });

    test("defines notebook-url option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('"notebook-url": { type: "string" }');
    });

    test("defines show-browser boolean option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('"show-browser": { type: "boolean"');
    });

    test("show-browser defaults to false", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("default: false");
    });

    test("defines help option with -h shorthand", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('help: { type: "boolean", short: "h" }');
    });

    test("allows positional arguments", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("allowPositionals: true");
    });

    test("slices argv starting at index 2", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("args: Bun.argv.slice(2)");
    });
  });

  describe("argument building for python", () => {
    test("builds args array with question", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('const args: string[] = ["--question", values.question]');
    });

    test("conditionally adds notebook-id to args", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('if (values["notebook-id"])');
      expect(content).toContain('args.push("--notebook-id", values["notebook-id"])');
    });

    test("conditionally adds notebook-url to args", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('if (values["notebook-url"])');
      expect(content).toContain('args.push("--notebook-url", values["notebook-url"])');
    });

    test("conditionally adds show-browser flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('if (values["show-browser"])');
      expect(content).toContain('args.push("--show-browser")');
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
      expect(stdout).toContain("AskQuestion");
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
      expect(stdout).toContain("AskQuestion");
    });

    test("shows help and exits 1 when question not provided", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stdout).toContain("AskQuestion");
    });

    test("help documents all options", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("-q, --question");
      expect(content).toContain("--notebook-id");
      expect(content).toContain("--notebook-url");
      expect(content).toContain("--show-browser");
      expect(content).toContain("-h, --help");
    });

    test("help indicates question is required", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("(required)");
    });

    test("includes examples in help", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Examples:");
      expect(content).toContain('--question "Explain React hooks"');
      expect(content).toContain('--notebook-url "https://...');
      expect(content).toContain("--show-browser");
    });
  });

  describe("validation", () => {
    test("shows help when question missing", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("values.help || !values.question");
    });

    test("exits 0 for help, 1 for missing question", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(values.help ? 0 : 1)");
    });
  });

  describe("python script delegation", () => {
    test("calls ask_question.py via run.py", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("python3");
      expect(content).toContain("${skillDir}/Scripts/run.py");
      expect(content).toContain("ask_question.py");
    });

    test("passes built args to python script", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("ask_question.py ${args}");
    });
  });

  describe("error handling", () => {
    test("wraps execution in try-catch", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("try {");
      expect(content).toContain("} catch (error) {");
    });

    test("logs query errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('console.error("Error querying NotebookLM:"');
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
});
