# LifeOS AI Genius — User Manual

## What Changed

Your vault went from a 58KB monolithic CLAUDE.md to a modular, self-improving system. Claude still works the same way on the surface — you talk to it, it helps you. But underneath, everything is different.

**Before**: Claude loaded 14,500 tokens of instructions every session. No memory between sessions. No feedback loop. No protection against dangerous commands. Every session started from zero.

**After**: Claude loads ~1,700 tokens of routing instructions, then selectively loads only the skills, policies, and context relevant to your request. It remembers what you were working on. It captures your preferences and learns from mistakes. It protects against dangerous commands. It tracks its own performance and proposes improvements weekly.

You don't need to change how you talk to Claude. But knowing what's available lets you get more out of it.

---

## Quick Reference

| You say | What happens |
|---|---|
| Any normal request | Claude classifies effort, routes to the right skill, loads relevant context |
| "research [topic]" | Research skill activates with appropriate depth |
| "extensive research on [topic]" | Multi-agent research with 4-5 parallel sources |
| "council: [question]" | 4 agents debate across 3 rounds, you get the transcript |
| "quick council: [question]" | Fast 1-round perspective check |
| "algorithm effort THOROUGH: [task]" | Full Algorithm with ISC table, research, council |
| "show proposals" | Review pending improvement proposals from weekly synthesis |
| "create a skill for [domain]" | Interactive new skill creation |
| "how am I doing on my goals?" | Telos reads Tracking/ and reports progress |
| "add belief: [something]" | Recorded in AI/telos/beliefs.md |
| "add lesson: [something]" | Recorded in AI/telos/lessons.md |
| "I predict [something] by [date]" | Tracked in AI/telos/predictions.md |
| "7 - good work" (or any 1-10 rating) | Captured in ratings.jsonl, feeds into learning |
| "skip the algorithm" or "just do it" | Bypasses structured execution, does the task directly |

---

## The Effort System

Every request is silently classified into an effort level. This determines how much infrastructure Claude deploys.

### TRIVIAL
"hello", "thanks", "yes"
→ Direct response. No skill routing, no overhead.

### QUICK
"translate this to Polish", "what's on my calendar today"
→ Routes to one skill. No ISC, no parallel agents. Just does it.

### STANDARD
"draft a newsletter issue", "review this proposal"
→ The Algorithm activates. ISC table created. Research available. 1-3 parallel agents possible. This is the default for real work.

### THOROUGH
"redesign my content strategy", "evaluate this business opportunity"
→ Full Algorithm. Extensive research. Council debate. 3-5 parallel agents. Deep analysis. Use this for important decisions.

### DETERMINED
"keep going until all tests pass", "don't stop until this is production-ready"
→ Everything available. Unlimited iterations. 10+ parallel agents. Use rarely — for mission-critical tasks.

### Overriding Effort

You can force a level:
- "algorithm effort THOROUGH: [task]" — forces THOROUGH
- "this is a quick one" — forces QUICK
- "skip the algorithm" — bypasses ISC entirely

### When to Override

- Something Claude classifies as STANDARD but you know is simple → "this is a quick one"
- Something that looks simple but matters a lot → "algorithm effort THOROUGH: [task]"
- You're in a hurry → "just do it, no ISC"

---

## The Algorithm & ISC

For STANDARD+ tasks, Claude creates an ISC (Ideal State Criteria) table before doing any work. This is a table of "what done well looks like."

Example:
```
## ISC: Draft newsletter about AI agents
**Effort:** STANDARD | **Phase:** OBSERVE | **Iteration:** 1

| # | What Ideal Looks Like | Source | Capability | Status |
|---|---|---|---|---|
| 1 | Topic covers AI agents with fresh angle | EXPLICIT | research | PENDING |
| 2 | 3-5 non-obvious insights | EXPLICIT | research | PENDING |
| 3 | Matches AI Equilibrium voice | INFERRED | newsletter skill | PENDING |
| 4 | British English, no slop | IMPLICIT | formatting | PENDING |
```

**You see this table after the OBSERVE phase.** You can:
- Add rows: "also make sure it references last week's issue"
- Remove rows: "don't worry about cross-linking"
- Adjust: "row 2 should be 5-7 insights, not 3-5"
- Or just confirm: "looks good, go ahead"

Claude then works through THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN, updating the ISC as it goes. At the end, you see the completed table with all statuses.

### When to Care About the ISC

- **For important work**: read the ISC after OBSERVE, make sure it captures what you actually want
- **For routine work**: glance at it, confirm, let Claude work
- **When something goes wrong**: the ISC shows exactly which criterion failed and why

### When to Ignore It

- QUICK tasks don't have an ISC
- If you say "just do it" or "skip the algorithm", no ISC is created
- For simple, well-understood tasks, the ISC is overhead — skip it

---

## Research

