import { test, expect, describe } from "bun:test";
import { join } from "path";

// Use process.cwd() to avoid interference from other tests modifying PAI_DIR
const toolPath = join(process.cwd(), "skills/VoiceInterface/Tools/Record.ts");

describe("Record", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* Record.ts");
      expect(content).toContain("Does ONE thing: Records audio from microphone");
    });

    test("exports RecordOptions interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface RecordOptions");
      expect(content).toContain("duration?: number");
      expect(content).toContain("output?: string");
      expect(content).toContain("sampleRate?: number");
    });
  });

  describe("platform detection", () => {
    test("detects darwin platform", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("platform === 'darwin'");
    });

    test("detects linux platform", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("platform === 'linux'");
    });

    test("rejects unsupported platforms", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Unsupported platform");
      expect(content).toContain("reject(new Error");
    });

    test("uses process.platform for detection", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.platform");
    });
  });

  describe("macOS recording (sox)", () => {
    test("uses rec command on darwin", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("cmd = 'rec'");
    });

    test("includes sample rate flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'-r', opts.sampleRate");
    });

    test("records mono audio", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'-c', '1'");
    });

    test("includes silence detection", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'silence'");
      expect(content).toContain("'3%'");
    });

    test("includes trim for duration", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'trim', '0'");
    });
  });

  describe("Linux recording (arecord)", () => {
    test("uses arecord command on linux", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("cmd = 'arecord'");
    });

    test("uses S16_LE format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'-f', 'S16_LE'");
    });

    test("includes duration flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'-d', opts.duration");
    });
  });

  describe("argument parsing", () => {
    test("parses --duration flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--duration");
      expect(content).toContain("parseInt(args[i + 1])");
    });

    test("parses --output flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--output");
      expect(content).toContain("opts.output = args[i + 1]");
    });

    test("has --help flag with usage", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--help");
      expect(content).toContain("Usage:");
      expect(content).toContain("process.exit(0)");
    });

    test("has sensible defaults", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("duration: 30");
      expect(content).toContain("sampleRate: 16000");
    });
  });

  describe("output modes", () => {
    test("writes to file when output specified", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("opts.output");
      expect(content).toContain("resolve(audioData)");
    });

    test("outputs base64 to stdout for piping", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("audioData.toString('base64')");
      expect(content).toContain("process.stdout.write");
    });

    test("uses tmpdir when no output specified", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("tmpdir()");
      expect(content).toContain("pai-record-${Date.now()}.wav");
    });
  });

  describe("error handling", () => {
    test("handles spawn errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("proc.on('error'");
      expect(content).toContain("Recording failed");
    });

    test("handles non-zero exit codes", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("code !== 0");
      expect(content).toContain("exited with code");
    });

    test("main catch block exits with code 1", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain(".catch((err)");
      expect(content).toContain("process.exit(1)");
    });
  });

  describe("logging", () => {
    test("logs recording start to stderr", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.error");
      expect(content).toContain("Recording for up to");
      expect(content).toContain("speak now");
    });

    test("logs recording completion with size", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Recording complete");
      expect(content).toContain("audioData.length / 1024");
      expect(content).toContain("KB");
    });
  });

  describe("piping support", () => {
    test("help mentions piping to Transcribe", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("bun run Record.ts | bun run Transcribe.ts");
    });
  });
});
