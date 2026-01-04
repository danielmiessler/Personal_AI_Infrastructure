# Universal Workflow Execution Pattern

**The Scientific Method as Algorithm**

Every workflow in Kai/PAI follows this universal 7-phase execution pattern. The only variable is **effort level**, which determines depth and parallelization.

---

## The Core Insight

```
CURRENT STATE ──────────────────────────────▶ IDEAL STATE
       │                                              │
       │    ┌─────────────────────────────────────┐  │
       │    │         THE SCIENTIFIC METHOD        │  │
       └────│                                      │──┘
            │  OBSERVE → THINK → PLAN → BUILD →   │
            │  EXECUTE → VERIFY → LEARN           │
            └─────────────────────────────────────┘
```

Every task - from fixing a typo to building an enterprise system - follows this exact pattern.

---

## The 7 Phases

| # | Phase | Purpose | Key Output |
|---|-------|---------|------------|
| 1 | **OBSERVE** | Gather context, understand current state | Current state understanding |
| 2 | **THINK** | Generate hypotheses, brainstorm approaches | Hypothesis list |
| 3 | **PLAN** | Design experiment, define steps | Execution plan |
| 4 | **BUILD** | Document current→ideal state, define success criteria | Success criteria |
| 5 | **EXECUTE** | Run the plan | Deliverables |
| 6 | **VERIFY** | Test against success criteria | Pass/fail results |
| 7 | **LEARN** | Analyze results, document learnings, loop or complete | Learnings |

---

## The 4 Effort Levels

| Level | Time Budget | Agents | Trigger Words |
|-------|-------------|--------|---------------|
| **Fast** | <30s | Just Kai | "quick", "just", "simple" |
| **Standard** | <2min | 3 Named Agents | Default for most work |
| **Deep** | <10min | 5 Custom Agents (AgentFactory) | "think about", "explore", complex |
| **Excellence** | Continuous | Up to 16 Custom Agents | "best possible", critical, perfection |

---

## The 4x7 Effort Matrix

```
                │  FAST        │  STANDARD     │  DEEP          │  EXCELLENCE
────────────────┼──────────────┼───────────────┼────────────────┼──────────────────
1. OBSERVE      │ Quick scan   │ File read     │ 2 Researchers  │ 4 Researchers
                │ Mental       │ Status check  │ External data  │ Full research team
────────────────┼──────────────┼───────────────┼────────────────┼──────────────────
2. THINK        │ 1 hypothesis │ 3 hypotheses  │ Divergent      │ Council debate
                │ Immediate    │ Brief rationale│ Creative team │ Full analysis
────────────────┼──────────────┼───────────────┼────────────────┼──────────────────
3. PLAN         │ Mental only  │ Brief steps   │ [P] markers    │ Full SDD
                │ No artifact  │ Documented    │ Dependencies   │ Milestones
────────────────┼──────────────┼───────────────┼────────────────┼──────────────────
4. BUILD        │ Implicit     │ Brief spec    │ Full spec      │ Complete SDD
                │ In-context   │ Success crit  │ Acceptance     │ User stories
────────────────┼──────────────┼───────────────┼────────────────┼──────────────────
5. EXECUTE      │ Single act   │ Sequential    │ 3+ parallel    │ 8+ parallel
                │ Kai only     │ 1 Engineer    │ Engineers      │ Full teams
────────────────┼──────────────┼───────────────┼────────────────┼──────────────────
6. VERIFY       │ Sanity only  │ TDD + review  │ + Security     │ + Red team
                │ Boolean      │ 2 gates       │ + Custom evals │ Full suite
────────────────┼──────────────┼───────────────┼────────────────┼──────────────────
7. LEARN        │ Mental note  │ If notable    │ Retrospective  │ Deep retro
                │ (if failed)  │ Brief doc     │ Structured     │ Council analysis
```

---

## Phase Details

### 1. OBSERVE
**Purpose**: Gather context, understand current state

| Effort | Action |
|--------|--------|
| Fast | Quick mental scan of context |
| Standard | Read relevant files, check status |
| Deep | 2 Researchers gather comprehensive context |
| Excellence | 4 Researchers with external research |

**Output**: Understanding of current state (mental or documented)

---

### 2. THINK
**Purpose**: Generate hypotheses AND define verification criteria

