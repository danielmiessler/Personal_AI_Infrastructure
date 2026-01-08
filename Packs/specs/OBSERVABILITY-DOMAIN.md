# Observability Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-07
**Phase**: 6

---

## Overview

The Observability domain provides a unified interface for metrics querying, alert monitoring, and system health visibility across different observability platforms. It abstracts the differences between Prometheus, Datadog, and other monitoring systems behind a common `ObservabilityProvider` interface.

### Goals
- Unified interface for metrics queries and alert status
- Seamless transition between home (Prometheus) and work (Datadog) environments
- Support instant queries, range queries, and alert state inspection
- Enable monitoring automation and health dashboards

### Non-Goals
- Metric ingestion/pushing (write path) - read-only focus
- Alert rule management (configuration belongs in IaC)
- Dashboard creation/management (use native UIs)
- Log aggregation (separate Logging domain if needed)
- Distributed tracing (separate APM domain if needed)

### Design Decisions

**Why "Observability" not "Metrics"?**

"Observability" is the umbrella term covering metrics, logs, and traces. While Phase 6 focuses on metrics and alerts, the domain name leaves room for expansion. Prometheus and Datadog both position themselves as observability platforms.

**Why read-only?**

Writing metrics is typically handled by instrumented applications, not by AI assistants. The assistant's role is to help query, understand, and act on observability data - not to emit it.

**Why no logs/traces in Phase 6?**

Metrics and alerts are the highest-value observability features for home infrastructure monitoring. Logs and traces add complexity and can be addressed in future phases or separate domains.

**What about Grafana?**

Grafana is a visualization layer, not a metrics backend. Prometheus adapter handles the actual data. Grafana dashboard links can be included in metadata but aren't a separate adapter.

---

## Pack Structure

```
kai-observability-core/           # Interface + discovery + shared utilities
kai-prometheus-adapter/           # Prometheus/Alertmanager integration
kai-mock-observability-adapter/   # Mock adapter for testing (REQUIRED)
kai-observability-skill/          # User-facing workflows
```

**Future adapters** (not implemented in Phase 6):
- `kai-datadog-adapter` - Datadog metrics and monitors
- `kai-victoria-adapter` - VictoriaMetrics (Prometheus-compatible)
- `kai-influxdb-adapter` - InfluxDB time series

---

## kai-observability-core

### Purpose
Defines the ObservabilityProvider interface and shared utilities for metrics and alerting operations. Provides adapter discovery, configuration loading, and error classes.

### Directory Structure

```
kai-observability-core/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Public exports
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── ObservabilityProvider.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── Metric.ts               # Metric sample and series
│   │   ├── Query.ts                # Query parameters
│   │   ├── Alert.ts                # Alert definitions and state
│   │   └── Target.ts               # Scrape targets / monitored endpoints
│   ├── discovery/
│   │   ├── AdapterLoader.ts        # Discovery with caching
│   │   ├── ConfigLoader.ts         # Configuration loading
│   │   ├── ProviderFactory.ts      # Provider instantiation
│   │   └── index.ts
│   └── utils/
│       ├── errors.ts               # Domain-specific errors
│       ├── logger.ts               # Audit logging
│       └── retry.ts                # Retry with exponential backoff
└── tests/
    ├── types.test.ts
    ├── errors.test.ts
    ├── discovery.test.ts
    ├── retry.test.ts
    ├── logger.test.ts
    └── fixtures.ts
```

### Provider Interface

