---
name: SpecFirst
description: |
  Spec-driven development methodology for ANY software project.
  USE WHEN developing features, fixing bugs, creating skills, or preparing releases.
  USE WHEN user mentions specs, testing, release process, change proposals, or deployment.
  Provides flexible spec tooling guidance but STRICT release discipline.
---

# SpecFirst

**"If you can't specify it, you can't test it. If you can't test it, you can't trust it."**

Works for any project: PAI skills, CLI tools, web apps, libraries, or any codebase.

## Core Philosophy

- **Flexible on spec tooling**: Choose OpenSpec, lightweight markdown, or custom
- **Strict on release process**: File inventory, validation gates, manual review

AI tools make development easy—and make it easy to leak data or create bloated PRs. The release process must be more controlled than development.

### SpecFirst vs OpenSpec

| SpecFirst | OpenSpec |
|-----------|----------|
| **Process discipline** | **Spec format** |
| Release workflow, git ops | Requirement structure |
| File inventory | Change proposals |
| Pre-release checklist | Spec deltas, archive |

**They're complementary:** OpenSpec for tracking specs, SpecFirst for releasing safely.

---

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Develop** | "develop feature", "create skill", "set up branches", "start development" | `workflows/Develop.md` |
| **ProposeChange** | "propose change", "new feature", "change proposal" | `workflows/ProposeChange.md` |
| **Release** | "prepare release", "deploy", "create PR", "contribute upstream" | `workflows/Release.md` |
| **ValidateSpec** | "validate specs", "check compliance", "run tests" | `workflows/ValidateSpec.md` |

---

## Slash Commands

### OpenSpec Commands (Spec Workflow)

| Command | Purpose | When |
|---------|---------|------|
| `/openspec-proposal` | Create change folder with specs | Starting new feature |
| `/openspec-apply` | Implement from approved specs | After spec review |
| `/openspec-archive` | Merge specs, update CHANGELOG | After tests pass |

### SpecFirst Commands (Release Workflow)

| Command | Purpose | When |
|---------|---------|------|
| `/specfirst-propose` | Quick change proposal | Simple changes |
| `/specfirst-release` | Prepare release with file inventory | Before tagging |
| `/specfirst-validate` | Run validation checks | Before release |

---

## Command Reference

### /openspec-proposal

**Creates a change proposal with spec structure.**

**Usage:**
```
/openspec-proposal
> What feature or change? add-name-flag
> Which skill/project? Context
```

**Creates:**
```
openspec/changes/add-name-flag/
├── proposal.md     ← Summary, impact, rationale
├── tasks.md        ← Implementation checklist
└── specs/
    └── feature.md  ← SHALL/MUST requirements
```

**Output:** Presents files for human review. Waits for approval before proceeding.

---

### /openspec-apply

**Implements from approved specs.**

**Usage:**
```
/openspec-apply
> Which change? add-name-flag
```

**Process:**
1. Reads `proposal.md` and `specs/*.md`
2. Lists requirements to implement
3. Writes tests for each requirement (tests fail initially)
4. Implements code to make tests pass
5. Updates `tasks.md` as items complete

**Output:** Reports test results and task completion.

---

### /openspec-archive

**Merges completed specs and updates CHANGELOG.**

**Usage:**
```
/openspec-archive
> Which change? add-name-flag
```

**Process:**
1. Verifies all tasks complete
2. Merges spec deltas → `openspec/specs/`
3. Updates `CHANGELOG.md` (adds entry)
4. Moves folder → `openspec/archive/YYYY-MM-DD-add-name-flag/`

**Output:** Confirms merge, shows CHANGELOG entry.

---

### /specfirst-release

**Prepares release with file inventory.**

**Usage:**
```
/specfirst-release
> Version? v1.0.0
> Skill? SpecFirst
```

**Creates:** `RELEASE-v1.0.0.md` with:
- File inventory (include list)
- Exclude list (what NOT to commit)
- Pre-release checklist
- Human approval gates

