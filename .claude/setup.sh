#!/bin/bash

# ============================================
# PAI (Personal AI Infrastructure) Setup Script
# ============================================
#
# This script automates the entire PAI setup process.
# It's designed to be friendly, informative, and safe.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/danielmiessler/Personal_AI_Infrastructure/main/setup.sh | bash
#
# Or download and run manually:
#   ./setup.sh
#
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji support
CHECK="✅"
CROSS="❌"
WARN="⚠️"
INFO="ℹ️"
ROCKET="🚀"
PARTY="🎉"
THINKING="🤔"
WRENCH="🔧"

# ============================================
# Helper Functions
# ============================================

print_header() {
    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARN} $1${NC}"
}

print_info() {
    echo -e "${CYAN}${INFO} $1${NC}"
}

print_step() {
    echo -e "${BLUE}${WRENCH} $1${NC}"
}

ask_yes_no() {
    local question="$1"
    local default="${2:-y}"

    if [ "$default" = "y" ]; then
        local prompt="[Y/n]"
    else
        local prompt="[y/N]"
    fi

    while true; do
        echo -n -e "${CYAN}${THINKING} $question $prompt: ${NC}"
        read -r response
        response=${response:-$default}
        case "$response" in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

ask_input() {
    local question="$1"
    local default="$2"
    local response

    if [ -n "$default" ]; then
        echo -n -e "${CYAN}${THINKING} $question [$default]: ${NC}"
    else
        echo -n -e "${CYAN}${THINKING} $question: ${NC}"
    fi

    read -r response
    echo "${response:-$default}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# Welcome Message
# ============================================

clear
echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   PAI - Personal AI Infrastructure Setup              ║
║                                                       ║
║   Welcome! Let's get you set up in a few minutes.    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "This script will:"
echo "  • Check your system for prerequisites"
echo "  • Install any missing software (with your permission)"
echo "  • Download or update PAI"
echo "  • Configure your environment"
echo "  • Test everything to make sure it works"
echo ""
echo "The whole process takes about 5 minutes."
echo ""

if ! ask_yes_no "Ready to get started?"; then
    echo ""
    echo "No problem! When you're ready, just run this script again."
    echo ""
    exit 0
fi

# ============================================
# Step 1: Check Prerequisites
# ============================================

print_header "Step 1: Checking Prerequisites"

print_step "Checking for macOS..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    macos_version=$(sw_vers -productVersion)
    print_success "Running macOS $macos_version"
else
    print_warning "This script is designed for macOS. You're running: $OSTYPE"
    if ! ask_yes_no "Continue anyway? (Some features may not work)"; then
        exit 1
    fi
fi

print_step "Checking for Git..."
if command_exists git; then
    git_version=$(git --version | awk '{print $3}')
    print_success "Git $git_version is installed"
    HAS_GIT=true
else
    print_warning "Git is not installed"
    HAS_GIT=false
fi

print_step "Checking for Homebrew..."
if command_exists brew; then
    brew_version=$(brew --version | head -n1 | awk '{print $2}')
    print_success "Homebrew $brew_version is installed"
    HAS_BREW=true
else
    print_warning "Homebrew is not installed"
    HAS_BREW=false
fi

print_step "Checking for Bun..."
if command_exists bun; then
    bun_version=$(bun --version)
    print_success "Bun $bun_version is installed"
    HAS_BUN=true
else
    print_warning "Bun is not installed"
    HAS_BUN=false
fi

# ============================================
# Step 2: Install Missing Software
# ============================================

NEEDS_INSTALL=false

if [ "$HAS_GIT" = false ] || [ "$HAS_BUN" = false ]; then
    NEEDS_INSTALL=true
fi

if [ "$NEEDS_INSTALL" = true ]; then
    print_header "Step 2: Installing Missing Software"

    # Install Homebrew if needed (optional)
    if [ "$HAS_BREW" = false ]; then
        echo ""
        print_info "Homebrew is not installed. Homebrew is a package manager for macOS."
        print_info "It can be used to install tools, but it's not required."
        echo ""

        if ask_yes_no "Install Homebrew? (optional)" "n"; then
            print_step "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

            # Add Homebrew to PATH for this session
            if [ -f "/opt/homebrew/bin/brew" ]; then
                eval "$(/opt/homebrew/bin/brew shellenv)"
            fi

            print_success "Homebrew installed successfully!"
            HAS_BREW=true
        else
            print_info "Continuing without Homebrew. We'll use alternative installation methods."
        fi
    fi

    # Install Git if needed
    if [ "$HAS_GIT" = false ]; then
        echo ""
        print_warning "Git is not installed. Git is needed to download PAI."
        echo ""

        if ask_yes_no "Install Git?"; then
            print_step "Installing Git..."
            if [ "$HAS_BREW" = true ]; then
                brew install git
            else
                xcode-select --install
            fi
            print_success "Git installed successfully!"
            HAS_GIT=true
        else
            print_error "Git is required to continue. Exiting."
            exit 1
        fi
    fi

    # Install Bun if needed
    if [ "$HAS_BUN" = false ]; then
        echo ""
        print_warning "Bun is not installed. Bun is a fast JavaScript runtime."
        print_info "It's needed for PAI's voice server and other features."
        echo ""

        if ask_yes_no "Install Bun?"; then
            print_step "Installing Bun..."

            # Use Homebrew if available, otherwise use curl
            if [ "$HAS_BREW" = true ]; then
                print_info "Installing Bun via Homebrew..."
                brew install oven-sh/bun/bun
            else
                print_info "Installing Bun via curl (Homebrew not available)..."
                curl -fsSL https://bun.sh/install | bash

                # Add Bun to PATH for this session
                export BUN_INSTALL="$HOME/.bun"
                export PATH="$BUN_INSTALL/bin:$PATH"
            fi

            # Verify installation
            if command_exists bun; then
                print_success "Bun installed successfully!"
                HAS_BUN=true
            else
                print_warning "Bun installation may have failed. You may need to restart your terminal."
                print_info "After restarting, verify with: bun --version"
            fi
        else
            print_warning "Bun is optional, but recommended. Continuing without it."
        fi
    fi
else
    print_success "All prerequisites are already installed!"
fi

# ============================================
# Step 3: Choose Installation Directory
# ============================================

print_header "Step 3: Choose Installation Location"

echo "Where would you like to install PAI?"
echo ""
echo "Common locations:"
echo "  1) $HOME/PAI (recommended)"
echo "  2) $HOME/Projects/PAI"
echo "  3) $HOME/Documents/PAI"
echo "  4) Custom location"
echo ""

DEFAULT_DIR="$HOME/PAI"
choice=$(ask_input "Enter your choice (1-4)" "1")

case $choice in
    1)
        PAI_DIR="$HOME/PAI"
        ;;
    2)
        PAI_DIR="$HOME/Projects/PAI"
        ;;
    3)
        PAI_DIR="$HOME/Documents/PAI"
        ;;
    4)
        PAI_DIR=$(ask_input "Enter custom path" "$HOME/PAI")
        ;;
    *)
        PAI_DIR="$DEFAULT_DIR"
        ;;
