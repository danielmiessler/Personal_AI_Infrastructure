#!/bin/bash

# PAI Bootstrap Script
# Checks prerequisites and runs the setup wizard

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    PAI Setup Bootstrap                        ║"
echo "║         Personal AI Infrastructure Configuration              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check current shell
check_shell() {
    CURRENT_SHELL=$(basename "$SHELL")
    echo -e "${BLUE}ℹ${NC} Current shell: $CURRENT_SHELL"
    
    if [[ "$CURRENT_SHELL" != "zsh" && "$CURRENT_SHELL" != "bash" ]]; then
        echo -e "${YELLOW}⚠${NC} PAI works best with zsh or bash."
        echo "   Your current shell is: $CURRENT_SHELL"
        echo ""
        read -p "   Would you like to switch to zsh? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if command -v zsh &> /dev/null; then
                echo -e "${GREEN}✓${NC} zsh is installed. To switch, run: chsh -s $(which zsh)"
                echo "   Then restart your terminal and run this script again."
                exit 0
            else
                echo -e "${RED}✗${NC} zsh is not installed."
                echo "   Install it first:"
                echo "   - macOS: brew install zsh"
                echo "   - Ubuntu: sudo apt install zsh"
                exit 1
            fi
        fi
    else
        echo -e "${GREEN}✓${NC} Shell is compatible ($CURRENT_SHELL)"
    fi
}

# Check and install bun
check_bun() {
    echo ""
    if command -v bun &> /dev/null; then
        BUN_VERSION=$(bun --version)
        echo -e "${GREEN}✓${NC} Bun is installed (v$BUN_VERSION)"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Bun is not installed"
        echo ""
        echo "   Bun is required to run PAI. It's a fast JavaScript runtime."
        echo ""
        read -p "   Install Bun now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}→${NC} Installing Bun..."
            curl -fsSL https://bun.sh/install | bash
            
            # Source the new bun installation
            export BUN_INSTALL="$HOME/.bun"
            export PATH="$BUN_INSTALL/bin:$PATH"
            
            if command -v bun &> /dev/null; then
                echo -e "${GREEN}✓${NC} Bun installed successfully!"
                echo ""
                echo -e "${YELLOW}!${NC} You may need to restart your terminal or run:"
                echo "   source ~/.zshrc  # or ~/.bashrc"
                return 0
            else
                echo -e "${RED}✗${NC} Bun installation failed"
                echo "   Try manually: curl -fsSL https://bun.sh/install | bash"
                exit 1
            fi
        else
            echo -e "${RED}✗${NC} Bun is required. Install it and run this script again."
            exit 1
        fi
    fi
}

# Check Claude Code
check_claude() {
    echo ""
    if command -v claude &> /dev/null; then
        echo -e "${GREEN}✓${NC} Claude Code is installed"
    else
        echo -e "${YELLOW}⚠${NC} Claude Code not found in PATH"
        echo "   Install from: https://code.claude.com"
        echo "   (You can continue setup without it)"
        echo ""
    fi
}

# Run the TypeScript setup wizard
run_wizard() {
    echo ""
    echo -e "${BLUE}→${NC} Installing setup dependencies..."
    cd "$SCRIPT_DIR"
    bun install --silent
    
    echo ""
    echo -e "${BLUE}→${NC} Starting PAI Setup Wizard..."
    echo ""
    
    # Pass through any arguments
    bun run setup.ts "$@"
}

# Main
main() {
    check_shell
    check_bun
    check_claude
    run_wizard "$@"
}

main "$@"
