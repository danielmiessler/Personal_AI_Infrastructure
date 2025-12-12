# RELEASE-vX.Y.Z

**Template for release plans. Copy and fill in for each release.**

---

# [Skill Name] Release v[VERSION]

## Release Info

| Field | Value |
|-------|-------|
| **Version** | vX.Y.Z |
| **Target Date** | YYYY-MM-DD |
| **Test Run ID** | `release-vX.Y.Z-YYYY-MM-DD-HH-MM-SS` |
| **Status** | In Progress / Ready for PR / Merged |
| **Contrib Branch** | `contrib-[skill]-vX.Y.Z` |

## Summary

[One sentence: What does this release deliver?]

---

## File Inventory (Include)

**This inventory guides all git operations. Only files listed here get cherry-picked.**

| # | File | Reason |
|---|------|--------|
| | **Config** | |
| 1 | `.claude/.env.example` | Template for required env vars |
| | **Skill Definition** | |
| 2 | `.claude/skills/[Name]/SKILL.md` | Claude Code skill triggers |
| 3 | `.claude/skills/[Name]/CHANGELOG.md` | Release changelog |
| 4 | `.claude/skills/[Name]/workflows/*.md` | Workflow docs |
| 5 | `.claude/skills/[Name]/docs/*.md` | Additional docs |
| | **CLI** | |
| 6 | `bin/[cli]/[cli].ts` | Main CLI entry point |
| 7 | `bin/[cli]/lib/*.ts` | Library modules |
| 8 | `bin/[cli]/package.json` | Dependencies |
| 9 | `bin/[cli]/bun.lock` | Lock file |

**Total Include: X files**

---

## Exclude (Not Part of This Release)

**These paths must NOT be in the PR. Remove if accidentally cherry-picked.**

| Path | Reason | Action |
|------|--------|--------|
| `.env`, `.env.*` | Contains API keys, tokens | Never commit |
| `config/personal.json` | Personal settings | Never commit |
| `bin/[cli]/test/` | Test fixtures (may contain personal data) | Remove if present |
| `RELEASE-vX.Y.Z.md` | Instance-specific release plan | Remove if present |
| `.claude/skills/*/RELEASE-*.md` | Release plans are gitignored | Remove if present |
| `.claude/hooks/` | Personal automation | Not part of skill |
| `.claude/settings.json` | Personal preferences | Not part of skill |
| `docs/` (personal) | Internal documentation | Not part of skill |
| Other skills (e.g., `CORE/`, `Jira/`) | Separate contributions | Not part of this PR |

---

## Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ Include | X | Core skill files to cherry-pick |
| ❌ Exclude | Y | Personal/sensitive files to remove |

---

## File Inventory → Git Operations

**The file inventory drives the cherry-pick step:**

```bash
# Cherry-pick ONLY files from the Include list:
git checkout [tag-or-branch] -- \
    .claude/skills/[Name]/ \
    .claude/.env.example \
    bin/[cli]/

# Remove any excluded files that were accidentally included:
rm -rf bin/[cli]/test/ \
       .claude/skills/[Name]/RELEASE-vX.Y.Z.md

# Verify staged files match inventory:
git diff --name-only --cached | sort
# Compare against Include list above
```

---

## Decisions

| Item | Decision | Rationale |
|------|----------|-----------|
| [Decision 1] | [Option chosen] | [Why] |
| [Decision 2] | [Option chosen] | [Why] |

---

## Pre-Release Checklist

### 1. Code Ready
- [ ] All features complete
- [ ] No TODO/FIXME in release files
- [ ] .env.example up to date

### 2. Tests Pass
- [ ] Unit tests: `[test command] --release vX.Y.Z`
- [ ] Integration tests pass
- [ ] CLI tests pass
- [ ] Acceptance tests pass (or documented why skipped)

### 3. Documentation
- [ ] SKILL.md accurate
- [ ] CLI --help output correct
- [ ] CHANGELOG.md updated

### 4. Sanitization
- [ ] `./scripts/sanitize-for-contrib.sh` passes
- [ ] No personal data in diff
- [ ] Scope validated against file inventory

---

## Test Results

| Layer | Passed | Failed | Skipped | Notes |
|-------|--------|--------|---------|-------|
| Unit | X | 0 | 0 | |
| Integration | X | 0 | 0 | |
| CLI | X | 0 | 0 | |
| Acceptance | X | 0 | 0 | |

**Test run:** `release-vX.Y.Z-YYYY-MM-DD-HH-MM-SS`

---

## Propagation Process

```
origin/feature/[name]         (PRIVATE - development)
        │
        │  1. Complete checklist above
        │  2. Update CHANGELOG.md
        │
        ├── TAG: vX.Y.Z (after checklist approved)
        │   └── Marks exact code that was tested
        │
        │  3. Create contrib branch from upstream/main
        │  4. Cherry-pick from TAG using file inventory
        ▼
origin/contrib-[name]-vX.Y.Z  (PRIVATE - staging)
        │
        │  5. Run sanitization
        │  6. Verify diff matches file inventory
        ▼
fork/contrib-[name]-vX.Y.Z    (PUBLIC - PR source)
        │
        │  7. Create PR
        ▼
upstream/main                 (PUBLIC - target)
```

---

## PR Description

```markdown
## Summary

[TL;DR: One sentence value proposition]

### How It Works

[Brief architecture explanation or ASCII diagram]

### CLI Commands

| Command | Purpose |
|---------|---------|
| `cmd1` | Description |
| `cmd2` | Description |

---

## What This Adds

- [File/component 1]
- [File/component 2]

## Required Configuration

```bash
# Add to ~/.claude/.env
VAR_NAME=description
```

## Test Plan

- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing completed

## What's NOT Included (Yet)

[Honest about gaps - builds trust with reviewers]
```

---

## Post-Checklist Steps

**After checklist approved:**
- [ ] Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z: [description]"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Create contrib branch from upstream
- [ ] Cherry-pick from tag (using file inventory)
- [ ] Run sanitization
- [ ] Push to fork
- [ ] Create PR

**After PR merged:**
- [ ] Update dependent documentation
- [ ] Archive this release plan (optional)
