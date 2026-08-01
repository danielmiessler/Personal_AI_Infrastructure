#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#   LifeOS — One-Line Bootstrap Installer
#   curl -fsSL https://ourlifeos.ai/install.sh | bash
#
#   Unlike a whole-harness install, this does NOT clobber your setup.
#   It drops the LifeOS skill into your existing harness, then hands off
#   to the agentic `/LifeOS setup`, which (with your permission) does the
#   conflict detection, the principal conversation, the TELOS interview
#   (current state + ideal state), pulls in any sources you provide, and
#   wires hooks — adapting to YOUR OS and harness as it goes.
#
#   What this script does (the bootstrap only):
#     1. Verifies prerequisites (curl, bash, tar; offers to install bun)
#     2. Detects your harness + any existing LifeOS install (no clobber)
#     3. Fetches the latest LifeOS release (or uses $LIFEOS_SRC locally)
#     4. Places the LifeOS skill additively into your skills dir
#     5. Migrates stale pre-7.x launch aliases (`pai` → the 7.x launcher)
#     6. Hands off to `/LifeOS setup` (the agentic onboarding)
#
#   Local/offline install (no network):
#     LIFEOS_SRC=/path/to/LIFEOS_RELEASES/<version> bash install.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ─── Release resolution — always the latest published release ─────
# No pin: this resolves the newest GitHub Release at run time, so every new
# release reaches every installer with zero edits here. Override with
# LIFEOS_VERSION=x.y.z (or LIFEOS_TAG=vx.y.z) to force a specific version.
# Resolution order: (1) the releases/latest HTML redirect — NOT subject to the
# anonymous API rate limit (60/hr/IP) that made the old API-only path fail on
# shared IPs; (2) the GitHub API; (3) a stamped fallback tag, WITH a warning.
# LIFEOS_FALLBACK_TAG is stamped to the release version by EmitSkill at emit
# time — never edit it by hand, and never trust it silently (2026-07-12: a
# rate-limited API call silently installed v7.0.0 after v7.1.1 had shipped).
# Repo owner/name is parameterized — set at publish time, never hard-coded here.
LIFEOS_REPO="${LIFEOS_REPO:-danielmiessler/LifeOS}"
LIFEOS_FALLBACK_TAG="v7.28.3"
if [ -n "${LIFEOS_VERSION:-}" ]; then
  LIFEOS_TAG="v${LIFEOS_VERSION}"
elif [ -z "${LIFEOS_TAG:-}" ]; then
  # 1) Redirect probe: github.com/<repo>/releases/latest 302s to .../releases/tag/vX.Y.Z
  LIFEOS_TAG="$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
    "https://github.com/${LIFEOS_REPO}/releases/latest" 2>/dev/null \
    | sed -n 's|.*/releases/tag/||p' || true)"
  # 2) API fallback (rate-limited for anonymous callers, so it's second)
  if [ -z "$LIFEOS_TAG" ]; then
    LIFEOS_TAG="$(curl -fsSL "https://api.github.com/repos/${LIFEOS_REPO}/releases/latest" 2>/dev/null \
      | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || true)"
  fi
  # 3) Stamped fallback — loud, never silent
  if [ -z "$LIFEOS_TAG" ]; then
    LIFEOS_TAG="$LIFEOS_FALLBACK_TAG"
    echo "WARNING: could not resolve the latest release from GitHub (network/rate limit)." >&2
    echo "WARNING: installing pinned fallback ${LIFEOS_FALLBACK_TAG} — a newer release may exist." >&2
    echo "WARNING: re-run later, or force one with LIFEOS_VERSION=x.y.z" >&2
  fi
