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
 */

/**
 * Hook payload fields that identify delegated work. PostToolUse carries these
 * ONLY for subagent calls; they are absent in the main session.
 */
export interface SubagentHookInput {
  agent_id?: unknown;
  agent_type?: unknown;
}

/**
 * True when this process is a subagent/delegate rather than the main session.
 *
 * Pass the hook's parsed stdin payload whenever you have it.
 * The environment union below CANNOT see a fork: measured live,
 * a fork's PostToolUse hook process had every marker unset — including
 * CLAUDE_CODE_FORK_SUBAGENT — and shared the parent's session_id byte for byte.
 * The only signal that distinguished the two was agent_id/agent_type in the
 * hook payload itself. Env markers are kept because they still identify the
 * non-fork delegate families and standalone runs, where no payload exists.
 */
export function isSubagentContext(hookInput?: SubagentHookInput | null): boolean {
  if (hookInput && (hookInput.agent_id || hookInput.agent_type)) return true;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '';
  return Boolean(
    projectDir.includes('/.claude/Agents/') ||
      process.env.CLAUDE_AGENT_TYPE ||
      process.env.CLAUDE_CODE_SUBAGENT_NAME ||
      process.env.CLAUDE_CODE_SUBAGENT_TYPE ||
      // Kept for any runtime that DOES set this, but insufficient on its own:
      // a fork was observed with no marker set at all, which is why the
      // hookInput check above exists. (public issue #1831)
      process.env.CLAUDE_CODE_FORK_SUBAGENT === '1' ||
      process.env.CLAUDE_AGENT_SDK === '1',
  );
}
