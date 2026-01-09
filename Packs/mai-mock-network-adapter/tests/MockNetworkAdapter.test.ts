import { describe, test, expect, beforeEach } from 'bun:test';
import MockNetworkAdapter from '../src/MockNetworkAdapter.ts';
import {
  DeviceNotFoundError,
  PortNotFoundError,
  VLANNotFoundError,
  ClientNotFoundError
} from 'mai-network-core';

describe('MockNetworkAdapter', () => {
  let adapter: MockNetworkAdapter;

  beforeEach(() => {
    adapter = new MockNetworkAdapter();
  });

  describe('constructor', () => {
    test('creates adapter with default config', () => {
      expect(adapter.name).toBe('mock');
      expect(adapter.version).toBe('1.0.0');
    });

    test('creates adapter with custom device count', async () => {
      const customAdapter = new MockNetworkAdapter({ devices: 5 });
      const devices = await customAdapter.getDevices();
      expect(devices).toHaveLength(5);
    });

    test('creates adapter with custom devices', async () => {
      const customDevices = [{
        id: 'custom-1',
        name: 'Custom Device',
        model: 'CUSTOM',
        mac: 'aa:bb:cc:dd:ee:ff',
        type: 'switch' as const,
        status: 'online' as const
      }];
      const customAdapter = new MockNetworkAdapter({ customDevices });
      const devices = await customAdapter.getDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe('custom-1');
    });
  });

  describe('getDevices', () => {
    test('returns generated devices', async () => {
      const devices = await adapter.getDevices();
      expect(devices.length).toBeGreaterThan(0);
      expect(devices[0]).toHaveProperty('id');
      expect(devices[0]).toHaveProperty('name');
      expect(devices[0]).toHaveProperty('type');
    });

    test('returns copies of devices', async () => {
      const devices1 = await adapter.getDevices();
      const devices2 = await adapter.getDevices();
      expect(devices1).not.toBe(devices2);
    });
  });

  describe('getDevice', () => {
    test('returns specific device', async () => {
      const devices = await adapter.getDevices();
      const device = await adapter.getDevice(devices[0].id);
      expect(device.id).toBe(devices[0].id);
    });

    test('throws DeviceNotFoundError for unknown device', async () => {
      await expect(adapter.getDevice('unknown')).rejects.toThrow(DeviceNotFoundError);
    });
  });

  describe('getPorts', () => {
    test('returns ports for a device', async () => {
      const devices = await adapter.getDevices();
      const switchDevice = devices.find(d => d.type === 'switch');

      if (switchDevice) {
        const ports = await adapter.getPorts(switchDevice.id);
        expect(ports.length).toBeGreaterThan(0);
        expect(ports[0]).toHaveProperty('number');
        expect(ports[0]).toHaveProperty('enabled');
      }
    });

    test('throws DeviceNotFoundError for unknown device', async () => {
      await expect(adapter.getPorts('unknown')).rejects.toThrow(DeviceNotFoundError);
    });
  });

  describe('getPort', () => {
    test('returns specific port', async () => {
      const devices = await adapter.getDevices();
      const port = await adapter.getPort(devices[0].id, '1');
      expect(port.number).toBe(1);
    });

    test('throws PortNotFoundError for unknown port', async () => {
      const devices = await adapter.getDevices();
      await expect(adapter.getPort(devices[0].id, '999')).rejects.toThrow(PortNotFoundError);
    });
  });

  describe('getVLANs', () => {
    test('returns default VLANs', async () => {
      const vlans = await adapter.getVLANs();
      expect(vlans.length).toBeGreaterThan(0);
      expect(vlans[0]).toHaveProperty('id');
      expect(vlans[0]).toHaveProperty('name');
    });

    test('includes expected VLANs', async () => {
      const vlans = await adapter.getVLANs();
      const vlanIds = vlans.map(v => v.id);
      expect(vlanIds).toContain(1); // Default
      expect(vlanIds).toContain(10); // Management
      expect(vlanIds).toContain(20); // IoT
      expect(vlanIds).toContain(30); // Guest
    });
  });

  describe('getVLAN', () => {
    test('returns specific VLAN', async () => {
      const vlan = await adapter.getVLAN(1);
      expect(vlan.id).toBe(1);
      expect(vlan.name).toBe('Default');
    });

    test('throws VLANNotFoundError for unknown VLAN', async () => {
      await expect(adapter.getVLAN(999)).rejects.toThrow(VLANNotFoundError);
    });
  });

  describe('getClients', () => {
    test('returns all clients', async () => {
      const clients = await adapter.getClients();
      expect(clients.length).toBeGreaterThan(0);
      expect(clients[0]).toHaveProperty('mac');
      expect(clients[0]).toHaveProperty('connected');
    });

    test('filters by deviceId', async () => {
      const devices = await adapter.getDevices();
      const clients = await adapter.getClients({ deviceId: devices[0].id });
      clients.forEach(c => expect(c.deviceId).toBe(devices[0].id));
    });

    test('filters by VLAN', async () => {
      const clients = await adapter.getClients({ vlan: 10 });
      clients.forEach(c => expect(c.vlan).toBe(10));
    });

    test('filters by connected status', async () => {
      const clients = await adapter.getClients({ connected: true });
      clients.forEach(c => expect(c.connected).toBe(true));
    });
  });

  describe('getClient', () => {
    test('returns client by MAC', async () => {
      const clients = await adapter.getClients();
      const client = await adapter.getClient(clients[0].mac);
      expect(client.mac.toLowerCase()).toBe(clients[0].mac.toLowerCase());
    });

    test('throws ClientNotFoundError for unknown MAC', async () => {
      await expect(adapter.getClient('00:00:00:00:00:00')).rejects.toThrow(ClientNotFoundError);
    });
  });

  describe('healthCheck', () => {
    test('returns healthy status', async () => {
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Mock adapter is healthy');
    });

    test('includes statistics in details', async () => {
      const health = await adapter.healthCheck();
      expect(health.details).toHaveProperty('deviceCount');
      expect(health.details).toHaveProperty('clientCount');
      expect(health.details).toHaveProperty('vlanCount');
    });
  });

  describe('test helpers', () => {
    test('addDevice adds a new device', async () => {
      const initialDevices = await adapter.getDevices();
      adapter.addDevice({
        id: 'new-device',
        name: 'New Device',
        model: 'NEW',
        mac: 'ff:ff:ff:ff:ff:ff',
        type: 'switch',
        status: 'online'
      });
      const updatedDevices = await adapter.getDevices();
      expect(updatedDevices.length).toBe(initialDevices.length + 1);
    });

    test('removeDevice removes a device', async () => {
      const devices = await adapter.getDevices();
      const removed = adapter.removeDevice(devices[0].id);
      expect(removed).toBe(true);
      await expect(adapter.getDevice(devices[0].id)).rejects.toThrow(DeviceNotFoundError);
    });

    test('addClient adds a new client', async () => {
      const initialClients = await adapter.getClients();
      adapter.addClient({
        mac: 'ff:ee:dd:cc:bb:aa',
        connected: true
      });
      const updatedClients = await adapter.getClients();
      expect(updatedClients.length).toBe(initialClients.length + 1);
    });

    test('addVLAN adds a new VLAN', async () => {
      const initialVLANs = await adapter.getVLANs();
      adapter.addVLAN({
        id: 100,
        name: 'Custom VLAN'
      });
      const updatedVLANs = await adapter.getVLANs();
      expect(updatedVLANs.length).toBe(initialVLANs.length + 1);
    });

    test('setLatency configures delay', async () => {
      adapter.setLatency(10);
      const start = Date.now();
      await adapter.getDevices();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });

    test('reset restores default state', async () => {
      adapter.addDevice({
        id: 'temp',
        name: 'Temp',
        model: 'T',
        mac: '00:00:00:00:00:01',
        type: 'switch',
        status: 'online'
      });
      adapter.reset({ devices: 2 });
      const devices = await adapter.getDevices();
      expect(devices).toHaveLength(2);
      expect(devices.find(d => d.id === 'temp')).toBeUndefined();
    });
  });

  describe('simulated failures', () => {
    test('setFailureRate causes random failures', async () => {
      adapter.setFailureRate(1); // 100% failure rate
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
    });
  });

  describe('data generation', () => {
    test('generates unique MACs', async () => {
      const adapter = new MockNetworkAdapter({ devices: 10, clientsPerDevice: 10 });
      const clients = await adapter.getClients();
      const macs = clients.map(c => c.mac);
      const uniqueMacs = new Set(macs);
      expect(uniqueMacs.size).toBe(macs.length);
    });

    test('generates ports with PoE info for switches', async () => {
      const devices = await adapter.getDevices();
      const switchDevice = devices.find(d => d.type === 'switch');

      if (switchDevice) {
        const ports = await adapter.getPorts(switchDevice.id);
        const poePort = ports.find(p => p.poe);
        expect(poePort?.poe?.enabled).toBe(true);
      }
    });

    test('assigns clients to devices and VLANs', async () => {
      const clients = await adapter.getClients();
      clients.forEach(c => {
        expect(c.deviceId).toBeDefined();
        expect(c.vlan).toBeDefined();
      });
    });
  });
});