fi
LIFEOS_VERSION="${LIFEOS_TAG#v}"
LIFEOS_TARBALL_URL="${LIFEOS_TARBALL_URL:-https://github.com/${LIFEOS_REPO}/archive/refs/tags/${LIFEOS_TAG}.tar.gz}"
# Where the LifeOS skill dir lives inside the release tree:
LIFEOS_RELEASE_SUBPATH="${LIFEOS_RELEASE_SUBPATH:-LifeOS}"
# Local source override — point at a LIFEOS_RELEASES/<version> dir to install offline.
LIFEOS_SRC="${LIFEOS_SRC:-}"
# Target skills dir (auto-detected below; override to force).
LIFEOS_SKILLS_DIR="${LIFEOS_SKILLS_DIR:-}"
DRY_RUN="${DRY_RUN:-0}"

# ─── Colors / helpers ────────────────────────────────────────────
if [ -t 1 ]; then
  BLUE='\033[38;2;59;130;246m'; LIGHT_BLUE='\033[38;2;147;197;253m'
  DARK_BLUE='\033[38;2;29;78;216m'; GREEN='\033[38;2;34;197;94m'; YELLOW='\033[38;2;234;179;8m'
  RED='\033[38;2;239;68;68m'; DIM='\033[38;2;71;85;105m'; RESET='\033[0m'; BOLD='\033[1m'
else
  BLUE='' LIGHT_BLUE='' DARK_BLUE='' GREEN='' YELLOW='' RED='' DIM='' RESET='' BOLD=''
fi
info()    { printf "  ${BLUE}ℹ${RESET} %b\n" "$1"; }
success() { printf "  ${GREEN}✓${RESET} %b\n" "$1"; }
warn()    { printf "  ${YELLOW}⚠${RESET} %b\n" "$1"; }
error()   { printf "  ${RED}✗${RESET} %b\n" "$1" >&2; }
step()    { printf "\n${BOLD}${LIGHT_BLUE}▸ %s${RESET}\n" "$1"; }
run()     { if [ "$DRY_RUN" = "1" ]; then echo "  [DRY-RUN] $*"; else "$@"; fi; }

printf "\n  ${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
printf "  ${BOLD}${DARK_BLUE}Life${BLUE}O${LIGHT_BLUE}S${RESET}   ${BOLD}the Life Operating System${RESET}      ${DIM}current state ${BLUE}→${DIM} ideal state${RESET}   ${DIM}·${RESET}   ${LIGHT_BLUE}v%s bootstrap${RESET}\n" "$LIFEOS_VERSION"
printf "  ${LIGHT_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
[ "$DRY_RUN" = "1" ] && warn "DRY-RUN mode — no changes will be made."

# ─── Step 1: Prereqs ─────────────────────────────────────────────
step "1/6  Checking prerequisites"
OS="$(uname -s)"
case "$OS" in
  Darwin) info "Platform: macOS" ;;
  Linux)  info "Platform: Linux" ;;
  *)      warn "Unrecognized OS: $OS — proceeding; the setup will adapt." ;;
esac

need() { command -v "$1" >/dev/null 2>&1 && success "$1 ($(command -v "$1"))" || { error "Required: $1"; return 1; }; }
FAIL=0
need curl || FAIL=1
need bash || FAIL=1
need tar  || FAIL=1
[ $FAIL -ne 0 ] && { error "Install the missing prerequisites and re-run."; exit 1; }

