# QualityCheck Workflow

## Purpose

Run quality gates to ensure code meets standards before proceeding.

## Trigger Phrases

- "quality check"
- "run quality gates"
- "check quality"

## Quality Gates

### 1. Linting

Check code for style and potential errors:

- **Tool**: biome, eslint
- **Config**: biome.json, .eslintrc.js
- **Fail On**: errors (warnings allowed)

### 2. Type Checking

Verify TypeScript types are correct:

- **Tool**: tsc
- **Config**: tsconfig.json
- **Mode**: --noEmit (check only)

### 3. Formatting

Ensure consistent code formatting:

- **Tool**: biome, prettier
- **Config**: biome.json, .prettierrc
- **Mode**: check only (no auto-fix)

### 4. Test Coverage

Run tests and check coverage:

- **Tool**: bun:test
- **Threshold**: 80% (configurable)

## Running Gates

### All Gates

```bash
mai-quality run
```

### Specific Gate

```bash
mai-quality run --gate lint
mai-quality run --gate types
mai-quality run --gate format
mai-quality run --gate coverage
```

### With Report

```bash
mai-quality run --report
```

## Output Format

```
=== Quality Gate Check ===

✓ lint: passed (245ms)
✓ types: passed (1.2s)
✗ format: failed - Formatting issues found
✓ coverage: passed (890ms)

Summary: 3/4 passed

Failed gates:
  - format: Formatting issues found
    Run 'bunx biome format --write .' to fix
```

## Configuration Detection

The tool automatically detects:
- `biome.json` → Use biome for lint/format
- `.eslintrc.*` → Use eslint for lint
- `.prettierrc` → Use prettier for format
- `tsconfig.json` → Enable type checking
- `tests/` directory → Enable test runner

## Gate Requirements by Phase

| Phase | Required Gates |
|-------|---------------|
| BUILD | lint, types |
| VERIFY | lint, types, format, coverage |
| SHIP | All gates must pass |

## Integration with Gates

Quality check results can block gate passage:

```bash
mai-gate pass TESTS_EXIST
# Fails if mai-quality returns errors
```

## Fixing Issues

| Gate | Fix Command |
|------|-------------|
| lint | `bunx biome check --fix .` |
| types | Fix type errors manually |
| format | `bunx biome format --write .` |
| coverage | Add more tests |
