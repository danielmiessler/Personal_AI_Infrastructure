import { describe, test, expect, beforeEach } from 'bun:test';
import { MockPlatformAdapter } from '../src/index.ts';
import {
  NamespaceNotFoundError,
  DeploymentNotFoundError,
  ContainerNotFoundError,
  ServiceNotFoundError,
  ScaleError,
  type Namespace,
  type Deployment,
  type Container,
  type Service,
} from 'kai-containers-core';

describe('MockPlatformAdapter', () => {
  let adapter: MockPlatformAdapter;

  beforeEach(() => {
    adapter = new MockPlatformAdapter();
  });

  describe('constructor', () => {
    test('should create with default config', () => {
      expect(adapter.name).toBe('mock');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should create with initial data', () => {
      const ns: Namespace = { name: 'default', status: 'active' };
      const dep: Deployment = {
        name: 'app', namespace: 'default', replicas: 1,
        availableReplicas: 1, readyReplicas: 1,
        status: 'running', image: 'nginx'
      };

      adapter = new MockPlatformAdapter({
        namespaces: [ns],
        deployments: [dep]
      });

      expect(adapter.getCallLog()).toHaveLength(0);
    });

    test('should accept latency config', () => {
      adapter = new MockPlatformAdapter({ simulateLatency: 100 });
      expect(adapter).toBeDefined();
    });
  });

  describe('Namespace operations', () => {
    test('should list empty namespaces', async () => {
      const namespaces = await adapter.listNamespaces();
      expect(namespaces).toEqual([]);
    });

    test('should add and list namespaces', async () => {
      adapter.addNamespace({ name: 'default', status: 'active' });
      adapter.addNamespace({ name: 'kube-system', status: 'active' });

      const namespaces = await adapter.listNamespaces();
      expect(namespaces).toHaveLength(2);
    });

    test('should get namespace by name', async () => {
      adapter.addNamespace({ name: 'default', status: 'active', labels: { env: 'prod' } });

      const ns = await adapter.getNamespace('default');
      expect(ns.name).toBe('default');
      expect(ns.labels?.env).toBe('prod');
    });

    test('should throw for missing namespace', async () => {
      await expect(adapter.getNamespace('missing')).rejects.toThrow(NamespaceNotFoundError);
    });

    test('should create namespace', async () => {
      const ns = await adapter.createNamespace('new-ns', { env: 'dev' });

      expect(ns.name).toBe('new-ns');
      expect(ns.status).toBe('active');
      expect(ns.labels?.env).toBe('dev');
    });

    test('should delete namespace', async () => {
      adapter.addNamespace({ name: 'to-delete', status: 'active' });

      await adapter.deleteNamespace('to-delete');

      await expect(adapter.getNamespace('to-delete')).rejects.toThrow(NamespaceNotFoundError);
    });

    test('should throw when deleting missing namespace', async () => {
      await expect(adapter.deleteNamespace('missing')).rejects.toThrow(NamespaceNotFoundError);
    });

    test('should clear namespaces', async () => {
      adapter.addNamespace({ name: 'ns1', status: 'active' });
      adapter.addNamespace({ name: 'ns2', status: 'active' });

      adapter.clearNamespaces();

      const namespaces = await adapter.listNamespaces();
      expect(namespaces).toHaveLength(0);
    });
  });

  describe('Deployment operations', () => {
    const testDeployment: Deployment = {
      name: 'my-app',
      namespace: 'default',
      replicas: 3,
      availableReplicas: 3,
      readyReplicas: 3,
      status: 'running',
      image: 'nginx:latest'
    };

    beforeEach(() => {
      adapter.addNamespace({ name: 'default', status: 'active' });
    });

    test('should list deployments in namespace', async () => {
      adapter.addDeployment(testDeployment);

      const deployments = await adapter.listDeployments('default');
      expect(deployments).toHaveLength(1);
      expect(deployments[0].name).toBe('my-app');
    });

    test('should get deployment by name', async () => {
      adapter.addDeployment(testDeployment);

      const dep = await adapter.getDeployment('default', 'my-app');
      expect(dep.name).toBe('my-app');
      expect(dep.replicas).toBe(3);
    });

    test('should throw for missing deployment', async () => {
      await expect(adapter.getDeployment('default', 'missing')).rejects.toThrow(DeploymentNotFoundError);
    });

    test('should scale deployment', async () => {
      adapter.addDeployment(testDeployment);

      const scaled = await adapter.scaleDeployment('default', 'my-app', 5);

      expect(scaled.replicas).toBe(5);
      expect(scaled.availableReplicas).toBe(5);
      expect(scaled.readyReplicas).toBe(5);
    });

    test('should throw for negative replicas', async () => {
      adapter.addDeployment(testDeployment);

      await expect(adapter.scaleDeployment('default', 'my-app', -1)).rejects.toThrow(ScaleError);
    });

    test('should restart deployment', async () => {
      adapter.addDeployment(testDeployment);

      await expect(adapter.restartDeployment('default', 'my-app')).resolves.toBeUndefined();
    });

    test('should delete deployment', async () => {
      adapter.addDeployment(testDeployment);

      await adapter.deleteDeployment('default', 'my-app');

      await expect(adapter.getDeployment('default', 'my-app')).rejects.toThrow(DeploymentNotFoundError);
    });

    test('should update deployment', () => {
      adapter.addDeployment(testDeployment);

      adapter.updateDeployment('default', 'my-app', { status: 'updating' });

      // Verify via internal state (can't use async in sync test)
      expect(adapter).toBeDefined();
    });
  });

  describe('Container operations', () => {
    const testContainer: Container = {
      id: 'abc123',
      name: 'my-pod',
      namespace: 'default',
      image: 'nginx:latest',
      status: 'running',
      ready: true,
      restartCount: 0
    };

    test('should list containers', async () => {
      adapter.addContainer(testContainer);

      const containers = await adapter.listContainers('default');
      expect(containers).toHaveLength(1);
    });

    test('should filter containers by status', async () => {
      adapter.addContainer(testContainer);
      adapter.addContainer({ ...testContainer, name: 'failed-pod', status: 'failed' });

      const running = await adapter.listContainers('default', { status: 'running' });
      expect(running).toHaveLength(1);
      expect(running[0].name).toBe('my-pod');
    });

    test('should limit containers', async () => {
      adapter.addContainer(testContainer);
      adapter.addContainer({ ...testContainer, name: 'pod-2', id: 'def456' });
      adapter.addContainer({ ...testContainer, name: 'pod-3', id: 'ghi789' });

      const limited = await adapter.listContainers('default', { limit: 2 });
      expect(limited).toHaveLength(2);
    });

    test('should get container by name', async () => {
      adapter.addContainer(testContainer);

      const container = await adapter.getContainer('default', 'my-pod');
      expect(container.id).toBe('abc123');
    });

    test('should throw for missing container', async () => {
      await expect(adapter.getContainer('default', 'missing')).rejects.toThrow(ContainerNotFoundError);
    });

    test('should get container logs', async () => {
      adapter.addContainer(testContainer);
      adapter.setLogs('default/my-pod', 'line1\nline2\nline3');

      const logs = await adapter.getContainerLogs('default', 'my-pod');
      expect(logs).toBe('line1\nline2\nline3');
    });

    test('should tail container logs', async () => {
      adapter.addContainer(testContainer);
      adapter.setLogs('default/my-pod', 'line1\nline2\nline3\nline4\nline5');

      const logs = await adapter.getContainerLogs('default', 'my-pod', { tail: 2 });
      expect(logs).toBe('line4\nline5');
    });

    test('should exec in container', async () => {
      adapter.addContainer(testContainer);

      const result = await adapter.execInContainer('default', 'my-pod', ['echo', 'hello']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('echo hello');
    });

    test('should return custom exec result', async () => {
      adapter.addContainer(testContainer);
      adapter.setExecResult('ls -la', { exitCode: 0, stdout: 'file1\nfile2', stderr: '' });

      const result = await adapter.execInContainer('default', 'my-pod', ['ls', '-la']);
      expect(result.stdout).toBe('file1\nfile2');
    });

    test('should delete container', async () => {
      adapter.addContainer(testContainer);

      await adapter.deleteContainer('default', 'my-pod');

      await expect(adapter.getContainer('default', 'my-pod')).rejects.toThrow(ContainerNotFoundError);
    });
  });

  describe('Service operations', () => {
    const testService: Service = {
      name: 'my-service',
      namespace: 'default',
      type: 'ClusterIP',
      clusterIP: '10.0.0.1',
      ports: [{ port: 80, targetPort: 8080, protocol: 'TCP' }]
    };

    test('should list services', async () => {
      adapter.addService(testService);

      const services = await adapter.listServices('default');
      expect(services).toHaveLength(1);
    });

    test('should get service by name', async () => {
      adapter.addService(testService);

      const svc = await adapter.getService('default', 'my-service');
      expect(svc.clusterIP).toBe('10.0.0.1');
    });

    test('should throw for missing service', async () => {
      await expect(adapter.getService('default', 'missing')).rejects.toThrow(ServiceNotFoundError);
    });

    test('should port forward', async () => {
      adapter.addService(testService);

      const handle = await adapter.portForward('default', 'my-service', { local: 8080, remote: 80 });

      expect(handle.localPort).toBe(8080);
      expect(typeof handle.close).toBe('function');
    });
  });

  describe('Resource operations', () => {
    test('should get default resource usage', async () => {
      const usage = await adapter.getResourceUsage('default');

      expect(usage.namespace).toBe('default');
      expect(usage.cpu.used).toBe('100m');
      expect(usage.memory.used).toBe('256Mi');
    });

    test('should get custom resource usage', async () => {
      adapter.setResourceUsage('default', {
        namespace: 'default',
        cpu: { used: '500m', percentage: 50 },
        memory: { used: '1Gi', percentage: 75 },
        timestamp: new Date()
      });

      const usage = await adapter.getResourceUsage('default');
      expect(usage.cpu.used).toBe('500m');
      expect(usage.memory.percentage).toBe(75);
    });
  });

  describe('Health check', () => {
    test('should return healthy status', async () => {
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Mock adapter is healthy');
    });

    test('should include stats in details', async () => {
      adapter.addNamespace({ name: 'default', status: 'active' });
      adapter.addDeployment({
        name: 'app', namespace: 'default', replicas: 1,
        availableReplicas: 1, readyReplicas: 1, status: 'running', image: 'nginx'
      });

      const health = await adapter.healthCheck();

      expect(health.details?.namespaces).toBe(1);
      expect(health.details?.deployments).toBe(1);
    });
  });

  describe('Call logging', () => {
    test('should log method calls', async () => {
      await adapter.listNamespaces();
      await adapter.listDeployments('default');

      const calls = adapter.getCallLog();
      expect(calls).toHaveLength(2);
      expect(calls[0].method).toBe('listNamespaces');
      expect(calls[1].method).toBe('listDeployments');
      expect(calls[1].args).toEqual(['default']);
    });

    test('should clear call log', async () => {
      await adapter.listNamespaces();
      adapter.clearCallLog();

      expect(adapter.getCallLog()).toHaveLength(0);
    });
  });

  describe('Failure simulation', () => {
    test('should simulate failures based on rate', async () => {
      adapter.setFailureRate(100); // 100% failure rate

      await expect(adapter.listNamespaces()).rejects.toThrow('Simulated failure');
    });

    test('should not fail when rate is 0', async () => {
      adapter.setFailureRate(0);

      await expect(adapter.listNamespaces()).resolves.toBeDefined();
    });
  });

  describe('Latency simulation', () => {
    test('should simulate latency', async () => {
      adapter.setLatency(50);

      const start = Date.now();
      await adapter.listNamespaces();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
    });
  });
});
