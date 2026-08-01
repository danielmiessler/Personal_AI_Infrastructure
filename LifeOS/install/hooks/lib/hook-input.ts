/**
 * hook-input.ts — zero-dependency boundary validation for hook stdin.
 *
 * Hooks receive untrusted tool-input JSON on stdin and, historically, did
 * `JSON.parse(...) as SomeShape` — a raw cast, no runtime check, on a trust
 * boundary. The world-standard rule (Alexis King, "parse don't validate";
 * Google hermeticity) is that external input is validated at the boundary and
 * a more-precisely-typed value flows inward.
 *
 * We do that WITHOUT a runtime dependency (no zod/valibot): hooks must run
 * install-free — the fail-safe-open design of the security gates depends on
 * being importable before `bun install`. These are hand-written type guards,
 * the standard's sanctioned zero-dep boundary tool.
 *
 * Contract: every parse returns a discriminated `Validated<T>`; callers branch
 * on `.ok` and route the invalid case to their existing safe default (never
 * coerce a malformed field into a decision).
 */

export type Validated<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: string };

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function isString(x: unknown): x is string {
  return typeof x === "string";
}

export function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every(isString);
}

/** Parse raw stdin text into a JSON object, or a reason it is unusable. */
export function parseHookStdin(raw: string): Validated<Record<string, unknown>> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty stdin" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, reason: "stdin is not valid JSON" };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "stdin JSON is not an object" };
  return { ok: true, value: parsed };
}

/** The fields common to every Claude Code hook event. */
export interface BaseHookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

/** Narrow a parsed stdin object to BaseHookInput; requires the three core string fields. */
export function validateBaseHookInput(obj: Record<string, unknown>): Validated<BaseHookInput> {
  if (!isString(obj.session_id)) return { ok: false, reason: "missing/invalid session_id" };
  if (!isString(obj.transcript_path)) return { ok: false, reason: "missing/invalid transcript_path" };
  if (!isString(obj.hook_event_name)) return { ok: false, reason: "missing/invalid hook_event_name" };
  return {
    ok: true,
    value: {
      session_id: obj.session_id,
      transcript_path: obj.transcript_path,
      hook_event_name: obj.hook_event_name,
    },
  };
}

/** The Write/Edit/MultiEdit tool-input shape the file-write guards read. */
export interface WriteToolInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    content?: string;
    new_string?: string;
    edits?: Array<{ new_string?: string }>;
  };
}

/**
 * Safely narrow a parsed stdin object to WriteToolInput. Unknown/wrong-typed
 * fields are dropped (become undefined), never coerced — so a downstream guard
 * that reads `file_path` gets a real string or nothing, never a number cast to
 * a path. Always returns a value (the write guards fail-open on absence).
 */
export function asWriteToolInput(obj: Record<string, unknown>): WriteToolInput {
  const out: WriteToolInput = {};
  if (isString(obj.tool_name)) out.tool_name = obj.tool_name;
  const ti = obj.tool_input;
  if (isRecord(ti)) {
    const inner: NonNullable<WriteToolInput["tool_input"]> = {};
    if (isString(ti.file_path)) inner.file_path = ti.file_path;
    if (isString(ti.content)) inner.content = ti.content;
    if (isString(ti.new_string)) inner.new_string = ti.new_string;
    if (Array.isArray(ti.edits)) {
      inner.edits = ti.edits
        .filter(isRecord)
        .map((e) => (isString(e.new_string) ? { new_string: e.new_string } : {}));
    }
    out.tool_input = inner;
  }
  return out;
}