```typescript
// src/interfaces/ObservabilityProvider.ts

export interface ObservabilityProvider {
  /** Provider identifier */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Metric operations
  instantQuery(query: string, options?: InstantQueryOptions): Promise<QueryResult>;
  rangeQuery(query: string, options: RangeQueryOptions): Promise<QueryResult>;
  getMetricNames(options?: MetricNamesOptions): Promise<string[]>;
  getLabelValues(labelName: string, options?: LabelValuesOptions): Promise<string[]>;

  // Alert operations
  listAlerts(options?: AlertQuery): Promise<Alert[]>;
  getAlert(alertName: string): Promise<Alert>;
  listAlertRules(options?: AlertRuleQuery): Promise<AlertRule[]>;

  // Target/endpoint health
  listTargets(options?: TargetQuery): Promise<Target[]>;

  // Health check
  healthCheck(): Promise<HealthStatus>;
}

// Metric types
export interface MetricSample {
  metric: Record<string, string>;  // Labels including __name__
  value: number;
  timestamp: Date;
}

export interface MetricSeries {
  metric: Record<string, string>;
  values: Array<{ timestamp: Date; value: number }>;
}

export interface QueryResult {
  resultType: 'vector' | 'matrix' | 'scalar' | 'string';
  samples?: MetricSample[];     // For vector/scalar
  series?: MetricSeries[];      // For matrix
  scalarValue?: number;         // For scalar
  stringValue?: string;         // For string
}

export interface InstantQueryOptions {
  time?: Date;                   // Evaluation timestamp (default: now)
  timeout?: number;              // Query timeout in seconds
}

export interface RangeQueryOptions {
  start: Date;                   // Range start
  end: Date;                     // Range end
  step: number;                  // Step in seconds
  timeout?: number;              // Query timeout in seconds
}

export interface MetricNamesOptions {
  match?: string[];              // Label matchers to filter
  start?: Date;
  end?: Date;
  limit?: number;
}

export interface LabelValuesOptions {
  match?: string[];              // Label matchers to filter
  start?: Date;
  end?: Date;
  limit?: number;
}

// Alert types
export interface Alert {
  name: string;
  state: AlertState;
  severity?: AlertSeverity;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  activeAt?: Date;
  value?: number;
  fingerprint: string;
}

export type AlertState = 'inactive' | 'pending' | 'firing';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertRule {
  name: string;
  group: string;
  query: string;
  duration: number;              // For duration in seconds
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: AlertState;
  alerts: Alert[];               // Active alerts from this rule
  lastEvaluation?: Date;
  evaluationTime?: number;       // Last eval duration in ms
}

export interface AlertQuery {
  state?: AlertState | AlertState[];
  severity?: AlertSeverity | AlertSeverity[];
  labels?: Record<string, string>;
  limit?: number;
}

export interface AlertRuleQuery {
  group?: string;
  state?: AlertState | AlertState[];
  limit?: number;
}

// Target types
export interface Target {
  endpoint: string;              // Scrape URL
  job: string;                   // Job name
  instance: string;              // Instance label
  health: TargetHealth;
  labels: Record<string, string>;
  lastScrape?: Date;
  lastScrapeDuration?: number;   // In seconds
  lastError?: string;
}

export type TargetHealth = 'up' | 'down' | 'unknown';

export interface TargetQuery {
  job?: string;
  health?: TargetHealth | TargetHealth[];
  limit?: number;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}
```

### Domain Errors

```typescript
// src/utils/errors.ts

export class ObservabilityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'ObservabilityError';
  }
}

export class QueryError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'QUERY_ERROR', provider);
    this.name = 'QueryError';
  }
}

export class QueryTimeoutError extends ObservabilityError {
  constructor(timeout: number, provider?: string) {
    super(`Query timed out after ${timeout}s`, 'QUERY_TIMEOUT', provider);
    this.name = 'QueryTimeoutError';
  }
}

export class AlertNotFoundError extends ObservabilityError {
  constructor(alertName: string, provider?: string) {
    super(`Alert not found: ${alertName}`, 'ALERT_NOT_FOUND', provider);
    this.name = 'AlertNotFoundError';
  }
}

export class MetricNotFoundError extends ObservabilityError {
  constructor(metric: string, provider?: string) {
    super(`Metric not found: ${metric}`, 'METRIC_NOT_FOUND', provider);
    this.name = 'MetricNotFoundError';
  }
}

export class AuthenticationError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

export class AdapterNotFoundError extends ObservabilityError {
  constructor(adapter: string) {
    super(`Adapter not found: ${adapter}`, 'ADAPTER_NOT_FOUND');
    this.name = 'AdapterNotFoundError';
  }
}

export class RateLimitError extends ObservabilityError {
  constructor(retryAfter?: number, provider?: string) {
    super(
      `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT',
      provider
    );
    this.name = 'RateLimitError';
  }
}

export class ConnectionError extends ObservabilityError {
  constructor(message: string, provider?: string) {
    super(message, 'CONNECTION_ERROR', provider);
    this.name = 'ConnectionError';
  }
}
```

---

## kai-prometheus-adapter

### Purpose
Implements ObservabilityProvider using Prometheus HTTP API and Alertmanager API. Provides metrics querying, alert status, and target health.

### Adapter Manifest

```yaml
# adapter.yaml
name: prometheus
version: 1.0.0
domain: observability
interface: ObservabilityProvider
entry: ./src/PrometheusAdapter.ts
description: Prometheus and Alertmanager adapter

config:
  required:
    - prometheusUrl         # Prometheus server URL
  optional:
    - alertmanagerUrl: null # Alertmanager URL (if separate)
    - timeout: 30           # Default query timeout in seconds

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: false
  kubernetes: true
  local: true
