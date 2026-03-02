#!/usr/bin/env bash
# test-nondefault-update.sh — Upgrade PAI at a non-default CLAUDE_CONFIG_DIR
#
# Equivalent of the upstream upgrade flow (backup → cp -r .claude ~/ → BuildCLAUDE.ts)
# but adapted for non-default target directories. Does NOT use the installer.
#
# Usage:
#   ./test-nondefault-update.sh /path/to/target
#
# What it does:
#   1. Backs up existing install
#   2. Copies release files, skipping runtime artifacts
#   3. Removes stale files not in the new release
#   4. Clears stale caches
#   5. Updates settings.json PAI_DIR and hook command paths
#   6. Verifies ancestor traversal blocker
#   7. Rebuilds CLAUDE.md from template
#   8. Runs verification checks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_SOURCE="$SCRIPT_DIR/.claude"

# Runtime artifacts and user data to preserve (never overwrite or delete)
SKIP_DIRS=".claude.json history.jsonl cache debug backups plugins mcp-needs-auth-cache.json projects todos teams tasks"
# User data that should survive upgrades
PRESERVE_DIRS="MEMORY .env agents"

# ── Usage ───────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 <target-directory>"
  echo ""
  echo "Upgrades PAI v4.0.3 at a non-default CLAUDE_CONFIG_DIR."
  echo "Backs up the existing install, copies new release files,"
  echo "preserves user data (MEMORY, .env, agents), and rebuilds config."
  echo ""
  echo "Does NOT use the PAI installer — suitable for non-default installs"
  echo "where the installer may not resolve paths correctly."
  exit 1
}

# ── Parse args ──────────────────────────────────────────────────────────────
TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  usage
fi

# Resolve to absolute path
TARGET="$(cd "$(dirname "$TARGET")" 2>/dev/null && pwd)/$(basename "$TARGET")" || TARGET="$1"

# ── Validate ────────────────────────────────────────────────────────────────
if [[ ! -d "$REPO_SOURCE" ]]; then
  echo "ERROR: Source directory not found: $REPO_SOURCE"
  echo "Run this script from Releases/v4.0.3/"
  exit 1
fi

REAL_CLAUDE="$HOME/.claude"
if [[ "$TARGET" == "$REAL_CLAUDE" ]]; then
  echo "ERROR: Target is your real ~/.claude — use the standard upgrade flow instead."
  echo "  cp -r .claude ~/ && bun ~/.claude/PAI/Tools/BuildCLAUDE.ts"
  exit 1
fi

if [[ ! -d "$TARGET" ]]; then
  echo "ERROR: Target does not exist: $TARGET"
  echo "For fresh installs, use test-nondefault-install.sh instead."
  exit 1
fi

# Quick sanity check — is this actually a PAI install?
if [[ ! -f "$TARGET/settings.json" ]]; then
  echo "ERROR: $TARGET/settings.json not found — is this a PAI install?"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo " PAI v4.0.3 — Non-Default Upgrade"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Source:  $REPO_SOURCE"
echo "  Target:  $TARGET"
echo ""

# ── Step 1: Backup ──────────────────────────────────────────────────────────
BACKUP="${TARGET}-backup-$(date +%Y%m%d-%H%M%S)"
echo "1. Backing up existing install..."
cp -a "$TARGET" "$BACKUP"
echo "   Backed up to: $BACKUP"

# ── Step 2: Copy release files ──────────────────────────────────────────────
echo "2. Copying new release files..."

# Build exclusion args for both runtime artifacts and user data
EXCLUDE_ARGS=()
for skip in $SKIP_DIRS $PRESERVE_DIRS; do
  EXCLUDE_ARGS+=(-name "$skip" -prune -o)
done

# Remove stale files in target that don't exist in source (like rsync --delete)
# but only for files that aren't in preserved directories
STALE_COUNT=0
while IFS= read -r rel_path; do
  if [[ ! -e "$REPO_SOURCE/$rel_path" ]]; then
    rm -f "$TARGET/$rel_path"
    STALE_COUNT=$((STALE_COUNT + 1))
  fi
done < <(cd "$TARGET" && find . "${EXCLUDE_ARGS[@]}" -type f -print | sed 's|^\./||')
if [[ $STALE_COUNT -gt 0 ]]; then
  echo "   Removed $STALE_COUNT stale files not in new release"
fi

# Copy source files, skipping runtime artifacts and user data
FILE_COUNT=0
(cd "$REPO_SOURCE" && find . "${EXCLUDE_ARGS[@]}" -type f -print) | sed 's|^\./||' | while IFS= read -r rel_path; do
  src="$REPO_SOURCE/$rel_path"
  dst="$TARGET/$rel_path"
  dst_dir="$(dirname "$dst")"
  [[ -d "$dst_dir" ]] || mkdir -p "$dst_dir"
  cp -p "$src" "$dst"
done

FILE_COUNT=$(cd "$TARGET" && find . -type f | wc -l | tr -d ' ')
echo "   Done — $FILE_COUNT files in target."

# ── Step 3: Clear stale caches ──────────────────────────────────────────────
echo "3. Clearing stale caches..."
rm -f "$TARGET/MEMORY/STATE/counts-cache.sh" 2>/dev/null
if [[ -f "$TARGET/settings.json" ]]; then
  python3 -c "
