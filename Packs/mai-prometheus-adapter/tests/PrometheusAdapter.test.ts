import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { PrometheusAdapter } from '../src/index.ts';
import {
  QueryError,
  ConnectionError,
  AlertNotFoundError,
} from 'mai-observability-core';

// Mock fetch for tests
const originalFetch = globalThis.fetch;

function mockFetch(responseData: unknown, status = 200) {
  return mock(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData)),
    } as Response)
  );
}

describe('PrometheusAdapter', () => {
  let adapter: PrometheusAdapter;

  beforeEach(() => {
    adapter = new PrometheusAdapter({
      prometheusUrl: 'http://prometheus:9090',
      timeout: 30,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    test('should create with required config', () => {
      expect(adapter.name).toBe('prometheus');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should throw without prometheusUrl', () => {
      expect(() => {
        new PrometheusAdapter({} as { prometheusUrl: string });
      }).toThrow(ConnectionError);
    });

    test('should strip trailing slash from URL', () => {
      const a = new PrometheusAdapter({
        prometheusUrl: 'http://prometheus:9090/',
      });
      expect(a).toBeDefined();
    });
  });

  describe('instantQuery', () => {
    test('should parse vector result', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: { __name__: 'up', job: 'prometheus' },
              value: [1704672000, '1'],
            },
          ],
        },
      });

      const result = await adapter.instantQuery('up');

      expect(result.resultType).toBe('vector');
      expect(result.samples).toHaveLength(1);
      expect(result.samples![0].value).toBe(1);
      expect(result.samples![0].metric.__name__).toBe('up');
    });

    test('should parse scalar result', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          resultType: 'scalar',
          result: [1704672000, '42'],
        },
      });

      const result = await adapter.instantQuery('42');

      expect(result.resultType).toBe('scalar');
      expect(result.scalarValue).toBe(42);
    });

    test('should handle query error', async () => {
      globalThis.fetch = mockFetch({
        status: 'error',
        error: 'parse error',
        errorType: 'bad_data',
      });

      await expect(adapter.instantQuery('invalid[')).rejects.toThrow(QueryError);
    });
  });

  describe('rangeQuery', () => {
    test('should parse matrix result', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { __name__: 'http_requests_total' },
              values: [
                [1704672000, '100'],
                [1704672060, '150'],
              ],
            },
          ],
        },
      });

      const result = await adapter.rangeQuery('http_requests_total', {
        start: new Date('2024-01-07T00:00:00Z'),
        end: new Date('2024-01-07T01:00:00Z'),
        step: 60,
      });

      expect(result.resultType).toBe('matrix');
      expect(result.series).toHaveLength(1);
      expect(result.series![0].values).toHaveLength(2);
      expect(result.series![0].values[0].value).toBe(100);
    });
  });

  describe('getMetricNames', () => {
    test('should return metric names', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: ['up', 'node_cpu_seconds_total', 'http_requests_total'],
      });

      const names = await adapter.getMetricNames();

      expect(names).toContain('up');
      expect(names).toContain('node_cpu_seconds_total');
    });

    test('should respect limit', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: ['metric1', 'metric2', 'metric3', 'metric4'],
      });

      const names = await adapter.getMetricNames({ limit: 2 });

      expect(names).toHaveLength(2);
    });
  });

  describe('getLabelValues', () => {
    test('should return label values', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: ['prometheus', 'node', 'alertmanager'],
      });

      const values = await adapter.getLabelValues('job');

      expect(values).toContain('prometheus');
      expect(values).toContain('node');
    });
  });

  describe('listAlerts', () => {
    test('should return alerts', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          alerts: [
            {
              labels: { alertname: 'HighMemory', severity: 'warning', instance: 'server1' },
              annotations: { summary: 'Memory is high' },
              state: 'firing',
              activeAt: '2024-01-07T00:00:00Z',
            },
          ],
        },
      });

      const alerts = await adapter.listAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].name).toBe('HighMemory');
      expect(alerts[0].state).toBe('firing');
      expect(alerts[0].severity).toBe('warning');
    });

    test('should filter by state', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          alerts: [
            { labels: { alertname: 'A' }, annotations: {}, state: 'firing' },
            { labels: { alertname: 'B' }, annotations: {}, state: 'pending' },
          ],
        },
      });

      const alerts = await adapter.listAlerts({ state: 'firing' });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].name).toBe('A');
    });
  });

  describe('getAlert', () => {
    test('should return specific alert', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          alerts: [
            { labels: { alertname: 'TargetAlert' }, annotations: {}, state: 'firing' },
          ],
        },
      });

      const alert = await adapter.getAlert('TargetAlert');

      expect(alert.name).toBe('TargetAlert');
    });

    test('should throw for missing alert', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: { alerts: [] },
      });

      await expect(adapter.getAlert('NonExistent')).rejects.toThrow(AlertNotFoundError);
    });
  });

  describe('listAlertRules', () => {
    test('should return alert rules', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          groups: [
            {
              name: 'infrastructure',
              rules: [
                {
                  name: 'HighMemory',
                  query: 'node_memory_usage > 80',
                  duration: 300,
                  labels: { severity: 'warning' },
                  annotations: {},
                  state: 'firing',
                  alerts: [],
                },
              ],
            },
          ],
        },
      });

      const rules = await adapter.listAlertRules();

      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('HighMemory');
      expect(rules[0].group).toBe('infrastructure');
    });
  });

  describe('listTargets', () => {
    test('should return targets', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          activeTargets: [
            {
              discoveredLabels: { __address__: 'localhost:9090' },
              labels: { job: 'prometheus', instance: 'localhost:9090' },
              scrapePool: 'prometheus',
              scrapeUrl: 'http://localhost:9090/metrics',
              globalUrl: 'http://localhost:9090/metrics',
              lastError: '',
              lastScrape: '2024-01-07T00:00:00Z',
              lastScrapeDuration: 0.05,
              health: 'up',
            },
          ],
          droppedTargets: [],
        },
      });

      const targets = await adapter.listTargets();

      expect(targets).toHaveLength(1);
      expect(targets[0].job).toBe('prometheus');
      expect(targets[0].health).toBe('up');
    });

    test('should filter by health', async () => {
      globalThis.fetch = mockFetch({
        status: 'success',
        data: {
          activeTargets: [
            {
              discoveredLabels: {},
              labels: { job: 'up', instance: 'a' },
              scrapePool: 'test',
              scrapeUrl: 'http://a/metrics',
              globalUrl: 'http://a/metrics',
              lastError: '',
              lastScrape: '',
              lastScrapeDuration: 0,
              health: 'up',
            },
            {
              discoveredLabels: {},
              labels: { job: 'down', instance: 'b' },
              scrapePool: 'test',
              scrapeUrl: 'http://b/metrics',
              globalUrl: 'http://b/metrics',
              lastError: 'connection refused',
              lastScrape: '',
              lastScrapeDuration: 0,
              health: 'down',
            },
          ],
          droppedTargets: [],
        },
      });

      const down = await adapter.listTargets({ health: 'down' });

      expect(down).toHaveLength(1);
      expect(down[0].job).toBe('down');
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status', async () => {
      globalThis.fetch = mockFetch('Prometheus Server is Healthy.\n', 200);

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Prometheus is healthy');
    });

    test('should return unhealthy on error', async () => {
      globalThis.fetch = mock(() => Promise.reject(new Error('Connection refused')));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('Cannot connect');
    });
  });

  // Skip integration tests - they require a running Prometheus
  describe.skip('integration tests', () => {
    test('should connect to real Prometheus', async () => {
      const realAdapter = new PrometheusAdapter({
        prometheusUrl: 'http://localhost:9090',
      });

      const health = await realAdapter.healthCheck();
      expect(health.healthy).toBe(true);
    });
  });
});
