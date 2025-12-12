# Release Workflow

**Purpose:** Strict, controlled release process for deploying skills and changes. More manual than development to prevent data leakage, bloated PRs, and scope creep.

---

## Why Stricter Releases?

AI tools make development easy—and make it easy to:
- **Leak data:** Personal config, API keys, sensitive fixtures
- **Bloat deployments:** Debug files, verbose output, tangential changes
- **Creep scope:** PRs touching far more than intended

**The release process must be more controlled than development.**

Move fast during implementation (tests provide confidence), but **slow down at the release gate**.

---

## Branch & Remote Reference

### Standard Development

| Name | Example | Visibility | Purpose |
|------|---------|------------|---------|
| **main** | `main` | Depends | Production branch |
| **feature** | `feature/add-name-flag` | Private | Your development work |

### PAI Contribution (Fork Pattern)

| Name | Remote | Branch | Visibility | Purpose |
|------|--------|--------|------------|---------|
| **upstream** | `upstream` | `main` | PUBLIC | Target repo (read-only) |
| **origin** | `origin` | `main` | PRIVATE | Your private copy |
| **feature** | `origin` | `feature/my-skill` | PRIVATE | Development (messy OK) |
| **contrib** | `origin` | `contrib-my-skill-v1.0.0` | PRIVATE | Clean staging |
| **fork** | `fork` | `contrib-my-skill-v1.0.0` | PUBLIC | PR source |

**Flow:**
```
upstream/main ← fork/contrib ← origin/contrib ← origin/feature
   (target)      (PR source)     (staging)       (development)
```

---

## Human Approval Gates

**This process is intentionally manual.** Each gate requires human review before proceeding.

| Gate | What to Review | Approval |
|------|----------------|----------|
| **1. File Inventory** | Is scope correct? Any missing/extra files? | ☐ Approved |
| **2. Test Results** | All tests pass? Any skipped tests justified? | ☐ Approved |
| **3. Pre-Release Checklist** | All boxes checked? | ☐ Approved |
| **4. Tag Creation** | Ready to mark this as tested release? | ☐ Approved |
| **5. Cherry-Pick Review** | Staged files match inventory exactly? | ☐ Approved |
| **6. Sanitization** | No secrets, PII, or personal data? | ☐ Approved |
| **7. Push to Fork** | Ready to make this public? | ☐ Approved |
| **8. Create PR** | Description accurate? Ready for upstream? | ☐ Approved |

**Never skip gates.** AI can assist with each step, but human approves before moving to next.

---

## Versioning & Test Run Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERSION LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. RELEASE-v1.0.0.md        ← Define scope, file inventory     │
│         │                                                        │
│         ▼                                                        │
│  2. Test run --release v1.0.0                                   │
│     └── output/release-v1.0.0-2025-12-12-14-30-00/              │
│         │                                                        │
│         ▼                                                        │
│  3. CHANGELOG.md             ← Move [Unreleased] → [v1.0.0]     │
│         │                                                        │
│         ▼                                                        │
│  4. git tag v1.0.0           ← Marks EXACT code that was tested │
│         │                                                        │
│         ▼                                                        │
│  5. Cherry-pick FROM TAG     ← Ensures PR = tested code         │
│         │                                                        │
│         ▼                                                        │
│  6. PR created                                                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  IF PR NEEDS CHANGES:                                           │
│     → Fix on feature branch                                     │
│     → Test run --release v1.0.1                                 │
│     → Tag v1.0.1                                                │
│     → Cherry-pick from v1.0.1                                   │
│     → Push to contrib branch                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principle: Tag = Tested Code

- **Tag AFTER** tests pass, checklist complete
- **Tag BEFORE** creating PR
- **Cherry-pick FROM TAG** (not feature branch)
- Test run ID matches tag: `release-v1.0.0-*` → `v1.0.0`

This ensures the PR contains EXACTLY what was tested—no more, no less.

---

## Pre-Release Checklist

Before ANY release, complete this checklist:

### 1. File Inventory
- [ ] **Explicit include list:** What files are part of this release?
- [ ] **Explicit exclude list:** What files must NOT be released?
- [ ] **No new untracked files** that shouldn't be included

### 2. Sanitization
- [ ] **No PII:** Personal paths, usernames, email addresses
- [ ] **No secrets:** API keys, tokens, passwords
- [ ] **No sensitive fixtures:** Real user data, captured messages
- [ ] **Config externalized:** Paths/tokens in `.env`, not hardcoded

### 3. Scope Check
- [ ] **PR matches proposal:** Only changes from the original proposal
- [ ] **No drive-by fixes:** Unrelated changes go in separate PRs
- [ ] **Commit history clean:** Squash if needed

