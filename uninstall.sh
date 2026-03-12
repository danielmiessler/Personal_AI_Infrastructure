#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  PAI Uninstaller — Removes PAI content from this system
#
#  ~/.claude/ is both Claude Code's config dir and PAI's
#  install target. This script removes only what the PAI
#  installer put there, backed up first where content
#  may be mixed with user data.
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

# PAI's known agent filenames (installed by PAI, identified by name)
PAI_AGENTS=(
  Algorithm.md Architect.md Artist.md ClaudeResearcher.md
  CodexResearcher.md Designer.md Engineer.md GeminiResearcher.md
  GrokResearcher.md Intern.md Pentester.md PerplexityResearcher.md
  QATester.md
)

# PAI's known hook filenames (shipped in the v3.0 release)
PAI_HOOKS=(
  AgentExecutionGuard.hook.ts AlgorithmTracker.hook.ts AutoWorkCreation.hook.ts
  CheckVersion.hook.ts IntegrityCheck.hook.ts LoadContext.hook.ts
  QuestionAnswered.hook.ts RatingCapture.hook.ts README.md
  RelationshipMemory.hook.ts SecurityValidator.hook.ts SessionAutoName.hook.ts
  SessionSummary.hook.ts SetQuestionTab.hook.ts SkillGuard.hook.ts
  StartupGreeting.hook.ts StopOrchestrator.hook.ts UpdateCounts.hook.ts
  UpdateTabTitle.hook.ts VoiceGate.hook.ts WorkCompletionLearning.hook.ts
)

# PAI's known skill directory names (shipped in the v3.0 release)
PAI_SKILLS=(
  Agents AnnualReports Aphorisms Apify Art BeCreative BrightData
  Browser Cloudflare CORE Council CreateCLI CreateSkill Documents
  Evals ExtractWisdom Fabric FirstPrinciples IterativeDepth OSINT
  PAI PAIUpgrade Parser PrivateInvestigator Prompting PromptInjection
  Recon RedTeam Remotion Research Sales Science SECUpdates Telos
  USMetrics WebAssessment WorldThreatModelHarness WriteStory
)

# ─── Banner ──────────────────────────────────────────────
echo ""
echo -e "${STEEL}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${RESET}"
echo ""
echo -e "               ${BLUE}PAI${RESET} ${GRAY}|${RESET} ${SILVER}Personal AI Infrastructure — Uninstaller${RESET}"
echo ""
echo -e "  ${GRAY}Removes only PAI-installed content. Claude Code's own files are${RESET}"
echo -e "  ${GRAY}left untouched. Mixed-content areas are backed up first.${RESET}"
echo ""
echo -e "${STEEL}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}"
echo ""

# ─── Preview ─────────────────────────────────────────────
echo -e "  ${BOLD}PAI-exclusive directories${RESET} ${GRAY}(will be removed):${RESET}"
for d in VoiceServer PAI-Install; do
  [[ -d "$PAI_DIR/$d" ]] && echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/$d/${RESET}"
done
[[ -f "$PAI_DIR/statusline-command.sh" ]] && \
  echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/statusline-command.sh${RESET}"
[[ -f "$LAUNCH_AGENT_PLIST" ]] && \
  echo -e "  ${RED}•${RESET} ${SILVER}~/Library/LaunchAgents/com.pai.voice-server.plist${RESET}"
[[ -f "$LOG_FILE" ]] && \
  echo -e "  ${RED}•${RESET} ${SILVER}~/Library/Logs/pai-voice-server.log${RESET}"
echo ""

echo -e "  ${BOLD}PAI files in shared directories${RESET} ${GRAY}(removed by name, other files kept):${RESET}"

_pai_skill_count=0
for skill in "${PAI_SKILLS[@]}"; do
  [[ -d "$PAI_DIR/skills/$skill" ]] && (( _pai_skill_count++ )) || true
