import type {
  ObservabilityProvider,
  MetricSample,
  MetricSeries,
  QueryResult,
  InstantQueryOptions,
  RangeQueryOptions,
  MetricNamesOptions,
  LabelValuesOptions,
  Alert,
  AlertRule,
  AlertQuery,
  AlertRuleQuery,
  AlertState,
  Target,
  TargetQuery,
  TargetHealth,
  HealthStatus,
} from 'mai-observability-core';

import { AlertNotFoundError } from 'mai-observability-core';

/**
 * Method call record for test verification
 */
export interface MethodCall {
  method: string;
  args: unknown[];
  timestamp: Date;
}

/**
 * Configuration for MockObservabilityAdapter
 */
export interface MockObservabilityConfig {
  /** Simulated latency in milliseconds */
  simulateLatency?: number;
  /** Failure rate percentage (0-100) */
  failureRate?: number;
  /** Initial metrics data */
  metrics?: Map<string, { labels: Record<string, string>; value: number; timestamp: Date }[]>;
  /** Initial alerts */
  alerts?: Alert[];
  /** Initial alert rules */
  rules?: AlertRule[];
  /** Initial targets */
  targets?: Target[];
}

/**
 * Mock Observability adapter for testing
 */
export class MockObservabilityAdapter implements ObservabilityProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private metrics: Map<string, { labels: Record<string, string>; value: number; timestamp: Date }[]> = new Map();
  private metricSeries: Map<string, { labels: Record<string, string>; values: Array<{ timestamp: Date; value: number }> }[]> = new Map();
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private targets: Target[] = [];
  private latencyMs: number = 0;
  private failureRate: number = 0;
  private callLog: MethodCall[] = [];

  constructor(config: MockObservabilityConfig = {}) {
    this.latencyMs = config.simulateLatency ?? 0;
    this.failureRate = config.failureRate ?? 0;

    if (config.metrics) {
      this.metrics = config.metrics;
    }
    if (config.alerts) {
      this.alerts = [...config.alerts];
    }
    if (config.rules) {
      this.rules = [...config.rules];
    }
    if (config.targets) {
      this.targets = [...config.targets];
    }
  }

  // ============ Provider Interface Methods ============

  async instantQuery(query: string, options?: InstantQueryOptions): Promise<QueryResult> {
    this.logCall('instantQuery', [query, options]);
    await this.simulateLatencyAndFailure();

    const time = options?.time ?? new Date();
    const samples: MetricSample[] = [];

    // Simple query matching - just return all metrics that contain the query string
    for (const [metricName, dataPoints] of this.metrics) {
      if (query.includes(metricName) || query === metricName) {
        for (const dp of dataPoints) {
          samples.push({
            metric: { __name__: metricName, ...dp.labels },
            value: dp.value,
            timestamp: time,
          });
        }
      }
    }

    return { resultType: 'vector', samples };
  }

  async rangeQuery(query: string, options: RangeQueryOptions): Promise<QueryResult> {
    this.logCall('rangeQuery', [query, options]);
    await this.simulateLatencyAndFailure();

    const series: MetricSeries[] = [];

    // Check metric series first
    for (const [metricName, seriesList] of this.metricSeries) {
      if (query.includes(metricName) || query === metricName) {
        for (const s of seriesList) {
          // Filter values within time range
          const filteredValues = s.values.filter(
            v => v.timestamp >= options.start && v.timestamp <= options.end
          );
          series.push({
            metric: { __name__: metricName, ...s.labels },
            values: filteredValues,
          });
        }
      }
    }

    // If no series, generate from instant metrics
    if (series.length === 0) {
      for (const [metricName, dataPoints] of this.metrics) {
        if (query.includes(metricName) || query === metricName) {
          for (const dp of dataPoints) {
            // Generate a single-point series
            series.push({
              metric: { __name__: metricName, ...dp.labels },
              values: [{ timestamp: options.start, value: dp.value }],
            });
          }
        }
      }
    }

    return { resultType: 'matrix', series };
  }

  async getMetricNames(options?: MetricNamesOptions): Promise<string[]> {
    this.logCall('getMetricNames', [options]);
    await this.simulateLatencyAndFailure();

    let names = Array.from(this.metrics.keys());

    if (options?.limit) {
      names = names.slice(0, options.limit);
    }

    return names;
  }

  async getLabelValues(labelName: string, options?: LabelValuesOptions): Promise<string[]> {
    this.logCall('getLabelValues', [labelName, options]);
    await this.simulateLatencyAndFailure();

    const values = new Set<string>();

    for (const dataPoints of this.metrics.values()) {
      for (const dp of dataPoints) {
        if (dp.labels[labelName]) {
          values.add(dp.labels[labelName]);
        }
      }
    }

    let result = Array.from(values);

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  async listAlerts(options?: AlertQuery): Promise<Alert[]> {
    this.logCall('listAlerts', [options]);
    await this.simulateLatencyAndFailure();

    let filtered = [...this.alerts];

    if (options?.state) {
      const states = Array.isArray(options.state) ? options.state : [options.state];
      filtered = filtered.filter(a => states.includes(a.state));
    }

    if (options?.severity) {
      const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
      filtered = filtered.filter(a => a.severity && severities.includes(a.severity));
    }

    if (options?.labels) {
      filtered = filtered.filter(a => {
        for (const [key, value] of Object.entries(options.labels!)) {
          if (a.labels[key] !== value) return false;
        }
        return true;
      });
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async getAlert(alertName: string): Promise<Alert> {
    this.logCall('getAlert', [alertName]);
    await this.simulateLatencyAndFailure();

    const alert = this.alerts.find(a => a.name === alertName);
    if (!alert) {
      throw new AlertNotFoundError(alertName, 'mock');
    }

    return alert;
  }

  async listAlertRules(options?: AlertRuleQuery): Promise<AlertRule[]> {
    this.logCall('listAlertRules', [options]);
    await this.simulateLatencyAndFailure();

    let filtered = [...this.rules];

    if (options?.group) {
      filtered = filtered.filter(r => r.group === options.group);
    }

    if (options?.state) {
      const states = Array.isArray(options.state) ? options.state : [options.state];
      filtered = filtered.filter(r => states.includes(r.state));
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async listTargets(options?: TargetQuery): Promise<Target[]> {
    this.logCall('listTargets', [options]);
    await this.simulateLatencyAndFailure();

    let filtered = [...this.targets];

    if (options?.job) {
      filtered = filtered.filter(t => t.job === options.job);
    }

    if (options?.health) {
      const healths = Array.isArray(options.health) ? options.health : [options.health];
      filtered = filtered.filter(t => healths.includes(t.health));
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async healthCheck(): Promise<HealthStatus> {
    this.logCall('healthCheck', []);
    const start = Date.now();

    try {
      await this.simulateLatencyAndFailure();
      return {
        healthy: true,
        message: 'Mock adapter is healthy',
        latencyMs: Date.now() - start,
        details: {
          metrics: this.metrics.size,
          alerts: this.alerts.length,
          rules: this.rules.length,
          targets: this.targets.length,
        },
      };
    } catch {
      return {
        healthy: false,
        message: 'Simulated failure',
        latencyMs: Date.now() - start,
      };
    }
  }

  // ============ Test Helper Methods ============

  /** Set a single metric value */
  setMetricValue(name: string, value: number, labels: Record<string, string> = {}): void {
    const existing = this.metrics.get(name) || [];
    existing.push({ labels, value, timestamp: new Date() });
    this.metrics.set(name, existing);
  }

  /** Set a metric time series */
  setMetricSeries(
    name: string,
    values: Array<{ timestamp: Date; value: number }>,
    labels: Record<string, string> = {}
  ): void {
    const existing = this.metricSeries.get(name) || [];
    existing.push({ labels, values });
    this.metricSeries.set(name, existing);
  }

  /** Clear all metrics */
  clearMetrics(): void {
    this.metrics.clear();
    this.metricSeries.clear();
  }

  /** Set alerts (replaces all) */
  setAlerts(alerts: Alert[]): void {
    this.alerts = [...alerts];
  }

  /** Add a single alert */
  addAlert(alert: Alert): void {
    this.alerts.push(alert);
  }

  /** Update alert state by fingerprint */
  updateAlertState(fingerprint: string, state: AlertState): void {
    const alert = this.alerts.find(a => a.fingerprint === fingerprint);
    if (alert) {
      alert.state = state;
    }
  }

  /** Clear all alerts */
  clearAlerts(): void {
    this.alerts = [];
  }

  /** Set alert rules (replaces all) */
  setAlertRules(rules: AlertRule[]): void {
    this.rules = [...rules];
  }

  /** Add a single alert rule */
  addAlertRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /** Clear all alert rules */
  clearAlertRules(): void {
    this.rules = [];
  }

  /** Set targets (replaces all) */
  setTargets(targets: Target[]): void {
    this.targets = [...targets];
  }

  /** Add a single target */
  addTarget(target: Target): void {
    this.targets.push(target);
  }

  /** Update target health by endpoint */
  setTargetHealth(endpoint: string, health: TargetHealth): void {
    const target = this.targets.find(t => t.endpoint === endpoint);
    if (target) {
      target.health = health;
    }
  }

  /** Clear all targets */
  clearTargets(): void {
    this.targets = [];
  }

  /** Set simulated latency */
  setLatency(ms: number): void {
    this.latencyMs = ms;
  }

  /** Set failure rate (0-100) */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(100, rate));
  }

  /** Get call log for verification */
  getCallLog(): MethodCall[] {
    return [...this.callLog];
  }

  /** Clear call log */
  clearCallLog(): void {
    this.callLog = [];
  }

  // ============ Private Helpers ============

  private logCall(method: string, args: unknown[]): void {
    this.callLog.push({ method, args, timestamp: new Date() });
  }

  private async simulateLatencyAndFailure(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }

    if (this.failureRate > 0 && Math.random() * 100 < this.failureRate) {
      throw new Error('Simulated failure');
    }
  }
}

export default MockObservabilityAdapter;