### 4. Validation
- [ ] **Tests pass:** All layers (unit, integration, CLI, acceptance)
- [ ] **Spec compliance:** Implementation matches requirements
- [ ] **Documentation updated:** README, CHANGELOG, help text

---

## Release Plan Template

For each release, create a RELEASE-vX.Y.Z.md file:

```markdown
# RELEASE-v1.0.0

## Summary
One sentence describing what this release delivers.

## File Inventory

### Included
- `.claude/skills/MySkill/SKILL.md`
- `.claude/skills/MySkill/workflows/DoSomething.md`
- `bin/my-cli/my-cli.ts`

### Excluded (never release)
- `.env`
- `config/personal.json`
- `test/fixtures/` (if contains real data)

## Pre-Release Checklist
- [ ] Files match inventory
- [ ] No PII in any file
- [ ] No hardcoded secrets
- [ ] Tests pass
- [ ] Documentation current

## Test Results
| Layer | Status | Notes |
|-------|--------|-------|
| Unit | PASS | 12/12 |
| Integration | PASS | 8/8 |
| CLI | PASS | 43/43 |
| Acceptance | PASS | 5/5 |

## PR Description
[Draft PR description for GitHub]
```

---

## File Inventory as Release Guide

**The RELEASE-vX.Y.Z.md file inventory is the source of truth for what goes into a release.**

```
RELEASE-v1.0.0.md                    Git Operations
─────────────────────────────────────────────────────────────
### Included                    →    These files get staged
  - .claude/skills/MySkill/         git add .claude/skills/MySkill/
  - bin/my-cli/                     git add bin/my-cli/
  - CHANGELOG.md                    git add CHANGELOG.md

### Excluded                    →    These files are NOT staged
  - .env                            (in .gitignore)
  - config/personal.json            git reset config/personal.json
  - test/fixtures/                  (in .gitignore or reset)
```

### Why This Matters

1. **Prevents scope creep:** Only files in the inventory get released
2. **Prevents data leakage:** Excluded files are explicitly blocked
3. **Creates audit trail:** The release plan documents exactly what was shipped
4. **Enables selective commits:** You can cherry-pick specific files instead of everything

### Verification Commands

```bash
# Before committing, verify ONLY inventory files are staged:
git diff --name-only main | sort > /tmp/actual-files.txt

# Compare against your RELEASE-vX.Y.Z.md include list
# Any file NOT in the inventory should be reset or gitignored

# If unwanted files appear:
git reset path/to/unwanted-file.ts
git checkout -- path/to/unwanted-file.ts
```

---

## Release Workflows

Choose the workflow that fits your situation:

| Workflow | When to Use |
|----------|-------------|
| **Standard Feature Branch** | Most projects - simple PR to main |
| **Fork Contribution** | Contributing to someone else's repo (e.g., PAI upstream) |

The **pre-release checklist and file inventory apply to ALL workflows**.

---

### Standard Feature Branch (Most Common)

For typical development: feature branch → PR → main.

```bash
# 1. Create release plan with file inventory
# Create RELEASE-vX.Y.Z.md (can be brief for small changes)

# 2. Ensure feature branch is ready
git checkout feature/my-feature
git status  # Verify clean state

# 3. Run pre-release checklist
# - Tests pass
# - No secrets/PII
# - Scope matches proposal

# 4. Push feature branch
git push origin feature/my-feature

# 5. Create PR
gh pr create \
  --base main \
  --title "feat: Add my feature" \
  --body "## Summary
[Description]

## Test Plan
- [x] Unit tests pass
- [x] Integration tests pass"

# 6. After review, merge (squash recommended for clean history)
gh pr merge --squash
```

**Key points:**
- Feature branch from `main`, PR back to `main`
- Squash merge keeps history clean
- File inventory still guides what's in the PR

---

### Fork Contribution (Open Source / PAI)

For contributing to upstream repos where you have a fork.

**Especially important for PAI:** Your personal AI is entangled with personal data, config, and paths. The contrib branch is a **sanitization gate** that forces you to explicitly select what gets contributed via the file inventory.

```
feature-branch  →  TAG  →  contrib-branch  →  fork  →  upstream/main
 (private dev)    (marks    (cherry-pick      (public)   (target)
  with personal    tested    from TAG)
  config mixed)    code)
```

**Why contrib branch matters for PAI:**
- Your working copy has `.env`, personal paths, real API keys
- Feature branch may have dozens of commits, debug changes, personal config
- Contrib branch: fresh from upstream, only file-inventory items cherry-picked FROM TAG
- Forces you to untangle contribution from personal data

---

