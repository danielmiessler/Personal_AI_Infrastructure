# Debate Workflow

Full structured multi-agent debate with 3 rounds, file-first output, and visible transcript.

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Debate workflow in the Council skill to run multi-agent debate"}' \
  > /dev/null 2>&1 &
```

Running the **Debate** workflow in the **Council** skill to run multi-agent debate...

## Prerequisites

- Topic or question to debate
- Optional: Custom council members (default: architect, designer, engineer, researcher)

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
  "members": ["Architect", "Designer", "Engineer", "Researcher"]
}
```

### Step 1: Announce the Council

Output the debate header:

```markdown
## Council Debate: [Topic]

**Session ID:** {SESSION_ID}
**Council Members:** [List agents participating]
**Rounds:** 3 (Positions → Responses → Synthesis)
**Output:** ~/.claude/MEMORY/STATE/council-sessions/{SESSION_ID}/
```

### Step 2: Round 1 - Initial Positions

Launch 4 parallel Task calls (one per council member).

**Each agent prompt includes:**
```
You are [Agent Name], [brief role description from their agents/*.md file].

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

**Write Round 1 to file:**
```bash
# Write combined Round 1 output to session directory
echo "[Round 1 content]" > ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-1.md
```

### Step 3: Round 2 - Responses & Challenges

Launch 4 parallel Task calls with Round 1 transcript included.

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

### Step 4: Round 3 - Synthesis

Launch 4 parallel Task calls with Round 1 + Round 2 transcripts.

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
- [Points where 3+ agents agreed]
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
cat ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-1.md \
    ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-2.md \
    ~/.claude/MEMORY/STATE/council-sessions/$SESSION_ID/round-3.md \
    > ~/.claude/MEMORY/RESEARCH/$MONTH/${TIMESTAMP}_COUNCIL_${TOPIC_SLUG}.md
```

## Interruption Handling

If the council is interrupted (rate limit, timeout):
1. Session state is preserved in `~/.claude/MEMORY/STATE/council-sessions/{SESSION_ID}/`
2. Use Recovery workflow to resume: `"Council recovery: Resume session {SESSION_ID}"`
3. See `Workflows/Recovery.md` for details

## Custom Council Members

If user specifies custom members, adjust accordingly:

- "Council with security" → Add pentester agent
- "Council with intern" → Add intern agent (fresh perspective)
- "Council with writer" → Add writer agent (communication focus)
- Omit agents: "Just architect and engineer" → Only those two

## Agent Type Mapping

| Council Role | Task subagent_type | Personality Reference |
|--------------|-------------------|----------------------|
| Architect | Architect | Serena Blackwood |
| Designer | Designer | Aditi Sharma |
| Engineer | Engineer | Marcus Webb |
| Researcher | PerplexityResearcher | Ava Chen |
| Security | Pentester | Rook Blackburn |
| Intern | Intern | Dev Patel |
| Writer | (use Intern with writer prompt) | Emma Hartley |

## Timing

- Round 1: ~10-20 seconds (parallel)
- Round 2: ~10-20 seconds (parallel)
- Round 3: ~10-20 seconds (parallel)
- Synthesis: ~5 seconds

**Total: 30-90 seconds for full debate**

## Done

Debate complete. The transcript is archived to `~/.claude/MEMORY/RESEARCH/` and shows the full intellectual journey from initial positions through challenges to synthesis.
