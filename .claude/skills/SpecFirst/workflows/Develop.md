# Develop Workflow

**Purpose:** Spec-first development for any project - from simple features to PAI skill contributions.

**Core Principle:** Specs drive everything. Tests validate specs. Code makes tests pass.

---

## The Spec-First Flow

```
SPEC → TEST → IMPLEMENT → RELEASE
  │       │        │          │
  │       │        │          └── Release.md workflow
  │       │        └── Code that makes tests pass
  │       └── Tests that validate spec requirements
  └── Define requirements (SHALL/MUST)
```

---

## Development Paths

| Path | When to Use | Flow |
|------|-------------|------|
| **Standard** | Most projects, internal tools | `spec → test → feature/x → PR → main` |
| **PAI Contribution** | Contributing to upstream PAI | `spec → test → feature/x → TAG → contrib/x → fork → upstream` |

Both use **squash commits** for clean history. The difference is whether you need the contrib branch sanitization gate.

---

## Branch & Remote Reference

### Standard Development

| Name | Example | Visibility | Purpose |
|------|---------|------------|---------|
| **main** | `main` | Depends | Production branch |
| **feature** | `feature/add-name-flag` | Private | Development work |

### PAI Contribution

| Name | Remote | Branch | Visibility | Purpose |
|------|--------|--------|------------|---------|
| **upstream** | `upstream` | `main` | PUBLIC | Target repo (read-only) |
| **origin** | `origin` | `main` | PRIVATE | Your private copy |
| **feature** | `origin` | `feature/my-skill` | PRIVATE | Development (messy OK) |
| **tag** | `origin` | `v1.0.0` | PRIVATE | Marks tested code |
| **contrib** | `origin` | `contrib-my-skill-v1.0.0` | PRIVATE | Clean staging |
| **fork** | `fork` | `contrib-my-skill-v1.0.0` | PUBLIC | PR source |

**Flow:**
```
upstream/main ← fork/contrib ← origin/contrib ← TAG ← origin/feature
   (target)      (PR source)     (staging)     (tested)  (development)
```

---

## Why PAI Needs Extra Care

Your Personal AI is entangled with personal data:
- `.env` with API keys and tokens
- Personal vault paths and Telegram IDs
- Real test fixtures with captured data
- Config files with your preferences

**The contrib branch pattern untangles contribution-worthy code from personal data.** Without it, you risk:
- Leaking API keys to public repos
- Exposing personal paths and usernames
- Bloated PRs with debug/personal files

---

## Prerequisites (PAI Contribution)

Before starting development on a PAI contribution:

```bash
# 1. Sync with upstream (required for PAI contributions)
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

---

## Phase 0: Spec Setup

**Before writing code, define what you're building.**

### For New Skills/Features

```bash
# Initialize OpenSpec structure (if not exists)
openspec init

# Or create manually:
mkdir -p openspec/specs openspec/changes openspec/archive
```

### Create Change Proposal

```bash
# Use slash command to create proposal
/openspec-proposal

# Creates: openspec/changes/[feature-name]/
#   ├── proposal.md    ← What and why
#   ├── tasks.md       ← Implementation checklist
#   └── specs/         ← Spec deltas (SHALL/MUST requirements)
```

### Define Requirements First

```markdown
# In openspec/changes/my-feature/specs/feature.md

## ADDED Requirements

### Requirement: [Feature Name]
The system SHALL [behavior using SHALL/MUST language].

#### Scenario: [Use case]
- **GIVEN** [precondition]
- **WHEN** [trigger]
- **THEN** [expected outcome]
```

**Human review required:** Get spec approval before proceeding to implementation.

---

## Phase 1: Test Setup

**Write tests that validate your specs before implementing.**

```bash
# Tests SHOULD fail initially - you haven't implemented yet!
# Each spec requirement maps to a test:

# SPEC (spec.md)              → TEST (*.spec.ts)
# Requirement: --name flag    → TEST-CLI-014
# Scenario: CLI usage         → command: ingest direct --name "X"
# THEN filename SHALL use     → expected.contains: ["[name:X]"]
```

---

## Standard Development

For typical projects: feature branch → PR → main.

### Setup

```bash
# Create feature branch
git checkout -b feature/my-feature main
```

### Implement (Make Tests Pass)

```bash
# Develop against specs - tests guide implementation
git add .
git commit -m "wip: initial implementation"
git commit -m "feat: add core functionality"
git commit -m "fix: handle edge case"
# ... many commits OK during development