#### Step-by-Step with Approval Gates

Each step requires **human approval** before proceeding to the next.

**PHASE 1: PRE-RELEASE (on feature branch)**

```bash
# ══════════════════════════════════════════════════════════════
# STEP 1: Create release plan with file inventory
# ══════════════════════════════════════════════════════════════
# Create RELEASE-v1.0.0.md listing every file to include/exclude
```
☐ **GATE 1: File inventory approved?** Review scope before proceeding.

```bash
# ══════════════════════════════════════════════════════════════
# STEP 2: Run tests with release flag
# ══════════════════════════════════════════════════════════════
git checkout feature/my-feature
bun test all --release v1.0.0
# Creates: output/release-v1.0.0-YYYY-MM-DD-HH-MM-SS/
```
☐ **GATE 2: Tests pass?** All tests must pass before proceeding.

```bash
# ══════════════════════════════════════════════════════════════
# STEP 3: Complete pre-release checklist
# ══════════════════════════════════════════════════════════════
# Go through RELEASE-v1.0.0.md checklist manually
# Update CHANGELOG.md: Move [Unreleased] → [v1.0.0] - DATE
```
☐ **GATE 3: Checklist complete?** All boxes checked before proceeding.

**PHASE 2: TAG (marks tested code)**

```bash
# ══════════════════════════════════════════════════════════════
# STEP 4: Create tag on feature branch
# ══════════════════════════════════════════════════════════════
git tag -a v1.0.0 -m "Release v1.0.0: [description]

Test run: release-v1.0.0-YYYY-MM-DD-HH-MM-SS"

git push origin v1.0.0  # Push to PRIVATE repo only!
```
☐ **GATE 4: Tag created?** This marks the exact code that was tested.

**PHASE 3: CONTRIBUTION (cherry-pick from tag)**

```bash
# ══════════════════════════════════════════════════════════════
# STEP 5: Create contrib branch from upstream
# ══════════════════════════════════════════════════════════════
git fetch upstream
git checkout -b contrib-my-feature-v1.0.0 upstream/main
```

```bash
# ══════════════════════════════════════════════════════════════
# STEP 6: Cherry-pick FROM TAG (not feature branch!)
# ══════════════════════════════════════════════════════════════
# The RELEASE-v1.0.0.md file inventory IS your cherry-pick specification.
#
# Example from RELEASE-v1.0.0.md:
# | # | File                              | Include | Reason              |
# |---|-----------------------------------|---------|---------------------|
# | 1 | .claude/skills/MySkill/SKILL.md   | ✅      | Skill definition    |
# | 2 | .claude/skills/MySkill/workflows/ | ✅      | Workflows           |
# | 3 | bin/my-cli/                       | ✅      | CLI implementation  |
# | - | bin/my-cli/test/                  | ❌      | Contains fixtures   |
# | - | .env                              | ❌      | Contains secrets    |
#
# Cherry-pick ONLY the ✅ Include files:
git checkout v1.0.0 -- \
    .claude/skills/MySkill/ \
    bin/my-cli/ \
    .claude/.env.example

# Remove any ❌ Exclude files that got pulled in:
rm -rf bin/my-cli/test/ \
       .claude/skills/MySkill/RELEASE-v1.0.0.md
```

**The file inventory is the release specification.** Every ✅ becomes a cherry-pick path. Every ❌ gets removed if accidentally included.

```bash
# ══════════════════════════════════════════════════════════════
# STEP 7: Verify staged files match inventory EXACTLY
# ══════════════════════════════════════════════════════════════
git diff --name-only upstream/main | sort

# Compare this output against your RELEASE-v1.0.0.md include list
# If ANY file is not in inventory: git checkout upstream/main -- path/to/file
```
☐ **GATE 5: Staged files match inventory?** No extra files, no missing files.

```bash
# ══════════════════════════════════════════════════════════════
# STEP 8: Run sanitization check
# ══════════════════════════════════════════════════════════════
./scripts/sanitize-for-contrib.sh

# Or manually:
grep -r "API_KEY\|TOKEN\|PASSWORD" --include="*.ts"
grep -r "/Users/\|/home/" --include="*.ts" --include="*.md"
```
☐ **GATE 6: Sanitization passes?** No secrets, no personal paths.

```bash
# ══════════════════════════════════════════════════════════════
# STEP 9: Commit with clean message
# ══════════════════════════════════════════════════════════════
git add -A
git commit -m "feat(my-skill): Add MySkill for [purpose]

- Feature 1
- Feature 2

Implements CLI-First architecture."
```

**PHASE 4: PUBLISH (make public)**

