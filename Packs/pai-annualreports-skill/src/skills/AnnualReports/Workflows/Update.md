# Update Workflow

**Fetch latest report sources from the upstream awesome-annual-security-reports repository.**

---

## Trigger Words

- "update annual reports"
- "update report sources"
- "sync reports"
- "fetch new reports"

---

## Steps

### Step 1: Run Update Tool

Execute the UpdateSources tool:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts
```

### Step 2: Review Changes

The tool will report:
- Number of new reports found
- Number of removed reports
- Number of updated URLs

### Step 3: Dry Run Option

For preview without changes:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts --dry-run
```

### Step 4: View Diff

To see detailed changes:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts --diff
```

---

## Output Format

Report to user:

```
Updated annual security report sources:
- New reports: [count]
- Removed reports: [count]
- Total sources: [count]
- Last updated: [date]

Notable additions:
- [vendor]: [report name]
- [vendor]: [report name]

Source: https://github.com/jacobdjwilson/awesome-annual-security-reports
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Network failure | Report connectivity issue, suggest retry |
| Parse error | Report parsing failure, link to upstream for manual review |
| Write permission | Report permission error, suggest checking file permissions |
