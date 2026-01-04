# Execute Core Algorithm Workflow

The foundational execution pattern for all substantive work in Kai.

## When This Workflow Activates

The ComplexityClassifier hook detects substantive tasks (anything that creates output, not just answers questions) and injects `<core-algorithm-enforcement>` with an effort level.

---

## 🚨 MANDATORY REQUIREMENTS (NON-NEGOTIABLE)

### 1. Send Voice Notification IMMEDIATELY

**Before ANY other action, announce the workflow:**

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Executing task using the Core Algorithm at EFFORT_LEVEL effort"}' \
  > /dev/null 2>&1 &
```

**And output text:**
```
Executing this task using the **Core Algorithm** at **[Effort Level]** effort...
```

**If you start working without the notification, you have FAILED.**

### 2. Create the Workflow Directory FIRST

**When `<core-algorithm-enforcement>` includes a `WORKFLOW FILE:` path, you MUST:**

```bash
# IMMEDIATELY create the directory before any other action
cp -r ~/.claude/CustomWorkflows/DirectoryTemplate ~/.claude/CustomWorkflows/Active/[WORKFLOW_NAME]
```

**The workflow directory contains:**
- `Workflow.md` - The execution file (fill this in as you work)
- `Output/` - Where all deliverables go

**This directory captures ALL context as you work. If you don't create it, you are FAILING.**

### 3. Output Visible Phase Headers

**Every phase MUST have a visible header in your output:**

```markdown
---
## 🔍 OBSERVE PHASE
[Your observations here]

---
## 💭 THINK PHASE
[Your hypotheses here]

---
## 📋 PLAN PHASE
[Your plan here]
```

**Daniel must SEE which phase you're executing. Hidden/mental phases = FAILURE.**

### 4. Update Workflow File Per Phase

**As you complete each phase, update the workflow file with:**
- Context gathered
- Decisions made
- Outputs produced

**The workflow file is the persistent record. Your chat output is ephemeral.**

---

| Effort Level | Time Budget | When Used |
|--------------|-------------|-----------|
| **Fast** | <30s | Simple edits, typo fixes |
| **Standard** | <2min | Bug fixes, components, routine work |
| **Deep** | <10min | Strategic plans, features, analysis |
| **Excellence** | Continuous | Architecture, major refactors |

## The Algorithm

```
OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
```

---

## Phase Execution

### Phase 1: OBSERVE
**Purpose:** Gather context before acting

| Effort | What to Do |
|--------|------------|
| Fast | Quick scan of relevant files |
| Standard | Structured review of context |
| Deep | Multi-source research, explore codebase |
| Excellence | Comprehensive audit, stakeholder input |

**Output:** Current state + constraints understood

---

### Phase 2: THINK
**Purpose:** Generate hypotheses and consider alternatives

| Effort | What to Do |
|--------|------------|
| Fast | 1 hypothesis, mental model |
| Standard | 3+ hypotheses documented |
| Deep | 5+ hypotheses, possibly with agents |
| Excellence | Parallel exploration, multiple perspectives |

**Critical Questions:**
1. What would PROVE success? → Specific observable outcome
2. What would prove NOT at ideal state? → Failure indicators
3. What's the MINIMUM verification? → Simplest test that confirms

**Output:** Selected approach + verification plan

---

### Phase 3: PLAN
**Purpose:** Design the solution structure

| Effort | What to Do |
|--------|------------|
| Fast | Mental model only |
| Standard | Written spec, clear steps |
| Deep | Detailed design document |
| Excellence | Architectural review, trade-off analysis |

**Output:** Execution specification

---

### Phase 4: BUILD
**Purpose:** Create the Test Plan (not the deliverable!)

**Key Innovation:** BUILD creates the test plan, VERIFY executes it.

| Effort | What to Do |
|--------|------------|
| Fast | 2-3 implicit criteria |
| Standard | 5 criteria table |
| Deep | 8+ with edge cases |
| Excellence | Comprehensive test matrix |

**Test Plan Table Format:**
```
| # | Criterion | Test Method | Tool | Command/Action |
|---|-----------|-------------|------|----------------|
| 1 | [What to verify] | [How] | [Tool] | [Exact command] |
```

**Output:** Executable test criteria table

---

### Phase 5: EXECUTE
**Purpose:** Implement the solution

| Effort | What to Do |
|--------|------------|
| Fast | Direct single action |
| Standard | Logged steps |
| Deep | Staged rollout |
| Excellence | Phased with gates |

**Output:** The deliverable (code, document, plan, etc.)

---

### Phase 6: VERIFY
**Purpose:** Execute the Test Plan from BUILD phase

**Simply run each test in the table. No new logic added here.**

| Result | Action |
|--------|--------|
| All pass | → Proceed to LEARN |
| Execution bug | → Loop to EXECUTE |
| Wrong design | → Loop to PLAN |
| Wrong hypothesis | → Loop to THINK |
| Missing context | → Loop to OBSERVE |

**🚨 ITERATION CAPTURE (Critical for Learning):**

Every VERIFY attempt MUST be captured in `Iterations/` directory:

```markdown
# Iterations/verify-1.md

