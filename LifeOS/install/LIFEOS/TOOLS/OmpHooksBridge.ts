/**
 * lifeos-hooks-bridge.ts — runs LifeOS Claude-Code hooks inside omp (Oh My Pi).
 *
 * omp does not execute ${LIFEOS_DIR}/settings.json hooks (Claude Code contract:
 * JSON on stdin, JSON on stdout). This extension shims that contract onto the
 * omp event bus:
 *
 *   omp event              → Claude Code event
 *   ---------------------    -------------------
 *   session_start          → SessionStart
 *   turn_start             → UserPromptSubmit
 *   tool_call              → PreToolUse         (permissionDecision → block/allow)
 *   tool_result            → PostToolUse        (isError → PostToolUseFailure)
 *   turn_end               → Stop
 *   session_shutdown       → SessionEnd
 *
 * Hook output contract:
 *   { "hookSpecificOutput": { "permissionDecision": "allow|deny|ask",
 *                             "permissionDecisionReason": "...",
 *                             "shouldBlockFurtherMessages": bool,
 *                             "additionalContext": "..." } }
 *   - deny  → tool call blocked (fail-closed in headless for "ask")
 *   - additionalContext → queued and injected as a system message before the
 *     next LLM call via the `context` event (replaces Claude Code's implicit
 *     injection). This is what carries memory/rule deltas to the model.
 *
 * Config:
 *   - LIFEOS_DIR env overrides the LifeOS config root (default ~/.claude)
 *   - OMP_BRIDGE_LOG overrides the audit log path (default ~/.omp/lifeos-bridge.log)
 *
 * Every invocation is logged to the audit log. Hook failures are logged and
 * never crash the session. Per-hook timeout 30s.
 */

import { appendFileSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const HOME = homedir();
const LIFEOS_DIR = process.env.LIFEOS_DIR ?? join(HOME, ".claude");
const SETTINGS_PATH = join(LIFEOS_DIR, "settings.json");
const LOG_PATH = process.env.OMP_BRIDGE_LOG ?? join(HOME, ".omp", "lifeos-bridge.log");
const PULSE_NOTIFY = "http://127.0.0.1:31337/notify";
const VOICE_ID = process.env.OMP_VOICE_ID ?? "fTtv3eikoepIosk8dTZ5";
const HOOK_TIMEOUT_MS = 30_000;

interface HookReg {
  event: string;
  matcher: string;
  command: string;
}

interface HookResult {
  ok: boolean;
  out: string;
  err: string;
  ms: number;
}

interface HookOutput {
  decision?: string;
  reason?: string;
  context?: string;
  block?: boolean;
}

/** omp tool name → Claude Code tool name (known map; unknown pass through). */
const TOOL_UP: Record<string, string> = {
  bash: "Bash", read: "Read", write: "Write", edit: "Edit", glob: "Glob",
  grep: "Grep", task: "Task", todo: "Todo", ask: "AskUserQuestion",
  web_search: "WebSearch", hub: "Hub", eval: "Eval", lsp: "Lsp",
  debug: "Debug", browser: "Browser", inspect_image: "InspectImage",
};

function log(line: Record<string, unknown>): void {
  try {
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...line }) + "\n");
  } catch { /* never crash on logging */ }
}

function expand(s: string): string {
  return s.replaceAll("$HOME", HOME).replaceAll("${HOME}", HOME);
}

