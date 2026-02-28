#!/usr/bin/env bash
# test-nondefault-install.sh — Deploy PAI v4.0.1 to a non-default CLAUDE_CONFIG_DIR for manual testing
#
# Usage:
#   ./test-nondefault-install.sh /path/to/target [alias-name]
#   ./test-nondefault-install.sh --clean /path/to/target

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_SOURCE="$SCRIPT_DIR/.claude"

# Runtime artifacts to skip when copying (these are generated, not part of the release)
SKIP_DIRS=".claude.json history.jsonl cache debug backups plugins mcp-needs-auth-cache.json projects todos teams tasks"

# ── Usage ───────────────────────────────────────────────────────────────────
usage() {
  echo "Usage: $0 <target-directory> [alias-name]"
  echo "       $0 --clean <target-directory>"
  echo ""
  echo "Deploys PAI v4.0.1 to a non-default CLAUDE_CONFIG_DIR for testing."
  echo "  alias-name   If given, adds/updates a shell alias in ~/.zshrc"
  echo "  --clean      Remove the test install at the given path"
  exit 1
}

# ── Parse args ──────────────────────────────────────────────────────────────
CLEAN=false
if [[ "${1:-}" == "--clean" ]]; then
  CLEAN=true
  shift
fi

TARGET="${1:-}"
ALIAS_NAME="${2:-}"
if [[ -z "$TARGET" ]]; then
  usage
fi

# Resolve to absolute path
TARGET="$(cd "$(dirname "$TARGET")" 2>/dev/null && pwd)/$(basename "$TARGET")" || TARGET="$1"

# ── Clean mode ──────────────────────────────────────────────────────────────
if $CLEAN; then
  if [[ -d "$TARGET" ]]; then
    echo "Removing $TARGET..."
    rm -rf "$TARGET"
    echo "Done."
  else
    echo "Nothing to clean — $TARGET does not exist."
  fi

  # Remove alias from .zshrc if name given, or find any alias pointing to this target
  ZSHRC="$HOME/.zshrc"
  if [[ -n "$ALIAS_NAME" ]]; then
    if grep -q "^alias $ALIAS_NAME=" "$ZSHRC" 2>/dev/null; then
      sed -i '' "/^# PAI v4.0.1 non-default install test$/d; /^alias $ALIAS_NAME=/d" "$ZSHRC"
      echo "Removed alias '$ALIAS_NAME' from $ZSHRC"
    fi
  else
    # No alias name given — look for any alias pointing to this target
    MATCHED=$(grep -n "^alias .*='.*$TARGET.*'" "$ZSHRC" 2>/dev/null | head -1)
    if [[ -n "$MATCHED" ]]; then
      FOUND_ALIAS=$(echo "$MATCHED" | sed "s/.*alias \([^=]*\)=.*/\1/")
      sed -i '' "/^# PAI v4.0.1 non-default install test$/d; /^alias ${FOUND_ALIAS}=.*$(sed 's|/|\\/|g' <<< "$TARGET").*'/d" "$ZSHRC"
      echo "Removed alias '$FOUND_ALIAS' from $ZSHRC"
    fi
  fi

  exit 0
fi

# ── Validate source ────────────────────────────────────────────────────────
if [[ ! -d "$REPO_SOURCE" ]]; then
  echo "ERROR: Source directory not found: $REPO_SOURCE"
  echo "Run this script from Releases/v4.0.1/"
  exit 1
fi

# ── Safety: refuse to deploy into ~/.claude ─────────────────────────────────
REAL_CLAUDE="$HOME/.claude"
if [[ "$TARGET" == "$REAL_CLAUDE" ]]; then
  echo "ERROR: Target is your real ~/.claude — this script is for non-default installs only."
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo " PAI v4.0.1 — Non-Default Install Test"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Source:  $REPO_SOURCE"
echo "  Target:  $TARGET"
echo ""

