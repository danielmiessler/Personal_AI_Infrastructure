# PAI Context Skill - Deployment & Testing

Docker-based tooling for developing and validating the context skill contribution.

## Two Modes

### 1️⃣ Development Mode — Test Your Working Code

Use this while developing. Mounts your current working directory.

```bash
# First time setup
make setup

# Run tests
make test-unit
make test-cli
make shell      # Interactive debugging
```

### 2️⃣ Clean Room Mode — Validate Contribution for New Users

**This is the important one for contribution testing.**

Simulates a **new user** who:
1. Clones fresh from `danielmiessler/Personal_AI_Infrastructure` (upstream)
2. Applies your `feature/vanilla-context-skill` branch (your contribution)
3. Runs the install scripts
4. Tests everything works

```bash
# Build clean room (clones upstream + merges your vanilla branch)
make cleanroom-build SKILL_BRANCH=feature/vanilla-context-skill

# Run validation
make cleanroom-test

# Or build + test in one command
make cleanroom-full
```

**This answers:** "Will my contribution work for someone installing PAI fresh?"

---

## Branching Strategy

```
danielmiessler/Personal_AI_Infrastructure
       │
       │  (upstream - vanilla PAI)
       │
       └──► mellanon/pai-1.2 (your fork)
                  │
                  ├── main
                  │     │
                  │     └── feature/context-system
                  │           │
                  │           │  (your dev work - may have personal stuff)
                  │           │
                  │           └── feature/vanilla-context-skill
                  │                 │
                  │                 │  (CLEAN contribution - no personal data)
                  │                 │
                  │                 ▼
                  │        ┌─────────────────────────┐
                  │        │     CLEAN ROOM TEST     │
                  │        │                         │
                  │        │  upstream/main          │
                  │        │       +                 │
                  │        │  vanilla-context-skill  │
                  │        │       =                 │
                  │        │  working system? ✓     │
                  │        └─────────────────────────┘
                  │                 │
                  │                 ▼
                  │        Submit PR to upstream
                  │
```

### Branch Purposes

| Branch | Purpose |
|--------|---------|
| `upstream/main` | Daniel Miessler's source PAI repo |
| `origin/main` | Your fork's main (synced with upstream) |
| `feature/context-system` | Your active development (may have personal configs) |
| `feature/vanilla-context-skill` | **CLEAN** contribution branch (sanitized for upstream) |

---

## Clean Room Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `UPSTREAM_REPO` | `danielmiessler/Personal_AI_Infrastructure` | The upstream PAI repo |
| `SKILL_REPO` | `mellanon/pai-1.2` | Your fork containing the skill |
| `SKILL_BRANCH` | `feature/vanilla-context-skill` | The clean contribution branch |

Override via command line:
```bash
make cleanroom-build SKILL_BRANCH=my-experimental-branch
make cleanroom-build SKILL_REPO=otherfork/pai
```

---

## Development Mode Details

### Persistent Volumes

Development mode uses Docker named volumes for fast iteration:

| Volume | Purpose |
|--------|---------|
| `pai-context-bun-cache` | Bun dependency cache |
| `pai-context-node-modules-obs` | obs CLI node_modules |
| `pai-context-node-modules-ingest` | ingest CLI node_modules |
| `pai-context-test-output` | Test results and history |

**To reset:**
```bash
make clean-volumes    # Remove all persistent data
make clean-all        # Remove image + volumes
```

### Available Commands

| Command | Mode | Description |
|---------|------|-------------|
| `make setup` | Dev | First-time setup (build + install + validate) |
| `make build` | Dev | Build development image |
| `make install` | Dev | Install deps to persistent volumes |
| `make validate` | Dev | Quick smoke test |
| `make test-unit` | Dev | Unit tests only |
| `make test-cli` | Dev | CLI tests only |
| `make test` | Dev | Run all tests |
| `make shell` | Dev | Interactive shell |
| `make cleanroom-build` | Clean | Build clean room image |
| `make cleanroom-test` | Clean | Run clean room validation |
| `make cleanroom-full` | Clean | Build + test clean room |
| `make cleanroom-shell` | Clean | Shell in clean room |

---

## Test Vault

The `test-vault/` directory contains minimal fixture notes:

```
test-vault/
├── project-alpha-kickoff.md    # Meeting notes (scope/work)
├── api-design-notes.md         # Technical docs (scope/work)
└── personal-journal.md         # Private note (scope/private)
```

---

## Running with Claude Code

Both modes include Claude Code CLI for acceptance tests:

```bash
# Development mode
export ANTHROPIC_API_KEY=your-key
make test-acceptance

# Clean room mode
docker run --rm -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY pai-context-cleanroom /bin/bash -c "..."
```

---

## CI/CD Integration

### For Clean Room Testing (Contribution Validation)

```yaml
name: Validate Skill Contribution

on:
  push:
    branches: [feature/vanilla-context-skill]

jobs:
  cleanroom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and test clean room
        working-directory: bin/ingest/deployment
        run: |
          make cleanroom-build \
            SKILL_REPO=${{ github.repository }} \
            SKILL_BRANCH=${{ github.ref_name }}
          make cleanroom-test
```

---

## Directory Structure

```
deployment/
├── Dockerfile              # Development mode image
├── Dockerfile.cleanroom    # Clean room image (upstream + skill)
├── docker-compose.yml      # Full stack with mock services
├── Makefile                # All commands
├── entrypoint.sh           # Dev container entrypoint
├── validate.sh             # Dev validation script
├── validate-cleanroom.sh   # Clean room validation script
├── run-tests.sh            # Test runner
├── test-vault/             # Minimal fixture vault
└── README.md               # This file
```
