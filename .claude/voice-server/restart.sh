#!/bin/bash

# Restart the PAI Voice Server (Cross-platform)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detect platform
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    PLATFORM="macos";;
    Linux*)     PLATFORM="linux";;
    *)          echo -e "${RED}✗ Unsupported operating system${NC}"; exit 1;;
esac

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}▶ Restarting PAI Voice Server (${PLATFORM})...${NC}"

# Stop first
"$SCRIPT_DIR/stop.sh"

# Wait a moment
sleep 1

# Start
"$SCRIPT_DIR/start.sh"
