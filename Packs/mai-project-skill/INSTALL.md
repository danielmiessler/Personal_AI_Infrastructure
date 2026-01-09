# Installing mai-project-skill

## Prerequisites

- Bun runtime
- mai-project-core package

## Installation Steps

### 1. Install Dependencies

```bash
cd /path/to/mai-project-skill
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

This makes `mai-init` and `mai-gate` available globally.

### 5. Register as PAI Skill

Add to your skill index (`~/PAI/skills/skill-index.json`):

```json
{
  "project": {
    "name": "project",
    "path": "~/PAI/packages/mai-project-skill",
    "description": "Project creation and management",
    "triggers": ["new project", "init project", "project status"]
  }
}
```

## Verification

Run the verification script:

```bash
bun run verify
```

Or manually verify:

1. **Tests pass**: `bun test` shows all green
2. **Types check**: `bun run typecheck` has no errors
3. **CLI works**: `mai-init --help` shows usage
4. **Gate CLI works**: `mai-gate --help` shows usage

## Usage

### Create a New Project

```bash
mai-init
```

Follow the prompts to create a project.

### Initialize Existing Directory

```bash
cd ~/existing-project
mai-init --existing
```

### Check Project Status

```bash
cd ~/my-project
mai-gate status
```

## Troubleshooting

### "Cannot find module mai-project-core"

Ensure mai-project-core is installed and linked:

```bash
cd ../mai-project-core
bun link
cd ../mai-project-skill
bun link mai-project-core
```

### "mai-init: command not found"

Run `bun link` in the mai-project-skill directory to register the CLI globally.

### Interactive prompts not working

Ensure you're running in a TTY (not piped input). The prompts require an interactive terminal.
