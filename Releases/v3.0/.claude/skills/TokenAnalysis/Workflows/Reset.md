# TokenAnalysis — Reset Workflow

Clears accumulated routing metrics data after user confirmation.

## Steps

### 1. Check File Existence

```bash
ls ~/.claude/MEMORY/STATE/routing-metrics.jsonl 2>/dev/null
```

**If file does not exist:**

> **No metrics data found.** Nothing to reset.
>
> Token tracking will begin automatically on your next prompt.

Stop here.

### 2. Show Current Count

```bash
wc -l ~/.claude/MEMORY/STATE/routing-metrics.jsonl
```

Report: `Found N routing events recorded since tracking began.`

### 3. Confirm with User

Use AskUserQuestion with:

- **Question:** "Clear all N recorded routing events from routing-metrics.jsonl? This cannot be undone."
- **Options:** Yes — delete the file | No — keep the data

### 4. On Confirmation (Yes)

```bash
rm ~/.claude/MEMORY/STATE/routing-metrics.jsonl
```

Report:

> **Reset complete.** All routing metrics cleared.
>
> Token tracking will resume automatically on your next prompt — the ComplexityRouter
> logs every routing decision as it happens.

### 5. On Cancellation (No)

> **Cancelled.** Your N routing events are preserved.