# LifeOS's bun.lock uses the v6 lockfile format, which bun < 1.2 cannot parse.
# So we require bun AND a modern-enough bun — auto-installing (which pulls the
# latest) via the same official installer whether bun is absent OR too old.
BUN_MIN_MAJOR=1
BUN_MIN_MINOR=2
bun_too_old() {
  # returns 0 (true) when the installed bun is older than $BUN_MIN_MAJOR.$BUN_MIN_MINOR
  local v major minor
  v="$(bun --version 2>/dev/null | head -n1 | tr -d '[:space:]' || true)"
  [ -z "$v" ] && return 0
  major="${v%%.*}"; minor="${v#*.}"; minor="${minor%%.*}"
  case "$major" in ''|*[!0-9]*) return 0 ;; esac
  case "$minor" in ''|*[!0-9]*) minor=0 ;; esac
  [ "$major" -gt "$BUN_MIN_MAJOR" ] && return 1
  [ "$major" -lt "$BUN_MIN_MAJOR" ] && return 0
  [ "$minor" -lt "$BUN_MIN_MINOR" ] && return 0 || return 1
}
install_bun() {
  # Dry-run must simulate end-to-end: the run wrapper suppresses the install,
  # so the postcondition check would abort the simulation (Forge audit, 2026-07-30).
  if [ "$DRY_RUN" = "1" ]; then info "[DRY-RUN] Would install bun (curl -fsSL https://bun.sh/install | bash)"; return 0; fi
  if [ "${LIFEOS_AUTO_INSTALL_BUN:-1}" = "1" ] && [ -z "${CI:-}" ] && [ -t 0 ]; then
    info "Installing bun..."
    run bash -c "curl -fsSL https://bun.sh/install | bash"
    [ -f "$HOME/.bun/bin/bun" ] && export PATH="$HOME/.bun/bin:$PATH" && hash -r && success "bun installed" \
      || { error "bun install failed"; exit 1; }
  else
    error "Install bun ≥ ${BUN_MIN_MAJOR}.${BUN_MIN_MINOR} first:  ${BOLD}curl -fsSL https://bun.sh/install | bash${RESET}"; exit 1
  fi
}

if ! command -v bun >/dev/null 2>&1; then
  warn "bun not found — LifeOS tools need it."
  install_bun
elif bun_too_old; then
  warn "bun $(bun --version 2>/dev/null) is too old — LifeOS needs bun ≥ ${BUN_MIN_MAJOR}.${BUN_MIN_MINOR} (v6 bun.lock format)."
  install_bun
fi
if [ "$DRY_RUN" != "1" ] && bun_too_old; then
  error "bun is still older than ${BUN_MIN_MAJOR}.${BUN_MIN_MINOR} ($(bun --version 2>/dev/null)). Upgrade with ${BOLD}bun upgrade${RESET} and re-run."; exit 1
fi
success "bun ($(command -v bun), v$(bun --version 2>/dev/null))"

# ─── Step 2: Detect harness (no clobber) ─────────────────────────
step "2/6  Detecting your harness"
if [ -z "$LIFEOS_SKILLS_DIR" ]; then
  if [ -d "$HOME/.claude" ]; then LIFEOS_SKILLS_DIR="$HOME/.claude/skills"
  elif [ -d "$HOME/.config/claude" ]; then LIFEOS_SKILLS_DIR="$HOME/.config/claude/skills"
  else LIFEOS_SKILLS_DIR="$HOME/.claude/skills"; fi
fi
info "Skills dir: ${BOLD}${LIFEOS_SKILLS_DIR/#$HOME/~}${RESET}"
TARGET="$LIFEOS_SKILLS_DIR/LifeOS"
if [ -e "$TARGET" ]; then
  info "Existing LifeOS skill found — it will be backed up AFTER the new release is fetched."
else
  success "No existing LifeOS skill — clean drop-in."
fi

# ─── Step 3: Fetch the LifeOS release ────────────────────────────
step "3/6  Fetching LifeOS ${LIFEOS_TAG}"
TMP_DIR="$(mktemp -d -t lifeos-install-XXXXXX)"
# The EXIT trap also restores the backed-up skill if we die MID-PLACEMENT —
# command failure alone was handled, but SIGINT/SIGTERM during the copy left
# no active skill despite the transactional promise (Forge audit, 2026-07-30).
PLACEMENT_BACKUP=""
PLACEMENT_DONE=0
restore_on_abort() {
  rm -rf "$TMP_DIR"
  if [ -n "$PLACEMENT_BACKUP" ] && [ "$PLACEMENT_DONE" = "0" ] && [ -d "$PLACEMENT_BACKUP" ]; then
    rm -rf "$TARGET" 2>/dev/null || true
    mv "$PLACEMENT_BACKUP" "$TARGET" 2>/dev/null || true
    echo "Aborted mid-placement — previous LifeOS skill restored from backup." >&2
  fi
}
# Signals must EXIT (which fires the EXIT trap above) — a handler that merely
# restores would let bash resume the script afterward and reinstall over the
# restored backup (bash defers traps until the foreground child returns).
trap restore_on_abort EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [ -n "$LIFEOS_SRC" ]; then
  info "Local source: ${LIFEOS_SRC/#$HOME/~}"
  SRC_SKILL="$LIFEOS_SRC/$LIFEOS_RELEASE_SUBPATH"
  [ -d "$SRC_SKILL" ] || { error "LifeOS skill not found at $SRC_SKILL"; exit 1; }
