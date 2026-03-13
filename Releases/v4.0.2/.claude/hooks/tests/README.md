# PAI Hook Integration Tests

> **Subprocess-based integration tests for PAI hooks using Bun.**

## Quick Start

```bash
# Run all tests
cd ~/.claude
bun test hooks/tests/

# Run a specific suite
bun test hooks/tests/SecurityValidator.test.ts
bun test hooks/tests/AgentExecutionGuard.test.ts
```

## Architecture

Tests run each hook as a **real subprocess** — no mocks, no monkey-patching. This ensures tests validate the exact same code path that runs in production.

```
Test Suite
    │
    ├── Creates temp directory (isolated side effects)
    ├── Writes test data (patterns, ratings, etc.)
    │
    └── runHook('hooks/HookName.hook.ts', stdinData, env)
            │
            ├── Spawns: bun hooks/HookName.hook.ts
            ├── Pipes: JSON stdin (simulates Claude Code hook payload)
            ├── Sets: PAI_DIR=tempDir (isolates from real state)
            │
            └── Captures: stdout, stderr, exitCode, duration, json
```

### Key Design Decisions

1. **Real subprocesses** — Tests run the actual hook binary, not imported functions
2. **Temp directories** — Every test gets a fresh temp dir via `PAI_DIR` env override
3. **No mocks** — If a hook depends on external services (API, terminal), the test either:
   - Uses a short timeout and accepts graceful failure, or
   - Is marked as requiring a specific environment
4. **Fail-open testing** — Verifies hooks fail gracefully (exit 0) when dependencies are missing

## Test Harness API

### `runHook(hookPath, stdinData, env?, timeout?)`

Runs a hook as a subprocess with mock stdin.

```typescript
import { runHook, createTempDir, cleanupTempDir } from './harness';

const result = await runHook(
  'hooks/SecurityValidator.hook.ts',  // Relative to PAI_DIR
  { tool_name: 'Bash', tool_input: { command: 'ls' } },  // Stdin JSON
  { PAI_DIR: '/tmp/test-dir' },  // Extra env vars
  5000  // Timeout in ms (default: 10000)
);

// Result shape:
result.stdout    // string — captured stdout
result.stderr    // string — captured stderr
result.exitCode  // number — 0, 2, or -1 (timeout)
result.duration  // number — ms elapsed
result.json      // any — parsed last JSON line from stdout (null if not JSON)
```

### `createTempDir(prefix?)` / `cleanupTempDir(dir)`

Create and cleanup temporary directories for test isolation.

```typescript
let tempDir: string;

beforeEach(() => {
  tempDir = createTempDir('pai-test-');
  // Set up test data in tempDir...
});

afterEach(() => {
  cleanupTempDir(tempDir);
});
```

## Test Suites

| Suite | Hook | Tests | Dependencies |
|-------|------|-------|--------------|
| SecurityValidator | `SecurityValidator.hook.ts` | 10 | `patterns.yaml` |
| AgentExecutionGuard | `AgentExecutionGuard.hook.ts` | 8 | None |

## Writing New Tests

1. Create `hooks/tests/YourHook.test.ts`
2. Import the harness: `import { runHook, createTempDir, cleanupTempDir } from './harness'`
3. Use `PAI_DIR` env var to isolate from real state
4. Test the hook's documented behavior (see hook's header comments)
5. Always test: normal operation, edge cases, error handling, fail-open behavior

### Template

```typescript
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('YourHook', () => {
  const hook = 'hooks/YourHook.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-yourhook-');
    // Create required directories
    mkdirSync(join(tempDir, 'MEMORY', 'STATE'), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  test('does its thing', async () => {
    const result = await runHook(hook, {
      session_id: 'test-001',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'echo hello' },
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0);
  });

  test('fails gracefully on error', async () => {
    const result = await runHook(hook, {
      // Intentionally malformed input
    }, { PAI_DIR: tempDir });

    expect(result.exitCode).toBe(0); // Fail-open
  });
});
```

## CI Integration

These tests are designed for CI environments:

- No external service dependencies (API keys, voice server, terminal)
- Deterministic — no time-dependent logic
- Fast — each suite completes in <5s
- Isolated — temp dirs, no shared state

```yaml
# GitHub Actions example
- name: Run PAI hook tests
  run: bun test hooks/tests/
```
