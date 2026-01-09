# mai-specdev-skill

PAI Skill Pack for spec-first software development workflows.

## Features

- **Spec Creation**: Interactive wizard for specification documents
- **Design Creation**: Design document creation linked to specs
- **Quality Gates**: Automated code quality checking
- **Security Reviews**: Phase-based security checklists

## Installation

```bash
bun add mai-specdev-skill
```

## CLI Tools

### mai-spec

Create specification documents:

```bash
mai-spec                     # Interactive wizard
mai-spec --from-claude       # Extract from CLAUDE.md
mai-spec --title "Auth"      # Pre-fill title
```

### mai-design

Create design documents:

```bash
mai-design                   # Interactive wizard
mai-design --spec SPEC.md    # Link to specific spec
```

### mai-quality

Run quality gates:

```bash
mai-quality                  # Run all gates
mai-quality run --gate lint  # Run specific gate
mai-quality status           # Show configuration
```

## Skill Triggers

When loaded as a PAI Skill:

| Phrase | Action |
|--------|--------|
| "new spec" | CreateSpec workflow |
| "create design" | CreateDesign workflow |
| "quality check" | QualityCheck workflow |
| "security review" | SecurityReview workflow |

## Workflows

### CreateSpec

Guides through spec creation:
1. Problem statement
2. Success criteria
3. Approach
4. Security implications

### CreateDesign

Guides through design creation:
1. Component identification
2. Interface definitions
3. Test strategy
4. Security controls

### QualityCheck

Runs automated checks:
- Linting (biome/eslint)
- Type checking (tsc)
- Formatting (biome/prettier)
- Test coverage

### SecurityReview

Phase-specific security checklists:
- SPEC: Data sensitivity, auth requirements
- DESIGN: Encryption, validation
- BUILD: Dependencies, secrets
- TEST: Penetration testing
- SHIP: Configuration, monitoring

## Dependencies

- `mai-project-core`: Project types
- `mai-specdev-core`: Document types and templates
- `@inquirer/prompts`: Interactive prompts
- `commander`: CLI framework

## License

MIT
