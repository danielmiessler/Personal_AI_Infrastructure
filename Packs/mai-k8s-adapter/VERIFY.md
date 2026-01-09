# Kubernetes Adapter Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `mai-k8s-adapter/` exists
- [ ] `mai-k8s-adapter/src/index.ts` exists
- [ ] `mai-k8s-adapter/src/K8sAdapter.ts` exists
- [ ] `mai-k8s-adapter/tests/K8sAdapter.test.ts` exists
- [ ] `mai-k8s-adapter/adapter.yaml` exists

```bash
PACK_DIR="/path/to/mai-k8s-adapter"

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

```bash
cd "$PACK_DIR" && bun install
```

---

## TypeScript Compilation

- [ ] TypeScript compiles without errors

```bash
cd "$PACK_DIR" && bun run typecheck
```

**Expected:** No errors. Command exits with code 0.

---

## Unit Tests

- [ ] All unit tests pass

```bash
cd "$PACK_DIR" && bun test
```

**Expected:**
```
bun test v1.x.x

src/K8sAdapter.test.ts:
  K8sAdapter > constructor
    should create with default config
    should accept custom kubeconfig path
    ...

 X pass
 0 fail
```

---

## Kubernetes Connectivity (Optional)

These tests require a valid kubeconfig with cluster access.

### Prerequisites Check

- [ ] kubeconfig exists at default location

```bash
ls -la ~/.kube/config && echo "kubeconfig found" || echo "kubeconfig not found"
```

- [ ] kubectl can connect (validates kubeconfig)

```bash
kubectl cluster-info && echo "Cluster accessible" || echo "Cluster not accessible"
```

### Health Check Test

- [ ] Adapter can connect to Kubernetes API

```bash
cd "$PACK_DIR" && bun -e "
import { K8sAdapter } from './src/index.ts';

const adapter = new K8sAdapter();
const health = await adapter.healthCheck();

if (health.healthy) {
  console.log('Connected to:', health.details.server);
  console.log('Status: healthy');
} else {
  console.log('Connection failed:', health.message);
  process.exit(1);
}
"
```

**Expected:**
```
Connected to: https://your-cluster-api:6443
Status: healthy
```

### Namespace List Test

- [ ] Can list namespaces

```bash
cd "$PACK_DIR" && bun -e "
import { K8sAdapter } from './src/index.ts';

const adapter = new K8sAdapter();
const namespaces = await adapter.listNamespaces();

console.log('Namespaces found:', namespaces.length);
namespaces.slice(0, 5).forEach(ns => console.log('  -', ns.name));
"
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| Dependencies installed | |
| TypeScript compiles | |
| Unit tests pass | |
| kubeconfig exists (optional) | |
| Health check passes (optional) | |
| Namespace list works (optional) | |

**Core checks (first 4) must pass for installation to be complete.**
**Kubernetes connectivity checks require cluster access.**

---

## Quick Full Test

Run core verifications at once:

```bash
PACK_DIR="${PACK_DIR:-$(pwd)}"

echo "=== mai-k8s-adapter Verification ==="
echo ""

echo "1. Directory structure..."
if [ -f "$PACK_DIR/src/K8sAdapter.ts" ] && [ -f "$PACK_DIR/adapter.yaml" ]; then
  echo "   Structure OK"
else
  echo "   Structure FAILED"
  exit 1
fi
echo ""

echo "2. Dependencies..."
cd "$PACK_DIR" && bun install --silent && echo "   Dependencies OK" || { echo "   Dependencies FAILED"; exit 1; }
echo ""

echo "3. TypeScript..."
cd "$PACK_DIR" && bun run typecheck && echo "   TypeScript OK" || { echo "   TypeScript FAILED"; exit 1; }
echo ""

echo "4. Unit tests..."
cd "$PACK_DIR" && bun test && echo "   Tests OK" || { echo "   Tests FAILED"; exit 1; }
echo ""

echo "=== Core Verification Complete ==="
echo ""

# Optional: Kubernetes connectivity
echo "5. Kubernetes connectivity (optional)..."
if [ -f ~/.kube/config ]; then
  cd "$PACK_DIR" && bun -e "
    import { K8sAdapter } from './src/index.ts';
    const adapter = new K8sAdapter();
    const health = await adapter.healthCheck();
    if (health.healthy) {
      console.log('   Connected to:', health.details.server);
    } else {
      console.log('   No cluster access (this is OK if not needed)');
    }
  " 2>/dev/null || echo "   Skipped (no cluster access)"
else
  echo "   Skipped (no kubeconfig)"
fi
echo ""

echo "=== Full Verification Complete ==="
```

---

## Troubleshooting

### TypeScript compilation fails

1. Ensure `mai-containers-core` is available:
   ```bash
   ls ../mai-containers-core/src/index.ts
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules bun.lock && bun install
   ```

### Health check fails

1. Verify kubeconfig is valid:
   ```bash
   kubectl config view
   kubectl cluster-info
   ```

2. Check if using correct context:
   ```bash
   kubectl config current-context
   ```

3. For k3s clusters, use the k3s kubeconfig:
   ```bash
   export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
   ```

### Certificate errors

If you see TLS/certificate errors, you can test with skip verification (not recommended for production):

```typescript
const adapter = new K8sAdapter({ insecureSkipTlsVerify: true });
```
