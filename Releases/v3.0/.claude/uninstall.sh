#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  PAI Uninstaller v3.0 — Bootstrap
#
#  Checks for Bun, then delegates to the TypeScript engine.
#  PAI-Uninstall/ must live alongside this script.
#
#  Usage:
#    bash uninstall.sh          — interactive (default)
#    bash uninstall.sh --force  — skip all confirmations
# ═══════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNINSTALL_DIR="$SCRIPT_DIR/PAI-Uninstall"

if [[ ! -d "$UNINSTALL_DIR" ]]; then
  echo ""
  echo "  Error: PAI-Uninstall engine not found at:"
  echo "  $UNINSTALL_DIR"
  echo ""
  echo "  Make sure PAI-Uninstall/ is in the same directory as this script."
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
