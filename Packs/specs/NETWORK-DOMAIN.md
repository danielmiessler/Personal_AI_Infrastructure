# Network Domain Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-07
**Phase**: 2

---

## Overview

The Network domain provides unified access to network infrastructure across multiple vendors and platforms. It enables querying device status, port configurations, VLANs, and connected clients from both home (UniFi) and enterprise (Cisco) environments.

### Goals

1. **Portability**: Same interface works at home (UniFi) and work (Cisco)
2. **Read-Only**: Query-only operations for safety
3. **Health Monitoring**: Quick status checks across all network gear
4. **Client Visibility**: See what's connected where

### Non-Goals

1. Configuration changes (too risky for automation)
2. Firmware management
3. Real-time packet analysis
4. Spanning tree manipulation

---

## Interface Design

### NetworkProvider Interface

```typescript
interface NetworkProvider {
  readonly name: string;
  readonly version: string;

  // Device operations
  getDevices(options?: ListOptions): Promise<Device[]>;
  getDevice(id: string): Promise<Device>;

  // Port operations
  getPorts(deviceId: string): Promise<Port[]>;
  getPort(deviceId: string, portId: string): Promise<Port>;

  // VLAN operations
  getVLANs(): Promise<VLAN[]>;
  getVLAN(id: number): Promise<VLAN>;

  // Client operations
  getClients(options?: ClientOptions): Promise<Client[]>;
  getClient(mac: string): Promise<Client>;

  // Health
  healthCheck(): Promise<NetworkHealth>;
}
```

### Device Interface

```typescript
interface Device {
  id: string;
  hostname: string;
  model: string;
  type: DeviceType;
  ip: string;
  mac: string;
  status: DeviceStatus;
  uptime?: number;
  firmware?: string;
  portCount?: number;
  metadata?: Record<string, unknown>;
}

type DeviceType = 'switch' | 'router' | 'access_point' | 'gateway' | 'firewall' | 'other';
type DeviceStatus = 'online' | 'offline' | 'degraded' | 'unknown';
```

### Port Interface

```typescript
interface Port {
  id: string;
  name: string;
  deviceId: string;
  speed: PortSpeed;
  duplex: 'full' | 'half' | 'auto';
  status: PortStatus;
  vlan?: number;
  poeEnabled?: boolean;
  poeWatts?: number;
  bytesIn?: number;
  bytesOut?: number;
  errors?: number;
}

type PortSpeed = '10M' | '100M' | '1G' | '2.5G' | '5G' | '10G' | '25G' | '40G' | '100G' | 'auto';
type PortStatus = 'up' | 'down' | 'disabled' | 'error';
```

### VLAN Interface

```typescript
interface VLAN {
  id: number;
  name: string;
  subnet?: string;
  gateway?: string;
  dhcpEnabled?: boolean;
  purpose?: string;
}
```

### Client Interface

```typescript
interface Client {
  mac: string;
  ip?: string;
  hostname?: string;
  manufacturer?: string;
  deviceId: string;
  portId?: string;
  vlan?: number;
  connectedAt?: Date;
  rxBytes?: number;
  txBytes?: number;
  rssi?: number; // For wireless clients
}

interface ClientOptions {
  deviceId?: string;
  vlan?: number;
  wireless?: boolean;
  wired?: boolean;
}
```

### NetworkHealth Interface

```typescript
interface NetworkHealth {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  devices: {
    total: number;
    online: number;
    offline: number;
    degraded: number;
  };
  alerts?: NetworkAlert[];
}

interface NetworkAlert {
  severity: 'critical' | 'warning' | 'info';
  device?: string;
  message: string;
  timestamp: Date;
}
```

---

## Adapters

### kai-unifi-adapter

**Purpose**: UniFi Controller integration for home network

**Configuration**:
```yaml
adapters:
  unifi:
    url: https://192.168.1.1
    auth:
      type: keychain
      service: unifi-controller
    site: default
    verifySSL: false
```

**Capabilities**:
- Full device inventory (USW, UAP, UDM, etc.)
- Port status and PoE monitoring
- Wireless client tracking
- VLAN configuration read

**Authentication**:
- Local admin credentials
- Stored in keychain for security

### kai-cisco-adapter

**Purpose**: Cisco IOS/NX-OS integration for enterprise

