# PAI CTI Skill Installation Guide

> AI-assisted installation wizard for the Cyber Threat Intelligence skill pack

---

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **Write access** to `$PAI_DIR/` (typically `~/.claude`)
- **Recommended**: pai-knowledge-system installed (for storing intelligence)

---

## Pre-Installation: System Analysis

### Step 0.1: Detect Current Configuration

Run these commands to understand your current system:

```bash
# 1. Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.claude'}"

# 2. Check for existing PAI/skills directory
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
if [ -d "$PAI_CHECK/skills" ]; then
  echo "Skills directory EXISTS at: $PAI_CHECK/skills"
  ls -la "$PAI_CHECK/skills" 2>/dev/null
else
  echo "Skills directory does not exist (will be created)"
fi

# 3. Check for existing CTI skill
if [ -d "$PAI_CHECK/skills/cti" ]; then
  echo "WARNING: CTI skill already exists at: $PAI_CHECK/skills/cti"
else
  echo "CTI skill not installed (clean install)"
fi

# 4. Check for Bun
if command -v bun &> /dev/null; then
  echo "Bun installed: $(bun --version)"
else
  echo "ERROR: Bun not installed - run: curl -fsSL https://bun.sh/install | bash"
fi
```

### Step 0.2: Verify Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"

# Check for knowledge system (recommended)
if [ -d "$PAI_CHECK/skills/Knowledge" ] || [ -f "$PAI_CHECK/skills/Knowledge/SKILL.md" ]; then
  echo "pai-knowledge-system is installed"
else
  echo "WARNING: pai-knowledge-system not installed (recommended for storing intelligence)"
fi

# Check for Browser skill (used by some workflows)
if [ -d "$PAI_CHECK/skills/Browser" ]; then
  echo "Browser skill is installed"
else
  echo "INFO: Browser skill not installed (optional, used for fetching reports)"
fi
```

### Step 0.3: Conflict Resolution Matrix

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No skills/cti directory | Proceed normally with Step 1 |
| **Skill Exists** | skills/cti already present | Backup, then replace |
| **Old Location** | ~/.claude/skills/pai-cti-skill | Remove old, install to new location |

### Step 0.4: Backup Existing Configuration (If Needed)

```bash
# Create timestamped backup if CTI skill exists
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
if [ -d "$PAI_CHECK/skills/cti" ]; then
  BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_CHECK/skills/cti" "$BACKUP_DIR/cti"
  echo "Backed up existing CTI skill to: $BACKUP_DIR/cti"
fi

# Also backup if old location exists
if [ -d "$HOME/.claude/skills/pai-cti-skill" ]; then
  BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  cp -r "$HOME/.claude/skills/pai-cti-skill" "$BACKUP_DIR/pai-cti-skill-old"
  echo "Backed up old CTI skill to: $BACKUP_DIR/pai-cti-skill-old"
fi
```

---

## Installation Steps

### Step 1: Create Directory Structure

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create skill directories
mkdir -p "$PAI_DIR/skills/cti/Tools"
mkdir -p "$PAI_DIR/skills/cti/Workflows"
mkdir -p "$PAI_DIR/skills/cti/Frameworks"
mkdir -p "$PAI_DIR/skills/cti/Data"

# Create data directory for threat intel storage
mkdir -p "$PAI_DIR/data/threat-intel"

# Verify structure
echo "Created directories:"
ls -la "$PAI_DIR/skills/cti/"
```

---

### Step 2: Copy Skill Files

Copy all files from `src/skills/cti/` to `$PAI_DIR/skills/cti/`:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
PACK_SRC="$(dirname "$0")/src/skills/cti"

# Copy SKILL.md
cp "$PACK_SRC/SKILL.md" "$PAI_DIR/skills/cti/"

# Copy Data files
cp "$PACK_SRC/Data/"*.yaml "$PAI_DIR/skills/cti/Data/"

# Copy Tools
cp "$PACK_SRC/Tools/"*.ts "$PAI_DIR/skills/cti/Tools/"

# Copy Workflows
cp "$PACK_SRC/Workflows/"*.md "$PAI_DIR/skills/cti/Workflows/"

# Copy Frameworks
cp "$PACK_SRC/Frameworks/"*.md "$PAI_DIR/skills/cti/Frameworks/"