| Effort | Action |
|--------|--------|
| Fast | Single immediate hypothesis |
| Standard | Generate 3 hypotheses with brief rationale |
| Deep | Divergent exploration with creative agents |
| Excellence | Council debate with full analysis |

**Output**: Hypothesis list with confidence levels

**CRITICAL**: Minimum 3 hypotheses for Standard+

**VERIFICATION THINKING** (Standard+):
After generating approach hypotheses, answer:
1. What would **prove** each approach succeeded?
2. What would prove we're **NOT** at ideal state?
3. What's the **minimum verification** that captures success?

This ensures we think about verification BEFORE we build the test plan.

---

### 3. PLAN
**Purpose**: Design the approach, define steps

| Effort | Action |
|--------|--------|
| Fast | Mental model only |
| Standard | Brief plan with steps |
| Deep | Detailed plan with [P] parallelization markers |
| Excellence | Full SDD with dependencies and milestones |

**Output**: Execution plan (mental or documented)

---

### 4. BUILD
**Purpose**: Create the Test Plan - define success criteria with SPECIFIC pass/fail conditions

**This is the SPEC phase - defines WHAT success looks like AND HOW to verify it**

| Effort | Action |
|--------|--------|
| Fast | Implicit criteria, mental verification |
| Standard | Test Plan table with PASS/FAIL conditions |
| Deep | Full Test Plan with validation script |
| Excellence | Complete SDD with automated test suite |

**Output**: Test Plan (executable)

**TEST PLAN STRUCTURE** (Standard+):

```markdown
| # | Criterion | PASS Condition | FAIL Condition | Method |
|---|-----------|----------------|----------------|--------|
| 1 | [What we're testing] | [SPECIFIC observable that means success] | [SPECIFIC observable that means failure] | [How to test] |
```

**🚨 CRITICAL: PASS/FAIL CONDITIONS MUST BE SPECIFIC AND OBSERVABLE**

The PASS condition is the EXACT thing you'll look for during VERIFY. Vague criteria like "works correctly" or "looks good" are FAILURES.

**Examples:**

❌ **BAD (vague):**
| Criterion | PASS Condition |
|-----------|----------------|
| Images have margin | Works correctly |
| Page loads | Looks good |
| Build passes | No errors |

✅ **GOOD (specific and observable):**
| Criterion | PASS Condition | FAIL Condition |
|-----------|----------------|----------------|
| Content images have top margin | Visible space (>1rem) above the Foundational Algorithm image - clear gap between image and heading above | Image touches or nearly touches the text/heading above with no visible gap |
| Blog list thumbnails are 3:2 | Thumbnail is wider than tall, approximately 3:2 aspect ratio | Thumbnail is taller than wide or square |
| TypeScript compiles | `tsc` exits with code 0, no error output | Non-zero exit code OR error messages in output |

**Test Method Categories**:
| Category | Methods | Tools |
|----------|---------|-------|
| Dimensions | File metadata | `identify`, `file`, `stat` |
| Visual | Human/AI inspection | Read tool (multimodal), BrowserAutomation screenshot |
| Functional | Execution | Bash, test runners |
| Integration | E2E validation | BrowserAutomation |
| Quality | Linting/formatting | `eslint`, `prettier` |

**Optional**: Validation script combining all checks into one executable.

---

### 5. EXECUTE
**Purpose**: Run the plan

| Effort | Action |
|--------|--------|
| Fast | Single action by Kai |
| Standard | Sequential execution with Engineer |
| Deep | Parallel execution with 3+ Engineers |
| Excellence | Massive parallel with full orchestration |

**Output**: Deliverables as specified

---

### 6. VERIFY
**Purpose**: Execute the Test Plan from BUILD using explicit comparison

**This phase RUNS the verification defined in BUILD - comparing observations to PASS conditions**

| Effort | Action |
|--------|--------|
| Fast | Quick sanity check |
| Standard | Execute Test Plan with explicit comparison protocol |
| Deep | Execute Test Plan + run validation script + evals |
| Excellence | Full automated suite + red team review |

**🚨 VERIFICATION COMPARISON PROTOCOL (Standard+):**

For EACH criterion in the Test Plan, you MUST:

1. **State the PASS condition** (copy from BUILD)
2. **Perform the test** (run command, take screenshot, etc.)
3. **State EXACTLY what you observed** (specific, factual)
4. **Compare** observation to PASS condition
5. **Declare PASS or FAIL** based on comparison

