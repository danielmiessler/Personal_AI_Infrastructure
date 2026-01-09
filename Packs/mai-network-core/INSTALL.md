# Network Core Installation

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Copy Pack Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_SRC="/path/to/mai-network-core"  # Update this path

# Create destination
mkdir -p "$PAI_DIR/Packs/mai-network-core"

# Copy all files
cp -r "$PACK_SRC"/* "$PAI_DIR/Packs/mai-network-core/"
```

---

## Step 2: Install Dependencies

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-network-core"
bun install
```

---

## Step 3: Verify TypeScript

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-network-core"
bun run typecheck
```

---

## Step 4: Create providers.yaml (Optional)

If you plan to use adapters, create a `providers.yaml` configuration:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
mkdir -p "$PAI_DIR"

cat > "$PAI_DIR/providers.yaml" << 'EOF'
version: "1.0"
domains:
  network:
    primary: unifi
    fallback: mock
    adapters:
      unifi:
        url: https://192.168.1.1
        auth:
          type: keychain
          service: unifi-controller
      mock:
        devices: 3
        clientsPerDevice: 5
EOF
```

Config file search order:
1. `$PROVIDERS_CONFIG` environment variable
2. `./providers.yaml` (project root)
3. `~/.config/pai/providers.yaml` (user config)
4. `/etc/pai/providers.yaml` (system config)

---

## Step 5: Verify Installation

See VERIFY.md for the full verification checklist, or run a quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-network-core"
bun test
```

Quick smoke test:

```bash
cd "$PAI_DIR/Packs/mai-network-core"
bun -e '
import { DeviceNotFoundError, AuthenticationError, NetworkError } from "./src/index.ts";

// Test error creation
const error = new DeviceNotFoundError("test-device-123");
console.log("Error message:", error.message.includes("test-device-123") ? "OK" : "FAILED");
console.log("Error code:", error.code === "DEVICE_NOT_FOUND" ? "OK" : "FAILED");

const authError = new AuthenticationError("Invalid credentials");
console.log("Auth error:", authError instanceof NetworkError ? "OK" : "FAILED");
'
```

---

## Troubleshooting

### TypeScript compilation errors

Ensure dependencies are installed:

```bash
cd "$PAI_DIR/Packs/mai-network-core"
rm -rf node_modules bun.lock
bun install
```

### "Config not found" errors

The core package looks for `providers.yaml` in multiple locations. Create one:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
touch "$PAI_DIR/providers.yaml"
```

Or set the environment variable:

```bash
export PROVIDERS_CONFIG="/path/to/your/providers.yaml"
```

### Adapter discovery issues

Adapters are discovered by looking for `mai-*-adapter` directories with `adapter.yaml` manifests. Ensure adapters are installed in the correct location:

```bash
ls -la "$PAI_DIR/Packs/" | grep adapter
```

---

## File Locations

After installation:

```
$PAI_DIR/Packs/mai-network-core/
  package.json
  tsconfig.json
  README.md
  INSTALL.md
  VERIFY.md
  src/
    index.ts
    interfaces/
      NetworkProvider.ts
      index.ts
    types/
      index.ts
    utils/
      errors.ts
      index.ts
    discovery/
      AdapterLoader.ts
      ConfigLoader.ts
      ProviderFactory.ts
      index.ts
  tests/
    errors.test.ts
    ConfigLoader.test.ts
    AdapterLoader.test.ts
```
