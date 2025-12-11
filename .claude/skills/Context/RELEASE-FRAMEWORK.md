# Skill Release Framework

Reusable process for contributing PAI skills to upstream.

## Overview

This framework provides:
1. **Versioning** - Semantic versioning convention
2. **Scope Definition** - What belongs in the skill PR
3. **Safety Nets** - Prevent sensitive data leaks
4. **Propagation Process** - Git workflow for contributions
5. **CHANGELOG Management** - Track changes across releases
6. **Checklist Templates** - Pre-deployment validation

---

## Versioning Convention

### Semantic Versioning with `v` Prefix

PAI skills use [semantic versioning](https://semver.org/) with a `v` prefix:

| Version | When to Use |
|---------|-------------|
| `v1.0.0` | Initial release - feature-complete, tested, ready for contribution |
| `v1.0.1` | Patch - bug fixes, documentation updates, no new features |
| `v1.1.0` | Minor - new features, backward compatible |
| `v2.0.0` | Major - breaking changes, significant redesign |

### First Release

For a skill's first contribution to upstream:
- Use **`v1.0.0`** - signals "this is a complete, tested release"
- Not `v0.x.x` - PAI skills should be production-ready before contribution

### Version Artifacts

| Artifact | Location | Tracked |
|----------|----------|---------|
| Git tag | `v1.0.0` | Yes (after checklist approved) |
| CHANGELOG.md | `.claude/skills/[Name]/CHANGELOG.md` | Yes |
| RELEASE-vX.Y.Z.md | `.claude/skills/[Name]/RELEASE-v1.0.0.md` | **No** (gitignored, instance-specific) |
| Test run | `output/release-v1.0.0-*` | Yes (in history) |

---

## Contribution Scope

### Include in Context Skill PRs

| Path | Purpose |
|------|---------|
| `.claude/skills/Context/` | Skill definition and docs |
| `.claude/.env.example` | Environment template |
| `bin/ingest/` (excluding `test/`) | Ingest CLI |
| `bin/obs/` (excluding `test/`) | Obs CLI |
| `shortcuts/` | iOS/macOS shortcuts |

### Exclude from All PRs

| Path | Reason |
|------|--------|
| `.claude/skills/CORE/` | Separate skill |
| `.claude/skills/*/RELEASE-PLAN.md` | Instance-specific (gitignored) |
| `.claude/hooks/` | Personal automation |
| `.claude/settings.json` | Personal preferences |
| `bin/*/test/` | Test fixtures (may contain personal data) |
| `*.env` (except `.env.example`) | API keys, tokens |
| `profiles/*.json` | Personal configuration |
| `CLAUDE.md` | Private repo workflow |
| `docs/` (personal) | Internal documentation |

---

## Safety Nets

### 1. Gitignore Protection

Ensure `.gitignore` excludes sensitive paths:

```gitignore
# Personal configuration
.claude/skills/*/RELEASE-PLAN.md
.claude/skills/Context/tags.json

# Test fixtures (symlinked from external repo)
bin/ingest/test
bin/obs/test

# Environment files
.env
.env.*
```

### 2. Sanitization Script

Run `scripts/sanitize-for-contrib.sh` before any fork push:

```bash
./scripts/sanitize-for-contrib.sh
```

The script checks for:
- Telegram bot tokens (`bot[0-9]+:...`)
- Channel IDs (`-100...`)
- Personal vault paths
- API keys
- Out-of-scope files

### 3. Scope Validation

The sanitizer validates contribution scope by checking:
- Files changed vs upstream match the include list
- No excluded paths have modifications
- No personal data patterns in changed files

### 4. Pre-Push Review

Always review the diff before pushing to fork:

```bash
git diff --name-only upstream/main
```

---

## CHANGELOG Management

### Purpose

CHANGELOG.md tracks what changed across releases for users and reviewers:
- Helps PR reviewers understand scope of changes
- Documents history for future maintainers
- Required for contributions to upstream

### File Location

```
.claude/skills/Context/CHANGELOG.md   # Tracked in git
```

### Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to the Context Skill will be documented in this file.

## [Unreleased]

### Added
- Feature description

### Changed
- What changed

### Fixed
- Bug description

## [v1.0.0] - 2025-12-10

### Added
- Initial release
- Ingest CLI with text/voice/photo/document processing
- Obs CLI for vault search and retrieval
- iOS Shortcuts integration
- Telegram bot integration
- Fabric pattern support

### Architecture
- CLI-First design following PAI principles
- Deterministic code with AI as capability layer
- Semantic search via embeddings
```

### When to Update

| Event | Action |
|-------|--------|
| New feature merged | Add to `[Unreleased]` |
| Bug fix | Add to `[Unreleased]` |
| Preparing release | Move `[Unreleased]` → `[vX.Y.Z] - DATE` |
| After tagging | Create new `[Unreleased]` section |

---

## Release Plan Instances

For each release, create a **RELEASE-vX.Y.Z.md** (gitignored) with:

1. **File Inventory** - Specific files for this release
2. **Decisions** - Release-specific choices
3. **Checklist** - Validation steps
4. **Test Run** - Tied release test run

### Template Structure

```markdown
# [Skill Name] Release Plan v1.0.0

**Target Date:** YYYY-MM-DD
**Test Run:** release-v1.0.0-2025-12-10-14-30-00

## File Inventory
| # | File | Include | Reason |
|---|------|---------|--------|
| 1 | path/to/file | ✅/❌ | Why |

## Decisions
- [ ] Decision 1: Option chosen
- [ ] Decision 2: Option chosen

## Pre-Release Checklist

### 1. Code Ready
- [ ] All features complete
- [ ] No TODO/FIXME in release files
- [ ] .env.example up to date

### 2. Tests Pass
- [ ] Unit tests: `ingest test run --release v1.0.0`
- [ ] Integration tests: `ingest test integration --release v1.0.0`
- [ ] Full suite: `ingest test all --release v1.0.0`
- [ ] LLM judge validation passes

### 3. Documentation
- [ ] SKILL.md accurate
- [ ] CLI --help output correct
- [ ] CHANGELOG.md updated

### 4. Sanitization
- [ ] `./scripts/sanitize-for-contrib.sh` passes
- [ ] No personal data in diff
- [ ] Scope validated

## Post-Checklist Approval

**Checklist approved:** YYYY-MM-DD HH:MM

After checklist is fully approved:
- [ ] Tag created: `git tag -a v1.0.0 -m "Release v1.0.0"`
- [ ] Tag pushed to origin: `git push origin v1.0.0`
```

---

## Propagation Process

### Repository & Branch Overview

| Remote | Repo | Branch | Visibility | Purpose |
|--------|------|--------|------------|---------|
| `origin` | your-private-repo | `feature/*` | **PRIVATE** | Daily development |
| `origin` | your-private-repo | `contrib-*` | **PRIVATE** | Squash staging for PRs |
| `fork` | your-public-fork | `contrib-*` | **PUBLIC** | PR source branch |
| `upstream` | danielmiessler/Personal_AI_Infrastructure | `main` | PUBLIC | PR target (read-only) |

### Complete Release Workflow

```
┌────────────────────────────────────────────────────────────────────────┐
│                         PRE-RELEASE PHASE                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CREATE RELEASE-vX.Y.Z.md                                           │
│     └── Define scope, inventory, decisions                             │
│                                                                         │
│  2. RUN TESTS WITH --release FLAG                                      │
│     └── ingest test all --release v1.0.0                               │
│     └── Creates: output/release-v1.0.0-2025-12-10-14-30-00/            │
│                                                                         │
│  3. COMPLETE PRE-RELEASE CHECKLIST                                     │
│     └── All boxes checked in RELEASE-vX.Y.Z.md                         │
│     └── Tests passing                                                  │
│     └── Documentation updated                                          │
│                                                                         │
│  4. UPDATE CHANGELOG.md                                                │
│     └── Move [Unreleased] → [vX.Y.Z] - DATE                            │
│                                                                         │
├────────────────────────────────────────────────────────────────────────┤
│                     TAG PHASE (after checklist approved)                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  5. CREATE TAG ON FEATURE BRANCH                                       │
│     └── git tag -a v1.0.0 -m "Release v1.0.0"                          │
│     └── git push origin v1.0.0                                         │
│     └── Tag marks exact code that was tested                           │
│                                                                         │
├────────────────────────────────────────────────────────────────────────┤
│                      CONTRIBUTION PHASE                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  6. CREATE CONTRIB BRANCH FROM UPSTREAM                                │
│     └── git checkout -b contrib-context-v1.0.0 upstream/main           │
│                                                                         │
│  7. CHERRY-PICK FROM TAG (not feature branch)                          │
│     └── git checkout v1.0.0 -- [file-list]                             │
│                                                                         │
│  8. SANITIZE AND PUSH TO FORK                                          │
│     └── ./scripts/sanitize-for-contrib.sh                              │
│     └── git push fork contrib-context-v1.0.0                           │
│                                                                         │
│  9. CREATE PR                                                          │
│     └── From: fork/contrib-context-v1.0.0                              │
│     └── To: upstream/main                                              │
│                                                                         │
├────────────────────────────────────────────────────────────────────────┤
│                      IF PR NEEDS CHANGES                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  → Fix on feature branch                                               │
│  → Run tests: ingest test all --release v1.0.1                         │
│  → Tag v1.0.1                                                          │
│  → Cherry-pick from v1.0.1 to contrib branch                           │
│  → Push updated contrib branch                                         │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Repository Flow (Visual)

```
origin/feature-branch      (PRIVATE - development)
        │
        │  1. Complete RELEASE-vX.Y.Z.md checklist
        │  2. Run tests: ingest test all --release v1.0.0
        │  3. Update CHANGELOG.md
        │
        ├── TAG: v1.0.0 (after checklist approved, before PR)
        │   └── Marks exact code that was tested
        │
        │  4. Create contrib branch from upstream/main
        │  5. Cherry-pick from TAG (git checkout v1.0.0 -- files)
        ▼
origin/contrib-branch      (PRIVATE - staging)
        │
        │  6. Run sanitization
        │  7. Review diff against upstream
        ▼
fork/contrib-branch        (PUBLIC - PR source)
        │
        │  8. Create PR with description
        ▼
upstream/main              (PUBLIC - target)

        ┌─────────────────────────────────────────┐
        │  IF PR NEEDS CHANGES:                   │
        │  → Fix on feature branch                │
        │  → Run tests --release v1.0.1           │
        │  → Tag v1.0.1                           │
        │  → Cherry-pick from new tag             │
        │  → Push to contrib branch               │
        └─────────────────────────────────────────┘
```

### When to Tag

**Tag BEFORE creating PR** (recommended):
- Tag on `origin` (private repo) after checklist approved, before PR
- Tag marks the exact code that was tested
- Cherry-pick FROM TAG ensures PR matches tested code
- If PR needs changes → increment version (`v1.0.1`)

```bash
# After checklist approved, before creating PR
git tag -a v1.0.0 -m "Release v1.0.0: Context Skill"
git push origin v1.0.0

# Then cherry-pick from tag (not feature branch)
git checkout v1.0.0 -- .claude/skills/Context/ bin/ingest/ bin/obs/
```

**Why tag before PR:**
- Test run `release-v1.0.0-*` matches exactly what's in tag `v1.0.0`
- Provides audit trail: "v1.0.0 was tested and submitted"
- If rejected/needs changes, v1.0.1 shows iteration history

**Where to tag:** Always on `origin` (private repo), NEVER on `fork` (public)

### Step-by-Step Commands

```bash
# ═══════════════════════════════════════════════════════════════
# PRE-RELEASE PHASE (on feature branch)
# ═══════════════════════════════════════════════════════════════

# 1. Run release tests
cd bin/ingest
bun run ingest.ts test all --release v1.0.0

# 2. Verify tests pass, update CHANGELOG.md

# 3. Complete all checklist items in RELEASE-v1.0.0.md

# ═══════════════════════════════════════════════════════════════
# TAG PHASE (after checklist approved, before PR)
# ═══════════════════════════════════════════════════════════════

# 4. Create annotated tag on feature branch
git tag -a v1.0.0 -m "Release v1.0.0: Context Skill initial release

- Ingest CLI: text/voice/photo/document processing
- Obs CLI: vault search and semantic retrieval
- iOS Shortcuts integration
- Telegram bot integration

Test run: release-v1.0.0-2025-12-10-14-30-00"

# 5. Push tag to private repo
git push origin v1.0.0

# ═══════════════════════════════════════════════════════════════
# CONTRIBUTION PHASE (create PR from tag)
# ═══════════════════════════════════════════════════════════════

# 6. Sync with upstream
git fetch upstream

# 7. Create fresh contrib branch from upstream
git checkout -b contrib-context-v1.0.0 upstream/main

# 8. Cherry-pick ONLY skill files FROM TAG (ensures PR matches tested code)
git checkout v1.0.0 -- .claude/skills/Context/ bin/ingest/ bin/obs/ shortcuts/

# 9. Run sanitization
./scripts/sanitize-for-contrib.sh

# 10. Review diff
git diff --name-only upstream/main

# 11. Commit
git add -A
git commit -m "feat(context): Add Context Skill for knowledge capture and retrieval

- Ingest CLI: text/voice/photo/document processing via Telegram
- Obs CLI: vault search with semantic embedding support
- iOS Shortcuts: Quick capture from iPhone/Mac
- Telegram bot: Personal inbox for knowledge capture

Implements CLI-First architecture with deterministic code.
See .claude/skills/Context/SKILL.md for usage."

# 12. Push to fork (requires explicit approval)
git push fork contrib-context-v1.0.0

# 13. Create PR via GitHub (or gh cli)
gh pr create \
  --repo danielmiessler/Personal_AI_Infrastructure \
  --head mellanon:contrib-context-v1.0.0 \
  --base main \
  --title "feat(context): Add Context Skill for knowledge capture" \
  --body-file PR_DESCRIPTION.md

# ═══════════════════════════════════════════════════════════════
# IF PR NEEDS CHANGES
# ═══════════════════════════════════════════════════════════════

# 14. Fix issues on feature branch, then:
bun run ingest.ts test all --release v1.0.1
git tag -a v1.0.1 -m "Release v1.0.1: Address PR feedback"
git push origin v1.0.1

# 15. Update contrib branch from new tag
git checkout contrib-context-v1.0.0
git checkout v1.0.1 -- .claude/skills/Context/ bin/ingest/ bin/obs/ shortcuts/
git commit -m "fix: Address PR feedback"
git push fork contrib-context-v1.0.0
```

---

## PR Description Template

Structure that works well for PAI skill contributions:

```markdown
## Summary

**TL;DR:** [One sentence value proposition - what problem does this solve?]

### Why This Matters

From PAI's founding principles:
- **CLI-First**: [How this skill implements CLI-first]
- **Deterministic Code First**: [What's in code vs AI]
- **Skills as Containers**: [Self-contained structure]

### How You Use It

[Real example with actual CLI output - show, don't tell]

```
You: "[example user query]"
Claude: [actual response with real data]
```

### How It Works

[ASCII architecture diagram showing data flow]

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Input     │ ──► │  Processing  │ ──► │   Output    │
└─────────────┘     └──────────────┘     └─────────────┘
```

### CLI Commands

| Command | Purpose |
|---------|---------|
| `cmd1` | Description |
| `cmd2` | Description |

### Skill Integration

How Claude uses these CLIs based on user intent.

**Related Discussions:**
- [Link to relevant GitHub discussions]

---

## What This Adds

### CLIs (`bin/`)
[Table of CLIs and their purpose]

### Skill Definition (`.claude/skills/[Name]/`)
[List of skill files]

### Additional Components
[Shortcuts, configs, etc.]

---

## Required Configuration

```bash
# Environment variables needed
VAR_NAME=description
```

---

## Test Plan

- [ ] Clean install tested
- [ ] Sanitization passes
- [ ] [Skill-specific tests]

---

## What's NOT Included (Yet)

[Honest about gaps - builds trust with reviewers]
```

**Key principles:**
1. TL;DR first - immediate value
2. Align with PAI principles - show you understand the philosophy
3. Real examples - actual output, not hypothetical
4. ASCII diagrams - scannable architecture
5. Tables for reference - commands, config
6. Honest gaps - what's deferred and why

---

## Checklist Templates

### Pre-Deployment

- [ ] All files are skill-related
- [ ] No personal data (tokens, paths, IDs)
- [ ] No other skills included
- [ ] No draft documents or product ideas
- [ ] No IDE config (.cursorrules, .vscode)

### Documentation

- [ ] README.md explains setup clearly
- [ ] SKILL.md has correct triggers
- [ ] .env.example has all required vars
- [ ] CLI --help output is accurate

### Testing

Test framework is managed externally in `pai-tooling` repo (private) to keep sensitive fixtures out of public contributions.

**Setup (one-time):**
```bash
# Create symlinks from PAI to pai-tooling test directories
ln -s /path/to/pai-tooling/ingest-test /path/to/PAI/bin/ingest/test
ln -s /path/to/pai-tooling/lib /path/to/pai-tooling/lib  # For module resolution
```

**Pre-release validation:**
```bash
cd bin/ingest

# Fast validation (skip media/AI tests)
bun run ingest.ts test run --skip-media --skip-llm-judge

# Full validation before release
bun run ingest.ts test all
```

**Checklist:**
- [ ] Unit tests pass (`test run`)
- [ ] Integration tests pass (`test integration`)
- [ ] CLI tests pass (`test cli`)
- [ ] Core commands work with fresh config
- [ ] Install scripts run without error
- [ ] Shortcuts generate correctly (if applicable)

### Sanitization

- [ ] `./scripts/sanitize-for-contrib.sh` passes
- [ ] No personal data in code
- [ ] No channel IDs except placeholders
