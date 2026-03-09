## Capability Selection

**INVOCATION OBLIGATION: Selecting a capability creates a binding commitment to call it via tool.** Every selected capability MUST be invoked during BUILD or EXECUTE via `Skill` tool call (for skills) or `Task` tool call (for agents). There is no text-only alternative — writing output that resembles what a skill would produce does NOT count as invocation. Selecting a capability and never calling it via tool is **dishonest**. If you realize mid-execution that a capability isn't needed, remove it from the selected list with a reason rather than leaving a phantom selection.

SELECTION METHODOLOGY:

1. Fully understand the task from the reverse engineering step.
2. Consult the skill listing in the system prompt (injected at session start under "The following skills are available for use with the Skill tool") to learn what PAI skills are available.
3. Consult the **Platform Capabilities** table below for Claude Code built-in capabilities beyond PAI skills.
4. SELECT capabilities across BOTH sources. Don't limit selection to PAI skills — platform capabilities can dramatically improve quality and speed.

PLATFORM CAPABILITIES (consider alongside PAI skills):

| Capability | When to Select | Invoke |
|------------|---------------|--------|
| /simplify | After code changes — 3 agents review quality, reuse, efficiency | `Skill("simplify")` |
| /batch | Parallel changes across many files with worktree isolation | `Skill("batch", "instruction")` |
| /debug | Session behaving unexpectedly — reads debug log | `Skill("debug")` |
| /review | Review a PR for quality, security, tests | Describe: "review this PR" |
| /security-review | Analyze pending changes for security vulnerabilities | Describe: "security review" |
| Agent Teams | Complex multi-agent work needing coordination + shared tasks | `TeamCreate` + `Agent` with team_name |
| Worktree Isolation | Parallel dev work — each agent gets isolated file system | `Agent` with `isolation: "worktree"` |
| Background Agents | Non-blocking parallel research or exploration | `Agent` with `run_in_background: true` |
| Competing Hypotheses | Debugging with multiple possible causes | Spawn N agents, each testing one theory |
| Writer/Reviewer | Code quality via role separation | One agent writes, separate agent reviews |

/simplify should be near-default for any code-producing Algorithm run. /batch should be considered for any task touching 3+ files with similar changes. Agent Teams should be considered for Extended+ effort with independent workstreams.

GUIDANCE:

- Use Parallelization whenever possible using the Agents skill, Agent Teams, Background Agents, or Worktree Isolation to save time on tasks that don't require serial work.
- Use Thinking Skills like Iterative Depth, Council, Red Teaming, and First Principles to go deep on analysis.
- Use dedicated skills for specific tasks, such as Research for research, Blogging for anything blogging related, etc.
- Use /simplify after code changes to catch quality issues before VERIFY phase.
- Use /batch for multi-file refactors or codebase-wide changes.
