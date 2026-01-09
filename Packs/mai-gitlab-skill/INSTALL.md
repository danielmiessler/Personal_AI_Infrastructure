# GitLab Skill Installation

Direct GitLab REST API integration with CLI-first design for DevOps workflows. Provides repository management, CI/CD pipeline monitoring, issue tracking, and merge request workflows.

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **macOS** (for Keychain authentication)
- **GitLab Personal Access Token** with `api` scope
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Verify Environment

```bash
# Check Bun is installed
bun --version

# Check PAI directory
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"

# Check for existing token
security find-generic-password -s "gitlab-token" -a "claude-code" -w 2>/dev/null && echo "Token found in Keychain" || echo "Token NOT in Keychain - setup required"
```

---

## Step 2: Create GitLab Personal Access Token

1. Go to GitLab: **User Settings > Access Tokens**
2. Or navigate directly to: `https://gitlab.com/-/user_settings/personal_access_tokens`
3. Enter a token name (e.g., "PAI GitLab Skill")
4. Set expiration date
5. Select scopes:
   - `api` - Full API access (required for write operations)
   - Or `read_api` for read-only access
6. Click **Create personal access token**
7. Copy the token (starts with `glpat-`)

---

## Step 3: Store Token in macOS Keychain

```bash
# Store token securely in Keychain (recommended)
security add-generic-password -s "gitlab-token" -a "claude-code" -w "glpat-your_token_here"
```

**Alternative: Environment Variable**
```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export GITLAB_TOKEN="glpat-your_token_here"
```

---

## Step 4: Configure Self-Hosted GitLab (Optional)

For self-hosted GitLab instances, set the API URL:

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export GITLAB_URL="https://gitlab.example.com/api/v4"
```

Default is `https://gitlab.com/api/v4`.

---

## Step 5: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

mkdir -p "$PAI_DIR/skills/GitLab/Tools"
mkdir -p "$PAI_DIR/skills/GitLab/Workflows"
mkdir -p "$PAI_DIR/skills/GitLab/Templates"
```

---

## Step 6: Copy Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="/path/to/mai-gitlab-skill"  # Update with actual pack location

# Copy skill definition
cp "$PACK_DIR/SKILL.md" "$PAI_DIR/skills/GitLab/"

# Copy tools (10 CLI tools)
cp "$PACK_DIR/Tools/"*.ts "$PAI_DIR/skills/GitLab/Tools/"

# Copy workflows
cp "$PACK_DIR/Workflows/"*.md "$PAI_DIR/skills/GitLab/Workflows/"

# Copy templates
cp "$PACK_DIR/Templates/"*.yml "$PAI_DIR/skills/GitLab/Templates/"

# Copy config files
cp "$PACK_DIR/package.json" "$PAI_DIR/skills/GitLab/"
cp "$PACK_DIR/tsconfig.json" "$PAI_DIR/skills/GitLab/"
```

**Manual alternative:** Copy each file from this pack's directories to the corresponding location under `$PAI_DIR/skills/GitLab/`.

---

## Step 7: Install Dependencies

```bash
cd "${PAI_DIR:-$HOME/.config/pai}/skills/GitLab"
bun install
```

---

## Step 8: Verify Installation

See [VERIFY.md](./VERIFY.md) for the complete verification checklist.

**Quick verification:**

```bash
PACK_DIR="${PAI_DIR:-$HOME/.config/pai}/skills/GitLab"

# Test connection
bun run "$PACK_DIR/Tools/Client.ts" ping

# List your projects
bun run "$PACK_DIR/Tools/Repositories.ts" list --owned --limit 5
```

**Expected ping output:**
```json
{
  "success": true,
  "message": "Connected to GitLab as Your Name (@username)",
  "baseUrl": "https://gitlab.com/api/v4"
}
```

---

## Troubleshooting

### "GitLab token not found"

1. Verify token exists in Keychain:
```bash
security find-generic-password -s "gitlab-token" -a "claude-code" -w
```

2. Re-add if missing:
```bash
security add-generic-password -s "gitlab-token" -a "claude-code" -w "glpat-your_token"
```

3. Or set environment variable:
```bash
export GITLAB_TOKEN="glpat-your_token"
```

### "401 Unauthorized" errors

1. Token may be expired - generate a new one on GitLab
2. Token may be revoked - check GitLab Access Tokens page

### "403 Forbidden" errors

Your token lacks required scopes. Ensure it has `api` scope for write operations.

### "404 Not Found" errors

1. Project path may be incorrect - use format `group/project` or numeric ID
2. You may not have access to the project

### Self-hosted GitLab connection issues

1. Verify `GITLAB_URL` is set correctly:
```bash
echo $GITLAB_URL  # Should be https://your-gitlab.com/api/v4
```

2. Check that your GitLab instance is accessible
3. Ensure SSL certificates are valid

### Command not found errors

Ensure you're running from the correct directory:
```bash
cd "${PAI_DIR:-$HOME/.config/pai}/skills/GitLab"
bun run Tools/Client.ts ping
```

---

## File Locations

After installation:

```
$PAI_DIR/skills/GitLab/
├── SKILL.md              # Skill definition
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── Tools/
│   ├── Client.ts         # Connection/auth client
│   ├── Repositories.ts   # Project management
│   ├── Files.ts          # Repository file operations
│   ├── Branches.ts       # Branch management
│   ├── Issues.ts         # Issue tracking
│   ├── MergeRequests.ts  # MR lifecycle
│   ├── Pipelines.ts      # Pipeline management
│   ├── Jobs.ts           # Job operations
│   ├── Schedules.ts      # Scheduled pipelines
│   └── Variables.ts      # CI/CD variables
├── Workflows/
│   ├── CodeReview.md     # MR review workflow
│   ├── IssueTracking.md  # Issue management
│   ├── CIDebugging.md    # Pipeline debugging
│   ├── BranchOps.md      # Branch operations
│   └── ReleaseMgmt.md    # Release management
└── Templates/
    └── *.yml             # CI/CD templates
```
