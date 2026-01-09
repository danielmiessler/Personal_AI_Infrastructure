---
name: Observability
description: Metrics and alerting across Prometheus. USE WHEN metrics, alerts, monitoring, uptime, targets, health checks, scrape status.
---

# Observability Skill

Unified metrics and alerting across monitoring platforms. Works with Prometheus (home/k3s) or other observability backends via adapters.

## Workflow Routing

| Workflow | When to Use | Reference |
|----------|-------------|-----------|
| QueryMetrics | "show CPU usage", "memory over time", "query up" | `Workflows/QueryMetrics.md` |
| ListAlerts | "active alerts", "what's firing?", "any warnings?" | `Workflows/ListAlerts.md` |
| AlertStatus | "is X alerting?", "check high memory alert" | `Workflows/AlertStatus.md` |
| TargetHealth | "what's down?", "scrape targets", "endpoint health" | `Workflows/TargetHealth.md` |
| MetricExplore | "what metrics exist?", "list labels", "available metrics" | `Workflows/MetricExplore.md` |

## CLI Tools

```bash
# Instant query
bun run Tools/query.ts 'up{job="prometheus"}'

# Range query (last hour, 1 minute steps)
bun run Tools/query.ts 'rate(http_requests_total[5m])' --start 1h --step 60

# List firing alerts
bun run Tools/alerts.ts --state firing

# List all alerts
bun run Tools/alerts.ts [--state firing|pending|inactive]
                        [--severity critical|warning|info]
                        [--format table|json]

# List alert rules
bun run Tools/rules.ts [--group <name>] [--state firing|pending|inactive]

# List targets
bun run Tools/targets.ts [--job <name>] [--health up|down|unknown]

# List metric names
bun run Tools/metrics.ts [--match 'job="prometheus"'] [--limit 100]

# Get label values
bun run Tools/labels.ts <label-name> [--match 'job="node"']

# Health check
bun run Tools/health.ts
```

## Configuration

Configured via `providers.yaml`:

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

## Examples

### Example 1: Check service health
```
User: "Is everything up?"

-> Skill loads: Observability -> TargetHealth workflow
-> Queries: listTargets({ health: 'down' })
-> Returns list of down targets or confirms all healthy
```

### Example 2: View firing alerts
```
User: "Any alerts firing?"

-> Skill loads: Observability -> ListAlerts workflow
-> Queries: listAlerts({ state: 'firing' })
-> Returns formatted alert list with severity
```

### Example 3: Query CPU usage
```
User: "Show CPU usage over the last hour"

-> Skill loads: Observability -> QueryMetrics workflow
-> Queries: rangeQuery('rate(node_cpu_seconds_total[5m])', { start: 1h, step: 60 })
-> Returns time series data
```

### Example 4: Explore available metrics
```
User: "What metrics does the node exporter expose?"

-> Skill loads: Observability -> MetricExplore workflow
-> Queries: getMetricNames({ match: ['job="node"'] })
-> Returns list of node_* metrics
```

### Example 5: Check specific alert
```
User: "Is the HighMemory alert firing?"

-> Skill loads: Observability -> AlertStatus workflow
-> Queries: getAlert('HighMemory')
-> Returns alert details or confirms inactive
```
