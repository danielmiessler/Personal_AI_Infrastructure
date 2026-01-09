# CI/CD Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `mai-cicd-skill/` exists in Packs directory
- [ ] `mai-cicd-skill/SKILL.md` exists
- [ ] `mai-cicd-skill/Tools/` contains 7 .ts files
- [ ] `mai-cicd-skill/package.json` exists
- [ ] Dependencies are installed (`node_modules/` exists)

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"

echo "Checking directories..."
ls -la "$PACK_DIR/"
echo ""
echo "Tools:"
ls "$PACK_DIR/Tools/"
echo ""
echo "Expected: artifacts.ts, health.ts, logs.ts, pipelines.ts, run.ts, runs.ts, trigger.ts"
```

---

## Dependencies

- [ ] Dependencies installed via bun

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
cd "$PACK_DIR" && bun install && echo "Dependencies OK"
```

---

## Configuration

- [ ] Provider configuration exists (at least one of):
  - `~/.config/kai/providers.yaml`
  - `./providers.yaml`

```bash
# Check for configuration file
[ -f "$HOME/.config/kai/providers.yaml" ] && echo "Found: ~/.config/kai/providers.yaml" || echo "Not found: ~/.config/kai/providers.yaml"
[ -f "./providers.yaml" ] && echo "Found: ./providers.yaml" || echo "Not found: ./providers.yaml"
```

---

## Authentication

- [ ] GitHub token available (for GitHub Actions)
- [ ] GitLab token available (for GitLab CI) - optional

```bash
# Check for GitHub token
[ -n "$GITHUB_TOKEN" ] && echo "GITHUB_TOKEN is set" || echo "GITHUB_TOKEN not set"

# Check macOS Keychain (optional)
security find-generic-password -s "github-token" -a "claude-code" -w 2>/dev/null && echo "GitHub token found in Keychain" || echo "No GitHub token in Keychain"
```

---

## Tool Help Tests

Each tool should display help when run without required arguments.

### health.ts
- [ ] Runs without error

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
bun run "$PACK_DIR/Tools/health.ts"
```

**Expected:** Health status output or provider configuration error

### pipelines.ts
- [ ] Shows usage when run without arguments

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
bun run "$PACK_DIR/Tools/pipelines.ts" 2>&1
```

**Expected:**
```
Usage: bun run pipelines.ts <repo> [--format table|json]

Example: bun run pipelines.ts owner/repo
```

### runs.ts
- [ ] Shows usage when run without arguments

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
bun run "$PACK_DIR/Tools/runs.ts" 2>&1
```

**Expected:**
```
Usage: bun run runs.ts <repo> [options]

Options:
  --status <status>   Filter by status (pending, queued, running, completed)
  --branch <name>     Filter by branch
  --limit <num>       Limit results (default: 20)
  --format <fmt>      Output format (table, json)

Example: bun run runs.ts owner/repo --status running
```

### run.ts
- [ ] Shows usage when run without arguments

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
bun run "$PACK_DIR/Tools/run.ts" 2>&1
```

**Expected:**
```
Usage: bun run run.ts <repo> <run-id> [options]

Options:
  --jobs              Include job details
  --format <fmt>      Output format (table, json)

Example: bun run run.ts owner/repo 12345 --jobs
```

### trigger.ts
- [ ] Shows usage when run without arguments

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
bun run "$PACK_DIR/Tools/trigger.ts" 2>&1
```

**Expected:**
```
Usage: bun run trigger.ts <repo> <pipeline-id> [options]

Options:
  --branch <name>     Branch to run on (default: main)
  --input KEY=VALUE   Pipeline input (can be repeated)
  --format <fmt>      Output format (table, json)

Examples:
  bun run trigger.ts owner/repo ci.yml
  bun run trigger.ts owner/repo deploy --branch develop
  bun run trigger.ts owner/repo deploy --input DEPLOY_ENV=staging
```

### logs.ts
- [ ] Shows usage when run without arguments

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
bun run "$PACK_DIR/Tools/logs.ts" 2>&1
```

**Expected:**
```
Usage: bun run logs.ts <repo> <job-id> [options]

Options:
  --tail <lines>      Show only last N lines

Example: bun run logs.ts owner/repo 67890 --tail 100
```

### artifacts.ts
- [ ] Shows usage when run without arguments

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
bun run "$PACK_DIR/Tools/artifacts.ts" 2>&1
```

**Expected:**
```
Usage: bun run artifacts.ts <repo> <run-id> [options]

Options:
  --download <id>     Download specific artifact
  --output <path>     Output path for download (default: artifact name)
  --format <fmt>      Output format (table, json)

Examples:
  bun run artifacts.ts owner/repo 12345
  bun run artifacts.ts owner/repo 12345 --download artifact-id
  bun run artifacts.ts owner/repo 12345 --download artifact-id --output ./build.zip
