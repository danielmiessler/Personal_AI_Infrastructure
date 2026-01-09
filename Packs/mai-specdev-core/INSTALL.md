# Installing mai-specdev-core

## Prerequisites

- Bun runtime
- mai-project-core package

## Installation Steps

### 1. Install Dependencies

```bash
cd /path/to/mai-specdev-core
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

### 4. Link for Local Development

```bash
bun link
```

## Verification

Run the verification script:

```bash
bun test && bun run typecheck
```

## Usage in Projects

```typescript
import {
  createSpecDocument,
  createDesignDocument,
  createSecurityChecklist,
} from 'mai-specdev-core';
```

## Troubleshooting

### "Cannot find module mai-project-core"

Ensure mai-project-core is installed and linked:

```bash
cd ../mai-project-core
bun link
cd ../mai-specdev-core
bun link mai-project-core
```
