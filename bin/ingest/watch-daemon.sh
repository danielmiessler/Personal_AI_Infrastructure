#!/bin/bash
# PAI Ingest Watch Daemon Wrapper
# This script is installed by bin/ingest/install.sh with actual paths
# DO NOT commit with hardcoded paths - use placeholders

# Get PAI directory from environment or use placeholder
# install.sh replaces __PAI_DIR__ with actual path
PAI_DIR="${PAI_DIR:-__PAI_DIR__}"
cd "${PAI_DIR}/bin/ingest" || exit 1

# Source environment (user-specific location)
# install.sh replaces __HOME__ with actual home directory
ENV_FILE="${HOME}/.claude/.env"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

# Use bun from PATH or common locations
BUN_CMD="bun"
if command -v bun >/dev/null 2>&1; then
    BUN_CMD="bun"
elif [ -f "${HOME}/.bun/bin/bun" ]; then
    BUN_CMD="${HOME}/.bun/bin/bun"
elif [ -f "/opt/homebrew/bin/bun" ]; then
    BUN_CMD="/opt/homebrew/bin/bun"
fi

exec "$BUN_CMD" run ingest.ts watch
