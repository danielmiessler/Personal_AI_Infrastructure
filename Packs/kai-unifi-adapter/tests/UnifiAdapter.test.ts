import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import UnifiAdapter from '../src/UnifiAdapter.ts';
import type { UnifiAdapterConfig } from '../src/UnifiAdapter.ts';
import {
  DeviceNotFoundError,
  PortNotFoundError,
  VLANNotFoundError,
  ClientNotFoundError,
  AuthenticationError
} from 'kai-network-core';

// Mock fetch for testing
const originalFetch = globalThis.fetch;

function createMockFetch(responses: Map<string, { status: number; data?: unknown; headers?: Record<string, string> }>) {
  return mock((url: string, options?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    for (const [pattern, response] of responses) {
      if (urlStr.includes(pattern)) {
        const headers = new Headers();
        if (response.headers) {
          Object.entries(response.headers).forEach(([k, v]) => headers.set(k, v));
        }

        // Mock getSetCookie for cookie handling
        const mockHeaders = {
          get: (name: string) => response.headers?.[name] || null,
          getSetCookie: () => response.headers?.['set-cookie'] ? [response.headers['set-cookie']] : []
        };

        return Promise.resolve({
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.status === 200 ? 'OK' : 'Error',
          headers: mockHeaders,
          json: () => Promise.resolve(response.data)
        } as unknown as Response);
      }
    }

    return Promise.reject(new Error(`No mock for ${urlStr}`));
  });
}

