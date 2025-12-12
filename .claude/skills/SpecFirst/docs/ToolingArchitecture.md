# Tooling Architecture

**Separating methodology from tooling, and tooling from specs.**

---

## The Three Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                 PAI DEVELOPMENT LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LAYER 1: METHODOLOGY (SpecFirst Skill)                         │
│  └── .claude/skills/SpecFirst/                                  │
│      ├── workflows/           ← How to develop, release         │
│      ├── templates/           ← Standard formats                │
│      └── docs/                ← Test pyramid, architecture      │
│                                                                 │
│  LAYER 2: TOOLING (pai-tooling repo)                            │
│  └── pai-tooling/                                               │
│      ├── framework/           ← Test runners, validators        │
│      │   ├── cli-runner.ts                                      │
│      │   ├── integration-runner.ts                              │
│      │   └── llm-judge.ts                                       │
│      └── TEST-FRAMEWORK-SPEC.md                                 │
│                                                                 │
│  LAYER 3: SKILL-SPECIFIC (per skill)                            │
│  └── pai-tooling/[skill]-test/                                  │
│      ├── specs/               ← Test definitions for THIS skill │
│      ├── fixtures/            ← Test data (design non-sensitive)│
│      └── output/              ← Test results                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Methodology (SpecFirst Skill)

**What it is:** Process knowledge—how to develop, test, and release.

**Contains:**
- Workflows (DevelopSkill, ProposeChange, Release, ValidateSpec)
- Templates (RELEASE-FRAMEWORK, RELEASE-vX.Y.Z)
- Documentation (TestPyramid, this doc)

**Key insight:** This is **context loaded into Claude's prompt**. It teaches methodology, not execution.

---

## Layer 2: Tooling (Independent)

**What it is:** Reusable test infrastructure that can run tests for ANY skill.

**Contains:**
```
pai-tooling/
├── framework/                 ← Generic runners
│   ├── cli-runner.ts          ← Executes CLI tests
│   ├── integration-runner.ts  ← Executes integration tests
│   ├── acceptance-runner.ts   ← Executes acceptance tests
│   ├── llm-judge.ts           ← AI-powered evaluation
│   ├── types.ts               ← Shared type definitions
│   └── report.ts              ← Generate test reports
└── TEST-FRAMEWORK-SPEC.md     ← Spec for the framework itself
```

**Characteristics:**
- **Independent of any skill** - can test Context, SpecFirst, or any future skill
- **Reusable** - shared across projects
- **Public** - could be published as npm package

---

## Layer 3: Skill-Specific Tests

**What it is:** Test definitions and data for a specific skill.

**Contains:**
```
pai-tooling/context-test/      ← Tests for Context skill
├── specs/                     ← Test definitions
│   ├── cli-direct.spec.ts
│   ├── cli-context.spec.ts
│   └── scope.spec.ts
├── fixtures/                  ← Test data
│   └── (synthetic data)
└── output/                    ← Test results
    └── test-2025-12-12/
```

**Characteristics:**
- **Tightly coupled** to the skill being tested
- **Uses Layer 2 tooling** to execute tests
- **Fixtures should be non-sensitive** (synthetic data)

---

## Why This Separation?

| Aspect | Layer 1: Methodology | Layer 2: Tooling | Layer 3: Specs |
|--------|---------------------|------------------|----------------|
| **Changes when** | Process evolves | Framework improves | Skill changes |
| **Reusability** | All PAI development | All PAI skills | One skill |
| **Coupling** | None | None | Tight to skill |
| **Visibility** | Public (in PAI) | Public (npm pkg) | Public |
| **Example** | "Use 4-layer tests" | `cli-runner.ts` | `TEST-CLI-014` |

---

## What's Sensitive?

| Component | Sensitive? | Recommendation |
|-----------|------------|----------------|
| Methodology (Layer 1) | No | Public skill in PAI |
| Framework (Layer 2) | No | Public npm package |
| Specs (Layer 3) | No | Part of skill contribution |
| Fixtures | **Should be No** | Design with synthetic data |
| Config | **Yes** | `.env` file, gitignored |

**Best practice:** Design test fixtures to be non-sensitive from the start:
- Use synthetic test data
- Use public documents for test content
- Keep API tokens and paths in `.env`

---

## Integration via Symlinks

For local development, link the test framework to PAI:

```bash
# Create symlink in PAI pointing to test framework
ln -s ~/path/to/pai-tooling/context-test ~/path/to/PAI/bin/ingest/test

# Add to .gitignore
echo "bin/ingest/test" >> .gitignore
```

This allows:
- Running tests from PAI directory: `bun run ingest.ts test cli`
- Keeping test infrastructure versioned separately
- Not committing sensitive fixtures to PAI repo

---

## Future: npm Package

Layer 2 tooling could become a public npm package:

```bash
npm install -g @pai/test-framework

# Then in any skill project:
pai-test init
pai-test run cli
pai-test run all
```

This would:
- Standardize testing across PAI ecosystem
- Allow community contributions to framework
- Keep methodology (Layer 1) in PAI, tooling (Layer 2) as separate package

---

## Related Docs

- **TestPyramid.md** - The 4-layer approach
- **ValidateSpec.md** - Workflow for running tests
- **Release.md** - Using tests in release process
