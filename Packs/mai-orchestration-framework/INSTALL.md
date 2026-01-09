# Installing mai-orchestration-framework

## Prerequisites

- Bun runtime
- mai-orchestration-core package
- mai-project-system package

## Installation Steps

### 1. Install Dependencies

```bash
cd /path/to/mai-orchestration-framework
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

## Troubleshooting

### "Cannot find module mai-orchestration-core"

```bash
cd ../mai-orchestration-core
bun link
cd ../mai-orchestration-framework
bun link mai-orchestration-core
```
