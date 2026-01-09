# Installing mai-specdev-skill

## Prerequisites

- Bun runtime
- mai-project-core package
- mai-specdev-core package

## Installation Steps

### 1. Install Dependencies

```bash
cd /path/to/mai-specdev-skill
bun install
```

### 2. Run Tests

```bash
bun test
```

### 3. Type Check

```bash
bun run typecheck
```

### 4. Link for Global Access

```bash
bun link
```

This makes `mai-spec`, `mai-design`, and `mai-quality` available globally.

### 5. Register as PAI Skill

Add to your skill index (`~/PAI/skills/skill-index.json`):

```json
{
  "specdev": {
    "name": "specdev",
    "path": "~/PAI/packages/mai-specdev-skill",
    "description": "Spec-first development workflows",
    "triggers": ["new spec", "create design", "quality check"]
  }
}
```

## Verification

```bash
bun test && bun run typecheck
mai-spec --help
mai-design --help
mai-quality --help
```

## Troubleshooting

### "Cannot find module mai-specdev-core"

```bash
cd ../mai-specdev-core
bun link
cd ../mai-specdev-skill
bun link mai-specdev-core
```

### CLI commands not found

Run `bun link` in the mai-specdev-skill directory.
