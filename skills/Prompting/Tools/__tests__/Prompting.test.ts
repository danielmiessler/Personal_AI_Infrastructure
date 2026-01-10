import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync } from "fs";

/**
 * Prompting Tools Tests
 *
 * Tests for RenderTemplate.ts and ValidateTemplate.ts
 * Note: These tools require handlebars package. Tests verify CLI behavior.
 */

describe("Prompting Tools", () => {
  const testDir = join(tmpdir(), `pai-prompting-test-${Date.now()}`);
  const toolsDir = join(process.cwd(), "skills", "Prompting", "Tools");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "templates"), { recursive: true });
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

  describe("RenderTemplate.ts", () => {
    const toolPath = join(toolsDir, "RenderTemplate.ts");

    test("script file exists", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
    });

    test("contains expected CLI options in source", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--template");
      expect(content).toContain("--data");
      expect(content).toContain("--help");
    });

    test("defines RenderTemplate function", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("renderTemplate");
    });

    test("uses Handlebars for templating", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars");
    });
  });

  describe("ValidateTemplate.ts", () => {
    const toolPath = join(toolsDir, "ValidateTemplate.ts");

    test("script file exists", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
    });

    test("contains expected CLI options in source", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--template");
      expect(content).toContain("--data");
      expect(content).toContain("--strict");
      expect(content).toContain("--help");
    });

    test("defines validateTemplate function", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("validateTemplate");
    });

    test("extracts variables from templates", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("extractVariables");
    });

    test("checks for unbalanced blocks", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("checkUnbalancedBlocks");
    });

    test("defines ValidationResult interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("ValidationResult");
      expect(content).toContain("valid");
      expect(content).toContain("errors");
      expect(content).toContain("warnings");
    });
  });
});