else
  info "Downloading ${LIFEOS_TAG} (HTTPS, no auth)..."
  if [ "$LIFEOS_REPO" = "OWNER/REPO" ]; then
    error "Network install needs LIFEOS_REPO set (owner/name), or use LIFEOS_SRC for a local install."; exit 1
  fi
  run bash -c "curl -fsSL '$LIFEOS_TARBALL_URL' | tar -xzf - -C '$TMP_DIR'"
  if [ "$DRY_RUN" = "1" ]; then
    # The run wrapper suppressed the download, so the postconditions below would
    # abort the simulation against an empty TMP_DIR (Forge audit, 2026-07-30 —
    # same class as the install_bun postcondition). Simulate the resolved path.
    SRC_SKILL="$TMP_DIR/[dry-run-extracted]/$LIFEOS_RELEASE_SUBPATH"
    info "[DRY-RUN] Would extract the tarball and resolve the skill at .../$LIFEOS_RELEASE_SUBPATH"
  else
    EXTRACTED="$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
    SRC_SKILL="$EXTRACTED/$LIFEOS_RELEASE_SUBPATH"
    [ -d "$SRC_SKILL" ] || { error "LifeOS skill not in tarball at $LIFEOS_RELEASE_SUBPATH"; exit 1; }
  fi
fi
success "Fetched ${LIFEOS_TAG}"

# Back up the existing skill ONLY now that a usable source is in hand. Doing this
# in Step 2 meant any Step 3 failure — an unset LIFEOS_REPO, a missing local
# source, a network error — left the user with no active LifeOS skill and a
# backup directory they had to find themselves.
if [ -e "$TARGET" ]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  warn "Existing LifeOS skill — backing up ONLY it to LifeOS.backup-$TS (your other files are untouched)."
  run mv "$TARGET" "$TARGET.backup-$TS"
  [ "$DRY_RUN" = "1" ] || PLACEMENT_BACKUP="$TARGET.backup-$TS"
fi

# ─── Step 4: Place the skill (additive) ──────────────────────────
step "4/6  Installing the LifeOS skill (additive — nothing else touched)"
run mkdir -p "$LIFEOS_SKILLS_DIR"
# Transactional placement: a failed copy (permissions, disk, interrupt) must
# restore the backup instead of leaving no active skill (Forge audit, 2026-07-30).
if [ "$DRY_RUN" = "1" ]; then
  run cp -R "$SRC_SKILL" "$TARGET"
else
  if ! cp -R "$SRC_SKILL" "$TARGET"; then
    if [ -n "${TS:-}" ] && [ -d "$TARGET.backup-$TS" ]; then
      rm -rf "$TARGET" 2>/dev/null || true
      mv "$TARGET.backup-$TS" "$TARGET"
      error "Skill copy failed — previous installation RESTORED from backup. Fix the underlying error (disk space? permissions?) and re-run."
    else
      error "Skill copy failed and no backup exists — re-run the installer after fixing the underlying error."
    fi
    exit 1
  fi
fi
PLACEMENT_DONE=1
success "LifeOS skill placed at ${TARGET/#$HOME/~}"

