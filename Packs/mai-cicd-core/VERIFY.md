# CI/CD Core Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `src/index.ts` exists (main exports)
- [ ] `src/interfaces/` contains `CICDProvider.ts` and `index.ts`
- [ ] `src/types/` contains type definitions (5 .ts files)
- [ ] `src/discovery/` contains loader utilities (4 .ts files)
- [ ] `src/utils/` contains error handling, logger, and retry utilities
- [ ] `tests/` directory exists with test files

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-core"

echo "Checking directory structure..."
echo ""

echo "Main exports:"
ls "$PACK_DIR/src/index.ts" 2>/dev/null && echo "  index.ts" || echo "  MISSING: index.ts"
echo ""

echo "Interfaces:"
ls "$PACK_DIR/src/interfaces/"
echo ""

echo "Types:"
ls "$PACK_DIR/src/types/"
echo ""

echo "Discovery:"
ls "$PACK_DIR/src/discovery/"
echo ""

echo "Utils:"
ls "$PACK_DIR/src/utils/"
echo ""

echo "Tests:"
ls "$PACK_DIR/tests/"
```

---

## Dependencies

- [ ] `node_modules/` exists
- [ ] `bun.lock` exists

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-core"

echo "Checking dependencies..."
[ -d "$PACK_DIR/node_modules" ] && echo "node_modules/ exists" || echo "MISSING: node_modules/ - run 'bun install'"
[ -f "$PACK_DIR/bun.lock" ] && echo "bun.lock exists" || echo "MISSING: bun.lock"
```

---

## TypeScript Compilation

- [ ] Type checking passes with no errors

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-core
bun run typecheck
```

**Expected:** No output (clean compile)

---

## Unit Tests

- [ ] All tests pass

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-core
bun test
```

**Expected:** All tests pass (discovery, errors, logger, retry, types)

---

## Export Verification

- [ ] Main exports are accessible

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-core
bun -e "
import { CICDError, getCICDProvider, withRetry } from './src/index.ts';
console.log('CICDError:', typeof CICDError);
console.log('getCICDProvider:', typeof getCICDProvider);
console.log('withRetry:', typeof withRetry);
console.log('Exports OK');
"
```

**Expected:**
```
CICDError: function
getCICDProvider: function
withRetry: function
Exports OK
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | [ ] |
| Dependencies installed | [ ] |
| TypeScript compiles | [ ] |
| Unit tests pass | [ ] |
| Exports accessible | [ ] |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-cicd-core"

echo "=== mai-cicd-core Verification ==="
echo ""

echo "1. Directory Structure..."
[ -f "$PACK_DIR/src/index.ts" ] && echo "   src/index.ts" || echo "   MISSING: src/index.ts"
[ -d "$PACK_DIR/src/interfaces" ] && echo "   src/interfaces/" || echo "   MISSING: src/interfaces/"
[ -d "$PACK_DIR/src/types" ] && echo "   src/types/" || echo "   MISSING: src/types/"
[ -d "$PACK_DIR/src/discovery" ] && echo "   src/discovery/" || echo "   MISSING: src/discovery/"
[ -d "$PACK_DIR/src/utils" ] && echo "   src/utils/" || echo "   MISSING: src/utils/"
[ -d "$PACK_DIR/tests" ] && echo "   tests/" || echo "   MISSING: tests/"
echo ""

echo "2. Dependencies..."
[ -d "$PACK_DIR/node_modules" ] && echo "   node_modules/ exists" || echo "   MISSING: Run 'bun install'"
echo ""

echo "3. TypeScript..."
cd "$PACK_DIR" && bun run typecheck && echo "   TypeScript OK" || echo "   TypeScript FAILED"
echo ""

echo "4. Tests..."
cd "$PACK_DIR" && bun test && echo "   Tests OK" || echo "   Tests FAILED"
echo ""

echo "5. Exports..."
cd "$PACK_DIR" && bun -e "
import { CICDError, getCICDProvider, withRetry } from './src/index.ts';
if (typeof CICDError === 'function' && typeof getCICDProvider === 'function') {
  console.log('   Exports OK');
} else {
  console.log('   Exports FAILED');
  process.exit(1);
}
"
echo ""

echo "=== Verification Complete ==="
```
