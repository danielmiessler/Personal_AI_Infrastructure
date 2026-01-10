import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync } from "fs";

describe("Aggregate.ts CLI", () => {
  const testDir = join(tmpdir(), `pai-aggregate-test-${Date.now()}`);
  const toolPath = join(process.cwd(), "skills", "DeepResearch", "Tools", "Aggregate.ts");
  const originalEnv = { ...process.env };

  function getResearchDir(): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return join(testDir, "history", "research", yearMonth);
  }

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(getResearchDir(), { recursive: true });
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
      expect(stdout).toContain("DeepResearch Aggregate");
      expect(stdout).toContain("--since");
      expect(stdout).toContain("--output");
    });

    test("shows examples", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "-h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Examples:");
    });
  });

  describe("report generation", () => {
    test("generates report with no research files", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "1h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("# Deep Research Report");
      expect(stdout).toContain("No research outputs found");
    });

    test("generates report with research files", async () => {
      const researchDir = getResearchDir();
      const researchFile = join(researchDir, "RESEARCH-test.md");

      const content = `---
timestamp: ${new Date().toISOString()}
executor: researcher-breadth
agent_completion: Found 5 key insights
---

## Agent Output

This is the research content with breadth analysis.
Key findings include multiple perspectives.
`;
      writeFileSync(researchFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "1h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("# Deep Research Report");
      expect(stdout).toContain("Executive Summary");
      expect(stdout).toContain("breadth");
    });

    test("groups outputs by executor", async () => {
      const researchDir = getResearchDir();

      // Create breadth researcher output
      writeFileSync(
        join(researchDir, "RESEARCH-breadth.md"),
        `---
timestamp: ${new Date().toISOString()}
executor: researcher-breadth
agent_completion: Breadth analysis complete
---

## Agent Output

Breadth findings here.
`
      );

      // Create depth researcher output
      writeFileSync(
        join(researchDir, "RESEARCH-depth.md"),
        `---
timestamp: ${new Date().toISOString()}
executor: researcher-depth
agent_completion: Depth analysis complete
---

## Agent Output

Depth findings here.
`
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "1h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Breadth Perspective");
      expect(stdout).toContain("Depth Perspective");
    });
  });

  describe("time filtering", () => {
    test("filters by minutes", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "30m"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("# Deep Research Report");
    });

    test("filters by hours", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "2h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("# Deep Research Report");
    });

    test("filters by days", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "7d"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("# Deep Research Report");
    });

    test("errors on invalid since format", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "invalid"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("Invalid --since format");
    });
  });

  describe("output to file", () => {
    test("writes report to file with --output", async () => {
      const outputFile = join(testDir, "report.md");

      const proc = Bun.spawn(
        ["bun", "run", toolPath, "--since", "1h", "--output", outputFile],
        {
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, PAI_DIR: testDir },
        }
      );

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Report written to:");

      const content = await Bun.file(outputFile).text();
      expect(content).toContain("# Deep Research Report");
    });
  });

  describe("default values", () => {
    test("defaults to 1h when --since not provided", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("# Deep Research Report");
    });
  });

  describe("YAML frontmatter parsing", () => {
    test("extracts timestamp from frontmatter", async () => {
      const researchDir = getResearchDir();
      const timestamp = new Date().toISOString();

      writeFileSync(
        join(researchDir, "RESEARCH-frontmatter.md"),
        `---
timestamp: ${timestamp}
executor: researcher-test
agent_completion: Test complete
---

## Agent Output

Test content.
`
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "1h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Test Perspective");
    });

    test("handles missing frontmatter", async () => {
      const researchDir = getResearchDir();

      writeFileSync(
        join(researchDir, "RESEARCH-nofrontmatter.md"),
        `# Research Output

Just content without frontmatter.
`
      );

      const proc = Bun.spawn(["bun", "run", toolPath, "--since", "1h"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
    });
  });
});
