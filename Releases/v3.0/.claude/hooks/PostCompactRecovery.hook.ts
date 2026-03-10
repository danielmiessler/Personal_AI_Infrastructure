#!/usr/bin/env bun
/**
 * PostCompactRecovery.hook.ts - Re-inject critical context after compaction (SessionStart[compact])
 *
 * PURPOSE:
 * When Claude Code compacts conversation history, hook-injected context from
 * <system-reminder> blocks is treated as regular conversation and may be
 * summarized or dropped. This hook fires AFTER compaction completes and
 * re-injects critical identity and behavioral context via additionalContext.
 *
 * TRIGGER: SessionStart (matcher: "compact")
 *
 * INPUT:
 * - stdin: Hook input JSON with session_id, source ("compact")
 * - Settings: settings.json for identity configuration
 *
 * OUTPUT:
 * - stdout: JSON with additionalContext field (injected as system-reminder)
 * - stderr: Status messages
 * - exit(0): Normal completion (including non-compact sources)
 *
 * SIDE EFFECTS:
 * - Reads settings.json for identity
 *
 * INTER-HOOK RELATIONSHIPS:
 * - COORDINATES WITH: LoadContext (which also fires on compact SessionStart
 *   and re-injects dynamic context). This hook provides ADDITIONAL
 *   compact-specific context — identity reinforcement and behavioral
 *   reminders that the compaction summary is most likely to lose.
 * - Complements Compact Instructions in CLAUDE.md (preventive layer) with
 *   corrective re-injection (this hook).
 *
 * DESIGN NOTES:
 * - PreCompact hooks have NO output schema (fire-and-forget for side effects).
 *   SessionStart[compact] with additionalContext is the correct architecture
 *   for post-compaction context recovery.
 * - Recovery content kept under 3KB to avoid bloating post-compact context.
 * - Based on PR #799 from the official PAI repo (community contribution).
 *
 * PERFORMANCE:
 * - Typical execution: <10ms
 * - Skipped for: Non-compact SessionStart sources
 */

import { getIdentity, getPrincipal, getVoiceId } from './lib/identity';
import { readStdinWithTimeout } from './lib/stdin';

interface SessionStartInput {
  session_id: string;
  hook_event_name: string;
  source: string;  // "startup", "resume", "clear", "compact"
}

async function main() {
  const raw = await readStdinWithTimeout(500);
  let input: SessionStartInput;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  // TypeScript: process.exit() above guarantees input is assigned here
  input = input!;

  // Only fire on post-compaction recovery
  if (input.source !== 'compact') {
    process.exit(0);
  }

  const identity = getIdentity();
  const principal = getPrincipal();
  const voiceId = getVoiceId();
  const timestamp = new Date().toISOString();

  console.error(`[PostCompactRecovery] Post-compaction recovery at ${timestamp}`);

  // Build recovery context — kept under 3KB
  // Targets what compaction summaries typically lose: identity, format, key rules
  const recoveryContext = [
    `POST-COMPACTION CONTEXT RECOVERY (auto-injected by PostCompactRecovery.hook.ts)`,
    ``,
    `Context was just compacted. Prior conversation has been summarized.`,
    `The compaction summary may have lost or muddled key context. This block restores it.`,
    ``,
    `IDENTITY:`,
    `- You are ${identity.name} (PAI — Personal AI Infrastructure). Use this name, not "Claude".`,
    `- User name: ${principal.name}`,
    `- Voice ID: ${voiceId || 'not configured'}`,
    `- Timezone: ${principal.timezone}`,
    ``,
    `FORMAT RULES (may have been lost in compaction summary):`,
    `- Every response MUST use one of the PAI output formats: NATIVE, ALGORITHM, or MINIMAL.`,
    `- No freeform output. No vanilla Claude Code responses.`,
    `- CLAUDE.md is authoritative — re-read it now and follow its rules exactly.`,
    `- If in Algorithm mode, read the active PRD from MEMORY/WORK/ (most recent by mtime) to recover phase, criteria, and progress.`,
    ``,
    `BEHAVIORAL REMINDERS:`,
    `- Verify before claiming completion — use tools to confirm, don't just say "done"`,
    `- Read before modifying — always read existing code before changing it`,
    `- Ask before destructive actions — deletions, deployments, force pushes need approval`,
    `- Only make requested changes — don't refactor or "improve" beyond the ask`,
    `- Use ${identity.name} as your name in voice lines, not "Claude"`,
  ].join('\n');

  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: recoveryContext,
    },
  };

  console.log(JSON.stringify(output));
  process.exit(0);
}

await main();
