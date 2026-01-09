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
  AuthenticationError,
  ConnectionError,
  DeviceNotFoundError,
  PortNotFoundError,
  VLANNotFoundError,
  ClientNotFoundError,
  ProviderError
} from 'mai-network-core';

export interface UnifiAdapterConfig {
  url: string;
  auth?: {
    type: 'keychain' | 'env' | 'direct';
    service?: string;
    var?: string;
    username?: string;
    password?: string;
  };
  site?: string;
  timeout?: number;
  verifySSL?: boolean;
}

interface UnifiDevice {
  _id: string;
  name?: string;
  model: string;
  mac: string;
  ip?: string;
  type: string;
  state: number;
  version?: string;
  uptime?: number;
  port_table?: UnifiPort[];
  num_sta?: number;
}

interface UnifiPort {
  port_idx: number;
  name?: string;
  enable?: boolean;
  speed?: number;
  full_duplex?: boolean;
  poe_enable?: boolean;
  poe_power?: string;
  poe_mode?: string;
  portconf_id?: string;
  up?: boolean;
  rx_bytes?: number;
  tx_bytes?: number;
  rx_packets?: number;
  tx_packets?: number;
  rx_errors?: number;
  tx_errors?: number;
}

interface UnifiClient {
  mac: string;
  ip?: string;
  hostname?: string;
  name?: string;
  sw_mac?: string;
  sw_port?: number;
  vlan?: number;
  is_wired?: boolean;
  first_seen?: number;
  last_seen?: number;
  rx_bytes?: number;
  tx_bytes?: number;
  signal?: number;
  oui?: string;
}

interface UnifiNetwork {
  _id: string;
  name: string;
  vlan?: number;
  vlan_enabled?: boolean;
  purpose?: string;
  subnet?: string;
  dhcpd_enabled?: boolean;
}

export default class UnifiAdapter implements NetworkProvider {
  readonly name = 'unifi';
  readonly version = '1.0.0';

  private baseUrl: string;
  private site: string;
  private timeout: number;
  private cookies: string[] = [];
  private csrfToken?: string;
  private authenticated = false;
  private isUnifiOS = false;

  constructor(private config: UnifiAdapterConfig) {
    this.baseUrl = config.url.replace(/\/$/, '');
    this.site = config.site || 'default';
    this.timeout = config.timeout || 30000;
  }

  async getDevices(options?: ListOptions): Promise<Device[]> {
    await this.ensureAuthenticated();
    const response = await this.apiGet(`/stat/device`);
    const devices = response.data as UnifiDevice[];

    return devices.map(d => this.mapDevice(d));
  }

  async getDevice(id: string): Promise<Device> {
    await this.ensureAuthenticated();
    const response = await this.apiGet(`/stat/device/${id}`);
    const devices = response.data as UnifiDevice[];

    if (!devices || devices.length === 0) {
      throw new DeviceNotFoundError(id);
    }

    return this.mapDevice(devices[0]);
  }

  async getPorts(deviceId: string): Promise<Port[]> {
    await this.ensureAuthenticated();
    const response = await this.apiGet(`/stat/device/${deviceId}`);
    const devices = response.data as UnifiDevice[];

    if (!devices || devices.length === 0) {
      throw new DeviceNotFoundError(deviceId);
    }

    const device = devices[0];
    if (!device.port_table) {
      return [];
    }

    return device.port_table.map(p => this.mapPort(p));
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
    await this.ensureAuthenticated();
    const response = await this.apiGet(`/rest/networkconf`);
    const networks = response.data as UnifiNetwork[];

    return networks
      .filter(n => n.vlan_enabled && n.vlan !== undefined)
      .map(n => this.mapVLAN(n));
  }

  async getVLAN(id: number): Promise<VLAN> {
    const vlans = await this.getVLANs();
    const vlan = vlans.find(v => v.id === id);

    if (!vlan) {
      throw new VLANNotFoundError(id);
    }

    return vlan;
  }

  async getClients(options?: ClientOptions): Promise<Client[]> {
    await this.ensureAuthenticated();
    const response = await this.apiGet(`/stat/sta`);
    const clients = response.data as UnifiClient[];

    let result = clients.map(c => this.mapClient(c));

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
    const normalizedMac = mac.toLowerCase().replace(/[:-]/g, ':');
    await this.ensureAuthenticated();
    const response = await this.apiGet(`/stat/sta`);
    const clients = response.data as UnifiClient[];

    const client = clients.find(c =>
      c.mac.toLowerCase() === normalizedMac
    );

    if (!client) {
      throw new ClientNotFoundError(mac);
    }

    return this.mapClient(client);
  }

  async healthCheck(): Promise<NetworkHealth> {
    try {
      await this.ensureAuthenticated();
      const response = await this.apiGet(`/stat/health`);

      return {
        healthy: true,
        message: 'Connected to UniFi Controller',
        latencyMs: 0,
        details: {
          site: this.site,
          isUnifiOS: this.isUnifiOS,
          subsystems: response.data
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          site: this.site,
          error: String(error)
        }
      };
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authenticated) {
      return;
    }

    const credentials = await this.resolveCredentials();
    await this.login(credentials.username, credentials.password);
  }