```

---

## Functional Tests (Requires Live Provider)

These tests require a configured CI/CD provider and valid authentication.

### List Pipelines
- [ ] Can list pipelines for a repository

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
TEST_REPO="${TEST_REPO:-owner/repo}"  # Set to your test repository

bun run "$PACK_DIR/Tools/pipelines.ts" "$TEST_REPO"
```

### List Runs
- [ ] Can list recent runs

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
TEST_REPO="${TEST_REPO:-owner/repo}"

bun run "$PACK_DIR/Tools/runs.ts" "$TEST_REPO" --limit 5
```

### Get Run Details
- [ ] Can get run details (requires valid run ID)

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
TEST_REPO="${TEST_REPO:-owner/repo}"
TEST_RUN_ID="${TEST_RUN_ID:-12345}"  # Set to a valid run ID

bun run "$PACK_DIR/Tools/run.ts" "$TEST_REPO" "$TEST_RUN_ID" --jobs
```

### JSON Output
- [ ] Tools support JSON output format

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
TEST_REPO="${TEST_REPO:-owner/repo}"

bun run "$PACK_DIR/Tools/runs.ts" "$TEST_REPO" --limit 3 --format json | head -20
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | [ ] |
| Dependencies installed | [ ] |
| Provider config exists | [ ] |
| Authentication available | [ ] |
| health.ts runs | [ ] |
| pipelines.ts shows help | [ ] |
| runs.ts shows help | [ ] |
| run.ts shows help | [ ] |
| trigger.ts shows help | [ ] |
| logs.ts shows help | [ ] |
| artifacts.ts shows help | [ ] |
| List pipelines (live) | [ ] |
| List runs (live) | [ ] |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-skill}"
TOOLS="$PACK_DIR/Tools"

echo "=== CI/CD Skill Verification ==="
echo ""

echo "1. Directory check..."
[ -d "$PACK_DIR" ] && [ -f "$PACK_DIR/SKILL.md" ] && echo "Directory OK" || echo "Directory FAILED"
echo ""

echo "2. Tools exist..."
TOOL_COUNT=$(ls "$TOOLS"/*.ts 2>/dev/null | wc -l | tr -d ' ')
[ "$TOOL_COUNT" -eq 7 ] && echo "Tools OK ($TOOL_COUNT files)" || echo "Tools FAILED (found $TOOL_COUNT, expected 7)"
echo ""

echo "3. Dependencies..."
cd "$PACK_DIR" && bun install --silent && echo "Dependencies OK" || echo "Dependencies FAILED"
echo ""

echo "4. Health check..."
bun run "$TOOLS/health.ts" 2>/dev/null && echo "Health OK" || echo "Health check requires provider config"
echo ""

echo "5. Pipelines help..."
bun run "$TOOLS/pipelines.ts" 2>&1 | grep -q "Usage:" && echo "Pipelines help OK" || echo "Pipelines help FAILED"
echo ""

echo "6. Runs help..."
bun run "$TOOLS/runs.ts" 2>&1 | grep -q "Usage:" && echo "Runs help OK" || echo "Runs help FAILED"
echo ""

echo "7. Run help..."
bun run "$TOOLS/run.ts" 2>&1 | grep -q "Usage:" && echo "Run help OK" || echo "Run help FAILED"
echo ""

echo "8. Trigger help..."
bun run "$TOOLS/trigger.ts" 2>&1 | grep -q "Usage:" && echo "Trigger help OK" || echo "Trigger help FAILED"
echo ""

echo "9. Logs help..."
bun run "$TOOLS/logs.ts" 2>&1 | grep -q "Usage:" && echo "Logs help OK" || echo "Logs help FAILED"
echo ""

echo "10. Artifacts help..."
bun run "$TOOLS/artifacts.ts" 2>&1 | grep -q "Usage:" && echo "Artifacts help OK" || echo "Artifacts help FAILED"
echo ""

echo "=== Verification Complete ==="
```

---

## Troubleshooting

### "Cannot find package 'mai-cicd-core'"

The skill depends on `mai-cicd-core`. Ensure it is installed:

```bash
cd /path/to/Packs/mai-cicd-skill
bun install
```

If using file-based dependency, ensure `mai-cicd-core` exists at `../mai-cicd-core`.

### "No provider configured"

Create a providers.yaml file:

```bash
mkdir -p ~/.config/kai
cat > ~/.config/kai/providers.yaml << 'EOF'
domains:
  cicd:
    primary: github
    adapters:
      github: {}
EOF
```

### "Authentication failed"

Set the appropriate token:

```bash
# For GitHub Actions
export GITHUB_TOKEN="your-github-token"

# For GitLab CI
export GITLAB_TOKEN="your-gitlab-token"
```

Or store in macOS Keychain:

```bash
security add-generic-password -s "github-token" -a "claude-code" -w "your-token"
```