# Interceptor verification captures must never ride into a user's backup commit
# (public issue #1566, @xmasyx): keeping the config root under git with a private
# remote is common, and captures can contain authenticated pages. Name-anchored,
# NOT extension-anchored — both .png and .jpg captures have been observed, and a
# format change must not silently reopen the hole. Idempotent append.
GITIGNORE_TARGET="$(dirname "$LIFEOS_SKILLS_DIR")/.gitignore"
# Each rule is guarded INDIVIDUALLY — a compound guard keyed on the first rule
# left older installs missing every rule added later (Forge audit, 2026-07-30).
# Direct redirection, never a path interpolated into a bash -c string — a
# single quote in HOME would terminate the quoting and reparse the path as
# shell syntax (Forge audit P1, 2026-07-30).
append_gitignore_line() {
  if [ "$DRY_RUN" = "1" ]; then echo "  [DRY-RUN] append to gitignore: $1"; else printf '%s\n' "$1" >> "$GITIGNORE_TARGET"; fi
}
CAPTURE_RULES_ADDED=0
for capture_rule in 'interceptor-screenshot-*' 'interceptor-capture-*' 'interceptor-macos-screenshot-*'; do
  if ! grep -qxF "$capture_rule" "$GITIGNORE_TARGET" 2>/dev/null; then
    if [ "$CAPTURE_RULES_ADDED" = "0" ] && ! grep -q '# Interceptor verification captures' "$GITIGNORE_TARGET" 2>/dev/null; then
      append_gitignore_line ''
      append_gitignore_line '# Interceptor verification captures — never commit (name-anchored; capture format varies)'
    fi
    append_gitignore_line "$capture_rule"
    CAPTURE_RULES_ADDED=1
  fi
done
[ "$CAPTURE_RULES_ADDED" = "1" ] && success "Backup-safety gitignore rules for Interceptor captures in place"

