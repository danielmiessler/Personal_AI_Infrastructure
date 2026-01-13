# Mobile App Skill v1.0.0 - Installation Guide

This guide will help you install the Mobile App Skill for your Personal AI Infrastructure. The installation is designed to be executed by an AI agent with your approval at key decision points.

---

## 🤖 AI Assistant Installation Prompt

**Copy this section into Claude Code to begin AI-assisted installation:**

```
You are installing the Mobile App Skill pack for Personal AI Infrastructure.

Follow these phases in order:

1. SYSTEM ANALYSIS - Check prerequisites and existing installations
2. USER QUESTIONS - Ask required questions and get user approval
3. BACKUP - Create backups if overwriting existing installation
4. INSTALLATION - Copy files, install dependencies, configure environment
5. VERIFICATION - Run comprehensive verification checklist

Use the TodoWrite tool to track progress through these phases.
Refer to sections below for detailed instructions for each phase.
```

---

## Phase 1: System Analysis

### Prerequisites Check

**Required Components:**
- ✅ **Bun Runtime**: Required for server execution
- ✅ **Claude Code**: Core PAI infrastructure
- ✅ **macOS**: Tested on macOS 14.x+ (launchd service management)
- ✅ **Tailscale**: Recommended for secure mobile access

**Optional Components:**
- ⚪ **Obsidian Vault**: For knowledge base features (can be added later)
- ⚪ **MCP Obsidian Server**: For advanced vault integration

### AI Instructions - System Analysis

```bash
# Check for Claude Code installation
ls ~/.claude/settings.json

# Check for Bun runtime
bun --version

# Check current platform
uname -s

# Check for existing Mobile App installation
ls ~/.claude/skills/MobileApp/SKILL.md

# Check for Tailscale (optional but recommended)
which tailscale
```

**Decision Logic:**
- If `~/.claude/settings.json` missing → **STOP**: User must install PAI Core first
- If `bun --version` fails → **STOP**: User must install Bun runtime
- If platform is not Darwin (macOS) → **WARN**: Service management may not work
- If existing MobileApp found → **QUESTION**: Ask about overwrite/backup

---

## Phase 2: User Questions

### Question 1: Existing Installation

**Ask if existing installation detected:**

```
I found an existing Mobile App installation at ~/.claude/skills/MobileApp/

How would you like to proceed?
A) Backup existing and install fresh (recommended)
B) Overwrite without backup
C) Cancel installation
```

**Store response in:** `$BACKUP_CHOICE`

### Question 2: Bun Installation

**Ask if Bun runtime is missing:**

```
Bun runtime is required but not found. Would you like me to:
A) Install Bun automatically (curl -fsSL https://bun.sh/install | bash)
B) You'll install it manually first
C) Cancel installation
```

**Store response in:** `$BUN_INSTALL_CHOICE`

### Question 3: Tailscale Check

**If Tailscale not found:**

```
Tailscale is not installed. This is optional but strongly recommended for secure mobile access.

Continue without Tailscale?
A) Yes, I'll access via localhost only or install Tailscale later
B) No, I want to install Tailscale first
```

**Store response in:** `$TAILSCALE_CHOICE`

### Question 4: Final Confirmation

**Before proceeding with installation:**

```
Ready to install Mobile App Skill with these settings:
- Installation path: ~/.claude/skills/MobileApp
- Backup existing: [Yes/No based on Q1]
- Auto-start service: Yes (via launchd)

Proceed with installation?
A) Yes, install now
B) No, cancel
```

**Store response in:** `$FINAL_CONFIRMATION`

---

## Phase 3: Backup Operations

**Only execute if existing installation found AND user chose backup option.**

```bash
# Create timestamped backup directory
BACKUP_DIR=~/.claude/backups/MobileApp-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup existing installation
cp -r ~/.claude/skills/MobileApp/* "$BACKUP_DIR/"

# Confirm backup
ls -la "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

### Step 1: Create Directory Structure

```bash
# Create skill directory
mkdir -p ~/.claude/skills/MobileApp

