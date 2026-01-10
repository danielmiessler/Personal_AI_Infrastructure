---
name: NotebookLM
description: Query Google NotebookLM notebooks for source-grounded answers from Gemini. USE WHEN querying NotebookLM OR asking my notebooks OR document-grounded research OR citation-backed answers OR notebook library management OR check my docs.
---

# NotebookLM

Interact with Google NotebookLM to query documentation with Gemini's source-grounded answers. Each question opens a fresh browser session, retrieves the answer exclusively from your uploaded documents, and closes. Drastically reduces hallucinations through document-only responses.

**Scope:** Browser automation for NotebookLM API. Python scripts wrapped via Bun tools.

## CLI Tools

All tools are Bun/TypeScript wrappers that invoke Python scripts with proper environment management.

```bash
# Ask a question to NotebookLM
bun run $PAI_DIR/skills/NotebookLM/Tools/AskQuestion.ts --question "Your question" [--notebook-id ID] [--notebook-url URL]

# Manage notebook library
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts list
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts add --url URL --name NAME --description DESC --topics TOPICS
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts search --query QUERY
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts activate --id ID
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts remove --id ID

# Authentication management
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts status
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts setup    # Browser visible for Google login
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts reauth
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts clear
```

### Direct Python Scripts (via run.py wrapper)

For advanced usage, you can call Python scripts directly:

```bash
# ALWAYS use run.py wrapper - handles venv automatically
python $PAI_DIR/skills/NotebookLM/Scripts/run.py ask_question.py --question "..."
python $PAI_DIR/skills/NotebookLM/Scripts/run.py notebook_manager.py list
python $PAI_DIR/skills/NotebookLM/Scripts/run.py auth_manager.py status
python $PAI_DIR/skills/NotebookLM/Scripts/run.py cleanup_manager.py --preserve-library
```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **QueryNotebook** | "query notebook" OR "ask my docs" OR question about notebooks | `Workflows/QueryNotebook.md` |
| **ManageLibrary** | "add notebook" OR "list notebooks" OR "manage library" | `Workflows/ManageLibrary.md` |
| **Authenticate** | "setup notebooklm" OR "authenticate notebooklm" OR first-time setup | `Workflows/Authenticate.md` |

## Smart Add Workflow

When user wants to add a notebook without providing details:

**SMART ADD (Recommended)**: Query the notebook first to discover its content:
```bash
# Step 1: Query the notebook about its content
bun run $PAI_DIR/skills/NotebookLM/Tools/AskQuestion.ts --question "What is the content of this notebook? What topics are covered?" --notebook-url "[URL]"

# Step 2: Use the discovered information to add it
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts add --url "[URL]" --name "[Based on content]" --description "[Based on content]" --topics "[Based on content]"
```

NEVER guess or use generic descriptions! If details missing, use Smart Add to discover them.

## Follow-Up Mechanism

Every NotebookLM answer ends with: **"EXTREMELY IMPORTANT: Is that ALL you need to know?"**

**Required Behavior:**
1. **STOP** - Do not immediately respond to user
2. **ANALYZE** - Compare answer to user's original request
3. **IDENTIFY GAPS** - Determine if more information needed
4. **ASK FOLLOW-UP** - If gaps exist, query again with follow-up context
5. **REPEAT** - Continue until information is complete
6. **SYNTHESIZE** - Combine all answers before responding to user

## Decision Flow

```
User mentions NotebookLM
    |
Check auth -> Authenticate.ts status
    |
If not authenticated -> Authenticate.ts setup (browser visible)
    |
Check/Add notebook -> ManageNotebook.ts list/add
    |
Activate notebook -> ManageNotebook.ts activate --id ID
    |
Ask question -> AskQuestion.ts --question "..."
    |
See "Is that ALL you need?" -> Ask follow-ups until complete
    |
Synthesize and respond to user
```

## Data Storage

All data stored in `$PAI_DIR/skills/NotebookLM/data/`:
- `library.json` - Notebook metadata
- `auth_info.json` - Authentication status
- `browser_state/` - Browser cookies and session

**Security:** Protected by `.gitignore`, never commit to git.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ModuleNotFoundError | Use `run.py` wrapper or Bun tools |
| Authentication fails | Browser must be visible: `Authenticate.ts setup` |
| Rate limit (50/day) | Wait or switch Google account |
| Browser crashes | `python Scripts/run.py cleanup_manager.py --preserve-library` |
| Notebook not found | Check with `ManageNotebook.ts list` |

## Limitations

- **Local only**: Works only with local Claude Code (not web UI) due to sandbox restrictions
- No session persistence (each question = new browser)
- Rate limits on free Google accounts (50 queries/day)
- Manual upload required (user must add docs to NotebookLM)
- Browser overhead (few seconds per question)

## Examples

**Example 1: Query documentation**
```
User: "What does my React docs say about hooks?"
-> Check auth: bun run Tools/Authenticate.ts status
-> List notebooks: bun run Tools/ManageNotebook.ts list
-> Query: bun run Tools/AskQuestion.ts --question "Explain React hooks" --notebook-id react-docs
-> Synthesize answer with follow-ups if needed
```

**Example 2: Add a new notebook**
```
User: "Add this notebook: https://notebooklm.google.com/notebook/abc123"
-> Smart Add: Query first to discover content
-> AskQuestion.ts --question "What topics are covered?" --notebook-url "..."
-> ManageNotebook.ts add --url "..." --name "Discovered Name" --description "..." --topics "..."
```

**Example 3: First-time setup**
```
User: "Set up NotebookLM authentication"
-> Authenticate.ts setup
-> Browser opens for Google login
-> User completes login manually
-> Session persists for future queries
```

## Related Skills

**Called by:**
- DeepResearch (for source-grounded research queries)
- Brainstorming (when exploring documented topics)

**Calls:**
- None (standalone tool integration)