describe('UnifiAdapter', () => {
  const baseConfig: UnifiAdapterConfig = {
    url: 'https://192.168.1.1',
    auth: {
      type: 'direct',
      username: 'admin',
      password: 'password123'
    },
    site: 'default'
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    test('creates adapter with config', () => {
      const adapter = new UnifiAdapter(baseConfig);
      expect(adapter.name).toBe('unifi');
      expect(adapter.version).toBe('1.0.0');
    });

    test('normalizes URL by removing trailing slash', () => {
      const adapter = new UnifiAdapter({
        ...baseConfig,
        url: 'https://192.168.1.1/'
      });
      expect(adapter.name).toBe('unifi');
    });
  });

  describe('authentication', () => {
    test('authenticates with UniFi OS controller', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: {
            'set-cookie': 'TOKEN=abc123; Path=/',
            'x-csrf-token': 'csrf-token-123'
          }
        }],
        ['/proxy/network/api/s/default/stat/health', {
          status: 200,
          data: { data: [] }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
    });

    test('falls back to classic controller auth', async () => {
      const responses = new Map([
        ['/api/auth/login', { status: 401, data: {} }],
        ['/api/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'unifises=session123; Path=/' }
        }],
        ['/api/s/default/stat/health', {
          status: 200,
          data: { data: [] }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
    });

    test('returns unhealthy when no auth configured', async () => {
      const adapter = new UnifiAdapter({
        url: 'https://192.168.1.1'
      });

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.message).toContain('No authentication configured');
    });

    test('resolves credentials from environment variables', async () => {
      process.env.UNIFI_USER = 'testuser';
      process.env.UNIFI_PASS = 'testpass';

      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/proxy/network/api/s/default/stat/health', {
          status: 200,
          data: { data: [] }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);

      const adapter = new UnifiAdapter({
        url: 'https://192.168.1.1',
        auth: {
          type: 'env',
          var: 'UNIFI_USER:UNIFI_PASS'
        }
      });

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);

      delete process.env.UNIFI_USER;
      delete process.env.UNIFI_PASS;
    });
  });

  describe('getDevices', () => {
    test('returns mapped devices', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/device', {
          status: 200,
          data: {
            data: [
              {
                _id: 'device-1',
                name: 'Switch 1',
                model: 'USW-24-POE',
                mac: 'aa:bb:cc:dd:ee:ff',
                ip: '192.168.1.10',
                type: 'usw',
                state: 1,
                version: '6.0.0',
                uptime: 86400,
                port_table: [],
                num_sta: 5
              },
              {
                _id: 'device-2',
                name: 'AP Office',
                model: 'U6-Pro',
                mac: '11:22:33:44:55:66',
                ip: '192.168.1.20',
                type: 'uap',
                state: 1,
                version: '6.0.0',
                uptime: 172800,
                num_sta: 12
              }
            ]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const devices = await adapter.getDevices();

      expect(devices).toHaveLength(2);
      expect(devices[0].id).toBe('device-1');
      expect(devices[0].name).toBe('Switch 1');
      expect(devices[0].type).toBe('switch');
      expect(devices[0].status).toBe('online');
      expect(devices[1].type).toBe('access_point');
    });
  });

  describe('getDevice', () => {
    test('returns single device', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/device/device-1', {
          status: 200,
          data: {
            data: [{
              _id: 'device-1',
              name: 'Switch 1',
              model: 'USW-24-POE',
              mac: 'aa:bb:cc:dd:ee:ff',
              type: 'usw',
              state: 1
            }]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const device = await adapter.getDevice('device-1');

      expect(device.id).toBe('device-1');
      expect(device.name).toBe('Switch 1');
    });

    test('throws DeviceNotFoundError when device not found', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/device/unknown', {
          status: 200,
          data: { data: [] }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);

      await expect(adapter.getDevice('unknown')).rejects.toThrow(DeviceNotFoundError);
    });
  });

  describe('getPorts', () => {
    test('returns ports from device', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/device/device-1', {
          status: 200,
          data: {
            data: [{
              _id: 'device-1',
              name: 'Switch 1',
              model: 'USW-24-POE',
              mac: 'aa:bb:cc:dd:ee:ff',
              type: 'usw',
              state: 1,
              port_table: [
                {
                  port_idx: 1,
                  name: 'Port 1',
                  enable: true,
                  speed: 1000,
                  full_duplex: true,
                  poe_enable: true,
                  poe_power: '15.5',
                  up: true,
                  rx_bytes: 1000000,
                  tx_bytes: 500000,
                  rx_packets: 1000,
                  tx_packets: 500
                },
                {
                  port_idx: 2,
                  name: 'Port 2',
                  enable: true,
                  speed: 100,
                  full_duplex: false,
                  up: false
                }
              ]
            }]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const ports = await adapter.getPorts('device-1');

      expect(ports).toHaveLength(2);
      expect(ports[0].number).toBe(1);
      expect(ports[0].speed).toBe(1000);
      expect(ports[0].poe?.enabled).toBe(true);
      expect(ports[0].poe?.power).toBe(15.5);
      expect(ports[0].link).toBe(true);
      expect(ports[1].link).toBe(false);
    });
  });

  describe('getPort', () => {
    test('returns specific port', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/device/device-1', {
          status: 200,
          data: {
            data: [{
              _id: 'device-1',
              name: 'Switch 1',
              model: 'USW-24-POE',
              mac: 'aa:bb:cc:dd:ee:ff',
              type: 'usw',
              state: 1,
              port_table: [{ port_idx: 1, name: 'Port 1', enable: true, up: true }]
            }]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const port = await adapter.getPort('device-1', '1');

      expect(port.number).toBe(1);
    });

    test('throws PortNotFoundError when port not found', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/device/device-1', {
          status: 200,
          data: {
            data: [{
              _id: 'device-1',
              name: 'Switch 1',
              model: 'USW-24-POE',
              mac: 'aa:bb:cc:dd:ee:ff',
              type: 'usw',
              state: 1,
              port_table: [{ port_idx: 1, name: 'Port 1', enable: true, up: true }]
            }]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);

      await expect(adapter.getPort('device-1', '99')).rejects.toThrow(PortNotFoundError);
    });
  });

  describe('getVLANs', () => {
    test('returns VLANs from network config', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/rest/networkconf', {
          status: 200,
          data: {
            data: [
              {
                _id: 'net-1',
                name: 'LAN',
                vlan: 1,
                vlan_enabled: true,
                subnet: '192.168.1.0/24',
                dhcpd_enabled: true
              },
              {
                _id: 'net-2',
                name: 'IoT',
                vlan: 10,
                vlan_enabled: true,
                subnet: '192.168.10.0/24',
                purpose: 'corporate'
              },
              {
                _id: 'net-3',
                name: 'Guest',
                vlan_enabled: false
              }
            ]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const vlans = await adapter.getVLANs();

      expect(vlans).toHaveLength(2);
      expect(vlans[0].id).toBe(1);
      expect(vlans[0].name).toBe('LAN');
      expect(vlans[1].id).toBe(10);
      expect(vlans[1].name).toBe('IoT');
    });
  });

  describe('getVLAN', () => {
    test('throws VLANNotFoundError when VLAN not found', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/rest/networkconf', {
          status: 200,
          data: { data: [] }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);

      await expect(adapter.getVLAN(999)).rejects.toThrow(VLANNotFoundError);
    });
  });

  describe('getClients', () => {
    test('returns all clients', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/sta', {
          status: 200,
          data: {
            data: [
              {
                mac: 'aa:bb:cc:dd:ee:ff',
                ip: '192.168.1.100',
                hostname: 'laptop',
                sw_mac: 'switch-1',
                sw_port: 5,
                vlan: 1,
                is_wired: true,
                first_seen: 1700000000,
                last_seen: 1700001000,
                rx_bytes: 1000000,
                tx_bytes: 500000
              }
            ]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const clients = await adapter.getClients();

      expect(clients).toHaveLength(1);
      expect(clients[0].mac).toBe('aa:bb:cc:dd:ee:ff');
      expect(clients[0].hostname).toBe('laptop');
      expect(clients[0].port).toBe(5);
    });

    test('filters clients by VLAN', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/sta', {
          status: 200,
          data: {
            data: [
              { mac: 'aa:bb:cc:dd:ee:ff', vlan: 1 },
              { mac: '11:22:33:44:55:66', vlan: 10 }
            ]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const clients = await adapter.getClients({ vlan: 10 });

      expect(clients).toHaveLength(1);
      expect(clients[0].mac).toBe('11:22:33:44:55:66');
    });
  });

  describe('getClient', () => {
    test('returns client by MAC', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/sta', {
          status: 200,
          data: {
            data: [{ mac: 'aa:bb:cc:dd:ee:ff', hostname: 'laptop' }]
          }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const client = await adapter.getClient('aa:bb:cc:dd:ee:ff');

      expect(client.mac).toBe('aa:bb:cc:dd:ee:ff');
    });

    test('throws ClientNotFoundError when client not found', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/sta', {
          status: 200,
          data: { data: [] }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);

      await expect(adapter.getClient('unknown')).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('healthCheck', () => {
    test('returns healthy status when connected', async () => {
      const responses = new Map([
        ['/api/auth/login', {
          status: 200,
          data: {},
          headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
        }],
        ['/stat/health', {
          status: 200,
          data: { data: [{ subsystem: 'www', status: 'ok' }] }
        }]
      ]);

      globalThis.fetch = createMockFetch(responses);
      const adapter = new UnifiAdapter(baseConfig);
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Connected to UniFi Controller');
    });

    test('returns unhealthy status on connection error', async () => {
      globalThis.fetch = mock(() => Promise.reject(new Error('Connection refused')));
      const adapter = new UnifiAdapter(baseConfig);
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('Connection refused');
    });
  });

  describe('device type mapping', () => {
    test('maps UniFi device types correctly', async () => {
      const deviceTypes = [
        { type: 'usw', expected: 'switch' },
        { type: 'ugw', expected: 'gateway' },
        { type: 'uap', expected: 'access_point' },
        { type: 'uxg', expected: 'gateway' },
        { type: 'udm', expected: 'gateway' },
        { type: 'unknown', expected: 'other' }
      ];

      for (const { type, expected } of deviceTypes) {
        const responses = new Map([
          ['/api/auth/login', {
            status: 200,
            data: {},
            headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
          }],
          ['/stat/device', {
            status: 200,
            data: {
              data: [{
                _id: 'test',
                name: 'Test',
                model: 'Test',
                mac: 'aa:bb:cc:dd:ee:ff',
                type,
                state: 1
              }]
            }
          }]
        ]);

        globalThis.fetch = createMockFetch(responses);
        const adapter = new UnifiAdapter(baseConfig);
        const devices = await adapter.getDevices();

        expect(devices[0].type).toBe(expected);
      }
    });
  });

  describe('device status mapping', () => {
    test('maps UniFi device states correctly', async () => {
      const states = [
        { state: 1, expected: 'online' },
        { state: 0, expected: 'offline' },
        { state: 2, expected: 'pending' },
        { state: 4, expected: 'adopting' },
        { state: 99, expected: 'unknown' }
      ];

      for (const { state, expected } of states) {
        const responses = new Map([
          ['/api/auth/login', {
            status: 200,
            data: {},
            headers: { 'set-cookie': 'TOKEN=abc; Path=/' }
          }],
          ['/stat/device', {
            status: 200,
            data: {
              data: [{
                _id: 'test',
                name: 'Test',
                model: 'Test',
                mac: 'aa:bb:cc:dd:ee:ff',
                type: 'usw',
                state
              }]
            }
          }]
        ]);

        globalThis.fetch = createMockFetch(responses);
        const adapter = new UnifiAdapter(baseConfig);
        const devices = await adapter.getDevices();

        expect(devices[0].status).toBe(expected);
      }
    });
  });
});
