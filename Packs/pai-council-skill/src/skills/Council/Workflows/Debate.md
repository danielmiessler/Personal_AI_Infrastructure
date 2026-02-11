# Debate Workflow

Full structured multi-agent debate with 2-3 adaptive rounds, file-first output, and visible transcript.

## Prerequisites

- Topic or question to debate
- Optional: Custom council members (default: architect, designer, engineer, researcher)
- Optional: Output mode (`deliberative` or `patchlist`)

## Configuration

Load settings from `Config.md`. Key defaults:
- **Rounds:** 2-3 (adaptive based on convergence)
- **File output:** Enabled (writes to `~/.claude/MEMORY/`)
- **Model tiering:** Round 1 sonnet, Round 2 haiku, Round 3/Synthesis sonnet

## Execution

### Step 0: Initialize Session

Generate a session ID and create session directory:

```bash
SESSION_ID=$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 4)
mkdir -p ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID
```

Write `metadata.json`:
```json
{
  "session_id": "{SESSION_ID}",
  "topic": "{topic}",
  "started_at": "{ISO timestamp}",
  "members": ["Architect", "Designer", "Engineer", "Researcher"],
  "output_mode": "deliberative",
  "rounds_planned": "adaptive"
}
```

### Step 1: Announce the Council

Output the debate header:

```markdown
## Council Debate: [Topic]

**Session ID:** {SESSION_ID}
**Council Members:** [List agents participating]
**Rounds:** 2-3 (adaptive based on convergence)
**Output:** ~/.claude/MEMORY/STATE/council-sessions/{SESSION_ID}/
```

### Step 2: Round 1 - Initial Positions

Launch 4 parallel Task calls (one per council member). Use `model: "sonnet"`.

**Each agent prompt includes:**
```
You are [Agent Name], [brief role description from AgentPersonalities.md].

COUNCIL DEBATE - ROUND 1: INITIAL POSITIONS

Topic: [The topic being debated]

Give your initial position on this topic from your specialized perspective.
- Speak in first person as your character
- Be specific and substantive (50-150 words)
- State your key concern, recommendation, or insight
- You'll respond to other council members in Round 2

Your perspective focuses on: [agent's domain]
```

**Agent domains:**
- **architect**: System design, patterns, scalability, long-term architectural implications
- **designer**: User experience, accessibility, user needs, interface implications
- **engineer**: Implementation reality, tech debt, maintenance burden, practical constraints
- **researcher** (ClaudeResearcher): Data, precedent, external examples, what others have done

**Write Round 1 to file:**
```bash
# Write combined Round 1 output to session directory
echo "[Round 1 content]" > ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-1.md
```

**Output each response as it completes:**
```markdown
### Round 1: Initial Positions

**🏛️ Architect (Serena):**
[Response]

**🎨 Designer (Aditi):**
[Response]

**⚙️ Engineer (Marcus):**
[Response]

**🔍 Researcher (Ava):**
[Response]
```

### Step 3: Round 2 - Responses & Challenges

Launch 4 parallel Task calls with Round 1 transcript included. Use `model: "haiku"`.

**Each agent prompt includes:**
```
You are [Agent Name], [brief role description].

COUNCIL DEBATE - ROUND 2: RESPONSES & CHALLENGES

Topic: [The topic being debated]

Here's what the council said in Round 1:
[Full Round 1 transcript]

Now respond to the other council members:
- Reference specific points they made ("I disagree with [Name]'s point about X...")
- Challenge assumptions or add nuance
- Build on points you agree with
- Maintain your specialized perspective
- 50-150 words

The value is in genuine intellectual friction—engage with their actual arguments.
```

**Write Round 2 to file:**
```bash
echo "[Round 2 content]" > ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-2.md
```

**Output:**
```markdown
### Round 2: Responses & Challenges

**🏛️ Architect (Serena):**
[Response referencing others' points]

**🎨 Designer (Aditi):**
[Response referencing others' points]

**⚙️ Engineer (Marcus):**
[Response referencing others' points]

**🔍 Researcher (Ava):**
[Response referencing others' points]
```

### Step 3.5: Convergence Check (Adaptive Round 3)

After Round 2, evaluate whether Round 3 is needed.

**Run Round 3 if ANY of these are true:**
- Agents express explicit disagreement ("I disagree with...", "I challenge...")
- BLOCKING issues identified (security, compliance, irreversible decisions)
- Topic requires normative decision (not just exploratory)
- User explicitly requested 3 rounds

**Skip Round 3 if ALL of these are true:**
- High convergence (majority of agents agree on core recommendation)
- No BLOCKING items identified
- No unresolved contradictions
- Topic is exploratory

Write convergence assessment:
```bash
# Example: high convergence, skipping Round 3
echo '{"converged": true, "reason": "4/4 agents agree on core recommendation", "proceed_to_round3": false}' > ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/convergence.json
```

