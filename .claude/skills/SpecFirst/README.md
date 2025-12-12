# SpecFirst Skill

Spec-driven development methodology for Claude Code. Works for any software project.

**"If you can't specify it, you can't test it. If you can't test it, you can't trust it."**

## Quick Start

```
/openspec-proposal     ← Define requirements first
/openspec-apply        ← Implement from specs
/openspec-archive      ← Merge specs, update CHANGELOG
/specfirst-release     ← Prepare for contribution
```

## Setup

### 1. Install Skill Files

The skill should be at `.claude/skills/SpecFirst/`.

Required files:
```
.claude/skills/SpecFirst/
├── SKILL.md              ← Main skill file
├── CHANGELOG.md          ← Release history
├── README.md             ← This file
├── ACCEPTANCE_TESTS.md   ← Manual test checklist
├── workflows/
│   ├── Develop.md
│   ├── Release.md
│   ├── ProposeChange.md
│   └── ValidateSpec.md
├── templates/
│   ├── RELEASE-FRAMEWORK.md
│   ├── RELEASE-vX.Y.Z.md
│   └── Requirement.md
├── docs/
│   ├── TestPyramid.md
│   ├── ToolingArchitecture.md
│   └── Approaches.md
└── openspec/             ← Skill's own specs (dogfooding)
    ├── specs/
    ├── changes/
    └── archive/
```

### 2. Install Slash Commands

Copy command files to `.claude/commands/`:

```bash
# These should already be in place:
ls .claude/commands/openspec-*.md
ls .claude/commands/specfirst-*.md
```

Required commands:
- `openspec-proposal.md`
- `openspec-apply.md`
- `openspec-archive.md`
- `specfirst-propose.md`
- `specfirst-release.md`
- `specfirst-validate.md`

### 3. Add CORE Skill Routing (Optional)

To have CORE automatically route to SpecFirst, add to `.claude/skills/CORE/SKILL.md`:

```markdown
## Workflow Routing

...

**When user mentions specs, testing, release, or development workflow:**
Examples: "develop a feature", "prepare release", "spec first", "change proposal"
→ **READ:** .claude/skills/SpecFirst/SKILL.md
→ **FOLLOW:** Spec-first development workflow
```

**Note:** This step is optional. You can also invoke SpecFirst directly by reading the skill:
```
read .claude/skills/SpecFirst/SKILL.md
```

### 4. Install OpenSpec CLI (Optional)

For interactive spec management:

```bash
npm install -g @fission-ai/openspec@latest

# Initialize in your project
openspec init

# View active changes
openspec list
```

## Usage

### Starting a New Feature

```
User: "I want to add a --verbose flag"

Claude: Let me create a spec proposal first.
        /openspec-proposal

        [Creates spec files, waits for review]

User: "Looks good, implement it"

Claude: /openspec-apply
        [Writes tests, implements, runs tests]

User: "Tests pass, archive it"

Claude: /openspec-archive
        [Merges specs, updates CHANGELOG]
```

### Preparing a Release

```
User: "Prepare v1.0.0 for contribution"

Claude: /specfirst-release
        [Creates file inventory, walks through checklist]
```

## Testing

Before PR submission, run the acceptance tests:

```
read .claude/skills/SpecFirst/ACCEPTANCE_TESTS.md
```

Quick test checklist:
- [ ] Skill routing recognized (Test 1)
- [ ] `/openspec-proposal` creates structure (Test 2)
- [ ] `/openspec-archive` merges correctly (Test 5)
- [ ] Spec-before-code enforced (Test 7)
- [ ] Dogfooding in place (Test 10)

## Architecture

```
SpecFirst (Process Discipline)    +    OpenSpec (Spec Format)
├── Release workflow                   ├── specs/ directory
├── File inventory                     ├── changes/ proposals
├── Pre-release checklist              ├── SHALL/MUST language
└── Sanitization gates                 └── Archive audit trail
```

**They're complementary:** OpenSpec for tracking specs, SpecFirst for releasing safely.

## Files Overview

| File | Purpose |
|------|---------|
| `SKILL.md` | Entry point, workflow routing, command reference |
| `workflows/Develop.md` | Branch setup, spec-first development |
| `workflows/Release.md` | Versioning, tagging, contribution |
| `templates/RELEASE-vX.Y.Z.md` | Per-release plan template |
| `ACCEPTANCE_TESTS.md` | Manual test checklist |

## Related

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) - Spec methodology
- [PAI Discussion #187](https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions/187) - Community input
- [Keep a Changelog](https://keepachangelog.com) - CHANGELOG format
