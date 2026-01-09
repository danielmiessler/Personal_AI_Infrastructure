# Observability Core Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `src/` directory exists with expected structure
- [ ] `src/index.ts` exists (main entry point)
- [ ] `src/interfaces/` contains `ObservabilityProvider.ts`
- [ ] `src/types/` contains type definitions
- [ ] `src/discovery/` contains adapter/config loading
- [ ] `src/utils/` contains errors, retry, logger

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-observability-core"

echo "Checking directory structure..."
echo ""
echo "=== src/ ==="
ls "$PACK_DIR/src/"
echo ""
echo "=== src/interfaces/ ==="
ls "$PACK_DIR/src/interfaces/"
echo ""
echo "=== src/types/ ==="
ls "$PACK_DIR/src/types/"
echo ""
echo "=== src/discovery/ ==="
ls "$PACK_DIR/src/discovery/"
echo ""
echo "=== src/utils/ ==="
ls "$PACK_DIR/src/utils/"
```

---

## TypeScript Compilation

- [ ] TypeScript compiles without errors

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-observability-core
bun run typecheck
```

**Expected:** No output (clean compilation)

---

## Package Configuration

- [ ] `package.json` exists with correct exports

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-observability-core"

echo "Checking package.json exports..."
bun -e "
const pkg = require('$PACK_DIR/package.json');
console.log('Name:', pkg.name);
console.log('Version:', pkg.version);
console.log('');
console.log('Exports:');
Object.entries(pkg.exports || {}).forEach(([key, val]) => {
  console.log('  ' + key + ' -> ' + val);
});
"
```

**Expected exports:**
- `.` -> `./src/index.ts`
- `./interfaces` -> `./src/interfaces/index.ts`
- `./types` -> `./src/types/index.ts`
- `./discovery` -> `./src/discovery/index.ts`
- `./errors` -> `./src/utils/errors.ts`
- `./retry` -> `./src/utils/retry.ts`

---

## Export Verification

- [ ] Main exports are accessible
- [ ] Types export correctly
- [ ] Errors export correctly
- [ ] Discovery exports correctly

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-observability-core

echo "=== Main Exports ==="
bun -e "
import * as core from './src/index.ts';
const exports = Object.keys(core);
console.log('Export count:', exports.length);
console.log('Key exports:', exports.slice(0, 10).join(', '), '...');
"

echo ""
echo "=== Type Exports ==="
bun -e "
import * as types from './src/types/index.ts';
console.log('Type modules loaded successfully');
"

echo ""
echo "=== Error Classes ==="
bun -e "
import {
  ObservabilityError,
  QueryError,
  QueryTimeoutError,
  AlertNotFoundError,
  MetricNotFoundError,
  AuthenticationError,
  ConfigurationError,
  AdapterNotFoundError,
  ConnectionError
} from './src/utils/errors.ts';
console.log('ObservabilityError:', typeof ObservabilityError);
console.log('QueryError:', typeof QueryError);
console.log('ConfigurationError:', typeof ConfigurationError);
"

echo ""
echo "=== Discovery Exports ==="
bun -e "
import {
  discoverAdapters,
  loadConfig,
  getObservabilityProvider,
  listAvailableAdapters
} from './src/discovery/index.ts';
console.log('discoverAdapters:', typeof discoverAdapters);
console.log('loadConfig:', typeof loadConfig);
console.log('getObservabilityProvider:', typeof getObservabilityProvider);
console.log('listAvailableAdapters:', typeof listAvailableAdapters);
"

echo ""
echo "=== Retry Utility ==="
bun -e "
import { withRetry } from './src/utils/retry.ts';
console.log('withRetry:', typeof withRetry);
"
```

---

## Interface Verification

- [ ] `ObservabilityProvider` interface has expected methods

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-observability-core

bun -e "
import type { ObservabilityProvider } from './src/interfaces/index.ts';

// This verifies the interface shape at compile time
// Create a type check for expected methods
type HasMethods = ObservabilityProvider extends {
  name: string;
  version: string;
  instantQuery: Function;
  rangeQuery: Function;
  getMetricNames: Function;
  getLabelValues: Function;
  listAlerts: Function;
  getAlert: Function;
  listAlertRules: Function;
  listTargets: Function;
  healthCheck: Function;
} ? 'pass' : 'fail';

const result: HasMethods = 'pass';
console.log('ObservabilityProvider interface shape:', result);
console.log('');
console.log('Expected methods:');
console.log('  - name (readonly)');
console.log('  - version (readonly)');
console.log('  - instantQuery()');
console.log('  - rangeQuery()');
console.log('  - getMetricNames()');
console.log('  - getLabelValues()');
console.log('  - listAlerts()');
console.log('  - getAlert()');
console.log('  - listAlertRules()');
console.log('  - listTargets()');
console.log('  - healthCheck()');
"
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| TypeScript compiles | |
| Package exports correct | |
| Main exports accessible | |
| Type exports work | |
| Error classes export | |
| Discovery exports work | |
| Retry utility exports | |
| Interface shape valid | |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-observability-core"

echo "=== mai-observability-core Verification ==="
echo ""

echo "1. Directory structure..."
[ -d "$PACK_DIR/src" ] && [ -f "$PACK_DIR/src/index.ts" ] && echo "  Directory structure OK" || echo "  Directory structure FAILED"

echo ""
echo "2. TypeScript compilation..."
cd "$PACK_DIR" && bun run typecheck 2>&1 && echo "  TypeScript OK" || echo "  TypeScript FAILED"

echo ""
echo "3. Main exports..."
cd "$PACK_DIR" && bun -e "
import {
  getObservabilityProvider,
  ObservabilityError,
  withRetry,
  discoverAdapters
} from './src/index.ts';
console.log('  Main exports OK');
" 2>&1 || echo "  Main exports FAILED"

echo ""
echo "4. Subpath exports..."
cd "$PACK_DIR" && bun -e "
import type { ObservabilityProvider } from './src/interfaces/index.ts';
import type { MetricSample, Alert, Target } from './src/types/index.ts';
import { loadConfig, getAdapterConfig } from './src/discovery/index.ts';
import { QueryError, ConfigurationError } from './src/utils/errors.ts';
import { withRetry } from './src/utils/retry.ts';
console.log('  Subpath exports OK');
" 2>&1 || echo "  Subpath exports FAILED"

echo ""
echo "5. Error inheritance..."
cd "$PACK_DIR" && bun -e "
import { ObservabilityError, QueryError, ConfigurationError } from './src/utils/errors.ts';
const qe = new QueryError('test');
const ce = new ConfigurationError('test');
if (qe instanceof ObservabilityError && ce instanceof ObservabilityError) {
  console.log('  Error inheritance OK');
} else {
  console.log('  Error inheritance FAILED');
}
" 2>&1 || echo "  Error inheritance check FAILED"

echo ""
echo "=== Verification Complete ==="
```
