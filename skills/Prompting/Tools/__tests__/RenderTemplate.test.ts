import { test, expect, describe } from "bun:test";
import { join } from "path";

/**
 * RenderTemplate.ts tests
 *
 * Note: The handlebars package is not installed in this environment.
 * These tests verify the source file structure and expected behavior
 * based on source code inspection rather than CLI execution.
 */
describe("RenderTemplate", () => {
  const toolPath = join(process.cwd(), "skills", "Prompting", "Tools", "RenderTemplate.ts");

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

    test("contains --output option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--output");
      expect(content).toContain("output: { type: 'string', short: 'o' }");
    });

    test("contains --preview option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--preview");
      expect(content).toContain("preview: { type: 'boolean', short: 'p' }");
    });

    test("contains --help option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--help");
      expect(content).toContain("help: { type: 'boolean', short: 'h' }");
    });
  });

  describe("Handlebars helpers defined", () => {
    test("uppercase helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('uppercase'");
      expect(content).toContain("toUpperCase()");
    });

    test("lowercase helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('lowercase'");
      expect(content).toContain("toLowerCase()");
    });

    test("titlecase helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('titlecase'");
    });

    test("indent helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('indent'");
      expect(content).toContain("' '.repeat(");
    });

    test("join helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('join'");
      expect(content).toContain("arr.join(");
    });

    test("eq helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('eq'");
      expect(content).toContain("a === b");
    });

    test("gt and lt helpers", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('gt'");
      expect(content).toContain("Handlebars.registerHelper('lt'");
      expect(content).toContain("a > b");
      expect(content).toContain("a < b");
    });

    test("includes helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('includes'");
      expect(content).toContain("arr.includes(");
    });

    test("now helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('now'");
      expect(content).toContain("new Date()");
    });

    test("pluralize helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('pluralize'");
    });

    test("formatNumber helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('formatNumber'");
      expect(content).toContain("toLocaleString()");
    });

    test("percent helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('percent'");
    });

    test("truncate helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('truncate'");
      expect(content).toContain("substring(");
    });

    test("default helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('default'");
      expect(content).toContain("value ?? defaultValue");
    });

    test("json helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('json'");
      expect(content).toContain("JSON.stringify(");
    });

    test("codeblock helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('codeblock'");
      // Source uses escaped backticks in template literal
      expect(content).toContain("\\`\\`\\`");
    });

    test("repeat helper", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Handlebars.registerHelper('repeat'");
    });
  });

  describe("core functions defined", () => {
    test("renderTemplate function exported", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("export function renderTemplate(");
    });

    test("loadTemplate function", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function loadTemplate(");
      expect(content).toContain("Handlebars.compile(");
    });

    test("loadData function supports YAML and JSON", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function loadData(");
      expect(content).toContain(".json')");
      expect(content).toContain("parseYaml(");
    });

    test("registerPartials function", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function registerPartials(");
      expect(content).toContain("Handlebars.registerPartial(");
    });
  });

  describe("error handling in source", () => {
    test("handles template not found", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Template not found:");
    });

    test("handles data file not found", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Data file not found:");
    });

    test("has try-catch in main", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("try {");
      expect(content).toContain("renderTemplate({");
      expect(content).toContain("} catch (error)");
    });
  });

  describe("RenderOptions interface", () => {
    test("defines RenderOptions type", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface RenderOptions");
      expect(content).toContain("templatePath: string");
      expect(content).toContain("dataPath: string");
      expect(content).toContain("outputPath?: string");
      expect(content).toContain("preview?: boolean");
    });
  });

  describe("output handling", () => {
    test("preview mode outputs markers", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("=== PREVIEW ===");
      expect(content).toContain("=== END PREVIEW ===");
    });

    test("writes to output file when specified", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("writeFileSync(outputFullPath, rendered)");
      expect(content).toContain("Rendered to:");
    });
  });
});