```bash
# ══════════════════════════════════════════════════════════════
# STEP 10: Push to fork (THIS MAKES IT PUBLIC!)
# ══════════════════════════════════════════════════════════════
git push fork contrib-my-feature-v1.0.0
```
☐ **GATE 7: Ready to make public?** Once pushed to fork, it's visible.

```bash
# ══════════════════════════════════════════════════════════════
# STEP 11: Create PR to upstream
# ══════════════════════════════════════════════════════════════
gh pr create \
  --repo upstream-owner/repo \
  --head your-username:contrib-my-feature-v1.0.0 \
  --base main \
  --title "feat(my-skill): Add MySkill" \
  --body-file PR_DESCRIPTION.md
```
☐ **GATE 8: PR created?** Review PR description before submitting.

---

#### If PR Needs Changes

```bash
# Fix on feature branch (NOT contrib branch)
git checkout feature/my-feature
# Make fixes...

# Increment version and re-test
bun test all --release v1.0.1
git tag -a v1.0.1 -m "Release v1.0.1: Address PR feedback"
git push origin v1.0.1

# Update contrib branch from NEW tag
git checkout contrib-my-feature-v1.0.0
git checkout v1.0.1 -- .claude/skills/MySkill/ bin/my-cli/
git commit -m "fix: Address PR feedback"
git push fork contrib-my-feature-v1.0.0
```

---

#### Why This Flow?

| Step | Why It Matters |
|------|----------------|
| **Tag before contrib** | Marks exact tested code; PR matches test run |
| **Cherry-pick from TAG** | Not from feature branch (may have new commits) |
| **Contrib branch** | Fresh from upstream, clean diff |
| **Single commit = squash** | 50 messy commits become 1 clean commit |
| **File inventory** | Explicit control over what's included |
| **Human gates** | Prevents accidental data leaks |

#### Where's the Squash?

The squash happens **implicitly** through the file inventory:

```
RELEASE-v1.0.0.md (specification):
  | File                    | Include |
  |-------------------------|---------|
  | .claude/skills/MySkill/ | ✅      |
  | bin/my-cli/             | ✅      |
  | bin/my-cli/test/        | ❌      |
  | .env                    | ❌      |
            │
            ▼
Feature branch:              Contrib branch:
  50 commits                   ↓
  "wip", "debug"               ↓  git checkout v1.0.0 -- [✅ files only]
  "fix typo", "revert"         ↓  git commit -m "feat: Add feature"
  TAG: v1.0.0          ────────→  ONE CLEAN COMMIT
```

- **File inventory** = what gets cherry-picked (✅ Include only)
- **Feature branch** = 50 messy commits
- **Contrib branch** = 1 clean commit with only inventory files

**The release specification drives everything:** what to test, what to tag, what to cherry-pick, what ends up in the PR.

---

## Sanitization Checks

### Manual Checks

```bash
# Search for common secrets patterns
grep -r "API_KEY\|api_key\|TOKEN\|token\|PASSWORD" --include="*.ts" --include="*.md"

# Search for personal paths
grep -r "/Users/\|/home/" --include="*.ts" --include="*.md"

# List all files that would be committed
git diff --name-only main

# Check for large files (might be fixtures)
find . -type f -size +100k
```

### Automated Script (Example)

```bash
#!/bin/bash
# sanitize-for-contrib.sh

echo "Checking for secrets..."
if grep -rq "API_KEY\|TELEGRAM_BOT_TOKEN" --include="*.ts"; then
  echo "ERROR: Found potential secrets"
  exit 1
fi

echo "Checking for personal paths..."
if grep -rq "/Users/[a-z]" --include="*.ts" --include="*.md"; then
  echo "ERROR: Found personal paths"
  exit 1
fi

echo "Sanitization check passed"
```

---

## Common Release Mistakes

| Mistake | Prevention |
|---------|------------|
| Committing `.env` | Add to `.gitignore`, check `git status` |
| Personal paths in code | Use environment variables |
| Real test fixtures | Design fixtures to be synthetic |
| Scope creep in PR | Stick to file inventory |
| Skipping tests | Require passing tests before release |

---

## Real Example

See the Context Skill PR #183 for a complete example:
- **RELEASE-FRAMEWORK.md**: `.claude/skills/Context/RELEASE-FRAMEWORK.md`
- **RELEASE-v1.0.0.md**: `.claude/skills/Context/RELEASE-v1.0.0.md`
- **CHANGELOG.md**: `.claude/skills/Context/CHANGELOG.md`

---

## Related Workflows

- **DevelopSkill.md** - Branch setup before development
- **ProposeChange.md** - Define scope before implementing
- **ValidateSpec.md** - Run validation before release
