/**
 * subagent.ts — the single answer to "am I running inside a subagent?"
 *
 * Eight hooks each carried their own copy of this test, and the copies had
 * drifted into two incompatible families:
 *
 *   LoadContext, KittyEnvPersist   → CLAUDE_PROJECT_DIR path + CLAUDE_AGENT_TYPE
 *   the six memory/surface hooks   → CLAUDE_CODE_SUBAGENT_NAME | _TYPE | CLAUDE_AGENT_SDK
 *
 * Neither family sees what the other keys on, so whichever marker the harness
 * actually sets, some hooks were guessing. Duplicated guards drift silently
 * because nothing compares them; one function is the fix, not a rule telling
 * people to keep nine copies in step.
 *
 * The test is the UNION of every known marker. That is strictly safer than any
 * single family: a missed subagent leaks main-session context (and a duplicate
 * surface line) into a delegate, while a false positive would suppress context
 * in a main session. Verified 2026-07-28 in a main session — every marker below
 * is unset, so the union cannot false-positive there.
 *
 * Env markers cannot see a FORK: a fork's environment is byte-identical to its
 * parent's, and CLAUDE_CODE_FORK_SUBAGENT is the feature-ENABLE flag every modern
 * interactive session carries, so testing it read every main session as a subagent
 * (#1864, #1911; that row is removed here, matching PR #1942). The authoritative
 * marker is the hook's stdin stamp — `agent_id`/`agent_type` (a fork arrives as
 * `agent_type: "fork"`), and SessionStart's `source: "fork"`. Consumers holding
 * parsed stdin pass it in; the env union stays the fallback, and #1831 stays shut.
 */

/** True when hook stdin carries the harness's subagent stamp (fork included). */
export function isSubagentHookInput(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) return false;
  const stamp = input as Record<string, unknown>;
  const named = (v: unknown): boolean => typeof v === 'string' && v.length > 0;
  return Boolean(
    named(stamp.agent_id) ||
      named(stamp.agent_type) ||
      (stamp.hook_event_name === 'SessionStart' && stamp.source === 'fork'),
  );
}

/**
 * True when this process is a subagent/delegate rather than the main session.
 * Pass the hook's parsed stdin when it is already in hand — it is the only
 * signal a fork sets.
 */
export function isSubagentContext(input?: unknown): boolean {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '';
  return Boolean(
    projectDir.includes('/.claude/Agents/') ||
      process.env.CLAUDE_AGENT_TYPE ||
      process.env.CLAUDE_CODE_SUBAGENT_NAME ||
      process.env.CLAUDE_CODE_SUBAGENT_TYPE ||
      process.env.CLAUDE_AGENT_SDK === '1' ||
      isSubagentHookInput(input),
  );
}