# Set working directory
cd ~/.claude/skills/MobileApp
```

### Step 2: Copy Skill Files

```bash
# Copy all files from pack src/ to skill directory
cp -r /path/to/mobile-app-skill/src/* ~/.claude/skills/MobileApp/

# Verify core files are present
ls -la ~/.claude/skills/MobileApp/SKILL.md
ls -la ~/.claude/skills/MobileApp/manage.sh
ls -la ~/.claude/skills/MobileApp/apps/server/
ls -la ~/.claude/skills/MobileApp/apps/client/
```

**Note to AI:** Replace `/path/to/mobile-app-skill` with the actual path where the pack was downloaded/extracted.

### Step 3: Install Dependencies

```bash
# Navigate to skill directory
cd ~/.claude/skills/MobileApp

# Install server dependencies
cd apps/server
bun install

# Install client dependencies
cd ../client
bun install

# Return to skill root
cd ../..
```

### Step 4: Build Client for Production

```bash
# Build client assets
./manage.sh build

# Verify dist directory created
ls -la apps/client/dist/
```

### Step 5: Configure Environment

```bash
# Create .env file if needed (for future features)
cat > .env <<EOF
# Mobile App Configuration
PORT=5050
SESSION_DIR=./sessions
LOG_FILE=./server.log

# Optional: Obsidian vault path
# OBSIDIAN_VAULT_PATH=/Users/\$USER/Documents/Obsidian/MyVault
EOF

echo "✅ Environment configuration created"
```

### Step 6: Set Permissions

```bash
# Make scripts executable
chmod +x ~/.claude/skills/MobileApp/manage.sh
chmod +x ~/.claude/skills/MobileApp/service-wrapper.sh

# Verify permissions
ls -l ~/.claude/skills/MobileApp/*.sh
```

### Step 7: Enable Auto-Restart Service

```bash
# Install launchd service (macOS)
./manage.sh service install

# Verify service is loaded
./manage.sh service status

# Check if server is running
./manage.sh status
```

---

## Phase 5: Verification

Run the complete verification checklist from VERIFY.md:

```bash
# Execute verification script
cd ~/.claude/skills/MobileApp
bash VERIFY.md  # Or follow manual checklist
```

**Minimum checks:**
1. ✅ SKILL.md exists and is readable
2. ✅ manage.sh is executable
3. ✅ Server starts without errors
4. ✅ Client dist/ directory contains built assets
5. ✅ Service is running and auto-restart enabled
6. ✅ Port 5050 is accessible (curl http://localhost:5050)

---

## Success Message

```
🎉 Mobile App Skill Installation Complete!

📱 Access your mobile app:
   • Local: http://localhost:5050
   • Tailscale: http://<your-tailscale-ip>:5050

🚀 Quick Start:
   • Check status: ./manage.sh status
   • View logs: ./manage.sh service logs
   • Restart: ./manage.sh restart
   • Development mode: ./manage.sh dev

📱 On iPhone/iPad:
   1. Open Safari and navigate to your Tailscale IP:5050
   2. Tap Share → Add to Home Screen
   3. Open the installed app for full-screen experience

📖 Next steps:
   • Configure Obsidian vault path in .env (optional)
   • Test chat interface with Claude Code
   • Browse files from mobile device
   • Explore knowledge base features

🆘 Having issues? See Troubleshooting section below.
```

---

## Troubleshooting

### Server Won't Start

**Problem**: `./manage.sh status` shows server not running

**Solutions:**
```bash
# Check logs for errors
./manage.sh service logs

# Verify port is not in use
lsof -i :5050

# Try manual start to see errors
cd apps/server && bun run src/index.ts

# Check permissions
ls -l manage.sh service-wrapper.sh
```

### Service Won't Auto-Start

**Problem**: Launchd service fails to load

**Solutions:**
```bash
# Check service status
launchctl list | grep com.pai.mobile

# Verify plist file
cat ~/Library/LaunchAgents/com.pai.mobile.plist

# Reload service
./manage.sh service uninstall
./manage.sh service install

# Check system logs
log show --predicate 'process == "com.pai.mobile"' --last 5m
```

### Can't Access from Mobile

**Problem**: Mobile device can't reach http://<ip>:5050

**Solutions:**
```bash
# Verify server is running
./manage.sh status

# Check if port is open
lsof -i :5050

# Verify Tailscale is running
tailscale status

# Get correct Tailscale IP
tailscale ip -4

# Test from Mac first
curl http://localhost:5050

# Check firewall settings (System Settings → Firewall)
```

### Build Fails

**Problem**: `./manage.sh build` fails with errors

**Solutions:**
```bash
# Clean node_modules and reinstall
cd apps/client
rm -rf node_modules package-lock.json
bun install

# Try building with verbose output
cd ../../
./manage.sh build --verbose

# Check Bun version (needs 1.0+)
bun --version
```

### Obsidian Features Not Working

**Problem**: Knowledge base view shows errors

**Solutions:**
```bash
# Verify Obsidian vault path in .env
cat .env | grep OBSIDIAN_VAULT_PATH

# Check vault permissions
ls -la ~/Documents/Obsidian/

# Test vault access manually
cat ~/Documents/Obsidian/YourVault/.obsidian/config

# Ensure MCP Obsidian server is configured if using advanced features
```

---

## Manual Installation (Without AI)

If you prefer to install manually without AI assistance:

1. **Download/clone the pack** to a temporary location
2. **Copy src/ contents** to `~/.claude/skills/MobileApp/`
3. **Run installation script**: `cd ~/.claude/skills/MobileApp && ./manage.sh install`
4. **Build client**: `./manage.sh build`
5. **Enable service**: `./manage.sh service install`
6. **Verify**: Follow VERIFY.md checklist
7. **Access**: Open http://localhost:5050 in browser

---

## Uninstallation

To completely remove the Mobile App Skill:

```bash
# Stop and uninstall service
cd ~/.claude/skills/MobileApp
./manage.sh service uninstall

# Remove skill directory
rm -rf ~/.claude/skills/MobileApp

# Verify service is removed
launchctl list | grep com.pai.mobile
```

---

## Support

- **Issues**: Report at GitHub repository
- **Documentation**: See README.md for architecture and API details
- **Verification**: Run VERIFY.md checklist for diagnostics
