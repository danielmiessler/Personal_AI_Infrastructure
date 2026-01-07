# UseNamedAgent Workflow

**Spawns named agents (The Engineer, The Architect, The Intern) with persistent identities and backstories.**

---

## Pre-flight Checklist (MANDATORY)

**STOP! Before proceeding, you MUST complete this checklist:**

- [ ] I understand I must run `AgentFactory.ts` via Bash
- [ ] I will use `--named` or `--role` parameters (NOT `--traits`)
- [ ] I will capture JSON output and use the `prompt` field verbatim
- [ ] I will use `subagent_type: "general-purpose"`
- [ ] I will use the `model` field from the JSON output

**⚠️ VIOLATION: If you skip AgentFactory, you are NOT properly invoking a named agent.**

---

## When to Use

User says:
- "Use The Engineer to..."
- "Get The Architect to review..."
- "Have The Intern do..."
- "Spawn The Engineer"
- "I need an implementer" (role mapping)
- "Get a spec reviewer" (role mapping)

**KEY TRIGGER: References to named agents (Engineer, Architect, Intern) or mapped roles.**

---

## Named Agents Reference

| Agent | Key | Model | Personality | Use For |
|-------|-----|-------|-------------|---------|
| **The Engineer** | `engineer` | sonnet | Pragmatic, detail-oriented, code-focused | Implementation, code quality review, debugging |
| **The Architect** | `architect` | opus | Strategic, design-focused, big-picture thinker | Design review, spec compliance, architecture decisions |
| **The Intern** | `intern` | haiku | Eager, fast, good for simple tasks | Grunt work, simple tasks, quick checks |

### Role Mappings

Use `--role` to auto-select the appropriate named agent:

| Role Keywords | Maps To | Model |
|---------------|---------|-------|
| `implementer`, `developer`, `coder` | The Engineer | sonnet |
| `spec_reviewer`, `architecture`, `design` | The Architect | opus |
| `code_quality_reviewer`, `quality`, `reviewer` | The Engineer | sonnet |
| `grunt_work`, `simple_task`, `quick_task` | The Intern | haiku |

---

## The Workflow

### Step 1: Identify Which Named Agent

From the user's request, determine:
- Which named agent? (Engineer, Architect, Intern)
- Or which role? (implementer, spec_reviewer, etc.)
- What's the task?

### Step 2: Run AgentFactory (MANDATORY)

**⚠️ THIS STEP IS NOT OPTIONAL - YOU MUST EXECUTE AGENTFACTORY.TS VIA BASH**

**Option A: Using `--named` (when agent is specified)**

```bash
# For The Engineer
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --named engineer \
  --task "Implement ISS-001: Delete hallucinated documentation" \
  --output json

# For The Architect
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --named architect \
  --task "Review API design for compliance with REST standards" \
  --output json

# For The Intern
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --named intern \
  --task "Update copyright headers in all files" \
  --output json
```

**Option B: Using `--role` (when role is specified)**

```bash
# Maps to The Engineer
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --role implementer \
  --task "Build the user authentication module" \
  --output json

# Maps to The Architect
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --role spec_reviewer \
  --task "Check compliance with the API specification" \
  --output json
```

**What AgentFactory returns (JSON output):**
```json
{
  "name": "The Engineer",
  "model": "sonnet",
  "voice": "Professional",
  "voice_id": "JBFqnCBsd6RMkjVDRZzb",
  "prompt": "... full agent prompt with backstory and personality ..."
}
```

**You MUST use the `prompt` and `model` fields from this output.**

### Step 3: Launch Agent via Task

**CRITICAL: Use `subagent_type: "general-purpose"` - ALWAYS!**

```typescript
Task({
  description: "The Engineer: Implement ISS-001",
  prompt: <prompt from JSON output>,
  subagent_type: "general-purpose",
  model: <model from JSON output>  // "sonnet", "opus", or "haiku"
})
```

---

## Examples

### Example 1: User Requests The Engineer

**User:** "Use The Engineer to implement the new caching layer"

```bash
# Step 1: Run AgentFactory
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --named engineer \
  --task "Implement the new caching layer for API responses" \
  --output json
```

```typescript
// Step 2: Launch with Task
Task({
  description: "The Engineer: Implement caching layer",
  prompt: <prompt from output>,
  subagent_type: "general-purpose",
  model: "sonnet"
})
```

### Example 2: User Requests a Role

**User:** "Get a spec reviewer to check compliance"

```bash
# Step 1: Run AgentFactory (role maps to The Architect)
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --role spec_reviewer \
  --task "Review the API implementation for compliance with OpenAPI spec" \
  --output json
```

```typescript
// Step 2: Launch with Task
Task({
  description: "The Architect: Review spec compliance",
  prompt: <prompt from output>,
  subagent_type: "general-purpose",
  model: "opus"
})
```

### Example 3: Quick Task with The Intern

**User:** "Have The Intern update all the version numbers"

```bash
# Step 1: Run AgentFactory
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --named intern \
  --task "Update version numbers from 1.2.0 to 1.3.0 in all package files" \
  --output json
```

```typescript
// Step 2: Launch with Task
Task({
  description: "The Intern: Update version numbers",
  prompt: <prompt from output>,
  subagent_type: "general-purpose",
  model: "haiku"
})
```

---

## Discovery Commands

```bash
# List all named agents and their roles
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts --list-named
```

---

## Common Mistakes

**WRONG: Skipping AgentFactory**
```typescript
// WRONG - manually writing the prompt
Task({
  description: "The Engineer: Do something",
  prompt: "You are The Engineer...",  // NO! Use AgentFactory!
  subagent_type: "general-purpose"
})
```

**WRONG: Using wrong subagent_type**
```typescript
// WRONG - don't use specific types for named agents
Task({ prompt: <...>, subagent_type: "Intern" })
Task({ prompt: <...>, subagent_type: "Engineer" })
```

**RIGHT: Always use general-purpose**
```typescript
Task({
  prompt: <prompt from AgentFactory>,
  subagent_type: "general-purpose",
  model: <model from AgentFactory>
})
```

**WRONG: Ignoring the model field**
```typescript
// WRONG - hardcoding model instead of using output
Task({ prompt: <...>, model: "sonnet" })  // Should use model from JSON!
```

---

## When to Use Named vs Custom Agents

| Scenario | Use Named Agent | Use Custom Agent |
|----------|-----------------|------------------|
| Implementation task | ✅ The Engineer | |
| Design/architecture review | ✅ The Architect | |
| Simple grunt work | ✅ The Intern | |
| Need specific expertise combo | | ✅ Custom with `--traits` |
| Need unique personality | | ✅ Custom with `--traits` |
| Need multiple diverse agents | | ✅ Custom with varied traits |

For custom agents, see `CreateCustomAgent.md` workflow.
