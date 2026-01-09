# Mock Network Adapter Installation

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **mai-network-core** pack installed (sibling directory)
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Verify Core Dependency

The mock adapter requires `mai-network-core` to be available:

```bash
PACKS_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs"

# Check if mai-network-core exists
if [ -d "$PACKS_DIR/mai-network-core" ]; then
  echo "mai-network-core found"
else
  echo "WARNING: mai-network-core not found - install it first"
fi
```

---

## Step 2: Copy Pack Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_SRC="/path/to/mai-mock-network-adapter"  # Update this path

# Create destination
mkdir -p "$PAI_DIR/Packs/mai-mock-network-adapter"

# Copy all files
cp -r "$PACK_SRC"/* "$PAI_DIR/Packs/mai-mock-network-adapter/"
```

---

## Step 3: Install Dependencies

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-network-adapter"
bun install
```

---

## Step 4: Verify TypeScript

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-network-adapter"
bun run typecheck
```

---

## Step 5: Verify Installation

See VERIFY.md for the full verification checklist, or run a quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-network-adapter"
bun test
```

Quick smoke test:

```bash
cd "$PAI_DIR/Packs/mai-mock-network-adapter"
bun -e '
import MockNetworkAdapter from "./src/index.ts";

const adapter = new MockNetworkAdapter({ devices: 3 });

// List devices
const devices = await adapter.getDevices();
console.log("Devices:", devices.length === 3 ? "OK" : "FAILED");

// Get VLANs
const vlans = await adapter.getVLANs();
console.log("VLANs:", vlans.length > 0 ? "OK" : "FAILED");

// Health check
const health = await adapter.healthCheck();
console.log("Health:", health.healthy ? "OK" : "FAILED");
'
```

---

## Optional: Configure in providers.yaml

To use the mock adapter as a fallback or primary provider:

```yaml
# ~/.config/pai/providers.yaml or ./providers.yaml
version: "1.0"
domains:
  network:
    primary: unifi
    fallback: mock
    adapters:
      mock:
        devices: 5
        clientsPerDevice: 10
        latencyMs: 0
        failureRate: 0
```

---

## Troubleshooting

### "Cannot find package mai-network-core"

The mock adapter depends on `mai-network-core`. Ensure it exists as a sibling pack:

```bash
ls -la "$PAI_DIR/Packs/mai-network-core"
```

If missing, install `mai-network-core` first.

### TypeScript errors on import

Ensure `bun install` completed successfully. The package uses file-based linking to the core package.

```bash
cd "$PAI_DIR/Packs/mai-mock-network-adapter"
rm -rf node_modules bun.lock
bun install
```

### Testing with failure simulation

The adapter supports configurable failure rates and latency for testing error handling:

```typescript
const adapter = new MockNetworkAdapter({
  failureRate: 0.1,  // 10% failure rate
  latencyMs: 100     // 100ms delay
});

// Or configure dynamically
adapter.setFailureRate(0.5);
adapter.setLatency(500);
```

---

## File Locations

After installation:

```
$PAI_DIR/Packs/mai-mock-network-adapter/
  adapter.yaml
  package.json
  tsconfig.json
  README.md
  INSTALL.md
  VERIFY.md
  src/
    index.ts
    MockNetworkAdapter.ts
  tests/
    MockNetworkAdapter.test.ts
```
