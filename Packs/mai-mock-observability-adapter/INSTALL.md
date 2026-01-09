# Mock Observability Adapter Installation

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **mai-observability-core** pack installed (sibling directory)
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Verify Core Dependency

The mock adapter requires `mai-observability-core` to be available:

```bash
PACKS_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs"

# Check if mai-observability-core exists
if [ -d "$PACKS_DIR/mai-observability-core" ]; then
  echo "mai-observability-core found"
else
  echo "WARNING: mai-observability-core not found - install it first"
fi
```

---

## Step 2: Copy Pack Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_SRC="/path/to/mai-mock-observability-adapter"  # Update this path

# Create destination
mkdir -p "$PAI_DIR/Packs/mai-mock-observability-adapter"

# Copy all files
cp -r "$PACK_SRC"/* "$PAI_DIR/Packs/mai-mock-observability-adapter/"
```

---

## Step 3: Install Dependencies

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-observability-adapter"
bun install
```

---

## Step 4: Verify TypeScript

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-observability-adapter"
bun run typecheck
```

---

## Step 5: Verify Installation

See VERIFY.md for the full verification checklist, or run a quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-observability-adapter"
bun test
```

Quick smoke test:

```bash
cd "$PAI_DIR/Packs/mai-mock-observability-adapter"
bun -e '
import { MockObservabilityAdapter } from "./src/index.ts";

const adapter = new MockObservabilityAdapter();

// Set a metric
adapter.setMetricValue("up", 1, { job: "prometheus" });

// Query metrics
const result = await adapter.instantQuery("up");
console.log("Metrics:", result.samples?.length === 1 ? "OK" : "FAILED");

// Add an alert
adapter.addAlert({
  name: "TestAlert",
  state: "firing",
  labels: { severity: "warning" },
  annotations: { summary: "Test" },
  fingerprint: "abc123"
});

// List alerts
const alerts = await adapter.listAlerts({ state: "firing" });
console.log("Alerts:", alerts.length === 1 ? "OK" : "FAILED");

// Health check
const health = await adapter.healthCheck();
console.log("Health:", health.healthy ? "OK" : "FAILED");
'
```

---

## Optional: Configure in providers.yaml

To use the mock adapter as a primary or fallback provider:

```yaml
# ~/.config/pai/providers.yaml or ./providers.yaml
version: "1.0"
domains:
  observability:
    primary: mock
    adapters:
      mock:
        simulateLatency: 50
        failureRate: 0
```

---

## Troubleshooting

### "Cannot find package mai-observability-core"

The mock adapter depends on `mai-observability-core`. Ensure it exists as a sibling pack:

```bash
ls -la "$PAI_DIR/Packs/mai-observability-core"
```

If missing, install `mai-observability-core` first.

### TypeScript errors on import

Ensure `bun install` completed successfully. The package uses file-based linking to the core package.

```bash
cd "$PAI_DIR/Packs/mai-mock-observability-adapter"
rm -rf node_modules bun.lock
bun install
```

### Testing with failure/latency simulation

The adapter supports configurable failure rates and latency:

```typescript
const adapter = new MockObservabilityAdapter();

// Simulate latency
adapter.setLatency(100);  // 100ms delay

// Simulate failures
adapter.setFailureRate(50);  // 50% failure rate
```

Note: Health checks never fail even with high failure rates configured.

---

## File Locations

After installation:

```
$PAI_DIR/Packs/mai-mock-observability-adapter/
  adapter.yaml
  package.json
  tsconfig.json
  README.md
  INSTALL.md
  VERIFY.md
  src/
    index.ts
    MockObservabilityAdapter.ts
  tests/
    MockObservabilityAdapter.test.ts
```
