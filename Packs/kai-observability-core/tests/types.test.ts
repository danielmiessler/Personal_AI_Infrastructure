import { describe, test, expect } from 'bun:test';
import type {
  MetricSample,
  MetricSeries,
  QueryResult,
  InstantQueryOptions,
  RangeQueryOptions,
  Alert,
  AlertRule,
  AlertState,
  AlertSeverity,
  Target,
  TargetHealth,
  HealthStatus,
} from '../src/index.ts';

describe('Metric Types', () => {
  test('MetricSample should have required fields', () => {
    const sample: MetricSample = {
      metric: { __name__: 'up', job: 'prometheus' },
      value: 1,
      timestamp: new Date(),
    };

    expect(sample.metric.__name__).toBe('up');
    expect(sample.value).toBe(1);
    expect(sample.timestamp).toBeInstanceOf(Date);
  });

  test('MetricSeries should have values array', () => {
    const series: MetricSeries = {
      metric: { __name__: 'cpu_usage', instance: 'localhost:9090' },
      values: [
        { timestamp: new Date('2026-01-01T00:00:00Z'), value: 0.5 },
        { timestamp: new Date('2026-01-01T00:01:00Z'), value: 0.6 },
      ],
    };

    expect(series.values).toHaveLength(2);
    expect(series.values[0].value).toBe(0.5);
  });

  test('QueryResult should support vector type', () => {
    const result: QueryResult = {
      resultType: 'vector',
      samples: [
        { metric: { __name__: 'up' }, value: 1, timestamp: new Date() },
      ],
    };

    expect(result.resultType).toBe('vector');
    expect(result.samples).toHaveLength(1);
  });

  test('QueryResult should support matrix type', () => {
    const result: QueryResult = {
      resultType: 'matrix',
      series: [
        {
          metric: { __name__: 'http_requests_total' },
          values: [{ timestamp: new Date(), value: 100 }],
        },
      ],
    };

    expect(result.resultType).toBe('matrix');
    expect(result.series).toHaveLength(1);
  });

  test('QueryResult should support scalar type', () => {
    const result: QueryResult = {
      resultType: 'scalar',
      scalarValue: 42,
    };

    expect(result.resultType).toBe('scalar');
    expect(result.scalarValue).toBe(42);
  });
});

describe('Query Options', () => {
  test('InstantQueryOptions should accept optional time', () => {
    const options: InstantQueryOptions = {
      time: new Date(),
      timeout: 30,
    };

    expect(options.time).toBeInstanceOf(Date);
    expect(options.timeout).toBe(30);
  });

  test('RangeQueryOptions should have required fields', () => {
    const options: RangeQueryOptions = {
      start: new Date('2026-01-01T00:00:00Z'),
      end: new Date('2026-01-01T01:00:00Z'),
      step: 60,
    };

    expect(options.start).toBeInstanceOf(Date);
    expect(options.end).toBeInstanceOf(Date);
    expect(options.step).toBe(60);
  });
});

describe('Alert Types', () => {
  test('AlertState should be valid enum value', () => {
    const states: AlertState[] = ['inactive', 'pending', 'firing'];
    expect(states).toContain('firing');
  });

  test('AlertSeverity should be valid enum value', () => {
    const severities: AlertSeverity[] = ['critical', 'warning', 'info'];
    expect(severities).toContain('critical');
  });

  test('Alert should have required fields', () => {
    const alert: Alert = {
      name: 'HighMemoryUsage',
      state: 'firing',
      severity: 'warning',
      labels: { instance: 'server1' },
      annotations: { summary: 'Memory is high' },
      activeAt: new Date(),
      fingerprint: 'abc123',
    };

    expect(alert.name).toBe('HighMemoryUsage');
    expect(alert.state).toBe('firing');
    expect(alert.fingerprint).toBe('abc123');
  });

  test('AlertRule should contain alerts array', () => {
    const rule: AlertRule = {
      name: 'HighMemory',
      group: 'infrastructure',
      query: 'node_memory_usage > 80',
      duration: 300,
      labels: { severity: 'warning' },
      annotations: { summary: 'Memory high' },
      state: 'firing',
      alerts: [
        {
          name: 'HighMemory',
          state: 'firing',
          labels: { instance: 'server1' },
          annotations: {},
          fingerprint: 'xyz789',
        },
      ],
    };

    expect(rule.alerts).toHaveLength(1);
    expect(rule.duration).toBe(300);
  });
});

describe('Target Types', () => {
  test('TargetHealth should be valid enum value', () => {
    const health: TargetHealth[] = ['up', 'down', 'unknown'];
    expect(health).toContain('up');
  });

  test('Target should have required fields', () => {
    const target: Target = {
      endpoint: 'http://localhost:9090/metrics',
      job: 'prometheus',
      instance: 'localhost:9090',
      health: 'up',
      labels: { __address__: 'localhost:9090' },
      lastScrape: new Date(),
      lastScrapeDuration: 0.05,
    };

    expect(target.health).toBe('up');
    expect(target.job).toBe('prometheus');
  });

  test('Target with down health should have lastError', () => {
    const target: Target = {
      endpoint: 'http://localhost:9091/metrics',
      job: 'node',
      instance: 'localhost:9091',
      health: 'down',
      labels: {},
      lastError: 'connection refused',
    };

    expect(target.health).toBe('down');
    expect(target.lastError).toBe('connection refused');
  });
});

describe('HealthStatus', () => {
  test('should represent healthy status', () => {
    const status: HealthStatus = {
      healthy: true,
      message: 'OK',
      latencyMs: 15,
    };

    expect(status.healthy).toBe(true);
    expect(status.latencyMs).toBe(15);
  });

  test('should represent unhealthy status with details', () => {
    const status: HealthStatus = {
      healthy: false,
      message: 'Connection refused',
      details: { error: 'ECONNREFUSED', host: 'prometheus:9090' },
    };

    expect(status.healthy).toBe(false);
    expect(status.details?.error).toBe('ECONNREFUSED');
  });
});