esac

print_info "PAI will be installed to: $PAI_DIR"

# ============================================
# Step 4: Download or Update PAI
# ============================================

print_header "Step 4: Getting PAI"

if [ -d "$PAI_DIR/.git" ]; then
    print_info "PAI is already installed at $PAI_DIR"

    if ask_yes_no "Update to the latest version?"; then
        print_step "Updating PAI..."
        cd "$PAI_DIR"
        git pull
        print_success "PAI updated successfully!"
    else
        print_info "Using existing installation"
    fi
else
    print_step "Downloading PAI from GitHub..."

    # Create parent directory if it doesn't exist
    mkdir -p "$(dirname "$PAI_DIR")"

    # Clone the repository
    git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git "$PAI_DIR"

    print_success "PAI downloaded successfully!"
fi

# ============================================
# Step 5: Configure Environment Variables
# ============================================

print_header "Step 5: Configuring Environment"

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    print_warning "Couldn't detect shell type. Defaulting to .zshrc"
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
fi

print_info "Detected shell: $SHELL_NAME"
print_info "Configuration file: $SHELL_CONFIG"

# Check if PAI environment variables are already configured
if grep -q "PAI_DIR" "$SHELL_CONFIG" 2>/dev/null; then
    print_info "PAI environment variables already exist in $SHELL_CONFIG"

    if ask_yes_no "Update them?"; then
        # Remove old PAI configuration
        sed -i.bak '/# ========== PAI Configuration ==========/,/# =========================================/d' "$SHELL_CONFIG"
        SHOULD_ADD_CONFIG=true
    else
        SHOULD_ADD_CONFIG=false
    fi
