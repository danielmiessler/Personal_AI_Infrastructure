# QueryNotebook Workflow

Query Google NotebookLM for source-grounded answers from your uploaded documents.

## Trigger Patterns

- User asks about notebook content: "What does my docs say about X?"
- User references NotebookLM: "Ask my NotebookLM about..."
- User wants document-grounded research: "Check my notebooks for..."

## Workflow Steps

### 1. Check Authentication

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts status
```

If not authenticated, invoke **Authenticate** workflow first.

### 2. Check Notebook Library

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts list
```

Verify the relevant notebook exists. If not, invoke **ManageLibrary** workflow.

### 3. Activate Target Notebook

```bash
# If specific notebook needed
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts activate --id <notebook-id>
```

### 4. Ask Question

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/AskQuestion.ts \
  --question "User's question here" \
  --notebook-id <notebook-id>
```

**Expected output:** Source-grounded answer from Gemini based on notebook documents.

### 5. Follow-Up Check

When response includes "Is that ALL you need to know?":

1. **STOP** - Don't respond to user yet
2. **ANALYZE** - Compare answer to original question
3. **IDENTIFY GAPS** - Are there missing pieces?
4. **ASK FOLLOW-UP** if gaps exist:

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/AskQuestion.ts \
  --question "Follow-up question with context..." \
  --notebook-id <notebook-id>
```

5. **REPEAT** until information is complete
6. **SYNTHESIZE** - Combine all answers into coherent response

### 6. Return Answer

Present the synthesized, source-grounded answer to the user.

## Error Handling

| Error | Action |
|-------|--------|
| Not authenticated | Invoke Authenticate workflow |
| Notebook not found | Invoke ManageLibrary workflow to add |
| Rate limit exceeded | Inform user, suggest waiting |
| Browser crash | Run cleanup: `python Scripts/run.py cleanup_manager.py --preserve-library` |

## Complete Pipeline Example

```bash
# Full query workflow
bun run Tools/Authenticate.ts status && \
bun run Tools/ManageNotebook.ts list && \
bun run Tools/AskQuestion.ts --question "How do React hooks work?"
```

## Completion Criteria

- User's question answered with source-grounded information
- All follow-up questions resolved
- Synthesized answer provided with citation context
