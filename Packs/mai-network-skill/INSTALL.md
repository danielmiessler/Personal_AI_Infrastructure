# Network Skill Installation

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **mai-network-core** pack installed (sibling directory)
- **A network adapter** installed:
  - `mai-unifi-adapter` for UniFi controllers
  - `mai-cisco-adapter` for Cisco equipment
  - `mai-mock-network-adapter` for testing
- **providers.yaml** configured for network domain
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Verify Dependencies

```bash
PACKS_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs"

# Check mai-network-core
if [ -d "$PACKS_DIR/mai-network-core" ]; then
  echo "mai-network-core: found"
else
  echo "mai-network-core: MISSING - install first"
fi

# Check for at least one adapter
if [ -d "$PACKS_DIR/mai-unifi-adapter" ] || [ -d "$PACKS_DIR/mai-mock-network-adapter" ]; then
  echo "Network adapter: found"
else
  echo "Network adapter: MISSING - install mai-unifi-adapter or mai-mock-network-adapter"
fi
```

---

## Step 2: Copy Pack Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_SRC="/path/to/mai-network-skill"  # Update this path

# Create destination
mkdir -p "$PAI_DIR/Packs/mai-network-skill"

# Copy all files
cp -r "$PACK_SRC"/* "$PAI_DIR/Packs/mai-network-skill/"
```

---

## Step 3: Install Dependencies

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-network-skill"
bun install
```

---

## Step 4: Configure providers.yaml

Create or update your providers.yaml:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

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
        devices: 5
        clientsPerDevice: 10
EOF
```

For UniFi, store credentials in Keychain:

```bash
# Store UniFi credentials
security add-generic-password -s "unifi-controller" -a "admin" -w "your-password"
```

For testing only (mock adapter):

```bash
cat > "$PAI_DIR/Packs/mai-network-skill/providers.yaml" << 'EOF'
version: "1.0"
domains:
  network:
    primary: mock
    adapters:
      mock:
        devices: 3
        clientsPerDevice: 5
EOF
```

---

## Step 5: Verify Installation

See VERIFY.md for the full verification checklist, or run a quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-network-skill"
bun test
```

Test CLI tools:

```bash
cd "$PAI_DIR/Packs/mai-network-skill"

# List devices
bun run devices

# Check health
bun run health

# List clients
bun run clients

# List VLANs
bun run vlans
```

---

## Step 6: Register Skill (Optional)

To make the skill available to PAI:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Copy SKILL.md to skills directory
mkdir -p "$PAI_DIR/skills/Network"
cp "$PAI_DIR/Packs/mai-network-skill/SKILL.md" "$PAI_DIR/skills/Network/"
cp -r "$PAI_DIR/Packs/mai-network-skill/Tools" "$PAI_DIR/skills/Network/"
cp -r "$PAI_DIR/Packs/mai-network-skill/Workflows" "$PAI_DIR/skills/Network/"
```

---

## Troubleshooting

### "Cannot find package mai-network-core"

Install the core package first:

```bash
ls -la "$PAI_DIR/Packs/mai-network-core"
```

### "No adapters found for network domain"

Ensure at least one network adapter is installed and has a valid `adapter.yaml`:

```bash
ls "$PAI_DIR/Packs/mai-unifi-adapter/adapter.yaml" 2>/dev/null || \
ls "$PAI_DIR/Packs/mai-mock-network-adapter/adapter.yaml" 2>/dev/null || \
echo "No network adapters found"
```

### "Config not found" or adapter errors

Verify `providers.yaml` exists and is valid:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

# Check locations
for f in "./providers.yaml" "$PAI_DIR/providers.yaml" "$HOME/.config/pai/providers.yaml"; do
  if [ -f "$f" ]; then
    echo "Found: $f"
    cat "$f"
  fi
done
```

### UniFi connection refused

1. Verify UniFi controller is accessible
2. Check URL in providers.yaml
3. Verify credentials in Keychain:

```bash
security find-generic-password -s "unifi-controller" -a "admin"
```

---

## File Locations

After installation:

```
$PAI_DIR/Packs/mai-network-skill/
  package.json
  README.md
  SKILL.md
  INSTALL.md
  VERIFY.md
  providers.yaml
  Tools/
    devices.ts
    clients.ts
    vlans.ts
    ports.ts
    health.ts
  Workflows/
    NetworkStatus.md
    DeviceAudit.md
    ClientReport.md
  tests/
    cli.test.ts

$PAI_DIR/skills/Network/  (after skill registration)
  SKILL.md
  Tools/
    devices.ts
    clients.ts
    vlans.ts
    ports.ts
    health.ts
  Workflows/
    NetworkStatus.md
    DeviceAudit.md
    ClientReport.md
```