else
    SHOULD_ADD_CONFIG=true
fi

if [ "$SHOULD_ADD_CONFIG" = true ]; then
    print_step "Adding PAI environment variables to $SHELL_CONFIG..."

    # Ask for AI assistant name
    AI_NAME=$(ask_input "What would you like to call your AI assistant?" "Kai")

    # Ask for color
    echo ""
    echo "Choose a display color:"
    echo "  1) purple (default)"
    echo "  2) blue"
    echo "  3) green"
    echo "  4) cyan"
    echo "  5) red"
    echo ""
    color_choice=$(ask_input "Enter your choice (1-5)" "1")

    case $color_choice in
        1) AI_COLOR="purple" ;;
        2) AI_COLOR="blue" ;;
        3) AI_COLOR="green" ;;
        4) AI_COLOR="cyan" ;;
        5) AI_COLOR="red" ;;
        *) AI_COLOR="purple" ;;
    esac

    # Add configuration to shell config
    cat >> "$SHELL_CONFIG" << EOF

# ========== PAI Configuration ==========
# Personal AI Infrastructure
# Added by PAI setup script on $(date)

# Where PAI is installed
export PAI_DIR="$PAI_DIR"

# Your home directory
export PAI_HOME="\$HOME"

# Your AI assistant's name
export DA="$AI_NAME"

# Display color
export DA_COLOR="$AI_COLOR"

# =========================================

EOF

    print_success "Environment variables added to $SHELL_CONFIG"
else
    print_info "Keeping existing environment variables"
fi

# Source the configuration for this session
export PAI_DIR="$PAI_DIR"
export PAI_HOME="$HOME"

# ============================================
# Step 6: Create .env File
# ============================================

print_header "Step 6: Configuring API Keys"

if [ -f "$PAI_DIR/.env" ]; then
    print_info ".env file already exists"

    if ! ask_yes_no "Keep existing .env file?"; then
        rm "$PAI_DIR/.env"
        SHOULD_CREATE_ENV=true
    else
        SHOULD_CREATE_ENV=false
    fi
else
    SHOULD_CREATE_ENV=true
fi

if [ "$SHOULD_CREATE_ENV" = true ]; then
    print_step "Creating .env file from template..."

    if [ -f "$PAI_DIR/.env.example" ]; then
        cp "$PAI_DIR/.env.example" "$PAI_DIR/.env"

        # Update PAI_DIR in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|PAI_DIR=\"/path/to/PAI\"|PAI_DIR=\"$PAI_DIR\"|g" "$PAI_DIR/.env"
        else
            sed -i "s|PAI_DIR=\"/path/to/PAI\"|PAI_DIR=\"$PAI_DIR\"|g" "$PAI_DIR/.env"
        fi

        print_success ".env file created"
        print_info "You can add API keys later by editing: $PAI_DIR/.env"
    else
        print_warning ".env.example not found. Skipping .env creation."
    fi
fi

echo ""
print_info "PAI works without API keys, but some features require them:"
echo "  • PERPLEXITY_API_KEY - For advanced web research"
echo "  • GOOGLE_API_KEY - For Gemini AI integration"
echo "  • REPLICATE_API_TOKEN - For AI image/video generation"
echo ""

if ask_yes_no "Would you like to add API keys now?" "n"; then
    echo ""
    print_info "Opening .env file in your default editor..."
    sleep 1
    open -e "$PAI_DIR/.env" 2>/dev/null || nano "$PAI_DIR/.env"
    echo ""
    print_info "When you're done editing, save and close the file."
    read -p "Press Enter when you're ready to continue..."
else
    print_info "You can add API keys later by editing: $PAI_DIR/.env"
fi

# ============================================
# Step 7: Voice Server Setup (Optional)
# ============================================

print_header "Step 7: Voice Server (Optional)"

echo "PAI includes a voice server that can speak notifications to you."
echo "It uses macOS's built-in Premium voices (free, high-quality, offline)."
echo ""

