#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  PAI Uninstaller — Fully removes PAI from this system
#  Removes: ~/.claude, ~/.config/PAI, LaunchAgents, shell
#  aliases, symlinks, and log files.
#
#  Usage:
#    bash uninstall.sh          — interactive (default)
#    bash uninstall.sh --force  — skip confirmations
# ═══════════════════════════════════════════════════════════
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────
BLUE='\033[38;2;59;130;246m'
LIGHT_BLUE='\033[38;2;147;197;253m'
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
removed() { echo -e "  ${RED}✗${RESET}  ${SILVER}$1${RESET} ${GRAY}removed${RESET}"; }

FORCE=false
for arg in "$@"; do
  [[ "$arg" == "--force" ]] && FORCE=true
done

confirm() {
  if $FORCE; then return 0; fi
  local prompt="$1"
  echo -e "\n  ${YELLOW}${prompt}${RESET} [y/N] \c"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ─── Banner ──────────────────────────────────────────────
echo ""
echo -e "${STEEL}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${RESET}"
echo ""
echo -e "               ${BLUE}PAI${RESET} ${GRAY}|${RESET} ${SILVER}Personal AI Infrastructure — Uninstaller${RESET}"
echo ""
echo -e "  ${YELLOW}This will permanently remove PAI and all associated files.${RESET}"
echo ""
echo -e "${STEEL}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}"
echo ""

# ─── Preview what will be removed ────────────────────────
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

echo -e "  ${BOLD}The following will be removed:${RESET}\n"

[[ -d "$PAI_DIR" ]]               && echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/${RESET}  ${GRAY}(PAI installation + Claude Code config)${RESET}"
[[ -d "$CONFIG_DIR" ]]            && echo -e "  ${RED}•${RESET} ${SILVER}~/.config/PAI/${RESET}  ${GRAY}(API keys, .env)${RESET}"
[[ -L "$ENV_SYMLINK" ]]           && echo -e "  ${RED}•${RESET} ${SILVER}~/.env${RESET}  ${GRAY}(symlink to PAI config)${RESET}"
[[ -f "$LAUNCH_AGENT_PLIST" ]]    && echo -e "  ${RED}•${RESET} ${SILVER}~/Library/LaunchAgents/com.pai.voice-server.plist${RESET}"
[[ -f "$LOG_FILE" ]]              && echo -e "  ${RED}•${RESET} ${SILVER}~/Library/Logs/pai-voice-server.log${RESET}"
[[ -L "$SWIFTBAR_PLUGIN" ]]       && echo -e "  ${RED}•${RESET} ${SILVER}SwiftBar plugin: pai-voice.5s.sh${RESET}"
[[ -L "$BITBAR_PLUGIN_1" ]]       && echo -e "  ${RED}•${RESET} ${SILVER}BitBar plugin: pai-voice.5s.sh${RESET}"
[[ -L "$BITBAR_PLUGIN_2" ]]       && echo -e "  ${RED}•${RESET} ${SILVER}BitBar plugin: pai-voice.5s.sh${RESET}"
echo -e "  ${YELLOW}•${RESET} ${SILVER}PAI alias${RESET} in ~/.zshrc and fish config"
echo ""

if ! confirm "Proceed with uninstall?"; then
  echo -e "\n  ${GRAY}Uninstall cancelled.${RESET}\n"
  exit 0
fi

# ════════════════════════════════════════════════════════
# Step 1: Voice Server
# ════════════════════════════════════════════════════════
step "Voice Server"

# Stop via launchctl
if launchctl list 2>/dev/null | grep -q "com.pai.voice-server"; then
  info "Stopping voice server service..."
  launchctl unload "$LAUNCH_AGENT_PLIST" 2>/dev/null || true
  success "Voice server service stopped"
else
  skip "Voice server service"
fi

# Kill any remaining process on port 8888
if lsof -ti:8888 -sTCP:LISTEN &>/dev/null 2>&1; then
  info "Killing process on port 8888..."
  lsof -ti:8888 -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
  success "Port 8888 cleared"
fi

# Remove LaunchAgent plist
if [[ -f "$LAUNCH_AGENT_PLIST" ]]; then
  rm -f "$LAUNCH_AGENT_PLIST"
  removed "$LAUNCH_AGENT_PLIST"
else
  skip "LaunchAgent plist"
fi

# Remove log file
if [[ -f "$LOG_FILE" ]]; then
  rm -f "$LOG_FILE"
  removed "$LOG_FILE"
else
  skip "Log file"
fi

# ════════════════════════════════════════════════════════
# Step 2: Menu Bar Plugins
# ════════════════════════════════════════════════════════
step "Menu Bar Plugins"

for plugin in "$SWIFTBAR_PLUGIN" "$BITBAR_PLUGIN_1" "$BITBAR_PLUGIN_2"; do
  if [[ -L "$plugin" ]] || [[ -f "$plugin" ]]; then
    rm -f "$plugin"
    removed "$plugin"
  fi
done

# Refresh SwiftBar if running
if pgrep -x "SwiftBar" &>/dev/null; then
  open -g "swiftbar://refreshall" 2>/dev/null || true
fi

# ════════════════════════════════════════════════════════
# Step 3: Shell Configuration
# ════════════════════════════════════════════════════════
step "Shell Configuration"

# Remove PAI alias from ~/.zshrc
ZSHRC="$HOME/.zshrc"
if [[ -f "$ZSHRC" ]]; then
  # Remove the marker line and the alias line that follows it
  if grep -q "# PAI alias" "$ZSHRC" 2>/dev/null; then
    # Use a temp file for safe in-place edit
    local_tmp=$(mktemp)
    # Remove: blank line before marker, the marker, and the alias line
    sed -E '/^[[:space:]]*$/{ N; /\n# PAI alias/{ N; d; }; }' "$ZSHRC" | \
      sed '/^# PAI alias$/{ N; d; }' | \
      sed '/^alias pai=.*/d' > "$local_tmp"
    mv "$local_tmp" "$ZSHRC"
    success "Removed PAI alias from ~/.zshrc"
  else
    # Fallback: just remove any stray alias pai= lines
    if grep -q "alias pai=" "$ZSHRC" 2>/dev/null; then
      sed -i.bak '/alias pai=/d' "$ZSHRC" && rm -f "${ZSHRC}.bak"
      success "Removed PAI alias from ~/.zshrc"
    else
      skip "PAI alias in ~/.zshrc"
    fi
  fi
fi

# Remove PAI function from fish config
FISH_CONFIG="$HOME/.config/fish/config.fish"
if [[ -f "$FISH_CONFIG" ]]; then
  if grep -q "PAI alias" "$FISH_CONFIG" 2>/dev/null || grep -q "function pai" "$FISH_CONFIG" 2>/dev/null; then
    local_tmp=$(mktemp)
    # Remove the 3-line block: comment + function + body + end
    awk '
      /^# PAI alias$/ { skip=1; next }
      skip && /^function pai$/ { skip=2; next }
      skip==2 && /^    bun / { next }
      skip==2 && /^end$/ { skip=0; next }
      { skip=0; print }
    ' "$FISH_CONFIG" > "$local_tmp"
    mv "$local_tmp" "$FISH_CONFIG"
    success "Removed PAI function from fish config"
  else
    skip "PAI function in fish config"
  fi
fi

# ════════════════════════════════════════════════════════
# Step 4: Symlinks
# ════════════════════════════════════════════════════════
step "Symlinks"

# Remove ~/.env only if it's a symlink pointing to PAI config
if [[ -L "$ENV_SYMLINK" ]]; then
  link_target=$(readlink "$ENV_SYMLINK" 2>/dev/null || true)
  if [[ "$link_target" == "$PAI_ENV" ]] || [[ "$link_target" == *"/.config/PAI/.env"* ]]; then
    rm -f "$ENV_SYMLINK"
    removed "~/.env (PAI symlink)"
  else
    warn "~/.env exists but points elsewhere — leaving it alone"
  fi
fi

# Remove ~/.claude/.env symlink
if [[ -L "$CLAUDE_ENV_SYMLINK" ]]; then
  rm -f "$CLAUDE_ENV_SYMLINK"
  removed "~/.claude/.env (symlink)"
fi

# ════════════════════════════════════════════════════════
# Step 5: Configuration Directory
# ════════════════════════════════════════════════════════
step "PAI Config (~/.config/PAI)"

if [[ -d "$CONFIG_DIR" ]]; then
  if confirm "Remove ~/.config/PAI/ (contains API keys)?"; then
    rm -rf "$CONFIG_DIR"
    removed "~/.config/PAI/"
  else
    warn "Skipped ~/.config/PAI/ — API keys preserved"
  fi
else
  skip "~/.config/PAI/"
fi

# ════════════════════════════════════════════════════════
# Step 6: Main PAI Installation (~/.claude)
# ════════════════════════════════════════════════════════
step "PAI Installation (~/.claude)"

if [[ -d "$PAI_DIR" ]]; then
  echo ""
  echo -e "  ${YELLOW}${BOLD}WARNING:${RESET} This removes ${SILVER}~/.claude/${RESET} entirely."
  echo -e "  ${GRAY}This is the PAI installation directory, which also serves as your"
  echo -e "  Claude Code configuration directory. All settings, memory, skills,"
  echo -e "  hooks, and plans will be permanently deleted.${RESET}"
  echo ""
  if confirm "Remove ~/.claude/ permanently?"; then
    rm -rf "$PAI_DIR"
    removed "~/.claude/"
  else
    warn "Skipped ~/.claude/ — PAI installation preserved"
  fi
else
  skip "~/.claude/ (not found)"
fi

# ════════════════════════════════════════════════════════
# Optional: Backup directories
# ════════════════════════════════════════════════════════
BACKUP_DIRS=()
for candidate in "$HOME/.claude-backup" "$HOME/.claude-old" "$HOME/.claude-BACKUP"; do
  [[ -d "$candidate" ]] && BACKUP_DIRS+=("$candidate")
done

if [[ ${#BACKUP_DIRS[@]} -gt 0 ]]; then
  step "PAI Backup Directories"
  for bd in "${BACKUP_DIRS[@]}"; do
    warn "Found backup: $bd"
  done
  if confirm "Remove these backup directories too?"; then
    for bd in "${BACKUP_DIRS[@]}"; do
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
echo -e "  ${GRAY}• Restart your terminal to clear the${RESET} ${SILVER}pai${RESET} ${GRAY}alias from your session${RESET}"
echo -e "  ${GRAY}• Claude Code (the CLI) remains installed — uninstall with:${RESET}"
echo -e "    ${SILVER}npm uninstall -g @anthropic-ai/claude-code${RESET}"
echo ""
echo -e "${STEEL}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}"
echo ""
