# 🧠 Context Management Skill Development Plan

> **Created:** 2025-12-08
> **Updated:** 2025-12-09
> **Status:** Phase 3 Complete - Clean room validated ✅
> **Goal:** Contribute vanilla context skill to upstream PAI repo

## Executive Summary

You have a sophisticated knowledge management system (`ingest` + `obs` CLIs) in your private fork that you want to contribute back to the upstream PAI repo. The challenge is:

1. **Untangling personal customizations** from the vanilla skill
2. **Validating fresh deployments** to ensure the skill works out-of-the-box
3. **Managing the three-repo workflow** (upstream → fork → contribution)

### ✅ Completed This Session

- [x] Created `pai-contrib` public repo
- [x] Pushed sanitized `release/context-skill` to `pai-contrib:main`
- [x] Clean room build and validation passed
- [x] Renamed `context/` → `Context/` (PascalCase)
- [x] Restructured docs (removed SKILL_CONTRACT.md, added focused docs)

### 🚀 Next Steps

```bash
# 1. Sync feature branch with release changes
git checkout feature/context-system
git cherry-pick <commits-from-release>

# 2. Push feature branch
git push origin feature/context-system

# 3. Create PR to upstream
#    From: pai-contrib:main
#    To:   danielmiessler/Personal_AI_Infrastructure:main
```

---

## Current State

| Aspect | Status |
|--------|--------|
| **Private Fork** | `git@github.com:YOUR_USERNAME/pai-1.2.git` (origin) - **PRIVATE** |
| **Public Contrib Repo** | `git@github.com:YOUR_USERNAME/pai-contrib.git` - **PUBLIC** |
| **Upstream** | `https://github.com/danielmiessler/Personal_AI_Infrastructure.git` (read-only) |
| **Dev Branch** | `feature/context-system` (in private fork) |
| **Release Branch** | `release/context-skill` → pushed to `pai-contrib:main` |
| **Test Coverage** | 128 tests across 4 layers (unit, integration, CLI, acceptance) |
| **CLIs** | `ingest` (capture) + `obs` (query), both TypeScript/Bun |
| **Personal Entanglement** | Vault paths, API keys, Telegram configs, tag taxonomy |

### Why Two Repos?

The private fork contains sensitive data in various branches (personal configs, API keys, vault paths). Rather than risk exposing this by making the fork public, we use a **separate public repo** (`pai-contrib`) exclusively for sanitized contributions.

### Why `pai-contrib` (not `pai-context-skill`)?

The `pai-contrib` repo mirrors the upstream PAI structure, allowing:
- **Multiple skills** in one repo (context, future skills)
- **Easy merging** - structure matches upstream
- **Single remote** - no repo explosion per skill
- **Clean room testing** - same process for all skills

---

## Architecture: Branching & Clean Room Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTRIBUTION PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   danielmiessler/Personal_AI_Infrastructure                                 │
│          │                                                                  │
│          │  PR ◄────────────────────────────────────────┐                  │
│          │                                               │                  │
│          ▼                                               │                  │
│   YOUR_USERNAME/pai-1.2 (PRIVATE fork)                   │                  │
│          │                                               │                  │
│          ├── main (synced with upstream)                 │                  │
│          │                                               │                  │
│          ├── feature/context-system (dev - personal)     │                  │
│          │                                               │                  │
│          └── release/context-skill (sanitized)           │                  │
│                │                                         │                  │
│                │  git push public release/...:main ─────►│                  │
│                │                                         │                  │
│                ▼                                         │                  │
│   YOUR_USERNAME/pai-contrib (PUBLIC)                     │                  │
│          │                                               │                  │
│          ├── main (context skill - CLEAN)                │                  │
│          │                                               │                  │
│          └── (future: more skills)                       │                  │
│                │                                         │                  │
│                ▼                                         │                  │
│        ┌─────────────────────────┐                       │                  │
│        │     CLEAN ROOM TEST     │                       │                  │
│        │                         │                       │                  │
│        │  Clone: upstream/main   │                       │                  │
│        │  Merge: pai-contrib     │                       │                  │
│        │  Run:   install.sh      │                       │                  │
│        │  Test:  validation      │                       │                  │
│        │                         │                       │                  │
│        │  ✓ Works for new user!  │                       │                  │
│        └─────────────────────────┘                       │                  │
│                │                                         │                  │
│                └─────────────────────────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Repository Purposes

