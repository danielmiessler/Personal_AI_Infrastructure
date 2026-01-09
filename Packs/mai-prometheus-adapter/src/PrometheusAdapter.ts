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
  AlertSeverity,
  Target,
  TargetQuery,
  TargetHealth,
  HealthStatus,
} from 'mai-observability-core';

import {
  QueryError,
  QueryTimeoutError,
  AlertNotFoundError,
  ConnectionError,
  AuthenticationError,
  withRetry,
} from 'mai-observability-core';

/**
 * Configuration for PrometheusAdapter
 */
export interface PrometheusConfig {
  /** Prometheus server URL */
  prometheusUrl: string;
  /** Alertmanager server URL (optional) */
  alertmanagerUrl?: string;
  /** Query timeout in seconds (default: 30) */
  timeout?: number;
  /** Authentication config */
  auth?: {
    type: 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Prometheus HTTP API response types
 */
interface PrometheusResponse<T> {
  status: 'success' | 'error';
  data: T;
  errorType?: string;
  error?: string;
}

interface PrometheusQueryResult {
  resultType: 'vector' | 'matrix' | 'scalar' | 'string';
  result: PrometheusVector[] | PrometheusMatrix[] | [number, string];
}

interface PrometheusVector {
  metric: Record<string, string>;
  value: [number, string]; // [timestamp, value]
}

interface PrometheusMatrix {
  metric: Record<string, string>;
  values: [number, string][]; // [[timestamp, value], ...]
}

interface PrometheusAlert {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: string;
  activeAt?: string;
  value?: string;
}

interface PrometheusRule {
  name: string;
  query: string;
  duration: number;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  state: string;
  alerts: PrometheusAlert[];
  lastEvaluation?: string;
  evaluationTime?: number;
}

interface PrometheusRuleGroup {
  name: string;
  rules: PrometheusRule[];
}

interface PrometheusTarget {
  discoveredLabels: Record<string, string>;
  labels: Record<string, string>;
  scrapePool: string;
  scrapeUrl: string;
  globalUrl: string;
  lastError: string;
  lastScrape: string;
  lastScrapeDuration: number;
  health: string;
}

interface PrometheusTargets {
  activeTargets: PrometheusTarget[];
  droppedTargets: unknown[];
}

/**
 * Prometheus adapter for observability
 */
export class PrometheusAdapter implements ObservabilityProvider {
  readonly name = 'prometheus';
  readonly version = '1.0.0';

  private readonly prometheusUrl: string;
  private readonly alertmanagerUrl?: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(config: PrometheusConfig) {
    if (!config.prometheusUrl) {
      throw new ConnectionError('prometheusUrl is required', 'prometheus');
    }

    this.prometheusUrl = config.prometheusUrl.replace(/\/$/, '');
    this.alertmanagerUrl = config.alertmanagerUrl?.replace(/\/$/, '');
    this.timeout = config.timeout ?? 30;
    this.headers = this.buildHeaders(config.auth);
  }

  private buildHeaders(auth?: PrometheusConfig['auth']): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (auth?.type === 'bearer' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth?.type === 'basic' && auth.username && auth.password) {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      headers['Authorization'] = `Basic ${encoded}`;
    }

    return headers;
  }

  async instantQuery(query: string, options?: InstantQueryOptions): Promise<QueryResult> {
    const params = new URLSearchParams({ query });

    if (options?.time) {
      params.set('time', (options.time.getTime() / 1000).toString());
    }

    if (options?.timeout ?? this.timeout) {
      params.set('timeout', `${options?.timeout ?? this.timeout}s`);
    }

    const response = await this.fetchPrometheus<PrometheusQueryResult>(
      `/api/v1/query?${params}`
    );

    return this.parseQueryResult(response);
  }

  async rangeQuery(query: string, options: RangeQueryOptions): Promise<QueryResult> {
    const params = new URLSearchParams({
      query,
      start: (options.start.getTime() / 1000).toString(),
      end: (options.end.getTime() / 1000).toString(),
      step: options.step.toString(),
    });

    if (options.timeout ?? this.timeout) {
      params.set('timeout', `${options.timeout ?? this.timeout}s`);
    }

    const response = await this.fetchPrometheus<PrometheusQueryResult>(
      `/api/v1/query_range?${params}`
    );

    return this.parseQueryResult(response);
  }

  async getMetricNames(options?: MetricNamesOptions): Promise<string[]> {
    const params = new URLSearchParams();

    if (options?.match) {
      for (const m of options.match) {
        params.append('match[]', m);
      }
    }

    if (options?.start) {
      params.set('start', (options.start.getTime() / 1000).toString());
    }

    if (options?.end) {
      params.set('end', (options.end.getTime() / 1000).toString());
    }

    const query = params.toString() ? `?${params}` : '';
    const names = await this.fetchPrometheus<string[]>(
      `/api/v1/label/__name__/values${query}`
    );

    if (options?.limit) {
      return names.slice(0, options.limit);
    }

    return names;
  }

  async getLabelValues(labelName: string, options?: LabelValuesOptions): Promise<string[]> {
    const params = new URLSearchParams();

    if (options?.match) {
      for (const m of options.match) {
        params.append('match[]', m);
      }
    }

    if (options?.start) {
      params.set('start', (options.start.getTime() / 1000).toString());
    }

    if (options?.end) {
      params.set('end', (options.end.getTime() / 1000).toString());
    }

    const query = params.toString() ? `?${params}` : '';
    const values = await this.fetchPrometheus<string[]>(
      `/api/v1/label/${encodeURIComponent(labelName)}/values${query}`
    );

    if (options?.limit) {
      return values.slice(0, options.limit);
    }

    return values;
  }

  async listAlerts(options?: AlertQuery): Promise<Alert[]> {
    const response = await this.fetchPrometheus<{ alerts: PrometheusAlert[] }>(
      '/api/v1/alerts'
    );

    let alerts = response.alerts.map(a => this.parseAlert(a));

    if (options?.state) {
      const states = Array.isArray(options.state) ? options.state : [options.state];
      alerts = alerts.filter(a => states.includes(a.state));
    }

    if (options?.severity) {
      const severities = Array.isArray(options.severity) ? options.severity : [options.severity];
      alerts = alerts.filter(a => a.severity && severities.includes(a.severity));
    }

    if (options?.labels) {
      alerts = alerts.filter(a => {
        for (const [key, value] of Object.entries(options.labels!)) {
          if (a.labels[key] !== value) return false;
        }
        return true;
      });
    }

    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  async getAlert(alertName: string): Promise<Alert> {
    const alerts = await this.listAlerts();
    const alert = alerts.find(a => a.name === alertName);

    if (!alert) {
      throw new AlertNotFoundError(alertName, 'prometheus');
    }

    return alert;
  }

  async listAlertRules(options?: AlertRuleQuery): Promise<AlertRule[]> {
    const response = await this.fetchPrometheus<{ groups: PrometheusRuleGroup[] }>(
      '/api/v1/rules'
    );

    let rules: AlertRule[] = [];

    for (const group of response.groups) {
      for (const rule of group.rules) {
        if (rule.name) { // Skip recording rules
          rules.push(this.parseRule(rule, group.name));
        }
      }
    }

    if (options?.group) {
      rules = rules.filter(r => r.group === options.group);
    }

    if (options?.state) {
      const states = Array.isArray(options.state) ? options.state : [options.state];
      rules = rules.filter(r => states.includes(r.state));
    }

    if (options?.limit) {
      rules = rules.slice(0, options.limit);
    }

    return rules;
  }

  async listTargets(options?: TargetQuery): Promise<Target[]> {
    const response = await this.fetchPrometheus<PrometheusTargets>(
      '/api/v1/targets'
    );

    let targets = response.activeTargets.map(t => this.parseTarget(t));

    if (options?.job) {
      targets = targets.filter(t => t.job === options.job);
    }

    if (options?.health) {
      const healths = Array.isArray(options.health) ? options.health : [options.health];
      targets = targets.filter(t => healths.includes(t.health));
    }

    if (options?.limit) {
      targets = targets.slice(0, options.limit);
    }

    return targets;
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();

    try {
      const response = await fetch(`${this.prometheusUrl}/-/healthy`, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          healthy: true,
          message: 'Prometheus is healthy',
          latencyMs,
          details: { url: this.prometheusUrl },
        };
      }

      return {
        healthy: false,
        message: `Prometheus returned ${response.status}`,
        latencyMs,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Cannot connect to Prometheus: ${(error as Error).message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  // ============ Private Helpers ============

  private async fetchPrometheus<T>(path: string): Promise<T> {
    return withRetry(async () => {
      const url = `${this.prometheusUrl}${path}`;

      let response: Response;
      try {
        response = await fetch(url, {
          headers: this.headers,
          signal: AbortSignal.timeout(this.timeout * 1000),
        });
      } catch (error) {
        if ((error as Error).name === 'TimeoutError') {
          throw new QueryTimeoutError(this.timeout, 'prometheus');
        }
        throw new ConnectionError(`Failed to connect to Prometheus: ${(error as Error).message}`, 'prometheus');
      }

      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError('Prometheus authentication failed', 'prometheus');
      }

      if (!response.ok) {
        const text = await response.text();
        throw new QueryError(`Prometheus error: ${response.status} - ${text}`, 'prometheus');
      }

      const data = await response.json() as PrometheusResponse<T>;

      if (data.status === 'error') {
        throw new QueryError(`Prometheus query error: ${data.error}`, 'prometheus');
      }

      return data.data;
    }, {
      maxRetries: 2,
      retryableErrors: ['503', '502', '504', 'ECONNRESET', 'ETIMEDOUT'],
    });
  }

  private parseQueryResult(result: PrometheusQueryResult): QueryResult {
    switch (result.resultType) {
      case 'vector':
        return {
          resultType: 'vector',
          samples: (result.result as PrometheusVector[]).map(v => ({
            metric: v.metric,
            value: parseFloat(v.value[1]),
            timestamp: new Date(v.value[0] * 1000),
          })),
        };

      case 'matrix':
        return {
          resultType: 'matrix',
          series: (result.result as PrometheusMatrix[]).map(m => ({
            metric: m.metric,
            values: m.values.map(([ts, val]) => ({
              timestamp: new Date(ts * 1000),
              value: parseFloat(val),
            })),
          })),
        };

      case 'scalar':
        const [ts, val] = result.result as [number, string];
        return {
          resultType: 'scalar',
          scalarValue: parseFloat(val),
          samples: [{
            metric: {},
            value: parseFloat(val),
            timestamp: new Date(ts * 1000),
          }],
        };

      case 'string':
        const [, strVal] = result.result as [number, string];
        return {
          resultType: 'string',
          stringValue: strVal,
        };

      default:
        throw new QueryError(`Unknown result type: ${result.resultType}`, 'prometheus');
    }
  }

  private parseAlert(alert: PrometheusAlert): Alert {
    const name = alert.labels.alertname || 'unknown';
    const severity = this.parseSeverity(alert.labels.severity);

    return {
      name,
      state: this.parseAlertState(alert.state),
      severity,
      labels: alert.labels,
      annotations: alert.annotations,
      activeAt: alert.activeAt ? new Date(alert.activeAt) : undefined,
      value: alert.value ? parseFloat(alert.value) : undefined,
      fingerprint: this.generateFingerprint(alert.labels),
    };
  }

  private parseRule(rule: PrometheusRule, group: string): AlertRule {
    return {
      name: rule.name,
      group,
      query: rule.query,
      duration: rule.duration,
      labels: rule.labels,
      annotations: rule.annotations,
      state: this.parseAlertState(rule.state),
      alerts: rule.alerts.map(a => this.parseAlert(a)),
      lastEvaluation: rule.lastEvaluation ? new Date(rule.lastEvaluation) : undefined,
      evaluationTime: rule.evaluationTime,
    };
  }

  private parseTarget(target: PrometheusTarget): Target {
    return {
      endpoint: target.scrapeUrl,
      job: target.labels.job || target.discoveredLabels.__meta_consul_service || 'unknown',
      instance: target.labels.instance || target.discoveredLabels.__address__ || 'unknown',
      health: this.parseTargetHealth(target.health),
      labels: target.labels,
      lastScrape: target.lastScrape ? new Date(target.lastScrape) : undefined,
      lastScrapeDuration: target.lastScrapeDuration,
      lastError: target.lastError || undefined,
    };
  }

  private parseAlertState(state: string): AlertState {
    switch (state.toLowerCase()) {
      case 'firing':
        return 'firing';
      case 'pending':
        return 'pending';
      default:
        return 'inactive';
    }
  }

  private parseSeverity(severity?: string): AlertSeverity | undefined {
    if (!severity) return undefined;
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return undefined;
    }
  }

  private parseTargetHealth(health: string): TargetHealth {
    switch (health.toLowerCase()) {
      case 'up':
        return 'up';
      case 'down':
        return 'down';
      default:
        return 'unknown';
    }
  }

  private generateFingerprint(labels: Record<string, string>): string {
    // Simple hash of sorted label key-value pairs
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    const str = sorted.map(([k, v]) => `${k}=${v}`).join(',');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export default PrometheusAdapter;
