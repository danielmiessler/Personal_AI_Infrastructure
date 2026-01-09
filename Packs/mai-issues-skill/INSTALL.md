# Issues Skill Installation

User-facing workflows for issue and task management. Works across multiple backends (Joplin, Linear, Jira) through the mai-issues-core adapter system.

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)
- **mai-issues-core** package (peer dependency)
- **At least one issues adapter** (mai-joplin-issues-adapter, mai-linear-adapter, etc.)
- **Backend service running** (e.g., Joplin Desktop for Joplin adapter)

---

## Step 1: Verify Environment

```bash
# Check Bun is installed
bun --version

# Check PAI directory
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"

# Check for providers.yaml
PAI_CONFIG="${PAI_DIR:-$HOME/.config/pai}/providers.yaml"
[ -f "$PAI_CONFIG" ] && echo "providers.yaml found" || echo "providers.yaml NOT found - configuration required"
```

---

## Step 2: Configure Backend

Add to `providers.yaml` (or create if it doesn't exist):

```yaml
domains:
  issues:
    primary: joplin        # Your preferred backend
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
```

**Other backend options:**

```yaml
# Linear
adapters:
  linear:
    teamId: your-team-id
    # Token via keychain: security add-generic-password -s "linear-token" -a "claude-code" -w "lin_api_..."

# Jira
adapters:
  jira:
    host: your-company.atlassian.net
    email: your-email@company.com
    projectKey: PROJ
    # Token via keychain: security add-generic-password -s "jira-token" -a "claude-code" -w "..."
```

---

## Step 3: Set Up Backend Authentication

### For Joplin (default)

1. Open Joplin Desktop
2. Go to: **Tools > Options > Web Clipper**
3. Enable: **Enable Web Clipper Service**
4. Copy the **Authorization Token**
5. Store in Keychain:

```bash
security add-generic-password -s "joplin-token" -a "claude-code" -w "<your-token>"
```

### For Linear

1. Go to Linear: **Settings > API > Personal API Keys**
2. Create a new key
3. Store in Keychain:

```bash
security add-generic-password -s "linear-token" -a "claude-code" -w "lin_api_..."
```

---

## Step 4: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

mkdir -p "$PAI_DIR/skills/Issues/Tools"
mkdir -p "$PAI_DIR/skills/Issues/Workflows"
```

---

## Step 5: Copy Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="/path/to/mai-issues-skill"  # Update with actual pack location

# Copy skill definition
cp "$PACK_DIR/SKILL.md" "$PAI_DIR/skills/Issues/"

# Copy tools
cp "$PACK_DIR/Tools/"*.ts "$PAI_DIR/skills/Issues/Tools/"

# Copy workflows
cp "$PACK_DIR/Workflows/"*.md "$PAI_DIR/skills/Issues/Workflows/"

# Copy config files
cp "$PACK_DIR/package.json" "$PAI_DIR/skills/Issues/"
cp "$PACK_DIR/tsconfig.json" "$PAI_DIR/skills/Issues/"
```

**Manual alternative:** Copy each file from this pack's directories to the corresponding location under `$PAI_DIR/skills/Issues/`.

---

## Step 6: Install Dependencies

```bash
cd "${PAI_DIR:-$HOME/.config/pai}/skills/Issues"
bun install
```

---

## Step 7: Verify Installation

See [VERIFY.md](./VERIFY.md) for the complete verification checklist.

**Quick verification:**

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/Issues"

# Health check - verifies backend connectivity
bun run "$PACK_DIR/Tools/health.ts"

# List issues
bun run "$PACK_DIR/Tools/list.ts" --limit 5
```

**Expected health check output:**
```json
{
  "healthy": true,
  "message": "Issues provider connected",
  "backend": "joplin"
}
```

---

## Troubleshooting

### "No provider configured"

1. Ensure `providers.yaml` exists at `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`
2. Verify it has an `issues` domain configured:

```yaml
domains:
  issues:
    primary: joplin
    adapters:
      joplin:
        port: 41184
```

### "mai-issues-core not found"

The skill depends on mai-issues-core:
```bash
cd "$PACK_DIR" && bun install
```

### "Backend not running" / Connection refused

**For Joplin:**
1. Ensure Joplin Desktop is running
2. Verify Web Clipper is enabled: Tools > Options > Web Clipper
3. Check the port matches config (default: 41184)

**For Linear:**
1. Check internet connectivity
2. Verify API token is valid

### "401 Unauthorized" errors

Token may be invalid or expired:
1. Verify token exists: `security find-generic-password -s "joplin-token" -a "claude-code"`
2. Re-add if needed: `security add-generic-password -s "joplin-token" -a "claude-code" -w "<token>"`

### List returns empty results

1. Check that your backend has issues/tasks created
2. For Joplin, ensure tasks exist in the configured `defaultNotebook`
3. Try without filters: `bun run Tools/list.ts`

---

## CLI Tools Reference

```bash
# List issues
bun run Tools/list.ts [--status open|done|all] [--format table|json] [--limit N]

# Get issue details
bun run Tools/get.ts <issue-id>

# Create issue
bun run Tools/create.ts "Title" [--type task|bug|feature] [--priority high|medium|low]

# Update issue
bun run Tools/update.ts <issue-id> [--status done] [--priority low]

# Search issues
bun run Tools/search.ts "query" [--limit 20]

# Health check
bun run Tools/health.ts
```

---

## File Locations

After installation:

```
$PAI_DIR/skills/Issues/
├── SKILL.md              # Skill definition
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── Tools/
│   ├── health.ts         # Backend health check
│   ├── list.ts           # List/query issues
│   ├── get.ts            # Get issue details
│   ├── create.ts         # Create new issue
│   ├── update.ts         # Update existing issue
│   └── search.ts         # Full-text search
└── Workflows/
    ├── CreateIssue.md    # Create issue workflow
    ├── ListIssues.md     # Query issues workflow
    ├── UpdateIssue.md    # Update issue workflow
    ├── SearchIssues.md   # Search workflow
    └── ProjectOverview.md # Project summary workflow
```