# ─── Step 5: Migrate stale pre-7.x launch aliases (upgrade path) ──
# Pre-7.x installs wired a `pai` launch alias — either `cd ~/.claude && claude`
# or `bun ~/.claude/PAI/ACTIONS/pai.ts`. 7.x renamed PAI/ → LIFEOS/ and made the
# launch constitutional (`lifeos.ts -s LIFEOS_SYSTEM_PROMPT.md`), so an old alias
# either dies on the missing PAI/ path or silently launches WITHOUT the
# constitution. Repoint stale aliases in place — SAME alias name, so the user's
# muscle-memory invocation keeps working — and add the canonical `lifeos` alias.
# Detection is deliberately tight (only the two documented historical forms:
# a /PAI/ path, or a bare `&& claude` launch); a current 7.x alias always
# contains LIFEOS_SYSTEM_PROMPT and is never touched, and the valid Arbol CLI
# alias (ARBOL/Actions/lifeos.ts) matches neither pattern. The rc is backed up
# first; the rewrite is idempotent (commented lines no longer match). Skip
# entirely with LIFEOS_SKIP_ALIAS=1. Fish users: migrate the funcsaved alias
# by hand (see INSTALL.md step 7).
step "5/6  Migrating launch aliases (pre-7.x upgrades)"
CONFIG_ROOT="$(dirname "$LIFEOS_SKILLS_DIR")"
LAUNCHER="$CONFIG_ROOT/LIFEOS/TOOLS/lifeos.ts"
SYS_PROMPT="$CONFIG_ROOT/LIFEOS/LIFEOS_SYSTEM_PROMPT.md"
migrate_rc() {
  local rc="$1" stale names n ts
  [ -f "$rc" ] || return 0
  stale="$(grep -E '^[[:space:]]*alias[[:space:]]+(pai|kai|lifeos)=' "$rc" 2>/dev/null \
    | grep -v 'LIFEOS_SYSTEM_PROMPT' \
    | grep -E '/PAI/|&&[[:space:]]*claude' || true)"
  [ -z "$stale" ] && return 0
  warn "Stale pre-7.x launch alias in ${rc/#$HOME/~}:"
  printf '%s\n' "$stale" | sed 's/^/      /'
  if [ "$DRY_RUN" = "1" ]; then echo "  [DRY-RUN] Would back up ${rc/#$HOME/~}, comment the line(s) out, and repoint to the 7.x launcher."; return 0; fi
  ts="$(date +%Y%m%d-%H%M%S)"
  cp "$rc" "$rc.lifeos-backup-$ts"
  names="$(printf '%s\n' "$stale" | sed -E 's/^[[:space:]]*alias[[:space:]]+([A-Za-z_][A-Za-z0-9_]*)=.*/\1/' | sort -u)"
  awk -v tag="$LIFEOS_TAG" '
    /^[[:space:]]*alias[[:space:]]+(pai|kai|lifeos)=/ && !/LIFEOS_SYSTEM_PROMPT/ && (/\/PAI\// || /&&[[:space:]]*claude/) {
      print "# [migrated to LifeOS " tag " — see .lifeos-backup] " $0; next
    }
    { print }
  ' "$rc" > "$rc.lifeos-tmp" && mv "$rc.lifeos-tmp" "$rc"
  if [ -f "$LAUNCHER" ]; then
    local add_lifeos=1
    printf '%s\n' $names | grep -qx lifeos && add_lifeos=0
    grep -E '^[[:space:]]*alias[[:space:]]+lifeos=' "$rc" 2>/dev/null | grep -q 'LIFEOS_SYSTEM_PROMPT' && add_lifeos=0
    {
      echo ""
      echo "# LifeOS ${LIFEOS_TAG} launch aliases (repointed from pre-7.x by install.sh)"
      for n in $names; do
        echo "alias $n='bun $LAUNCHER -s $SYS_PROMPT'"
      done
      if [ "$add_lifeos" = "1" ]; then echo "alias lifeos='bun $LAUNCHER -s $SYS_PROMPT'"; fi
    } >> "$rc"
    success "Repointed $(echo $names | tr '\n' ' ')to the constituted 7.x launcher (backup: $(basename "$rc").lifeos-backup-$ts)"
  else
    warn "Old alias commented out, but the LIFEOS launcher isn't placed yet — /LifeOS setup will wire the new alias (backup: $(basename "$rc").lifeos-backup-$ts)."
  fi
}
if [ "${LIFEOS_SKIP_ALIAS:-0}" = "1" ]; then
  info "Skipping alias migration (LIFEOS_SKIP_ALIAS=1)."
else
  FOUND_STALE=0
  for RC in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
    if [ -f "$RC" ] && grep -E '^[[:space:]]*alias[[:space:]]+(pai|kai|lifeos)=' "$RC" 2>/dev/null | grep -v 'LIFEOS_SYSTEM_PROMPT' | grep -qE '/PAI/|&&[[:space:]]*claude'; then FOUND_STALE=1; fi
    migrate_rc "$RC"
  done
  [ "$FOUND_STALE" = "0" ] && success "No stale pre-7.x launch aliases found."
fi

# ─── Step 6: Hand off to the agentic setup ───────────────────────
step "6/6  Onboarding"
if [ "$DRY_RUN" = "1" ]; then info "[DRY-RUN] Would launch /LifeOS setup"; exit 0; fi
echo
success "LifeOS is installed. Now let's set it up for YOU."
info "The rest is a conversation — it detects conflicts, asks about your TELOS"
info "(current state + ideal state), pulls in any sources you provide, and wires"
info "hooks with your permission. Nothing changes without you saying yes."
echo
if command -v claude >/dev/null 2>&1 && [ -z "${CLAUDECODE:-}" ]; then
  info "Launching setup..."
  exec claude "/LifeOS setup"
else
  printf "  ${BOLD}Open your harness and run:${RESET}  ${LIGHT_BLUE}/LifeOS setup${RESET}\n\n"
fi
