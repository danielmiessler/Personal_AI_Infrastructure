# GitLab Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `$PACK_DIR/` exists (where you installed the pack)
- [ ] `$PACK_DIR/SKILL.md` exists
- [ ] `$PACK_DIR/Tools/` contains 10 .ts files
- [ ] `$PACK_DIR/Templates/` contains 8 .yml files

```bash
PACK_DIR="/path/to/mai-gitlab-skill"

echo "Checking directories..."
ls -la "$PACK_DIR/"
echo ""
echo "Tools:"
ls "$PACK_DIR/Tools/"
echo ""
echo "Templates:"
ls "$PACK_DIR/Templates/"
```

**Expected Tools (10):**
- Branches.ts
- Client.ts
- Files.ts
- Issues.ts
- Jobs.ts
- MergeRequests.ts
- Pipelines.ts
- Repositories.ts
- Schedules.ts
- Variables.ts

---

## Dependencies

- [ ] Bun runtime installed
- [ ] Node modules installed

```bash
# Check Bun
bun --version && echo "Bun OK"

# Install dependencies
cd "$PACK_DIR" && bun install
```

---

## Authentication

- [ ] GitLab API token stored in macOS Keychain OR environment variable

**Option 1: macOS Keychain (recommended)**
```bash
# Store token
security add-generic-password -s "gitlab-token" -a "claude-code" -w "<your-token>"

# Verify token exists
security find-generic-password -s "gitlab-token" -a "claude-code" -w && echo "Token found in Keychain"
```

**Option 2: Environment Variable**
```bash
export GITLAB_TOKEN=<your-token>
echo $GITLAB_TOKEN | head -c 10 && echo "... Token set"
```

**Token Permissions:**
- Create at: GitLab > User Settings > Access Tokens
- Required scope: `api` (or `read_api` for read-only)

---

## Connection Test

- [ ] Ping succeeds

```bash
PACK_DIR="/path/to/mai-gitlab-skill"
bun run "$PACK_DIR/Tools/Client.ts" ping
```

**Expected:**
```json
{
  "success": true,
  "message": "Connected to GitLab as Your Name (@username)",
  "baseUrl": "https://gitlab.com/api/v4",
  "user": {
    "id": 12345,
    "username": "username",
    "name": "Your Name",
    "web_url": "https://gitlab.com/username"
  }
}
```

---

## Tool Tests

### Repositories Tool
- [ ] Can list projects

```bash
bun run "$PACK_DIR/Tools/Repositories.ts" list --owned --limit 5
```

### Branches Tool
- [ ] Can list branches (requires a project)

```bash
bun run "$PACK_DIR/Tools/Branches.ts" list <project-path-or-id>
```

### Issues Tool
- [ ] Can list issues (requires a project)

```bash
bun run "$PACK_DIR/Tools/Issues.ts" list <project-path-or-id> --state opened --limit 5
```

### MergeRequests Tool
- [ ] Can list merge requests (requires a project)

```bash
bun run "$PACK_DIR/Tools/MergeRequests.ts" list <project-path-or-id> --state opened --limit 5
```

### Pipelines Tool
- [ ] Can list pipelines (requires a project with CI/CD)

```bash
bun run "$PACK_DIR/Tools/Pipelines.ts" list <project-path-or-id> --limit 5
```

### Jobs Tool
- [ ] Can list jobs (requires a pipeline ID)

```bash
bun run "$PACK_DIR/Tools/Jobs.ts" list <project-path-or-id> --pipeline <pipeline-id>
```

### Variables Tool
- [ ] Can list CI/CD variables (requires a project)

```bash
bun run "$PACK_DIR/Tools/Variables.ts" list <project-path-or-id>
```

### Schedules Tool
- [ ] Can list scheduled pipelines (requires a project)

```bash
bun run "$PACK_DIR/Tools/Schedules.ts" list <project-path-or-id>
```

