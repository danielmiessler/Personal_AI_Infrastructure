# Mock Containers Adapter Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `package.json` exists
- [ ] `tsconfig.json` exists
- [ ] `src/index.ts` exists
- [ ] `src/MockPlatformAdapter.ts` exists

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-containers-adapter"

echo "Checking directory structure..."
ls -la "$PACK_DIR/"
echo ""
echo "Source files:"
ls "$PACK_DIR/src/"
```

---

## Dependencies

- [ ] `mai-containers-core` dependency is linked

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-containers-adapter"

echo "Checking dependencies..."
cd "$PACK_DIR" && bun install
```

---

## TypeScript Compilation

- [ ] TypeScript compiles without errors

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-containers-adapter"

cd "$PACK_DIR" && bun run typecheck && echo "✓ TypeScript OK" || echo "✗ TypeScript FAILED"
```

---

## Mock Adapter Functionality Test

- [ ] MockPlatformAdapter can be instantiated
- [ ] Test helpers work correctly
- [ ] PlatformProvider interface methods are callable

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-containers-adapter"

cat << 'EOF' | bun run -
import { MockPlatformAdapter } from './src/index.ts';

async function test() {
  console.log('1. Creating MockPlatformAdapter...');
  const adapter = new MockPlatformAdapter();
  console.log('   ✓ Adapter created');

  console.log('2. Testing health check...');
  const health = await adapter.healthCheck();
  if (health.healthy) {
    console.log('   ✓ Health check passed:', health.message);
  } else {
    throw new Error('Health check failed');
  }

  console.log('3. Testing namespace operations...');
  adapter.addNamespace({ name: 'test-ns', status: 'active' });
  const namespaces = await adapter.listNamespaces();
  if (namespaces.length === 1 && namespaces[0].name === 'test-ns') {
    console.log('   ✓ Namespace add/list works');
  } else {
    throw new Error('Namespace operations failed');
  }

  console.log('4. Testing deployment operations...');
  adapter.addDeployment({
    name: 'test-deploy',
    namespace: 'test-ns',
    replicas: 3,
    availableReplicas: 3,
    readyReplicas: 3,
    status: 'running',
    image: 'nginx:latest'
  });
  const deployments = await adapter.listDeployments('test-ns');
  if (deployments.length === 1 && deployments[0].name === 'test-deploy') {
    console.log('   ✓ Deployment add/list works');
  } else {
    throw new Error('Deployment operations failed');
  }

  console.log('5. Testing container operations...');
  adapter.addContainer({
    name: 'test-container',
    namespace: 'test-ns',
    status: 'running',
    image: 'nginx:latest',
    createdAt: new Date()
  });
  const containers = await adapter.listContainers('test-ns');
  if (containers.length === 1 && containers[0].name === 'test-container') {
    console.log('   ✓ Container add/list works');
  } else {
    throw new Error('Container operations failed');
  }

  console.log('6. Testing call logging...');
  const callLog = adapter.getCallLog();
  if (callLog.length > 0) {
    console.log('   ✓ Call logging works (' + callLog.length + ' calls logged)');
  } else {
    throw new Error('Call logging failed');
  }

  console.log('7. Testing failure simulation...');
  adapter.setFailureRate(0);  // Reset to 0 for deterministic test
  console.log('   ✓ Failure rate configurable');

  console.log('8. Testing latency simulation...');
  adapter.setLatency(0);
  console.log('   ✓ Latency configurable');

  console.log('\n=== All tests passed ===');
}

process.chdir('$PACK_DIR');
test().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
EOF
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | [ ] |
| Dependencies installed | [ ] |
| TypeScript compiles | [ ] |
| Adapter instantiation | [ ] |
| Health check | [ ] |
| Namespace operations | [ ] |
| Deployment operations | [ ] |
| Container operations | [ ] |
| Call logging | [ ] |
| Failure/latency simulation | [ ] |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-mock-containers-adapter"

echo "=== Mock Containers Adapter Verification ==="
echo ""

echo "1. Installing dependencies..."
cd "$PACK_DIR" && bun install && echo "✓ Dependencies OK" || echo "✗ Dependencies FAILED"
echo ""

echo "2. TypeScript check..."
bun run typecheck && echo "✓ TypeScript OK" || echo "✗ TypeScript FAILED"
echo ""

echo "3. Mock functionality test..."
bun run -e '
import { MockPlatformAdapter } from "./src/index.ts";

const adapter = new MockPlatformAdapter();

// Quick smoke test
adapter.addNamespace({ name: "default", status: "active" });
adapter.addDeployment({
  name: "app",
  namespace: "default",
  replicas: 1,
  availableReplicas: 1,
  readyReplicas: 1,
  status: "running",
  image: "test:latest"
});

Promise.all([
  adapter.healthCheck(),
  adapter.listNamespaces(),
  adapter.listDeployments("default")
]).then(([health, ns, deps]) => {
  if (health.healthy && ns.length === 1 && deps.length === 1) {
    console.log("✓ Mock functionality OK");
  } else {
    console.log("✗ Mock functionality FAILED");
    process.exit(1);
  }
});
' && echo "" || echo "✗ Mock test FAILED"

echo "=== Verification Complete ==="
```