```

### Prometheus API Mapping

| Provider Method | Prometheus API Endpoint |
|-----------------|------------------------|
| instantQuery | `GET /api/v1/query` |
| rangeQuery | `GET /api/v1/query_range` |
| getMetricNames | `GET /api/v1/label/__name__/values` |
| getLabelValues | `GET /api/v1/label/{name}/values` |
| listAlerts | `GET /api/v1/alerts` |
| getAlert | `GET /api/v1/alerts` (filter by name) |
| listAlertRules | `GET /api/v1/rules` |
| listTargets | `GET /api/v1/targets` |
| healthCheck | `GET /-/healthy` |

### Alertmanager API (if configured)

| Provider Method | Alertmanager API Endpoint |
|-----------------|--------------------------|
| listAlerts | `GET /api/v2/alerts` |
| (silences) | Future: `GET /api/v2/silences` |

### Implementation Notes

- **Authentication**: Optional basic auth or bearer token via keychain/env
- **Prometheus URL**: Support both standalone and in-cluster (k8s service) URLs
- **Alertmanager**: Optional separate URL, falls back to Prometheus alerts if not configured
- **Query safety**: Implement query timeout to prevent runaway queries
- **Result limits**: Cap result sets to prevent memory issues (default 10000 samples)
- **Time handling**: Accept Date objects, convert to Unix timestamps for API

### Status Mapping

| Prometheus Alert State | AlertState |
|----------------------|------------|
| inactive | inactive |
| pending | pending |
| firing | firing |

| Prometheus Target Health | TargetHealth |
|-------------------------|--------------|
| up | up |
| down | down |
| unknown | unknown |

---

## kai-mock-observability-adapter

### Purpose
Provides a mock ObservabilityProvider for testing skills and integration tests without requiring real monitoring infrastructure.

### Adapter Manifest

```yaml
# adapter.yaml
name: mock
version: 1.0.0
domain: observability
interface: ObservabilityProvider
entry: ./src/MockObservabilityAdapter.ts
description: Mock adapter for testing

config:
  required: []
  optional:
    - metrics: {}           # Pre-populated metrics
    - alerts: []            # Pre-populated alerts
    - rules: []             # Pre-populated alert rules
    - targets: []           # Pre-populated targets
    - simulateLatency: 0    # Simulated latency in ms
    - failureRate: 0        # Percentage of requests to fail (0-100)

requires:
  runtime: bun >= 1.0
  platform: [darwin, linux, win32]

integrations:
  cicd: true
  kubernetes: false
  local: true
```

### Test Helpers

```typescript
// Test helper methods on MockObservabilityAdapter

class MockObservabilityAdapter implements ObservabilityProvider {
  // Standard interface methods...

  // Metric helpers
  setMetricValue(name: string, value: number, labels?: Record<string, string>): void;
  setMetricSeries(name: string, values: Array<{ timestamp: Date; value: number }>, labels?: Record<string, string>): void;
  clearMetrics(): void;

  // Alert helpers
  setAlerts(alerts: Alert[]): void;
  addAlert(alert: Alert): void;
  updateAlertState(fingerprint: string, state: AlertState): void;
  clearAlerts(): void;

  // Rule helpers
  setAlertRules(rules: AlertRule[]): void;
  addAlertRule(rule: AlertRule): void;
  clearAlertRules(): void;

  // Target helpers
  setTargets(targets: Target[]): void;
  addTarget(target: Target): void;
  setTargetHealth(endpoint: string, health: TargetHealth): void;
  clearTargets(): void;

  // Simulation
  setFailureRate(rate: number): void;
  setLatency(ms: number): void;

  // Call logging
  getCallLog(): MethodCall[];
  clearCallLog(): void;
}
```

---

## kai-observability-skill

### Purpose
Provides user-facing workflows for observability operations that work across any ObservabilityProvider backend.

### SKILL.md

```yaml
---
name: Observability
description: Metrics and alerting across Prometheus, Datadog. USE WHEN metrics, alerts, monitoring, uptime, targets, health checks, dashboards.
---

# Observability Skill

Unified metrics and alerting across monitoring platforms. Works with Prometheus (home/k3s) or Datadog (enterprise).

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| QueryMetrics | "show CPU usage", "memory over time", "request rate" | Metric data |
| ListAlerts | "active alerts", "what's firing?", "any warnings?" | Alert list |
| AlertStatus | "is X alerting?", "check alert Y" | Alert details |
| TargetHealth | "what's down?", "scrape targets", "endpoint health" | Target list |
| MetricExplore | "what metrics exist?", "list labels for X" | Metric metadata |

## CLI Tools

```bash
# Instant query
bun run Tools/query.ts 'up{job="prometheus"}'

# Range query
bun run Tools/query.ts 'rate(http_requests_total[5m])' --start 1h --step 60

# List firing alerts
bun run Tools/alerts.ts --state firing

# Get specific alert
bun run Tools/alerts.ts --name HighMemoryUsage

# List alert rules
bun run Tools/rules.ts [--group infrastructure]

# List targets
bun run Tools/targets.ts [--job prometheus] [--health down]

# List metric names
bun run Tools/metrics.ts [--match 'job="prometheus"']

# Get label values
bun run Tools/labels.ts instance [--match 'job="node"']

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
```

