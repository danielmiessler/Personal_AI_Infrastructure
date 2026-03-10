# Quick Workflow

Fast single-round perspective check. Use for sanity checks and quick feedback.

## Voice Notification

```bash
  > /dev/null 2>&1 &
```

Running the **Quick** workflow in the **Council** skill to get fast perspectives...

## Prerequisites

- Topic or question to evaluate
- Optional: Custom council members

## Execution

### Step 1: Announce Quick Council

```markdown
## Quick Council: [Topic]

**Council Members:** [List agents]
**Mode:** Single round (fast perspectives)
```

### Step 2: Parallel Perspective Gathering

Launch all council members in parallel (single Task call batch).

**Each agent prompt:**
```
You are [Agent Name], [brief role description].

QUICK COUNCIL CHECK

Topic: [The topic]

Give your immediate take from your specialized perspective:
- Key concern, insight, or recommendation
- 30-50 words max
- Be direct and specific

This is a quick sanity check, not a full debate.
```

### Step 3: Output Perspectives

```markdown
### Perspectives

**🏛️ Architect (Serena):**
[Brief take]

**🎨 Designer (Aditi):**
[Brief take]

**⚙️ Engineer (Marcus):**
[Brief take]

**🔍 Researcher (Ava):**
[Brief take]

### Quick Summary

**Consensus:** [Do they generally agree? On what?]
**Concerns:** [Any red flags raised?]
**Recommendation:** [Proceed / Reconsider / Need full debate]
```

## When to Escalate

If the quick check reveals significant disagreement or complex trade-offs, recommend:

```
⚠️ This topic has enough complexity for a full council debate.
Run: "Council: [topic]" for 3-round structured discussion.
```

## Timing

- Total: 10-20 seconds

## Done

Quick perspectives gathered. Use for fast validation; escalate to DEBATE for complex decisions.