if ask_yes_no "Would you like to set up the voice server?" "n"; then
    print_step "Setting up voice server..."

    # Check if voice server directory exists
    if [ -d "$PAI_DIR/voice-server" ]; then
        cd "$PAI_DIR/voice-server"

        # Install dependencies
        print_step "Installing voice server dependencies..."
        bun install

        print_success "Voice server configured!"
        print_info "To start the voice server, run:"
        echo "  cd $PAI_DIR/voice-server && bun server.ts &"
        echo ""

        if ask_yes_no "Start the voice server now?"; then
            bun server.ts &
            sleep 2

            # Test the voice server
            if curl -s http://localhost:8888/health >/dev/null 2>&1; then
                print_success "Voice server is running!"

                if ask_yes_no "Test the voice server?"; then
                    curl -X POST http://localhost:8888/notify \
                        -H "Content-Type: application/json" \
                        -d '{"message": "Hello! Your voice server is working perfectly!"}' \
                        2>/dev/null

                    sleep 2
                    print_success "You should have heard a message!"
                fi
            else
                print_warning "Voice server may not have started correctly."
                print_info "Check the logs for details."
            fi
        fi
    else
        print_warning "Voice server directory not found. Skipping."
    fi
else
    print_info "Skipping voice server setup. You can set it up later."
fi

# ============================================
# Step 8: Claude Code Integration
# ============================================

print_header "Step 8: AI Assistant Integration"

echo "PAI works with various AI assistants (Claude Code, GPT, Gemini, etc.)"
echo ""

if ask_yes_no "Are you using Claude Code?"; then
    print_step "Configuring Claude Code integration..."

    # Create Claude directory if it doesn't exist
    mkdir -p "$HOME/.claude"

    # Ask for user's name
    USER_NAME=$(ask_input "What's your name?" "User")

    # Customize settings.json with user values
    print_step "Personalizing settings.json..."
    sed -i.bak \
        -e "s|/Users/YOURNAME/.claude|$PAI_DIR/.claude|g" \
        -e "s|\"ASSISTANT_NAME\": \"FORGE\"|\"ASSISTANT_NAME\": \"$AI_NAME\"|g" \
        -e "s|\"USER_NAME\": \"User\"|\"USER_NAME\": \"$USER_NAME\"|g" \
        "$PAI_DIR/.claude/settings.json"
    print_success "Settings personalized"

    # Check if settings.json already exists
    if [ -L "$HOME/.claude/settings.json" ]; then
        print_info "Claude Code settings already linked to PAI"
    elif [ -f "$HOME/.claude/settings.json" ]; then
        print_warning "Claude Code settings file already exists"

        if ask_yes_no "Replace it with PAI's settings?"; then
            mv "$HOME/.claude/settings.json" "$HOME/.claude/settings.json.backup"
            print_info "Backed up existing settings to settings.json.backup"

            ln -sf "$PAI_DIR/.claude/settings.json" "$HOME/.claude/settings.json"
            print_success "Claude Code configured to use PAI!"
        fi
    else
        ln -sf "$PAI_DIR/.claude/settings.json" "$HOME/.claude/settings.json"
        print_success "Claude Code configured to use PAI!"
    fi

    echo ""
    print_info "Next steps for Claude Code:"
    echo "  1. Download Claude Code from: https://claude.ai/code"
    echo "  2. Sign in with your Anthropic account"
    echo "  3. Restart Claude Code if it's already running"
    echo ""
else
    print_info "For other AI assistants, refer to the documentation:"
    echo "  $PAI_DIR/docs/QUICKSTART.md"
fi

# ============================================
# Step 9: Test Installation
# ============================================

print_header "Step 9: Testing Installation"

print_step "Running system checks..."

# Test 1: PAI_DIR exists
if [ -d "$PAI_DIR" ]; then
    print_success "PAI directory exists: $PAI_DIR"
else
    print_error "PAI directory not found: $PAI_DIR"
fi

# Test 2: Skills directory exists
if [ -d "$PAI_DIR/skills" ]; then
    skill_count=$(find "$PAI_DIR/skills" -maxdepth 1 -type d | wc -l | tr -d ' ')
    print_success "Found $skill_count skills"