# Run tests frequently
bun test
```

### Release

```bash
# Push feature branch
git push origin feature/my-feature

# Create PR (squash merge recommended)
gh pr create --base main --title "feat: Add my feature"

# After approval, squash merge
gh pr merge --squash
```

**Squash is key:** Collapses "wip", "fix typo", "debug" into one clean commit.

---

## PAI Contribution Development

For contributing skills/features to upstream PAI repository.

### Branch Strategy (with Specs)

```
openspec/specs/               ← Current truth (WHAT the skill does)
    │
    └── openspec/changes/     ← Proposed changes (spec deltas)
            │
            │  /openspec-proposal (define requirements)
            │  Human reviews specs
            │  /openspec-apply (implement)
            ▼
main (or upstream/main)
    │
    └── feature/[name]           ← Development (PRIVATE, messy commits OK)
            │
            │  /openspec-archive (merge specs, update CHANGELOG)
            │
            ├── TAG: v1.0.0      ← Marks tested code (after checklist)
            │
            └── contrib-[name]   ← Clean commit for PR (cherry-picked from TAG)
                    │
                    └── fork/contrib-[name]  ← PUBLIC PR source
```

### Versioning

| Version | When to Use |
|---------|-------------|
| `v1.0.0` | Initial release - feature-complete, tested |
| `v1.0.1` | Patch - bug fixes, PR feedback |
| `v1.1.0` | Minor - new features, backward compatible |
| `v2.0.0` | Major - breaking changes |

**First release = `v1.0.0`** - PAI skills should be production-ready before contribution.

### Version Artifacts

| Artifact | Location | Tracked in Git? |
|----------|----------|-----------------|
| Git tag | `v1.0.0` | Yes (on origin, NEVER fork) |
| CHANGELOG.md | `.claude/skills/[Name]/` | Yes |
| RELEASE-vX.Y.Z.md | `.claude/skills/[Name]/` | **No** (gitignored) |
| Test run | `output/release-v1.0.0-*` | No (local output) |

### Setup

```bash
# 1. Sync with upstream (see Prerequisites above)
git fetch upstream && git checkout main && git merge upstream/main

# 2. Initialize specs (Phase 0)
openspec init  # or mkdir -p openspec/specs openspec/changes

# 3. Create change proposal
/openspec-proposal
# Define requirements in openspec/changes/my-skill/specs/

# 4. Get spec approval from human review

# 5. Create feature branch for development
git checkout -b feature/my-skill main

# 6. Implement (tests guide you)
/openspec-apply
git add .
git commit -m "wip: initial skill structure"
git commit -m "feat: add core workflow"
# ... many commits OK during development
```

### Pre-Release

```bash
# 7. Archive specs (merge deltas to specs/, update CHANGELOG)
/openspec-archive

# 8. Create RELEASE-v1.0.0.md with file inventory
# See templates/RELEASE-vX.Y.Z.md

# 9. Run tests with release flag
bun test all --release v1.0.0
# Creates: output/release-v1.0.0-2025-12-12-14-30-00/

# 10. Complete pre-release checklist
# All boxes checked in RELEASE-v1.0.0.md

# 11. Verify CHANGELOG.md is updated (done by /openspec-archive)
```

### Tag (After Checklist Approved)

```bash
# 7. Create annotated tag on feature branch
git tag -a v1.0.0 -m "Release v1.0.0: My Skill

- Feature 1
- Feature 2

Test run: release-v1.0.0-2025-12-12-14-30-00"

# 8. Push tag to private repo (NEVER to fork)
git push origin v1.0.0
```

### Contribution

```bash
# 9. Sync with upstream
git fetch upstream

# 10. Create fresh contrib branch from upstream
git checkout -b contrib-my-skill-v1.0.0 upstream/main

# 11. Cherry-pick FROM TAG (not feature branch!)
git checkout v1.0.0 -- \
    .claude/skills/MySkill/ \
    bin/my-cli/ \
    .claude/.env.example

