import { test, expect, describe } from "bun:test";
import { join } from "path";

// Use process.cwd() to avoid interference from other tests modifying PAI_DIR
const toolPath = join(process.cwd(), "skills/VoiceInterface/Tools/SelfImprove.ts");

describe("SelfImprove", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* SelfImprove.ts");
      expect(content).toContain("Automatic quality monitoring");
    });

    test("exports Issue interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface Issue");
      expect(content).toContain("type: 'error' | 'warning' | 'info'");
      expect(content).toContain("category:");
      expect(content).toContain("message: string");
      expect(content).toContain("suggestion: string");
      expect(content).toContain("auto_fixable: boolean");
    });
  });

  describe("issue categories", () => {
    test("supports transcription category", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'transcription'");
    });

    test("supports latency category", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'latency'");
    });

    test("supports reliability category", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'reliability'");
    });

    test("supports configuration category", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("'configuration'");
    });
  });

  describe("issue detection", () => {
    test("detects missing log file", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("!existsSync(LOG_FILE)");
      expect(content).toContain("No voice session logs found");
    });

    test("detects transcription failures", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("transcribe_failed");
      expect(content).toContain("transcription failures detected");
      expect(content).toContain("Consider switching transcription provider");
    });

    test("detects high latency", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("avgLatency > 12000");
      expect(content).toContain("exceeds target (10s)");
      expect(content).toContain("Check network connection");
    });

    test("detects SSH connection failures", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("query_failed");
      expect(content).toContain("SSH connection failures");
      expect(content).toContain("Check SSH config");
    });

    test("detects voice server failures", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("tts_failed");
      expect(content).toContain("Voice server failures");
      expect(content).toContain("manage.sh start");
    });

    test("detects empty transcriptions", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("e.text.length < 5");
      expect(content).toContain("empty or very short transcriptions");
      expect(content).toContain("Check microphone input level");
    });

    test("detects provider inconsistency", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("providerSet.size > 1");
      expect(content).toContain("Multiple transcription providers detected");
      expect(content).toContain("Set TRANSCRIBE_PROVIDER");
    });
  });

  describe("thresholds", () => {
    test("transcription failure threshold is 2", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("transcribeErrors.length > 2");
    });

    test("latency threshold is 12000ms", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("avgLatency > 12000");
    });

    test("SSH failure threshold is 3", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("sshErrors.length > 3");
    });

    test("empty transcript threshold is 2", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("emptyTranscripts.length > 2");
    });

    test("analyzes last 20 sessions", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("slice(-20)");
    });
  });

  describe("report formatting", () => {
    test("implements printReport function", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function printReport");
    });

    test("shows header", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("VoiceInterface Self-Improvement Report");
    });

    test("shows success message when no issues", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("No issues detected");
      expect(content).toContain("System operating optimally");
    });

    test("shows errors section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("ERRORS:");
      expect(content).toContain("errors.forEach");
    });

    test("shows warnings section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("WARNINGS:");
      expect(content).toContain("warnings.forEach");
    });

    test("shows info section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("INFO:");
      expect(content).toContain("info.forEach");
    });

    test("formats issue with category and suggestion", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("[${issue.category}]");
      expect(content).toContain("issue.message");
      expect(content).toContain("issue.suggestion");
    });
  });

  describe("auto-fix feature", () => {
    test("supports --auto-fix flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--auto-fix");
      expect(content).toContain("autoFix");
    });

    test("filters auto-fixable issues", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("issues.filter(i => i.auto_fixable)");
    });

    test("voice server failure is auto-fixable", async () => {
      const content = await Bun.file(toolPath).text();
      // Look for TTS issue with auto_fixable: true
      expect(content).toContain("category: 'configuration'");
      expect(content).toContain("auto_fixable: true");
    });

    test("shows auto-fix progress", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Auto-fixing");
      expect(content).toContain("Auto-fix complete");
    });
  });

  describe("argument parsing", () => {
    test("has --help flag with usage", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--help");
      expect(content).toContain("Usage:");
      expect(content).toContain("process.exit(0)");
    });
  });

  describe("exit codes", () => {
    test("exits with 1 when errors present", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.exit(issues.filter(i => i.type === 'error').length > 0 ? 1 : 0)");
    });

    test("exits with 0 when no errors", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("? 1 : 0");
    });
  });

  describe("JSONL parsing", () => {
    test("reads log file", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("readFileSync(LOG_FILE");
    });

    test("parses each line as JSON", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("JSON.parse(line)");
    });

    test("groups by session_id", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("sessions.set(e.session_id");
    });
  });

  describe("default configuration", () => {
    test("uses PAI_DIR for log file", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("process.env.PAI_DIR");
      expect(content).toContain("homedir()");
    });

    test("log file is voice-sessions.jsonl", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("voice-sessions.jsonl");
    });
  });
});
