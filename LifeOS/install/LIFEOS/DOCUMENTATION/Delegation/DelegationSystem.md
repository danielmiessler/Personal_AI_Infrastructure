---
name: DelegationReference
description: Comprehensive delegation and agent parallelization patterns. Reference material extracted from SKILL.md for on-demand loading.
created: 2025-12-17
extracted_from: SKILL.md lines 535-627
version: 1.4.11
---

# Delegation & Parallelization Reference

> Delegation exists so the LifeOS hill-climb (`LifeOs/LifeOsThesis.md`) doesn't serialize: independent gap-closing work runs in parallel, matched to the cheapest model that can do it.

**Quick reference in SKILL.md** → For full details, see this file

---

## 🤝 Delegation & Parallelization (Always Active)

**WHENEVER A TASK CAN BE PARALLELIZED, USE MULTIPLE AGENTS!**

### Model Selection for Agents (CRITICAL FOR SPEED)

**The Agent tool has a `model` parameter - USE IT.**

**Resuming agents:** To continue a previously spawned agent, use `SendMessage({to: agentId})`. This auto-resumes stopped background agents. Do NOT use `Agent(resume=...)` — the `resume` parameter no longer exists.

Agents that omit `model` inherit the session model (harness behavior — the AgentInvocation model injector was removed v1.3.0, 2026-07-11 baseline; the hook now only logs each dispatch's resolved model to subagent-events.jsonl). Model choice is per-dispatch judgment: pass `model` explicitly when a different rung fits the work — Sonnet/Haiku for utility or mechanical fan-outs, the strongest available for intelligence-hungry dispatches (note `model: fable` on Agent executed Opus at last probe, 2026-07-07 — genuine Fable off the main loop is the `Inference.ts --level max` subprocess). Each inference with 30K+ context takes 5-15 seconds on a frontier model; a simple 10-tool-call task = 1-2+ minutes of pure thinking time.

**Model Selection Matrix:**

| Task Type | Model | Why |
|-----------|-------|-----|
| Deep reasoning, complex architecture, strategic decisions | `opus` | Maximum intelligence needed |
| Standard implementation, moderate complexity, most coding | `sonnet` | Good balance of speed + capability |
| Simple lookups, file reads, quick checks, parallel grunt work | `haiku` | 10-20x faster, sufficient intelligence |

**Examples:**

```typescript
// WRONG - defaults to Opus, takes minutes
Agent({ prompt: "Check if blue bar exists on website", subagent_type: "general-purpose" })

// RIGHT - Haiku for simple visual check
Agent({ prompt: "Check if blue bar exists on website", subagent_type: "general-purpose", model: "haiku" })

// RIGHT - Sonnet for standard coding task
Agent({ prompt: "Senior engineer, TDD. Implement the login form validation", subagent_type: "general-purpose", model: "sonnet" })

// RIGHT - Opus for complex architectural planning
Agent({ prompt: "System design / distributed systems. Design the distributed caching strategy", subagent_type: "general-purpose", model: "opus" })
```

**Rule of Thumb:**
- If it's grunt work or verification → `haiku`
- If it's implementation or research → `sonnet`
- If it requires deep strategic thinking → `opus` (or let it default)

**Parallel tasks especially benefit from haiku** - launching 5 haiku agents is faster AND cheaper than 1 Opus agent doing sequential work.

### Agent Types

**Default for parallel work: Custom agents via Agents skill (ComposeAgent).**

Use the Agents skill to compose task-specific agents with unique traits, voices, and expertise:
- Use a SINGLE message with MULTIPLE Agent tool calls
- Each agent gets FULL CONTEXT and DETAILED INSTRUCTIONS via ComposeAgent prompt
- Launch as many as needed (no artificial limit)
- **ALWAYS launch a spotcheck agent after parallel work completes**

**Agent routing by task type:**
- **Research tasks** → Use the Research skill (has dedicated researcher agents)
- **Code implementation** → Use `general-purpose` with a senior-engineer/TDD brief in the prompt
- **Architecture/design** → Use `general-purpose` with a system-design / distributed-systems brief in the prompt
- **Everything else** → Use Agents skill → ComposeAgent → `subagent_type: "general-purpose"`

### 🚨 AGENT ROUTING (Always Active)

**Three Agent Systems — preference order:**

| Priority | User Says | System | Tool | What Happens |
|----------|-----------|--------|------|-------------|
| **1. DEFAULT** | "parallel work", "agents", "team", "swarm", or Algorithm selects delegation | **Agent Teams** | `TeamCreate` → `Agent` with `team_name` → `TaskCreate` → `SendMessage` | Persistent teammates, shared task list, peer messaging, task dependencies |
| **2. EXPLICIT** | "**custom agents**", "spin up **custom** agents" | **Custom Agents** (ComposeAgent) | `Skill("Agents")` → `Agent(subagent_type="general-purpose", prompt=<composed>)` | Unique personalities, voices, one-shot parallel work |
| **3. UNATTENDED** | "run overnight", "long-running", "CI trigger", or task exceeds session lifetime | **Managed Agents** (Anthropic cloud API) | `Skill("claude-api")` to build workflows | Durable sessions, sandboxed containers, vault credentials, $0.08/session-hour |

**These are three distinct systems:**
- **Agent Teams** = persistent local teammates with shared task lists, messaging, and multi-turn coordination via `TeamCreate`. DEFAULT for all parallel work.
- **Custom Agents** = one-shot parallel workers with unique identities via ComposeAgent. ONLY when {{PRINCIPAL_NAME}} explicitly says "custom agents".
- **Managed Agents** = cloud-hosted agents with durable sessions that survive disconnects. For unattended/overnight work only.

**Additional routing by task type:**

| User Says | What to Use | Why |
|-------------|-------------|-----|
| "research X", "investigate Y" | **Research skill** | Dedicated researcher agents |
| Code implementation tasks | **`general-purpose`** + senior-engineer/TDD brief | Job-specific brief replaces the retired Engineer type |
| Architecture/design tasks | **`general-purpose`** + system-design brief | Job-specific brief replaces the retired Architect type |

**For Agent Teams (default):**
1. `TeamCreate` with descriptive team name
2. `TaskCreate` for each work item (with dependencies if needed)
3. Spawn teammates via `Agent` with `team_name` and `name` parameters
4. Teammates self-claim tasks, message each other, go idle between rounds

**For Custom Agents (only when explicitly requested):**
1. Invoke Agents skill → ComposeAgent for EACH agent with different trait combinations
2. Launch with composed prompt as `subagent_type: "general-purpose"`
3. Each agent gets a personality-matched ElevenLabs voice

**For research specifically:** Use the Research skill, which has dedicated researcher agents (ClaudeResearcher, GeminiResearcher, etc.)

**Reference:** agent routing (`LIFEOS/DOCUMENTATION/Agents/AgentSystem.md`) | Managed Agents: https://www.anthropic.com/engineering/managed-agents

**Full Context Requirements:**
When delegating, ALWAYS include:
1. WHY this task matters (business context)
2. WHAT the current state is (existing implementation)
3. EXACTLY what to do (precise actions, file paths, patterns)
4. SUCCESS CRITERIA (what output should look like)
5. TIMING SCOPE (fast|standard|deep) — controls agent output verbosity

### Timing Scope in Agent Prompts

Every agent prompt MUST include a `## Scope` section that matches the validated timing tier from the Algorithm's THINK phase. This prevents agents from over-producing on simple tasks or under-delivering on complex ones.

**Timing + Model Selection:**

| Timing | Model | Agent Output | Example |
|--------|-------|-------------|---------|
| **fast** | `haiku` | <500 words, direct answer | "Check if server is running" |
| **standard** | `sonnet` | <1500 words, focused work | "Implement login validation" |
| **deep** | `opus` | No limit, thorough analysis | "Comprehensive security audit" |

**Examples:**

```typescript
// FAST — simple check, haiku model, minimal output
Agent({
  prompt: `Check if the auth middleware exports are correct.
## Scope
Timing: FAST — direct answer only.
- Under 500 words
- Answer the question, report the result, done`,
  subagent_type: "Explore",
  model: "haiku"
})

// STANDARD — typical implementation work
Agent({
  prompt: `Senior engineer, TDD. Implement input validation for the login form.
## Scope
Timing: STANDARD — focused implementation.
- Under 1500 words
- Stay on task, deliver the work, verify it works`,
  subagent_type: "general-purpose",
  model: "sonnet"
})

// DEEP — comprehensive analysis
Agent({
  prompt: `Offensive-security operator mindset: map the attack surface, find the seam, prove it, document it. Authorized testing only.
Perform a thorough security review of all auth flows.
## Scope
Timing: DEEP — comprehensive analysis.
- No word limit
- Explore alternatives, consider edge cases
- Thorough verification and documentation`,
  subagent_type: "general-purpose",
  model: "opus"
})
```

---

## Async Primitives — When to Use What

Three primitives for non-blocking work. Pick the right one:

| Primitive | Tool | Token Cost | Notification | Use When |
|-----------|------|-----------|--------------|----------|
| **One-shot wait** | `Bash(run_in_background)` | Zero until done | On exit (success/fail) | Build, deploy, test suite, any command you just need to finish |
| **Event stream** | `Monitor` | Zero between events | Per stdout line | Log tailing, CI status polling, file watching, deploy streaming |
| **AI work** | `Agent(run_in_background)` | Full agent cost | On completion | Research, implementation, analysis — work requiring reasoning |

**Decision flow:**
1. Does it need AI reasoning? → `Agent(run_in_background)`
2. Do you need events as they happen? → `Monitor`
3. Just need to know when it's done? → `Bash(run_in_background)`

**Monitor vs Pulse:** Monitor is an in-session watcher — lives and dies with the conversation. Pulse is the out-of-process daemon that runs 24/7. Use Monitor for session-scoped watching (deploy logs, CI). Use Pulse for persistent monitoring (Telegram, iMessage, cron checks).

**Monitor guidelines:**
- Always use `grep --line-buffered` in pipes — without it, pipe buffering delays events by minutes
- Poll intervals: 30s+ for remote APIs (rate limits), 0.5-1s for local checks
- Handle transient failures in poll loops (`curl ... || true`)
- Only stdout triggers notifications — stderr goes to output file (readable via Read)
- Set `persistent: true` for session-length watches (PR monitoring, log tails)
- Use `TaskStop` to cancel a monitor early
- Selective filters only — never pipe raw logs. Monitors producing too many events get auto-stopped.

### Recipe: Agent Watchdog (auto-triggered by hook)

The Pulse agent-guard hook automatically injects a watchdog reminder when background agents are spawned. The watchdog monitors tool-activity.jsonl for silence while agents are active:

```bash
Monitor({
  description: "Agent watchdog",
  persistent: true,
  timeout_ms: 3600000,
  command: "bun $HOME/.claude/LIFEOS/TOOLS/AgentWatchdog.ts"
})
```

Alerts when no tool calls detected for 90 seconds with active agents. Rate-limited to one alert per 60 seconds. Runs for the session lifetime — covers all background agents.

### Recipe: Deploy Monitoring

Watch a Cloudflare Pages or Workers deploy for completion or errors:

```bash
# Monitor wrangler deploy output (run deploy with Bash(run_in_background), then tail its output)
Monitor({
  description: "Cloudflare deploy status",
  persistent: false,
  timeout_ms: 300000,
  command: "tail -f /tmp/deploy.log | grep --line-buffered -E '(Published|Error|Failed|SUCCESS)'"
})
```

### Recipe: Pulse Log Tailing

Watch Pulse daemon logs for errors during a debugging session:

```bash
Monitor({
  description: "Pulse error watcher",
  persistent: true,
  timeout_ms: 300000,
  command: "tail -f ~/.claude/Pulse/logs/pulse-stdout.log | grep --line-buffered -i -E '(error|fatal|crash|unhandled)'"
})
```

### Recipe: Build/Test Watching

Monitor a long test suite and get notified on failures:

```bash
Monitor({
  description: "Test failure watcher",
  persistent: false,
  timeout_ms: 600000,
  command: "tail -f /tmp/test-output.log | grep --line-buffered -E '(FAIL|ERROR|✗|AssertionError)'"
})
```

### Recipe: PR/CI Status Monitoring

Poll GitHub for CI status changes on a PR:

```bash
Monitor({
  description: "CI status for PR #42",
  persistent: true,
  timeout_ms: 3600000,
  command: "last_status=''; while true; do status=$(gh pr checks 42 --json state --jq '.[].state' 2>/dev/null | sort -u | tr '\\n' ','); if [ \"$status\" != \"$last_status\" ]; then echo \"CI: $status\"; last_status=\"$status\"; fi; sleep 30; done"
})
```

### Recipe: Security Scan Watching

Tail security scan results for critical findings:

```bash
Monitor({
  description: "Security scan critical findings",
  persistent: false,
  timeout_ms: 600000,
  command: "tail -f /tmp/security-scan.log | grep --line-buffered -i 'CRITICAL'"
})
```

---

## Knowledge Archive Access

Delegated agents can query the **Knowledge Archive** (`~/.claude/LIFEOS/MEMORY/KNOWLEDGE/`) for accumulated knowledge organized by 4 entity types: People (human beings), Companies (organizations), Ideas (insights/theses/analyses), Research (longer-form research notes). Topic is a tag, not a domain. Managed by Algorithm LEARN phase (direct writes), `LIFEOS/TOOLS/KnowledgeHarvester.ts` (validation/maintenance), and the `/knowledge` skill. Include archive query instructions in agent prompts when the task benefits from prior research or domain context.

---

**See Also:**
- `~/.claude/LIFEOS/DOCUMENTATION/LifeosSystemArchitecture.md` — Master architecture reference (system-of-systems)
- SKILL.md > Delegation (Quick Reference) - Condensed trigger table
- Workflows/Delegation.md - Operational delegation procedures
- Workflows/BackgroundDelegation.md - Background agent patterns
- LIFEOS/DOCUMENTATION/Agents/AgentSystem.md - Agent routing and composition