# 12. Remove excluded files
rm -rf bin/my-cli/test/ \
       .claude/skills/MySkill/RELEASE-v1.0.0.md

# 13. Run sanitization
./scripts/sanitize-for-contrib.sh

# 14. Review diff
git diff --name-only upstream/main

# 15. Commit with clean message
git add -A
git commit -m "feat(my-skill): Add MySkill for [purpose]

- Feature 1
- Feature 2

Implements CLI-First architecture."

# 16. Push to origin for verification
git push origin contrib-my-skill-v1.0.0

# 17. After verification, push to fork (EXPLICIT APPROVAL REQUIRED)
git push fork contrib-my-skill-v1.0.0

# 18. Create PR
gh pr create \
  --repo danielmiessler/Personal_AI_Infrastructure \
  --head your-username:contrib-my-skill-v1.0.0 \
  --base main \
  --title "feat(my-skill): Add MySkill" \
  --body-file PR_DESCRIPTION.md
```

### If PR Needs Changes

```bash
# Fix on feature branch
git checkout feature/my-skill
# Make fixes...

# Run tests with incremented version
bun test all --release v1.0.1

# Tag new version
git tag -a v1.0.1 -m "Release v1.0.1: Address PR feedback"
git push origin v1.0.1

# Update contrib branch from new tag
git checkout contrib-my-skill-v1.0.0
git checkout v1.0.1 -- .claude/skills/MySkill/ bin/my-cli/
git commit -m "fix: Address PR feedback"
git push fork contrib-my-skill-v1.0.0
```

---

## Development Checklist

### Phase 0: Spec Setup

- [ ] Sync with upstream: `git fetch upstream && git merge upstream/main`
- [ ] Initialize OpenSpec: `openspec init`
- [ ] Create proposal: `/openspec-proposal`
- [ ] Define requirements (SHALL/MUST language)
- [ ] Get spec approval from human review

### Phase 1: Test Setup

- [ ] Write tests that validate spec requirements
- [ ] Verify tests fail (no implementation yet)

### Phase 2: Implementation

- [ ] Create feature branch: `git checkout -b feature/[name]`
- [ ] Implement: `/openspec-apply`
- [ ] Run tests frequently
- [ ] Commit freely (feature branch can be messy)

### Phase 3: Pre-Release

- [ ] Archive specs: `/openspec-archive`
- [ ] Verify CHANGELOG.md updated
- [ ] Ensure all tests pass

### Before Release (Standard)

- [ ] Push feature branch
- [ ] Create PR with description
- [ ] Squash merge after approval

### Before Release (PAI Contribution)

- [ ] Create RELEASE-vX.Y.Z.md with file inventory
- [ ] Run tests with `--release` flag
- [ ] Complete pre-release checklist
- [ ] Create tag after checklist approved
- [ ] Cherry-pick from tag to contrib branch
- [ ] Run sanitization
- [ ] Push to fork (explicit approval)
- [ ] Create PR

---

## Common Patterns

### Pattern: Syncing with Upstream

```bash
# Keep your fork updated
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

# Rebase feature branch if needed
git checkout feature/my-skill
git rebase main
```

### Pattern: Multiple Features in Parallel

```bash
# Each feature gets its own branch
git checkout -b feature/feature-a main
git checkout -b feature/feature-b main

# Each release gets its own tag and contrib branch
# feature-a → v1.0.0 → contrib-feature-a-v1.0.0
# feature-b → v1.1.0 → contrib-feature-b-v1.1.0
```

### Pattern: Hotfix After Release

```bash
# Fix on feature branch
git checkout feature/my-skill
# Apply fix...

# Increment patch version
git tag -a v1.0.1 -m "Hotfix: Critical bug"
git push origin v1.0.1

# Cherry-pick fix to contrib branch
git checkout contrib-my-skill-v1.0.0
git checkout v1.0.1 -- path/to/fixed/file.ts
git commit -m "fix: Critical bug"
git push fork contrib-my-skill-v1.0.0
```

---

## Related Workflows

- **ProposeChange.md** - For significant changes, create proposal first
- **Release.md** - Detailed release checklist and workflows
- **ValidateSpec.md** - Verify implementation meets spec
