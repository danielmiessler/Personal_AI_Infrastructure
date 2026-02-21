# The Voice Notification System

**Voice announcements via the local voice server (localhost:8888).**

> **Configuration:** `settings.json → voice.enabled`
> When `voice.enabled: false`, this entire system is inactive. The VoiceGate hook
> suppresses all curls to localhost:8888, and this documentation is excluded from
> the built SKILL.md so Claude never sees voice curl instructions.

---

## Task Start Announcements

**When STARTING a task, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "[Doing what {PRINCIPAL.NAME} asked]"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   [Doing what {PRINCIPAL.NAME} asked]...
   ```

**Skip curl for conversational responses** (greetings, acknowledgments, simple Q&A).

---

## Context-Aware Announcements

**Match your announcement to what {PRINCIPAL.NAME} asked.** Start with the appropriate gerund:

| {PRINCIPAL.NAME}'s Request | Announcement Style |
|------------------|-------------------|
| Question ("Where is...", "What does...") | "Checking...", "Looking up...", "Finding..." |
| Command ("Fix this", "Create that") | "Fixing...", "Creating...", "Updating..." |
| Investigation ("Why isn't...", "Debug this") | "Investigating...", "Debugging...", "Analyzing..." |
| Research ("Find out about...", "Look into...") | "Researching...", "Exploring...", "Looking into..." |

**Examples:**
- "Where's the config file?" → "Checking the project for config files..."
- "Fix this bug" → "Fixing the null pointer in auth handler..."
- "Why isn't the API responding?" → "Investigating the API connection..."
- "Create a new component" → "Creating the new component..."

---

## Workflow Invocation Notifications

**For skills with `Workflows/` directories, use "Executing..." format:**

```
Executing the **WorkflowName** workflow within the **SkillName** skill...
```

**Examples:**
- "Executing the **GIT** workflow within the **CORE** skill..."
- "Executing the **Publish** workflow within the **Blogging** skill..."

**NEVER announce fake workflows:**
- "Executing the file organization workflow..." - NO SUCH WORKFLOW EXISTS
- If it's not listed in a skill's Workflow Routing, DON'T use "Executing" format
- For non-workflow tasks, use context-appropriate gerund

### The curl Pattern (Workflow-Based Skills Only)

When executing an actual workflow file from a `Workflows/` directory:

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the WORKFLOWNAME workflow in the SKILLNAME skill to ACTION", "voice_id": "{DAIDENTITY.VOICEID}", "title": "{DAIDENTITY.NAME}"}' \
  > /dev/null 2>&1 &
```

**Parameters:**
- `message` - The spoken text (workflow and skill name)
- `voice_id` - ElevenLabs voice ID (default: {DAIDENTITY.NAME}'s voice)
- `title` - Display name for the notification

---

## Effort Level in Voice Notifications

**Automatic:** THE ALGORITHM tasks automatically include effort level in voice:

| Event | Hook | Voice Format |
|-------|------|--------------|
| Task Start | `TaskNotifier.ts` | "Running THE ALGORITHM at **thorough** effort **with multi-agent analysis** to [summary]" |
| Phase Transition | `AlgorithmPhaseNotifier.ts` | "Entering observe phase - gathering context at **thorough** effort" |
| Task Completion | `PAICompletion.ts` | "[COMPLETED line content]" |

**Effort levels (Algorithm v1.1.0):**

| Effort | Budget | Spoken |
|--------|--------|--------|
| Instant | <10s | (none — no voice curls) |
| Fast | <1min | (none — no voice curls) |
| Standard | <2min | OBSERVE + VERIFY curls only |
| Extended | <8min | All phase curls |
| Advanced | <16min | All phase curls |
| Deep | <32min | All phase curls |
| Comprehensive | <120min | All phase curls |
| Loop | Unbounded | All phase curls (first iteration) |

**Voice curls are the phase announcements in the Algorithm template** — each phase has a `curl -s -X POST http://localhost:8888/notify` call that gets spoken.

---

## Voice IDs

| Agent | Voice ID | Notes |
|-------|----------|-------|
| **{DAIDENTITY.NAME}** (default) | `{DAIDENTITY.VOICEID}` | Use for most workflows |
| **Priya** (Artist) | `ZF6FPAbjXT4488VcRRnw` | Art skill workflows |

**Full voice registry:** `~/.claude/skills/Agents/SKILL.md` (see Named Agents and voice configuration)

---

## Copy-Paste Templates

### Template A: Skills WITH Workflows

For skills that have a `Workflows/` directory:

```markdown
## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the SKILLNAME skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **SkillName** skill to ACTION...
   ```
```

Replace `WORKFLOWNAME`, `SKILLNAME`, and `ACTION` with actual values when executing.

### Template B: Skills WITHOUT Workflows

For skills that handle requests directly (no `Workflows/` directory), **do NOT include a Voice Notification section**. These skills just describe what they're doing naturally in their responses.

---

## When to Skip Notifications

**Always skip voice notifications when:**
- **Conversational responses** - Greetings, acknowledgments, simple Q&A
- **Skill has no workflows** - The skill has no `Workflows/` directory
- **Direct skill handling** - SKILL.md handles request without invoking a workflow file
- **Quick utility operations** - Simple file reads, status checks
- **Sub-workflows** - When a workflow calls another workflow (avoid double notification)

**The rule:** Only notify when actually loading and following a `.md` file from a `Workflows/` directory, or when starting significant task work.
