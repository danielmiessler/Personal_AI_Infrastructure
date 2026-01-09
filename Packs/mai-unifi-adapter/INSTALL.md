# mai-unifi-adapter Installation

UniFi Network Controller adapter for the PAI Infrastructure Pack System, implementing the `NetworkProvider` interface from `mai-network-core`.

## Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- UniFi Controller access:
  - UniFi OS (UDM, UDM Pro, UDR, UDM SE), or
  - Classic UniFi Controller (Cloud Key Gen1, self-hosted)
- Network access to the controller's API
- Admin credentials for the controller

---

## Step 1: Install the Adapter

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

cd ~/PAI/Packs/mai-unifi-adapter
bun install
```

---

## Step 2: Configure Authentication

Choose one of the following authentication methods:

### Option A: macOS Keychain (Recommended)

Store credentials securely in the system keychain:

```bash
# Store UniFi credentials
security add-generic-password -s unifi-controller -a admin -w 'your-password'
```

Configuration:
```yaml
auth:
  type: keychain
  service: unifi-controller
```

### Option B: Environment Variables

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc)
export UNIFI_USER="admin"
export UNIFI_PASS="your-password"
```

Configuration:
```yaml
auth:
  type: env
  var: UNIFI_USER:UNIFI_PASS
```

### Option C: Direct Credentials (Development Only)

**Warning:** Not recommended for production use.

```yaml
auth:
  type: direct
  username: admin
  password: your-password
```

---

## Step 3: Create providers.yaml

Create the providers configuration file:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
mkdir -p "$PAI_DIR/config"
```

Create `$PAI_DIR/config/providers.yaml`:

```yaml
domains:
  network:
    primary: unifi
    adapters:
      unifi:
        url: https://192.168.1.1        # Your controller IP/hostname
        site: default                    # UniFi site name (usually "default")
        timeout: 30000                   # API timeout in milliseconds
        verifySSL: false                 # Set true if using valid SSL cert
        auth:
          type: keychain                 # keychain | env | direct
          service: unifi-controller      # Keychain service name
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `url` | UniFi controller URL (including https://) | Required |
| `site` | UniFi site name | `default` |
| `timeout` | API request timeout (ms) | `30000` |
| `verifySSL` | Verify SSL certificate | `false` |

**Note:** Self-signed certificates are common on UniFi controllers. Set `verifySSL: false` unless you've installed a valid certificate.

---

## Step 4: Verify Installation

Reference the full verification checklist in [VERIFY.md](VERIFY.md) or run the quick verification:

```bash
cd ~/PAI/Packs/mai-unifi-adapter

# Run unit tests
bun test
```

Expected: 22 tests pass.

### Manual Connection Test

```bash
cd ~/PAI/Packs/mai-unifi-adapter

bun -e "
import UnifiAdapter from './src/UnifiAdapter.ts';

const adapter = new UnifiAdapter({
  url: 'https://192.168.1.1',  // Your controller URL
  auth: { type: 'keychain', service: 'unifi-controller' }
});

const health = await adapter.healthCheck();
console.log('Health Check:', health);

if (health.healthy) {
  const devices = await adapter.getDevices();
  console.log('Devices found:', devices.length);
}
"
```

---

## Step 5: Test API Access

Once configured, test the adapter through the network provider interface:

```typescript
import { getNetworkProvider } from 'mai-network-core';

const provider = await getNetworkProvider({ adapter: 'unifi' });

// Health check
const health = await provider.healthCheck();
console.log(`Controller: ${health.healthy ? 'OK' : health.message}`);

// List devices
const devices = await provider.getDevices();
for (const device of devices) {
  console.log(`${device.name} (${device.type}): ${device.status}`);
}

// List clients
const clients = await provider.getClients();
console.log(`Total clients: ${clients.length}`);
```

---

## Troubleshooting

### "Authentication failed"

**Symptom:** `AuthenticationError` when connecting.

**Solutions:**
1. Verify credentials are correct:
   ```bash
   # Test keychain entry
   security find-generic-password -s unifi-controller -a admin -w
   ```
2. Check username matches controller admin account
3. Ensure the account has API access (some local-only accounts may not)

### "Connection refused" or timeout

**Symptom:** Cannot connect to controller.

**Solutions:**
1. Verify controller URL is correct and includes `https://`
2. Check network connectivity:
   ```bash
   curl -k https://192.168.1.1
   ```
3. Ensure no firewall blocking the connection
4. For UDM/UDM Pro, the API port is typically 443

### "SSL certificate error"

**Symptom:** SSL/TLS handshake fails.

**Solution:** Set `verifySSL: false` in providers.yaml (unless using a valid certificate):
```yaml
verifySSL: false
```

### "Site not found"

**Symptom:** API returns 404 or site-related errors.

**Solutions:**
1. Check site name in UniFi controller (Settings > Site)
2. Most installations use `default`:
   ```yaml
   site: default
   ```
3. Multi-site controllers may need specific site name

### "Device not found" errors

**Symptom:** `DeviceNotFoundError` when querying specific device.

**Solution:** Verify the device ID format:
```typescript
// List all devices to see correct IDs
const devices = await provider.getDevices();
console.log(devices.map(d => ({ id: d.id, name: d.name })));
```

### Keychain permission denied (macOS)

**Symptom:** Cannot read from keychain.

**Solutions:**
1. Grant terminal access to keychain in System Preferences > Security & Privacy > Privacy > Full Disk Access
2. Or re-add the password allowing application access:
   ```bash
   security delete-generic-password -s unifi-controller
   security add-generic-password -s unifi-controller -a admin -w 'your-password'
   ```

---

## File Locations

After successful installation:

```
$PAI_DIR/
├── config/
│   └── providers.yaml          # Network provider configuration
└── Packs/
    └── mai-unifi-adapter/
        ├── README.md           # Documentation
        ├── VERIFY.md           # Verification checklist
        ├── INSTALL.md          # This file
        ├── adapter.yaml        # Adapter manifest
        ├── package.json        # Package configuration
        ├── tsconfig.json       # TypeScript config
        ├── src/
        │   ├── UnifiAdapter.ts # Main adapter implementation
        │   └── index.ts        # Exports
        └── tests/
            └── UnifiAdapter.test.ts
```

Where `PAI_DIR` defaults to `$HOME/.config/pai` if not set.

---

## Quick Reference

### Supported Features

| Feature | Method | Description |
|---------|--------|-------------|
| List devices | `getDevices()` | All network devices |
| Get device | `getDevice(id)` | Single device by ID |
| List ports | `getPorts(deviceId)` | Ports on a switch |
| Get port | `getPort(deviceId, portId)` | Specific port |
| List VLANs | `getVLANs()` | All configured VLANs |
| Get VLAN | `getVLAN(id)` | Specific VLAN |
| List clients | `getClients()` | All connected clients |
| Get client | `getClient(mac)` | Client by MAC address |
| Health check | `healthCheck()` | Controller status |

### Device Type Mapping

| UniFi Type | Mapped Type |
|------------|-------------|
| USW | switch |
| UGW | gateway |
| UAP | access_point |
| UXG | gateway |
| UDM | gateway |

### Error Types

```typescript
import {
  DeviceNotFoundError,
  PortNotFoundError,
  VLANNotFoundError,
  ClientNotFoundError,
  AuthenticationError,
  ConnectionError
} from 'mai-network-core';
```
