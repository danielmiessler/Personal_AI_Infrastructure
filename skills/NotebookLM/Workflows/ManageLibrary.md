# ManageLibrary Workflow

Add, search, and manage notebooks in your NotebookLM library.

## Trigger Patterns

- User wants to add notebook: "Add this notebook to my library"
- User shares NotebookLM URL: `https://notebooklm.google.com/notebook/...`
- User wants to list notebooks: "Show my NotebookLM notebooks"
- User wants to search: "Find notebooks about React"

## Workflow Steps

### 1. Check Authentication

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts status
```

If not authenticated, invoke **Authenticate** workflow first.

### 2. List Existing Notebooks

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts list
```

### 3A. Add Notebook (Smart Add)

When user provides URL without metadata details:

```bash
# Step 1: Discover content by querying the notebook
bun run $PAI_DIR/skills/NotebookLM/Tools/AskQuestion.ts \
  --question "What is the content of this notebook? What topics are covered? Provide a complete overview." \
  --notebook-url "https://notebooklm.google.com/notebook/..."

# Step 2: Use discovered information to add
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts add \
  --url "https://notebooklm.google.com/notebook/..." \
  --name "Descriptive name based on content" \
  --description "Description based on discovered content" \
  --topics "topic1,topic2,topic3"
```

### 3B. Add Notebook (Manual)

When user provides all metadata:

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts add \
  --url "https://notebooklm.google.com/notebook/..." \
  --name "User-provided name" \
  --description "User-provided description" \
  --topics "user,provided,topics"
```

**NEVER guess or use generic descriptions!** Always use Smart Add if details unknown.

### 4. Search Notebooks

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts search --query "keyword"
```

### 5. Activate Notebook

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts activate --id <notebook-id>
```

### 6. Remove Notebook

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts remove --id <notebook-id>
```

### 7. View Statistics

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts stats
```

## Error Handling

| Error | Action |
|-------|--------|
| Not authenticated | Invoke Authenticate workflow |
| Invalid URL | Ask user to verify NotebookLM URL format |
| Missing metadata | Use Smart Add to discover content |
| Duplicate notebook | Inform user notebook already exists |

## Add Options Reference

| Option | Required | Description |
|--------|----------|-------------|
| `--url` | Yes | NotebookLM URL |
| `--name` | Yes | Descriptive name |
| `--description` | Yes | What the notebook contains |
| `--topics` | Yes | Comma-separated topics for search |

## Completion Criteria

- Notebook library operation completed successfully
- User informed of result
- Library state updated