done
(( _pai_skill_count > 0 )) && \
  echo -e "  ${RED}•${RESET} ${SILVER}${_pai_skill_count} PAI skill dirs${RESET} ${GRAY}from ~/.claude/skills/ (user-installed skills kept)${RESET}"

_pai_agent_count=0
for agent in "${PAI_AGENTS[@]}"; do
  [[ -f "$PAI_DIR/agents/$agent" ]] && (( _pai_agent_count++ )) || true
done
(( _pai_agent_count > 0 )) && \
  echo -e "  ${RED}•${RESET} ${SILVER}${_pai_agent_count} PAI agent files${RESET} ${GRAY}from ~/.claude/agents/ (other agents kept)${RESET}"

[[ -d "$PAI_DIR/lib/migration" ]] && \
  echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/lib/migration/${RESET} ${GRAY}(PAI migration tools)${RESET}"

# install.sh — only if it's PAI's entry-point installer
if [[ -f "$PAI_DIR/install.sh" ]] && grep -q "PAI-Install" "$PAI_DIR/install.sh" 2>/dev/null; then
  echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/install.sh${RESET} ${GRAY}(PAI installer entry-point)${RESET}"
fi

# CLAUDE.md — classify as PAI-owned, empty, or user-modified
if [[ -f "$PAI_DIR/CLAUDE.md" ]]; then
  if grep -q "SKILL.md\|This file does nothing\|read skills/PAI" "$PAI_DIR/CLAUDE.md" 2>/dev/null; then
    echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/CLAUDE.md${RESET} ${GRAY}(contains PAI content — will be removed)${RESET}"
  elif [[ ! -s "$PAI_DIR/CLAUDE.md" ]] || [[ -z "$(tr -d '[:space:]' < "$PAI_DIR/CLAUDE.md")" ]]; then
    echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/CLAUDE.md${RESET} ${GRAY}(empty — likely created by PAI, will be removed)${RESET}"
  else
    echo -e "  ${YELLOW}•${RESET} ${SILVER}~/.claude/CLAUDE.md${RESET} ${GRAY}(contains user content — will be left alone)${RESET}"
  fi
fi

echo -e "  ${RED}•${RESET} ${SILVER}PAI keys in settings.json${RESET} ${GRAY}(principal, daidentity, pai, counts, statusLine)${RESET}"
echo -e "  ${RED}•${RESET} ${SILVER}PAI alias${RESET} ${GRAY}in ~/.zshrc and fish config${RESET}"
echo ""

