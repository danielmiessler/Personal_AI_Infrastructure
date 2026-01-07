/**
 * Device type enumeration
 */
export type DeviceType = 'switch' | 'router' | 'access_point' | 'gateway' | 'firewall' | 'other';

/**
 * Device status enumeration
 */
export type DeviceStatus = 'online' | 'offline' | 'degraded' | 'unknown';

/**
 * Port speed enumeration
 */
export type PortSpeed = '10M' | '100M' | '1G' | '2.5G' | '5G' | '10G' | '25G' | '40G' | '100G' | 'auto';

/**
 * Port status enumeration
 */
export type PortStatus = 'up' | 'down' | 'disabled' | 'error';

/**
 * Device - A network device (switch, router, AP, etc.)
 */
export interface Device {
  /** Unique device identifier */
  id: string;
  /** Device hostname */
  hostname: string;
  /** Device model */
  model: string;
  /** Device type */
  type: DeviceType;
  /** Management IP address */
  ip: string;
  /** MAC address */
  mac: string;
  /** Current status */
  status: DeviceStatus;
  /** Uptime in seconds */
  uptime?: number;
  /** Firmware version */
  firmware?: string;
  /** Number of ports (for switches) */
  portCount?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Port - A network port on a device
 */
export interface Port {
  /** Port identifier */
  id: string;
  /** Port name/label */
  name: string;
  /** Parent device ID */
  deviceId: string;
  /** Link speed */
  speed: PortSpeed;
  /** Duplex mode */
  duplex: 'full' | 'half' | 'auto';
  /** Port status */
  status: PortStatus;
  /** Access/trunk VLAN */
  vlan?: number;
  /** PoE enabled */
  poeEnabled?: boolean;
  /** PoE power consumption in watts */
  poeWatts?: number;
  /** Bytes received */
  bytesIn?: number;
  /** Bytes transmitted */
  bytesOut?: number;
  /** Error count */
  errors?: number;
}

/**
 * VLAN - A virtual LAN configuration
 */
export interface VLAN {
  /** VLAN ID (1-4094) */
  id: number;
  /** VLAN name */
  name: string;
  /** Network subnet (CIDR notation) */
  subnet?: string;
  /** Gateway IP */
  gateway?: string;
  /** DHCP enabled */
  dhcpEnabled?: boolean;
  /** Purpose description */
  purpose?: string;
}

/**
 * Client - A device connected to the network
 */
export interface Client {
  /** MAC address */
  mac: string;
  /** IP address */
  ip?: string;
  /** Hostname */
  hostname?: string;
  /** Manufacturer (from OUI) */
  manufacturer?: string;
  /** Device this client is connected to */
  deviceId: string;
  /** Port this client is connected to */
  portId?: string;
  /** VLAN assignment */
  vlan?: number;
  /** When the client connected */
  connectedAt?: Date;
  /** Bytes received */
  rxBytes?: number;
  /** Bytes transmitted */
  txBytes?: number;
  /** Signal strength for wireless clients */
  rssi?: number;
  /** Is this a wireless client */
  wireless?: boolean;
}

/**
 * Options for listing clients
 */
export interface ClientOptions {
  /** Filter by device */
  deviceId?: string;
  /** Filter by VLAN */
  vlan?: number;
  /** Only wireless clients */
  wireless?: boolean;
  /** Only wired clients */
  wired?: boolean;
  /** Maximum results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/**
 * Options for listing devices
 */
export interface ListOptions {
  /** Filter by device type */
  type?: DeviceType;
  /** Filter by status */
  status?: DeviceStatus;
  /** Maximum results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/**
 * Network alert
 */
export interface NetworkAlert {
  /** Alert severity */
  severity: 'critical' | 'warning' | 'info';
  /** Related device */
  device?: string;
  /** Alert message */
  message: string;
  /** When the alert was generated */
  timestamp: Date;
}

/**
 * NetworkHealth - Overall network health status
 */
export interface NetworkHealth {
  /** Is the network healthy */
  healthy: boolean;
  /** Status message */
  message?: string;
  /** Response latency in ms */
  latencyMs?: number;
  /** Device counts by status */
  devices: {
    total: number;
    online: number;
    offline: number;
    degraded: number;
  };
  /** Active alerts */
  alerts?: NetworkAlert[];
}

/**
 * NetworkProvider - Interface for network infrastructure backends
 *
 * Implementations provide read-only access to network device status,
 * port configurations, VLANs, and connected clients.
 */
export interface NetworkProvider {
  /** Provider identifier (e.g., 'unifi', 'cisco') */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  /**
   * Get all network devices
   * @param options - Optional filtering/pagination
   */
  getDevices(options?: ListOptions): Promise<Device[]>;

  /**
   * Get a specific device by ID
   * @param id - Device identifier
   */
  getDevice(id: string): Promise<Device>;

  /**
   * Get ports on a device
   * @param deviceId - Device identifier
   */
  getPorts(deviceId: string): Promise<Port[]>;

  /**
   * Get a specific port
   * @param deviceId - Device identifier
   * @param portId - Port identifier
   */
  getPort(deviceId: string, portId: string): Promise<Port>;

  /**
   * Get all VLANs
   */
  getVLANs(): Promise<VLAN[]>;

  /**
   * Get a specific VLAN
   * @param id - VLAN ID
   */
  getVLAN(id: number): Promise<VLAN>;

  /**
   * Get connected clients
   * @param options - Optional filtering
   */
  getClients(options?: ClientOptions): Promise<Client[]>;

  /**
   * Get a specific client by MAC
   * @param mac - MAC address
   */
  getClient(mac: string): Promise<Client>;

  /**
   * Check network health
   */
  healthCheck(): Promise<NetworkHealth>;
}