| Repository | Visibility | Purpose |
|------------|------------|---------|
| `danielmiessler/Personal_AI_Infrastructure` | Public | Upstream PAI source |
| `YOUR_USERNAME/pai-1.2` | **Private** | Your working fork with personal configs |
| `YOUR_USERNAME/pai-contrib` | **Public** | All sanitized contributions (mirrors PAI structure) |

### Branch Purposes

| Repo | Branch | Contains Personal Data? |
|------|--------|------------------------|
| `pai-1.2` | `main` | No (synced with upstream) |
| `pai-1.2` | `feature/context-system` | **Yes** (vault paths, configs) |
| `pai-1.2` | `feature/future-skill` | **Yes** (future dev work) |
| `pai-1.2` | `release/context-skill` | No (sanitized, ready to push) |
| `pai-contrib` | `main` | **No** (public, all sanitized skills) |

### `pai-contrib` Structure (Mirrors PAI)

```
pai-contrib/
├── README.md                      # Overview of all contributions
├── bin/
│   ├── ingest/                    # Context skill: capture CLI
│   │   └── docs/                  # telegram-setup.md, daemon-setup.md
│   └── obs/                       # Context skill: query CLI
├── .claude/skills/
│   └── Context/                   # Context skill definition (PascalCase)
│       ├── README.md              # Quick start guide
│       ├── SKILL.md               # Claude skill definition
│       └── workflows/             # Workflow definitions
├── shortcuts/                     # iOS Shortcuts templates
└── .github/workflows/             # CI/CD for all skills
```

### Clean Room Testing

The clean room Docker image:
1. **Clones fresh** from `danielmiessler/Personal_AI_Infrastructure`
2. **Merges** your `feature/vanilla-context-skill` branch
3. **Runs** `install.sh` as a new user would
4. **Validates** everything works

This proves your contribution is self-contained and works for new users.

---

## Phase 1: Docker Clean Room Environment ✅ COMPLETE

### Why Docker?

- **True isolation**: No contamination from host machine config
- **Reproducible**: Same environment every time
- **CI/CD ready**: Same container runs locally and in GitHub Actions
- **Fast iteration**: Run full test suite without manual setup
- **Persistent volumes**: Dependencies survive container restarts

### Docker Setup (Implemented)

Location: `bin/ingest/deployment/`

| File | Purpose |
|------|---------|
| `Dockerfile` | Clean room environment with Bun, Node.js, Claude Code CLI |
| `docker-compose.yml` | Full stack with mock services |
| `Makefile` | Convenience commands |
| `validate.sh` | Deployment validation script |
| `run-tests.sh` | Test runner for all layers |
| `test-vault/` | Minimal fixture vault (3 notes) |

### Quick Start

```bash
cd bin/ingest/deployment

# First time setup (installs deps to persistent volumes)
make setup

# Run tests
make test-unit        # Unit tests
make test-cli         # CLI tests
make ci               # CI-safe tests (no live APIs)

# Interactive development
make shell            # Bash shell in clean room

# Check persistent volumes
make volumes
```

### Persistent Volumes

| Volume | Purpose |
|--------|---------|
| `pai-context-bun-cache` | Bun dependency cache |
| `pai-context-node-modules-obs` | obs CLI dependencies |
| `pai-context-node-modules-ingest` | ingest CLI dependencies |
| `pai-context-test-output` | Test results and history |

### Verified Working

- ✅ `make validate` - Deployment validation passes
- ✅ `make test-unit` - Unit tests pass (15 tests)
- ✅ Persistent volumes survive container restarts
- ✅ Claude Code CLI installed in container

---

## Phase 2: Skill Extraction & Vanilla Branch

### Create Contribution Branch

```bash
git checkout feature/context-system
git checkout -b feature/vanilla-context-skill
```

### Identify Personal vs Vanilla Components

| Component | Type | Action |
|-----------|------|--------|
| `bin/ingest/ingest.ts` | Core | Keep, review for hardcoded paths |
| `bin/obs/obs.ts` | Core | Keep, review for hardcoded paths |
| `.claude/skills/context/SKILL.md` | Core | Keep |
| `.claude/skills/context/tag-taxonomy.md` | **Personal** | Replace with example taxonomy |
| `profiles/zettelkasten.json` | Personal | Move to `profiles/examples/` |
| `test/fixtures/*` | **Personal** | Sanitize or create synthetic fixtures |
| `.env` references | Config | Document required vars, never commit |

