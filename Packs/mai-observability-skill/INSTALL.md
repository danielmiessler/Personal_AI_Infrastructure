# mai-observability-skill Installation

User-facing skill for metrics querying and alert monitoring. Provides CLI tools and workflows for observability operations.

## Prerequisites

- Bun runtime (v1.0+)
- `mai-observability-core` installed
- An observability adapter (e.g., `mai-prometheus-adapter`)
- Prometheus/Alertmanager accessible (or mock adapter for testing)

---

## Step 1: Install Dependencies

Ensure the core package and an adapter are installed first:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Install core (if not already)
cd "$PAI_DIR/packs/mai-observability-core"
bun install

# Install an adapter (e.g., Prometheus)
cd "$PAI_DIR/packs/mai-prometheus-adapter"
bun install
```

---

## Step 2: Install the Skill

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
SKILLS_DIR="$PAI_DIR/skills"

# Create skills directory
mkdir -p "$SKILLS_DIR"

# Copy or link the skill
cp -r /path/to/mai-observability-skill "$SKILLS_DIR/Observability"

# Install skill dependencies
cd "$SKILLS_DIR/Observability"
bun install
```

---

## Step 3: Configure Observability Backend

Ensure `${PAI_DIR:-$HOME/.config/pai}/providers.yaml` has the observability domain configured:

```yaml
domains:
  observability:
    primary: prometheus
    adapters:
      prometheus:
        prometheusUrl: http://prometheus.monitoring:9090
        alertmanagerUrl: http://alertmanager.monitoring:9093
        timeout: 30
```

### Authentication (Optional)

If your Prometheus requires authentication:

```yaml
adapters:
  prometheus:
    prometheusUrl: http://prometheus:9090
    auth:
      type: env
      var: PROMETHEUS_TOKEN
```

Or via keychain:

```yaml
    auth:
      type: keychain
      service: prometheus-token
```

---

## Step 4: Verify Installation

See `VERIFY.md` for the complete checklist, or run the quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Observability/Tools"

# Health check (tests full stack)
bun run "$TOOLS/health.ts"

# Expected output:
# Provider: prometheus v1.x.x
# Status: HEALTHY
# Latency: <ms>
```

---

## Step 5: Test CLI Tools

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Observability/Tools"

# Query metrics
bun run "$TOOLS/query.ts" 'up'

# List firing alerts
bun run "$TOOLS/alerts.ts" --state firing

# Check target health
bun run "$TOOLS/targets.ts" --health down

# List metric names
bun run "$TOOLS/metrics.ts" --limit 10

# Get label values
bun run "$TOOLS/labels.ts" job
```

---

## Troubleshooting

### Connection refused

1. Verify Prometheus is running: `curl http://your-prometheus:9090/-/healthy`
2. Check the URL in `providers.yaml` matches your Prometheus instance
3. Ensure network connectivity (firewall, VPN, k8s port-forward)

### Authentication errors

1. If using token auth, verify the token is correct
2. Check the environment variable or keychain entry exists
3. Test with curl: `curl -H "Authorization: Bearer $TOKEN" http://prometheus:9090/-/healthy`

### "No data returned"

1. Verify Prometheus has active targets scraping data
2. Check metric names match your Prometheus configuration
3. Test with a simple query like `up` first

### Module/import errors

```bash
cd "${PAI_DIR:-$HOME/.config/pai}/skills/Observability"
bun install
```

---

## File Locations

After installation:

```
${PAI_DIR:-$HOME/.config/pai}/
  providers.yaml
  skills/
    Observability/
      SKILL.md              # Skill definition and workflow routing
      README.md
      VERIFY.md
      INSTALL.md
      package.json
      Tools/
        query.ts            # Instant and range queries
        alerts.ts           # List alerts
        rules.ts            # List alert rules
        targets.ts          # List scrape targets
        metrics.ts          # List metric names
        labels.ts           # Get label values
        health.ts           # Health check
      Workflows/
        QueryMetrics.md
        ListAlerts.md
        AlertStatus.md
        TargetHealth.md
        MetricExplore.md
      Config/
        observability.yaml
```

---

## Usage Examples

### Via CLI

```bash
# Instant query
bun run Tools/query.ts 'up{job="prometheus"}'

# Range query (last hour, 1-minute steps)
bun run Tools/query.ts 'rate(http_requests_total[5m])' --start 1h --step 60

# List all firing alerts
bun run Tools/alerts.ts --state firing

# Filter alerts by severity
bun run Tools/alerts.ts --severity critical

# JSON output for scripting
bun run Tools/alerts.ts --format json
```

### Via Claude Code

The skill integrates with Claude Code workflows:

- "Show CPU usage" -> QueryMetrics workflow
- "Any alerts firing?" -> ListAlerts workflow
- "What's down?" -> TargetHealth workflow
- "What metrics exist?" -> MetricExplore workflow

---

## Next Steps

1. Set up alerting rules in Prometheus
2. Configure Alertmanager for notifications
3. Explore available metrics with `metrics.ts`