**Example - Visual Verification:**
```
Criterion 1: Content images have top margin
- PASS condition: Visible space (>1rem) above the Foundational Algorithm image
- Test: Screenshot of ai-changes-2026 post
- Observed: The Foundational Algorithm image has approximately 1.5rem of clear space
  above it, separating it from the "The Foundational Algorithm" heading
- Comparison: Observed gap matches PASS condition
- Result: PASS
```

**Example - When FAILING:**
```
Criterion 1: Content images have top margin
- PASS condition: Visible space (>1rem) above the Foundational Algorithm image
- Test: Screenshot of ai-changes-2026 post
- Observed: The Foundational Algorithm image is directly adjacent to the heading
  above with no visible gap - the image edge touches the text
- Comparison: No gap observed, matches FAIL condition
- Result: FAIL
```

**🚨 THE ANTI-PATTERN - NEVER DO THIS:**
```
Criterion 1: Content images have top margin
- Test: Screenshot of page
- Result: PASS  ← WHERE IS THE OBSERVATION? WHERE IS THE COMPARISON?
```

This is the failure mode. You MUST state what you observed and compare it to the PASS condition.

**If uncertain:**
"I see [specific observation] but I cannot determine if this meets the criterion [X]. Please confirm."

**Output**: Pass/fail per criterion with explicit observation and comparison evidence

**CRITICAL - LOOP-BACK LOGIC:**
```
VERIFY Result Analysis:
├── All criteria pass → Proceed to LEARN → Complete
├── Execution issue → Loop to EXECUTE (fix implementation)
├── Approach wrong → Loop to PLAN (different strategy)
├── Hypothesis wrong → Loop to THINK (new hypotheses)
└── Context missing → Loop to OBSERVE (gather more data)
```

---

### 7. LEARN
**Purpose**: Analyze results, document learnings, complete or loop

| Effort | Action |
|--------|--------|
| Fast | Mental note if failed |
| Standard | Document learnings if notable |
| Deep | Structured retrospective |
| Excellence | Deep retrospective with council |

**Output**:
- Learnings documented (if notable)
- Copy to global `~/.claude/History/learnings/`
- Loop back to earlier phase if VERIFY failed

---

## Learning Propagation

When learnings are captured:

1. **Local**: Save to workflow's local History directory
2. **Global**: Copy to `~/.claude/History/learnings/YYYY-MM/`
3. **Index**: Add to searchable index

```
Workflow Execution
     │
     ▼
Local History: Skills/[Skill]/Workflows/[Workflow]/History/
     │
     └──▶ Copy to Global: ~/.claude/History/learnings/
```

---

## Effort Level Selection

**Auto-select based on triggers:**

| Indicator | Level |
|-----------|-------|
| "Quick", "just", "simple", single file | Fast |
| Standard requests, most work | Standard |
| "Think about", "explore", complex, multi-file | Deep |
| "Best possible", "critical", perfection needed | Excellence |

**User can always override** with explicit level request.

---

## Applying to Workflows

Every workflow file should:

1. **Reference this pattern** in its header
2. **Define skill-specific behavior** for each phase
3. **Include Evals** for VERIFY phase
4. **Maintain local History** for LEARN phase

Example workflow structure:
```
Skills/[Skill]/
├── SKILL.md              # Skill definition, routes to workflows
├── Workflows/
│   ├── [Workflow].md     # Workflow definition (references 7 phases)
│   └── ...
├── Evals/                # Skill-specific evals for VERIFY
│   └── [eval-name].eval.md
└── History/              # Local history for LEARN
    ├── executions/
    └── learnings/
```

---

## Constitutional Alignment

| Principle | How 7 Phases Honor It |
|-----------|----------------------|
| Clear Thinking + Prompting | OBSERVE and THINK ensure clarity before action |
| Scaffolding > Model | Phase structure provides reliable scaffolding |
| As Deterministic as Possible | 7 phases provide predictable execution |
| Spec/Test/Evals First | BUILD creates spec; VERIFY creates tests |
| Science as Cognitive Loop | This IS the scientific method |
| Custom History System | LEARN propagates to local + global history |

---

**This is the universal execution pattern. All workflows follow it.**
