import { test, expect, describe } from "bun:test";
import { join } from "path";

// Use process.cwd() to avoid interference from other tests modifying PAI_DIR
const toolPath = join(process.cwd(), "skills/VoiceInterface/Tools/RemoteQuery.ts");

describe("RemoteQuery", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* RemoteQuery.ts");
      expect(content).toContain("Does ONE thing: Sends text to remote Claude");
    });

    test("exports QueryOptions interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface QueryOptions");
      expect(content).toContain("host: string");
      expect(content).toContain("text?: string");
      expect(content).toContain("timeout?: number");
    });
  });

  describe("SSH integration", () => {
    test("spawns ssh command", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("spawn('ssh'");
    });

    test("passes host as argument", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("opts.host");
      expect(content).toContain("'ssh', [");
    });

    test("pipes echo to claude --no-stream", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('echo "${escapedText}" | claude --no-stream');
    });

    test("handles SSH spawn errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("proc.on('error'");
      expect(content).toContain("SSH error:");
    });
  });

  describe("quote escaping", () => {
    test("escapes double quotes in text", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain('replace(/"/g, ');
      expect(content).toContain("escapedText");
    });
  });

  describe("timeout handling", () => {
    test("supports timeout option", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("timeout:");
      expect(content).toContain("opts.timeout");
    });

    test("defaults timeout to 30000ms", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("timeout: 30000");
    });

    test("implements manual timeout handler", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("setTimeout(");
      expect(content).toContain("proc.kill()");
      expect(content).toContain("Query timeout");
    });
  });

  describe("argument parsing", () => {
    test("parses --host flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--host");
      expect(content).toContain("opts.host = args[i + 1]");
    });

    test("parses --text flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--text");
      expect(content).toContain("opts.text = args[i + 1]");
    });

    test("parses --timeout flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--timeout");
      expect(content).toContain("parseInt(args[i + 1])");
    });

    test("has --help flag with usage", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--help");
      expect(content).toContain("Usage:");
      expect(content).toContain("process.exit(0)");
    });

    test("defaults host from environment", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.VULTR_HOST");
      expect(content).toContain("|| 'vultr-claude'");
    });
  });

  describe("stdin handling", () => {
    test("reads from stdin when no text provided", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Bun.stdin.text()");
      expect(content).toContain("!text");
    });

    test("trims stdin input", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("text.trim()");
    });
  });

  describe("error handling", () => {
    test("validates text is provided", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("No query text provided");
    });

    test("handles non-zero exit codes", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("code !== 0");
      expect(content).toContain("SSH command failed");
    });

    test("handles empty response", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!output.trim()");
      expect(content).toContain("Empty response from Claude");
    });

    test("main catch block exits with code 1", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain(".catch((err)");
      expect(content).toContain("process.exit(1)");
    });
  });

  describe("logging", () => {
    test("logs query start to stderr", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.error");
      expect(content).toContain("Querying Claude on");
    });

    test("logs response size to stderr", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Response received");
      expect(content).toContain("output.length");
      expect(content).toContain("chars");
    });

    test("outputs response to stdout", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.log(response)");
    });
  });

  describe("piping support", () => {
    test("help mentions piping from Transcribe", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("bun run Transcribe.ts");
      expect(content).toContain("bun run RemoteQuery.ts");
    });
  });
});
