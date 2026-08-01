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

/** True when this process is a subagent/delegate rather than the main session. */
export function isSubagentContext(): boolean {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '';
  return Boolean(
    projectDir.includes('/.claude/Agents/') ||
      process.env.CLAUDE_AGENT_TYPE ||
      process.env.CLAUDE_CODE_SUBAGENT_NAME ||
      process.env.CLAUDE_CODE_SUBAGENT_TYPE ||
      process.env.CLAUDE_AGENT_SDK === '1',
  );
}
