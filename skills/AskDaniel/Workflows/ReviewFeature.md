# ReviewFeature Workflow

> **Trigger:** PAI feature request (skill, hook, tool, workflow)
> **Input:** Raw feature idea or request
> **Output:** Implementation-ready specification

Thorough Daniel-style review that transforms raw feature ideas into implementation-ready specifications.

---

## Prerequisites

Before starting this workflow:

1. **READ** `$PAI_DIR/skills/AskDaniel/DanielPrinciples.md`
2. **READ** `$PAI_DIR/skills/CORE/SkillSystem.md` (if skill-related)
3. **Confirm scope:** Is this a PAI/Skish feature? (skill, hook, tool, workflow)

**If out of scope:** Stop immediately. Explain why and suggest alternatives.

---

## Phase 1: Capture Raw Request

**Goal:** Understand what the user is asking for before analysis.

**Actions:**

1. Record the verbatim user request
2. Identify the feature type: `skill` | `hook` | `tool` | `workflow` | `other`
3. Extract the core problem being solved
4. Note any constraints or preferences mentioned

**Output:**

```markdown
## Raw Request

- **Verbatim:** "[user's exact words]"
- **Type:** [skill|hook|tool|workflow|other]
- **Core Problem:** [one sentence]
- **Constraints:** [any mentioned]
```

---

## Phase 2: First Principles Check

**Goal:** Ensure we're solving the right problem in the simplest way.

**Dynamic Skill Discovery:**
```
SkillSearch('first principles') OR
SkillSearch('analyze problem') OR
SkillSearch('simplify') OR
SkillSearch('root cause')
-> Invoke best match if score > threshold
```

**If no relevant skill found, manually answer:**

1. What problem is this actually solving?
2. Is this problem real or imagined?
3. Who has this problem? (Just Eskender, or generalizable?)
4. What's the simplest possible solution?
5. Does this already exist in a Unix tool or existing skill?

**Daniel Filter Questions:**

- "Can this be done in code instead of prompts?"
- "Is there existing Unix tooling that solves this?"
- "What would the CLI interface look like?"

**Output:**

```markdown
## First Principles Analysis

- **Real Problem:** [yes/no + explanation]
- **Who Benefits:** [scope of usefulness]
- **Code vs Prompts:** [recommendation with reasoning]
- **Existing Solutions:** [list any, or "none found"]
- **Simplest Approach:** [description]
```

---

## Phase 3: Daniel Principles Checklist

**Goal:** Systematically evaluate against all 10 principles.

**Actions:**

1. Read `$PAI_DIR/skills/AskDaniel/DanielPrinciples.md`
2. Score each principle: PASS | PARTIAL | FAIL
3. For PARTIAL/FAIL, note what's missing and how to fix

**Output:**

```markdown
## Daniel Principles Compliance

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| 1 | Clear thinking -> Clear writing | [PASS/PARTIAL/FAIL] | [notes] |
| 2 | Scaffolding > Model | [PASS/PARTIAL/FAIL] | [notes] |
| 3 | Code before prompts | [PASS/PARTIAL/FAIL] | [notes] |
| 4 | Unix philosophy | [PASS/PARTIAL/FAIL] | [notes] |
| 5 | CLI-first | [PASS/PARTIAL/FAIL] | [notes] |
| 6 | Explicit routing | [PASS/PARTIAL/FAIL] | [notes] |
| 7 | Specs/tests/evals | [PASS/PARTIAL/FAIL] | [notes] |
| 8 | Skills calling skills | [PASS/PARTIAL/FAIL] | [notes] |
| 9 | Self-updating | [PASS/PARTIAL/FAIL/N/A] | [notes] |
| 10 | History capture | [PASS/PARTIAL/FAIL] | [notes] |

**Red Flags Detected:** [list any, or "none"]

**Overall Assessment:** [PROCEED | REVISE | REJECT]
```

---

## Phase 4: Research Existing Patterns

