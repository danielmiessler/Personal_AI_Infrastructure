# Debate Workflow

> Workflow for facilitating multi-agent debate to generate breakthrough insights through friction.

---

## Purpose

Complex decisions benefit from multiple perspectives actively challenging each other. This workflow orchestrates structured debate between subagents to produce insights no single perspective could generate.

---

## When to Use

- Strategic decisions ("Should I...")
- Architecture choices
- Business direction questions
- Any question with multiple valid approaches
- When you need breakthrough insight, not balanced summary

---

## Workflow Steps

### Step 1: Frame the Debate Question

Convert user request into debate format:

**User says:** "Should I use microservices or monolith?"

**Debate frame:**
```
PROPOSITION: "Microservices architecture is the right choice for this project"

CONTEXT: [Project details, constraints, team size, etc.]

DEBATE FORMAT: Advocate vs Advocate vs Devil's Advocate
```

### Step 2: Assign Perspectives

Create 3-5 distinct perspectives:

| Role | Perspective | Goal |
|------|-------------|------|
| **Advocate A** | Argue FOR option A | Build strongest case for A |
| **Advocate B** | Argue FOR option B | Build strongest case for B |
| **Devil's Advocate** | Attack ALL options | Find fatal flaws everywhere |
| **Pragmatist** (optional) | Middle ground | Find hybrid approaches |
| **Contrarian** (optional) | Unusual angle | Challenge the framing itself |

### Step 3: Spawn Debate Agents

```python
# Advocate A
Task(
  subagent_type="general-purpose",
  description="Microservices advocate",
  prompt="""
    ROLE: Advocate for microservices architecture

    CONTEXT: [Project details]

    YOUR TASK:
    1. Build the strongest possible case FOR microservices
    2. Pre-emptively counter likely objections
    3. Acknowledge weaknesses but explain why they're acceptable
    4. Be persuasive, not balanced

    OUTPUT: Structured argument with evidence and reasoning
  """
)

# Advocate B
Task(
  subagent_type="general-purpose",
  description="Monolith advocate",
  prompt="""
    ROLE: Advocate for monolith architecture

    CONTEXT: [Project details]

    YOUR TASK:
    1. Build the strongest possible case FOR monolith
    2. Attack the microservices position specifically
    3. Acknowledge weaknesses but explain why they're acceptable
    4. Be persuasive, not balanced

    OUTPUT: Structured argument with evidence and reasoning
  """
)

# Devil's Advocate
Task(
  subagent_type="general-purpose",
  description="Devil's advocate",
  prompt="""
    ROLE: Devil's advocate - attack ALL positions

    CONTEXT: [Project details]

    YOUR TASK:
    1. Find fatal flaws in microservices approach
    2. Find fatal flaws in monolith approach
    3. Question the framing - is this even the right question?
    4. Propose what could go catastrophically wrong with each

    OUTPUT: Critique of all positions with specific failure scenarios
  """
)
```

### Step 4: Collect Initial Arguments

Wait for all agents to complete. Organize their outputs:

```
ADVOCATE A (Microservices):
[Summary of their argument]

ADVOCATE B (Monolith):
[Summary of their argument]

DEVIL'S ADVOCATE:
[Summary of their critiques]
```

### Step 5: Facilitate Rebuttals (Optional but Powerful)

Have agents respond to each other:

```python
Task(
  subagent_type="general-purpose",
  description="Microservices rebuttal",
  prompt="""
    You previously argued FOR microservices.

    The monolith advocate said: [their argument]
    The devil's advocate said: [their critique of you]

    Respond to their strongest points. Where are they right?
    Where are they wrong? Update your position if needed.
  """
)
```

### Step 6: Identify Synthesis Points

Analyze the debate for:

**Convergence Points** (Strong signal)
- Where do all perspectives agree?
- These are likely true regardless of position

**Divergence Points** (Needs resolution)
- Where do perspectives fundamentally disagree?
- What evidence would resolve this?

**Exposed Blind Spots** (Breakthrough potential)
- What did the devil's advocate reveal?
- What assumptions were challenged?

**Unexpected Insights** (Novel value)
- Did any agent see something others missed?
- Did the friction produce new ideas?

### Step 7: Synthesize Breakthrough

Create synthesis that captures:

```
SYNTHESIS STRUCTURE:

1. THE CORE TENSION
   [What fundamental trade-off did the debate reveal?]

2. AGREEMENT POINTS
   [What all perspectives confirmed]

3. KEY INSIGHT FROM FRICTION
   [What emerged from the collision that no single view had]

4. RECOMMENDATION
   [Actionable path forward]

5. REMAINING UNCERTAINTY
   [What the debate couldn't resolve]

6. DECISION CRITERIA
   [What information would tip the balance]
```

### Step 8: Present to User

Show the cognitive collision, not just the conclusion:

```
I facilitated a debate between 3 perspectives on your question.

THE DEBATE:
- Microservices advocate argued: [key points]
- Monolith advocate argued: [key points]
- Devil's advocate revealed: [key critiques]

KEY FRICTION POINT:
[Where the debate got heated/interesting]

BREAKTHROUGH INSIGHT:
[What emerged from the collision]

MY SYNTHESIS:
[Recommendation with reasoning]

WHAT REMAINS UNCERTAIN:
[Honest about limits]
```

---

## Debate Quality Checklist

- [ ] Did perspectives genuinely disagree?
- [ ] Did the devil's advocate find real flaws?
- [ ] Was friction productive?
- [ ] Did synthesis go beyond averaging?
- [ ] Is the breakthrough non-obvious?
- [ ] Does user see the full collision?

---

## Anti-Patterns (AVOID)

### Fake Debate

```
❌ WRONG: Agents all arrive at same conclusion
   "Both approaches are valid, it depends on your needs"

✅ RIGHT: Agents have genuine conflict
   "A will fail because X" vs "B will fail because Y"
```

### Synthesis by Averaging

```
❌ WRONG: "Both have pros and cons, consider your situation"
   [No actual insight, just aggregation]

✅ RIGHT: "The debate revealed that the real question isn't A vs B,
          it's whether you have constraint X. If yes, only A works."
   [Novel insight from friction]
```

### Hiding the Friction

```
❌ WRONG: "After analysis, I recommend option A"
   [User doesn't see the reasoning collision]

✅ RIGHT: "Advocate B made a strong point about X that almost
          changed my synthesis. Here's why I still recommend A..."
   [User sees the full cognitive process]
```

---

## Example: Full Debate Workflow

**User:** "Should we raise VC funding or bootstrap?"

**Step 1 - Frame:**
```
PROPOSITION: "VC funding is the right path for this company"
CONTEXT: B2B SaaS, 2 founders, $10K MRR, niche market
```

**Step 2-3 - Spawn Agents:**
- VC Advocate: Argues for raising
- Bootstrap Advocate: Argues for self-funding
- Devil's Advocate: Attacks both
- Contrarian: Questions the startup model entirely

**Step 4 - Initial Arguments:**
```
VC: "Speed matters, niche can expand, money de-risks..."
Bootstrap: "Control preserved, niche = sustainable, VC pressure kills..."
Devil: "Both assume growth is right. What if staying small is optimal?"
Contrarian: "Why build a company? License the tech, consult instead."
```

**Step 5 - Rebuttals:**
```
VC responds to Devil: "Growth isn't assumption, it's market reality..."
Bootstrap responds: "The 'stay small' point is valid but..."
```

**Step 6 - Synthesis Points:**
- Convergence: Niche market is real constraint
- Divergence: Whether niche expands or not
- Blind spot exposed: "Growth" assumed but unexamined
- Unexpected: Contrarian's licensing idea

**Step 7-8 - Synthesis:**
```
THE DEBATE REVEALED:
The real question isn't VC vs Bootstrap. It's "should you grow at all?"

BREAKTHROUGH INSIGHT:
Your niche market can support a $1M business indefinitely. VC wants $100M.
Bootstrap allows $1M. Neither advocate questioned whether $10M is achievable.

The devil's advocate exposed that BOTH paths assume growth that may not exist.

RECOMMENDATION:
Validate growth hypothesis before choosing funding path. If niche is fixed,
bootstrap. If niche expands (prove it!), then VC makes sense.

WHAT YOU SHOULD DO FIRST:
Test expansion with $0 - can you sell outside current niche?
This answers the question the debate couldn't.
```

---

*Debate workflow produces breakthroughs through friction.*
*Real disagreement > Polite balance.*
*Show the collision, not just the conclusion.*