/** Claude Code matcher: `*` wildcard + `|` alternation (e.g. "Bash|Write|Edit|MultiEdit", "mcp__.*"). */
function matcherToRegex(matcher: string): RegExp {
  if (!matcher || matcher === "*") return /^.*$/;
  const parts = matcher.split("|").map((p) => p.trim()).filter(Boolean);
  const body = parts
    .map((p) => p.split("*").map((seg) => seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*"))
    .join("|");
  return new RegExp(`^(?:${body})$`);
}

function hookName(command: string): string {
  return command.split("/").pop() ?? command;
}

/** Load the hook registry snapshot from ${LIFEOS_DIR}/settings.json. */
function loadRegistry(): HookReg[] {
  try {
    const raw: unknown = JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
    if (!raw || typeof raw !== "object" || !("hooks" in raw)) return [];
    const hooksMap = raw.hooks;
    if (!hooksMap || typeof hooksMap !== "object") return [];
    const out: HookReg[] = [];
    for (const [ev, entries] of Object.entries(hooksMap)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const matcher = "matcher" in entry && typeof entry.matcher === "string" ? entry.matcher : "*";
        if (!("hooks" in entry) || !Array.isArray(entry.hooks)) continue;
        for (const hk of entry.hooks) {
          if (!hk || typeof hk !== "object") continue;
          if (!("type" in hk) || hk.type !== "command") continue;
          if (!("command" in hk) || typeof hk.command !== "string" || !hk.command) continue;
          out.push({ event: ev, matcher, command: expand(hk.command) });
        }
      }
    }
    return out;
  } catch (e) {
    log({ err: "registry_load_failed", detail: String(e) });
    return [];
  }
}

const registry: HookReg[] = loadRegistry();

/** Run one hook: `sh -c <command>` with the CC JSON payload on stdin. */
async function runHook(reg: HookReg, payload: Record<string, unknown>): Promise<HookResult> {
  const t0 = Date.now();
  try {
    const proc = Bun.spawn(["sh", "-c", reg.command], {
      cwd: LIFEOS_DIR,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
    const outP = new Response(proc.stdout).text();
    const errP = new Response(proc.stderr).text();
    const exited = await Promise.race([proc.exited, Bun.sleep(HOOK_TIMEOUT_MS).then(() => "timeout" as const)]);
    if (exited === "timeout") proc.kill();
    const [out, err] = await Promise.all([outP, errP]);
    return {
      ok: exited !== "timeout",
      out,
      err: exited === "timeout" ? "timeout" : err.slice(0, 300),
      ms: Date.now() - t0,
    };
  } catch (e) {
    return { ok: false, out: "", err: String(e).slice(0, 300), ms: Date.now() - t0 };
  }
}

/** Parse CC hook stdout → { permissionDecision, reason, additionalContext, block }. */
function parseOutput(raw: string): HookOutput {
  for (const line of raw.split("\n").reverse()) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const parsed: unknown = JSON.parse(t);
      if (!parsed || typeof parsed !== "object") continue;
      const maybe = "hookSpecificOutput" in parsed ? parsed.hookSpecificOutput : parsed;
      if (!maybe || typeof maybe !== "object") continue;
      const out = maybe as Record<string, unknown>;
      const context = "additionalContext" in out && typeof out.additionalContext === "string" ? out.additionalContext : undefined;
      return {
        decision: "permissionDecision" in out && typeof out.permissionDecision === "string" ? out.permissionDecision : undefined,
        reason: "permissionDecisionReason" in out && typeof out.permissionDecisionReason === "string" ? out.permissionDecisionReason : undefined,
        context,
        block: "shouldBlockFurtherMessages" in out && out.shouldBlockFurtherMessages === true,
      };
    } catch { /* keep scanning */ }
  }
  return {};
}

interface ToolCallInfo {
  name: string;
  input: unknown;
  toolCallId: string;
}

function readToolCall(v: unknown): ToolCallInfo | null {
  if (!v || typeof v !== "object") return null;
  const name = "toolName" in v ? v.toolName : undefined;
  if (typeof name !== "string") return null;
  return {
    name,
    input: "input" in v ? v.input : undefined,
    toolCallId: "toolCallId" in v && typeof v.toolCallId === "string" ? v.toolCallId : "",
  };
}

interface ToolResultInfo {
  name: string;
  input: unknown;
  toolCallId: string;
  isError: boolean;
  content: string;
}

function readToolResult(v: unknown): ToolResultInfo | null {
  if (!v || typeof v !== "object") return null;
  const name = "tool_name" in v && typeof v.tool_name === "string"
    ? v.tool_name
    : "toolName" in v && typeof v.toolName === "string" ? v.toolName : "";
  const isErr = "isError" in v ? v.isError === true : false;
  const contentRaw = "content" in v ? v.content : undefined;
  let contentText: string;
  if (Array.isArray(contentRaw)) {
    contentText = contentRaw
      .map((c: unknown) => {
        if (c && typeof c === "object" && "text" in c && typeof c.text === "string") return c.text;
        return JSON.stringify(c);
      })
      .join("\n");
  } else if (typeof contentRaw === "string") {
    contentText = contentRaw;
  } else {
    contentText = JSON.stringify(contentRaw ?? "");
  }
  return {
    name,
    input: "input" in v ? v.input : undefined,
    toolCallId: "toolCallId" in v && typeof v.toolCallId === "string" ? v.toolCallId : "",
    isError: isErr,
    content: contentText,
  };
}

interface CtxWithUI {
  ui?: { confirm?: (title: string, message: string) => Promise<boolean> };
}

function readCtxUI(v: unknown): CtxWithUI | null {
  return v && typeof v === "object" ? (v as CtxWithUI) : null;
}

function forEvent(event: string): HookReg[] {
  return registry.filter((r) => r.event === event && r.matcher === "*");
}

function forTool(event: string, ccName: string): HookReg[] {
  return registry.filter((r) => r.event === event && matcherToRegex(r.matcher).test(ccName));
}

function toolCcName(name: string): string {
  return TOOL_UP[name] ?? name;
}

let pendingContext: string[] = [];

/** omp-native voice line: the VoiceCompletion hook needs a Claude transcript,
 *  which omp doesn't have — extract the 🗣️ closer from the session log instead. */
function extractVoiceLine(text: string): string | null {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^🗣️\s*<[^>]*>:\s*(.+)$/);
    if (m) return m[1].trim();
  }
  return null;
}

