#!/bin/bash

# Uninstall the PAI Voice Server (Cross-platform)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect platform
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    PLATFORM="macos";;
    Linux*)     PLATFORM="linux";;
    *)          echo -e "${RED}✗ Unsupported operating system${NC}"; exit 1;;
esac

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Delegate to platform-specific uninstaller
if [ "$PLATFORM" = "macos" ]; then
    if [ -f "$SCRIPT_DIR/macos-service/uninstall.sh" ]; then
        exec "$SCRIPT_DIR/macos-service/uninstall.sh"
    else
        echo -e "${RED}✗ macOS uninstaller not found${NC}"
        exit 1
    fi
elif [ "$PLATFORM" = "linux" ]; then
    if [ -f "$SCRIPT_DIR/linux-service/uninstall.sh" ]; then
        exec "$SCRIPT_DIR/linux-service/uninstall.sh"
    else
        echo -e "${RED}✗ Linux uninstaller not found${NC}"
        exit 1
    fi
fi