import json, sys
with open(sys.argv[1], 'r') as f:
    settings = json.load(f)
if 'counts' in settings:
    del settings['counts']
    with open(sys.argv[1], 'w') as f:
        json.dump(settings, f, indent=2)
        f.write('\n')
    print('   Removed stale .counts from settings.json')
else:
    print('   No stale .counts found')
" "$TARGET/settings.json"
fi

# ── Step 4: Update settings.json ────────────────────────────────────────────
echo "4. Updating settings.json PAI_DIR and hook commands..."
SETTINGS="$TARGET/settings.json"
if [[ -f "$SETTINGS" ]]; then
  python3 -c "
import json, sys, os

target = sys.argv[1]
settings_path = sys.argv[2]

with open(settings_path, 'r') as f:
    settings = json.load(f)

# Update env.PAI_DIR to the target path (literal absolute path)
if 'env' in settings:
    settings['env']['PAI_DIR'] = target

# Replace path references in all hook commands
def fix_commands(obj, old_patterns, new_base):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == 'command' and isinstance(v, str):
                for pat in old_patterns:
                    v = v.replace(pat, new_base)
                obj[k] = v
            else:
                fix_commands(v, old_patterns, new_base)
    elif isinstance(obj, list):
        for item in obj:
            fix_commands(item, old_patterns, new_base)

old_patterns = [
    '\${PAI_DIR}',
    '\$PAI_DIR',
    os.path.join(os.path.expanduser('~'), '.claude'),
]
# Include the previous PAI_DIR value if it was a literal path
prev = settings.get('env', {}).get('PAI_DIR', '')
if prev and prev != target and not prev.startswith('\$'):
    old_patterns.append(prev)
old_patterns = list(set(p for p in old_patterns if p and p != target))

fix_commands(settings.get('hooks', {}), old_patterns, target)

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')

print(f'   PAI_DIR set to: {target}')
print(f'   Replaced {len(old_patterns)} path patterns in hook commands')
" "$TARGET" "$SETTINGS"
else
  echo "   WARNING: $SETTINGS not found."
fi

# ── Step 5: Verify sentinel file ───────────────────────────────────────────
echo "5. Verifying ancestor traversal blocker..."
SENTINEL="$TARGET/.claude/settings.json"
if [[ -f "$SENTINEL" ]]; then
  echo "   OK — sentinel exists."
else
  echo "   Creating sentinel file..."
  mkdir -p "$TARGET/.claude"
  cat > "$SENTINEL" << 'SENTINEL_EOF'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "_comment": "Blocks ancestor traversal when PAI is installed at a non-default CLAUDE_CONFIG_DIR."
}
SENTINEL_EOF
  echo "   Created."
fi

# ── Step 6: Rebuild CLAUDE.md ────────────────────────────────────────────────
echo "6. Rebuilding CLAUDE.md from template..."
if [[ -f "$TARGET/CLAUDE.md.template" ]]; then
  BUILD_OUTPUT=$(PAI_DIR="$TARGET" bun "$TARGET/PAI/Tools/BuildCLAUDE.ts" 2>&1) || true
  if echo "$BUILD_OUTPUT" | grep -q "No CLAUDE.md.template found"; then
    echo "   FAIL — BuildCLAUDE.ts could not find template"
  elif echo "$BUILD_OUTPUT" | grep -q "already current"; then
    echo "   OK — CLAUDE.md already current"
  elif echo "$BUILD_OUTPUT" | grep -q "Generated"; then
    echo "   OK — CLAUDE.md rebuilt from template"
  else
    echo "   Output: $BUILD_OUTPUT"
  fi
else
  echo "   SKIP — No CLAUDE.md.template in target"
fi

# ── Step 7: Verify key files ───────────────────────────────────────────────
echo "7. Verifying key files..."
ERRORS=0
for f in hooks/lib/paths.ts PAI/Tools/pai.ts settings.json .claude/settings.json CLAUDE.md CLAUDE.md.template; do
  if [[ -f "$TARGET/$f" ]]; then
    echo "   OK  $f"
  else
    echo "   MISSING  $f"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check that user data survived
echo "   Checking preserved user data..."
for d in MEMORY; do
  if [[ -d "$TARGET/$d" ]]; then
    echo "   OK  $d/ (preserved)"
  else
    echo "   WARN  $d/ not found (may be a fresh install)"
  fi
done
if [[ -f "$TARGET/.env" ]]; then
  echo "   OK  .env (preserved)"
fi

if [[ $ERRORS -gt 0 ]]; then
  echo "   WARNING: $ERRORS files missing."
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Upgrade complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Launch with:"
echo ""
echo "  CLAUDE_CONFIG_DIR=$TARGET PAI_DIR=$TARGET bun $TARGET/PAI/Tools/pai.ts"
echo ""
echo "Things to verify:"
echo "  - Banner loads correctly (no template placeholders)"
echo "  - Hooks fire without errors (check statusline)"
echo "  - Session start notification works"
echo "  - No hook doubling (each hook should fire once)"
echo "  - Settings identity shows correct name"
echo "  - BuildCLAUDE.ts resolves template correctly"
echo "  - MEMORY and user data intact"
echo ""
echo "Backup at: $BACKUP"
echo "To rollback:  rm -rf $TARGET && mv $BACKUP $TARGET"
