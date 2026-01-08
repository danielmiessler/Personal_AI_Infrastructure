# kai-prometheus-adapter

Prometheus adapter for the KAI Observability domain.

## Overview

This adapter provides an implementation of `ObservabilityProvider` using the Prometheus HTTP API and optionally Alertmanager API.

## Features

- Instant queries (point-in-time)
- Range queries (time series)
- Metric name and label discovery
- Alert status from Prometheus rules
- Optional Alertmanager integration
- Target/scrape endpoint health
- Query timeout support

## Usage

```typescript
import { PrometheusAdapter } from 'kai-prometheus-adapter';

const adapter = new PrometheusAdapter({
  prometheusUrl: 'http://prometheus:9090',
  alertmanagerUrl: 'http://alertmanager:9093', // optional
  timeout: 30,
});

// Query metrics
const result = await adapter.instantQuery('up{job="prometheus"}');
console.log(result.samples);

// Range query
const series = await adapter.rangeQuery('rate(http_requests_total[5m])', {
  start: new Date(Date.now() - 3600000),
  end: new Date(),
  step: 60,
});

// Check alerts
const alerts = await adapter.listAlerts({ state: 'firing' });

// Check targets
const targets = await adapter.listTargets({ health: 'down' });
```

## Configuration

Via `providers.yaml`:

```yaml
domains:
  observability:
    primary: prometheus
    adapters:
      prometheus:
        prometheusUrl: http://prometheus.monitoring:9090
        alertmanagerUrl: http://alertmanager.monitoring:9093
        timeout: 30
        auth:
          type: env
          var: PROMETHEUS_TOKEN
```

## API Endpoints Used

### Prometheus

| Method | Endpoint |
|--------|----------|
| instantQuery | `GET /api/v1/query` |
| rangeQuery | `GET /api/v1/query_range` |
| getMetricNames | `GET /api/v1/label/__name__/values` |
| getLabelValues | `GET /api/v1/label/{name}/values` |
| listAlerts | `GET /api/v1/alerts` |
| listAlertRules | `GET /api/v1/rules` |
| listTargets | `GET /api/v1/targets` |
| healthCheck | `GET /-/healthy` |

### Alertmanager (if configured)

| Method | Endpoint |
|--------|----------|
| listAlerts | `GET /api/v2/alerts` |

## Authentication

Supports optional authentication via:

- Bearer token (via keychain or env var)
- Basic auth (via keychain or env var)

Configure in `providers.yaml`:

```yaml
adapters:
  prometheus:
    prometheusUrl: http://prometheus:9090
    auth:
      type: env
      var: PROMETHEUS_TOKEN
```

## Error Handling

The adapter throws specific errors:

- `QueryError` - Invalid PromQL or query failure
- `QueryTimeoutError` - Query exceeded timeout
- `ConnectionError` - Cannot reach Prometheus
- `AuthenticationError` - Invalid credentials
