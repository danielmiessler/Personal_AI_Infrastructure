# ProposeChange Workflow

**Purpose:** Create a change proposal before implementing significant changes. Aligns intent between human and AI before code is written.

---

## When to Use

- Adding new features
- Modifying existing behavior
- Fixing bugs with multiple affected areas
- Any change touching more than 2-3 files

**Skip for:** Typo fixes, single-line changes, documentation updates

---

## The Core Pattern

```
1. SPECIFY  →  Define what the system SHALL do
2. TEST     →  Write tests that validate the spec
3. IMPLEMENT →  Code that makes tests pass
4. VALIDATE  →  Confirm tests pass, update docs
```

---

## Proposal Format

Create a proposal document (can be temporary or in `changes/` directory):

```markdown
# Change Proposal: [Feature Name]

## Summary
One sentence: what are we changing and why?

## Requirements

### Requirement: [Descriptive Name]
The system SHALL [behavior].

#### Scenario: [Use case]
- **WHEN** [trigger/condition]
- **THEN** [expected outcome]
- **AND** [additional outcomes]

## Impact
- **Files affected:** [list]
- **Breaking changes:** Yes/No
- **Dependencies:** [any new deps]

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Test Plan
- [ ] TEST-XXX: [description]
- [ ] TEST-YYY: [description]
```

---

## Example: --name Flag

**Proposal:**
```markdown
# Change Proposal: Filename Override Flag

## Summary
Implement --name flag for `ingest direct` to allow custom filenames.

## Requirements

### Requirement: Filename Override
The system SHALL allow users to override generated filenames via --name flag.

#### Scenario: CLI with --name flag
- **WHEN** user provides `--name "Custom-Name"`
- **THEN** output filename SHALL use "Custom-Name"
- **AND** `[name:Custom-Name]` SHALL appear in caption metadata

## Impact
- **Files affected:** process.ts (3 locations)
- **Breaking changes:** No (additive)
- **Dependencies:** None

## Tasks
- [ ] Add `name?: string` to SourceMetadata interface
- [ ] Add `case "name":` in metadata extraction switch
- [ ] Use `sourceMetadata.name` in generateFilename() calls

## Test Plan
- [ ] TEST-CLI-014: --name flag
- [ ] TEST-CLI-014a: -n short flag
- [ ] TEST-CLI-022: all flags combined
```

---

## Workflow Steps

### 1. Draft Proposal

```bash
# Create proposal (can be in changes/ or temporary)
# For OpenSpec users:
openspec/changes/[feature-name]/proposal.md

# For lightweight approach:
# Just describe in conversation or create temp file
```

### 2. Review Requirements

Before implementing, verify:
- [ ] Requirements are testable (has WHEN/THEN)
- [ ] Scope is clear (files affected listed)
- [ ] No ambiguity in expected behavior

### 3. Align with Human

**AI asks:**
> "Here's my understanding of the change. Does this match your intent?"
> [Shows proposal summary]

**Human confirms or adjusts**

### 4. Proceed to Implementation

Once aligned:
- Write tests first (they define the spec)
- Implement to make tests pass
- Validate all tests pass

---

## SHALL/MUST Language

Use precise language for testable requirements:

| Word | Meaning |
|------|---------|
| **SHALL** | Mandatory requirement |
| **SHOULD** | Recommended but not required |
| **MAY** | Optional |
| **MUST** | Absolute requirement (stronger than SHALL) |

**Good:** "The system SHALL return exit code 0 on success"
**Bad:** "The system should work correctly"

---

## Lightweight vs Full OpenSpec

### Lightweight (Default)
- Describe proposal in conversation
- Use SHALL/MUST language
- List tasks and tests
- No special directory structure

### Full OpenSpec
```
openspec/
├── specs/           # Current truth
└── changes/
    └── [feature]/
        ├── proposal.md
        ├── tasks.md
        └── specs/   # Delta
```

**Choose based on:**
- Team size (solo = lightweight, team = full)
- Change complexity (simple = lightweight, complex = full)
- Audit needs (compliance = full, personal = lightweight)

---

## Related Workflows

- **DevelopSkill.md** - Set up branches first
- **Release.md** - After implementation, prepare release
- **ValidateSpec.md** - Run validation checks
