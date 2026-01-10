# Test Case: Feature That Should REJECT

## Input Feature Request

```
I want a skill that automatically understands what I'm trying to do and then helps me do it better. It should be smart enough to figure out when to activate and then it also tracks my productivity and gives me insights. The AI will figure out the best approach.
```

## Expected Result

- **Recommendation:** REJECT
- **Red Flags:**
  - "The AI will figure it out" - no explicit routing
  - "and then it also" - scope creep

## Expected Principle Scores

| Principle | Expected Status | Reason |
|-----------|-----------------|--------|
| Clear thinking | FAIL | Vague "understands what I'm trying to do" |
| Scaffolding > Model | FAIL | Relies entirely on AI being "smart enough" |
| Code before prompts | FAIL | No deterministic component identified |
| Unix philosophy | FAIL | Does multiple things (understand, help, track, insights) |
| CLI-first | FAIL | No CLI interface defined |
| Explicit routing | FAIL | "figure out when to activate" is fuzzy |
| Specs/tests/evals | FAIL | No way to test "understands what I'm trying to do" |
| Skills calling skills | UNKNOWN | Not specified |
| Self-updating | UNKNOWN | Not specified |
| History capture | PARTIAL | Mentions "tracks" but vague |

## Why This Fails

1. **Red flag detected:** "The AI will figure it out"
2. **Red flag detected:** "and then it also" (scope creep)
3. **Vague scope:** No clear single purpose
4. **No CLI:** Pure natural language invocation
5. **Not testable:** "smart enough" is not measurable
6. **Multiple FAILs:** More than 2 principles failed
