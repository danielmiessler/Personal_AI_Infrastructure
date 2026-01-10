import { test, expect, describe } from "bun:test";
import { join } from "path";

// Use process.cwd() to avoid interference from other tests modifying PAI_DIR
const toolPath = join(process.cwd(), "skills/VoiceInterface/Tools/Stats.ts");

describe("Stats", () => {
  describe("source structure", () => {
    test("file exists and is executable bun script", async () => {
      const file = Bun.file(toolPath);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain("#!/usr/bin/env bun");
    });

    test("has JSDoc documentation", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("* Stats.ts");
      expect(content).toContain("Does ONE thing: Analyzes voice session history");
    });

    test("exports StatsOptions interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface StatsOptions");
      expect(content).toContain("since?: string");
      expect(content).toContain("format: 'json' | 'table'");
      expect(content).toContain("logFile?: string");
    });

    test("exports SessionEvent interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface SessionEvent");
      expect(content).toContain("timestamp: string");
      expect(content).toContain("session_id: string");
      expect(content).toContain("event: string");
    });

    test("exports SessionStats interface", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("interface SessionStats");
      expect(content).toContain("totalSessions: number");
      expect(content).toContain("successfulSessions: number");
      expect(content).toContain("avgLatency: number");
    });
  });

  describe("time filtering", () => {
    test("implements parseSinceFilter function", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("function parseSinceFilter");
      expect(content).toContain("since?: string");
    });

    test("supports hours filter (h)", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("case 'h':");
      expect(content).toContain("60 * 60 * 1000");
    });

    test("supports days filter (d)", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("case 'd':");
      expect(content).toContain("24 * 60 * 60 * 1000");
    });

    test("supports weeks filter (w)", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("case 'w':");
      expect(content).toContain("7 * 24");
    });

    test("supports months filter (m)", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("case 'm':");
      expect(content).toContain("30 * 24");
    });

    test("parses relative time with regex", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("match(/^(\\d+)([hdwm])$/");
    });

    test("supports absolute date parsing", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("new Date(since)");
      expect(content).toContain("isNaN(date.getTime())");
    });
  });

  describe("JSONL parsing", () => {
    test("reads log file with readFileSync", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("readFileSync(opts.logFile!");
      expect(content).toContain("utf-8");
    });

    test("splits content into lines", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("split('\\n')");
      expect(content).toContain("filter(l => l.length > 0)");
    });

    test("parses each line as JSON", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("JSON.parse(line)");
    });

    test("filters events by since date", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("filteredEvents");
      expect(content).toContain("new Date(e.timestamp) >= sinceDate");
    });
  });

  describe("session grouping", () => {
    test("groups events by session_id", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("new Map<string, SessionEvent[]>");
      expect(content).toContain("sessions.set(event.session_id");
    });

    test("finds complete events", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("sessionEvents.find(e => e.event === 'complete')");
    });

    test("finds error events", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("sessionEvents.find(e => e.event === 'error')");
    });

    test("finds transcribe events", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("sessionEvents.find(e => e.event === 'transcribe')");
    });
  });

  describe("statistics calculation", () => {
    test("calculates total sessions", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("totalSessions: sessions.size");
    });

    test("calculates successful/failed sessions", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("stats.successfulSessions++");
      expect(content).toContain("stats.failedSessions++");
    });

    test("calculates average latency", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("avgLatency");
      expect(content).toContain("totalLatency / latencyCount");
    });

    test("calculates average confidence", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("avgTranscriptionConfidence");
      expect(content).toContain("totalConfidence / confidenceCount");
    });

    test("tracks provider usage", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("providers:");
      expect(content).toContain("stats.providers[transcribeEvent.provider]");
    });

    test("tracks error types", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("errors:");
      expect(content).toContain("stats.errors[errorEvent.error_type]");
    });
  });

  describe("output formats", () => {
    test("supports json format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("opts.format === 'json'");
      expect(content).toContain("JSON.stringify(stats, null, 2)");
    });

    test("supports table format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("formatTable(stats)");
    });

    test("defaults to table format", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("format: 'table'");
    });
  });

  describe("table formatting", () => {
    test("includes header line", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Voice Interface Statistics");
    });

    test("shows session counts", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Total Sessions:");
      expect(content).toContain("Successful:");
      expect(content).toContain("Failed:");
    });

    test("shows latency and confidence", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Avg Latency:");
      expect(content).toContain("Avg Confidence:");
    });

    test("shows providers section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Transcription Providers:");
    });

    test("shows error types section", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Error Types:");
    });

    test("shows recent sessions", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("Recent Sessions:");
      expect(content).toContain("sessions.slice(-10)");
    });
  });

  describe("argument parsing", () => {
    test("parses --since flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--since");
      expect(content).toContain("opts.since = args[i + 1]");
    });

    test("parses --format flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--format");
      expect(content).toContain("opts.format = args[i + 1]");
    });

    test("parses --log-file flag", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--log-file");
      expect(content).toContain("opts.logFile = args[i + 1]");
    });

    test("has --help flag with usage", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("--help");
      expect(content).toContain("Usage:");
      expect(content).toContain("process.exit(0)");
    });
  });

  describe("error handling", () => {
    test("validates log file exists", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("existsSync(opts.logFile!)");
      expect(content).toContain("Log file not found");
    });

    test("main catch block exits with code 1", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("catch (err:");
      expect(content).toContain("process.exit(1)");
    });
  });

  describe("default configuration", () => {
    test("defaults log file to PAI_DIR/history/voice-sessions.jsonl", async () => {
      const content = await Bun.file(toolPath).text();
      expect(content).toContain("PAI_DIR");
      expect(content).toContain("voice-sessions.jsonl");
    });
  });
});
