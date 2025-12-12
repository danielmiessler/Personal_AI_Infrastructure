# RELEASE-v1.0.0: Jira Skill

## Summary

TypeScript CLI for Jira operations following PAI deterministic-first architecture with multi-instance support, two-phase retrieval, and GitHub dev panel integration.

---

## File Inventory

### Included (✅)

| # | File/Directory | Reason |
|---|----------------|--------|
| 1 | `.claude/skills/Jira/SKILL.md` | Skill definition and routing |
| 2 | `.claude/skills/Jira/README.md` | Quick start and overview |
| 3 | `.claude/skills/Jira/CHANGELOG.md` | Version history |
| 4 | `.claude/skills/Jira/ACCEPTANCE_TESTS.md` | Manual test cases |
| 5 | `.claude/skills/Jira/docs/CLI-REFERENCE.md` | Full command reference |
| 6 | `.claude/skills/Jira/docs/CONCEPTS.md` | Architecture and concepts |
| 7 | `bin/jira/jira.ts` | CLI entrypoint |
| 8 | `bin/jira/lib/api.ts` | Jira REST API client |
| 9 | `bin/jira/lib/config.ts` | Profile management |
| 10 | `bin/jira/lib/format.ts` | Output formatters |
| 11 | `bin/jira/package.json` | Project config |
| 12 | `bin/jira/bun.lock` | Lockfile for reproducible builds |
| 13 | `bin/jira/profiles.example/example.env.template` | Example profile template |
| 14 | `openspec/specs/jira-cli.md` | Merged specification |
| 15 | `openspec/archive/2025-12-12-jira-skill/` | Archived proposal |
| 16 | `CHANGELOG.md` | Updated with JIRA entry (root) |
| 17 | `.claude/skills/CORE/SKILL.md` | Routing update |
| 18 | `.claude/skills/Jira/RELEASE-v1.0.0.md` | Release documentation & test results |

### Excluded (❌)

| File/Directory | Reason |
|----------------|--------|
| `bin/jira/profiles/` | Contains credentials (gitignored) |
| `bin/jira/test/` | Symlink to pai-tooling (gitignored) |
| `bin/jira/node_modules/` | Dependencies (gitignored) |
| `.env` | Contains secrets |

---

## Pre-Release Checklist

### File Inventory
- [x] Files match inventory above
- [x] No untracked files that shouldn't be included
- [x] Excluded files are NOT staged

### Sanitization
- [x] No PII (personal paths, usernames)
- [x] No secrets (API keys, tokens)
- [x] Config externalized to profiles/*.env

### Scope Check
- [x] PR matches proposal (JIRA skill only)
- [x] No drive-by fixes
- [x] No personal configuration

### Validation
- [x] `jira --help` works (TEST-JIRA-001)
- [x] CLI tests pass (23/23 - see Test Results below)
- [x] Manual acceptance tests reviewed (19 test cases)
- [x] Documentation complete (7 docs)

---

## Test Results (v1.0.0)

**Test Run:** 2025-12-12
**Location:** `pai-tooling/jira-test/`
**Runner:** `bun run run-tests.ts`

| Layer | Status | Count | Notes |
|-------|--------|-------|-------|
| CLI (Read) | ✅ PASS | 17/17 | Help, config, search, get, discovery |
| CLI (Write) | ✅ PASS | 3/3 | Create, subtask, with cleanup |
| CLI (Error) | ✅ PASS | 3/3 | Invalid inputs handled |
| **Total** | ✅ PASS | **23/23** | All tests passing |

### Test IDs

**Read Tests (Idempotent):**
- TEST-JIRA-001 to TEST-JIRA-003: Help & Config
- TEST-JIRA-010 to TEST-JIRA-012: Discovery (projects, types, link-types)
- TEST-JIRA-020 to TEST-JIRA-023: Search (basic, label, JSON, federated)
- TEST-JIRA-030 to TEST-JIRA-033: Get issue (details, JSON, transitions, labels)
- TEST-JIRA-040 to TEST-JIRA-041: Dev info
- TEST-JIRA-050: Labels discovery

**Write Tests (With Cleanup):**
- TEST-JIRA-100: Create issue
- TEST-JIRA-101: Create with description
- TEST-JIRA-102: Create sub-task

**Error Tests:**
- TEST-JIRA-200: Invalid profile
- TEST-JIRA-201: Non-existent issue
- TEST-JIRA-202: Missing required field

---

## Human Approval Gates

- [x] **GATE 1:** File inventory approved (2025-12-12)
- [x] **GATE 2:** Sanitization check passed (2025-12-12)
- [x] **GATE 3:** Pre-release checklist complete (2025-12-12)
- [x] **GATE 4:** Tagged v1.0.0-jira (2025-12-12)
- [x] **GATE 5:** Cherry-pick to contrib-jira-v1.0.0 (20 files, 2025-12-12)
- [x] **GATE 6:** Pushed to fork/contrib-jira-v1.0.0 (2025-12-12)
- [x] **GATE 7:** PR #190 created (2025-12-12)

---

## PR Description (Draft)

```markdown
## Summary

Add Jira skill with TypeScript CLI following PAI deterministic-first architecture.

### Features
- Multi-instance profile support (personal/work Jira)
- Two-phase retrieval pattern (search → load)
- Full CLI: search, get, create, update, transition, comment, link
- Label taxonomy support
- GitHub dev panel integration
- Federated search across instances with `-p all`

### Architecture
- `bin/jira/jira.ts` - CLI entrypoint
- `bin/jira/lib/*.ts` - Core functions (api, config, format)
- `.claude/skills/Jira/SKILL.md` - Skill routing

### Documentation
- README.md - Quick start and overview
- docs/CLI-REFERENCE.md - Full command reference
- docs/CONCEPTS.md - Architecture and concepts
- ACCEPTANCE_TESTS.md - Manual test cases
- CHANGELOG.md - Version history

### Test Plan
- [ ] `jira --help` displays commands
- [ ] `jira profiles` lists configured profiles
- [ ] `jira search "test"` returns results (requires profile)
- [ ] Manual acceptance tests in ACCEPTANCE_TESTS.md
```

---

## Commands Reference

```bash
# Verify files to be released
git diff --name-only main

# Run sanitization check
grep -r "API_KEY\|TOKEN\|PASSWORD" bin/jira/ --include="*.ts"
grep -r "/Users/" bin/jira/ --include="*.ts"

# Create tag (after checklist complete)
git tag -a v1.0.0-jira -m "Release v1.0.0: Jira skill"

# Cherry-pick to contrib branch (for PAI contribution)
git checkout -b contrib-jira-v1.0.0 upstream/main
git checkout v1.0.0-jira -- \
    .claude/skills/Jira/ \
    bin/jira/ \
    openspec/specs/jira-cli.md \
    CHANGELOG.md
```
