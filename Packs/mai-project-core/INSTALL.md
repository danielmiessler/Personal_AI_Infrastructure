# Installation - mai-project-core

## Prerequisites

- Bun runtime (1.0+)
- PAI environment configured

## Installation Steps

### 1. Add to your package

```bash
cd your-package
bun add mai-project-core
```

Or link from local PAI packages:

```bash
bun add file:../../packages/mai-project-core
```

### 2. Import and use

```typescript
import {
  createProjectState,
  createTask,
  generateClaudeMd,
} from 'mai-project-core';

// Create a project
const project = createProjectState('My Project', 'software', 'Owner');

// Generate CLAUDE.md
const content = generateClaudeMd(project);
```

### 3. TypeScript configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "types": ["bun-types"]
  }
}
```

## Verification

Run the verification checklist:

```bash
cd /path/to/mai-project-core
bun test
bun run typecheck
```

All tests should pass and type checking should complete without errors.

## Troubleshooting

### Module not found

Ensure the package is installed:

```bash
bun install
```

### Type errors

Update bun-types:

```bash
bun add -d bun-types@latest
```

### Template not loading

Ensure the package is installed, not just linked. Template files must be accessible at runtime.
