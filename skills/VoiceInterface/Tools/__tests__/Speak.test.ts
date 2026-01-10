import { test, expect, describe } from "bun:test";
import { join } from "path";

// Use process.cwd() to avoid interference from other tests modifying PAI_DIR
const toolPath = join(process.cwd(), "skills/VoiceInterface/Tools/Speak.ts");

describe("Speak", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* Speak.ts");
      expect(content).toContain("Does ONE thing: Converts text to speech and plays it");
    });

    test("exports SpeakOptions interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface SpeakOptions");
      expect(content).toContain("text?: string");
      expect(content).toContain("voiceId?: string");
      expect(content).toContain("voiceServer?: string");
    });
  });

  describe("voice server integration", () => {
    test("defaults to localhost:8888", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("http://localhost:8888");
    });

    test("respects VOICE_SERVER environment variable", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.VOICE_SERVER");
    });

    test("performs health check before speaking", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("fetch(`${opts.voiceServer}/health`)");
      expect(content).toContain("healthCheck.ok");
    });

    test("provides helpful error when server unreachable", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Voice server not reachable");
      expect(content).toContain("manage.sh start");
    });

    test("posts to /notify endpoint", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("fetch(`${opts.voiceServer}/notify`");
      expect(content).toContain("method: 'POST'");
    });
  });

  describe("TTS payload", () => {
    test("sends message in payload", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("message: text");
    });

    test("enables voice in payload", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("voice_enabled: true");
    });

    test("includes voice_id when specified", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("payload.voice_id = opts.voiceId");
    });

    test("sets content-type header", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'Content-Type': 'application/json'");
    });
  });

  describe("argument parsing", () => {
    test("parses --text flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--text");
      expect(content).toContain("opts.text = args[i + 1]");
    });

    test("parses --voice-id flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--voice-id");
      expect(content).toContain("opts.voiceId = args[i + 1]");
    });

    test("parses --server flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--server");
      expect(content).toContain("opts.voiceServer = args[i + 1]");
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
      expect(content).toContain("VOICE_SERVER");
      expect(content).toContain("ELEVENLABS_VOICE_ID");
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
      expect(content).toContain("No text provided");
    });

    test("handles TTS failure response", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!response.ok");
      expect(content).toContain("TTS failed");
    });

    test("main catch block exits with code 1", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain(".catch((err)");
      expect(content).toContain("process.exit(1)");
    });
  });

  describe("response handling", () => {
    test("checks for played status", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("result.status === 'played'");
      expect(content).toContain("Playback complete");
    });

    test("logs warning for non-played status", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("TTS status:");
    });
  });

  describe("logging", () => {
    test("logs speaking text to stderr", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("console.error");
      expect(content).toContain("Speaking:");
    });

    test("truncates long text in logs", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("text.substring(0, 50)");
      expect(content).toContain("text.length > 50");
    });
  });

  describe("piping support", () => {
    test("help mentions piping from RemoteQuery", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("bun run RemoteQuery.ts");
      expect(content).toContain("bun run Speak.ts");
    });
  });
});
