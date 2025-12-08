# 🧠 Context Management Skill Development Plan

> **Created:** 2025-12-08
> **Updated:** 2025-12-08
> **Status:** Phase 1 Complete - Docker Clean Room Implemented
> **Goal:** Contribute vanilla context skill to upstream PAI repo

## Executive Summary

You have a sophisticated knowledge management system (`ingest` + `obs` CLIs) in your private fork that you want to contribute back to the upstream PAI repo. The challenge is:

1. **Untangling personal customizations** from the vanilla skill
2. **Validating fresh deployments** to ensure the skill works out-of-the-box
3. **Managing the three-repo workflow** (upstream → fork → contribution)

---

## Current State

| Aspect | Status |
|--------|--------|
| **Private Fork** | `git@github.com:mellanon/pai-1.2.git` (origin) |
| **Upstream** | `https://github.com/danielmiessler/Personal_AI_Infrastructure.git` (read-only) |
| **Current Branch** | `feature/context-system` |
| **Test Coverage** | 128 tests across 4 layers (unit, integration, CLI, acceptance) |
| **CLIs** | `ingest` (capture) + `obs` (query), both TypeScript/Bun |
| **Personal Entanglement** | Vault paths, API keys, Telegram configs, tag taxonomy |

---

## Architecture: Branching & Clean Room Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTRIBUTION PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   danielmiessler/Personal_AI_Infrastructure                                 │
│          │                                                                  │
│          │  (upstream - vanilla PAI, read-only)                            │
│          │                                                                  │
│          └──► mellanon/pai-1.2 (your fork)                                 │
│                     │                                                       │
│                     ├── main (synced with upstream)                        │
│                     │     │                                                 │
│                     │     └── feature/context-system                       │
│                     │           │                                           │
│                     │           │  (your dev work - has personal stuff)    │
│                     │           │                                           │
│                     │           └── feature/vanilla-context-skill          │
│                     │                 │                                     │
│                     │                 │  (CLEAN - no personal data)        │
│                     │                 │                                     │
│                     │                 ▼                                     │
│                     │        ┌─────────────────────────┐                   │
│                     │        │     CLEAN ROOM TEST     │                   │
│                     │        │                         │                   │
│                     │        │  Clone: upstream/main   │                   │
│                     │        │  Merge: vanilla-skill   │                   │
│                     │        │  Run:   install.sh      │                   │
│                     │        │  Test:  validation      │                   │
│                     │        │                         │                   │
│                     │        │  ✓ Works for new user!  │                   │
│                     │        └─────────────────────────┘                   │
│                     │                 │                                     │
│                     │                 ▼                                     │
│                     │        Submit PR to upstream                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Branch Purposes

| Branch | Purpose | Contains Personal Data? |
|--------|---------|------------------------|
| `upstream/main` | Daniel Miessler's source PAI | No |
| `origin/main` | Your fork's main (synced) | No |
| `feature/context-system` | Your active development | **Yes** (vault paths, configs) |
| `feature/vanilla-context-skill` | **CLEAN** contribution | **No** (sanitized) |

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

### Phase 3: Skill Extraction (Next)
- [ ] Create `release/context-skill` branch
- [ ] Audit code for hardcoded paths
- [ ] Create example tag taxonomy
- [ ] Sanitize test fixtures
- [ ] Run `make cleanroom-full` to validate

### Phase 4: Documentation
- [ ] Write QUICKSTART.md
- [ ] Write CONFIGURATION.md
- [ ] Document all CLI commands

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

# 2. Deploy to release branch
make release-deploy

# 3. Test in clean room
make cleanroom-full

# 4. If passes, tag and push
make release-tag VERSION=1.0.0
git push origin release/context-skill
git push origin context-skill-v1.0.0
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

---

## Related Documents

- [Knowledge Layer Discussion](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/147)
- [Life OS Vision](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/157)
- [SKILL_CONTRACT.md](../../.claude/skills/SKILL_CONTRACT.md)

