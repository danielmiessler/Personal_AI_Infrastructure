# Mock Issues Adapter Installation

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **mai-issues-core** pack installed (sibling directory)
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Verify Core Dependency

The mock adapter requires `mai-issues-core` to be available:

```bash
PACKS_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs"

# Check if mai-issues-core exists
if [ -d "$PACKS_DIR/mai-issues-core" ]; then
  echo "mai-issues-core found"
else
  echo "WARNING: mai-issues-core not found - install it first"
fi
```

---

## Step 2: Copy Pack Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_SRC="/path/to/mai-mock-issues-adapter"  # Update this path

# Create destination
mkdir -p "$PAI_DIR/Packs/mai-mock-issues-adapter"

# Copy all files
cp -r "$PACK_SRC"/* "$PAI_DIR/Packs/mai-mock-issues-adapter/"
```

---

## Step 3: Install Dependencies

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-issues-adapter"
bun install
```

---

## Step 4: Verify TypeScript

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-issues-adapter"
bun run typecheck
```

---

## Step 5: Verify Installation

See VERIFY.md for the full verification checklist, or run a quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-issues-adapter"
bun test
```

Quick smoke test:

```bash
cd "$PAI_DIR/Packs/mai-mock-issues-adapter"
bun -e '
import MockIssuesAdapter from "./src/index.ts";

const adapter = new MockIssuesAdapter();

// Create a test issue
const issue = await adapter.createIssue({ title: "Test issue" });
console.log("Create:", issue.id ? "OK" : "FAILED");

// List issues
const issues = await adapter.listIssues({ status: "open" });
console.log("List:", issues.length === 1 ? "OK" : "FAILED");

// Health check
const health = await adapter.healthCheck();
console.log("Health:", health.healthy ? "OK" : "FAILED");
'
```

---

## Troubleshooting

### "Cannot find package mai-issues-core"

The mock adapter depends on `mai-issues-core`. Ensure it exists as a sibling pack:

```bash
ls -la "$PAI_DIR/Packs/mai-issues-core"
```

If missing, install `mai-issues-core` first.

### TypeScript errors on import

Ensure `bun install` completed successfully. The package uses file-based linking to the core package.

```bash
cd "$PAI_DIR/Packs/mai-mock-issues-adapter"
rm -rf node_modules bun.lock
bun install
```

### Simulating failures for testing

The adapter supports configurable failure rates and latency:

```typescript
const adapter = new MockIssuesAdapter({
  failureRate: 0.3,  // 30% failure rate
  latencyMs: 100     // 100ms delay
});
```

---

## File Locations

After installation:

```
$PAI_DIR/Packs/mai-mock-issues-adapter/
  adapter.yaml
  package.json
  tsconfig.json
  README.md
  INSTALL.md
  VERIFY.md
  src/
    index.ts
    MockIssuesAdapter.ts
  tests/
    MockIssuesAdapter.test.ts
```
