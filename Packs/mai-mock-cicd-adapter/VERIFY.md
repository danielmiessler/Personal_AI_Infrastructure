# Mock CI/CD Adapter Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `src/` directory exists with 2 .ts files
- [ ] `tests/` directory exists with test file
- [ ] `package.json` exists
- [ ] `adapter.yaml` exists
- [ ] `tsconfig.json` exists

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-cicd-adapter"

echo "Checking directory structure..."
ls -la "$PACK_DIR/"
echo ""
echo "Source files:"
ls "$PACK_DIR/src/"
echo ""
echo "Test files:"
ls "$PACK_DIR/tests/"
```

---

## Dependencies

- [ ] `mai-cicd-core` is linked as dependency
- [ ] `node_modules` exists

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-cicd-adapter"

echo "Checking dependencies..."
cd "$PACK_DIR" && bun install
echo ""
echo "Verifying mai-cicd-core link:"
ls -la "$PACK_DIR/node_modules/mai-cicd-core" 2>/dev/null && echo "OK" || echo "MISSING - run bun install"
```

---

## TypeScript Compilation

- [ ] Type check passes with no errors

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-cicd-adapter"

cd "$PACK_DIR" && bun run typecheck && echo "Type check passed" || echo "Type check FAILED"
```

---

## Unit Tests

- [ ] All tests pass

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-cicd-adapter"

cd "$PACK_DIR" && bun test
```

**Expected:** All tests in `MockCICDAdapter.test.ts` should pass, covering:
- Constructor initialization
- Pipeline operations (list, get, add, clear)
- Run operations (list, get, trigger, cancel, retry, update)
- Job operations (list, logs, retry)
- Artifact operations (list, download, add)
- Health check
- Call logging
- Simulated latency
- Simulated failures

---

## Mock Functionality Test

- [ ] Can instantiate adapter
- [ ] Can add and retrieve pipelines
- [ ] Can trigger and query runs
- [ ] Call logging works

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-cicd-adapter"

cd "$PACK_DIR" && bun -e "
import { MockCICDAdapter } from './src/index.ts';

const adapter = new MockCICDAdapter();

// Add test pipeline
adapter.addPipeline({
  id: 'ci',
  name: 'CI Pipeline',
  path: '.github/workflows/ci.yml',
  repo: 'test/repo',
  defaultBranch: 'main'
});

// List pipelines
const pipelines = await adapter.listPipelines('test/repo');
console.log('Pipelines:', JSON.stringify(pipelines, null, 2));

// Trigger a run
const run = await adapter.triggerRun('test/repo', 'ci', { branch: 'feature' });
console.log('Triggered run:', run.id, 'status:', run.status);

// Check call log
const calls = adapter.getCallLog();
console.log('Call log entries:', calls.length);
console.log('Methods called:', calls.map(c => c.method).join(', '));

// Health check
const health = await adapter.healthCheck();
console.log('Health:', health.healthy ? 'OK' : 'FAILED');
"
```

**Expected:**
```
Pipelines: [{ id: "ci", name: "CI Pipeline", ... }]
Triggered run: run-XXXXX status: queued
Call log entries: 3
Methods called: listPipelines, triggerRun, healthCheck
Health: OK
```

---

## Failure Simulation Test

- [ ] Latency simulation works
- [ ] Failure rate simulation works

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-cicd-adapter"

cd "$PACK_DIR" && bun -e "
import { MockCICDAdapter } from './src/index.ts';

// Test latency
const adapter = new MockCICDAdapter({ simulateLatency: 100 });

const start = Date.now();
await adapter.healthCheck();
const elapsed = Date.now() - start;
console.log('Latency test:', elapsed >= 95 ? 'PASS' : 'FAIL', '(' + elapsed + 'ms)');

// Test failure rate
const failAdapter = new MockCICDAdapter();
failAdapter.setFailureRate(100);
try {
  await failAdapter.healthCheck();
  console.log('Failure test: FAIL (should have thrown)');
} catch (e) {
  console.log('Failure test: PASS (simulated failure thrown)');
}
"
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | [ ] |
| Dependencies installed | [ ] |
| TypeScript compilation | [ ] |
| Unit tests pass | [ ] |
| Mock adapter instantiation | [ ] |
| Pipeline operations | [ ] |
| Run operations | [ ] |
| Call logging | [ ] |
| Latency simulation | [ ] |
| Failure simulation | [ ] |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-cicd-adapter"

echo "=== Mock CI/CD Adapter Verification ==="
echo ""

echo "1. Dependencies..."
cd "$PACK_DIR" && bun install --silent && echo "Dependencies OK" || echo "Dependencies FAILED"
echo ""

echo "2. Type check..."
cd "$PACK_DIR" && bun run typecheck && echo "Type check OK" || echo "Type check FAILED"
echo ""

echo "3. Unit tests..."
cd "$PACK_DIR" && bun test 2>&1 | tail -5
echo ""

echo "4. Functional test..."
cd "$PACK_DIR" && bun -e "
import { MockCICDAdapter } from './src/index.ts';
const a = new MockCICDAdapter();
a.addPipeline({ id: 'ci', name: 'CI', path: 'ci.yml', repo: 'test/repo', defaultBranch: 'main' });
const p = await a.listPipelines('test/repo');
const r = await a.triggerRun('test/repo', 'ci');
const h = await a.healthCheck();
console.log('Functional: ' + (p.length === 1 && r.status === 'queued' && h.healthy ? 'OK' : 'FAILED'));
" 2>&1

echo ""
echo "=== Verification Complete ==="
```
