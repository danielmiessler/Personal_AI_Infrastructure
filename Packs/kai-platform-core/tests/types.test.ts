import { describe, test, expect } from 'bun:test';
import type {
  Namespace,
  NamespaceStatus,
  Deployment,
  DeploymentStatus,
  Container,
  ContainerStatus,
  ContainerQuery,
  LogOptions,
  ExecResult,
  Service,
  ServiceType,
  ServicePort,
  PortMapping,
  PortForwardHandle,
  ResourceUsage,
  ResourceMetric,
  HealthStatus,
  PortInfo,
  ResourceSpec,
  ResourceQuantity,
} from '../src/index.ts';

describe('Types', () => {
  describe('Namespace', () => {
    test('should define namespace structure', () => {
      const ns: Namespace = {
        name: 'default',
        status: 'active',
        labels: { env: 'prod' },
        annotations: { description: 'Default namespace' },
        createdAt: new Date()
      };

      expect(ns.name).toBe('default');
      expect(ns.status).toBe('active');
      expect(ns.labels?.env).toBe('prod');
    });

    test('should allow minimal namespace', () => {
      const ns: Namespace = {
        name: 'test',
        status: 'active'
      };

      expect(ns.name).toBe('test');
      expect(ns.labels).toBeUndefined();
    });

    test('should define NamespaceStatus', () => {
      const statuses: NamespaceStatus[] = ['active', 'terminating'];
      expect(statuses).toContain('active');
      expect(statuses).toContain('terminating');
    });
  });

  describe('Deployment', () => {
    test('should define deployment structure', () => {
      const dep: Deployment = {
        name: 'my-app',
        namespace: 'default',
        replicas: 3,
        availableReplicas: 3,
        readyReplicas: 3,
        status: 'running',
        image: 'nginx:latest',
        labels: { app: 'nginx' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(dep.name).toBe('my-app');
      expect(dep.replicas).toBe(3);
      expect(dep.status).toBe('running');
    });

    test('should define DeploymentStatus', () => {
      const statuses: DeploymentStatus[] = ['running', 'pending', 'failed', 'updating'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('Container', () => {
    test('should define container structure', () => {
      const container: Container = {
        id: 'abc123',
        name: 'my-pod',
        namespace: 'default',
        image: 'nginx:latest',
        status: 'running',
        ready: true,
        restartCount: 0,
        startedAt: new Date(),
        ports: [{ containerPort: 80, protocol: 'TCP' }],
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        }
      };

      expect(container.id).toBe('abc123');
      expect(container.ready).toBe(true);
      expect(container.ports?.[0].containerPort).toBe(80);
    });

    test('should define ContainerStatus', () => {
      const statuses: ContainerStatus[] = ['running', 'pending', 'succeeded', 'failed', 'unknown'];
      expect(statuses).toHaveLength(5);
    });

    test('should define ContainerQuery', () => {
      const query: ContainerQuery = {
        deployment: 'my-app',
        labelSelector: 'app=nginx',
        status: 'running',
        limit: 10
      };

      expect(query.deployment).toBe('my-app');
      expect(query.limit).toBe(10);
    });

    test('should define LogOptions', () => {
      const options: LogOptions = {
        tail: 100,
        since: '1h',
        follow: false,
        timestamps: true,
        container: 'main'
      };

      expect(options.tail).toBe(100);
      expect(options.since).toBe('1h');
    });

    test('should define ExecResult', () => {
      const result: ExecResult = {
        exitCode: 0,
        stdout: 'Hello, World!',
        stderr: ''
      };

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('Hello, World!');
    });
  });

  describe('Service', () => {
    test('should define service structure', () => {
      const svc: Service = {
        name: 'my-service',
        namespace: 'default',
        type: 'ClusterIP',
        clusterIP: '10.0.0.1',
        ports: [{ port: 80, targetPort: 8080, protocol: 'TCP' }],
        selector: { app: 'my-app' },
        createdAt: new Date()
      };

      expect(svc.name).toBe('my-service');
      expect(svc.type).toBe('ClusterIP');
      expect(svc.ports[0].port).toBe(80);
    });

    test('should define ServiceType', () => {
      const types: ServiceType[] = ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'];
      expect(types).toHaveLength(4);
    });

    test('should define ServicePort', () => {
      const port: ServicePort = {
        name: 'http',
        port: 80,
        targetPort: 8080,
        nodePort: 30080,
        protocol: 'TCP'
      };

      expect(port.nodePort).toBe(30080);
    });

    test('should define PortMapping', () => {
      const mapping: PortMapping = {
        local: 8080,
        remote: 80
      };

      expect(mapping.local).toBe(8080);
    });
  });

  describe('Resource', () => {
    test('should define ResourceUsage', () => {
      const usage: ResourceUsage = {
        namespace: 'default',
        container: 'my-pod',
        cpu: { used: '100m', requested: '200m', limit: '500m', percentage: 20 },
        memory: { used: '256Mi', requested: '512Mi', limit: '1Gi', percentage: 25 },
        timestamp: new Date()
      };

      expect(usage.cpu.used).toBe('100m');
      expect(usage.memory.percentage).toBe(25);
    });

    test('should define ResourceMetric', () => {
      const metric: ResourceMetric = {
        used: '100m',
        requested: '200m',
        limit: '500m',
        percentage: 50
      };

      expect(metric.used).toBe('100m');
    });

    test('should define HealthStatus', () => {
      const health: HealthStatus = {
        healthy: true,
        message: 'All systems operational',
        latencyMs: 50,
        details: { version: '1.0.0' }
      };

      expect(health.healthy).toBe(true);
      expect(health.latencyMs).toBe(50);
    });
  });
});
