#!/bin/bash

# Restart the PAI Voice Server (Platform-aware)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}▶ Restarting PAI Voice Server...${NC}"

"$SCRIPT_DIR/stop.sh"
sleep 1
"$SCRIPT_DIR/start.sh"