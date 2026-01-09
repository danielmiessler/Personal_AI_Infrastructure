# Installing mai-orchestration-core

## Prerequisites

- Bun runtime

## Installation Steps

### 1. Install Dependencies

```bash
cd /path/to/mai-orchestration-core
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

```bash
bun test && bun run typecheck
```

## Usage in Projects

```typescript
import {
  createFarmTask,
  AgentRegistry,
  ResultAggregator,
} from 'mai-orchestration-core';
```
