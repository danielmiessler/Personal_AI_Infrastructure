import { test, expect, describe } from "bun:test";
import { join } from "path";

// Use process.cwd() to avoid interference from other tests modifying PAI_DIR
const toolPath = join(process.cwd(), "skills/VoiceInterface/Tools/Transcribe.ts");

describe("Transcribe", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* Transcribe.ts");
      expect(content).toContain("Does ONE thing: Converts audio to text");
    });

    test("exports TranscribeOptions interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface TranscribeOptions");
      expect(content).toContain("input?: string");
      expect(content).toContain("provider:");
    });
  });

  describe("multi-provider support", () => {
    test("supports whisperflow provider", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'whisperflow'");
      expect(content).toContain("transcribeWhisperFlow");
      expect(content).toContain("spawn('whisperflow'");
    });

    test("supports openai provider", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'openai'");
      expect(content).toContain("transcribeOpenAI");
      expect(content).toContain("api.openai.com/v1/audio/transcriptions");
      expect(content).toContain("whisper-1");
    });

    test("supports whisper-cpp provider", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'whisper-cpp'");
      expect(content).toContain("transcribeWhisperCpp");
      expect(content).toContain("spawn('whisper'");
    });

    test("defaults to whisperflow from env", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.WHISPER_PROVIDER");
      expect(content).toContain("|| 'whisperflow'");
    });

    test("provider switch statement handles all cases", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("case 'whisperflow':");
      expect(content).toContain("case 'openai':");
      expect(content).toContain("case 'whisper-cpp':");
      expect(content).toContain("default:");
      expect(content).toContain("Unknown provider");
    });
  });

  describe("argument parsing", () => {
    test("parses --input flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--input");
      expect(content).toContain("opts.input = args[i + 1]");
    });

    test("parses --provider flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--provider");
      expect(content).toContain("opts.provider = args[i + 1]");
    });

    test("has --help flag with usage", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--help");
      expect(content).toContain("Usage:");
      expect(content).toContain("process.exit(0)");
    });

    test("help includes environment variables section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Environment:");
      expect(content).toContain("WHISPER_PROVIDER");
      expect(content).toContain("OPENAI_API_KEY");
    });
  });

  describe("stdin handling", () => {
    test("handles stdin input when no file specified", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Bun.stdin.text()");
      expect(content).toContain("!audioFile || audioFile === '-'");
    });

    test("converts base64 stdin to temp file", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Buffer.from(stdinData, 'base64')");
      expect(content).toContain("writeFileSync(tempFile, audioBuffer)");
    });

    test("uses tmpdir for temp files", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("tmpdir()");
      expect(content).toContain("transcribe-${Date.now()}.wav");
    });
  });

  describe("error handling", () => {
    test("validates file existence", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("existsSync(audioFile)");
      expect(content).toContain("Audio file not found");
    });

    test("requires OPENAI_API_KEY for openai provider", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.OPENAI_API_KEY");
      expect(content).toContain("OPENAI_API_KEY required");
    });

    test("handles empty transcription", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!text || text.length === 0");
      expect(content).toContain("Empty transcription");
    });

    test("handles spawn errors for whisperflow", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("WhisperFlow not found");
    });

    test("handles spawn errors for whisper-cpp", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("whisper.cpp not found");
    });

    test("handles OpenAI API errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("OpenAI API error");
      expect(content).toContain("response.status");
    });

    test("main catch block exits with code 1", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain(".catch((err)");
      expect(content).toContain("process.exit(1)");
    });
  });

  describe("openai integration", () => {
    test("uses FormData for file upload", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("FormData");
      expect(content).toContain("form.append('file'");
      expect(content).toContain("form.append('model'");
    });

    test("sets authorization header", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Authorization");
      expect(content).toContain("Bearer ${apiKey}");
    });

    test("extracts text from response", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("response.json()");
      expect(content).toContain("data.text");
    });
  });

  describe("output formatting", () => {
    test("logs progress to stderr", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.error");
      expect(content).toContain("Transcribing with");
    });

    test("outputs transcription to stdout", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.log(text)");
    });

    test("truncates long transcriptions in logs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("text.substring(0, 60)");
      expect(content).toContain("text.length > 60");
    });
  });
});
