# mai-observability-core

Core interfaces and utilities for the KAI Observability domain.

## Overview

This package provides:

- `ObservabilityProvider` interface for metrics and alerting
- Type definitions for metrics, alerts, and targets
- Adapter discovery and loading
- Configuration management
- Error classes and retry utilities

## Installation

```bash
bun add mai-observability-core
```

## Usage

```typescript
import {
  getObservabilityProvider,
  type ObservabilityProvider,
  type MetricSample,
  type Alert,
} from 'mai-observability-core';

// Get configured provider
const provider = await getObservabilityProvider();

// Query metrics
const result = await provider.instantQuery('up{job="prometheus"}');
console.log(result.samples);

// List firing alerts
const alerts = await provider.listAlerts({ state: 'firing' });
for (const alert of alerts) {
  console.log(`${alert.name}: ${alert.state}`);
}

// Check target health
const targets = await provider.listTargets({ health: 'down' });
```

## Configuration

Configure via `providers.yaml`:

```yaml
domains:
  observability:
    primary: prometheus
    adapters:
      prometheus:
        prometheusUrl: http://prometheus:9090
        alertmanagerUrl: http://alertmanager:9093
        timeout: 30
```

## Adapters

| Adapter | Package | Description |
|---------|---------|-------------|
| prometheus | mai-prometheus-adapter | Prometheus + Alertmanager |
| mock | mai-mock-observability-adapter | Testing mock |

## Types

### MetricSample

```typescript
interface MetricSample {
  metric: Record<string, string>;  // Labels including __name__
  value: number;
  timestamp: Date;
}
```

### Alert

```typescript
interface Alert {
  name: string;
  state: 'inactive' | 'pending' | 'firing';
  severity?: 'critical' | 'warning' | 'info';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  activeAt?: Date;
  fingerprint: string;
}
```

### Target

```typescript
interface Target {
  endpoint: string;
  job: string;
  instance: string;
  health: 'up' | 'down' | 'unknown';
  labels: Record<string, string>;
  lastScrape?: Date;
  lastError?: string;
}
```

## Errors

- `ObservabilityError` - Base error class
- `QueryError` - Query execution failed
- `QueryTimeoutError` - Query timed out
- `AlertNotFoundError` - Alert not found
- `MetricNotFoundError` - Metric not found
- `AuthenticationError` - Auth failed
- `ConfigurationError` - Invalid config
- `AdapterNotFoundError` - Adapter not installed
- `ConnectionError` - Cannot connect to backend