**Configuration**:
```yaml
adapters:
  cisco:
    auth:
      type: keychain
      service: cisco-ssh
    devices:
      - host: 10.0.0.1
        type: switch
      - host: 10.0.0.2
        type: router
```

**Capabilities**:
- Device status via SSH or SNMP
- Interface status parsing
- VLAN database read
- CDP/LLDP neighbor discovery

**Authentication**:
- SSH key or password
- SNMP community string (optional)

### kai-mock-network-adapter

**Purpose**: Testing and development

**Features**:
- Pre-populated device topology
- Simulated latency
- Configurable failures
- Test fixtures for common scenarios

---

## Error Handling

### Error Classes

```typescript
class NetworkError extends Error {
  constructor(message: string, code: string, device?: string);
}

class DeviceNotFoundError extends NetworkError {
  constructor(deviceId: string);
}

class DeviceUnreachableError extends NetworkError {
  constructor(deviceId: string, reason?: string);
}

class AuthenticationError extends NetworkError {
  constructor(message: string, device?: string);
}

class ConnectionError extends NetworkError {
  constructor(message: string, device?: string);
}
```

---

## CLI Tools

### devices.ts

```bash
# List all devices
bun run devices.ts

# Get specific device
bun run devices.ts --id USW-24-POE

# Filter by type
bun run devices.ts --type switch

# JSON output
bun run devices.ts --json
```

### clients.ts

```bash
# List all clients
bun run clients.ts

# Filter by device
bun run clients.ts --device USW-24-POE

# Wireless only
bun run clients.ts --wireless

# Filter by VLAN
bun run clients.ts --vlan 10
```

### vlans.ts

```bash
# List all VLANs
bun run vlans.ts

# Get specific VLAN
bun run vlans.ts --id 10
```

### ports.ts

```bash
# List ports on device
bun run ports.ts USW-24-POE

# Get specific port
bun run ports.ts USW-24-POE --port 1
```

### health.ts

```bash
# Check overall health
bun run health.ts

# Check specific adapter
bun run health.ts --adapter unifi
```

---

## Workflows

### ListDevices

**Trigger**: "What devices are on my network?", "Show network devices"

**Process**:
1. Get all devices from provider
2. Group by type (switches, APs, routers)
3. Show status summary

### GetDeviceDetails

**Trigger**: "Show me the living room switch", "Details for USW-24"

**Process**:
1. Find device by name or ID
2. Get port status
3. Show connected clients

### FindClient

**Trigger**: "Where is Joey's laptop?", "Find device with MAC xx:xx:xx"

**Process**:
1. Search clients by hostname or MAC
2. Show connected device and port
3. Show VLAN assignment

### NetworkHealth

**Trigger**: "Is the network healthy?", "Any network issues?"

**Process**:
1. Check all devices
2. Report offline/degraded devices
3. Show any alerts

---

## Security Considerations

1. **Credentials**: Stored in keychain, never in config files
2. **Read-Only**: No configuration changes allowed
3. **Network Segmentation**: Adapters only access management interfaces
4. **Logging**: Never log credentials or sensitive device details
5. **Timeout**: Connection timeouts prevent hanging on unreachable devices

---

## Implementation Phases

### Phase 2.1: kai-network-core
- NetworkProvider interface
- Device, Port, VLAN, Client types
- Error classes
- Discovery/config loading

### Phase 2.2: kai-unifi-adapter
- UniFi Controller API integration
- All provider methods
- Tests with mock responses

### Phase 2.3: kai-cisco-adapter
- SSH-based CLI parsing
- Interface status parsing
- VLAN database read

### Phase 2.4: kai-mock-network-adapter
- Test fixtures
- Simulated topology

### Phase 2.5: kai-network-skill
- SKILL.md
- CLI tools
- Workflows

---

## Testing Strategy

1. **Unit Tests**: Interface compliance, error handling
2. **Mock Tests**: API response parsing, data transformation
3. **Integration Tests**: skill → core → adapter flow
4. **Manual Tests**: Real device connectivity (home lab)

---

## Future Considerations

1. **Meraki Adapter**: Cloud-managed Cisco for work
2. **Topology Visualization**: Generate network diagrams
3. **Alerting Integration**: Push alerts to Joplin/Slack
4. **Historical Data**: Track uptime and performance