If skipping Round 3:
```markdown
**Round 3 skipped:** High convergence detected. Proceeding to synthesis.
```

### Step 4: Round 3 - Synthesis (Conditional)

If Round 3 is needed, launch 4 parallel Task calls with Round 1 + Round 2 transcripts. Use `model: "sonnet"`.

**Each agent prompt includes:**
```
You are [Agent Name], [brief role description].

COUNCIL DEBATE - ROUND 3: SYNTHESIS

Topic: [The topic being debated]

Full debate transcript so far:
[Round 1 + Round 2 transcripts]

Final synthesis from your perspective:
- Where does the council agree?
- Where do you still disagree with others?
- What's your final recommendation given the full discussion?
- 50-150 words

Be honest about remaining disagreements—forced consensus is worse than acknowledged tension.
```

**Write Round 3 to file:**
```bash
echo "[Round 3 content]" > ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-3.md
```

**Output:**
```markdown
### Round 3: Synthesis

**🏛️ Architect (Serena):**
[Final synthesis]

**🎨 Designer (Aditi):**
[Final synthesis]

**⚙️ Engineer (Marcus):**
[Final synthesis]

**🔍 Researcher (Ava):**
[Final synthesis]
```

### Step 5: Council Synthesis

After all rounds complete, synthesize the debate:

```markdown
### Council Synthesis

**Areas of Convergence:**
- [Points where majority of agents agreed]
- [Shared concerns or recommendations]

**Remaining Disagreements:**
- [Points still contested between agents]
- [Trade-offs that couldn't be resolved]

**Recommended Path:**
[Based on convergence and weight of arguments, the recommended approach is...]
```

### Step 6: Archive to RESEARCH

After synthesis, archive the complete session:

```bash
TOPIC_SLUG=$(echo "[topic]" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-50)
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
MONTH=$(date +%Y-%m)
mkdir -p ~/.claude/MEMORY/RESEARCH/$MONTH
# Explicit file ordering (round-3.md may not exist if skipped)
cat ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-1.md \
    ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-2.md \
    ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-3.md 2>/dev/null \
    > ~/.claude/MEMORY/RESEARCH/$MONTH/${TIMESTAMP}_COUNCIL_${TOPIC_SLUG}.md
```

Update metadata.json with completion status (merge with existing):
```json
{
  "completed_at": "2026-02-02T23:55:39Z",
  "rounds_completed": 2,
  "archived_to": "~/.claude/MEMORY/RESEARCH/2026-02/2026-02-02-235539_COUNCIL_example-topic.md"
}
```

## Custom Council Members

If user specifies custom members, adjust accordingly:

- "Council with security" → Add pentester agent
- "Council with intern" → Add intern agent (fresh perspective)
- "Council with writer" → Add writer agent (communication focus)
- Omit agents: "Just architect and engineer" → Only those two

## Agent Type Mapping

| Council Role | Task subagent_type | Model | Personality Reference |
|--------------|-------------------|-------|----------------------|
| Architect | Architect | sonnet | Serena Blackwood |
| Designer | Designer | sonnet | Aditi Sharma |
| Engineer | Engineer | sonnet | Marcus Webb |
| Researcher | PerplexityResearcher | sonnet | Ava Chen |
| Security | Pentester | sonnet | Rook Blackburn |
| Intern | Intern | haiku | Dev Patel |
| Writer | (use Intern with writer prompt) | haiku | Emma Hartley |

## Timing

- Round 1: ~10-20 seconds (parallel)
- Round 2: ~10-20 seconds (parallel)
- Convergence check: ~1 second
- Round 3 (if needed): ~10-20 seconds (parallel)
- Synthesis: ~5 seconds

**Total: 20-60 seconds** (2 rounds) or **30-90 seconds** (3 rounds)

## Output Modes

### Deliberative (default)
Standard conversational format. Use for architectural debates, design decisions, exploratory discussions.

### Patchlist
Structured format for specification reviews. Invoke with: `"Council (patchlist): Review..."`

In patchlist mode, instruct agents to structure responses as:

```markdown
**BLOCKING:**
- B1: [issue] → [proposed change]

**HIGH:**
- H1: [issue] → [proposed change]

**MEDIUM/LOW:**
- M1: [issue]
```

## Interruption Handling

If the council is interrupted (rate limit, timeout):
1. Session state is preserved in `~/.claude/MEMORY/STATE/council-sessions/{SESSION_ID}/`
2. Use Recovery workflow to resume: `"Council recovery: Resume session 20260202-235539-a1b2c3d4"` (replace with your actual session ID)
3. See `Workflows/Recovery.md` for details

## Done

Debate complete. The transcript is archived to `~/.claude/MEMORY/RESEARCH/` and shows the full intellectual journey from initial positions through challenges to synthesis.

---

**Last Updated:** 2026-02-02
