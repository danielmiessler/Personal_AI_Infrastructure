#!/usr/bin/env bun
/**
 * @version 1.2.4
 * LoadMemory — UserPromptSubmit hook that injects the two hot-layer memory
 * files (PRINCIPAL_MEMORY.md, DA_MEMORY.md) as additionalContext on every
 * prompt, so the Claude Code CLI session sees the same memory the remote
 * channels (iMessage, Siri) inject via buildLifeosContextBlock.
 *
 * Closes the CLI-vs-remote-channel parity gap (the autonomic loop was
 * writing memory files but the CLI session was never reading them in-prompt).
 *
 * Performance: hot-path hook. Must be cheap. Both files cap at 48 entries
 * × 256 chars = ~12K chars each, ~24K combined max. We render only the
 * entries (no help comments), so practical injection is far smaller.
 *
 * Failure mode: any error logs to stderr and exits 0 (never block the prompt).
 *
 * Subagent skip: subagents see only what their parent passed them; the per-
 * turn memory loop is for the principal's primary session. Detect and skip
 * via env markers the harness sets on subagent processes.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { homedir } from "node:os";
import { isSubagentContext as isSubagentInvocation } from './lib/subagent';
import { parseMemoryContent } from "../LIFEOS/TOOLS/MemoryWriter";

const CLAUDE_ROOT = pathResolve(homedir(), ".claude");
const PRINCIPAL_MEMORY = pathResolve(CLAUDE_ROOT, "LIFEOS/USER/PRINCIPAL/PRINCIPAL_MEMORY.md");
const DA_MEMORY = pathResolve(CLAUDE_ROOT, "LIFEOS/USER/DIGITAL_ASSISTANT/DA_MEMORY.md");

interface MemoryRead {
  entries: string[];
  count: number;
  charsUsed: number;
}

function readMemory(path: string): MemoryRead {
  if (!existsSync(path)) return { entries: [], count: 0, charsUsed: 0 };
  try {
    // Shared lenient parser — MemoryWriter owns it. The old strict indexOf slice
    // returned ZERO entries on any marker disorder, so a file with a stray END
    // before BEGIN silently loaded no memory into any session while the writer
    // kept curating it. (public PR #1593, @anikinsasha)
    const { entries } = parseMemoryContent(readFileSync(path, "utf8"));
    const charsUsed = entries.reduce((sum, e) => sum + e.length, 0);
    return { entries, count: entries.length, charsUsed };
  } catch {
    return { entries: [], count: 0, charsUsed: 0 };
  }
}

function renderBlock(title: string, mem: MemoryRead, capEntries = 48, capChars = 12288): string {
  const header = `## ${title} [${mem.count}/${capEntries} entries · ${mem.charsUsed}/${capChars} chars]`;
  if (mem.count === 0) {
    return `${header}\n(no entries yet)`;
  }
  return `${header}\n${mem.entries.join("\n")}`;
}

/** Returns the <lifeos-memory> context block, or null on error. Pure — no exit. */
export function run(): string | null {
  try {
    const principal = readMemory(PRINCIPAL_MEMORY);
    const da = readMemory(DA_MEMORY);

    const principalBlock = renderBlock("PRINCIPAL MEMORY", principal);
    const daBlock = renderBlock("DA MEMORY", da);

    return `<lifeos-memory>\n${principalBlock}\n\n${daBlock}\n</lifeos-memory>\n`;
  } catch (e) {
    process.stderr.write(`LoadMemory error: ${(e as Error)?.message || String(e)}\n`);
    return null;
  }
}

if (import.meta.main) {
  if (!isSubagentInvocation()) {
    const out = run();
    if (out) process.stdout.write(out);
  }
  process.exit(0);
}
