# Mock Observability Adapter Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] Pack root exists
- [ ] `src/MockObservabilityAdapter.ts` exists
- [ ] `src/index.ts` exists
- [ ] `tests/MockObservabilityAdapter.test.ts` exists
- [ ] `adapter.yaml` exists

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-observability-adapter"

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

- [ ] Dependencies installed
- [ ] `mai-observability-core` linked

```bash
cd "$PACK_DIR" && bun install
echo ""
echo "Checking mai-observability-core link..."
ls -la "$PACK_DIR/node_modules/mai-observability-core"
```

---

## TypeScript Compilation

- [ ] TypeScript compiles without errors

```bash
cd "$PACK_DIR" && bun run typecheck
```

**Expected:** No output (clean compilation)

---

## Unit Tests

- [ ] All tests pass

```bash
cd "$PACK_DIR" && bun test
```

**Expected:** All tests passing (30+ tests across 10 describe blocks)

---

## Mock Functionality Test

- [ ] Adapter instantiates correctly
- [ ] Metric helpers work
- [ ] Alert helpers work
- [ ] Call logging works

```bash
cd "$PACK_DIR" && bun -e '
import { MockObservabilityAdapter } from "./src/index.ts";

const adapter = new MockObservabilityAdapter();
console.log("Adapter name:", adapter.name);
console.log("Adapter version:", adapter.version);

// Test metric helpers
adapter.setMetricValue("test_metric", 42, { job: "test" });
const result = await adapter.instantQuery("test_metric");
console.log("Metric query result:", result.samples?.length === 1 ? "OK" : "FAILED");

// Test alert helpers
adapter.addAlert({
  name: "TestAlert",
  state: "firing",
  labels: { severity: "warning" },
  annotations: { summary: "Test alert" },
  fingerprint: "abc123"
});
const alerts = await adapter.listAlerts({ state: "firing" });
console.log("Alert query result:", alerts.length === 1 ? "OK" : "FAILED");

// Test call logging
const calls = adapter.getCallLog();
console.log("Call log entries:", calls.length);

// Test health check
const health = await adapter.healthCheck();
console.log("Health check:", health.healthy ? "OK" : "FAILED");
'
```

**Expected:**
```
Adapter name: mock
Adapter version: 1.0.0
Metric query result: OK
Alert query result: OK
Call log entries: 3
Health check: OK
```

---

## Simulation Features Test

- [ ] Latency simulation works
- [ ] Failure simulation works

```bash
cd "$PACK_DIR" && bun -e '
import { MockObservabilityAdapter } from "./src/index.ts";

const adapter = new MockObservabilityAdapter();

// Test latency simulation
adapter.setLatency(100);
const start = Date.now();
await adapter.instantQuery("up");
const elapsed = Date.now() - start;
console.log("Latency test:", elapsed >= 100 ? "OK (" + elapsed + "ms)" : "FAILED (" + elapsed + "ms)");

// Test failure simulation
adapter.setLatency(0);
adapter.setFailureRate(100);
try {
  await adapter.instantQuery("up");
  console.log("Failure test: FAILED (should have thrown)");
} catch (e) {
  console.log("Failure test:", e.message === "Simulated failure" ? "OK" : "FAILED");
}
'
```

**Expected:**
```
Latency test: OK (100ms+)
Failure test: OK
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| Dependencies installed | |
| TypeScript compiles | |
| Unit tests pass | |
| Adapter instantiates | |
| Metric helpers work | |
| Alert helpers work | |
| Call logging works | |
| Latency simulation | |
| Failure simulation | |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-observability-adapter"

echo "=== Mock Observability Adapter Verification ==="
echo ""

echo "1. Directory structure..."
[ -f "$PACK_DIR/src/MockObservabilityAdapter.ts" ] && [ -f "$PACK_DIR/adapter.yaml" ] && echo "OK" || echo "FAILED"
echo ""

echo "2. Installing dependencies..."
cd "$PACK_DIR" && bun install --silent && echo "OK" || echo "FAILED"
echo ""

echo "3. TypeScript check..."
cd "$PACK_DIR" && bun run typecheck && echo "OK" || echo "FAILED"
echo ""

echo "4. Running unit tests..."
cd "$PACK_DIR" && bun test
echo ""

echo "5. Mock functionality..."
cd "$PACK_DIR" && bun -e '
import { MockObservabilityAdapter } from "./src/index.ts";

const adapter = new MockObservabilityAdapter();

// Quick smoke test
adapter.setMetricValue("up", 1, { job: "test" });
adapter.addAlert({ name: "Test", state: "firing", labels: {}, annotations: {}, fingerprint: "test" });

const metrics = await adapter.instantQuery("up");
const alerts = await adapter.listAlerts();
const health = await adapter.healthCheck();

if (metrics.samples?.length === 1 && alerts.length === 1 && health.healthy) {
  console.log("OK");
} else {
  console.log("FAILED");
  process.exit(1);
}
'
echo ""

echo "=== Verification Complete ==="
```
