#!/usr/bin/env bun
/**
 * @version 1.0.0
 * BashSystemWriteGuard.hook.ts — PreToolUse:Bash lane of the SystemFileGuard.
 *
 * The 2026-08-11 incident this closes: a `cat > hooks/<file> <<EOF` heredoc
 * carried a principal path literal into the SYSTEM tree and landed unguarded,
 * because SystemFileGuard runs only on Write/Edit/MultiEdit — Bash was an
 * unwatched pen. Same gate class as the ISACloseGate fix from the same turn:
 * a guard that watches one tool is a guard that reads a proxy.
 *
 * What this lane does: when a Bash command is WRITE-SHAPED into a SYSTEM-tree
 * target (redirection, tee, cp/mv, sed -i, or a script-write like write_text /
 * writeFileSync), the ENTIRE command text — which contains any heredoc or
 * echo'd content — is scanned against the same deny-list the file guard uses.
 * A hit blocks with the same remediation message.
 *
 * Honest residual, stated rather than hidden: content that reaches the file
 * through a variable, a template file, or a network fetch is not visible in
 * the command text and passes this lane. The release-time containment gates
 * remain the backstop for that class, exactly as before. This lane closes the
 * inline-content class, which is what agents actually write day to day.
 *
 * Fail-open by doctrine: any internal error returns null (allow) — a bug in
 * a guard must never block the shell. PreToolGuard's isolate() enforces it too.
 */

import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { classifyTarget, loadPatterns, scanForFirstHit } from "./lib/system-file-guard-core";

const HOME = process.env.HOME ?? homedir();
const CLAUDE_ROOT = join(HOME, ".claude");

interface HookInput {
  tool_input?: { command?: unknown };
}

/** Candidate write-target extraction. A bounded, deliberately over-broad set —
 *  a false candidate only costs a deny-scan of the command text, never a block
 *  by itself. */
const TARGET_RES: RegExp[] = [
  />{1,2}\s*([^\s;|&()<>]+)/g, // > file, >> file
  /\btee\b(?:\s+-a)?\s+([^\s;|&()]+)/g, // tee [-a] file
  /\b(?:cp|mv)\b(?:\s+-[A-Za-z]+)*(?:\s+[^\s;|&]+)\s+([^\s;|&]+)/g, // cp/mv src DEST
  /\bsed\s+-i[^\n;|&]*?\s([^\s;|&]+)\s*(?:$|[;|&\n])/g, // sed -i ... file
  /Path\(\s*["']([^"']+)["']\s*\)/g, // python pathlib target (heredoc bodies ride the command)
  /writeFileSync\(\s*["']([^"']+)["']/g, // node/bun script writes inlined via -e/heredoc
];

/** Resolve a candidate token to an absolute path when it plausibly names a file
 *  inside ~/.claude. Relative candidates resolve against a `cd <dir>` earlier in
 *  the same command when present, else against ~/.claude only when they look
 *  tree-relative (hooks/, LIFEOS/, skills/ …). */
export function resolveCandidate(token: string, cmd: string): string | null {
  let t = token.replace(/^["']|["']$/g, "");
  if (!t || t === "-" || t.startsWith("/dev/")) return null;
  if (t.startsWith("~/")) t = join(HOME, t.slice(2));
  if (t.startsWith("$HOME/")) t = join(HOME, t.slice(6));
  if (t.startsWith("/")) return t;
  const cd = /(?:^|&&|;)\s*cd\s+([^\s;|&]+)/.exec(cmd);
  if (cd) {
    let base = cd[1]!.replace(/^["']|["']$/g, "");
    if (base.startsWith("~/")) base = join(HOME, base.slice(2));
    if (base.startsWith("$HOME/")) base = join(HOME, base.slice(6));
    if (base.startsWith("/")) return resolve(base, t);
  }
  // Bare tree-relative shapes (hooks/x.ts, LIFEOS/TOOLS/y.ts) — assume the tree.
  if (/^(hooks|LIFEOS|skills|commands|agents|test)\//.test(t)) return join(CLAUDE_ROOT, t);
  return null;
}

export function systemWriteTargets(cmd: string): string[] {
  const out: string[] = [];
  for (const re of TARGET_RES) {
    re.lastIndex = 0;
    for (let m = re.exec(cmd); m; m = re.exec(cmd)) {
      const abs = resolveCandidate(m[1]!, cmd);
      if (!abs) continue;
      if (classifyTarget(abs, CLAUDE_ROOT).classification === "system") out.push(abs);
    }
  }
  return Array.from(new Set(out));
}

export function check(
  input: HookInput,
  patterns?: ReadonlyArray<{ source: string; regex: RegExp }>, // test seam; production loads the deny-list
): { block: true; message: string } | null {
  const cmd = typeof input?.tool_input?.command === "string" ? input.tool_input.command : "";
  if (!cmd) return null;
  const targets = systemWriteTargets(cmd);
  if (targets.length === 0) return null;
  const hit = scanForFirstHit(cmd, patterns ?? loadPatterns());
  if (!hit) return null;
  const rel = targets.map((t) => t.replace(`${CLAUDE_ROOT}/`, "")).join(", ");
  return {
    block: true,
    message: [
      "",
      "═══════════════════════════════════════════════════════════════════════════",
      "  BashSystemWriteGuard — write BLOCKED.",
      "═══════════════════════════════════════════════════════════════════════════",
      "",
      `  Target(s):  ${rel}`,
      `  Pattern:    ${hit.pattern}`,
      `  Matched:    ${hit.match}`,
      "",
      "  This Bash command writes into the SYSTEM tree and its inline content",
      "  (heredoc/echo body) carries a deny-list pattern — the same rule",
      "  SystemFileGuard enforces on Edit/Write. Use the Edit/Write tools for",
      "  system-tree files (they get the full guard), move the content to a",
      "  USER zone, or strip the identifying token.",
      "",
      "  Doctrine: LIFEOS/DOCUMENTATION/SystemUserBoundary.md",
      "═══════════════════════════════════════════════════════════════════════════",
      "",
    ].join("\n"),
  };
}