Three depth levels, triggered by how you phrase the request.

### Quick Research
"quick research on [topic]" or simple factual questions
→ One source, 3-5 bullet points, ~10 seconds

### Standard Research
"research [topic]" or "investigate [topic]"
→ Two parallel agents (WebSearch + Perplexity), cross-referenced findings
→ Structured report with agreements, disagreements, confidence assessment
→ ~15-30 seconds

### Extensive Research
"extensive research on [topic]" or "deep dive into [topic]"
→ 4-5 parallel agents (WebSearch, Perplexity, Brave, Firecrawl)
→ Comprehensive report with source analysis and open questions
→ ~60-90 seconds

### Research Outputs Are Saved
Every research result goes to `AI/memory/research/YYYY-MM-DD_{topic}.md`. Next time you ask about the same topic, Claude can reference past research.

---

## Council (Multi-Agent Debate)

For decisions that benefit from multiple perspectives.

### Full Debate
"council: should I pivot my newsletter from weekly to biweekly?"

4 agents debate across 3 rounds:
- **Strategist**: long-term thinking, competitive dynamics
- **Pragmatist**: implementation reality, resource constraints
- **Challenger**: devil's advocate, what could go wrong
- **Domain Expert**: deep knowledge of the specific topic (adapts per question)

You get: full transcript + convergence points + remaining disagreements + recommended path.

### Quick Council
"quick council: is biweekly better?"

1 round, 3-4 agents state positions. No back-and-forth. Fast.

### When to Use Council
- Business decisions with trade-offs
- Strategy questions where you want friction before deciding
- Anything where you'd normally want to "sleep on it" — council gives you the multiple perspectives immediately

### Custom Council Members
"council with security: should we use this API?"
→ Adds a security-focused agent to the default four.

---

## Feedback & Learning

The system learns from your reactions. Two mechanisms:

### Explicit Ratings
After any response, type a rating:
```
8 - solid newsletter draft
3 - completely missed the point
10
6 - ok but too verbose
```

Format: number (1-10), optionally followed by a comment. The feedback hook captures it automatically.

### Implicit Sentiment
You don't need to rate everything. The system detects:
- "no, that's wrong" → negative signal captured
- "perfect, exactly right" → positive signal captured
- "try again" → frustration detected
- Corrections → inferred preference

### What Happens With Feedback

1. Ratings accumulate in `AI/memory/signals/ratings.jsonl`
2. Low ratings trigger entries in `AI/memory/learnings/mistakes.md`
3. Weekly synthesis analyses patterns: which skills rate well/poorly, what mistakes repeat
4. If a mistake occurs 3+ times: automatic proposal to add a rule preventing it
5. You review proposals with "show proposals" and approve/reject

### The Weekly Cycle

Every Sunday:
- **9:00 AM**: Learning synthesis runs — analyses the week's ratings, mistakes, preferences
- **10:00 AM**: Weekly review runs — includes AI System Health section with rating trends and pending proposals

The daily brief (8:00 AM) reminds you if there are pending proposals.

---

## Proposals & Self-Improvement

The system proposes its own improvements. You approve or reject.

### How Proposals Are Generated
- Weekly synthesis detects patterns (recurring mistakes, low-performing skills, high-confidence preferences)
- Each pattern generates a proposal: what to change, why, and evidence supporting it

### Reviewing Proposals
Say "show proposals". Claude presents each pending proposal with:
- The skill or policy affected
- What would change
- Evidence (which ratings, mistakes, or patterns support it)
- Confidence level

For each: approve, reject, or skip.
- **Approve**: change is applied to the skill/policy file, committed to git
- **Reject**: logged with your reason, won't be proposed again
- **Skip**: stays pending for next review

### What Gets Proposed
- Skill file improvements (better instructions, missing rules)
- New policy rules (from repeated mistakes)
- Preference promotions (observed preference → explicit policy rule)
- Never: changes to CLAUDE.md, hooks, or settings.json

---

## Telos (Life OS)

Manages your goals, beliefs, lessons, and predictions.

### Goal Progress
"how am I doing on my goals?"
→ Reads Tracking/Objectives/ and Key Results/, cross-references with active projects, reports what's on track, at risk, or stalled.

### Adding Personal Knowledge
- "add belief: most productivity advice assumes neurotypical brains" → recorded with date and confidence
- "add lesson: rushing architecture decisions always costs more later" → recorded with context
- "I predict AI agents will replace 50% of SaaS by 2027" → tracked with timeframe, reviewed quarterly

### Quarterly Review
"quarterly review"
→ Comprehensive report: goal progress, learning trends, prediction accuracy check, belief updates, recommended focus for next quarter.

The quarterly review uses the challenger protocol: it will push back on goals you're not pursuing and call out mismatches between stated priorities and actual time allocation.

---

## Creating New Skills

"create a skill for [domain]"

