# Fetch Workflow

**Download specific reports on demand.**

---

## Trigger Words

- "fetch [vendor] report"
- "download [report name]"
- "get [vendor] annual report"
- "show me [vendor]'s report"

---

## Steps

### Step 1: Identify Report

Parse user request to identify:
- Vendor name
- Report name or topic

If ambiguous, search for matching reports:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts --search [term]
```

### Step 2: Confirm Report

If multiple matches found, ask user to select:

```
Found [count] matching reports:
1. [Vendor 1]: [Report 1]
2. [Vendor 2]: [Report 2]

Which report would you like to fetch?
```

### Step 3: Fetch Report

Execute FetchReport tool:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts [vendor] [report-name]
```

### Step 4: Present Results

Show user:
- Report metadata (vendor, name, URL)
- Landing page preview (first 2000 chars)
- Path to saved summary file
- Note about registration requirements

---

## Direct URL Fetch

For reports not in the database:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts --url [url]
```

---

## List Cached Reports

To see previously fetched reports:

```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts --list-cached
```

---

## Output Format

```
📄 Fetched: [Report Name]

**Vendor:** [Vendor]
**URL:** [URL]
**Summary saved:** [path]

**Preview:**
[First 500 chars of extracted text]

**Note:** Most reports require registration for full PDF download.
Visit the URL above to access the complete report.
```

---

## Common Requests

| Request | Command |
|---------|---------|
| Verizon DBIR | `FetchReport.ts verizon dbir` |
| CrowdStrike Global Threat Report | `FetchReport.ts crowdstrike "global threat"` |
| IBM Cost of Data Breach | `FetchReport.ts ibm "cost of breach"` |
| Mandiant M-Trends | `FetchReport.ts mandiant m-trends` |
| Sophos State of Ransomware | `FetchReport.ts sophos ransomware` |
