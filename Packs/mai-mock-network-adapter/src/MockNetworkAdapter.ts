import type {
  NetworkProvider,
  Device,
  Port,
  VLAN,
  Client,
  NetworkHealth,
  ListOptions,
  ClientOptions
} from 'mai-network-core';
import {
  DeviceNotFoundError,
  PortNotFoundError,
  VLANNotFoundError,
  ClientNotFoundError,
  ProviderError
} from 'mai-network-core';

export interface MockNetworkAdapterConfig {
  devices?: number;
  clientsPerDevice?: number;
  latencyMs?: number;
  failureRate?: number;
  customDevices?: Device[];
  customClients?: Client[];
  customVLANs?: VLAN[];
}

export default class MockNetworkAdapter implements NetworkProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private devices: Device[];
  private clients: Client[];
  private vlans: VLAN[];
  private latencyMs: number;
  private failureRate: number;

  constructor(config: MockNetworkAdapterConfig = {}) {
    this.latencyMs = config.latencyMs ?? 0;
    this.failureRate = config.failureRate ?? 0;

    if (config.customDevices) {
      this.devices = config.customDevices;
    } else {
      this.devices = this.generateDevices(config.devices ?? 3);
    }

    if (config.customVLANs) {
      this.vlans = config.customVLANs;
    } else {
      this.vlans = this.generateVLANs();
    }

    if (config.customClients) {
      this.clients = config.customClients;
    } else {
      this.clients = this.generateClients(config.clientsPerDevice ?? 5);
    }
  }

  async getDevices(options?: ListOptions): Promise<Device[]> {
    await this.simulateLatency();
    this.maybeThrowError();
    return [...this.devices];
  }

  async getDevice(id: string): Promise<Device> {
    await this.simulateLatency();
    this.maybeThrowError();

    const device = this.devices.find(d => d.id === id);
    if (!device) {
      throw new DeviceNotFoundError(id);
    }
    return { ...device };
  }

  async getPorts(deviceId: string): Promise<Port[]> {
    await this.simulateLatency();
    this.maybeThrowError();

    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      throw new DeviceNotFoundError(deviceId);
    }

    return this.generatePorts(device);
  }

  async getPort(deviceId: string, portId: string): Promise<Port> {
    const ports = await this.getPorts(deviceId);
    const portNum = parseInt(portId, 10);
    const port = ports.find(p => p.number === portNum || p.id === portId);

    if (!port) {
      throw new PortNotFoundError(deviceId, portId);
    }

    return port;
  }

  async getVLANs(): Promise<VLAN[]> {
    await this.simulateLatency();
    this.maybeThrowError();
    return [...this.vlans];
  }

  async getVLAN(id: number): Promise<VLAN> {
    await this.simulateLatency();
    this.maybeThrowError();

    const vlan = this.vlans.find(v => v.id === id);
    if (!vlan) {
      throw new VLANNotFoundError(id);
    }
    return { ...vlan };
  }

  async getClients(options?: ClientOptions): Promise<Client[]> {
    await this.simulateLatency();
    this.maybeThrowError();

    let result = [...this.clients];

    if (options?.deviceId) {
      result = result.filter(c => c.deviceId === options.deviceId);
    }

    if (options?.vlan !== undefined) {
      result = result.filter(c => c.vlan === options.vlan);
    }

    if (options?.connected !== undefined) {
      result = result.filter(c => c.connected === options.connected);
    }

    return result;
  }

  async getClient(mac: string): Promise<Client> {
    await this.simulateLatency();
    this.maybeThrowError();

    const normalizedMac = mac.toLowerCase();
    const client = this.clients.find(c => c.mac.toLowerCase() === normalizedMac);

    if (!client) {
      throw new ClientNotFoundError(mac);
    }

    return { ...client };
  }

  async healthCheck(): Promise<NetworkHealth> {
    await this.simulateLatency();

    if (Math.random() < this.failureRate) {
      return {
        healthy: false,
        message: 'Simulated failure',
        latencyMs: this.latencyMs,
        details: { failureRate: this.failureRate }
      };
    }

    return {
      healthy: true,
      message: 'Mock adapter is healthy',
      latencyMs: this.latencyMs,
      details: {
        deviceCount: this.devices.length,
        clientCount: this.clients.length,
        vlanCount: this.vlans.length
      }
    };
  }

  // Test helpers
  addDevice(device: Device): void {
    this.devices.push(device);
  }

  addClient(client: Client): void {
    this.clients.push(client);
  }

  addVLAN(vlan: VLAN): void {
    this.vlans.push(vlan);
  }

  removeDevice(id: string): boolean {
    const index = this.devices.findIndex(d => d.id === id);
    if (index >= 0) {
      this.devices.splice(index, 1);
      return true;
    }
    return false;
  }

  setLatency(ms: number): void {
    this.latencyMs = ms;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  reset(config?: MockNetworkAdapterConfig): void {
    this.devices = config?.customDevices ?? this.generateDevices(config?.devices ?? 3);
    this.clients = config?.customClients ?? this.generateClients(config?.clientsPerDevice ?? 5);
    this.vlans = config?.customVLANs ?? this.generateVLANs();
    this.latencyMs = config?.latencyMs ?? 0;
    this.failureRate = config?.failureRate ?? 0;
  }

  private async simulateLatency(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }
  }

  private maybeThrowError(): void {
    if (Math.random() < this.failureRate) {
      throw new ProviderError('Simulated random failure', this.name);
    }
  }

  private generateDevices(count: number): Device[] {
    const types: Device['type'][] = ['switch', 'router', 'access_point', 'gateway'];
    const devices: Device[] = [];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      devices.push({
        id: `device-${i + 1}`,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`,
        model: `Mock-${type.toUpperCase()}-24`,
        mac: this.generateMAC(i),
        ip: `192.168.1.${10 + i}`,
        type,
        status: 'online',
        firmware: '1.0.0-mock',
        uptime: 86400 * (i + 1),
        ports: type === 'switch' ? 24 : type === 'router' ? 4 : undefined,
        clients: type === 'access_point' ? 10 : undefined,
        metadata: { mockGenerated: true }
      });
    }

    return devices;
  }

  private generateVLANs(): VLAN[] {
    return [
      {
        id: 1,
        name: 'Default',
        description: 'Default VLAN',
        subnet: '192.168.1.0/24'
      },
      {
        id: 10,
        name: 'Management',
        description: 'Network management VLAN',
        subnet: '192.168.10.0/24'
      },
      {
        id: 20,
        name: 'IoT',
        description: 'Internet of Things devices',
        subnet: '192.168.20.0/24'
      },
      {
        id: 30,
        name: 'Guest',
        description: 'Guest network',
        subnet: '192.168.30.0/24'
      }
    ];
  }

  private generateClients(perDevice: number): Client[] {
    const clients: Client[] = [];
    let clientNum = 0;

    for (const device of this.devices) {
      const numClients = device.type === 'access_point' ? perDevice * 2 : perDevice;

      for (let i = 0; i < numClients; i++) {
        clientNum++;
        const vlanId = this.vlans[clientNum % this.vlans.length].id;
        clients.push({
          mac: this.generateMAC(100 + clientNum),
          ip: `192.168.${vlanId}.${100 + (clientNum % 100)}`,
          hostname: `client-${clientNum}`,
          name: `Client ${clientNum}`,
          deviceId: device.id,
          port: (i % 24) + 1,
          vlan: vlanId,
          connected: true,
          firstSeen: new Date(Date.now() - 86400000 * clientNum),
          lastSeen: new Date(),
          rxBytes: Math.floor(Math.random() * 1000000000),
          txBytes: Math.floor(Math.random() * 500000000),
          metadata: { mockGenerated: true }
        });
      }
    }

    return clients;
  }

  private generatePorts(device: Device): Port[] {
    const portCount = device.ports || (device.type === 'switch' ? 24 : 4);
    const ports: Port[] = [];

    for (let i = 1; i <= portCount; i++) {
      const hasClient = this.clients.some(c => c.deviceId === device.id && c.port === i);
      ports.push({
        id: `${i}`,
        name: `Port ${i}`,
        number: i,
        enabled: true,
        speed: hasClient ? 1000 : 0,
        duplex: 'full',
        poe: device.type === 'switch' && i <= 16 ? {
          enabled: true,
          power: hasClient ? Math.random() * 15 : 0,
          mode: 'auto'
        } : undefined,
        vlan: this.vlans[i % this.vlans.length].id,
        trunk: i > 20,
        link: hasClient,
        stats: {
          rxBytes: hasClient ? Math.floor(Math.random() * 10000000) : 0,
          txBytes: hasClient ? Math.floor(Math.random() * 5000000) : 0,
          rxPackets: hasClient ? Math.floor(Math.random() * 100000) : 0,
          txPackets: hasClient ? Math.floor(Math.random() * 50000) : 0,
          errors: 0
        }
      });
    }

    return ports;
  }

  private generateMAC(seed: number): string {
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return `00:11:22:${hex((seed >> 16) & 0xff)}:${hex((seed >> 8) & 0xff)}:${hex(seed & 0xff)}`;
  }
}
