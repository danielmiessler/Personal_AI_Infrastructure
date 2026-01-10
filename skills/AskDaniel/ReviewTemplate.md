# Feature Specification Template

This template defines the output format for AskDaniel. The specification should be directly usable as a prompt for implementation.

---

## How to Use This Template

1. Complete the AskDaniel workflow (all 8 phases)
2. Fill in each section below based on your analysis
3. Remove any N/A sections with explanation
4. The resulting document IS the implementation prompt

**The specification should be so clear that implementation is mechanical.**

---

## Specification Format

```markdown
# Feature: [Feature Name]

## Summary

[One sentence description - if you can't write this clearly, go back to Phase 1]

## Problem Statement

[What problem does this solve? Who has this problem? Why does it matter?]

## Solution Overview

[High-level approach in 2-3 sentences]

---

## Daniel Principles Compliance

| Principle | Status | Implementation |
|-----------|--------|----------------|
| Clear thinking | PASS | [one-sentence description exists] |
| Scaffolding > Model | PASS | [infrastructure improvement, not AI cleverness] |
| Code > Prompts | PASS | [what's deterministic code vs AI-driven] |
| Unix Philosophy | PASS | [single responsibility defined] |
| CLI-First | PASS | [command interface designed] |
| Explicit Routing | PASS | [trigger pattern defined] |
| Specs/Tests | PASS | [test approach documented] |
| Skills Composition | PASS | [integration points identified] |
| Self-Updating | PASS/N/A | [feedback loop or why not applicable] |
| History Capture | PASS | [what's logged] |

---

## Architecture

### Type

[skill | hook | tool | workflow]

### Directory Structure

```
[Feature]/
├── [files]
└── [directories]
```

### Key Files

- `path/to/file.ext` - [purpose]
- `path/to/file.ext` - [purpose]

### Interfaces (if applicable)

```typescript
// Key types and interfaces
interface Example {
  field: type;
}
```

---

## CLI Interface (if applicable)

```
Usage: bun run $PAI_DIR/[path] [command] [options]

Commands:
  [command]     [description]

Options:
  --flag        [description]
  --help        Show help

Examples:
  $ bun run $PAI_DIR/[path] [example command]
  $ bun run $PAI_DIR/[path] [another example]
```

---

## Workflow Routing (if skill)

| Workflow | Trigger Pattern | File |
|----------|-----------------|------|
| **WorkflowName** | "trigger words" | `Workflows/WorkflowName.md` |

---

## Cross-Skill Composition

### Skills This Invokes

| Skill | Purpose | When |
|-------|---------|------|
| SkillName | [why] | [condition] |

### Skills That Might Invoke This

| Skill | Context |
|-------|---------|
| SkillName | [when they would call this] |

---

## Test Strategy

### Unit Tests

- [ ] [test case with expected behavior]
- [ ] [test case with expected behavior]

### Integration Tests

- [ ] [test case spanning multiple components]

### Evals (if AI-involved)

- [ ] [eval criteria and measurement method]

### Manual Test Scenarios

1. [Scenario description and expected outcome]
2. [Scenario description and expected outcome]

---

## History / Observability

### JSONL Capture

```jsonl
{"event": "[event_type]", "timestamp": "ISO_8601", "data": {...}}
```

### What Gets Logged

- [Event 1]: [when and what data]
- [Event 2]: [when and what data]

### Metrics (if applicable)

- [metric name]: [what it measures]

---

## Implementation Notes

[Any specific implementation guidance, gotchas, existing patterns to follow, or references]

---

## Acceptance Criteria

- [ ] [Criterion 1 - specific, testable]
- [ ] [Criterion 2 - specific, testable]
- [ ] Tests pass
- [ ] JSONL capture verified
- [ ] CLI --help works (if applicable)
- [ ] Skill index regenerated

---

## Next Steps

After this specification is approved:

1. Use CreateSkill skill to scaffold the structure
2. Implement following SPARC methodology (spec -> arch -> pseudocode -> refinement -> completion)
3. Regenerate skill index: `bun run $PAI_DIR/Tools/GenerateSkillIndex.ts`
4. Verify: `bun run $PAI_DIR/Tools/SkillSearch.ts "[feature name]"`
```

---

## Notes on Using This Template

- **Be specific:** Vague specs lead to vague implementations
- **Delete unused sections:** If CLI doesn't apply, remove that section entirely
- **Test strategy is mandatory:** No tests = no approval
- **The spec is the prompt:** Write it as if handing to another developer
