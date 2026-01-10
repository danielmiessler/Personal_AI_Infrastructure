import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync } from "fs";

describe("Review.ts CLI", () => {
  const testDir = join(tmpdir(), `pai-review-test-${Date.now()}`);
  const toolPath = join(process.cwd(), "skills", "AskDaniel", "Tools", "Review.ts");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "history", "reviews"), { recursive: true });
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
      expect(stdout).toContain("AskDaniel CLI");
      expect(stdout).toContain("--feature");
      expect(stdout).toContain("--input");
      expect(stdout).toContain("--json");
    });

    test("shows examples", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Examples:");
      expect(stdout).toContain("--feature");
    });
  });

  describe("feature type detection", () => {
    test("detects skill type", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "add a skill for reading books", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.feature_type).toBe("skill");
    });

    test("detects hook type", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "create a hook for session events", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.feature_type).toBe("hook");
    });

    test("detects tool type", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "build a CLI tool for parsing logs", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.feature_type).toBe("tool");
    });

    test("detects workflow type", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "design a workflow for code review", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.feature_type).toBe("workflow");
    });

    test("returns unknown for undetectable type", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "make everything better", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.feature_type).toBe("unknown");
    });
  });

  describe("red flag detection", () => {
    test("detects 'AI will figure it out' red flag", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "the AI will figure out the right action", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.red_flags_detected.length).toBeGreaterThan(0);
      expect(result.red_flags_detected.join(" ")).toContain("no explicit routing");
      expect(result.recommendation).toBe("REJECT");
    });

    test("detects vibes-based validation red flag", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "use vibes to determine output quality", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.red_flags_detected.length).toBeGreaterThan(0);
      expect(result.recommendation).toBe("REJECT");
    });
  });

  describe("principle scoring", () => {
    test("scores all 10 principles", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "add a simple skill", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(Object.keys(result.principle_scores).length).toBe(10);
      expect(result.principle_scores.clear_thinking).toBeDefined();
      expect(result.principle_scores.unix_philosophy).toBeDefined();
      expect(result.principle_scores.cli_first).toBeDefined();
    });

    test("marks cli_first as PARTIAL for tool type", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "create a CLI tool", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.principle_scores.cli_first.status).toBe("PARTIAL");
    });

    test("flags unix_philosophy for multi-concern features", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "create a tool that reads files and sends emails", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.principle_scores.unix_philosophy.status).toBe("PARTIAL");
    });
  });

  describe("output formats", () => {
    test("outputs markdown by default", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "add a skill"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("# AskDaniel:");
      expect(stdout).toContain("## Principle Scores");
      expect(stdout).toContain("## Recommendation:");
    });

    test("outputs JSON with --json flag", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "add a skill", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(() => JSON.parse(stdout)).not.toThrow();
      const result = JSON.parse(stdout);
      expect(result.timestamp).toBeDefined();
      expect(result.feature_request).toBeDefined();
    });
  });

  describe("file input/output", () => {
    test("reads feature from file with --input", async () => {
      const inputFile = join(testDir, "feature.md");
      writeFileSync(inputFile, "Create a new hook for tracking");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--input", inputFile, "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.feature_type).toBe("hook");
    });

    test("fails gracefully with non-existent input file", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--input", "/nonexistent/file.md"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("not found");
    });

    test("writes output to file with --output", async () => {
      const outputFile = join(testDir, "output.md");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "add a skill", "--output", outputFile],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      await proc.exited;

      const content = await Bun.file(outputFile).text();
      expect(content).toContain("# AskDaniel:");
    });
  });

  describe("recommendations", () => {
    test("recommends PROCEED for clean features", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "add a simple skill", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      // Without any red flags, should get PROCEED or REVISE
      expect(["PROCEED", "REVISE"]).toContain(result.recommendation);
    });

    test("recommends REJECT for features with red flags", async () => {
      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--feature", "the AI will figure out what to do", "--json"],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.recommendation).toBe("REJECT");
    });
  });

  describe("missing feature handling", () => {
    test("requires feature text", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const exitCode = await proc.exited;
      // Shows help when no args
      expect(exitCode).toBe(0);
    });
  });
});
