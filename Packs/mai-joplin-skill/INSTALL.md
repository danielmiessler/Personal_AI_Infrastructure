# Joplin Skill Installation

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Joplin Desktop** running with Web Clipper enabled
- **macOS** (for Keychain authentication)
- **PAI directory** set (`$PAI_DIR` or default `~/.config/pai`)

---

## Pre-Installation: System Analysis

### Step 0.1: Check Environment

```bash
# Check PAI_DIR
echo "PAI_DIR: ${PAI_DIR:-$HOME/.config/pai}"

# Check if Joplin is running
curl -s http://localhost:41184/ping && echo " - Joplin is running" || echo " - Joplin NOT running"

# Check for existing Joplin skill
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK/skills/Joplin" ]; then
  echo "⚠️  Existing Joplin skill found at $PAI_CHECK/skills/Joplin"
else
  echo "✓ No existing Joplin skill (clean install)"
fi
```

### Step 0.2: Check Keychain Token

```bash
# Check if token exists
security find-generic-password -s "joplin-token" -a "claude-code" -w 2>/dev/null && echo "✓ Token found in Keychain" || echo "⚠️  Token NOT in Keychain - setup required"
```

---

## Step 1: Set Up Joplin API Token

1. Open Joplin Desktop
2. Go to: **Tools → Options → Web Clipper**
3. Enable: **Enable Web Clipper Service**
4. Go to: **Advanced Options**
5. Copy the **Authorization Token**
6. Store in Keychain:

```bash
security add-generic-password -s "joplin-token" -a "claude-code" -w "<paste-your-token>"
```

---

## Step 2: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

mkdir -p "$PAI_DIR/skills/Joplin/Tools"
mkdir -p "$PAI_DIR/skills/Joplin/Workflows"
mkdir -p "$PAI_DIR/skills/Joplin/Tests"
```

---

## Step 3: Copy Files

Copy all files from this pack to the skill directory:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
PACK_DIR="$(dirname "$0")"  # Or the path to this pack

# Copy skill definition
cp "$PACK_DIR/SKILL.md" "$PAI_DIR/skills/Joplin/"

# Copy tools
cp "$PACK_DIR/Tools/"*.ts "$PAI_DIR/skills/Joplin/Tools/"

# Copy workflows
cp "$PACK_DIR/Workflows/"*.md "$PAI_DIR/skills/Joplin/Workflows/"

# Copy config files
cp "$PACK_DIR/package.json" "$PAI_DIR/skills/Joplin/"
cp "$PACK_DIR/tsconfig.json" "$PAI_DIR/skills/Joplin/"
```

**Manual alternative:** Copy each file from this pack's directories to the corresponding location under `$PAI_DIR/skills/Joplin/`.

---

## Step 4: Install Dependencies

```bash
cd "$PAI_DIR/skills/Joplin"
bun install
```

---

## Step 5: Verify Installation

Run the verification checklist in VERIFY.md, or quick test:

```bash
# Test connection
bun run "$PAI_DIR/skills/Joplin/Tools/Ping.ts"

# Expected output:
# { "status": "ok", "message": "Joplin is running and accessible" }
```

---

## Troubleshooting

### "Joplin not running at localhost:41184"

1. Ensure Joplin Desktop is running
2. Enable Web Clipper: Tools → Options → Web Clipper → Enable
3. Check port: default is 41184

### "Failed to retrieve API token from keychain"

1. Verify token is stored:
```bash
security find-generic-password -s "joplin-token" -a "claude-code"
```

2. Re-add if missing:
```bash
security add-generic-password -s "joplin-token" -a "claude-code" -w "<your-token>"
```

### "Invalid note ID"

Joplin IDs are 32-character hex strings. Use search to find the correct ID:
```bash
bun run Search.ts find_notes "note title"
```

---

## File Locations

After installation:

```
$PAI_DIR/skills/Joplin/
├── SKILL.md
├── package.json
├── tsconfig.json
├── Tools/
│   ├── Client.ts
│   ├── Ping.ts
│   ├── Notes.ts
│   ├── Notebooks.ts
│   ├── Tags.ts
│   ├── Search.ts
│   └── Links.ts
├── Workflows/
│   ├── TaskManagement.md
│   ├── ContextLoading.md
│   ├── QuickCapture.md
│   ├── NoteOrganization.md
│   └── SearchDiscovery.md
└── Tests/
    └── Integration.test.ts
```
