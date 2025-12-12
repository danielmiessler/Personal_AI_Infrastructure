# Spec-Driven Approaches

**Comparing lightweight vs full spec tooling options.**

---

## Overview

SpecFirst is **process-agnostic** on spec tooling. Choose the approach that fits your needs:

| Approach | Best For | Tooling |
|----------|----------|---------|
| **Lightweight** | Solo dev, simple changes | Markdown in conversation |
| **OpenSpec** | Teams, audit trails | `openspec` CLI |
| **Custom** | Specific workflows | Your own structure |

---

## Lightweight (Default)

No special tooling—just disciplined markdown.

### How It Works

1. Describe proposal in conversation using SHALL/MUST language
2. List tasks and test plan
3. Implement
4. Validate

### Example

```
User: "Add --name flag to ingest direct"

AI: Here's my proposal:

### Requirement: Filename Override
The system SHALL allow filename override via --name flag.

#### Scenario: With --name
- WHEN user provides `--name "Custom"`
- THEN filename uses "Custom"

Tasks:
- [ ] Add name to SourceMetadata
- [ ] Handle in metadata extraction
- [ ] Use in generateFilename()

Test: TEST-CLI-014

Does this match your intent?
```

### Pros/Cons

| Pros | Cons |
|------|------|
| No setup | No persistent specs |
| Fast for small changes | No audit trail |
| Conversational | Hard to track across sessions |

---

## OpenSpec

Full spec management with CLI tooling.

### Structure

```
openspec/
├── specs/                    # Current source of truth
│   ├── cli.md               # CLI specification
│   └── api.md               # API specification
├── changes/                  # Proposed modifications
│   └── feature-name/
│       ├── proposal.md      # What and why
│       ├── tasks.md         # Implementation checklist
│       └── specs/           # Spec deltas (ADDED/MODIFIED/REMOVED)
├── archive/                  # Completed changes (audit trail)
├── project.md               # Project conventions
└── AGENTS.md                # AI workflow instructions
```

### Workflow

```bash
# Initialize
openspec init

# Create proposal
mkdir -p openspec/changes/my-feature
# Create proposal.md, tasks.md, specs/

# Validate
openspec validate my-feature

# After implementation
openspec archive my-feature
```

### Pros/Cons

| Pros | Cons |
|------|------|
| Persistent specs | Setup overhead |
| Audit trail (archive/) | More files to manage |
| Team collaboration | Overkill for simple changes |
| Spec deltas track evolution | |

### When to Use

- Team projects
- Compliance/audit requirements
- Complex, long-running features
- Public contributions

---

## Hybrid Approach

Use lightweight for daily work, OpenSpec for releases:

```
Daily Development          Release Preparation
─────────────────          ───────────────────
Conversational specs   →   RELEASE-vX.Y.Z.md
Quick iteration        →   File inventory
Informal tracking      →   Pre-release checklist
                       →   Audit trail
```

**This is the SpecFirst default:** flexible during development, strict at release.

---

## Choosing an Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    DECISION TREE                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Is this a team project?                                    │
│  ├── YES → OpenSpec (collaboration, audit trail)            │
│  └── NO                                                     │
│      │                                                      │
│      Is there compliance/audit requirement?                 │
│      ├── YES → OpenSpec                                     │
│      └── NO                                                 │
│          │                                                  │
│          Is change complex (>5 files, multi-week)?          │
│          ├── YES → OpenSpec or detailed proposal.md         │
│          └── NO → Lightweight (conversational)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## SpecFirst + OpenSpec

They're **complementary**, not alternatives:

| SpecFirst | OpenSpec |
|-----------|----------|
| **Process discipline** | **Spec format** |
| Branch strategy | Requirement structure |
| Release workflow | Change proposals |
| File inventory | Spec deltas |
| Pre-release checklist | Archive audit trail |
| Git operations | SHALL/MUST language |

**Use together:**
- OpenSpec to define and track specifications
- SpecFirst to release changes safely

---

## Related

- **ProposeChange.md** - Proposal workflow
- **Release.md** - Release discipline
- **Requirement.md** - Template for specs
- **OpenSpec GitHub**: https://github.com/Fission-AI/OpenSpec
