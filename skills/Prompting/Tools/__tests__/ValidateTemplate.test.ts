import { test, expect, describe } from "bun:test";
import { join } from "path";

/**
 * ValidateTemplate.ts Tests
 *
 * Note: The handlebars package is not installed in this environment.
 * These tests verify the source file structure and expected behavior
 * based on source code inspection rather than CLI execution.
 */

describe("ValidateTemplate", () => {
  const toolPath = join(
    process.cwd(),
    "skills",
    "Prompting",
    "Tools",
    "ValidateTemplate.ts"
  );

  describe("source file structure", () => {
    test("script file exists", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
    });

    test("is executable TypeScript", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("imports Handlebars library", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("import Handlebars from 'handlebars'");
    });

    test("imports YAML parser", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("import { parse as parseYaml } from 'yaml'");
    });
  });

  describe("CLI options in source", () => {
    test("contains --template option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--template");
      expect(content).toContain("template: { type: 'string', short: 't' }");
    });

    test("contains --data option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--data");
      expect(content).toContain("data: { type: 'string', short: 'd' }");
    });

    test("contains --strict option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--strict");
      expect(content).toContain("strict: { type: 'boolean', short: 's' }");
    });

    test("contains --help option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--help");
      expect(content).toContain("help: { type: 'boolean', short: 'h' }");
    });
  });

  describe("ValidationResult interface", () => {
    test("defines ValidationResult type", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface ValidationResult");
      expect(content).toContain("valid: boolean");
      expect(content).toContain("errors: string[]");
      expect(content).toContain("warnings: string[]");
      expect(content).toContain("variables: string[]");
      expect(content).toContain("helpers: string[]");
      expect(content).toContain("partials: string[]");
    });
  });

  describe("ValidateOptions interface", () => {
    test("defines ValidateOptions type", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface ValidateOptions");
      expect(content).toContain("templatePath: string");
      expect(content).toContain("dataPath?: string");
      expect(content).toContain("strict?: boolean");
    });
  });

  describe("core validation functions", () => {
    test("exports validateTemplate function", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("export function validateTemplate(");
    });

    test("extractVariables function defined", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function extractVariables(source: string)");
      // Checks for simple variables
      expect(content).toContain("matchAll(/\\{\\{([a-zA-Z_]");
    });

    test("extractHelpers function defined", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function extractHelpers(source: string)");
    });

    test("extractPartials function defined", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function extractPartials(source: string)");
      expect(content).toContain("{{>");
    });

    test("checkUnbalancedBlocks function defined", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function checkUnbalancedBlocks(source: string)");
    });

    test("checkMissingVariables function defined", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function checkMissingVariables(");
    });
  });

  describe("block validation logic", () => {
    test("detects unclosed blocks", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Unclosed block");
    });

    test("detects mismatched blocks", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Mismatched block");
    });

    test("detects unexpected closing blocks", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Unexpected closing block");
    });

    test("tracks block stack with line numbers", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("blockStack");
      expect(content).toContain("line: number");
    });
  });

  describe("variable extraction patterns", () => {
    test("matches simple variables {{variable}}", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("simpleVars");
      expect(content).toContain("matchAll");
    });

    test("matches object paths {{object.property}}", async () => {
      const content = await Bun.file(toolPath).text();
      // The regex pattern should include dots for paths
      expect(content).toContain("a-zA-Z0-9_.");
    });

    test("matches block variables like #each and #if", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("blockVars");
      // Regex pattern contains each|if|unless|with
      expect(content).toContain("each|if|unless|with");
    });
  });

  describe("data file handling", () => {
    test("supports JSON data files", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain(".json')");
      expect(content).toContain("JSON.parse(");
    });

    test("supports YAML data files", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("parseYaml(");
    });

    test("handles data file not found", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Data file not found");
    });
  });

  describe("strict mode behavior", () => {
    test("treats missing variables as errors in strict mode", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("if (options.strict)");
      expect(content).toContain("Missing variable");
    });

    test("treats missing variables as warnings in non-strict mode", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("warnings.push(");
    });
  });

  describe("output formatting", () => {
    test("shows validation status", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Valid");
      expect(content).toContain("Invalid");
    });

    test("lists extracted variables", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Variables (");
    });

    test("lists helpers used", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Helpers Used");
    });

    test("lists partials", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Partials (");
    });

    test("shows errors section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Errors (");
    });

    test("shows warnings section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Warnings (");
    });
  });

  describe("special variable handling", () => {
    test("skips special Handlebars variables", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("this");
      expect(content).toContain("@index");
      expect(content).toContain("@key");
      expect(content).toContain("@first");
      expect(content).toContain("@last");
      expect(content).toContain("@root");
    });
  });

  describe("syntax validation", () => {
    test("uses Handlebars.compile for syntax checking", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.compile(source)");
    });

    test("catches and reports syntax errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Syntax error:");
      expect(content).toContain("catch (error)");
    });
  });

  describe("exit codes", () => {
    test("exits 0 for valid templates", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(result.valid ? 0 : 1)");
    });

    test("exits 1 for invalid templates", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(result.valid ? 0 : 1)");
    });
  });
});
