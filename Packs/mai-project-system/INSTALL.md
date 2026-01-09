# Installing mai-project-system

## Prerequisites

- Bun runtime
- mai-project-core package

## Installation Steps

### 1. Install Dependencies

```bash
cd /path/to/mai-project-system
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

### 5. Configure PreCompact Hook

Add to your Claude Code settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "hooks": {
    "PreCompact": [
      {
        "command": "bun run ~/PAI/packages/mai-project-system/src/hooks/pre-compact.ts"
      }
    ]
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
3. **Hook executable**: `echo '{"session_id":"test","transcript_path":"/tmp/test.jsonl","cwd":"/tmp","trigger":"manual"}' | bun run src/hooks/pre-compact.ts` outputs status JSON

## Troubleshooting

### "Cannot find module mai-project-core"

Ensure mai-project-core is installed and linked:

```bash
cd ../mai-project-core
bun link
cd ../mai-project-system
bun link mai-project-core
```

### Hook not triggering

1. Check Claude Code settings file location
2. Verify the path to pre-compact.ts is correct
3. Check hook has execute permissions

### Type errors

Ensure `allowImportingTsExtensions` is enabled in tsconfig.json.
