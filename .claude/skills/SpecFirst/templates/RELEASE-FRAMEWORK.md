# RELEASE-FRAMEWORK

**Template for defining release methodology for a PAI skill or project.**

Copy this template and customize for your skill.

---

## Versioning

### Semantic Versioning with `v` Prefix

Use [semantic versioning](https://semver.org/) with a `v` prefix:

| Version | When to Use |
|---------|-------------|
| `v1.0.0` | Initial release - feature-complete, tested, ready |
| `v1.0.1` | Patch - bug fixes, documentation, PR feedback |
| `v1.1.0` | Minor - new features, backward compatible |
| `v2.0.0` | Major - breaking changes |

**First release = `v1.0.0`** - Skills should be production-ready before contribution.

### Version Artifacts

| Artifact | Location | Tracked in Git? |
|----------|----------|-----------------|
| Git tag | `v1.0.0` | Yes (on origin, NEVER fork) |
| CHANGELOG.md | `.claude/skills/[Name]/` | Yes |
| RELEASE-vX.Y.Z.md | `.claude/skills/[Name]/` | **No** (gitignored, instance-specific) |
| Test run | `output/release-v1.0.0-*` | No (local output) |

**Key:** Test run ID ties to tag: `release-v1.0.0-*` → tag `v1.0.0`

---

## Scope Definition

### Included in Releases

Define what files/directories are part of this skill:

```
.claude/skills/[SkillName]/
├── SKILL.md              ✅ Always included
├── workflows/            ✅ Always included
├── templates/            ✅ Always included
├── docs/                 ✅ Always included
└── CHANGELOG.md          ✅ Always included

bin/[tool-name]/          ✅ If skill has CLI tooling
└── [tool].ts

shortcuts/                ✅ If skill has shortcuts
└── [Shortcut].shortcut
```

### Excluded from Releases (Never Commit)

```
.env                      ❌ API keys, tokens
.env.*                    ❌ Environment variants
config/personal.json      ❌ Personal settings
test/fixtures/            ❌ If contains real data
profiles/*.json           ❌ Personal profiles
*.log                     ❌ Log files
```

---

## Safety Nets

### .gitignore Requirements

Ensure these patterns are in `.gitignore`:

```gitignore
# Secrets
.env
.env.*
*.pem
*.key

# Personal config
config/personal.json
profiles/

# Test artifacts (if sensitive)
test/fixtures/private/
test/output/

# IDE
.idea/
.vscode/
```

### Sanitization Check

Before any public release, verify:

```bash
# No secrets in code
grep -r "API_KEY\|TOKEN\|PASSWORD" --include="*.ts" --include="*.md"

# No personal paths
grep -r "/Users/\|/home/" --include="*.ts" --include="*.md"

# No hardcoded IDs
grep -r "TELEGRAM_\|CHANNEL_ID" --include="*.ts"
```

---

## Propagation Process

### Repository & Branch Overview

| Remote | Repo | Branch | Visibility | Purpose |
|--------|------|--------|------------|---------|
| `origin` | your-private-repo | `feature/*` | **PRIVATE** | Daily development |
| `origin` | your-private-repo | `contrib-*` | **PRIVATE** | Squash staging for PRs |
| `fork` | your-public-fork | `contrib-*` | **PUBLIC** | PR source branch |
| `upstream` | upstream-owner/repo | `main` | PUBLIC | PR target (read-only) |

### Complete Release Workflow (PAI Contribution)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         PRE-RELEASE PHASE                               │
├────────────────────────────────────────────────────────────────────────┤
│  1. CREATE RELEASE-vX.Y.Z.md with file inventory                       │
│  2. RUN TESTS with --release flag                                      │
│     └── Creates: output/release-v1.0.0-YYYY-MM-DD-HH-MM-SS/            │
│  3. COMPLETE PRE-RELEASE CHECKLIST                                     │
│  4. UPDATE CHANGELOG.md                                                │
│     └── Move [Unreleased] → [vX.Y.Z] - DATE                            │
├────────────────────────────────────────────────────────────────────────┤
│                     TAG PHASE (after checklist approved)                │
├────────────────────────────────────────────────────────────────────────┤
│  5. CREATE TAG ON FEATURE BRANCH                                       │
│     └── git tag -a v1.0.0 -m "Release v1.0.0"                          │
│     └── git push origin v1.0.0                                         │
│     └── Tag marks EXACT code that was tested                           │
├────────────────────────────────────────────────────────────────────────┤
│                      CONTRIBUTION PHASE                                 │
├────────────────────────────────────────────────────────────────────────┤
│  6. CREATE CONTRIB BRANCH FROM UPSTREAM                                │
│     └── git checkout -b contrib-[name]-v1.0.0 upstream/main            │
│  7. CHERRY-PICK FROM TAG (not feature branch!)                         │
│     └── git checkout v1.0.0 -- [file-list from inventory]              │
│  8. SANITIZE AND PUSH TO FORK                                          │
│     └── ./scripts/sanitize-for-contrib.sh                              │
│     └── git push fork contrib-[name]-v1.0.0                            │
│  9. CREATE PR                                                          │
└────────────────────────────────────────────────────────────────────────┘
```

### When to Tag

**Tag BEFORE creating PR:**
- Tag on `origin` (private) after checklist approved
- Tag marks the exact code that was tested
- Cherry-pick FROM TAG ensures PR matches tested code
- If PR needs changes → increment version (`v1.0.1`)

**Where to tag:** Always on `origin` (private), NEVER on `fork` (public)

### If PR Needs Changes

```
→ Fix on feature branch
→ Run tests: --release v1.0.1
→ Tag v1.0.1
→ Cherry-pick from v1.0.1 to contrib branch
→ Push updated contrib branch
```

### Standard Development (Non-Fork)

```
feature/[name]  →  PR  →  main
     │               │
  (develop)    (squash merge)
```

---

## CHANGELOG Management

Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:

```markdown
# Changelog

All notable changes to [Skill Name] will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.1.0] - 2025-12-12

### Added
- New workflow: DevelopSkill.md
- Template: RELEASE-vX.Y.Z.md

### Changed
- Updated SKILL.md routing table

### Fixed
- Typo in Release.md

## [v1.0.0] - 2025-12-10

Initial release of [Skill Name].

### Added
- SKILL.md with core workflows
- CLI implementation

### Architecture
- CLI-First design following PAI principles
- Deterministic code with AI as capability layer
```

### When to Update CHANGELOG

| Event | Action |
|-------|--------|
| New feature merged | Add to `[Unreleased]` |
| Bug fix | Add to `[Unreleased]` |
| Preparing release | Move `[Unreleased]` → `[vX.Y.Z] - DATE` |
| After tagging | Create new `[Unreleased]` section |

---

## Checklist Templates

### Pre-Release Checklist

```markdown
## Pre-Release Checklist for v[X.Y.Z]

### Scope
- [ ] File inventory complete
- [ ] No unintended files included
- [ ] Excluded files verified

### Sanitization
- [ ] No PII
- [ ] No secrets
- [ ] No personal paths
- [ ] Config externalized

### Quality
- [ ] Tests pass (all layers)
- [ ] Documentation current
- [ ] CHANGELOG updated
- [ ] Version bumped

### Final
- [ ] Squash merge complete
- [ ] PR description ready
```

---

## Using This Framework

1. **Copy to your skill:** `cp templates/RELEASE-FRAMEWORK.md .claude/skills/MySkill/`
2. **Customize:** Update include/exclude lists for your skill
3. **Create release plans:** Use `templates/RELEASE-vX.Y.Z.md` for each release
4. **Follow the checklist:** Every. Single. Time.
