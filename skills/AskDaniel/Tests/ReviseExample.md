# Test Case: Feature That Should REVISE

## Input Feature Request

```
Add a hook for PAI that captures session summaries when Claude Code sessions end. It should extract what was accomplished, files changed, and key decisions made, then save to history/sessions/.
```

## Expected Result

- **Recommendation:** REVISE
- **Red Flags:** None

## Expected Principle Scores

| Principle | Expected Status | Reason |
|-----------|-----------------|--------|
| Clear thinking | PASS | Clear purpose stated |
| Scaffolding > Model | PARTIAL | AI needed for summarization |
| Code before prompts | PARTIAL | Some parts code (file saving), some AI (summarization) |
| Unix philosophy | PASS | Single purpose (capture summaries) |
| CLI-first | FAIL | Hook, not CLI - but hooks don't need CLI |
| Explicit routing | PASS | Triggered on SessionEnd event |
| Specs/tests/evals | PARTIAL | Output location defined, but no eval criteria |
| Skills calling skills | UNKNOWN | Doesn't specify composition |
| Self-updating | UNKNOWN | Not specified |
| History capture | PASS | Explicitly saves to history/ |

## Why This Needs Revision

1. **Principle scoring incomplete:** Several UNKNOWN/PARTIAL scores
2. **Missing details:**
   - What format for summaries? (JSONL? Markdown?)
   - What "key decisions" means needs definition
   - How to eval quality of summaries?
3. **CLI confusion:** Hooks don't use CLI, so FAIL is incorrect - needs clarification

## Suggested Revisions

1. Specify output format (recommend JSONL for structured data)
2. Define "key decisions" extraction criteria
3. Add eval strategy: compare AI summary to manual summary
4. Clarify that hooks use event triggers, not CLI
5. Consider if summarization should be code (extractors) vs AI (interpretation)