**Goal:** Find prior art and reusable patterns in the codebase.

**Dynamic Skill Discovery:**
```
SkillSearch('research') OR
SkillSearch('find patterns') OR
SkillSearch('prior art') OR
SkillSearch('codebase search')
-> Invoke best match if score > threshold
```

**If no relevant skill found, manually search:**

1. `grep` / `glob` for similar features in existing skills/hooks/tools
2. Check `$PAI_DIR/skills/` for patterns to follow
3. Check `$PAI_DIR/hooks/` for event handling patterns
4. Look for conflicting functionality

**Output:**

```markdown
## Research Findings

### Similar Features
- `[path]` - [what it does, how it's relevant]

### Reusable Patterns
- [pattern name] from [source] - [how to apply]

### Potential Conflicts
- [conflict description] | [resolution]

### Recommended Approach
[Based on research, the recommended pattern is...]
```

---

## Phase 5: Red Team Challenge

**Goal:** Attack the design and find weaknesses before building.

**Dynamic Skill Discovery:**
```
SkillSearch('red team') OR
SkillSearch('challenge') OR
SkillSearch('attack') OR
SkillSearch('critique') OR
SkillSearch('weaknesses')
-> Invoke best match if score > threshold
```

**If no relevant skill found, manually challenge:**

1. **Scope creep:** Is this trying to do too much?
2. **Fuzzy routing:** Will the AI know when to invoke this?
3. **Determinism:** Can this fail silently or produce inconsistent results?
4. **Maintenance burden:** Will this rot without attention?
5. **Testing:** How do we know it's working?
6. **Edge cases:** What happens with unexpected input?
7. **Security:** Any dangerous capabilities being exposed?

**Output:**

```markdown
## Red Team Analysis

### Identified Weaknesses
1. [Weakness] - Severity: [HIGH|MEDIUM|LOW]
2. [Weakness] - Severity: [HIGH|MEDIUM|LOW]

### Mitigations
| Weakness | Mitigation |
|----------|------------|
| [1] | [how to address] |
| [2] | [how to address] |

### Attack Scenarios
- [Scenario 1]: [what could go wrong] -> [prevention]

### Recommendation
[PROCEED | REVISE (with specific changes) | REJECT (with reasoning)]
```

---

## Phase 6: Architecture Design

**Goal:** Define the structure and interfaces.

**Only proceed if Red Team recommendation is PROCEED or REVISE (with changes incorporated).**

**For Skills:**

```
SkillName/
├── SKILL.md              # YAML frontmatter + routing table
├── [ContextFile].md      # Supporting context (TitleCase)
├── Tools/
│   └── [ToolName].ts     # CLI tools (TitleCase)
└── Workflows/
    └── [WorkflowName].md # Execution workflows (TitleCase)
```

**For Hooks:**

```
hooks/[hook-name].ts
Event: [SessionStart|PreToolUse|PostToolUse|Stop|SessionEnd|etc]
Matcher: [pattern or "*"]
Registration: settings.json
```

**For Tools:**

```
Tools/[ToolName].ts
CLI: bun run $PAI_DIR/Tools/[ToolName].ts [flags]
```

**Output:**

```markdown
## Architecture

### Type
[skill | hook | tool | workflow]

### Directory Structure
```
[structure diagram]
```

### Key Interfaces
```typescript
// Critical types/interfaces
```

### Dependencies
- [dependency 1] - [why needed]

### Cross-Skill Composition
| Invokes | Purpose |
|---------|---------|
| [skill] | [why] |

| Invoked By | Context |
|------------|---------|
| [skill] | [when] |
```

---

## Phase 7: Test Strategy

**Goal:** Define how we'll know this works.

**Required for every feature:**

1. **Unit Tests:** What functions need isolated testing?
2. **Integration Tests:** How does this interact with other skills?
3. **Evals:** For AI-involved features, how do we measure quality?
4. **Manual Testing:** What scenarios require human verification?