**Output:** Walks through release workflow step by step.

---

### /specfirst-validate

**Runs validation checks.**

**Usage:**
```
/specfirst-validate
> What to validate? specs
```

**Checks:**
- Spec format (SHALL/MUST language)
- File existence (all referenced files exist)
- Cross-references (links work)
- Test coverage (specs have tests)

**Output:** Validation report with pass/fail per check.

---

## Quick Reference

### The Spec-First Flow (with Commands)

```
/openspec-proposal          ← 1. SPECIFY: Define requirements (SHALL/MUST)
        │
        ▼  [Human reviews specs]
        │
/openspec-apply             ← 2. TEST: Write tests that validate spec
        │                     3. IMPLEMENT: Code that makes tests pass
        ▼
/openspec-archive           ← 4. ARCHIVE: Merge specs, update CHANGELOG
        │
        ▼
/specfirst-release          ← 5. RELEASE: File inventory, validation, PR
```

### CLI Tool (Optional)

```bash
# Install OpenSpec CLI globally
npm install -g @fission-ai/openspec@latest

# Initialize in project
openspec init

# List active changes
openspec list

# Interactive dashboard
openspec view

# Validate spec format
openspec validate <change-name>

# Archive completed change
openspec archive <change-name>
```

### Release Discipline (Strict)

Before any PR:
- [ ] Explicit file inventory (what's included/excluded)
- [ ] Change proposal reviewed
- [ ] Pre-release checklist passed
- [ ] Sanitization check (no PII, no secrets)

---

## Extended Context

**For detailed workflows, read:**
- `workflows/Develop.md` - Branch setup, standard & PAI contribution flows
- `workflows/ProposeChange.md` - Change proposal process
- `workflows/Release.md` - Versioning, tagging, release discipline
- `workflows/ValidateSpec.md` - Test pyramid, validation

**Templates:**
- `templates/RELEASE-FRAMEWORK.md` - Release methodology (copy to your skill)
- `templates/RELEASE-vX.Y.Z.md` - Release plan template (per release)
- `templates/Requirement.md` - SHALL/MUST format

**Reference docs:**
- `docs/WorkedExample.md` - Full walkthrough: developing a JIRA skill
- `docs/TestPyramid.md` - 4-layer test approach
- `docs/ToolingArchitecture.md` - Framework vs specs separation
- `docs/Approaches.md` - OpenSpec vs lightweight comparison

---

## Examples

**Example 1: Starting development (with specs)**
```
User: "I want to develop a new feature"

1. /openspec-proposal
   → Creates openspec/changes/my-feature/
   → Defines requirements (SHALL/MUST)
   → Human reviews specs

2. /openspec-apply
   → Writes tests for requirements
   → Implements code
   → Tests pass

3. /openspec-archive
   → Merges specs to openspec/specs/
   → Updates CHANGELOG.md
```

**Example 2: Preparing a PAI contribution**
```
User: "Prepare the Context skill for upstream contribution"

1. /specfirst-release
   → Create RELEASE-v1.0.0.md with file inventory
   → Run tests with --release v1.0.0
   → Complete checklist
   → Tag v1.0.0 (marks tested code)
   → Cherry-pick from tag to contrib branch
   → Push to fork for PR
```

**Example 3: Adding a feature (full flow)**
```
User: "Add --name flag to ingest direct"

1. /openspec-proposal
   → Creates openspec/changes/add-name-flag/
   → Spec: "The system SHALL allow filename override via --name"
   → Human approves spec

2. /openspec-apply
   → Write test: TEST-CLI-014
   → Implement in process.ts
   → Tests pass

3. /openspec-archive
   → Merges spec delta to openspec/specs/ingest-direct.md
   → Updates CHANGELOG.md

4. /specfirst-release (when ready for contribution)
```

---

## Related Documents

- **Claude Code Architecture**: Understanding skills vs agents
- **PAI Principles**: Foundation for spec-first thinking
- **Discussion #187**: Community input on methodology
