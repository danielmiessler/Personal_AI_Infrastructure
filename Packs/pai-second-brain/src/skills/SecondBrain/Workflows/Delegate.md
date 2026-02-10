# Delegate Workflow

> Workflow for mandatory task delegation to subagents.

---

## Purpose

This workflow ensures ALL tasks are executed through subagent delegation, preserving main context for strategic thinking.

---

## When to Use

**ALWAYS.** Every task execution should flow through this workflow.

---

## Workflow Steps

### Step 1: Assess Complexity

Determine task complexity level:

| Complexity | Indicators | Minimum Subagents |
|------------|------------|-------------------|
| **Simple** | Single file, quick lookup, one-step | 1 |
| **Medium** | Multi-file, analysis, several steps | 2 |
| **Complex** | Strategic, decision, multi-perspective | 3+ |

**Questions to ask:**
- Does this require reading multiple files? → Medium+
- Does this involve a decision? → Complex
- Is there a "should I" in the question? → Complex
- Will execution fill significant context? → Delegate more

### Step 2: Formulate Delegation

Create clear task description for subagent(s):

```
TASK: [Specific action to perform]
CONTEXT: [Relevant background]
CONSTRAINTS: [Any limitations]
OUTPUT: [Expected deliverable format]
```

### Step 3: Spawn Subagent(s)

Use the Task tool:

```python
# Simple task - 1 subagent
Task(
  subagent_type="general-purpose",
  description="[3-5 word description]",
  prompt="""
    TASK: [Specific action]
    CONTEXT: [Background]
    OUTPUT: [Expected format]
  """
)
```

```python
# Medium task - 2 subagents in parallel
Task(
  subagent_type="general-purpose",
  description="[Aspect 1 analysis]",
  prompt="[Task 1 details]"
)
Task(
  subagent_type="general-purpose",
  description="[Aspect 2 analysis]",
  prompt="[Task 2 details]"
)
```

```python
# Complex task - 3+ subagents with perspectives
Task(
  subagent_type="general-purpose",
  description="[Option A advocate]",
  prompt="Argue FOR option A: [details]"
)
Task(
  subagent_type="general-purpose",
  description="[Option B advocate]",
  prompt="Argue FOR option B: [details]"
)
Task(
  subagent_type="general-purpose",
  description="[Devil's advocate]",
  prompt="Attack BOTH options: [details]"
)
```

### Step 4: Coordinate Results

When subagents return:

1. **Review each result** - What did each subagent find?
2. **Identify patterns** - Where do they agree?
3. **Note conflicts** - Where do they disagree?
4. **Extract insights** - What unique value did each provide?

### Step 5: Synthesize

Combine subagent outputs into coherent insight:

```
SYNTHESIS FORMAT:
- Key Finding: [Main insight from combined analysis]
- Agreement Points: [Where subagents converged]
- Conflict Points: [Unresolved tensions]
- Recommendation: [Actionable next step]
```

### Step 6: Report to User

Present synthesized result, not raw subagent outputs:

```
I delegated this task to [N] subagents.

[Synthesis of findings]

[Recommendation]

[Optional: key friction points if relevant]
```

---

## Delegation Checklist

Before proceeding with ANY task:

- [ ] Did I assess complexity? (Simple/Medium/Complex)
- [ ] Did I determine minimum subagent count? (1/2/3+)
- [ ] Did I formulate clear task description?
- [ ] Did I spawn subagent(s)?
- [ ] Am I avoiding direct execution?
- [ ] Will I synthesize, not just relay?

---

## Anti-Patterns (AVOID)

### Direct Execution

```
❌ WRONG: Reading the file directly...
   [File contents fill main context]

✅ RIGHT: Spawning subagent to read file...
   [Only summary returns to main context]
```

### Skipping "Simple" Tasks

```
❌ WRONG: "This is trivial, I'll just do it quickly"
   [Context slowly fills, strategic capacity degrades]

✅ RIGHT: "Even simple tasks get delegated"
   [Context stays clean, director mode maintained]
```

### Relay Without Synthesis

```
❌ WRONG: "Here's what the subagent found: [raw output]"
   [Passes cognitive work to user]

✅ RIGHT: "Based on subagent analysis, the key insight is..."
   [Adds director value through synthesis]
```

---

## Examples

### Example 1: File Reading

**User:** "What's in the config file?"

**Delegation:**
```python
Task(
  subagent_type="general-purpose",
  description="Read config file",
  prompt="Read and summarize the key settings in config.yaml. Report: purpose, main settings, any unusual values."
)
```

**Response:**
"I delegated file reading to a subagent. Key findings: [synthesized summary]"

### Example 2: Code Analysis

**User:** "Review the authentication module"

**Delegation:**
```python
Task(
  subagent_type="general-purpose",
  description="Auth module security review",
  prompt="Review auth module for security issues. Check: input validation, token handling, session management."
)
Task(
  subagent_type="general-purpose",
  description="Auth module architecture review",
  prompt="Review auth module architecture. Evaluate: separation of concerns, testability, maintainability."
)
```

**Response:**
"I delegated analysis to 2 subagents - security and architecture perspectives. Synthesis: [combined findings and recommendations]"

### Example 3: Strategic Question

**User:** "Should we build this feature in-house or buy a solution?"

**Delegation:**
```python
Task(
  subagent_type="general-purpose",
  description="Build advocate",
  prompt="Argue for building in-house. Consider: control, customization, long-term cost, team learning."
)
Task(
  subagent_type="general-purpose",
  description="Buy advocate",
  prompt="Argue for buying a solution. Consider: time-to-market, maintenance burden, cost structure."
)
Task(
  subagent_type="general-purpose",
  description="Devil's advocate",
  prompt="Attack both options. What are the hidden risks and assumptions in each approach?"
)
```

**Response:**
"I delegated to 3 subagents with different perspectives. After their debate: [synthesis with breakthrough insight from friction]"

---

*This workflow is mandatory for all task execution.*
*Delegation preserves director capacity.*
*Synthesis adds value beyond raw execution.*