echo "Files copied successfully"
```

**OR manually copy each file:**

The AI assistant should copy each file from this pack's `src/skills/cti/` directory to `$PAI_DIR/skills/cti/`:

| Source | Destination |
|--------|-------------|
| `src/skills/cti/SKILL.md` | `$PAI_DIR/skills/cti/SKILL.md` |
| `src/skills/cti/Data/TISources.yaml` | `$PAI_DIR/skills/cti/Data/TISources.yaml` |
| `src/skills/cti/Data/IoCPatterns.yaml` | `$PAI_DIR/skills/cti/Data/IoCPatterns.yaml` |
| `src/skills/cti/Tools/FeedManager.ts` | `$PAI_DIR/skills/cti/Tools/FeedManager.ts` |
| `src/skills/cti/Tools/IoCExtractor.ts` | `$PAI_DIR/skills/cti/Tools/IoCExtractor.ts` |
| `src/skills/cti/Tools/StixGenerator.ts` | `$PAI_DIR/skills/cti/Tools/StixGenerator.ts` |
| `src/skills/cti/Workflows/*.md` | `$PAI_DIR/skills/cti/Workflows/*.md` |
| `src/skills/cti/Frameworks/*.md` | `$PAI_DIR/skills/cti/Frameworks/*.md` |

---

### Step 3: Install Tool Dependencies

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/cti/Tools"

# Initialize package.json if it doesn't exist
if [ ! -f "package.json" ]; then
  cat > package.json << 'EOF'
{
  "name": "pai-cti-tools",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "feed": "bun run FeedManager.ts",
    "ioc": "bun run IoCExtractor.ts",
    "stix": "bun run StixGenerator.ts",
    "test": "bun test"
  },
  "dependencies": {
    "yaml": "^2.3.4"
  },
  "devDependencies": {
    "bun-types": "latest"
  }
}
EOF
fi

# Install dependencies
bun install

echo "Dependencies installed"
```

---

### Step 4: Configure API Keys (Optional)

If you want to use premium threat feeds, add API keys to your environment:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Add to .env file (create if doesn't exist)
cat >> "$PAI_DIR/.env" << 'EOF'

# Threat Intelligence API Keys (optional)
# Uncomment and add your keys to enable these feeds

# PAI_CTI_OTX_API_KEY="your-alienvault-otx-api-key"
# PAI_CTI_VIRUSTOTAL_API_KEY="your-virustotal-api-key"
# PAI_CTI_SHODAN_API_KEY="your-shodan-api-key"
# PAI_CTI_URLSCAN_API_KEY="your-urlscan-api-key"
EOF

echo "API key placeholders added to $PAI_DIR/.env"
echo "Edit the file and uncomment/add your keys to enable premium feeds"
```

---

### Step 5: Verify Installation

Run the verification checklist from `VERIFY.md`:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# 1. Check SKILL.md exists
if [ -f "$PAI_DIR/skills/cti/SKILL.md" ]; then
  echo "[PASS] SKILL.md exists"
else
  echo "[FAIL] SKILL.md missing"
fi

# 2. Check Tools exist
for tool in FeedManager.ts IoCExtractor.ts StixGenerator.ts; do
  if [ -f "$PAI_DIR/skills/cti/Tools/$tool" ]; then
    echo "[PASS] $tool exists"
  else
    echo "[FAIL] $tool missing"
  fi
done

# 3. Check Data files
for data in TISources.yaml IoCPatterns.yaml; do
  if [ -f "$PAI_DIR/skills/cti/Data/$data" ]; then
    echo "[PASS] $data exists"
  else
    echo "[FAIL] $data missing"
  fi
done

# 4. Test IoC extraction
echo "Testing IoC extraction..."
echo "192.168.1.1 evil.com d41d8cd98f00b204e9800998ecf8427e" | \
  bun run "$PAI_DIR/skills/cti/Tools/IoCExtractor.ts" --stdin --format json

# 5. Test feed listing
echo "Testing feed manager..."
bun run "$PAI_DIR/skills/cti/Tools/FeedManager.ts" list | head -10
```

---

### Step 6: Clean Up Old Installation (If Applicable)

If you had the CTI skill installed at the old location (`~/.claude/skills/pai-cti-skill`), remove it:

```bash
# Only run if old location exists and new installation is verified
if [ -d "$HOME/.claude/skills/pai-cti-skill" ]; then
  echo "Removing old CTI skill installation..."
  rm -rf "$HOME/.claude/skills/pai-cti-skill"
  echo "Old installation removed"
fi
```

---

## Post-Installation

### Test the Skill

Try these commands to verify the skill is working:

1. **List threat feeds:**
   ```
   User: "List all threat intelligence feeds"
   → Should invoke FeedManager and show feed list
   ```

2. **Extract IoCs:**
   ```
   User: "Extract IoCs from: Check IP 8.8.8.8 and domain evil.com"
   → Should extract IPv4 and domain
   ```

3. **Generate STIX:**
   ```
   User: "Create a STIX bundle for IP indicator 203.0.113.42"
   → Should generate valid STIX 2.1 JSON
   ```

### Enable Additional Feeds

To enable feeds that require API keys:

1. Get API keys from:
   - AlienVault OTX: https://otx.alienvault.com/
   - VirusTotal: https://www.virustotal.com/gui/join-us
   - Shodan: https://shodan.io/
   - URLScan: https://urlscan.io/user/signup

2. Add keys to `$PAI_DIR/.env`

3. Enable feeds in `$PAI_DIR/skills/cti/Data/TISources.yaml`:
   ```yaml
   - name: AlienVault OTX
     enabled: true  # Change from false to true
   ```

---

## Troubleshooting

### "Command not found: bun"

Install Bun:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### "Module not found: yaml"

Install dependencies:
```bash
cd $PAI_DIR/skills/cti/Tools
bun install
```

### "Feed test failing"

Some feeds require API keys or have rate limits. Check:
1. API key is set in environment
2. Feed URL is accessible from your network
3. Rate limits haven't been exceeded

### "SKILL.md not loading"

Ensure the file is in the correct location:
```bash
ls -la $PAI_DIR/skills/cti/SKILL.md
```

The skill should be at `$PAI_DIR/skills/cti/SKILL.md` (not `pai-cti-skill`).