### Configuration Abstraction

Enhance `bin/ingest/lib/config.ts`:

```typescript
// Required: Must be set for skill to work
const REQUIRED_ENV = ['OBSIDIAN_VAULT_PATH'];

// Optional: Enhances functionality
const OPTIONAL_ENV = {
  'OPENAI_API_KEY': 'Semantic search, Vision AI',
  'TELEGRAM_BOT_TOKEN': 'Telegram ingestion',
  'TELEGRAM_CHANNEL_ID': 'Telegram ingestion',
};

export function validateConfig() {
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required config: ${missing.join(', ')}`);
    process.exit(1);
  }
  return {
    hasTelegram: !!process.env.TELEGRAM_BOT_TOKEN,
    hasSemanticSearch: !!process.env.OPENAI_API_KEY,
  };
}
```

---

## Phase 3: Test Strategy

### Test Layers

| Layer | What It Validates | External Deps | Run In CI |
|-------|-------------------|---------------|-----------|
| **Smoke** | CLIs run, help works | None | ✅ |
| **Unit** | Core logic | Mocked | ✅ |
| **Integration (mock)** | Pipeline with mock services | Mocked Telegram/OpenAI | ✅ |
| **Integration (live)** | Full pipeline | Real APIs | Manual |
| **Acceptance** | End-to-end with Claude | Claude CLI | Manual/Docker |

### Mock Services

```
test/mocks/
├── telegram-server.ts    # Mock Telegram Bot API
├── openai-server.ts      # Mock OpenAI embeddings/vision
├── test-vault/           # Pre-populated test vault
└── fixtures/synthetic/   # Sanitized test data
```

---

## Phase 4: Documentation

```
docs/skills/context/
├── QUICKSTART.md          # 5-minute setup
├── INSTALLATION.md        # Full installation guide
├── CONFIGURATION.md       # All env vars explained
├── TESTING.md             # How to run tests
└── ARCHITECTURE.md        # Technical deep-dive
```

---

## Phase 5: Contribution Workflow

### Before PR to Upstream

- [ ] All paths are relative or use env vars
- [ ] No personal API keys in code
- [ ] Fixtures sanitized (no real names/IDs)
- [ ] `validate-deployment.sh` passes in Docker
- [ ] `ingest test run` passes with mock services
- [ ] Documentation complete
- [ ] Example taxonomy replaces personal taxonomy

---

## CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `context-skill-dev.yml` | Push to `feature/context-system` | Fast dev feedback |
| `context-skill-release.yml` | PR to `release/context-skill` | Clean room validation |
| `context-skill-tag.yml` | Tag `context-skill-v*` | Create GitHub release |

### Pipeline Flow

```
feature/context-system (push)
        │
        ▼
┌─────────────────────┐
│   DEV TESTS         │
│ - Lint & typecheck  │
│ - Unit tests        │
│ - CLI tests         │
└─────────────────────┘
        │
        │ PR to release branch
        ▼
┌─────────────────────┐
│ RELEASE VALIDATION  │
│ - Clean room build  │
│ - Personal data check│
│ - Full test suite   │
└─────────────────────┘
        │
        │ Merge + tag
        ▼
┌─────────────────────┐
│   RELEASE           │
│ - Create GitHub rel │
│ - Generate changelog│
└─────────────────────┘
```

---

## Version Management

### Semantic Versioning

```
context-skill-v{MAJOR}.{MINOR}.{PATCH}

MAJOR: Breaking changes (config format, CLI args)
MINOR: New features (new commands, options)
PATCH: Bug fixes, docs updates
```

### Release Commands

```bash
cd bin/ingest/deployment

# Check for personal data before release
make release-check

# Deploy to release branch (interactive)
make release-deploy