  private async resolveCredentials(): Promise<{ username: string; password: string }> {
    const auth = this.config.auth;

    if (!auth) {
      throw new AuthenticationError('No authentication configured for UniFi adapter');
    }

    if (auth.type === 'direct' && auth.username && auth.password) {
      return { username: auth.username, password: auth.password };
    }

    if (auth.type === 'env' && auth.var) {
      const [usernameVar, passwordVar] = auth.var.split(':');
      const username = process.env[usernameVar];
      const password = process.env[passwordVar];

      if (!username || !password) {
        throw new AuthenticationError(`Environment variables ${auth.var} not set`);
      }

      return { username, password };
    }

    if (auth.type === 'keychain' && auth.service) {
      try {
        const result = await Bun.$`security find-generic-password -s ${auth.service} -w`.quiet().nothrow();

        if (result.exitCode !== 0) {
          throw new AuthenticationError(`Keychain entry not found: ${auth.service}`);
        }

        const password = result.stdout.toString().trim();
        // Username from keychain or default
        const usernameResult = await Bun.$`security find-generic-password -s ${auth.service} -g 2>&1 | grep "acct" | cut -d'"' -f4`.quiet().nothrow();
        const username = usernameResult.stdout.toString().trim() || 'admin';

        return { username, password };
      } catch (error) {
        throw new AuthenticationError(`Failed to read keychain: ${error}`);
      }
    }

    throw new AuthenticationError('Invalid authentication configuration');
  }

  private async login(username: string, password: string): Promise<void> {
    // Try UniFi OS login first
    try {
      await this.loginUnifiOS(username, password);
      this.isUnifiOS = true;
      this.authenticated = true;
      return;
    } catch {
      // Fall back to classic controller
    }

    try {
      await this.loginClassic(username, password);
      this.isUnifiOS = false;
      this.authenticated = true;
    } catch (error) {
      throw new AuthenticationError(
        `Failed to authenticate with UniFi controller: ${error}`
      );
    }
  }

  private async loginUnifiOS(username: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      // @ts-ignore - Bun supports this
      tls: { rejectUnauthorized: this.config.verifySSL ?? false }
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    this.extractCookies(response);
    this.csrfToken = response.headers.get('x-csrf-token') || undefined;
  }

  private async loginClassic(username: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      // @ts-ignore - Bun supports this
      tls: { rejectUnauthorized: this.config.verifySSL ?? false }
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    this.extractCookies(response);
  }

  private extractCookies(response: Response): void {
    const setCookie = response.headers.getSetCookie?.() || [];
    this.cookies = setCookie.map(c => c.split(';')[0]);
  }

  private async apiGet(path: string): Promise<{ data: unknown[] }> {
    const apiPath = this.isUnifiOS
      ? `/proxy/network/api/s/${this.site}${path}`
      : `/api/s/${this.site}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
    }

    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}${apiPath}`, {
        method: 'GET',
        headers,
        // @ts-ignore - Bun supports this
        tls: { rejectUnauthorized: this.config.verifySSL ?? false }
      });

      if (response.status === 401) {
        this.authenticated = false;
        await this.ensureAuthenticated();
        return this.apiGet(path);
      }

      if (!response.ok) {
        throw new ProviderError(
          `API request failed: ${response.status} ${response.statusText}`,
          this.name
        );
      }

      const json = await response.json() as { data?: unknown[]; meta?: unknown };
      return { data: json.data || [] };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ConnectionError(
        `Failed to connect to UniFi controller: ${error}`,
        this.name
      );
    }
  }

  private mapDevice(d: UnifiDevice): Device {
    return {
      id: d._id,
      name: d.name || d.mac,
      model: d.model,
      mac: d.mac,
      ip: d.ip,
      type: this.mapDeviceType(d.type),
      status: this.mapDeviceStatus(d.state),
      firmware: d.version,
      uptime: d.uptime,
      ports: d.port_table?.length,
      clients: d.num_sta,
      metadata: {
        unifiId: d._id,
        unifiType: d.type
      }
    };
  }

  private mapDeviceType(type: string): Device['type'] {
    switch (type) {
      case 'usw': return 'switch';
      case 'ugw': return 'gateway';
      case 'uap': return 'access_point';
      case 'uxg': return 'gateway';
      case 'udm': return 'gateway';
      default: return 'other';
    }
  }

  private mapDeviceStatus(state: number): Device['status'] {
    switch (state) {
      case 1: return 'online';
      case 0: return 'offline';
      case 2: return 'pending';
      case 4: return 'adopting';
      default: return 'unknown';
    }
  }

  private mapPort(p: UnifiPort): Port {
    return {
      id: String(p.port_idx),
      name: p.name,
      number: p.port_idx,
      enabled: p.enable ?? true,
      speed: p.speed,
      duplex: p.full_duplex ? 'full' : 'half',
      poe: p.poe_enable !== undefined ? {
        enabled: p.poe_enable,
        power: p.poe_power ? parseFloat(p.poe_power) : undefined,
        mode: p.poe_mode
      } : undefined,
      link: p.up ?? false,
      stats: {
        rxBytes: p.rx_bytes || 0,
        txBytes: p.tx_bytes || 0,
        rxPackets: p.rx_packets || 0,
        txPackets: p.tx_packets || 0,
        errors: (p.rx_errors || 0) + (p.tx_errors || 0)
      }
    };
  }

  private mapVLAN(n: UnifiNetwork): VLAN {
    return {
      id: n.vlan!,
      name: n.name,
      description: n.purpose,
      subnet: n.subnet,
      metadata: {
        unifiId: n._id,
        dhcpEnabled: n.dhcpd_enabled
      }
    };
  }

  private mapClient(c: UnifiClient): Client {
    return {
      mac: c.mac,
      ip: c.ip,
      hostname: c.hostname,
      name: c.name || c.hostname,
      deviceId: c.sw_mac,
      port: c.sw_port,
      vlan: c.vlan,
      connected: true,
      firstSeen: c.first_seen ? new Date(c.first_seen * 1000) : undefined,
      lastSeen: c.last_seen ? new Date(c.last_seen * 1000) : undefined,
      rxBytes: c.rx_bytes,
      txBytes: c.tx_bytes,
      signal: c.signal,
      metadata: {
        isWired: c.is_wired,
        oui: c.oui
      }
    };
  }
}
