/**
 * Trajectory — regression suite.
 *
 * Every fixture is synthesised in a temp dir from the line shapes observed in
 * real Claude Code transcripts. No real transcript is ever read, so this suite
 * carries no personal data and runs identically on a machine that has never run
 * a session.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, utimesSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import {
  contentBlocks,
  excerpt,
  fileTouches,
  findTranscripts,
  grepTranscripts,
  listSessions,
  parseArgs,
  parseSince,
  pathsFromInput,
  readTranscript,
  renderTable,
  resultText,
  run,
  toolStats,
  type Role,
} from "../Trajectory";

// ── Fixture Builders ──

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "trajectory-test-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write a transcript, one JSON object per line, and pin its mtime for ordering. */
function writeTranscript(project: string, uuid: string, lines: unknown[], mtimeMs = 1_000_000): string {
  const dir = join(root, project);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${uuid}.jsonl`);
  writeFileSync(path, lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  const seconds = mtimeMs / 1000;
  utimesSync(path, seconds, seconds);
  return path;
}

function userText(ts: string, text: string, extra: Record<string, unknown> = {}) {
  return { type: "user", uuid: `u-${ts}`, timestamp: ts, cwd: "/work", message: { role: "user", content: text }, ...extra };
}

function assistantText(ts: string, text: string) {
  return {
    type: "assistant",
    uuid: `a-${ts}`,
    timestamp: ts,
    cwd: "/work",
    message: { role: "assistant", model: "claude-opus-5", content: [{ type: "text", text }] },
  };
}

function toolUse(ts: string, id: string, name: string, input: Record<string, unknown>) {
  return {
    type: "assistant",
    uuid: `a-${id}`,
    timestamp: ts,
    cwd: "/work",
    message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] },
  };
}

function toolResult(ts: string, id: string, content: unknown, isError?: boolean) {
  const block: Record<string, unknown> = { type: "tool_result", tool_use_id: id, content };
  if (isError !== undefined) block.is_error = isError;
  return { type: "user", uuid: `r-${id}`, timestamp: ts, cwd: "/work", message: { role: "user", content: [block] } };
}

/** A representative session: prompt, thinking, tool calls, one failure, title. */
function standardSession() {
  return [
    { type: "bridge-session", sessionId: "s1", bridgeSessionId: "b1" },
    userText("2026-08-10T10:00:00.000Z", "please refactor the voice provider chain"),
    {
      type: "assistant",
      uuid: "a-think",
      timestamp: "2026-08-10T10:00:05.000Z",
      cwd: "/work",
      message: { role: "assistant", content: [{ type: "thinking", thinking: "the chain needs a fallback" }] },
    },
    toolUse("2026-08-10T10:00:10.000Z", "toolu_1", "Read", { file_path: "/work/src/providers.ts" }),
    toolResult("2026-08-10T10:00:11.000Z", "toolu_1", "export const chain = []", false),
    toolUse("2026-08-10T10:00:20.000Z", "toolu_2", "Edit", {
      file_path: "/work/src/providers.ts",
      old_string: "a",
      new_string: "b",
    }),
    toolResult("2026-08-10T10:00:21.000Z", "toolu_2", "applied"),
    toolUse("2026-08-10T10:00:30.000Z", "toolu_3", "Bash", { command: "bun test", description: "run tests" }),
    toolResult("2026-08-10T10:00:31.000Z", "toolu_3", "1 fail", true),
    toolUse("2026-08-10T10:00:40.000Z", "toolu_4", "Bash", { command: "bun test", description: "rerun" }),
    toolResult("2026-08-10T10:00:41.000Z", "toolu_4", "0 fail", false),
    assistantText("2026-08-10T10:00:50.000Z", "The fallback now lands correctly."),
    { type: "ai-title", aiTitle: "Refactor voice provider chain", sessionId: "s1" },
  ];
}

// ── Discovery ──

describe("findTranscripts", () => {
  test("finds only .jsonl files one level deep", () => {
    writeTranscript("-work-a", "aaaa1111", [userText("2026-08-10T10:00:00.000Z", "hi")]);
    writeFileSync(join(root, "-work-a", "notes.md"), "not a transcript");
    mkdirSync(join(root, "-work-a", "aaaa1111"), { recursive: true });
    writeFileSync(join(root, "-work-a", "aaaa1111", "nested.jsonl"), "{}\n");
    writeFileSync(join(root, "loose.jsonl"), "{}\n");

    const found = findTranscripts(root);
    expect(found.map((f) => f.uuid)).toEqual(["aaaa1111"]);
    expect(found[0].project).toBe("-work-a");
  });

  test("returns empty for a missing root rather than throwing", () => {
    expect(findTranscripts(join(root, "nope"))).toEqual([]);
  });

  test("orders by mtime, then path", () => {
    writeTranscript("-work-b", "bbbb2222", [userText("2026-08-11T10:00:00.000Z", "x")], 3_000_000);
    writeTranscript("-work-a", "aaaa1111", [userText("2026-08-10T10:00:00.000Z", "x")], 2_000_000);
    expect(findTranscripts(root).map((f) => f.uuid)).toEqual(["aaaa1111", "bbbb2222"]);
  });
});

describe("readTranscript", () => {
  test("skips blank and malformed lines instead of crashing", () => {
    const path = writeTranscript("-work-a", "aaaa1111", [
      userText("2026-08-10T10:00:00.000Z", "ok"),
      "{not json at all",
      "",
      "[1,2,3]",
      "null",
      assistantText("2026-08-10T10:00:01.000Z", "fine"),
    ]);
    const { lines, skipped } = readTranscript(path);
    expect(lines.length).toBe(2);
    expect(skipped).toBe(3);
  });

  test("unknown line types survive parsing untouched", () => {
    const path = writeTranscript("-work-a", "aaaa1111", [
      { type: "some-future-type", payload: { nested: true } },
      { noTypeAtAll: 1 },
    ]);
    const { lines, skipped } = readTranscript(path);
    expect(skipped).toBe(0);
    expect(lines.length).toBe(2);
  });

  test("an unreadable path yields no lines rather than an exception", () => {
    expect(readTranscript(join(root, "absent.jsonl"))).toEqual({ lines: [], skipped: 0 });
  });
});

// ── Content helpers ──

describe("content helpers", () => {
  test("contentBlocks normalises the string form", () => {
    expect(contentBlocks("hello")).toEqual([{ type: "text", text: "hello" }]);
    expect(contentBlocks([{ type: "text", text: "a" }])).toEqual([{ type: "text", text: "a" }]);
    expect(contentBlocks(undefined)).toEqual([]);
    expect(contentBlocks(42)).toEqual([]);
  });

  test("resultText flattens nested and image result content", () => {
    expect(resultText("plain")).toBe("plain");
    expect(resultText([{ type: "text", text: "a" }, { type: "image" }, "b"])).toBe("a\n[image]\nb");
    expect(resultText({ stdout: "x" })).toBe('{"stdout":"x"}');
    expect(resultText(undefined)).toBe("");
  });

  test("pathsFromInput reads every path-bearing key and dedupes", () => {
    expect(pathsFromInput({ file_path: "/a" })).toEqual(["/a"]);
    expect(pathsFromInput({ notebook_path: "/n.ipynb" })).toEqual(["/n.ipynb"]);
    expect(pathsFromInput({ files: ["/a", "/b", 7] })).toEqual(["/a", "/b"]);
    expect(pathsFromInput({ file_path: "/a", path: "/a" })).toEqual(["/a"]);
    expect(pathsFromInput(undefined)).toEqual([]);
    expect(pathsFromInput({ command: "ls" })).toEqual([]);
  });

  test("excerpt windows around the match and collapses whitespace", () => {
    const long = "x".repeat(200) + " NEEDLE " + "y".repeat(200);
    const out = excerpt(long, /NEEDLE/);
    expect(out).toContain("NEEDLE");
    expect(out.startsWith("…")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
    expect(excerpt("a\n\n  b", /b/)).toBe("a b");
  });
});

// ── sessions ──

describe("sessions", () => {
  test("summarises timestamps, counts, cwd and title", () => {
    writeTranscript("-work-a", "aaaa1111-2222-3333", standardSession());
    const [s] = listSessions({ root });

    expect(s.uuid).toBe("aaaa1111-2222-3333");
    expect(s.project).toBe("-work-a");
    expect(s.first).toBe("2026-08-10T10:00:00.000Z");
    expect(s.last).toBe("2026-08-10T10:00:50.000Z");
    expect(s.cwd).toBe("/work");
    expect(s.title).toBe("Refactor voice provider chain");
    // 1 prompt + 1 thinking + 4 tool_use + 4 tool_result + 1 answer
    expect(s.messages).toBe(11);
    expect(s.toolCalls).toBe(4);
    expect(s.skipped).toBe(0);
  });

  test("collects every distinct cwd a session visited", () => {
    writeTranscript("-work-a", "aaaa1111", [
      userText("2026-08-10T10:00:00.000Z", "one", { cwd: "/work" }),
      { ...userText("2026-08-10T10:01:00.000Z", "two"), cwd: "/work/sub" },
      { ...userText("2026-08-10T10:02:00.000Z", "three"), cwd: "/work" },
    ]);
    expect(listSessions({ root })[0].cwds).toEqual(["/work", "/work/sub"]);
  });

  test("--since excludes sessions that ended before the cutoff", () => {
    writeTranscript("-work-a", "old11111", [userText("2026-08-01T10:00:00.000Z", "old")], 1_000_000);
    writeTranscript("-work-a", "new22222", [userText("2026-08-13T10:00:00.000Z", "new")], 2_000_000);

    const all = listSessions({ root }).map((s) => s.uuid);
    expect(all).toEqual(["old11111", "new22222"]);

    const recent = listSessions({ root, since: new Date("2026-08-10") }).map((s) => s.uuid);
    expect(recent).toEqual(["new22222"]);
  });

  test("a session with no timestamps falls back to file mtime for --since", () => {
    writeTranscript("-work-a", "notime11", [{ type: "ai-title", aiTitle: "no clock" }], Date.parse("2026-08-13T00:00:00Z"));
    expect(listSessions({ root, since: new Date("2026-08-10") }).map((s) => s.uuid)).toEqual(["notime11"]);
    expect(listSessions({ root, since: new Date("2026-08-20") })).toEqual([]);
  });

  test("--session accepts a uuid prefix", () => {
    writeTranscript("-work-a", "aaaa1111-2222", [userText("2026-08-10T10:00:00.000Z", "a")]);
    writeTranscript("-work-a", "bbbb3333-4444", [userText("2026-08-10T10:00:00.000Z", "b")]);
    expect(listSessions({ root, session: "aaaa" }).map((s) => s.uuid)).toEqual(["aaaa1111-2222"]);
  });

  test("sessions are ordered by last activity", () => {
    writeTranscript("-work-a", "later111", [userText("2026-08-12T10:00:00.000Z", "b")], 1_000_000);
    writeTranscript("-work-a", "early111", [userText("2026-08-11T10:00:00.000Z", "a")], 5_000_000);
    expect(listSessions({ root }).map((s) => s.uuid)).toEqual(["early111", "later111"]);
  });

  test("an empty root yields no sessions and no error", () => {
    expect(listSessions({ root })).toEqual([]);
  });
});

// ── grep ──

describe("grep", () => {
  beforeEach(() => {
    writeTranscript("-work-a", "aaaa1111", standardSession());
  });

  test("matches user prompt text", () => {
    const hits = grepTranscripts(/refactor/, { root });
    expect(hits.length).toBe(1);
    expect(hits[0].role).toBe("user");
    expect(hits[0].session).toBe("aaaa1111");
    expect(hits[0].timestamp).toBe("2026-08-10T10:00:00.000Z");
  });

  test("matches assistant text and thinking, both as role=assistant", () => {
    const hits = grepTranscripts(/fallback/, { root, role: "assistant" });
    expect(hits.length).toBe(2);
    expect(hits.map((h) => h.part).sort()).toEqual([null, "thinking"]);
  });

  test("matches tool inputs and results, attributing the tool name", () => {
    const hits = grepTranscripts(/bun test/, { root, role: "tool" });
    expect(hits.length).toBe(2);
    expect(hits.every((h) => h.tool === "Bash")).toBe(true);
    expect(hits.every((h) => h.part === "input")).toBe(true);

    const results = grepTranscripts(/1 fail/, { root, role: "tool" });
    expect(results.length).toBe(1);
    expect(results[0].part).toBe("result");
    expect(results[0].tool).toBe("Bash");
  });

  test("--role filters out other roles entirely", () => {
    expect(grepTranscripts(/refactor/, { root, role: "assistant" })).toEqual([]);
    expect(grepTranscripts(/refactor/, { root, role: "tool" })).toEqual([]);
  });

  test("case sensitivity follows the supplied regex flags", () => {
    expect(grepTranscripts(/REFACTOR/, { root })).toEqual([]);
    expect(grepTranscripts(/REFACTOR/i, { root }).length).toBe(1);
  });

  test("--limit caps the hit count", () => {
    const hits = grepTranscripts(/./, { root, limit: 3 });
    expect(hits.length).toBe(3);
  });

  test("--session scopes the search", () => {
    writeTranscript("-work-b", "bbbb2222", [userText("2026-08-10T10:00:00.000Z", "refactor elsewhere")]);
    expect(grepTranscripts(/refactor/, { root }).length).toBe(2);
    expect(grepTranscripts(/refactor/, { root, session: "bbbb2222" }).length).toBe(1);
  });

  test("--since drops lines older than the cutoff", () => {
    writeTranscript("-work-b", "bbbb2222", [
      userText("2026-08-01T10:00:00.000Z", "refactor early"),
      userText("2026-08-13T10:00:00.000Z", "refactor late"),
    ]);
    const hits = grepTranscripts(/refactor (early|late)/, { root, since: new Date("2026-08-10") });
    expect(hits.map((h) => h.text)).toEqual(["refactor late"]);
  });

  test("no match returns an empty array, not an error", () => {
    expect(grepTranscripts(/nothing-here-at-all/, { root })).toEqual([]);
  });

  test("a malformed line inside a session does not abort the search", () => {
    writeTranscript("-work-c", "cccc3333", ["{broken", userText("2026-08-10T10:00:00.000Z", "still findable")]);
    expect(grepTranscripts(/still findable/, { root }).length).toBe(1);
  });
});

// ── tools ──

describe("tools", () => {
  test("counts calls and attributes failures via tool_use_id", () => {
    writeTranscript("-work-a", "aaaa1111", standardSession());
    const stats = toolStats({ root });
    expect(stats).toEqual([
      { name: "Bash", count: 2, failures: 1 },
      { name: "Edit", count: 1, failures: 0 },
      { name: "Read", count: 1, failures: 0 },
    ]);
  });

  test("is_error false and absent both count as success", () => {
    writeTranscript("-work-a", "aaaa1111", [
      toolUse("2026-08-10T10:00:00.000Z", "t1", "Read", { file_path: "/a" }),
      toolResult("2026-08-10T10:00:01.000Z", "t1", "ok", false),
      toolUse("2026-08-10T10:00:02.000Z", "t2", "Read", { file_path: "/b" }),
      toolResult("2026-08-10T10:00:03.000Z", "t2", "ok"),
    ]);
    expect(toolStats({ root })).toEqual([{ name: "Read", count: 2, failures: 0 }]);
  });

  test("aggregates across sessions and sorts by call count", () => {
    writeTranscript("-work-a", "aaaa1111", [toolUse("2026-08-10T10:00:00.000Z", "t1", "Read", { file_path: "/a" })]);
    writeTranscript("-work-b", "bbbb2222", [
      toolUse("2026-08-10T11:00:00.000Z", "t2", "Bash", { command: "ls" }),
      toolUse("2026-08-10T11:00:01.000Z", "t3", "Bash", { command: "pwd" }),
    ]);
    expect(toolStats({ root })).toEqual([
      { name: "Bash", count: 2, failures: 0 },
      { name: "Read", count: 1, failures: 0 },
    ]);
  });

  test("an orphaned error result is not attributed to any tool", () => {
    writeTranscript("-work-a", "aaaa1111", [
      toolUse("2026-08-10T10:00:00.000Z", "t1", "Read", { file_path: "/a" }),
      toolResult("2026-08-10T10:00:01.000Z", "unknown-id", "boom", true),
    ]);
    expect(toolStats({ root })).toEqual([{ name: "Read", count: 1, failures: 0 }]);
  });

  test("no tool calls yields an empty table, not an error", () => {
    writeTranscript("-work-a", "aaaa1111", [userText("2026-08-10T10:00:00.000Z", "just talking")]);
    expect(toolStats({ root })).toEqual([]);
  });
});

// ── file ──

describe("file", () => {
  test("reports every touch of a matching path with action and session", () => {
    writeTranscript("-work-a", "aaaa1111", standardSession());
    const touches = fileTouches("providers.ts", { root });
    expect(touches.length).toBe(2);
    expect(touches.map((t) => t.action)).toEqual(["read", "edit"]);
    expect(touches[0].session).toBe("aaaa1111");
    expect(touches[0].timestamp).toBe("2026-08-10T10:00:10.000Z");
    expect(touches[0].path).toBe("/work/src/providers.ts");
  });

  test("substring matching is case-insensitive and partial", () => {
    writeTranscript("-work-a", "aaaa1111", [
      toolUse("2026-08-10T10:00:00.000Z", "t1", "Write", { file_path: "/work/SRC/Providers.ts" }),
    ]);
    expect(fileTouches("src/providers", { root }).length).toBe(1);
    expect(fileTouches("/work", { root }).length).toBe(1);
  });

  test("Bash is excluded even when its command names the file", () => {
    writeTranscript("-work-a", "aaaa1111", [
      toolUse("2026-08-10T10:00:00.000Z", "t1", "Bash", { command: "rm /work/src/providers.ts" }),
    ]);
    expect(fileTouches("providers.ts", { root })).toEqual([]);
  });

  test("marks a touch whose tool_result came back an error", () => {
    writeTranscript("-work-a", "aaaa1111", [
      toolUse("2026-08-10T10:00:00.000Z", "t1", "Read", { file_path: "/work/missing.ts" }),
      toolResult("2026-08-10T10:00:01.000Z", "t1", "ENOENT", true),
    ]);
    const [touch] = fileTouches("missing.ts", { root });
    expect(touch.failed).toBe(true);
    expect(touch.action).toBe("read");
  });

  test("notebook paths are tracked", () => {
    writeTranscript("-work-a", "aaaa1111", [
      toolUse("2026-08-10T10:00:00.000Z", "t1", "NotebookEdit", { notebook_path: "/work/analysis.ipynb" }),
    ]);
    expect(fileTouches("analysis", { root })[0].action).toBe("edit");
  });

  test("no match returns empty", () => {
    writeTranscript("-work-a", "aaaa1111", standardSession());
    expect(fileTouches("nowhere.ts", { root })).toEqual([]);
  });

  test("--limit caps the results", () => {
    writeTranscript("-work-a", "aaaa1111", standardSession());
    expect(fileTouches("providers.ts", { root, limit: 1 }).length).toBe(1);
  });
});

// ── Arg parsing ──

describe("parseArgs", () => {
  test("splits command, positionals and flags", () => {
    const p = parseArgs(["grep", "needle", "--role", "tool", "--limit", "5", "--json", "-i"]);
    expect(p.command).toBe("grep");
    expect(p.positional).toEqual(["needle"]);
    expect(p.flags).toEqual({ role: "tool", limit: "5", json: true, i: true });
  });

  test("accepts --flag=value form", () => {
    expect(parseArgs(["sessions", "--since=2026-08-10"]).flags.since).toBe("2026-08-10");
  });

  test("a valued flag with no value is a usage error", () => {
    expect(() => parseArgs(["sessions", "--since"])).toThrow("--since needs a value");
  });
});

// ── --since parsing ──

describe("parseSince", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");

  test("relative hours and days count back from now", () => {
    expect(parseSince("48h", now).toISOString()).toBe("2026-08-12T12:00:00.000Z");
    expect(parseSince("7d", now).toISOString()).toBe("2026-08-07T12:00:00.000Z");
    expect(parseSince(" 24h ", now).toISOString()).toBe("2026-08-13T12:00:00.000Z");
  });

  test("a bare calendar date means local midnight, not UTC midnight", () => {
    const d = parseSince("2026-08-13", now);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  test("a full ISO timestamp is taken as given", () => {
    expect(parseSince("2026-08-13T04:30:00.000Z", now).toISOString()).toBe("2026-08-13T04:30:00.000Z");
  });

  test("garbage throws rather than silently scanning everything", () => {
    expect(() => parseSince("not-a-date", now)).toThrow("unparseable date");
    expect(() => parseSince("48x", now)).toThrow("unparseable date");
  });
});

// ── CLI ──

describe("run", () => {
  beforeEach(() => {
    writeTranscript("-work-a", "aaaa1111", standardSession());
  });

  const cli = (...args: string[]) => run([...args, "--root", root]);

  test("sessions renders a table and exits 0", () => {
    const { out, code } = cli("sessions");
    expect(code).toBe(0);
    expect(out).toContain("SESSION");
    expect(out).toContain("aaaa1111");
    expect(out).toContain("Refactor voice provider chain");
    expect(out).toContain("1 session(s)");
  });

  test("--json emits parseable structured output", () => {
    const { out, code } = cli("sessions", "--json");
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed[0].uuid).toBe("aaaa1111");
    expect(parsed[0].toolCalls).toBe(4);
  });

  test("tools reports counts and failures", () => {
    const { out, code } = cli("tools");
    expect(code).toBe(0);
    expect(out).toContain("FAILURES");
    expect(out).toContain("4 call(s), 1 failure(s)");
  });

  test("grep honours -i", () => {
    expect(cli("grep", "REFACTOR").out).toBe("no matches");
    expect(cli("grep", "REFACTOR", "-i").out).toContain("1 match(es)");
  });

  test("file lists touches", () => {
    const { out, code } = cli("file", "providers.ts");
    expect(code).toBe(0);
    expect(out).toContain("2 touch(es)");
    expect(out).toContain("edit");
  });

  test("empty results exit 0 with a plain message", () => {
    for (const [args, msg] of [
      [["grep", "zzzz-no-such-thing"], "no matches"],
      [["file", "zzzz-no-such-file"], "no file touches"],
      [["sessions", "--since", "2030-01-01"], "no sessions"],
      [["tools", "--session", "does-not-exist"], "no tool calls"],
    ] as [string[], string][]) {
      const { out, code } = cli(...args);
      expect(code).toBe(0);
      expect(out).toBe(msg);
    }
  });

  test("--json with no results is still an empty array, not a prose message", () => {
    for (const args of [["grep", "zzzz"], ["file", "zzzz"], ["tools", "--session", "zzzz"], ["sessions", "--since", "2030-01-01"]]) {
      const { out, code } = cli(...args, "--json");
      expect(code).toBe(0);
      expect(JSON.parse(out)).toEqual([]);
    }
  });

  test("usage errors exit 2", () => {
    expect(cli("").code).toBe(2);
    expect(run([]).code).toBe(2);
    expect(cli("bogus-command").code).toBe(2);
    expect(cli("grep").code).toBe(2);
    expect(cli("file").code).toBe(2);
  });

  test("an unparseable --since is a usage error, not a silent full scan", () => {
    const { out, code } = cli("sessions", "--since", "not-a-date");
    expect(code).toBe(2);
    expect(out).toContain("unparseable date");
  });

  test("an invalid regex is a usage error", () => {
    const { out, code } = cli("grep", "(unclosed");
    expect(code).toBe(2);
    expect(out).toContain("invalid pattern");
  });

  test("a bad --role is rejected", () => {
    expect(cli("grep", "x", "--role", "wizard").code).toBe(2);
  });

  test("a non-positive --limit is rejected", () => {
    expect(cli("grep", "x", "--limit", "0").code).toBe(2);
    expect(cli("grep", "x", "--limit", "abc").code).toBe(2);
  });

  test("--help exits 0 with usage", () => {
    const { out, code } = cli("sessions", "--help");
    expect(code).toBe(0);
    expect(out).toContain("trajectory sessions");
  });

  test("a missing root is an empty result, not a crash", () => {
    const { out, code } = run(["sessions", "--root", join(root, "absent")]);
    expect(code).toBe(0);
    expect(out).toBe("no sessions");
  });
});

// ── Rendering ──

describe("renderTable", () => {
  test("pads columns and underlines the header", () => {
    const out = renderTable(["A", "BB"], [["1", "2"], ["333", "4"]]);
    const [header, rule, first] = out.split("\n");
    expect(header).toBe("A    BB");
    expect(rule).toBe("───  ──");
    expect(first).toBe("1    2");
  });

  test("no rows renders nothing", () => {
    expect(renderTable(["A"], [])).toBe("");
  });
});

// ── Type surface (compile-time guard) ──

test("Role stays a closed union", () => {
  const roles: Role[] = ["user", "assistant", "tool"];
  expect(roles.length).toBe(3);
});
