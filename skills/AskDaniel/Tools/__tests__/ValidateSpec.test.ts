import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync } from "fs";

describe("ValidateSpec.ts CLI", () => {
  const testDir = join(tmpdir(), `pai-validatespec-test-${Date.now()}`);
  const toolPath = join(process.cwd(), "skills", "AskDaniel", "Tools", "ValidateSpec.ts");
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
      expect(stdout).toContain("ValidateSpec");
      expect(stdout).toContain("Required Sections:");
      expect(stdout).toContain("Summary");
      expect(stdout).toContain("Problem Statement");
      expect(stdout).toContain("Architecture");
      expect(stdout).toContain("Test Strategy");
    });

    test("shows exit codes", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "--help"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Exit Codes:");
      expect(stdout).toContain("0 - Spec is valid");
      expect(stdout).toContain("1 - Spec is invalid");
    });
  });

  describe("valid spec validation", () => {
    test("validates spec with all required sections", async () => {
      const specFile = join(testDir, "valid-spec.md");
      // Need > 500 chars for spec to be valid
      const content = `# Feature Spec

## Summary
This is a comprehensive summary of the feature that we are developing. It covers all the key aspects and provides enough detail for implementation.

## Problem Statement
Here is the problem we are solving with this feature. The current system lacks this functionality and users need it to accomplish their goals effectively.

## Architecture
This is the architecture design with enough content to make it valid. We have multiple components that interact with each other. The design follows best practices and is scalable.

## Test Strategy
Here is how we will test this feature using comprehensive testing. We will use unit tests and integration tests to ensure quality. The tests cover all edge cases and expected behaviors.
`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      expect(stdout).toContain("VALID");
    });

    test("returns JSON with --json flag", async () => {
      const specFile = join(testDir, "valid-spec.md");
      // Need > 500 chars for spec to be valid
      const content = `# Feature Spec

## Summary
This is a comprehensive summary of the feature that we are developing. It covers all the key aspects and provides enough detail for implementation.

## Problem Statement
Here is the problem we are solving with this feature. The current system lacks this functionality and users need it to accomplish their goals effectively.

## Architecture
This is the architecture design with enough content to make it valid. We have multiple components that interact with each other. The design follows best practices and is scalable.

## Test Strategy
Here is how we will test this feature using comprehensive testing. We will use unit tests and integration tests to ensure quality. The tests cover all edge cases and expected behaviors.
`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, "--json", specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.valid).toBe(true);
      expect(result.required_sections).toHaveLength(4);
    });
  });

  describe("invalid spec validation", () => {
    test("fails when missing required sections", async () => {
      const specFile = join(testDir, "incomplete-spec.md");
      const content = `# Feature Spec

## Summary
This is a summary.

## Architecture
This is the architecture. Extra text to make it long enough.
More text here to ensure we pass the length check.
`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, "--json", specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      const result = JSON.parse(stdout);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("Problem Statement"))).toBe(true);
      expect(result.errors.some((e: string) => e.includes("Test Strategy"))).toBe(true);
    });

    test("fails when spec is too short", async () => {
      const specFile = join(testDir, "short-spec.md");
      const content = `# Spec

## Summary
Short.

## Problem Statement
Brief.

## Architecture
Minimal.

## Test Strategy
Test.`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, "--json", specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      const result = JSON.parse(stdout);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("too short"))).toBe(true);
    });
  });

  describe("warning detection", () => {
    test("warns about missing recommended sections", async () => {
      const specFile = join(testDir, "missing-recommended.md");
      const content = `# Feature Spec

## Summary
This is a summary of the feature being developed.

## Problem Statement
Here is the problem we are solving with this feature.

## Architecture
This is the architecture design for the solution.

## Test Strategy
Here is how we will test this feature with various tests.

More content to make it long enough for validation.
`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, "--json", specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w: string) => w.includes("CLI Interface"))).toBe(true);
    });

    test("warns about placeholder text", async () => {
      const specFile = join(testDir, "placeholders.md");
      const content = `# Feature Spec

## Summary
This is a summary of the feature. [TODO: Complete this]

## Problem Statement
Here is the problem we are solving.

## Architecture
This is the architecture design with [TBD] details.

## Test Strategy
Here is how we will test. Extra content to pass length.
`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, "--json", specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.warnings.some((w: string) => w.includes("placeholder"))).toBe(true);
    });

    test("warns about FAIL without mitigation", async () => {
      const specFile = join(testDir, "fail-no-mitigation.md");
      const content = `# Feature Spec

## Summary
This is a summary of the feature.

## Problem Statement
Here is the problem we are solving.

## Architecture
This is the architecture design.

| Principle | Status |
|-----------|--------|
| Unix      | FAIL   |

## Test Strategy
Here is how we will test this feature.
`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, "--json", specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("FAIL") && e.includes("mitigation"))).toBe(true);
    });
  });

  describe("file handling", () => {
    test("fails when file not found", async () => {
      const proc = Bun.spawn(["bun", "run", toolPath, "/nonexistent/file.md"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(1);
      expect(stderr).toContain("not found");
    });

    test("fails when no file provided", async () => {
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

  describe("output formats", () => {
    test("outputs table format by default", async () => {
      const specFile = join(testDir, "spec.md");
      const content = `# Spec

## Summary
Summary content here for the feature.

## Problem Statement
Problem content here for the feature.

## Architecture
Architecture content here for the feature.

## Test Strategy
Test strategy content here for the feature.
`;
      writeFileSync(specFile, content);

      const proc = Bun.spawn(["bun", "run", toolPath, specFile], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PAI_DIR: testDir },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      expect(stdout).toContain("Required Sections:");
      expect(stdout).toContain("[x]");
    });
  });
});