**Output:**

```markdown
## Test Strategy

### Unit Tests
- [ ] [Function/component]: [test case]
- [ ] [Function/component]: [test case]

### Integration Tests
- [ ] [Interaction]: [test case]

### Evals (if AI-involved)
- [ ] [Metric]: [how to measure, threshold for success]

### Manual Test Scenarios
1. **Scenario:** [description]
   **Expected:** [outcome]
   **Verify:** [how to check]

### Observability
- JSONL path: `history/[path]`
- Events logged: [list]
```

---

## Phase 8: Generate Refined Specification

**Goal:** Produce the final specification using ReviewTemplate.md format.

**Actions:**

1. Open `$PAI_DIR/skills/AskDaniel/ReviewTemplate.md`
2. Fill in each section based on Phases 1-7 outputs
3. Remove any N/A sections with brief explanation
4. Ensure the specification is actionable

**Output:**

The complete specification following the template format. This specification should be:

1. **Clear enough** that implementation is mechanical
2. **Testable** with defined acceptance criteria
3. **Aligned** with Daniel's principles
4. **Composable** with existing PAI infrastructure

---

## Phase 9: Log Review

**Goal:** Capture review data for future analysis and improvement.

**Action:** Use the Review.ts CLI tool to log:

```bash
bun run $PAI_DIR/skills/AskDaniel/Tools/Review.ts \
  --feature "[original request]" \
  --log \
  --json
```

**JSONL Location:** `$PAI_DIR/history/reviews/{YYYY-MM}/{YYYY-MM-DD}_reviews.jsonl`

**Data Captured:**
- Original feature request
- Feature type detected
- All principle scores
- Red flags detected
- Final recommendation
- Timestamp

**Why This Matters:**
- Track which principles fail most often
- Identify patterns in rejected features
- Measure improvement over time
- Feed learnings back into DanielPrinciples.md

---

## Workflow Summary

```
Phase 1: Capture Raw Request
    |
    v
Phase 2: First Principles Check
    |   -> SkillSearch for relevant analysis skills
    |   -> Invoke best match OR manual analysis
    v
Phase 3: Daniel Principles Checklist
    |
    v
Phase 4: Research Existing Patterns
    |   -> SkillSearch for research/pattern skills
    |   -> Invoke best match OR manual search
    v
Phase 5: Red Team Challenge
    |   -> SkillSearch for critique/attack skills
    |   -> Invoke best match OR manual challenge
    |
    +---> REJECT: Stop here, explain why
    |
    +---> REVISE: Go back, incorporate feedback
    |
    v
Phase 6: Architecture Design
    |
    v
Phase 7: Test Strategy
    |
    v
Phase 8: Generate Refined Specification
    |
    v
Phase 9: Log Review
    |   -> bun run Tools/Review.ts --log
    v
OUTPUT: Implementation-ready specification + logged review
```

---

## Dynamic Skill Composition

This workflow discovers and uses skills dynamically rather than hardcoding dependencies:

1. **At each phase**, run SkillSearch with relevant queries
2. **If a skill scores well**, invoke it and use its output
3. **If no good match**, perform manual analysis (fallback always exists)
4. **Log which skills were used** for future pattern analysis

**Benefits:**
- New skills automatically get used when relevant
- No need to update this workflow when new skills are added
- Graceful degradation when skills don't exist
- Emergent composition patterns

**Example Discovery:**
```
Phase 2 queries: "first principles", "analyze problem", "simplify"
-> Found: ThinkingFramework skill (score: 12)
-> Invoking ThinkingFramework...
```

---

## Completion

Review is complete when:
1. All 9 phases executed
2. Specification generated using ReviewTemplate.md
3. Review logged via Tools/Review.ts
4. User has implementation-ready specification

Hand off to CreateSkill (for skills) or appropriate skill for implementation.

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Dynamic discovery per phase | Various (via SkillSearch) |
| Specification approved | CreateSkill |
