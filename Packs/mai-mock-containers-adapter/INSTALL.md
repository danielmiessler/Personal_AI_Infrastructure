# Mock Containers Adapter Installation

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **mai-containers-core** pack installed (sibling directory)
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Step 1: Verify Core Dependency

The mock adapter requires `mai-containers-core` to be available:

```bash
PACKS_DIR="${PAI_DIR:-$HOME/.config/pai}/Packs"

# Check if mai-containers-core exists
if [ -d "$PACKS_DIR/mai-containers-core" ]; then
  echo "mai-containers-core found"
else
  echo "WARNING: mai-containers-core not found - install it first"
fi
```

---

## Step 2: Copy Pack Files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_SRC="/path/to/mai-mock-containers-adapter"  # Update this path

# Create destination
mkdir -p "$PAI_DIR/Packs/mai-mock-containers-adapter"

# Copy all files
cp -r "$PACK_SRC"/* "$PAI_DIR/Packs/mai-mock-containers-adapter/"
```

---

## Step 3: Install Dependencies

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-containers-adapter"
bun install
```

---

## Step 4: Verify TypeScript

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-containers-adapter"
bun run typecheck
```

---

## Step 5: Verify Installation

See VERIFY.md for the full verification checklist, or run a quick test:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
cd "$PAI_DIR/Packs/mai-mock-containers-adapter"
bun test
```

Quick smoke test:

```bash
cd "$PAI_DIR/Packs/mai-mock-containers-adapter"
bun -e '
import { MockPlatformAdapter } from "./src/index.ts";

const adapter = new MockPlatformAdapter();
adapter.addNamespace({ name: "default", status: "active" });

const health = await adapter.healthCheck();
console.log("Health:", health.healthy ? "OK" : "FAILED");

const namespaces = await adapter.listNamespaces();
console.log("Namespaces:", namespaces.length === 1 ? "OK" : "FAILED");
'
```

---

## Troubleshooting

### "Cannot find package mai-containers-core"

The mock adapter depends on `mai-containers-core`. Ensure it exists as a sibling pack:

```bash
ls -la "$PAI_DIR/Packs/mai-containers-core"
```

If missing, install `mai-containers-core` first.

### TypeScript errors on import

Ensure `bun install` completed successfully. The package uses file-based linking to the core package.

```bash
cd "$PAI_DIR/Packs/mai-mock-containers-adapter"
rm -rf node_modules bun.lock
bun install
```

---

## File Locations

After installation:

```
$PAI_DIR/Packs/mai-mock-containers-adapter/
  adapter.yaml
  package.json
  tsconfig.json
  README.md
  INSTALL.md
  VERIFY.md
  src/
    index.ts
    MockPlatformAdapter.ts
  tests/
    MockPlatformAdapter.test.ts
```
