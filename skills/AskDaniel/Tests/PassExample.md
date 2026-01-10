# Test Case: Feature That Should PASS

## Input Feature Request

```
Create a new tool for PAI that generates skill index files. It should scan all SKILL.md files, parse their YAML frontmatter, extract triggers from USE WHEN clauses, and output a searchable JSON index. CLI interface: bun run GenerateSkillIndex.ts with no arguments.
```

## Expected Result

- **Recommendation:** PROCEED
- **Red Flags:** None

## Expected Principle Scores

| Principle | Expected Status | Reason |
|-----------|-----------------|--------|
| Clear thinking | PASS | One sentence description is clear |
| Scaffolding > Model | PASS | Improves infrastructure (indexing) |
| Code before prompts | PASS | Entirely deterministic code |
| Unix philosophy | PASS | Does one thing (generate index) |
| CLI-first | PASS | Explicit CLI defined |
| Explicit routing | PASS | Tool triggered by explicit command |
| Specs/tests/evals | PARTIAL | Test cases implied but not explicit |
| Skills calling skills | PASS | Used by skill routing system |
| Self-updating | PASS | Index updates as skills change |
| History capture | PARTIAL | Logs generation but not detailed |

## Why This Passes

1. **Concrete deliverable** - specific output (JSON index)
2. **CLI defined** - `bun run GenerateSkillIndex.ts`
3. **Deterministic** - no AI involved, pure code
4. **Single purpose** - only generates index
5. **Infrastructure improvement** - helps skill routing
