# mai-observability-core Installation

Core interfaces and utilities for the PAI Observability domain. This package provides the `ObservabilityProvider` interface, type definitions, adapter discovery, and error handling utilities.

## Prerequisites

- Bun runtime (v1.0+)
- TypeScript 5.x
- An observability adapter (e.g., `mai-prometheus-adapter`)

---

## Step 1: Install the Package

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACKS_DIR="$PAI_DIR/packs"

# Create packs directory if needed
mkdir -p "$PACKS_DIR"

# Clone or copy the pack
cp -r /path/to/mai-observability-core "$PACKS_DIR/"

# Install dependencies
cd "$PACKS_DIR/mai-observability-core"
bun install
```

---

## Step 2: Install an Adapter

The core package requires at least one adapter implementation. Install your preferred adapter:

```bash
# For Prometheus/Alertmanager
cd "$PACKS_DIR/mai-prometheus-adapter"
bun install

# For testing/development
cd "$PACKS_DIR/mai-mock-observability-adapter"
bun install
```

---

## Step 3: Configure providers.yaml

Create or update `${PAI_DIR:-$HOME/.config/pai}/providers.yaml`:

```yaml
domains:
  observability:
    primary: prometheus
    adapters:
      prometheus:
        prometheusUrl: http://prometheus:9090
        alertmanagerUrl: http://alertmanager:9093  # optional
        timeout: 30
```

Available adapters:

| Adapter | Package | Description |
|---------|---------|-------------|
| prometheus | mai-prometheus-adapter | Prometheus + Alertmanager |
| mock | mai-mock-observability-adapter | Testing mock |

---

## Step 4: Verify Installation

See `VERIFY.md` for the complete verification checklist, or run the quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="$PAI_DIR/packs/mai-observability-core"

cd "$PACK_DIR"

# Check TypeScript compilation
bun run typecheck

# Verify exports work
bun -e "
import {
  getObservabilityProvider,
  ObservabilityError,
  withRetry,
  discoverAdapters
} from './src/index.ts';
console.log('All exports OK');
"
```

---

## Troubleshooting

### TypeScript compilation errors

Ensure all dependencies are installed:

```bash
cd "${PAI_DIR:-$HOME/.config/pai}/packs/mai-observability-core"
bun install
```

### "Adapter not found" error

1. Verify your adapter package is installed
2. Check that `providers.yaml` references a valid adapter name
3. Ensure adapter's `adapter.yaml` manifest exists

### "Configuration not found" error

The config loader checks these paths in order:
1. `$PROVIDERS_CONFIG` environment variable
2. `./providers.yaml` (current directory)
3. `~/.config/pai/providers.yaml`
4. `/etc/pai/providers.yaml`

Create the config file in one of these locations.

---

## File Locations

After installation, the directory structure should look like:

```
${PAI_DIR:-$HOME/.config/pai}/
  providers.yaml              # Domain configuration
  packs/
    mai-observability-core/
      package.json
      tsconfig.json
      README.md
      VERIFY.md
      INSTALL.md
      src/
        index.ts              # Main exports
        interfaces/
          ObservabilityProvider.ts
          index.ts
        types/
          metrics.ts
          alerts.ts
          targets.ts
          index.ts
        discovery/
          adapters.ts
          config.ts
          provider.ts
          index.ts
        utils/
          errors.ts
          retry.ts
          logger.ts
          index.ts
```

---

## Next Steps

1. Install an adapter (see `mai-prometheus-adapter/INSTALL.md`)
2. Install the skill for CLI tools (see `mai-observability-skill/INSTALL.md`)
3. Configure your monitoring backend URLs in `providers.yaml`