# Deploy with version tag
make release-tag VERSION=1.0.0
```

### Version History (Future)

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | TBD | Initial release |

---

## Implementation Roadmap

### Phase 1: Docker Clean Room ✅ COMPLETE
- [x] Create Dockerfile for development
- [x] Create Dockerfile.cleanroom for contribution testing
- [x] Create docker-compose.yml with persistent volumes
- [x] Create test vault fixture
- [x] Implement validation scripts

### Phase 2: CI/CD Pipeline ✅ COMPLETE
- [x] Create dev tests workflow
- [x] Create release validation workflow
- [x] Create version tagging workflow
- [x] Create deploy-to-release script

### Phase 3: Skill Extraction ✅ COMPLETE
- [x] Create `release/context-skill` branch (in private fork)
- [x] Audit code for hardcoded paths (sanitized)
- [x] Remove personal identifiers
- [x] Create example tag taxonomy
- [x] Add Telegram setup documentation
- [x] Create public contrib repo (`pai-contrib`) on GitHub
- [x] Push `release/context-skill` to `pai-contrib:main`
- [x] Run clean room validation - **PASSED**
- [x] Rename `context/` → `Context/` (match PAI naming)
- [x] Restructure docs (focused docs, removed SKILL_CONTRACT.md)

### Phase 4: Documentation ✅ COMPLETE
- [x] Write CONCEPTS.md (immutable log, tag structure, embeddings, pipelines)
- [x] Write CLI-REFERENCE.md (full ingest and obs command reference)
- [x] Write CAPTURE-TIPS.md (caption syntax, WisprFlow, spoken hints)
- [x] Write SHORTCUTS.md (macOS/iOS capture shortcuts)
- [x] Update README.md with documentation links

### Phase 5: Contribution
- [ ] Final validation in clean room
- [ ] Submit PR to upstream

---

## Quick Reference

### Daily Development

```bash
# Work on your dev branch
git checkout feature/context-system

# Run dev tests locally
cd bin/ingest/deployment
make test-unit

# Push (triggers CI dev tests)
git push origin feature/context-system
```

### Preparing a Release

```bash
# 1. Check for personal data
make release-check

# 2. Push to public contrib repo
git remote add public git@github.com:YOUR_USERNAME/pai-contrib.git  # First time only
git push public release/context-skill:main --force

# 3. Test in clean room (uses public repo)
cd bin/ingest/deployment
make cleanroom-build SKILL_REPO=YOUR_USERNAME/pai-contrib SKILL_BRANCH=main
make cleanroom-test

# 4. If passes, tag the release
git tag context-skill-v1.0.0
git push public context-skill-v1.0.0
```

### First-Time Setup: Create Public Contrib Repo

```bash
# 1. Create new repo on GitHub: YOUR_USERNAME/pai-contrib (PUBLIC)
#    - No README, no .gitignore, empty repo
#    - This will hold ALL your PAI contributions (mirrors PAI structure)

# 2. Add as remote in your private fork
cd /path/to/pai-1.2
git remote add public git@github.com:YOUR_USERNAME/pai-contrib.git

# 3. Push sanitized release branch
git push public release/context-skill:main
```

### Adding Future Skills

```bash
# 1. Develop in private fork
git checkout -b feature/new-skill

# 2. When ready, create sanitized release branch
git checkout -b release/new-skill
# ... sanitize personal data ...

# 3. Merge into pai-contrib main (which already has context skill)
git checkout main
git merge release/new-skill
git push public main
```

### Syncing with Upstream

```bash
# Fetch upstream changes
git fetch upstream

# Merge to your main
git checkout main
git merge upstream/main
git push origin main

# Rebase your dev branch
git checkout feature/context-system
git rebase main
```

---

## Decisions Log

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Clean room | Docker / VM / User profile | Docker | Reproducible, CI-ready |
| Release branch | Single / Per-version | Single + tags | Simpler, tags for versions |
| CI platform | GitHub Actions | GitHub Actions | Already using GitHub |
| Release repo | Same fork / Separate repo | **Separate public repo** | Private fork has sensitive data in branches |
| Public repo name | `pai-context-skill` / `pai-contrib` | **`pai-contrib`** | Mirrors PAI structure, supports multiple skills |
| Merge feature→main? | Yes / No | **No** | `main` stays synced with upstream only; feature has personal data |
| Documentation style | Monolithic / Focused | **Focused docs** | Easier to maintain, find; removed SKILL_CONTRACT.md |
| Skill folder naming | `context` / `Context` | **`Context`** | Match other PAI skills (PascalCase) |

---

## Related Documents

- [Knowledge Layer Discussion](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/147)
- [Life OS Vision](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/157)
- [Context Skill README](../../.claude/skills/Context/README.md)
- [Telegram Setup Guide](../../bin/ingest/docs/telegram-setup.md)
- [Daemon Setup Guide](../../bin/ingest/docs/daemon-setup.md)

