# mai-observability-skill

Observability skill for KAI - provides metrics querying and alert monitoring workflows.

## Overview

This skill provides user-facing tools and workflows for observability operations. It uses the mai-observability-core interfaces and can work with any configured adapter (Prometheus, mock, etc.).

## CLI Tools

### query.ts - Query Metrics

```bash
# Instant query
bun run Tools/query.ts 'up{job="prometheus"}'

# Range query
bun run Tools/query.ts 'rate(http_requests_total[5m])' --start 1h --step 60

# Options:
#   --time <iso-date>  Evaluation time for instant queries
#   --start <duration> Start time (e.g., 1h, 30m, 24h ago)
#   --end <duration>   End time (default: now)
#   --step <seconds>   Step interval for range queries
#   --format <type>    Output format (table|json)
```

### alerts.ts - List Alerts

```bash
# All alerts
bun run Tools/alerts.ts

# Firing only
bun run Tools/alerts.ts --state firing

# By severity
bun run Tools/alerts.ts --severity critical

# Options:
#   --state <state>      Filter: firing, pending, inactive
#   --severity <sev>     Filter: critical, warning, info
#   --format <type>      Output format (table|json)
```

### rules.ts - List Alert Rules

```bash
# All rules
bun run Tools/rules.ts

# By group
bun run Tools/rules.ts --group infrastructure

# Options:
#   --group <name>   Filter by group name
#   --state <state>  Filter by state
#   --format <type>  Output format (table|json)
```

### targets.ts - List Targets

```bash
# All targets
bun run Tools/targets.ts

# Down targets only
bun run Tools/targets.ts --health down

# By job
bun run Tools/targets.ts --job prometheus

# Options:
#   --job <name>      Filter by job name
#   --health <status> Filter: up, down, unknown
#   --format <type>   Output format (table|json)
```

### metrics.ts - List Metric Names

```bash
# All metrics
bun run Tools/metrics.ts

# With filter
bun run Tools/metrics.ts --match 'job="prometheus"'

# Options:
#   --match <matcher>  PromQL label matcher
#   --limit <num>      Max results
```

### labels.ts - Get Label Values

```bash
# Get values for a label
bun run Tools/labels.ts job
bun run Tools/labels.ts instance --match 'job="node"'

# Options:
#   --match <matcher>  PromQL label matcher
#   --limit <num>      Max results
```

### health.ts - Health Check

```bash
bun run Tools/health.ts
```

## Configuration

The skill uses the observability domain configuration from `providers.yaml`. See mai-observability-core for configuration options.
