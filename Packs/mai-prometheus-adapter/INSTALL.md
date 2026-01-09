# mai-prometheus-adapter Installation

Prometheus adapter for the PAI Observability domain. Implements the `ObservabilityProvider` interface using Prometheus HTTP API and optionally Alertmanager API.

## Prerequisites

- Bun runtime (v1.0+)
- `mai-observability-core` installed
- Access to a Prometheus instance
- (Optional) Access to an Alertmanager instance

---

## Step 1: Install Core Dependency

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Install core package first
cd "$PAI_DIR/packs/mai-observability-core"
bun install
```

---

## Step 2: Install the Adapter

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACKS_DIR="$PAI_DIR/packs"

# Copy or link the adapter
cp -r /path/to/mai-prometheus-adapter "$PACKS_DIR/"

# Install dependencies
cd "$PACKS_DIR/mai-prometheus-adapter"
bun install
```

---

## Step 3: Configure providers.yaml

Add the Prometheus adapter configuration to `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  observability:
    primary: prometheus
    adapters:
      prometheus:
        prometheusUrl: http://prometheus:9090
        alertmanagerUrl: http://alertmanager:9093  # optional
        timeout: 30
```

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `prometheusUrl` | Yes | - | Prometheus server URL |
| `alertmanagerUrl` | No | - | Alertmanager URL for enhanced alert data |
| `timeout` | No | 30 | Query timeout in seconds |
| `auth` | No | - | Authentication configuration |

### With Authentication

#### Bearer Token via Environment Variable

```yaml
adapters:
  prometheus:
    prometheusUrl: http://prometheus:9090
    auth:
      type: env
      var: PROMETHEUS_TOKEN
```

#### Bearer Token via Keychain (macOS)

```yaml
adapters:
  prometheus:
    prometheusUrl: http://prometheus:9090
    auth:
      type: keychain
      service: prometheus-token
      account: default
```

#### Basic Auth

```yaml
adapters:
  prometheus:
    prometheusUrl: http://prometheus:9090
    auth:
      type: env
      var: PROMETHEUS_BASIC_AUTH  # format: username:password
```

---

## Step 4: Verify Prometheus Connectivity

Before verifying the adapter, ensure Prometheus is reachable:

```bash
# Replace with your Prometheus URL
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

# Health check
curl -s "${PROMETHEUS_URL}/-/healthy" && echo " - Healthy"

# Test query
curl -s "${PROMETHEUS_URL}/api/v1/query?query=up" | head -c 200
```

---

## Step 5: Verify Adapter Installation

See `VERIFY.md` for the complete checklist, or run:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="$PAI_DIR/packs/mai-prometheus-adapter"

cd "$PACK_DIR"

# TypeScript check
bun run typecheck

# Run unit tests (uses mocked responses, no live Prometheus needed)
bun test
```

---

## Troubleshooting

### Connection refused to Prometheus

1. Verify Prometheus is running:
   ```bash
   curl http://localhost:9090/-/healthy
   ```

2. Check URL in `providers.yaml` matches your Prometheus instance

3. For Kubernetes deployments, set up port-forwarding:
   ```bash
   kubectl port-forward svc/prometheus 9090:9090 -n monitoring
   ```

4. Check firewall rules allow the connection

### Authentication errors

1. Verify token/credentials are correct
2. For env var auth, ensure the variable is set:
   ```bash
   echo $PROMETHEUS_TOKEN
   ```
3. For keychain auth, verify the entry exists:
   ```bash
   security find-generic-password -s prometheus-token
   ```

### Query timeout errors

Increase the timeout in adapter config:

```yaml
adapters:
  prometheus:
    prometheusUrl: http://prometheus:9090
    timeout: 60  # seconds
```

### TypeScript errors about mai-observability-core

```bash
cd "${PAI_DIR:-$HOME/.config/pai}/packs/mai-prometheus-adapter"
bun install
```

### "Adapter not found" error

Ensure the adapter has a valid `adapter.yaml` manifest:

```bash
cat "${PAI_DIR:-$HOME/.config/pai}/packs/mai-prometheus-adapter/adapter.yaml"
```

---

## File Locations

After installation:

```
${PAI_DIR:-$HOME/.config/pai}/
  providers.yaml
  packs/
    mai-prometheus-adapter/
      package.json
      tsconfig.json
      adapter.yaml          # Adapter manifest
      README.md
      VERIFY.md
      INSTALL.md
      src/
        index.ts
        PrometheusAdapter.ts
      tests/
        PrometheusAdapter.test.ts
```

---

## API Endpoints Used

The adapter communicates with these Prometheus/Alertmanager endpoints:

### Prometheus

| Method | Endpoint | Description |
|--------|----------|-------------|
| instantQuery | `GET /api/v1/query` | Point-in-time queries |
| rangeQuery | `GET /api/v1/query_range` | Time series queries |
| getMetricNames | `GET /api/v1/label/__name__/values` | Available metrics |
| getLabelValues | `GET /api/v1/label/{name}/values` | Label values |
| listAlerts | `GET /api/v1/alerts` | Active alerts |
| listAlertRules | `GET /api/v1/rules` | Alert rules |
| listTargets | `GET /api/v1/targets` | Scrape targets |
| healthCheck | `GET /-/healthy` | Health status |

### Alertmanager (Optional)

| Method | Endpoint | Description |
|--------|----------|-------------|
| listAlerts | `GET /api/v2/alerts` | Active alerts with silences |

---

## Next Steps

1. Install the observability skill for CLI tools (`mai-observability-skill/INSTALL.md`)
2. Set up alerting rules in Prometheus
3. Configure Alertmanager for notifications
