#!/bin/bash

# PAI Voice Server Installation Script
# Cross-platform installer for macOS and Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect platform
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    PLATFORM="macos";;
    Linux*)     PLATFORM="linux";;
    *)          echo -e "${RED}✗ Unsupported operating system: ${OS}${NC}"; exit 1;;
esac

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Delegate to platform-specific installer
if [ "$PLATFORM" = "macos" ]; then
    if [ -f "$SCRIPT_DIR/macos-service/install.sh" ]; then
        exec "$SCRIPT_DIR/macos-service/install.sh"
    else
        echo -e "${RED}✗ macOS installer not found at: $SCRIPT_DIR/macos-service/install.sh${NC}"
        exit 1
    fi
elif [ "$PLATFORM" = "linux" ]; then
    if [ -f "$SCRIPT_DIR/linux-service/install.sh" ]; then
        exec "$SCRIPT_DIR/linux-service/install.sh"
    else
        echo -e "${RED}✗ Linux installer not found at: $SCRIPT_DIR/linux-service/install.sh${NC}"
        exit 1
    fi
fi
