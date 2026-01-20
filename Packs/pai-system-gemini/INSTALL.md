# Installation Instructions

> **FOR AI AGENTS:** Follow these steps to install the PAI System Gemini pack.

### Prerequisites

- **Node.js**: v18+ (for running the adapter)
- **npm**: Installed
- **Gemini CLI**: Installed and authenticated
- **PAI Core**: `~/.claude` directory must exist (or `PAI_DIR`)

---

### Pre-Installation: System Analysis

**Step 0: Check Environment**

```bash
# 1. Check PAI_DIR
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
if [ ! -d "$PAI_DIR" ]; then
  echo "❌ PAI Core not found at $PAI_DIR. Please install pai-core-install first."
  exit 1
fi

# 2. Check Gemini CLI
if ! command -v gemini &> /dev/null; then
  echo "⚠️  Gemini CLI not found. Please install it first."
fi

# 3. Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required but not found."
  exit 1
fi
```

---

### Step 1: Install Pack Files

Copy the source files to your PAI installation.

```bash
# Define pack root in PAI
PACK_DIR="$PAI_DIR/Packs/pai-system-gemini"
mkdir -p "$PACK_DIR/src/hooks"
mkdir -p "$PACK_DIR/src/scripts"
mkdir -p "$PACK_DIR/dist"

# Copy files (AI Agent: Use write_file or cp)
# Copying adapter.ts -> $PACK_DIR/src/hooks/adapter.ts
# Copying gemini-wrapper.sh -> $PACK_DIR/src/scripts/gemini-wrapper.sh
```

### Step 2: Build the Adapter

The adapter is written in TypeScript and needs to be compiled.

```bash
cd "$PACK_DIR"

# Initialize package.json if missing (simplified)
if [ ! -f "package.json" ]; then
  echo '{"name":"pai-system-gemini","version":"0.1.0-alpha.1"}' > package.json
fi

# Install dependencies
npm install --save-dev typescript @types/node
npm install --save undici-types

# Build
npx tsc src/hooks/adapter.ts --outDir dist --esModuleInterop
```

### Step 3: Configure Gemini Hooks

We need to tell Gemini to use our adapter.

**File:** `~/.gemini/settings.json`

```javascript
// This logic should be executed to merge settings
const fs = require('fs');
const os = require('os');
const path = require('path');

const GEMINI_SETTINGS = path.join(os.homedir(), '.gemini', 'settings.json');
const ADAPTER_PATH = path.join(
  process.env.PAI_DIR || path.join(os.homedir(), '.claude'),
  'Packs',
  'pai-system-gemini',
  'dist',
  'adapter.js',
);
const NODE_PATH = process.execPath; // Use current node executable

let settings = {};
if (fs.existsSync(GEMINI_SETTINGS)) {
  try {
    settings = JSON.parse(fs.readFileSync(GEMINI_SETTINGS, 'utf-8'));
  } catch (e) {}
}

const hookConfig = {
  type: 'command',
  command: `${NODE_PATH} ${ADAPTER_PATH}`,
};

settings.hooks = {
  ...(settings.hooks || {}),
  SessionStart: [hookConfig],
  BeforeTool: [hookConfig],
  AfterTool: [hookConfig],
  BeforeAgent: [hookConfig],
};

if (!fs.existsSync(path.dirname(GEMINI_SETTINGS))) {
  fs.mkdirSync(path.dirname(GEMINI_SETTINGS), { recursive: true });
}

fs.writeFileSync(GEMINI_SETTINGS, JSON.stringify(settings, null, 2));
console.log('✅ Gemini hooks configured.');
```

---

### Step 4: Verify Installation

Follow the steps in [VERIFY.md](VERIFY.md).
