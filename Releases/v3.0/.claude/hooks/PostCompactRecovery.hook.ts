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
 * - DEPENDS ON: None
 * - COORDINATES WITH: LoadContext (which also fires on compact SessionStart
 *   and re-injects SKILL.md). This hook provides ADDITIONAL compact-specific
 *   context — identity reinforcement and behavioral reminders that the
 *   compaction summary is most likely to lose or muddle.
 * - MUST RUN BEFORE: None
 * - MUST RUN AFTER: None (order-independent with LoadContext)
 *
 * DESIGN NOTES:
 * - LoadContext already re-injects SKILL.md + steering rules on compact.
 *   This hook adds a lightweight (~1.5KB) identity + orientation block
 *   specifically targeting what compaction summaries typically lose:
 *   assistant name, user name, response format, key behavioral rules.
 * - PreCompact hooks have NO output schema (fire-and-forget for side effects).
 *   SessionStart[compact] with additionalContext is the correct architecture
 *   for post-compaction context recovery.
 * - Recovery content is kept under 3KB to avoid bloating post-compact context.
 *
 * ERROR HANDLING:
 * - stdin parse failure: Silent exit (non-fatal)
 * - Non-compact source: Silent exit (hook is a no-op for startup/resume/clear)
 * - Settings read failure: Falls back to defaults
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <10ms
 * - Skipped for: Non-compact SessionStart sources
 *
 * RELATED:
 * - Discussion #792: Upstream Claude Code bugs affecting PAI session context
 * - claude-code #24460: CLAUDE.md content lost during compaction
 * - claude-code #27954: Thinking block skipped after compaction
 */

import { getIdentity, getPrincipal, getVoiceId } from './lib/identity';
import { getPaiDir } from './lib/paths';

interface SessionStartInput {
  session_id: string;
  hook_event_name: string;
  source: string;  // "startup", "resume", "clear", "compact"
}

async function main() {
  const raw = await Bun.stdin.text();
  let input: SessionStartInput;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

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
    `- Assistant name: ${identity.name} (use this name, not "Claude")`,
    `- User name: ${principal.name}`,
    `- Voice ID: ${voiceId || 'not configured'}`,
    `- Timezone: ${principal.timezone}`,
    ``,
    `FORMAT RULES (may have been lost in compaction summary):`,
    `- Use PAI Algorithm format with 7 phases (OBSERVE, THINK, PLAN, BUILD, EXECUTE, VERIFY, LEARN)`,
    `- Create ISC (Ideal State Criteria) via TaskCreate before doing work`,
    `- Voice curls at each phase transition`,
    `- Every response uses the Algorithm. The only variable is DEPTH (FULL/ITERATION/MINIMAL).`,
    ``,
    `BEHAVIORAL REMINDERS:`,
    `- Verify before claiming completion — use tools to confirm, don't just say "done"`,
    `- Read before modifying — always read existing code before changing it`,
    `- Ask before destructive actions — deletions, deployments, force pushes need approval`,
    `- Only make requested changes — don't refactor or "improve" beyond the ask`,
    `- Use ${identity.name} as your name in voice lines, not "Claude"`,
  ].join('\n');

  const output = {
    additionalContext: recoveryContext,
  };

  console.log(JSON.stringify(output));
  process.exit(0);
}

main();
