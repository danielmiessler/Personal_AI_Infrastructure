#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  PAI Uninstaller — Removes PAI content from this system
#
#  ~/.claude/ is Claude Code's config directory AND PAI's
#  install target. This script removes only PAI-owned files,
#  backs up mixed content, and leaves Claude Code's own
#  files untouched.
#
#  Usage:
#    bash uninstall.sh          — interactive (default)
#    bash uninstall.sh --force  — skip confirmations
# ═══════════════════════════════════════════════════════════
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────
BLUE='\033[38;2;59;130;246m'
GREEN='\033[38;2;34;197;94m'
YELLOW='\033[38;2;234;179;8m'
RED='\033[38;2;239;68;68m'
GRAY='\033[38;2;100;116;139m'
STEEL='\033[38;2;51;65;85m'
SILVER='\033[38;2;203;213;225m'
RESET='\033[0m'
BOLD='\033[1m'

# ─── Helpers ─────────────────────────────────────────────
info()    { echo -e "  ${BLUE}ℹ${RESET}  $1"; }
success() { echo -e "  ${GREEN}✓${RESET}  $1"; }
warn()    { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
skip()    { echo -e "  ${GRAY}–${RESET}  $1 ${GRAY}(not found, skipping)${RESET}"; }
step()    { echo -e "\n${STEEL}┄┄┄${RESET} ${BOLD}$1${RESET}"; }
backed()  { echo -e "  ${BLUE}↪${RESET}  ${SILVER}$1${RESET} ${GRAY}backed up${RESET}"; }
removed() { echo -e "  ${RED}✗${RESET}  ${SILVER}$1${RESET} ${GRAY}removed${RESET}"; }

FORCE=false
for arg in "$@"; do [[ "$arg" == "--force" ]] && FORCE=true; done

confirm() {
  $FORCE && return 0
  echo -e "\n  ${YELLOW}$1${RESET} [y/N] \c"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ─── Paths ───────────────────────────────────────────────
PAI_DIR="$HOME/.claude"
CONFIG_DIR="${PAI_CONFIG_DIR:-$HOME/.config/PAI}"
LAUNCH_AGENT_PLIST="$HOME/Library/LaunchAgents/com.pai.voice-server.plist"
LOG_FILE="$HOME/Library/Logs/pai-voice-server.log"
ENV_SYMLINK="$HOME/.env"
PAI_ENV="$CONFIG_DIR/.env"
CLAUDE_ENV_SYMLINK="$PAI_DIR/.env"
SWIFTBAR_PLUGIN="$HOME/Library/Application Support/SwiftBar/Plugins/pai-voice.5s.sh"
BITBAR_PLUGIN_1="$HOME/Documents/BitBarPlugins/pai-voice.5s.sh"
BITBAR_PLUGIN_2="$HOME/BitBar/pai-voice.5s.sh"
BACKUP_DIR="$HOME/.pai-uninstall-backup-$(date +%Y%m%d-%H%M%S)"

# ─── Banner ──────────────────────────────────────────────
echo ""
echo -e "${STEEL}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${RESET}"
echo ""
echo -e "               ${BLUE}PAI${RESET} ${GRAY}|${RESET} ${SILVER}Personal AI Infrastructure — Uninstaller${RESET}"
echo ""
echo -e "  ${GRAY}Removes PAI-owned files from ~/.claude/ and system services.${RESET}"
echo -e "  ${GRAY}Claude Code's own files are preserved. Mixed content is backed up.${RESET}"
echo ""
echo -e "${STEEL}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}"
echo ""

# ─── Preview ─────────────────────────────────────────────
echo -e "  ${BOLD}Will be removed (PAI-owned):${RESET}"
for d in agents lib PAI-Install plugins skills VoiceServer; do
  [[ -d "$PAI_DIR/$d" ]] && echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/$d/${RESET}"
done
for f in install.sh README.md statusline-command.sh CLAUDE.md .gitignore; do
  [[ -f "$PAI_DIR/$f" ]] && echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/$f${RESET}"
done
[[ -f "$LAUNCH_AGENT_PLIST" ]] && echo -e "  ${RED}•${RESET} ${SILVER}~/Library/LaunchAgents/com.pai.voice-server.plist${RESET}"
[[ -f "$LOG_FILE" ]]           && echo -e "  ${RED}•${RESET} ${SILVER}~/Library/Logs/pai-voice-server.log${RESET}"
[[ -L "$SWIFTBAR_PLUGIN" ]]    && echo -e "  ${RED}•${RESET} ${SILVER}SwiftBar plugin: pai-voice.5s.sh${RESET}"
[[ -L "$BITBAR_PLUGIN_1" ]]    && echo -e "  ${RED}•${RESET} ${SILVER}BitBar plugin: pai-voice.5s.sh (Documents)${RESET}"
[[ -L "$BITBAR_PLUGIN_2" ]]    && echo -e "  ${RED}•${RESET} ${SILVER}BitBar plugin: pai-voice.5s.sh (~/BitBar)${RESET}"
echo -e "  ${RED}•${RESET} ${SILVER}PAI keys in ~/.claude/settings.json${RESET} ${GRAY}(principal, daidentity, pai, counts)${RESET}"
echo -e "  ${RED}•${RESET} ${SILVER}PAI alias${RESET} ${GRAY}in ~/.zshrc and fish config${RESET}"
echo ""
echo -e "  ${BOLD}Will be backed up to${RESET} ${SILVER}~/.pai-uninstall-backup-TIMESTAMP/${RESET}${BOLD}:${RESET}"
for d in MEMORY plans hooks tasks teams; do
  [[ -d "$PAI_DIR/$d" ]] && echo -e "  ${BLUE}•${RESET} ${SILVER}~/.claude/$d/${RESET} ${GRAY}(may contain your data)${RESET}"
done
[[ -f "$PAI_DIR/settings.json" ]] && echo -e "  ${BLUE}•${RESET} ${SILVER}~/.claude/settings.json${RESET} ${GRAY}(before PAI keys are stripped)${RESET}"
[[ -d "$CONFIG_DIR" ]]            && echo -e "  ${BLUE}•${RESET} ${SILVER}~/.config/PAI/${RESET} ${GRAY}(API keys)${RESET}"
echo ""
echo -e "  ${GRAY}${BOLD}Not touched:${RESET} ${GRAY}.credentials.json, projects/, todos/, history.jsonl,${RESET}"
echo -e "  ${GRAY}statsig/, cache/, debug/, telemetry/, and all other Claude Code files.${RESET}"
echo ""

if ! confirm "Proceed with uninstall?"; then
  echo -e "\n  ${GRAY}Uninstall cancelled.${RESET}\n"
  exit 0
fi

# ════════════════════════════════════════════════════════
# Step 1: Create Backup
# ════════════════════════════════════════════════════════
step "Creating Backup"

mkdir -p "$BACKUP_DIR"
info "Backup directory: $BACKUP_DIR"

# Back up mixed-content directories
for d in MEMORY plans hooks tasks teams; do
  if [[ -d "$PAI_DIR/$d" ]]; then
    cp -r "$PAI_DIR/$d" "$BACKUP_DIR/$d"
    backed "~/.claude/$d/ → backup"
  fi
done

# Back up settings.json before we modify it
if [[ -f "$PAI_DIR/settings.json" ]]; then
  cp "$PAI_DIR/settings.json" "$BACKUP_DIR/settings.json"
  backed "~/.claude/settings.json → backup"
fi

# Back up ~/.config/PAI (API keys)
if [[ -d "$CONFIG_DIR" ]]; then
  cp -r "$CONFIG_DIR" "$BACKUP_DIR/config-PAI"
  backed "~/.config/PAI/ → backup"
fi

success "Backup complete: $BACKUP_DIR"

# ════════════════════════════════════════════════════════
# Step 2: Voice Server
# ════════════════════════════════════════════════════════
step "Voice Server"

if launchctl list 2>/dev/null | grep -q "com.pai.voice-server"; then
  info "Stopping voice server service..."
  launchctl unload "$LAUNCH_AGENT_PLIST" 2>/dev/null || true
  success "Voice server service stopped"
else
  skip "Voice server service (not running)"
fi

if lsof -ti:8888 -sTCP:LISTEN &>/dev/null 2>&1; then
  info "Killing process on port 8888..."
  lsof -ti:8888 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
  success "Port 8888 cleared"
fi

if [[ -f "$LAUNCH_AGENT_PLIST" ]]; then
  rm -f "$LAUNCH_AGENT_PLIST"
  removed "~/Library/LaunchAgents/com.pai.voice-server.plist"
else
  skip "LaunchAgent plist"
fi

if [[ -f "$LOG_FILE" ]]; then
  rm -f "$LOG_FILE"
  removed "~/Library/Logs/pai-voice-server.log"
else
  skip "Voice server log"
fi

# ════════════════════════════════════════════════════════
# Step 3: Menu Bar Plugins
# ════════════════════════════════════════════════════════
step "Menu Bar Plugins"

_any_plugin=false
for plugin in "$SWIFTBAR_PLUGIN" "$BITBAR_PLUGIN_1" "$BITBAR_PLUGIN_2"; do
  if [[ -L "$plugin" ]] || [[ -f "$plugin" ]]; then
    rm -f "$plugin"
    removed "$plugin"
    _any_plugin=true
  fi
done
$_any_plugin || skip "No PAI menu bar plugins found"
pgrep -x "SwiftBar" &>/dev/null && open -g "swiftbar://refreshall" 2>/dev/null || true

# ════════════════════════════════════════════════════════
# Step 4: Shell Configuration
# ════════════════════════════════════════════════════════
step "Shell Configuration"

# Remove PAI alias block from ~/.zshrc
ZSHRC="$HOME/.zshrc"
if [[ -f "$ZSHRC" ]] && grep -q "# PAI alias\|alias pai=" "$ZSHRC" 2>/dev/null; then
  _tmp=$(mktemp)
  # Remove the marker comment, the alias line, and any blank line immediately before the pair
  awk '
    /^[[:space:]]*$/ { blank=$0; next }
    /^# PAI alias$/ { blank=""; next }
    /^# CORE alias$/ { blank=""; next }
    /^alias pai=/ { blank=""; next }
    /^function pai$/ { in_fn=1; blank=""; next }
    in_fn && /^end$/ { in_fn=0; blank=""; next }
    in_fn { next }
    { if (blank != "") { print blank; blank="" } print }
  ' "$ZSHRC" > "$_tmp"
  mv "$_tmp" "$ZSHRC"
  success "Removed PAI alias from ~/.zshrc"
else
  skip "PAI alias in ~/.zshrc"
fi

# Remove PAI function from fish config
FISH_CONFIG="$HOME/.config/fish/config.fish"
if [[ -f "$FISH_CONFIG" ]] && grep -q "PAI alias\|function pai" "$FISH_CONFIG" 2>/dev/null; then
  _tmp=$(mktemp)
  awk '
    /^# PAI alias$/ { skip=1; next }
    skip && /^function pai$/ { skip=2; next }
    skip==2 && /^end$/ { skip=0; next }
    skip==2 { next }
    { skip=0; print }
  ' "$FISH_CONFIG" > "$_tmp"
  mv "$_tmp" "$FISH_CONFIG"
  success "Removed PAI function from fish config"
else
  skip "PAI function in fish config"
fi

# ════════════════════════════════════════════════════════
# Step 5: Symlinks
# ════════════════════════════════════════════════════════
step "Symlinks"

if [[ -L "$ENV_SYMLINK" ]]; then
  _target=$(readlink "$ENV_SYMLINK" 2>/dev/null || true)
  if [[ "$_target" == *"/.config/PAI/.env"* ]]; then
    rm -f "$ENV_SYMLINK"
    removed "~/.env (PAI symlink)"
  else
    warn "~/.env points elsewhere (${_target}) — leaving it alone"
  fi
else
  skip "~/.env (not a PAI symlink)"
fi

if [[ -L "$CLAUDE_ENV_SYMLINK" ]]; then
  rm -f "$CLAUDE_ENV_SYMLINK"
  removed "~/.claude/.env (symlink)"
else
  skip "~/.claude/.env symlink"
fi

# ════════════════════════════════════════════════════════
# Step 6: PAI-Only Directories in ~/.claude
# ════════════════════════════════════════════════════════
step "PAI-Owned Directories (~/.claude)"

info "Removing PAI-only directories (Claude Code files are not touched)..."
for d in agents lib PAI-Install plugins skills VoiceServer; do
  if [[ -d "$PAI_DIR/$d" ]]; then
    rm -rf "${PAI_DIR:?}/$d"
    removed "~/.claude/$d/"
  else
    skip "~/.claude/$d/"
  fi
done

# Remove ~/.claude/.git only if it is the PAI repo
if [[ -d "$PAI_DIR/.git" ]]; then
  _remote=$(git -C "$PAI_DIR" remote get-url origin 2>/dev/null || true)
  if [[ "$_remote" == *"danielmiessler/PAI"* ]] || [[ "$_remote" == *"danielmiessler/Personal_AI_Infrastructure"* ]]; then
    rm -rf "$PAI_DIR/.git"
    removed "~/.claude/.git (PAI repo)"
  else
    warn "~/.claude/.git exists but origin is '$_remote' — leaving it alone"
  fi
fi

# ════════════════════════════════════════════════════════
# Step 7: PAI-Only Files in ~/.claude
# ════════════════════════════════════════════════════════
step "PAI-Owned Files (~/.claude)"

for f in install.sh README.md statusline-command.sh CLAUDE.md .gitignore; do
  if [[ -f "$PAI_DIR/$f" ]]; then
    rm -f "$PAI_DIR/$f"
    removed "~/.claude/$f"
  else
    skip "~/.claude/$f"
  fi
done

# ════════════════════════════════════════════════════════
# Step 8: Strip PAI Keys from settings.json
# ════════════════════════════════════════════════════════
step "Cleaning settings.json"

SETTINGS="$PAI_DIR/settings.json"
if [[ -f "$SETTINGS" ]]; then
  if command -v python3 &>/dev/null; then
    python3 - "$SETTINGS" <<'PYEOF'
import json, sys

path = sys.argv[1]
with open(path) as f:
    s = json.load(f)

# Remove PAI-owned top-level keys
for key in ("principal", "daidentity", "pai", "counts", "plansDirectory"):
    s.pop(key, None)

# Remove PAI-specific env vars from the env block, preserve others
if "env" in s and isinstance(s["env"], dict):
    for k in ("PROJECTS_DIR",):
        s["env"].pop(k, None)
    if not s["env"]:
        del s["env"]

# Remove statusLine — it references statusline-command.sh which is now gone
s.pop("statusLine", None)

with open(path, "w") as f:
    json.dump(s, f, indent=2)
    f.write("\n")

print("  \033[38;2;34;197;94m✓\033[0m  PAI keys removed from settings.json")
print("  \033[38;2;100;116;139m–\033[0m  Preserved: permissions, hooks, mcpServers, and other Claude Code config")
PYEOF
  else
    warn "python3 not found — settings.json not modified (backup is at $BACKUP_DIR/settings.json)"
  fi
else
  skip "settings.json (not found)"
fi

# ════════════════════════════════════════════════════════
# Step 9: User-Data Directories (confirm each)
# ════════════════════════════════════════════════════════
step "User Data Directories"

echo -e "  ${GRAY}These directories were created by PAI but may contain your personal data.${RESET}"
echo -e "  ${GRAY}All have already been backed up to: $BACKUP_DIR${RESET}"
echo ""

for entry in \
  "MEMORY:Your AI memory and learning files" \
  "plans:Your project plans" \
  "tasks:Your task history" \
  "hooks:PAI-installed hooks (review backup for any custom hooks you added)" \
  "teams:PAI team configurations"
do
  d="${entry%%:*}"
  desc="${entry#*:}"
  if [[ -d "$PAI_DIR/$d" ]]; then
    if confirm "Remove ~/.claude/$d/? ($desc)"; then
      rm -rf "${PAI_DIR:?}/$d"
      removed "~/.claude/$d/"
    else
      warn "Kept ~/.claude/$d/ — backup also available in $BACKUP_DIR/$d/"
    fi
  fi
done

# ════════════════════════════════════════════════════════
# Step 10: ~/.config/PAI (API Keys)
# ════════════════════════════════════════════════════════
step "PAI Config (~/.config/PAI)"

if [[ -d "$CONFIG_DIR" ]]; then
  if confirm "Remove ~/.config/PAI/? (contains your API keys — already backed up)"; then
    rm -rf "$CONFIG_DIR"
    removed "~/.config/PAI/"
  else
    warn "Kept ~/.config/PAI/ — API keys preserved"
  fi
else
  skip "~/.config/PAI/"
fi

# ════════════════════════════════════════════════════════
# Optional: Old backup directories
# ════════════════════════════════════════════════════════
_old_backups=()
for candidate in "$HOME/.claude-backup" "$HOME/.claude-old" "$HOME/.claude-BACKUP"; do
  [[ -d "$candidate" ]] && _old_backups+=("$candidate")
done

if [[ ${#_old_backups[@]} -gt 0 ]]; then
  step "Legacy PAI Backup Directories"
  for bd in "${_old_backups[@]}"; do warn "Found: $bd"; done
  if confirm "Remove these old backup directories?"; then
    for bd in "${_old_backups[@]}"; do
      rm -rf "$bd"
      removed "$bd"
    done
  fi
fi

# ════════════════════════════════════════════════════════
# Done
# ════════════════════════════════════════════════════════
echo ""
echo -e "${STEEL}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${RESET}"
echo ""
echo -e "              ${GREEN}✓${RESET}  ${BOLD}PAI Uninstall Complete${RESET}"
echo ""
echo -e "  ${GRAY}Backup saved to:${RESET} ${SILVER}$BACKUP_DIR${RESET}"
echo ""
echo -e "  ${GRAY}Next steps:${RESET}"
echo -e "  ${GRAY}• Restart your terminal to clear the${RESET} ${SILVER}pai${RESET} ${GRAY}alias from your session${RESET}"
echo -e "  ${GRAY}• Review your backup before deleting it:${RESET} ${SILVER}ls $BACKUP_DIR${RESET}"
echo -e "  ${GRAY}• Claude Code (the CLI) remains installed — to remove it:${RESET}"
echo -e "    ${SILVER}npm uninstall -g @anthropic-ai/claude-code${RESET}"
echo ""
echo -e "${STEEL}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}"
echo ""
