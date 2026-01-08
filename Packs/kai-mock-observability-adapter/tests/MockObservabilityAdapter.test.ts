import { describe, test, expect, beforeEach } from 'bun:test';
import { MockObservabilityAdapter } from '../src/index.ts';
import {
  AlertNotFoundError,
  type Alert,
  type AlertRule,
  type Target,
} from 'kai-observability-core';

describe('MockObservabilityAdapter', () => {
  let adapter: MockObservabilityAdapter;

  beforeEach(() => {
    adapter = new MockObservabilityAdapter();
  });

  describe('constructor', () => {
    test('should create with default config', () => {
      expect(adapter.name).toBe('mock');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should create with initial data', () => {
      const alert: Alert = {
        name: 'TestAlert',
        state: 'firing',
        labels: {},
        annotations: {},
        fingerprint: 'test123',
      };

      adapter = new MockObservabilityAdapter({ alerts: [alert] });
      expect(adapter.getCallLog()).toHaveLength(0);
    });

    test('should accept latency config', () => {
      adapter = new MockObservabilityAdapter({ simulateLatency: 100 });
      expect(adapter).toBeDefined();
    });
  });

  describe('Metric operations', () => {
    test('should return empty result for no metrics', async () => {
      const result = await adapter.instantQuery('up');
      expect(result.resultType).toBe('vector');
      expect(result.samples).toHaveLength(0);
    });

    test('should query instant metrics', async () => {
      adapter.setMetricValue('up', 1, { job: 'prometheus' });

      const result = await adapter.instantQuery('up');
      expect(result.samples).toHaveLength(1);
      expect(result.samples![0].value).toBe(1);
      expect(result.samples![0].metric.job).toBe('prometheus');
    });

    test('should query range metrics', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 3600000);

      adapter.setMetricSeries('cpu_usage', [
        { timestamp: start, value: 0.5 },
        { timestamp: now, value: 0.7 },
      ], { instance: 'server1' });

      const result = await adapter.rangeQuery('cpu_usage', {
        start,
        end: now,
        step: 60,
      });

      expect(result.resultType).toBe('matrix');
      expect(result.series).toHaveLength(1);
      expect(result.series![0].values).toHaveLength(2);
    });

    test('should get metric names', async () => {
      adapter.setMetricValue('up', 1);
      adapter.setMetricValue('node_cpu', 0.5);

      const names = await adapter.getMetricNames();
      expect(names).toContain('up');
      expect(names).toContain('node_cpu');
    });

    test('should limit metric names', async () => {
      adapter.setMetricValue('metric1', 1);
      adapter.setMetricValue('metric2', 2);
      adapter.setMetricValue('metric3', 3);

      const names = await adapter.getMetricNames({ limit: 2 });
      expect(names).toHaveLength(2);
    });

    test('should get label values', async () => {
      adapter.setMetricValue('up', 1, { job: 'prometheus' });
      adapter.setMetricValue('up', 1, { job: 'node' });

      const values = await adapter.getLabelValues('job');
      expect(values).toContain('prometheus');
      expect(values).toContain('node');
    });

    test('should clear metrics', async () => {
      adapter.setMetricValue('up', 1);
      adapter.clearMetrics();

      const names = await adapter.getMetricNames();
      expect(names).toHaveLength(0);
    });
  });

  describe('Alert operations', () => {
    const testAlert: Alert = {
      name: 'HighMemory',
      state: 'firing',
      severity: 'warning',
      labels: { instance: 'server1' },
      annotations: { summary: 'Memory is high' },
      fingerprint: 'abc123',
    };

    test('should list empty alerts', async () => {
      const alerts = await adapter.listAlerts();
      expect(alerts).toHaveLength(0);
    });

    test('should add and list alerts', async () => {
      adapter.addAlert(testAlert);

      const alerts = await adapter.listAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].name).toBe('HighMemory');
    });

    test('should filter alerts by state', async () => {
      adapter.addAlert(testAlert);
      adapter.addAlert({ ...testAlert, name: 'Other', state: 'pending', fingerprint: 'def456' });

      const firing = await adapter.listAlerts({ state: 'firing' });
      expect(firing).toHaveLength(1);
      expect(firing[0].name).toBe('HighMemory');
    });

    test('should filter alerts by severity', async () => {
      adapter.addAlert(testAlert);
      adapter.addAlert({ ...testAlert, name: 'Critical', severity: 'critical', fingerprint: 'ghi789' });

      const warnings = await adapter.listAlerts({ severity: 'warning' });
      expect(warnings).toHaveLength(1);
      expect(warnings[0].name).toBe('HighMemory');
    });

    test('should filter alerts by labels', async () => {
      adapter.addAlert(testAlert);
      adapter.addAlert({ ...testAlert, name: 'Other', labels: { instance: 'server2' }, fingerprint: 'xyz' });

      const filtered = await adapter.listAlerts({ labels: { instance: 'server1' } });
      expect(filtered).toHaveLength(1);
    });

    test('should get alert by name', async () => {
      adapter.addAlert(testAlert);

      const alert = await adapter.getAlert('HighMemory');
      expect(alert.fingerprint).toBe('abc123');
    });

    test('should throw for missing alert', async () => {
      await expect(adapter.getAlert('NonExistent')).rejects.toThrow(AlertNotFoundError);
    });

    test('should update alert state', async () => {
      adapter.addAlert(testAlert);
      adapter.updateAlertState('abc123', 'inactive');

      const alerts = await adapter.listAlerts();
      expect(alerts[0].state).toBe('inactive');
    });

    test('should clear alerts', async () => {
      adapter.addAlert(testAlert);
      adapter.clearAlerts();

      const alerts = await adapter.listAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Alert rule operations', () => {
    const testRule: AlertRule = {
      name: 'HighMemory',
      group: 'infrastructure',
      query: 'node_memory_usage > 80',
      duration: 300,
      labels: { severity: 'warning' },
      annotations: {},
      state: 'firing',
      alerts: [],
    };

    test('should list empty rules', async () => {
      const rules = await adapter.listAlertRules();
      expect(rules).toHaveLength(0);
    });

    test('should add and list rules', async () => {
      adapter.addAlertRule(testRule);

      const rules = await adapter.listAlertRules();
      expect(rules).toHaveLength(1);
    });

    test('should filter rules by group', async () => {
      adapter.addAlertRule(testRule);
      adapter.addAlertRule({ ...testRule, name: 'Other', group: 'application' });

      const filtered = await adapter.listAlertRules({ group: 'infrastructure' });
      expect(filtered).toHaveLength(1);
    });

    test('should filter rules by state', async () => {
      adapter.addAlertRule(testRule);
      adapter.addAlertRule({ ...testRule, name: 'Inactive', state: 'inactive' });

      const firing = await adapter.listAlertRules({ state: 'firing' });
      expect(firing).toHaveLength(1);
    });

    test('should clear rules', async () => {
      adapter.addAlertRule(testRule);
      adapter.clearAlertRules();

      const rules = await adapter.listAlertRules();
      expect(rules).toHaveLength(0);
    });
  });

  describe('Target operations', () => {
    const testTarget: Target = {
      endpoint: 'http://localhost:9090/metrics',
      job: 'prometheus',
      instance: 'localhost:9090',
      health: 'up',
      labels: {},
    };

    test('should list empty targets', async () => {
      const targets = await adapter.listTargets();
      expect(targets).toHaveLength(0);
    });

    test('should add and list targets', async () => {
      adapter.addTarget(testTarget);

      const targets = await adapter.listTargets();
      expect(targets).toHaveLength(1);
    });

    test('should filter targets by job', async () => {
      adapter.addTarget(testTarget);
      adapter.addTarget({ ...testTarget, job: 'node', endpoint: 'http://localhost:9100/metrics' });

      const filtered = await adapter.listTargets({ job: 'prometheus' });
      expect(filtered).toHaveLength(1);
    });

    test('should filter targets by health', async () => {
      adapter.addTarget(testTarget);
      adapter.addTarget({ ...testTarget, endpoint: 'http://down:9090/metrics', health: 'down' });

      const up = await adapter.listTargets({ health: 'up' });
      expect(up).toHaveLength(1);
    });

    test('should update target health', async () => {
      adapter.addTarget(testTarget);
      adapter.setTargetHealth('http://localhost:9090/metrics', 'down');

      const targets = await adapter.listTargets();
      expect(targets[0].health).toBe('down');
    });

    test('should clear targets', async () => {
      adapter.addTarget(testTarget);
      adapter.clearTargets();

      const targets = await adapter.listTargets();
      expect(targets).toHaveLength(0);
    });
  });

  describe('Health check', () => {
    test('should return healthy status', async () => {
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Mock adapter is healthy');
    });

    test('should include stats in details', async () => {
      adapter.setMetricValue('up', 1);
      adapter.addAlert({
        name: 'Test',
        state: 'firing',
        labels: {},
        annotations: {},
        fingerprint: 'test',
      });

      const health = await adapter.healthCheck();

      expect(health.details?.metrics).toBe(1);
      expect(health.details?.alerts).toBe(1);
    });
  });

  describe('Call logging', () => {
    test('should log method calls', async () => {
      await adapter.instantQuery('up');
      await adapter.listAlerts();

      const calls = adapter.getCallLog();
      expect(calls).toHaveLength(2);
      expect(calls[0].method).toBe('instantQuery');
      expect(calls[1].method).toBe('listAlerts');
    });

    test('should include args in log', async () => {
      await adapter.instantQuery('up', { timeout: 30 });

      const calls = adapter.getCallLog();
      expect(calls[0].args[0]).toBe('up');
      expect(calls[0].args[1]).toEqual({ timeout: 30 });
    });

    test('should clear call log', async () => {
      await adapter.instantQuery('up');
      adapter.clearCallLog();

      expect(adapter.getCallLog()).toHaveLength(0);
    });
  });

  describe('Failure simulation', () => {
    test('should simulate failures based on rate', async () => {
      adapter.setFailureRate(100);

      await expect(adapter.instantQuery('up')).rejects.toThrow('Simulated failure');
    });

    test('should not fail when rate is 0', async () => {
      adapter.setFailureRate(0);

      await expect(adapter.instantQuery('up')).resolves.toBeDefined();
    });
  });

  describe('Latency simulation', () => {
    test('should simulate latency', async () => {
      adapter.setLatency(50);

      const start = Date.now();
      await adapter.instantQuery('up');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });
});
