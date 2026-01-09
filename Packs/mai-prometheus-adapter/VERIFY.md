# Prometheus Adapter Verification

Complete this checklist to verify successful installation of the mai-prometheus-adapter pack.

---

## Directory Structure

- [ ] `src/PrometheusAdapter.ts` exists (main adapter implementation)
- [ ] `src/index.ts` exists (exports)
- [ ] `tests/PrometheusAdapter.test.ts` exists
- [ ] `adapter.yaml` exists (adapter manifest)
- [ ] `package.json` exists
- [ ] `tsconfig.json` exists

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-prometheus-adapter"

echo "Checking structure..."
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
- [ ] mai-observability-core linked

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-prometheus-adapter"

echo "Checking dependencies..."
ls "$PACK_DIR/node_modules/" | head -10
echo ""
echo "Core dependency:"
ls -la "$PACK_DIR/node_modules/mai-observability-core" 2>/dev/null && echo "OK" || echo "MISSING - run: bun install"
```

---

## TypeScript Compilation

- [ ] TypeScript compiles without errors

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-prometheus-adapter
bun run typecheck && echo "TypeScript OK" || echo "TypeScript FAILED"
```

---

## Unit Tests

- [ ] All tests pass

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-prometheus-adapter
bun test
```

**Expected:** All tests should pass. Tests use mocked fetch responses so no live Prometheus is required.

---

## Prometheus Connectivity (Optional)

Skip this section if you don't have a Prometheus instance available.

- [ ] Can reach Prometheus health endpoint
- [ ] Can execute a simple query

### Health Check

```bash
# Replace with your Prometheus URL
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

echo "Checking Prometheus health..."
curl -s "${PROMETHEUS_URL}/-/healthy" && echo " - Healthy" || echo " - Unreachable"
```

### Query Test

```bash
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

echo "Testing query endpoint..."
curl -s "${PROMETHEUS_URL}/api/v1/query?query=up" | head -c 200
echo "..."
```

---

## Adapter Registration (Post-Install)

Once verified, register the adapter in your `providers.yaml`:

```yaml
domains:
  observability:
    primary: prometheus
    adapters:
      prometheus:
        prometheusUrl: http://prometheus:9090
        # alertmanagerUrl: http://alertmanager:9093  # optional
        timeout: 30
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | - |
| Dependencies installed | - |
| TypeScript compiles | - |
| Unit tests pass | - |
| Prometheus reachable (optional) | - |

**Required checks must pass for adapter to function.**

---

## Quick Full Test

Run all verifications at once (without live Prometheus):

```bash
PACK_DIR="/Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-prometheus-adapter"

echo "=== mai-prometheus-adapter Verification ==="
echo ""

echo "1. Structure check..."
[ -f "$PACK_DIR/src/PrometheusAdapter.ts" ] && echo "   Source files OK" || echo "   Source files MISSING"
[ -f "$PACK_DIR/adapter.yaml" ] && echo "   Adapter manifest OK" || echo "   Adapter manifest MISSING"
echo ""

echo "2. Dependencies..."
[ -d "$PACK_DIR/node_modules/mai-observability-core" ] && echo "   Dependencies OK" || echo "   Dependencies MISSING - run: cd $PACK_DIR && bun install"
echo ""

echo "3. TypeScript..."
cd "$PACK_DIR" && bun run typecheck 2>&1 | tail -1
echo ""

echo "4. Tests..."
cd "$PACK_DIR" && bun test 2>&1 | tail -5
echo ""

echo "=== Verification Complete ==="
```

---

## Troubleshooting

### TypeScript errors about mai-observability-core

```bash
cd /Users/jbarkley/src/pai/Personal_AI_Infrastructure/Packs/mai-prometheus-adapter
bun install
```

### Connection refused to Prometheus

1. Check Prometheus is running: `curl http://localhost:9090/-/healthy`
2. Check URL in providers.yaml matches your Prometheus instance
3. If using auth, ensure token/credentials are correct

### Query timeout errors

Increase timeout in adapter config:

```yaml
adapters:
  prometheus:
    timeout: 60  # seconds
```
