# Docker Adapter Verification

Complete this checklist to verify successful installation of mai-docker-adapter.

---

## Directory Structure

- [ ] `src/DockerAdapter.ts` exists
- [ ] `src/index.ts` exists
- [ ] `adapter.yaml` exists
- [ ] `package.json` exists
- [ ] `tests/DockerAdapter.test.ts` exists

```bash
PACK_DIR="${1:-$(pwd)}"

echo "Checking pack structure..."
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

- [ ] Dependencies installed (node_modules exists)
- [ ] mai-containers-core linked

```bash
PACK_DIR="${1:-$(pwd)}"

echo "Checking dependencies..."
ls "$PACK_DIR/node_modules/" | head -10

echo ""
echo "Checking mai-containers-core link..."
ls -la "$PACK_DIR/node_modules/mai-containers-core" 2>/dev/null && echo "OK: mai-containers-core linked" || echo "WARN: mai-containers-core not found"
```

If dependencies are missing:
```bash
cd "$PACK_DIR" && bun install
```

---

## TypeScript Compilation

- [ ] TypeScript compiles without errors

```bash
PACK_DIR="${1:-$(pwd)}"

echo "Running typecheck..."
cd "$PACK_DIR" && bun run typecheck && echo "OK: TypeScript compiles" || echo "FAIL: TypeScript errors"
```

---

## Unit Tests

- [ ] Unit tests pass

```bash
PACK_DIR="${1:-$(pwd)}"

echo "Running unit tests..."
cd "$PACK_DIR" && bun test
```

**Expected output:**
```
DockerAdapter > constructor > should create with default config
DockerAdapter > constructor > should accept custom socket path
DockerAdapter > constructor > should accept remote host
DockerAdapter > constructor > should accept compose project filter
DockerAdapter > type exports > should export DockerConfig type
```

---

## Docker Connectivity Test

- [ ] Docker Engine is running
- [ ] Docker socket is accessible
- [ ] Health check succeeds

### Prerequisites
Ensure Docker Desktop or Docker Engine is running:
```bash
docker info >/dev/null 2>&1 && echo "OK: Docker is running" || echo "FAIL: Docker not running"
```

### Adapter Health Check

Create a temporary test script:
```bash
PACK_DIR="${1:-$(pwd)}"

cat > /tmp/docker-health-check.ts << 'EOF'
import { DockerAdapter } from './src/index.ts';

const adapter = new DockerAdapter();
const health = await adapter.healthCheck();

console.log(JSON.stringify(health, null, 2));
process.exit(health.healthy ? 0 : 1);
EOF

cd "$PACK_DIR" && bun run /tmp/docker-health-check.ts
rm /tmp/docker-health-check.ts
```

**Expected output:**
```json
{
  "healthy": true,
  "message": "Docker Engine is accessible",
  "latencyMs": <number>,
  "details": {
    "socketPath": "/var/run/docker.sock"
  }
}
```

---

## Integration Test (Optional)

- [ ] Can list containers
- [ ] Can list namespaces

```bash
PACK_DIR="${1:-$(pwd)}"

cat > /tmp/docker-integration.ts << 'EOF'
import { DockerAdapter } from './src/index.ts';

const adapter = new DockerAdapter();

console.log("1. Listing namespaces...");
const namespaces = await adapter.listNamespaces();
console.log(`   Found ${namespaces.length} namespace(s):`, namespaces.map(n => n.name));

console.log("\n2. Listing containers in 'default' namespace...");
const containers = await adapter.listContainers('default');
console.log(`   Found ${containers.length} container(s)`);
containers.slice(0, 5).forEach(c => {
  console.log(`   - ${c.name}: ${c.status}`);
});

console.log("\nIntegration test complete.");
EOF

cd "$PACK_DIR" && bun run /tmp/docker-integration.ts
rm /tmp/docker-integration.ts
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | ? |
| Dependencies installed | ? |
| TypeScript compiles | ? |
| Unit tests pass | ? |
| Docker running | ? |
| Health check succeeds | ? |
| Integration tests (optional) | ? |

**All required checks (first 6) must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="${1:-/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-docker-adapter}"

echo "=== mai-docker-adapter Verification ==="
echo ""

echo "1. Structure check..."
[ -f "$PACK_DIR/src/DockerAdapter.ts" ] && echo "   OK: DockerAdapter.ts" || echo "   FAIL: DockerAdapter.ts missing"
[ -f "$PACK_DIR/adapter.yaml" ] && echo "   OK: adapter.yaml" || echo "   FAIL: adapter.yaml missing"
[ -d "$PACK_DIR/node_modules" ] && echo "   OK: node_modules" || echo "   WARN: run 'bun install'"
echo ""

echo "2. TypeScript check..."
cd "$PACK_DIR" && bun run typecheck && echo "   OK: TypeScript compiles" || echo "   FAIL: TypeScript errors"
echo ""

echo "3. Unit tests..."
cd "$PACK_DIR" && bun test && echo "   OK: Tests pass" || echo "   FAIL: Tests failed"
echo ""

echo "4. Docker connectivity..."
docker info >/dev/null 2>&1 && echo "   OK: Docker is running" || echo "   FAIL: Docker not running"
echo ""

echo "5. Adapter health check..."
cd "$PACK_DIR" && bun -e "
import { DockerAdapter } from './src/index.ts';
const adapter = new DockerAdapter();
const health = await adapter.healthCheck();
console.log('   ' + (health.healthy ? 'OK' : 'FAIL') + ': ' + health.message);
process.exit(health.healthy ? 0 : 1);
" || echo "   FAIL: Health check failed"

echo ""
echo "=== Verification Complete ==="
```

---

## Troubleshooting

### Docker socket not found
```
Docker socket not found at /var/run/docker.sock. Is Docker running?
```

**Solutions:**
1. Start Docker Desktop or Docker Engine
2. Check socket location: `docker context ls`
3. For non-standard socket, configure in `providers.yaml`:
   ```yaml
   adapters:
     docker:
       socketPath: /path/to/docker.sock
   ```

### Permission denied on Docker socket
```bash
# Add user to docker group (requires logout/login)
sudo usermod -aG docker $USER

# Or adjust socket permissions (temporary)
sudo chmod 666 /var/run/docker.sock
```

### mai-containers-core not found
```bash
# Ensure the workspace is linked
cd /path/to/Packs
bun install
```