## VERIFY Iteration 1 - [PASSED|FAILED]
**Time:** YYYY-MM-DD HH:MM

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | ... | PASS/FAIL | [specific detail] |

**Loop-back to:** [PHASE] (if failed)
**Reason:** [why we're looping back]
```

**Why capture iterations?**
- Most learning signal comes from FAILURES
- Loop-backs reveal where the algorithm broke
- Final success alone tells us nothing

**Output:** Pass/fail per criterion + iteration record

---

### Phase 7: LEARN
**Purpose:** Improve the Core Algorithm itself (NOT domain knowledge)

**🚨 LEARN is meta-learning about the algorithm, not task knowledge.**

| Effort | What to Do |
|--------|------------|
| Fast | Mental note if algorithm pattern failed |
| Standard | Document algorithm adjustment needed |
| Deep | Pattern refinement, update execution approach |
| Excellence | Propagate improvements, update workflow templates |

**Focus on:**
- VERIFY failures → What algorithm pattern broke?
- How could THINK generate better hypotheses?
- How could BUILD create better verification criteria?
- What execution pattern would have succeeded?

**NOT about:**
- What you learned about the topic/domain
- Style decisions, composition choices
- General knowledge from the task

**🚨 HISTORY CAPTURE (Standard+ Effort):**

1. **If any VERIFY iteration failed:** Copy to Failures/
   ```bash
   cp Workflow.md ~/.claude/History/CoreAlgorithm/Failures/YYYY-MM/[workflow-name].md
   ```

2. **If algorithm improvement identified:** Log to Improvements.md
   ```markdown
   ## YYYY-MM-DD | Source: [Workflow Name]

   **Problem**: [What failed]
   **Root Cause Phase**: OBSERVE | THINK | PLAN | BUILD | EXECUTE | VERIFY
   **Pattern**: [Generalized pattern]
   **Proposed Fix**: [Specific change]
   **Status**: [ ] Pending
   ```

3. **Update Index.md** with workflow entry

4. **Archive workflow** when complete:
   ```bash
   mv ~/.claude/CustomWorkflows/Active/[name] ~/.claude/CustomWorkflows/Archive/
   ```

**Output:** Algorithm improvements (if patterns need adjustment) + History capture

---

## Example: Marketing Plan (Deep Effort)

```
Daniel: "Create a marketing plan for PAI"

OBSERVE:
- Read PAI repo structure and README
- Check existing marketing assets
- Review Daniel's platforms (YouTube, X, Newsletter)

THINK:
- Hypothesis 1: Community-first launch (GitHub + Discord)
- Hypothesis 2: Content-driven (blog + video walkthrough)
- Hypothesis 3: Influencer/podcast circuit
- Selected: Content-driven with community amplification

PLAN:
- Phase 1: Launch content (blog + video)
- Phase 2: Community building (Discord, GitHub)
- Phase 3: Amplification (podcasts, collaborations)

BUILD (Test Plan):
| # | Criterion | Test Method | Tool | Action |
|---|-----------|-------------|------|--------|
| 1 | Covers all channels | Review | Manual | Check blog, video, social, podcast |
| 2 | Has timeline | Review | Manual | Verify phases have sequence |
| 3 | Actionable items | Review | Manual | Each item is specific, not vague |
| 4 | Leverages existing audience | Review | Manual | Uses UL, YouTube, X |

EXECUTE:
[Create the marketing plan document]

VERIFY:
- ✅ Covers blog, video, social, podcast, community
- ✅ 3 phases with clear sequence
- ✅ Items are actionable (not "do marketing")
- ✅ Leverages UL newsletter, YouTube, X following

LEARN:
- BUILD criteria "actionable items" was too vague → add quantifiable metrics next time
- THINK phase generated hypotheses too quickly → should have researched existing PAI marketing first
(Domain insight: Daniel's audience is technical - but this goes in project notes, not algorithm LEARN)
```

---

## References

| Document | Purpose |
|----------|---------|
| `CoreAlgorithm.md` | Algorithm definition |
| `WorkflowExecution.md` | Detailed phase guidance |
| `CustomWorkflows/DirectoryTemplate/` | Directory template for custom workflows |
