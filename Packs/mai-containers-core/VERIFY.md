# mai-containers-core Verification

Complete this checklist to verify the pack is correctly set up.

---

## Directory Structure

- [ ] `src/` directory exists with subdirectories
- [ ] `src/index.ts` (main exports)
- [ ] `src/types/` contains 6 type files
- [ ] `src/interfaces/` contains PlatformProvider interface
- [ ] `src/discovery/` contains 4 discovery files
- [ ] `src/utils/` contains 3 utility files
- [ ] `tests/` directory exists with 5 test files

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-containers-core"

echo "Checking directory structure..."
echo ""

echo "=== Root ==="
ls -la "$PACK_DIR" | grep -E "^d|package.json|tsconfig.json|README.md"
echo ""

echo "=== src/ ==="
ls "$PACK_DIR/src/"
echo ""

echo "=== src/types/ ==="
ls "$PACK_DIR/src/types/"
echo ""

echo "=== src/interfaces/ ==="
ls "$PACK_DIR/src/interfaces/"
echo ""

echo "=== src/discovery/ ==="
ls "$PACK_DIR/src/discovery/"
echo ""

echo "=== src/utils/ ==="
ls "$PACK_DIR/src/utils/"
echo ""

echo "=== tests/ ==="
ls "$PACK_DIR/tests/"
```

**Expected file counts:**
- `src/types/`: 6 files (Container.ts, Deployment.ts, Namespace.ts, Resource.ts, Service.ts, index.ts)
- `src/interfaces/`: 2 files (PlatformProvider.ts, index.ts)
- `src/discovery/`: 4 files (AdapterLoader.ts, ConfigLoader.ts, ProviderFactory.ts, index.ts)
- `src/utils/`: 3 files (errors.ts, logger.ts, retry.ts)
- `tests/`: 5 files (discovery.test.ts, errors.test.ts, logger.test.ts, retry.test.ts, types.test.ts)

---

## Dependencies

- [ ] `node_modules/` exists
- [ ] Dependencies installed (yaml, typescript, bun-types)

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-containers-core"

echo "Checking dependencies..."
if [ -d "$PACK_DIR/node_modules" ]; then
  echo "node_modules exists"
  ls "$PACK_DIR/node_modules" | head -10
else
  echo "MISSING: Run 'bun install' in $PACK_DIR"
fi
```

If missing, install with:
```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-containers-core
bun install
```

---

## TypeScript Compilation

- [ ] Type checking passes with no errors

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-containers-core
bun run typecheck
```

**Expected:** No output (success) or explicit "no errors"

---

## Unit Tests

- [ ] All tests pass

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-containers-core
bun test
```

**Expected:** All 5 test files pass:
- `tests/discovery.test.ts`
- `tests/errors.test.ts`
- `tests/logger.test.ts`
- `tests/retry.test.ts`
- `tests/types.test.ts`

---

## Export Verification

- [ ] Main exports are accessible

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-containers-core
bun -e "
import {
  getPlatformProvider,
  PlatformError,
  withRetry,
  ConsoleAuditLogger
} from './src/index.ts';

console.log('Exports verified:');
console.log('  - getPlatformProvider:', typeof getPlatformProvider);
console.log('  - PlatformError:', typeof PlatformError);
console.log('  - withRetry:', typeof withRetry);
console.log('  - ConsoleAuditLogger:', typeof ConsoleAuditLogger);
"
```

**Expected:**
```
Exports verified:
  - getPlatformProvider: function
  - PlatformError: function
  - withRetry: function
  - ConsoleAuditLogger: function
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure correct | - |
| Dependencies installed | - |
| TypeScript compiles | - |
| All tests pass | - |
| Exports accessible | - |

**All checks must pass for the pack to be considered verified.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-containers-core"

echo "=== mai-containers-core Verification ==="
echo ""

echo "1. Directory structure..."
[ -f "$PACK_DIR/src/index.ts" ] && echo "   src/index.ts exists" || echo "   MISSING: src/index.ts"
[ -d "$PACK_DIR/src/types" ] && echo "   src/types/ exists" || echo "   MISSING: src/types/"
[ -d "$PACK_DIR/src/interfaces" ] && echo "   src/interfaces/ exists" || echo "   MISSING: src/interfaces/"
[ -d "$PACK_DIR/src/discovery" ] && echo "   src/discovery/ exists" || echo "   MISSING: src/discovery/"
[ -d "$PACK_DIR/src/utils" ] && echo "   src/utils/ exists" || echo "   MISSING: src/utils/"
[ -d "$PACK_DIR/tests" ] && echo "   tests/ exists" || echo "   MISSING: tests/"
echo ""

echo "2. Dependencies..."
[ -d "$PACK_DIR/node_modules" ] && echo "   node_modules installed" || echo "   MISSING: Run 'bun install'"
echo ""

echo "3. TypeScript..."
cd "$PACK_DIR"
if bun run typecheck 2>&1; then
  echo "   TypeScript OK"
else
  echo "   TypeScript FAILED"
fi
echo ""

echo "4. Tests..."
cd "$PACK_DIR"
if bun test 2>&1 | tail -5; then
  echo "   Tests complete"
fi
echo ""

echo "5. Exports..."
cd "$PACK_DIR"
bun -e "
import { getPlatformProvider, PlatformError, withRetry } from './src/index.ts';
console.log('   Exports OK');
" 2>/dev/null && echo "" || echo "   Exports FAILED"

echo "=== Verification Complete ==="
```