### Workflows

1. **QueryMetrics.md** - Execute PromQL queries (instant and range)
2. **ListAlerts.md** - View active and pending alerts
3. **AlertStatus.md** - Get detailed status of specific alert
4. **TargetHealth.md** - Check scrape target health
5. **MetricExplore.md** - Discover available metrics and labels

---

## Implementation Checklist

### Phase 6.1: kai-observability-core
- [ ] Create package structure (README.md, package.json, tsconfig.json)
- [ ] Create src/index.ts with public exports
- [ ] Define ObservabilityProvider interface in src/interfaces/
- [ ] Define Metric types (MetricSample, MetricSeries, QueryResult)
- [ ] Define Query types (InstantQueryOptions, RangeQueryOptions)
- [ ] Define Alert types (Alert, AlertRule, AlertState, AlertSeverity)
- [ ] Define Target types (Target, TargetHealth)
- [ ] Implement adapter discovery with 60s caching
- [ ] Implement cache invalidation function
- [ ] Implement config loading with precedence
- [ ] Implement provider factory
- [ ] Implement retry utility with exponential backoff
- [ ] Add domain-specific error classes
- [ ] Add audit logging
- [ ] Write unit tests for each module
- [ ] Create VERIFY.md and verify all items

### Phase 6.2: kai-mock-observability-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement MockObservabilityAdapter class with test helpers
- [ ] Implement setMetricValue/setMetricSeries/clearMetrics methods
- [ ] Implement setAlerts/addAlert/updateAlertState/clearAlerts methods
- [ ] Implement setAlertRules/addAlertRule/clearAlertRules methods
- [ ] Implement setTargets/addTarget/setTargetHealth/clearTargets methods
- [ ] Implement simulated latency
- [ ] Implement simulated failures
- [ ] Implement call logging for verification
- [ ] Create tests/fixtures.ts with factory functions
- [ ] Write unit tests
- [ ] Create VERIFY.md and verify all items

### Phase 6.3: kai-prometheus-adapter
- [ ] Create package structure
- [ ] Create adapter.yaml manifest
- [ ] Implement PrometheusAdapter class
- [ ] Implement instant query via /api/v1/query
- [ ] Implement range query via /api/v1/query_range
- [ ] Implement metric names and label values
- [ ] Implement alert listing from Prometheus
- [ ] Implement optional Alertmanager integration
- [ ] Implement target listing via /api/v1/targets
- [ ] Implement health check via /-/healthy
- [ ] Handle query timeouts
- [ ] Use retry utility for API calls
- [ ] Write unit tests with mocked Prometheus API
- [ ] Create VERIFY.md and verify all items

### Phase 6.4: kai-observability-skill
- [ ] Create package structure
- [ ] Create SKILL.md with workflow routing
- [ ] Create CLI tools in Tools/
- [ ] Create workflow documentation in Workflows/
- [ ] Write integration tests using mock adapter
- [ ] Create VERIFY.md and verify all items

### Phase 6.5: Integration Testing
- [ ] End-to-end test: skill → core → mock adapter
- [ ] End-to-end test: skill → core → Prometheus adapter (if available)
- [ ] Verify audit logging captures all operations
- [ ] Test retry behavior with flaky mock adapter
- [ ] Test query timeout handling
- [ ] Update SESSION-CONTEXT.md with Phase 6 completion

---

## Security Considerations

1. **No metric writes**: Read-only interface prevents data corruption
2. **Query limits**: Timeout and sample limits prevent DoS
3. **Auth optional**: Many Prometheus setups are network-isolated, auth is opt-in
4. **No secrets in queries**: PromQL queries shouldn't contain sensitive data

---

## Performance Considerations

1. **Query complexity**: Complex PromQL queries can be expensive; implement timeouts
2. **Result limits**: Cap maximum samples returned (default 10000)
3. **Caching**: Consider caching metric names and label values (they change infrequently)
4. **Chunked responses**: Handle large range query responses gracefully

---

## Related Specifications

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) - System architecture
- [SECRETS-DOMAIN.md](./SECRETS-DOMAIN.md) - Reference implementation (Phase 1)
- [NETWORK-DOMAIN.md](./NETWORK-DOMAIN.md) - Reference implementation (Phase 2)
- [ISSUES-DOMAIN.md](./ISSUES-DOMAIN.md) - Reference implementation (Phase 3)
- [CICD-DOMAIN.md](./CICD-DOMAIN.md) - Reference implementation (Phase 4)
- [CONTAINERS-DOMAIN.md](./CONTAINERS-DOMAIN.md) - Reference implementation (Phase 5)
- [DOMAIN-TEMPLATE.md](./DOMAIN-TEMPLATE.md) - Generic domain template

---

## Changelog

### 1.0.0 - 2026-01-07
- Initial specification
