#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  PAI Uninstaller v3.0 — Bootstrap
#
#  Checks for Bun, then delegates to the TypeScript engine.
#
#  Finds PAI-Uninstall/ in either:
#    • ./PAI-Uninstall/           (when run from ~/.claude/)
#    • ./Releases/v3.0/.claude/PAI-Uninstall/  (repo root)
#
#  Usage:
#    bash uninstall.sh          — interactive (default)
#    bash uninstall.sh --force  — skip all confirmations
# ═══════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Locate PAI-Uninstall/ — adjacent (installed) or under Releases/ (repo)
if [[ -d "$SCRIPT_DIR/PAI-Uninstall" ]]; then
  UNINSTALL_DIR="$SCRIPT_DIR/PAI-Uninstall"
elif [[ -d "$SCRIPT_DIR/Releases/v3.0/.claude/PAI-Uninstall" ]]; then
  UNINSTALL_DIR="$SCRIPT_DIR/Releases/v3.0/.claude/PAI-Uninstall"
else
  echo ""
  echo "  Error: PAI-Uninstall engine not found."
  echo "  Expected at: $SCRIPT_DIR/PAI-Uninstall"
  echo "  or:          $SCRIPT_DIR/Releases/v3.0/.claude/PAI-Uninstall"
  echo ""
  exit 1
fi

if ! command -v bun &>/dev/null; then
  echo ""
  echo "  PAI Uninstaller requires Bun. Install it with:"
  echo "  curl -fsSL https://bun.sh/install | bash"
  echo ""
  echo "  Then re-run this script."
  exit 1
fi

exec bun run "$UNINSTALL_DIR/main.ts" "$@"