echo -e "  ${BOLD}Fine-grained removal (PAI files removed, user content offered separately):${RESET}"
if [[ -d "$PAI_DIR/hooks" ]]; then
  _pai_hook_count=0
  for hf in "${PAI_HOOKS[@]}"; do
    [[ -f "$PAI_DIR/hooks/$hf" ]] && (( _pai_hook_count++ )) || true
  done
  _total_hooks=$(find "$PAI_DIR/hooks" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
  _user_hooks=$(( _total_hooks - _pai_hook_count ))
  echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/hooks/${RESET} ${GRAY}— ${_pai_hook_count} PAI hooks + handlers/ + lib/ removed; ${_user_hooks} user-added file(s) kept${RESET}"
fi
if [[ -d "$PAI_DIR/MEMORY" ]]; then
  echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/MEMORY/README.md${RESET} ${GRAY}(PAI-shipped docs)${RESET}"
  echo -e "  ${RED}•${RESET} ${SILVER}~/.claude/MEMORY/STATE/${RESET} ${GRAY}(PAI runtime caches — auto-removed)${RESET}"
  echo -e "  ${BLUE}•${RESET} ${SILVER}~/.claude/MEMORY/LEARNING, WORK, RELATIONSHIP, SECURITY, VOICE${RESET} ${GRAY}(your data — offered individually)${RESET}"
fi
[[ -d "$PAI_DIR/plans" ]]  && echo -e "  ${BLUE}•${RESET} ${SILVER}~/.claude/plans/${RESET}  ${GRAY}(your plan files — offered for removal)${RESET}"
[[ -d "$PAI_DIR/tasks" ]]  && echo -e "  ${BLUE}•${RESET} ${SILVER}~/.claude/tasks/${RESET}  ${GRAY}(PAI task tracking data — offered for removal)${RESET}"
[[ -d "$PAI_DIR/teams" ]]  && echo -e "  ${BLUE}•${RESET} ${SILVER}~/.claude/teams/${RESET}  ${GRAY}(PAI team data — offered for removal)${RESET}"
[[ -d "$CONFIG_DIR" ]]     && echo -e "  ${BLUE}•${RESET} ${SILVER}~/.config/PAI/${RESET}    ${GRAY}(API keys — offered for removal)${RESET}"
echo ""
echo -e "  ${GRAY}${BOLD}Not touched:${RESET} ${GRAY}projects/, todos/, plugins/, .credentials.json, history.jsonl,${RESET}"
echo -e "  ${GRAY}statsig/, agents/ (remaining), skills/ (remaining), lib/ (remaining),${RESET}"
echo -e "  ${GRAY}cache/, debug/, telemetry/, and all other Claude Code files.${RESET}"
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

# Back up everything that might contain mixed/user content
for d in MEMORY plans hooks tasks teams; do
  if [[ -d "$PAI_DIR/$d" ]]; then
    cp -r "$PAI_DIR/$d" "$BACKUP_DIR/$d"
    backed "~/.claude/$d/"
  fi
done

if [[ -f "$PAI_DIR/settings.json" ]]; then
  cp "$PAI_DIR/settings.json" "$BACKUP_DIR/settings.json"
  backed "~/.claude/settings.json"
fi

if [[ -d "$CONFIG_DIR" ]]; then
  cp -r "$CONFIG_DIR" "$BACKUP_DIR/config-PAI"
  backed "~/.config/PAI/"
fi

success "Backup complete: $BACKUP_DIR"

# ════════════════════════════════════════════════════════
# Step 2: Voice Server
# ════════════════════════════════════════════════════════
step "Voice Server"

if launchctl list 2>/dev/null | grep -q "com.pai.voice-server"; then
  info "Stopping voice server..."
  launchctl unload "$LAUNCH_AGENT_PLIST" 2>/dev/null || true
  success "Voice server stopped"
else
  skip "Voice server (not running)"
fi

if lsof -ti:8888 -sTCP:LISTEN &>/dev/null 2>&1; then
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

_any=false
for plugin in "$SWIFTBAR_PLUGIN" "$BITBAR_PLUGIN_1" "$BITBAR_PLUGIN_2"; do
  if [[ -L "$plugin" ]] || [[ -f "$plugin" ]]; then
    rm -f "$plugin"; removed "$plugin"; _any=true
  fi
done
$_any || skip "No PAI menu bar plugins found"
pgrep -x "SwiftBar" &>/dev/null && open -g "swiftbar://refreshall" 2>/dev/null || true

# ════════════════════════════════════════════════════════
# Step 4: Shell Configuration
# ════════════════════════════════════════════════════════
step "Shell Configuration"

ZSHRC="$HOME/.zshrc"
if [[ -f "$ZSHRC" ]] && grep -q "# PAI alias\|# CORE alias\|alias pai=" "$ZSHRC" 2>/dev/null; then
  _tmp=$(mktemp)
  awk '
    /^[[:space:]]*$/ { blank=$0; next }
    /^# (PAI|CORE) alias$/ { blank=""; next }
    /^alias pai=/ { blank=""; next }
    /^function pai$/ { in_fn=1; blank=""; next }
    in_fn && /^end$/ { in_fn=0; blank=""; next }
    in_fn { next }
    { if (blank != "") { print blank; blank="" } print }
  ' "$ZSHRC" > "$_tmp" && mv "$_tmp" "$ZSHRC"
  success "Removed PAI alias from ~/.zshrc"
else
  skip "PAI alias in ~/.zshrc"
fi

FISH_CONFIG="$HOME/.config/fish/config.fish"
if [[ -f "$FISH_CONFIG" ]] && grep -q "PAI alias\|function pai" "$FISH_CONFIG" 2>/dev/null; then
  _tmp=$(mktemp)
  awk '
    /^# PAI alias$/ { skip=1; next }
    skip && /^function pai$/ { skip=2; next }
    skip==2 && /^end$/ { skip=0; next }
    skip==2 { next }
    { skip=0; print }
  ' "$FISH_CONFIG" > "$_tmp" && mv "$_tmp" "$FISH_CONFIG"
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
    rm -f "$ENV_SYMLINK"; removed "~/.env (PAI symlink)"
  else
    warn "~/.env points elsewhere (${_target}) — leaving it alone"
  fi
else
  skip "~/.env (not a PAI symlink)"
fi

if [[ -L "$CLAUDE_ENV_SYMLINK" ]]; then
  rm -f "$CLAUDE_ENV_SYMLINK"; removed "~/.claude/.env (symlink)"
else
  skip "~/.claude/.env symlink"
fi

# ════════════════════════════════════════════════════════
# Step 6: PAI-Exclusive Directories
# ════════════════════════════════════════════════════════
step "PAI-Exclusive Directories"

for d in VoiceServer PAI-Install; do
  if [[ -d "$PAI_DIR/$d" ]]; then
    rm -rf "${PAI_DIR:?}/$d"; removed "~/.claude/$d/"
  else
    skip "~/.claude/$d/"
  fi
done

# Remove ~/.claude/.git only if origin is the PAI repo
if [[ -d "$PAI_DIR/.git" ]]; then
  _remote=$(git -C "$PAI_DIR" remote get-url origin 2>/dev/null || true)
  if [[ "$_remote" == *"danielmiessler/PAI"* ]] || \
     [[ "$_remote" == *"danielmiessler/Personal_AI_Infrastructure"* ]]; then
    rm -rf "$PAI_DIR/.git"; removed "~/.claude/.git (PAI repo)"
  else
    warn "~/.claude/.git origin is '$_remote' — leaving it alone"
  fi
fi

# ════════════════════════════════════════════════════════
# Step 7: PAI Files in ~/.claude Root
# ════════════════════════════════════════════════════════
step "PAI Files in ~/.claude"

# statusline-command.sh — PAI-specific, safe to remove
if [[ -f "$PAI_DIR/statusline-command.sh" ]]; then
  rm -f "$PAI_DIR/statusline-command.sh"; removed "~/.claude/statusline-command.sh"
else
  skip "~/.claude/statusline-command.sh"
fi

# install.sh — only remove if it's PAI's entry-point installer
if [[ -f "$PAI_DIR/install.sh" ]] && grep -q "PAI-Install" "$PAI_DIR/install.sh" 2>/dev/null; then
  rm -f "$PAI_DIR/install.sh"; removed "~/.claude/install.sh (PAI installer)"
else
  skip "~/.claude/install.sh (not PAI's or not present)"
fi

# CLAUDE.md — three-way check: PAI content / empty / user content
if [[ ! -f "$PAI_DIR/CLAUDE.md" ]]; then
  skip "~/.claude/CLAUDE.md"
elif grep -q "SKILL.md\|This file does nothing\|read skills/PAI" "$PAI_DIR/CLAUDE.md" 2>/dev/null; then
  rm -f "$PAI_DIR/CLAUDE.md"; removed "~/.claude/CLAUDE.md (PAI content)"
elif [[ ! -s "$PAI_DIR/CLAUDE.md" ]] || [[ -z "$(tr -d '[:space:]' < "$PAI_DIR/CLAUDE.md")" ]]; then
  rm -f "$PAI_DIR/CLAUDE.md"; removed "~/.claude/CLAUDE.md (empty, PAI-created)"
else
  warn "~/.claude/CLAUDE.md contains user content — leaving it alone"
fi

# ════════════════════════════════════════════════════════
# Step 8: PAI Skill Directories (removed by name, not directory)
# ════════════════════════════════════════════════════════
step "PAI Skill Directories (~/.claude/skills/)"

_removed_skills=0
for skill in "${PAI_SKILLS[@]}"; do
  if [[ -d "$PAI_DIR/skills/$skill" ]]; then
    rm -rf "${PAI_DIR:?}/skills/$skill"
    (( _removed_skills++ )) || true
  fi
done

if (( _removed_skills > 0 )); then
  success "Removed ${_removed_skills} PAI skill directories from ~/.claude/skills/"
  if [[ -d "$PAI_DIR/skills" ]] && [[ -z "$(ls -A "$PAI_DIR/skills" 2>/dev/null)" ]]; then
    rmdir "$PAI_DIR/skills"; removed "~/.claude/skills/ (now empty)"
  else
    remaining=$(ls "$PAI_DIR/skills/" 2>/dev/null | wc -l | tr -d ' ')
    info "~/.claude/skills/ kept — ${remaining} non-PAI skill(s) remain"
  fi
else
  skip "PAI skill directories (none found)"
fi

# ════════════════════════════════════════════════════════
# Step 9: PAI Agent Files (removed by name, not directory)
# ════════════════════════════════════════════════════════
step "PAI Agent Files (~/.claude/agents/)"

_removed_agents=0
_skipped_agents=0
for agent in "${PAI_AGENTS[@]}"; do
  if [[ -f "$PAI_DIR/agents/$agent" ]]; then
    rm -f "$PAI_DIR/agents/$agent"
    (( _removed_agents++ )) || true
  else
    (( _skipped_agents++ )) || true
  fi
done

if (( _removed_agents > 0 )); then
  success "Removed ${_removed_agents} PAI agent files from ~/.claude/agents/"
  # Remove agents/ dir itself only if now empty
  if [[ -d "$PAI_DIR/agents" ]] && [[ -z "$(ls -A "$PAI_DIR/agents" 2>/dev/null)" ]]; then
    rmdir "$PAI_DIR/agents"; removed "~/.claude/agents/ (now empty)"
  else
    remaining=$(ls "$PAI_DIR/agents/" 2>/dev/null | wc -l | tr -d ' ')
    info "~/.claude/agents/ kept — ${remaining} non-PAI file(s) remain"
  fi
else
  skip "PAI agent files (none found)"
fi

# ════════════════════════════════════════════════════════
# Step 10: PAI lib/migration
# ════════════════════════════════════════════════════════
step "PAI Migration Tools (~/.claude/lib/)"

if [[ -d "$PAI_DIR/lib/migration" ]]; then
  rm -rf "$PAI_DIR/lib/migration"; removed "~/.claude/lib/migration/"
  # Remove lib/ only if now empty
  if [[ -d "$PAI_DIR/lib" ]] && [[ -z "$(ls -A "$PAI_DIR/lib" 2>/dev/null)" ]]; then
    rmdir "$PAI_DIR/lib"; removed "~/.claude/lib/ (now empty)"
  else
    info "~/.claude/lib/ kept — other content remains"
  fi
else
  skip "~/.claude/lib/migration/"
fi

# ════════════════════════════════════════════════════════
# Step 11: Strip PAI Keys from settings.json
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

removed_keys = []
for key in ("principal", "daidentity", "pai", "counts", "plansDirectory", "statusLine"):
    if key in s:
        del s[key]
        removed_keys.append(key)

# Remove PAI-specific env vars, keep others
if "env" in s and isinstance(s["env"], dict):
    for k in ("PROJECTS_DIR",):
        if k in s["env"]:
            del s["env"][k]
            removed_keys.append(f"env.{k}")
    if not s["env"]:
        del s["env"]

with open(path, "w") as f:
    json.dump(s, f, indent=2)
    f.write("\n")

if removed_keys:
    print(f"  \033[38;2;34;197;94m✓\033[0m  Removed PAI keys from settings.json: {', '.join(removed_keys)}")
else:
    print(f"  \033[38;2;100;116;139m–\033[0m  No PAI keys found in settings.json")
print(f"  \033[38;2;100;116;139m–\033[0m  Preserved: permissions, hooks, mcpServers, and all other Claude Code config")
PYEOF
  else
    warn "python3 not found — settings.json not modified (original backed up at $BACKUP_DIR/settings.json)"
  fi
else
  skip "settings.json (not found)"
fi

# ════════════════════════════════════════════════════════
# Step 12: hooks/ — remove PAI-named files, keep user additions
# ════════════════════════════════════════════════════════
step "PAI Hook Files (~/.claude/hooks/)"

if [[ -d "$PAI_DIR/hooks" ]]; then
  echo -e "  ${GRAY}Already backed up to: $BACKUP_DIR/hooks/${RESET}"
  _removed_hooks=0
  for hf in "${PAI_HOOKS[@]}"; do
    if [[ -f "$PAI_DIR/hooks/$hf" ]]; then
      rm -f "$PAI_DIR/hooks/$hf"
      (( _removed_hooks++ )) || true
    fi
  done
  # Remove PAI's subdirectories entirely (100% PAI-owned)
  for subdir in handlers lib; do
    if [[ -d "$PAI_DIR/hooks/$subdir" ]]; then
      rm -rf "$PAI_DIR/hooks/$subdir"
      removed "~/.claude/hooks/$subdir/"
    fi
  done
  (( _removed_hooks > 0 )) && success "Removed ${_removed_hooks} PAI hook files from ~/.claude/hooks/"
  _remaining_hooks=$(find "$PAI_DIR/hooks" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$_remaining_hooks" -gt 0 ]]; then
    info "~/.claude/hooks/ kept — ${_remaining_hooks} non-PAI file(s) remain"
  elif [[ -z "$(ls -A "$PAI_DIR/hooks" 2>/dev/null)" ]]; then
    rmdir "$PAI_DIR/hooks" 2>/dev/null && removed "~/.claude/hooks/ (now empty)" || true
  fi
else
  skip "~/.claude/hooks/"
fi

# ════════════════════════════════════════════════════════
# Step 13: MEMORY/ — remove PAI files, offer user data
# ════════════════════════════════════════════════════════
step "PAI Memory (~/.claude/MEMORY/)"

if [[ -d "$PAI_DIR/MEMORY" ]]; then
  echo -e "  ${GRAY}Already backed up to: $BACKUP_DIR/MEMORY/${RESET}\n"

  # Remove PAI-shipped README (content check)
  if [[ -f "$PAI_DIR/MEMORY/README.md" ]] && \
     grep -qi "personal ai\|pai\|memory system" "$PAI_DIR/MEMORY/README.md" 2>/dev/null; then
    rm -f "$PAI_DIR/MEMORY/README.md"
    removed "~/.claude/MEMORY/README.md (PAI-shipped)"
  fi

  # Auto-remove STATE/ — PAI runtime caches (ephemeral, not personal data)
  if [[ -d "$PAI_DIR/MEMORY/STATE" ]]; then
    rm -rf "$PAI_DIR/MEMORY/STATE"
    removed "~/.claude/MEMORY/STATE/ (PAI runtime caches)"
  fi

  # Offer each user data subdir individually
  for subdir in LEARNING WORK RELATIONSHIP SECURITY VOICE; do
    if [[ -d "$PAI_DIR/MEMORY/$subdir" ]]; then
      _count=$(find "$PAI_DIR/MEMORY/$subdir" -type f 2>/dev/null | wc -l | tr -d ' ')
      if confirm "Remove ~/.claude/MEMORY/$subdir/? (${_count} file(s) — your personal AI memory)"; then
        rm -rf "$PAI_DIR/MEMORY/$subdir"
        removed "~/.claude/MEMORY/$subdir/"
      else
        warn "Kept ~/.claude/MEMORY/$subdir/"
      fi
    fi
  done

  # Remove MEMORY/ itself if now empty
  if [[ -z "$(ls -A "$PAI_DIR/MEMORY" 2>/dev/null)" ]]; then
    rmdir "$PAI_DIR/MEMORY" && removed "~/.claude/MEMORY/ (now empty)" || true
  fi
else
  skip "~/.claude/MEMORY/"
fi

# ════════════════════════════════════════════════════════
# Step 14: plans/ — user-created plan files
# ════════════════════════════════════════════════════════
step "Project Plans (~/.claude/plans/)"

if [[ -d "$PAI_DIR/plans" ]]; then
  _count=$(find "$PAI_DIR/plans" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo -e "  ${GRAY}Contains ${_count} user-created plan file(s) — already backed up.${RESET}"
  if confirm "Remove ~/.claude/plans/?"; then
    rm -rf "${PAI_DIR:?}/plans"
    removed "~/.claude/plans/"
  else
    warn "Kept ~/.claude/plans/ — backup at $BACKUP_DIR/plans/"
  fi
else
  skip "~/.claude/plans/"
fi

# ════════════════════════════════════════════════════════
# Step 15: tasks/ and teams/ — PAI runtime tracking data
# ════════════════════════════════════════════════════════
step "PAI Runtime Data (~/.claude/tasks/ and ~/.claude/teams/)"

for d in tasks teams; do
  if [[ -d "$PAI_DIR/$d" ]]; then
    _count=$(ls "$PAI_DIR/$d" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GRAY}~/.claude/$d/ contains ${_count} item(s) — already backed up.${RESET}"
    if confirm "Remove ~/.claude/$d/?"; then
      rm -rf "${PAI_DIR:?}/$d"
      removed "~/.claude/$d/"
    else
      warn "Kept ~/.claude/$d/ — backup at $BACKUP_DIR/$d/"
    fi
  else
    skip "~/.claude/$d/"
  fi
done

# ════════════════════════════════════════════════════════
# Step 16: ~/.config/PAI (API Keys)
# ════════════════════════════════════════════════════════
step "PAI Config (~/.config/PAI)"

if [[ -d "$CONFIG_DIR" ]]; then
  if confirm "Remove ~/.config/PAI/? (API keys — already backed up)"; then
    rm -rf "$CONFIG_DIR"; removed "~/.config/PAI/"
  else
    warn "Kept ~/.config/PAI/ — API keys preserved"
  fi
else
  skip "~/.config/PAI/"
fi

# ════════════════════════════════════════════════════════
# Optional: Legacy backup directories
# ════════════════════════════════════════════════════════
_old_backups=()
for candidate in "$HOME/.claude-backup" "$HOME/.claude-old" "$HOME/.claude-BACKUP"; do
  [[ -d "$candidate" ]] && _old_backups+=("$candidate")
done

if [[ ${#_old_backups[@]} -gt 0 ]]; then
  step "Legacy PAI Backup Directories"
  for bd in "${_old_backups[@]}"; do warn "Found: $bd"; done
  if confirm "Remove these old backup directories?"; then
    for bd in "${_old_backups[@]}"; do rm -rf "$bd"; removed "$bd"; done
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
echo -e "  ${GRAY}• Restart your terminal to clear the${RESET} ${SILVER}pai${RESET} ${GRAY}alias${RESET}"
echo -e "  ${GRAY}• Review backup before deleting:${RESET} ${SILVER}ls $BACKUP_DIR${RESET}"
echo -e "  ${GRAY}• Claude Code (the CLI) remains installed — to remove it:${RESET}"
echo -e "    ${SILVER}npm uninstall -g @anthropic-ai/claude-code${RESET}"
echo ""
echo -e "${STEEL}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}"
echo ""
