#!/usr/bin/env bun
/**
 * @version 1.0.3
 * CommunicationSkillGuard.hook.ts — PreToolUse Bash gate
 *
 * Catches raw outbound-email sends — `gmail.ts send` and `aws ses send-email`
 * — that are NOT routed through a communication skill's send workflow, and
 * blocks them BEFORE the tool runs.
 *
 * A send workflow carries load-bearing rules the bare tool skips: mandatory
 * BCC/archive, sender identity/signature consistency, and DKIM/DMARC-safe
 * transport selection. Free-handing the tool bypasses all of it (the
 * 2026-06-13 ISA-email miss is the canonical failure).
 *
 * A send workflow tags every send command with a `LIFEOS_SKILL=<name>` marker
 * (an inert env assignment the tools ignore). This hook allows commands
 * carrying any such marker and blocks the rest — same model as
 * ArtWorkflowGuard's `--workflow=` requirement for Generate.ts.
 *
 * TRIGGER: PreToolUse (matcher: Bash)
 * EXIT CODES: 0 = allow, 2 = deny (blocks the call, message goes to model)
 */

import { readFileSync } from "node:fs";

interface HookInput {
  tool_input?: { command?: string };
}

function readHookInput(): HookInput {
  try {
    return JSON.parse(readFileSync(0, "utf-8")) as HookInput;
  } catch {
    return {};
  }
}

// Outbound-send signatures. Read-only gmail ops (count/ids/fetch/archive) and
// non-send aws ses ops (verify-email-identity, etc.) are deliberately NOT gated.
// The gmail matcher is anchored to an actual bun/bunx EXECUTION of gmail.ts —
// a mere mention of the path in a grep/echo/comment must not trip the gate
// (public issue #1453: unanchored substring matching blocked ordinary dev
// commands; same class as #1335). `[^|;&\n]*` keeps the match inside one
// shell command, so `echo x && bun gmail.ts send` still trips on the real leg.
function isEmailSend(command: string): boolean {
  // bun/bunx execution of gmail.ts, OR gmail.ts itself in command position
  // (direct-shebang `./…/gmail.ts send`) — both are real invocations; a path
  // appearing mid-command as data (grep/echo/cp arguments) is not.
  const gmailExec = /\b(?:bun|bunx)\b[^|;&\n]*?\bgmail\.ts['"]?\s+send\b/.test(command);
  const gmailShebang = /(?:^|[;&|]\s*|\$\(\s*)\S*gmail\.ts\s+send\b/.test(command);
  const sesSend = /\baws\s+sesv?2?\s+send(-raw)?-email\b/.test(command);
  return gmailExec || gmailShebang || sesSend;
}

function isSkillRouted(command: string): boolean {
  // Any LIFEOS_SKILL= marker routes (public issue #1504, @tzioup): the guard
  // must not name a specific private skill, so it accepts whatever comms skill
  // an install actually has — a LIFEOS_SKILL=<comms-skill> marker still matches.
  return /LIFEOS_SKILL=\S+/.test(command);
}

const BLOCK_MESSAGE = [
  "",
  "═══════════════════════════════════════════════════════════════════════════",
  "  CommunicationSkillGuard — raw email send BLOCKED before execution.",
  "═══════════════════════════════════════════════════════════════════════════",
  "",
  "  Email should go through your communication skill/workflow, not a bare",
  "  tool call. A raw `gmail.ts send` / `aws ses send-email` skips the rules a",
  "  send path carries: BCC/archive, consistent sender identity + signature,",
  "  and safe (DKIM/DMARC-aligned) transport.",
  "",
  "  Do this instead:",
  "    1. Route the send through your communication skill's send workflow.",
  "    2. That workflow prefixes the command with a  LIFEOS_SKILL=<name>",
  "       marker, which this guard recognizes and allows.",
  "",
  "  Explicit one-off override (logged): prefix the command with",
  "    LIFEOS_SKILL=<your-comms-skill>  <your send command>",
  "  Only do this when you have genuinely already applied the send rules",
  "  (BCC/archive, identity/signature, transport).",
  "",
  "═══════════════════════════════════════════════════════════════════════════",
  "",
].join("\n");

/**
 * Pure check for PreToolGuard dispatch. Returns a block decision or null (allow).
 * FAIL-OPEN: an unrouted email send is the only block; everything else allows.
 */
export function check(input: HookInput): { block: true; message: string } | null {
  const command = input?.tool_input?.command ?? "";
  if (!isEmailSend(command)) return null;
  if (isSkillRouted(command)) return null;
  return { block: true, message: BLOCK_MESSAGE };
}

if (import.meta.main) {
  const result = check(readHookInput());
  if (result?.block) {
    process.stderr.write(result.message);
    process.exit(2);
  }
  process.exit(0);
}