function newestSessionJsonl(): string | null {
  const root = join(HOME, ".omp", "agent", "sessions");
  let newest: string | null = null;
  let newestMs = 0;
  try {
    for (const rel of new Bun.Glob("**/*.jsonl").scanSync({ cwd: root })) {
      const full = join(root, rel);
      const st = statSync(full);
      if (st.mtimeMs > newestMs) {
        newestMs = st.mtimeMs;
        newest = full;
      }
    }
  } catch { /* no sessions dir yet */ }
  return newest;
}

function readLastAssistantText(): string {
  const file = newestSessionJsonl();
  if (!file) return "";
  try {
    const lines = readFileSync(file, "utf8").trim().split("\n");
    let last = "";
    for (const line of lines) {
      let parsed: unknown;
      try { parsed = JSON.parse(line); } catch { continue; }
      if (!parsed || typeof parsed !== "object") continue;
      if (!("message" in parsed)) continue;
      const msg = parsed.message;
      if (!msg || typeof msg !== "object") continue;
      if (!("role" in msg) || msg.role !== "assistant") continue;
      if (!("content" in msg) || !Array.isArray(msg.content)) continue;
      const text = msg.content
        .filter((c: unknown): c is { text: string } =>
          !!c && typeof c === "object" && "text" in c && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n");
      if (text) last = text;
    }
    return last;
  } catch {
    return "";
  }
}

export default function lifeosBridge(pi: ExtensionAPI): void {
  log({ event: "bridge_init", hooks: registry.length, lifeosDir: LIFEOS_DIR });

  pi.on("session_start", async () => {
    log({ event: "session_start" });
    for (const reg of forEvent("SessionStart")) {
      const res = await runHook(reg, {
        session_id: process.env.OMP_SESSION_ID ?? "omp",
        source: "startup",
        cwd: process.cwd(),
        hook_event_name: "SessionStart",
      });
      const parsed = parseOutput(res.out);
      if (parsed.context) pendingContext.push(parsed.context);
      log({ hook: hookName(reg.command), cc: "SessionStart", ok: res.ok, ms: res.ms, err: res.err || null, context: !!parsed.context });
    }
  });

  pi.on("turn_start", async () => {
    log({ event: "turn_start" });
    for (const reg of forEvent("UserPromptSubmit")) {
      const res = await runHook(reg, {
        prompt: "(omp turn_start; input payload unavailable)",
        session_id: "unknown",
        cwd: process.cwd(),
        hook_event_name: "UserPromptSubmit",
      });
      const parsed = parseOutput(res.out);
      if (parsed.context) pendingContext.push(parsed.context);
      log({ hook: hookName(reg.command), cc: "UserPromptSubmit", ok: res.ok, ms: res.ms, err: res.err || null, context: !!parsed.context });
    }
  });

  pi.on("tool_call", async (event: unknown, ctx: unknown) => {
    const info = readToolCall(event);
    if (!info) return;
    log({ event: "tool_call", tool: info.name });
    const ccName = toolCcName(info.name);
    for (const reg of forTool("PreToolUse", ccName)) {
      const res = await runHook(reg, {
        tool_name: ccName,
        tool_input: info.input ?? {},
        session_id: "unknown",
        transcript_path: "",
        cwd: process.cwd(),
        hook_event_name: "PreToolUse",
        permission_mode: "default",
        source: "omp",
        tool_use_id: info.toolCallId,
      });
      const parsed = parseOutput(res.out);
      if (parsed.context) pendingContext.push(parsed.context);
      log({ hook: hookName(reg.command), cc: "PreToolUse", tool: info.name, ok: res.ok, ms: res.ms, err: res.err || null, decision: parsed.decision || null, context: !!parsed.context });
      if (parsed.decision === "deny") {
        return { block: true, reason: parsed.reason || `blocked by LifeOS hook ${hookName(reg.command)}` };
      }
      if (parsed.decision === "ask") {
        const ui = readCtxUI(ctx);
        if (ui?.ui?.confirm) {
          const allow = await ui.ui.confirm("LifeOS hook", parsed.reason ?? "allow this tool call?");
          if (!allow) return { block: true, reason: parsed.reason ?? "denied by user" };
        } else {
          // Claude Code headless behavior: ask → deny (fail closed)
          log({ hook: hookName(reg.command), cc: "PreToolUse", tool: info.name, note: "ask→deny (headless)" });
          return { block: true, reason: parsed.reason ?? "ask denied (headless)" };
        }
      }
    }
  });

  pi.on("tool_result", async (event: unknown) => {
    const info = readToolResult(event);
    if (!info) return;
    const ccEvent = info.isError ? "PostToolUseFailure" : "PostToolUse";
    log({ event: "tool_result", tool: info.name, isError: info.isError });
    for (const reg of forTool(ccEvent, toolCcName(info.name))) {
      const res = await runHook(reg, info.isError
        ? {
            tool_name: toolCcName(info.name),
            tool_input: info.input ?? {},
            tool_response_error: info.content,
            session_id: "unknown",
            cwd: process.cwd(),
            hook_event_name: "PostToolUseFailure",
            tool_use_id: info.toolCallId,
          }
        : {
            tool_name: toolCcName(info.name),
            tool_input: info.input ?? {},
            tool_response: info.content,
            tool_response_error: null,
            session_id: "unknown",
            cwd: process.cwd(),
            hook_event_name: "PostToolUse",
            permission_mode: "default",
            source: "omp",
            tool_use_id: info.toolCallId,
          });
      const parsed = parseOutput(res.out);
      if (parsed.context) pendingContext.push(parsed.context);
      log({ hook: hookName(reg.command), cc: ccEvent, tool: info.name, ok: res.ok, ms: res.ms, err: res.err || null, context: !!parsed.context });
    }
  });

  pi.on("turn_end", async () => {
    log({ event: "turn_end" });
    for (const reg of forEvent("Stop")) {
      const res = await runHook(reg, {
        stop_hook_active: true,
        transcript_path: "",
        cwd: process.cwd(),
        hook_event_name: "Stop",
        session_id: "unknown",
      });
      const parsed = parseOutput(res.out);
      if (parsed.context) pendingContext.push(parsed.context);
      log({ hook: hookName(reg.command), cc: "Stop", ok: res.ok, ms: res.ms, err: res.err || null, context: !!parsed.context });
    }
    // omp-native voice: VoiceCompletion.hook.ts requires a Claude transcript;
    // extract the 🗣️ closer from the session log and speak it via Pulse.
    if (process.env.OMP_VOICE === "0") return;
    const line = extractVoiceLine(readLastAssistantText());
    if (!line) return;
    const t0 = Date.now();
    try {
      const res = await fetch(PULSE_NOTIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: line, voice_id: VOICE_ID }),
        signal: AbortSignal.timeout(10_000),
      });
      log({ voice: res.ok ? "sent" : "failed", status: res.status, ms: Date.now() - t0, line: line.slice(0, 40) });
    } catch (e) {
      log({ voice: "failed", err: String(e).slice(0, 120) });
    }
  });

  pi.on("session_shutdown", async () => {
    log({ event: "session_shutdown" });
    for (const reg of forEvent("SessionEnd")) {
      const res = await runHook(reg, {
        session_id: "unknown",
        transcript_path: "",
        cwd: process.cwd(),
        hook_event_name: "SessionEnd",
      });
      const parsed = parseOutput(res.out);
      if (parsed.context) pendingContext.push(parsed.context);
      log({ hook: hookName(reg.command), cc: "SessionEnd", ok: res.ok, ms: res.ms, err: res.err || null, context: !!parsed.context });
    }
  });

  // Inject queued additionalContext (delta blocks, rules) as a system message
  // before the next LLM call — replaces Claude Code's implicit injection.
  pi.on("context", async (event: unknown) => {
    if (pendingContext.length === 0) return;
    const text = pendingContext.join("\n");
    pendingContext = [];
    log({ event: "context_inject", chars: text.length });
    const messages = event && typeof event === "object" && "messages" in event && Array.isArray(event.messages)
      ? [...event.messages]
      : [];
    messages.push({ role: "system", content: [{ type: "text", text }] });
    return { messages };
  });
}