Interactive process:
1. Claude asks what the skill covers, triggers, relevant vault files, tone
2. Checks for overlap with existing skills
3. Creates the skill file with proper frontmatter
4. Creates a context map if needed
5. Validates the result
6. Commits to git

The system also proposes new skills automatically: if the weekly synthesis detects you keep asking about a topic that no skill covers, it generates a proposal.

---

## Observability (Phase 6)

Every tool call, security decision, rating, and session is logged to `AI/memory/events/YYYY-MM-DD.jsonl`.

### Session Activity Reports
After each session, `AI/memory/work/{session}/activity-report.md` shows:
- Total tool calls by type
- Security events
- Ratings captured
- Algorithm usage (if ISC was created)
- Session duration

### Optional Dashboard
If you started the observability server (`bash AI/observability/start.sh`), open `AI/observability/dashboard.html` for a real-time view of what Claude is doing. Useful for monitoring complex Algorithm executions with parallel agents.

---

## Memory & Cross-Session Continuity

### What Persists Between Sessions
- **WIP state**: `AI/memory/work/current.md` — what you were working on, where you left off
- **Preferences**: `AI/memory/learnings/preferences.md` — accumulated style preferences with confidence scores
- **Mistakes**: `AI/memory/learnings/mistakes.md` — errors to avoid, with occurrence counts
- **Ratings**: `AI/memory/signals/ratings.jsonl` — all explicit and implicit feedback
- **Research**: `AI/memory/research/` — past research outputs
- **Context log**: `AI/memory/context-log.md` — current situation, priorities, pipeline

### What's Injected at Session Start
On your first prompt each session, the context hook injects:
- Current WIP state (what you were working on last)
- Recent preferences
- Recent context log entries

This means Claude starts each session already knowing what you were doing.

---

## Security

The security validator checks every Bash command, file edit, file write, and file read against patterns:

- **Blocked** (hard stop): `rm -rf /`, `git push --force origin main`, accessing `~/.ssh` or credentials
- **Confirm** (asks you): `rm -rf`, `git push --force`, editing CLAUDE.md or settings.json
- **Alert** (logs but allows): `curl | sh`, `sudo`, `eval`

All decisions are logged to `AI/memory/security/`. The weekly synthesis reviews security events.

This matters most for the launchd scripts and afk-code sessions that run with `--permission-mode bypassPermissions`.

---

## File Locations Reference

| What | Where |
|---|---|
| Main instruction file | `CLAUDE.md` (~1,700 tokens) |
| Skills | `AI/skills/*.md` (28+ files) |
| Policies | `AI/policies/*.md` (10+ files) |
| Context maps | `AI/context/*.md` (9+ files) |
| WIP state | `AI/memory/work/current.md` |
| Session work dirs | `AI/memory/work/YYYY-MM-DD_slug/` |
| Preferences | `AI/memory/learnings/preferences.md` |
| Mistakes | `AI/memory/learnings/mistakes.md` |
| Ratings | `AI/memory/signals/ratings.jsonl` |
| Weekly synthesis | `AI/memory/learnings/synthesis/YYYY-WW.md` |
| Proposals | `AI/memory/proposals/pending/` |
| Research outputs | `AI/memory/research/` |
| Event logs | `AI/memory/events/YYYY-MM-DD.jsonl` |
| Telos personal | `AI/telos/` (beliefs, lessons, wisdom, predictions) |
| Security audit trail | `AI/memory/security/` |
| Hooks | `AI/hooks/*.ts` (8 hooks) |
| Scripts | `AI/scripts/*.sh` (6 scripts) |

---

## Tips

1. **Rate things.** Even a bare "7" after a response feeds the learning system. Low ratings trigger mistake tracking. High ratings confirm what's working.

2. **Say "show proposals" on Mondays.** The synthesis runs Sunday morning. Fresh proposals are waiting.

3. **Use "council:" for decisions you'd otherwise ruminate on.** The intellectual friction is the point — it gives you pre-digested perspectives to synthesise.

4. **Override effort when it matters.** Claude defaults most work to STANDARD. If something is important, say "algorithm effort THOROUGH" to get the full treatment.

5. **Don't fight the ISC.** If you see the ISC table and want to skip it, say "just do it". But for important tasks, spending 10 seconds reviewing the ISC catches misunderstandings before Claude does 5 minutes of wrong work.

6. **Add beliefs and lessons when they strike you.** "Add lesson: [thing I just realised]" takes 2 seconds and builds your personal knowledge base over time. The quarterly review surfaces these.

7. **Let the system propose skills.** If you keep asking about something with no matching skill, the weekly synthesis will notice. Approve the proposal and you get a dedicated skill with proper context loading.

8. **Check activity reports after complex sessions.** `AI/memory/work/{session}/activity-report.md` shows what Claude actually did — useful when you're not sure if it was thorough enough.
