# kai-mock-observability-adapter

Mock Observability adapter for testing KAI Observability domain workflows.

## Overview

This adapter provides a mock implementation of `ObservabilityProvider` for testing skills and integration tests without requiring a real Prometheus or other monitoring backend.

## Features

- Pre-populated test data
- Configurable latency simulation
- Configurable failure simulation
- Call logging for verification
- Test helper methods

## Usage

```typescript
import { MockObservabilityAdapter } from 'kai-mock-observability-adapter';

// Create with default config
const adapter = new MockObservabilityAdapter();

// Add test data
adapter.setMetricValue('up', 1, { job: 'prometheus' });
adapter.addAlert({
  name: 'HighMemory',
  state: 'firing',
  labels: { instance: 'server1' },
  annotations: { summary: 'Memory is high' },
  fingerprint: 'abc123',
});

// Query metrics
const result = await adapter.instantQuery('up');
console.log(result.samples);

// Check alerts
const alerts = await adapter.listAlerts({ state: 'firing' });
```

## Test Helpers

### Metric Helpers

```typescript
// Set a metric value
adapter.setMetricValue('cpu_usage', 0.5, { instance: 'server1' });

// Set a time series
adapter.setMetricSeries('http_requests_total', [
  { timestamp: new Date(), value: 100 },
  { timestamp: new Date(), value: 150 },
], { method: 'GET' });

// Clear all metrics
adapter.clearMetrics();
```

### Alert Helpers

```typescript
// Set alerts
adapter.setAlerts([alert1, alert2]);
adapter.addAlert(alert);
adapter.updateAlertState('fingerprint', 'firing');
adapter.clearAlerts();
```

### Alert Rule Helpers

```typescript
adapter.setAlertRules([rule1, rule2]);
adapter.addAlertRule(rule);
adapter.clearAlertRules();
```

### Target Helpers

```typescript
adapter.setTargets([target1, target2]);
adapter.addTarget(target);
adapter.setTargetHealth('http://localhost:9090/metrics', 'down');
adapter.clearTargets();
```

### Simulation

```typescript
// Simulate latency (ms)
adapter.setLatency(100);

// Simulate failures (0-100%)
adapter.setFailureRate(50);
```

### Call Logging

```typescript
// Get all method calls
const calls = adapter.getCallLog();

// Clear call log
adapter.clearCallLog();
```

## Configuration

Via `providers.yaml`:

```yaml
domains:
  observability:
    primary: mock
    adapters:
      mock:
        simulateLatency: 50
        failureRate: 0
```