### Files Tool
- [ ] Can list repository tree (requires a project)

```bash
bun run "$PACK_DIR/Tools/Files.ts" tree <project-path-or-id>
```

---

## Self-Hosted GitLab (Optional)

- [ ] Custom GitLab URL configured

```bash
export GITLAB_URL=https://gitlab.example.com/api/v4

# Test connection to self-hosted instance
bun run "$PACK_DIR/Tools/Client.ts" ping
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | [ ] |
| Bun runtime installed | [ ] |
| Dependencies installed | [ ] |
| API token configured | [ ] |
| Ping succeeds | [ ] |
| Repositories tool works | [ ] |
| Branches tool works | [ ] |
| Issues tool works | [ ] |
| MergeRequests tool works | [ ] |
| Pipelines tool works | [ ] |

**Minimum required:** Directory structure, Bun, dependencies, token, and ping must pass.

**Project-specific tools:** Branches, Issues, MergeRequests, Pipelines, Jobs, Variables, Schedules, and Files require an existing project to test against.

---

## Quick Full Test

Run all verifications at once (update PACK_DIR and PROJECT first):

```bash
PACK_DIR="/path/to/mai-gitlab-skill"
PROJECT="your-group/your-project"  # or numeric ID

echo "=== GitLab Skill Verification ==="
echo ""

echo "1. Ping..."
bun run "$PACK_DIR/Tools/Client.ts" ping && echo "Ping OK" || echo "Ping FAILED"
echo ""

echo "2. Repositories..."
bun run "$PACK_DIR/Tools/Repositories.ts" list --owned --limit 3 | head -20 && echo "Repositories OK" || echo "Repositories FAILED"
echo ""

echo "3. Branches (project: $PROJECT)..."
bun run "$PACK_DIR/Tools/Branches.ts" list "$PROJECT" --limit 3 | head -20 && echo "Branches OK" || echo "Branches FAILED"
echo ""

echo "4. Issues (project: $PROJECT)..."
bun run "$PACK_DIR/Tools/Issues.ts" list "$PROJECT" --limit 3 | head -20 && echo "Issues OK" || echo "Issues FAILED"
echo ""

echo "5. MergeRequests (project: $PROJECT)..."
bun run "$PACK_DIR/Tools/MergeRequests.ts" list "$PROJECT" --limit 3 | head -20 && echo "MergeRequests OK" || echo "MergeRequests FAILED"
echo ""

echo "6. Pipelines (project: $PROJECT)..."
bun run "$PACK_DIR/Tools/Pipelines.ts" list "$PROJECT" --limit 3 | head -20 && echo "Pipelines OK" || echo "Pipelines FAILED"
echo ""

echo "7. Files (project: $PROJECT)..."
bun run "$PACK_DIR/Tools/Files.ts" tree "$PROJECT" --limit 10 | head -20 && echo "Files OK" || echo "Files FAILED"
echo ""

echo "=== Verification Complete ==="
```

---

## Troubleshooting

### Token not found
```
GitLab token not found. Set up with:
  Keychain: security add-generic-password -s "gitlab-token" -a "claude-code" -w "<token>"
  Or env: export GITLAB_TOKEN=<token>
```
**Fix:** Add your GitLab Personal Access Token using one of the methods above.

### 401 Unauthorized
```
GitLab API Error (401): Unauthorized
```
**Fix:** Your token is invalid or expired. Generate a new token at GitLab > User Settings > Access Tokens.

### 403 Forbidden
```
GitLab API Error (403): Forbidden
```
**Fix:** Your token lacks required permissions. Ensure it has `api` scope.

### 404 Not Found
```
GitLab API Error (404): Not Found
```
**Fix:** The project path or ID is incorrect, or you don't have access to the project.

### Connection refused
```
Cannot connect to GitLab at https://gitlab.com/api/v4
```
**Fix:** Check your network connection. For self-hosted GitLab, verify GITLAB_URL is correct.
