# Core Algorithm

**THE Universal Execution Pattern for Kai**

All work follows this algorithm. No exceptions. Skills, workflows, and custom workflows all implement this pattern.

---

## The Algorithm

```
OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
```

---

## How to Execute: Use TodoWrite

**When starting a substantive task, immediately create the 7 phases as todos:**

```typescript
TodoWrite([
  { content: "OBSERVE - Gather context", status: "in_progress", activeForm: "Observing context" },
  { content: "THINK - Generate 3+ hypotheses", status: "pending", activeForm: "Thinking through approaches" },
  { content: "PLAN - Design execution steps", status: "pending", activeForm: "Planning execution" },
  { content: "BUILD - Define success criteria", status: "pending", activeForm: "Building test plan" },
  { content: "EXECUTE - Create deliverable", status: "pending", activeForm: "Executing solution" },
  { content: "VERIFY - Test against criteria", status: "pending", activeForm: "Verifying results" },
  { content: "LEARN - Capture insights", status: "pending", activeForm: "Capturing learnings" }
])
```

**Then work through each phase**, marking as `in_progress` when starting and `completed` when done.

This provides visible progress tracking. Daniel can see which phase you're in at any time.

---

## The 7 Phases

| # | Phase | Purpose | Output |
|---|-------|---------|--------|
| 1 | OBSERVE | Gather context, understand situation | Current state + constraints |
| 2 | THINK | Generate hypotheses (min 3) + verification thinking | Selected approach + verification plan |
| 3 | PLAN | Design the solution | Execution specification |
| 4 | BUILD | Create the Test Plan | Executable test criteria table |
| 5 | EXECUTE | Implement the solution | Deliverables |
| 6 | VERIFY | Execute the Test Plan | Pass/fail per criterion |
| 7 | LEARN | Improve the algorithm itself | Algorithm adjustments |

---

## Key Innovation: Test Plan Architecture

**BUILD creates it, VERIFY executes it with explicit comparison.**

BUILD produces a Test Plan table with SPECIFIC pass/fail conditions:

| # | Criterion | PASS Condition | FAIL Condition | Method |
|---|-----------|----------------|----------------|--------|
| 1 | [What to verify] | [SPECIFIC observable that means success] | [SPECIFIC observable that means failure] | [How] |

**🚨 CRITICAL: The PASS condition must be specific and observable, not vague.**

VERIFY runs each test and explicitly compares observations to PASS conditions.

---

## Verification Thinking (THINK Phase)

Three questions to answer before planning:

1. **What would PROVE success?** → Specific observable outcome
2. **What would prove NOT at ideal state?** → Failure indicators
3. **What's the MINIMUM verification?** → Simplest test that confirms success

---

## VERIFY Comparison Protocol

**For EACH criterion, you MUST:**

1. **State the PASS condition** (from BUILD)
2. **Perform the test**
3. **State EXACTLY what you observed** (specific, factual)
4. **Compare** observation to PASS condition
5. **Declare PASS or FAIL**

**🚨 THE ANTI-PATTERN (never do this):**
```
Criterion 1: Images have margin
- Test: Screenshot
- Result: PASS  ← No observation, no comparison = FAILURE
```

**The correct pattern:**
```
Criterion 1: Images have margin
- PASS condition: Visible space (>1rem) above the image
- Test: Screenshot
- Observed: Clear gap of ~1.5rem visible between image and heading
- Comparison: Matches PASS condition
- Result: PASS
```

---

## Loop-Back Logic (VERIFY Phase)

```
VERIFY Result Analysis:
├── All criteria pass → Proceed to LEARN → Complete
├── Execution bug → Loop to EXECUTE (fix and retry)
├── Wrong design → Loop to PLAN (redesign)
├── Wrong hypothesis → Loop to THINK (new approach)
└── Missing context → Loop to OBSERVE (gather more)
```

---

## 4 Effort Levels

| Level | Time Budget | Agents | Use When |
|-------|-------------|--------|----------|
| Fast | <30 seconds | Kai only | Quick tasks, simple structure |
| Standard | <2 minutes | Up to 3 | Most tasks |
| Deep | <10 minutes | Up to 5 | Complex analysis |
| Excellence | Continuous | Up to 16 | Critical deliverables |

---

## Effort Matrix (What Each Phase Does)

| Phase | Fast | Standard | Deep | Excellence |
|-------|------|----------|------|------------|
| OBSERVE | Quick scan | Structured analysis | Multi-source research | Comprehensive audit |
| THINK | 1 hypothesis | 3 hypotheses | 5+ with agents | Parallel exploration |
| PLAN | Mental model | Written spec | Detailed design | Architectural review |
| BUILD | 2-3 criteria | 5 criteria table | 8+ with edge cases | Comprehensive matrix |
| EXECUTE | Direct action | Logged steps | Staged rollout | Phased with gates |
| VERIFY | Spot check | Run all tests | Edge case testing | Multi-reviewer |
| LEARN | Mental note | Algorithm adjustment | Pattern refinement | Propagated improvements |

---

## 🚨 LEARN Phase: Meta-Learning About the Algorithm

**LEARN is NOT about capturing domain knowledge from the task.**

The LEARN phase improves the **Core Algorithm itself**:

| Focus On | NOT |
|----------|-----|
| How to do better **ideation** (THINK phase) | What you learned about the topic |
| How to build better **verification criteria** (BUILD) | Domain-specific insights |
| How to **execute against criteria** (EXECUTE/VERIFY) | Style decisions, composition choices |
| **Failures in VERIFY** - these are the gold | General information about the work |

**The Pattern:**
```
VERIFY failures → Reveal algorithm weaknesses → LEARN captures adjustment → Future executions improve
```

**Example - Good LEARN:**
```
LEARN: The verification criteria were too vague ("works correctly").
Next time, BUILD phase needs measurable criteria with specific pass/fail conditions.
```

**Example - Bad LEARN (domain knowledge):**
```
LEARN: Charcoal sketches work better with burnt sienna accents.
```

The second example is useful information, but it belongs in domain-specific documentation, not the LEARN phase. The LEARN phase is for **improving the algorithm's execution patterns**.

---

## Auto-Create Custom Workflows

When a task doesn't fit an existing skill:

1. **Create directory**: `cp -r ~/.claude/CustomWorkflows/DirectoryTemplate ~/.claude/CustomWorkflows/Active/YYYY-MM-DD-Task-Name`
2. **Directory contains**: `Workflow.md` (execution file) + `Output/` (deliverables)
3. **Execute**: All 7 phases with appropriate effort level, saving deliverables to `Output/`

**🚨 CustomWorkflows are DIRECTORIES, not single files.** This happens automatically. No need to ask for "custom workflow."

---

## References

| Topic | Document |
|-------|----------|
| Full phase details | `WorkflowExecution.md` |
| Skill structure | `~/.claude/Skills/CORE/SkillSystem.md` |
| Custom workflows | `~/.claude/CustomWorkflows/README.md` |
| Canonical example | `~/.claude/Skills/Art/Workflows/Essay.md` |

---

**Last Updated:** 2025-12-31
