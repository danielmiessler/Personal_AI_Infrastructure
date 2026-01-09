# mai-cicd-skill Installation

User-facing skill for CI/CD pipeline management. Provides CLI tools and workflows for managing pipelines across GitHub Actions, GitLab CI, and other CI/CD platforms.

## Prerequisites

- **Bun** v1.0.0 or later
- **mai-cicd-core** pack installed (provides core interfaces)
- **At least one CI/CD adapter** installed:
  - `mai-github-cicd-adapter` for GitHub Actions
  - `mai-gitlab-cicd-adapter` for GitLab CI
  - `mai-mock-cicd-adapter` for testing
- **Authentication token** for your CI/CD platform (GitHub or GitLab)

---

## Step 1: Install Dependencies (mai-cicd-core)

This skill depends on `mai-cicd-core`. Ensure it's installed first:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-core"
bun install
```

---

## Step 2: Install the Skill Pack Dependencies

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-skill"
bun install
```

This installs:
- `mai-cicd-core` (linked from local Packs directory)
- `bun-types` - TypeScript types for Bun runtime
- `typescript` - TypeScript compiler

---

## Step 3: Install a CI/CD Adapter

Install at least one adapter to connect to your CI/CD platform:

```bash
# For GitHub Actions
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-github-cicd-adapter"
bun install

# OR for GitLab CI
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-gitlab-cicd-adapter"
bun install
```

---

## Step 4: Configure Provider

Create or update the providers configuration file:

```bash
mkdir -p ~/.config/kai

cat > ~/.config/kai/providers.yaml << 'EOF'
domains:
  cicd:
    primary: github    # or 'gitlab'
    fallback: gitlab   # optional
    adapters:
      github:
        # Token from GITHUB_TOKEN env or keychain
      gitlab:
        host: gitlab.com
        # Token from GITLAB_TOKEN env or keychain
EOF
```

---

## Step 5: Configure Authentication

Set up authentication for your CI/CD platform:

### Option A: Environment Variable

```bash
# For GitHub Actions
export GITHUB_TOKEN="your-github-personal-access-token"

# For GitLab CI
export GITLAB_TOKEN="your-gitlab-personal-access-token"
```

### Option B: macOS Keychain (Recommended)

```bash
# Store GitHub token in Keychain
security add-generic-password -s "github-token" -a "claude-code" -w "your-token"

# Store GitLab token in Keychain
security add-generic-password -s "gitlab-token" -a "claude-code" -w "your-token"
```

---

## Step 6: Verify Installation

See `VERIFY.md` for comprehensive verification steps, or run the quick test:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-skill"

# Check that tools show usage
bun run Tools/pipelines.ts 2>&1 | grep -q "Usage:" && echo "pipelines.ts OK"
bun run Tools/runs.ts 2>&1 | grep -q "Usage:" && echo "runs.ts OK"
bun run Tools/trigger.ts 2>&1 | grep -q "Usage:" && echo "trigger.ts OK"

# Test health check (requires configured provider)
bun run Tools/health.ts
```

---

## Troubleshooting

### "Cannot find package 'mai-cicd-core'"

The skill depends on `mai-cicd-core`. Ensure it exists at `../mai-cicd-core`:

```bash
ls "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-core"
```

Then reinstall dependencies:
```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-skill"
bun install
```

### "No provider configured"

Create a providers.yaml file as shown in Step 4.

### "Authentication failed"

Verify your token is set correctly:

```bash
# Check environment variable
echo $GITHUB_TOKEN | head -c 10  # Should show first 10 chars

# Or check Keychain
security find-generic-password -s "github-token" -a "claude-code" -w 2>/dev/null && echo "Token found"
```

Ensure your token has the required scopes:
- **GitHub**: `repo`, `workflow` (for triggering workflows)
- **GitLab**: `api`, `read_api`

### "Adapter not found"

Ensure you've installed at least one adapter pack:

```bash
ls "${PAI_PACKS:-$HOME/PAI/Packs}"/mai-*-cicd-adapter/
```

---

## File Locations

After installation, the pack structure should be:

```
mai-cicd-skill/
├── Tools/                    # CLI tools
│   ├── artifacts.ts          # List/download artifacts
│   ├── health.ts             # Provider health check
│   ├── logs.ts               # View job logs
│   ├── pipelines.ts          # List pipelines
│   ├── run.ts                # Get run details
│   ├── runs.ts               # List runs
│   └── trigger.ts            # Trigger pipeline
├── Workflows/                # Workflow documentation
│   ├── ListRuns.md
│   ├── TriggerPipeline.md
│   ├── ViewLogs.md
│   ├── PipelineOverview.md
│   └── DownloadArtifacts.md
├── package.json
├── SKILL.md                  # Skill definition
├── README.md
├── INSTALL.md
└── VERIFY.md
```

---

## Usage Examples

After installation, use the CLI tools:

```bash
cd "${PAI_PACKS:-$HOME/PAI/Packs}/mai-cicd-skill"

# List pipelines for a repository
bun run Tools/pipelines.ts owner/repo

# List recent runs
bun run Tools/runs.ts owner/repo --limit 10

# Get run details with jobs
bun run Tools/run.ts owner/repo 12345 --jobs

# Trigger a pipeline
bun run Tools/trigger.ts owner/repo ci.yml --branch main

# View job logs
bun run Tools/logs.ts owner/repo 67890 --tail 100

# List artifacts
bun run Tools/artifacts.ts owner/repo 12345

# Download artifact
bun run Tools/artifacts.ts owner/repo 12345 --download artifact-id --output ./build.zip
```

---

## Next Steps

After installation:

1. **Test with a real repository**: Run `bun run Tools/runs.ts your/repo` to verify connectivity
2. **Explore workflows**: Read the workflow docs in `Workflows/` for common use cases
3. **Integrate with PAI**: The skill will be automatically discovered by Claude Code when the CICD skill is loaded