else
    print_warning "Skills directory not found"
fi

# Test 3: Commands directory exists
if [ -d "$PAI_DIR/commands" ]; then
    command_count=$(find "$PAI_DIR/commands" -type f -name "*.md" | wc -l | tr -d ' ')
    print_success "Found $command_count commands"
else
    print_warning "Commands directory not found"
fi

# Test 4: Environment variables
if [ -n "$PAI_DIR" ]; then
    print_success "PAI_DIR environment variable is set"
else
    print_warning "PAI_DIR environment variable not set in this session"
    print_info "It will be available after you restart your terminal"
fi

# Test 5: .env file
if [ -f "$PAI_DIR/.env" ]; then
    print_success ".env file exists"
else
    print_warning ".env file not found"
fi

# Test 6: Claude Code integration
if [ -L "$HOME/.claude/settings.json" ]; then
    print_success "Claude Code integration configured"
elif [ -f "$HOME/.claude/settings.json" ]; then
    print_info "Claude Code settings exist (not linked to PAI)"
else
    print_info "Claude Code settings not configured"
fi

# ============================================
# Final Success Message
# ============================================

print_header "${PARTY} Installation Complete! ${PARTY}"

echo -e "${GREEN}"
cat << "EOF"
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🎉 Congratulations! PAI is ready to use! 🎉      │
│                                                     │
└─────────────────────────────────────────────────────┘
EOF
echo -e "${NC}"

echo ""
echo "Here's what was set up:"
echo "  ✅ PAI installed to: $PAI_DIR"
echo "  ✅ Environment variables configured"
echo "  ✅ Skills and commands ready to use"
if [ -f "$PAI_DIR/.env" ]; then
    echo "  ✅ Environment file created"
fi
if [ -L "$HOME/.claude/settings.json" ]; then
    echo "  ✅ Claude Code integration configured"
fi
echo ""

print_header "Next Steps"

echo "1. ${CYAN}Restart your terminal${NC} (or run: source $SHELL_CONFIG)"
echo ""
echo "2. ${CYAN}Open Claude Code${NC} and try these commands:"
echo "   • 'Hey, tell me about yourself'"
echo "   • 'Research the latest AI developments'"
echo "   • 'What skills do you have?'"
echo ""
echo "3. ${CYAN}Customize PAI for you:${NC}"
echo "   • Edit: $PAI_DIR/skills/PAI/SKILL.md"
echo "   • Add API keys: $PAI_DIR/.env"
echo "   • Read the docs: $PAI_DIR/docs/QUICKSTART.md"
echo ""

print_header "Quick Reference"

echo "Essential commands to remember:"
echo ""
echo "  ${CYAN}cd \$PAI_DIR${NC}                    # Go to PAI directory"
echo "  ${CYAN}cd \$PAI_DIR && git pull${NC}       # Update PAI to latest version"
echo "  ${CYAN}open -e \$PAI_DIR/.env${NC}         # Edit API keys"
echo "  ${CYAN}ls \$PAI_DIR/skills${NC}            # See available skills"
echo "  ${CYAN}source ~/.zshrc${NC}                # Reload environment"
echo ""

print_header "Resources"

echo "  📖 Documentation: $PAI_DIR/documentation/"
echo "  🌐 GitHub: https://github.com/danielmiessler/Personal_AI_Infrastructure"
echo "  📝 Blog: https://danielmiessler.com/blog/personal-ai-infrastructure"
echo "  🎬 Video: https://youtu.be/iKwRWwabkEc"
echo ""

print_header "Support"

echo "  🐛 Report issues: https://github.com/danielmiessler/Personal_AI_Infrastructure/issues"
echo "  💬 Discussions: https://github.com/danielmiessler/Personal_AI_Infrastructure/discussions"
echo "  ⭐ Star the repo to support the project!"
echo ""

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${ROCKET} Welcome to PAI! You're now ready to augment your life with AI. ${ROCKET}${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Optional: Open documentation
if ask_yes_no "Would you like to open the getting started guide?" "y"; then
    open "$PAI_DIR/docs/QUICKSTART.md" 2>/dev/null || cat "$PAI_DIR/docs/QUICKSTART.md"
fi

echo ""
print_success "Setup complete! Enjoy using PAI! 🎉"
echo ""