# ── Step 1: Backup existing target ─────────────────────────────────────────
if [[ -d "$TARGET" ]]; then
  BACKUP="${TARGET}-backup-$(date +%Y%m%d-%H%M%S)"
  echo "1. Backing up existing install..."
  cp -a "$TARGET" "$BACKUP"
  echo "   Backed up to: $BACKUP"
else
  echo "1. No existing install to back up."
fi

# ── Step 2: Copy from repo ─────────────────────────────────────────────────
echo "2. Copying files from repo..."
mkdir -p "$TARGET"

# Build the find exclusion args from SKIP_DIRS
EXCLUDE_ARGS=()
for skip in $SKIP_DIRS; do
  EXCLUDE_ARGS+=(-name "$skip" -prune -o)
done

# Remove stale files in target that don't exist in source (like rsync --delete)
if [[ -d "$TARGET" ]]; then
  while IFS= read -r rel_path; do
    if [[ ! -e "$REPO_SOURCE/$rel_path" ]]; then
      rm -f "$TARGET/$rel_path"
    fi
  done < <(cd "$TARGET" && find . "${EXCLUDE_ARGS[@]}" -type f -print | sed 's|^\./||')
fi

# Copy source files, skipping runtime artifacts
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
echo "3. Clearing stale caches from source..."
rm -f "$TARGET/MEMORY/STATE/counts-cache.sh" 2>/dev/null
# Remove stale .counts from settings.json so first statusline triggers fresh count
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

# ── Step 4: Verify sentinel file ───────────────────────────────────────────
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

# ── Step 5: Verify key files ───────────────────────────────────────────────
echo "6. Verifying key files..."
ERRORS=0
for f in hooks/lib/paths.ts PAI/Tools/pai.ts settings.json .claude/settings.json CLAUDE.md; do
  if [[ -f "$TARGET/$f" ]]; then
    echo "   OK  $f"
  else
    echo "   MISSING  $f"
    ERRORS=$((ERRORS + 1))
  fi
done
if [[ $ERRORS -gt 0 ]]; then
  echo "   WARNING: $ERRORS files missing."
fi

# ── Step 6: Shell alias ─────────────────────────────────────────────────────
ALIAS_CMD="CLAUDE_CONFIG_DIR=$TARGET PAI_DIR=$TARGET bun $TARGET/PAI/Tools/pai.ts"
ZSHRC="$HOME/.zshrc"

if [[ -n "$ALIAS_NAME" ]]; then
  ALIAS_LINE="alias $ALIAS_NAME='$ALIAS_CMD'"
  echo "7. Setting up shell alias '$ALIAS_NAME'..."

  if grep -q "^alias $ALIAS_NAME=" "$ZSHRC" 2>/dev/null; then
    # Update existing alias in place
    sed -i '' "s|^alias $ALIAS_NAME=.*|$ALIAS_LINE|" "$ZSHRC"
    echo "   Updated existing alias in $ZSHRC"
  else
    # Append new alias
    echo "" >> "$ZSHRC"
    echo "# PAI v4.0.1 non-default install test" >> "$ZSHRC"
    echo "$ALIAS_LINE" >> "$ZSHRC"
    echo "   Added alias to $ZSHRC"
  fi
  echo "   Run 'source ~/.zshrc' or open a new terminal to use it."
else
  echo "7. No alias name given — skipping shell alias."
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Ready to test!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Launch with:"
echo ""
if [[ -n "$ALIAS_NAME" ]]; then
  echo "  source ~/.zshrc && $ALIAS_NAME"
else
  echo "  $ALIAS_CMD"
fi
echo ""
echo "Things to verify:"
echo "  - Banner loads correctly (no template placeholders)"
echo "  - Hooks fire without errors (check statusline)"
echo "  - Session start notification works"
echo "  - No hook doubling (each hook should fire once)"
echo "  - Settings identity shows correct name"
echo ""
echo "To clean up:  $0 --clean $TARGET"
