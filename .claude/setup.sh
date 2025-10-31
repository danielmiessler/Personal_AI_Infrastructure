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

# Stash this script if it's a modified version (for testing)
# This allows testing custom fixes while still cloning from GitHub
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
if [ -f "$SCRIPT_PATH" ]; then
    # Check if this script differs from upstream (simple heuristic: line count)
    SCRIPT_LINES=$(wc -l < "$SCRIPT_PATH")
    if [ "$SCRIPT_LINES" -gt 800 ]; then
        # This is likely a modified version with fixes
        cp "$SCRIPT_PATH" /tmp/.pai_setup_stash
    fi
fi

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
        printf "${CYAN}${THINKING} %s %s: ${NC}" "$question" "$prompt" >/dev/tty
        read -r response </dev/tty
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
        printf "${CYAN}${THINKING} %s [%s]: ${NC}" "$question" "$default" >/dev/tty
    else
        printf "${CYAN}${THINKING} %s: ${NC}" "$question" >/dev/tty
    fi

    read -r response </dev/tty
    echo "${response:-$default}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================
# Welcome Message
# ============================================

clear
{
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
} >/dev/tty

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
    IS_MACOS=true
else
    print_warning "This script is designed for macOS. You're running: $OSTYPE"
    if ! ask_yes_no "Continue anyway? (Some features may not work)" "n"; then
        exit 1
    fi
    IS_MACOS=false
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

if [ "$HAS_GIT" = false ] || [ "$HAS_BREW" = false ] || [ "$HAS_BUN" = false ]; then
    NEEDS_INSTALL=true
fi

if [ "$NEEDS_INSTALL" = true ]; then
    print_header "Step 2: Installing Missing Software"

    # Install Homebrew if needed
    if [ "$HAS_BREW" = false ]; then
        echo ""
        print_warning "Homebrew is not installed. Homebrew is a package manager for macOS."

        # Check if we're on Linux and already have the required dependencies
        if [ "$IS_MACOS" = false ] && [ "$HAS_GIT" = true ] && [ "$HAS_BUN" = true ]; then
            print_info "On Linux with Git and Bun already installed - Homebrew is optional."
            echo ""

            if ask_yes_no "Install Homebrew anyway?" "y"; then
                print_step "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

                # Add Homebrew to PATH for this session
                if [ -f "/opt/homebrew/bin/brew" ]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                elif [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
                    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
                fi

                print_success "Homebrew installed successfully!"
                HAS_BREW=true
            else
                print_info "Skipping Homebrew installation. Continuing with existing tools."
                HAS_BREW=false
            fi
        else
            # On macOS or missing dependencies - Homebrew is required
            print_info "We need it to install other tools like Bun."
            echo ""

            if ask_yes_no "Install Homebrew?" "y"; then
                print_step "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

                # Add Homebrew to PATH for this session
                if [ -f "/opt/homebrew/bin/brew" ]; then
                    eval "$(/opt/homebrew/bin/brew shellenv)"
                elif [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
                    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
                fi

                print_success "Homebrew installed successfully!"
                HAS_BREW=true
            else
                print_error "Homebrew is required to continue. Exiting."
                exit 1
            fi
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
            brew install oven-sh/bun/bun
            print_success "Bun installed successfully!"
            HAS_BUN=true
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

        # Check if there are local changes
        if ! git diff-index --quiet HEAD -- 2>/dev/null; then
            print_info "Stashing local changes before update..."
            git stash push -m "PAI setup: local changes before update"
            STASHED=true
        else
            STASHED=false
        fi

        # Pull latest changes
        git pull

        # Restore local changes if we stashed them
        if [ "$STASHED" = true ]; then
            print_info "Restoring local changes..."
            git stash pop
        fi

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

    # If we're running a modified setup.sh (for testing), restore it after clone
    if [ -f "/tmp/.pai_setup_stash" ]; then
        print_info "Restoring modified setup.sh for testing..."
        cp /tmp/.pai_setup_stash "$PAI_DIR/.claude/setup.sh"
        rm /tmp/.pai_setup_stash
    fi

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
    {
        echo ""
        echo "# ========== PAI Configuration =========="
        echo "# Personal AI Infrastructure"
        echo "# Added by PAI setup script on $(date)"
        echo ""
        echo "# Where PAI is installed"
        echo "export PAI_DIR=\"$PAI_DIR\""
        echo ""
        echo "# Your home directory"
        echo "export PAI_HOME=\"\$HOME\""
        echo ""
        echo "# Your AI assistant's name"
        echo "export DA=\"$AI_NAME\""
        echo ""
        echo "# Display color"
        echo "export DA_COLOR=\"$AI_COLOR\""
        echo ""
        echo "# ========================================="
        echo ""
    } >> "$SHELL_CONFIG"

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

    # In v0.6.0, .env.example is in .claude/ subdirectory
    if [ -f "$PAI_DIR/.claude/.env.example" ]; then
        cp "$PAI_DIR/.claude/.env.example" "$PAI_DIR/.env"

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

    # Fix: Replace ${PAI_DIR} with absolute path in settings.json and commands
    print_step "Verifying hooks configuration..."

    # Check if settings.json uses ${PAI_DIR} variable (needs fixing)
    if grep -q '${PAI_DIR}' "$PAI_DIR/.claude/settings.json" 2>/dev/null; then
        print_warning "Fixing hook paths in settings.json..."

        # Replace all instances of ${PAI_DIR} with the actual absolute path
        sed -i "s|\${PAI_DIR}|$PAI_DIR|g" "$PAI_DIR/.claude/settings.json"

        print_success "Variable paths fixed in settings.json"
    fi

    # v0.6.0 fix: Update hook paths from /PAI/hooks/ to /PAI/.claude/hooks/ (always run)
    if [ -f "$PAI_DIR/.claude/settings.json" ]; then
        if grep -q "$PAI_DIR/hooks/" "$PAI_DIR/.claude/settings.json" 2>/dev/null; then
            print_warning "Fixing v0.6.0 hook paths in settings.json..."

            # Update hook paths from /PAI/hooks/ to /PAI/.claude/hooks/
            sed -i "s|$PAI_DIR/hooks/|$PAI_DIR/.claude/hooks/|g" "$PAI_DIR/.claude/settings.json"

            # Update statusline path from /PAI/statusline to /PAI/.claude/statusline
            sed -i "s|$PAI_DIR/statusline-command.sh|$PAI_DIR/.claude/statusline-command.sh|g" "$PAI_DIR/.claude/settings.json"

            print_success "v0.6.0 paths fixed in settings.json"
        fi
    fi

    # v0.6.0 fix: Update hook scripts to use .claude/skills path
    if [ -f "$PAI_DIR/.claude/hooks/load-core-context.ts" ]; then
        print_warning "Fixing skill paths in load-core-context.ts hook..."
        sed -i "s|'skills/CORE/SKILL.md'|'.claude/skills/CORE/SKILL.md'|g" "$PAI_DIR/.claude/hooks/load-core-context.ts"
        print_success "Hook script paths fixed"
    fi

    # v0.6.0 fix: Update hook scripts to use .claude/hooks path (not /hooks)
    if [ -f "$PAI_DIR/.claude/hooks/initialize-pai-session.ts" ]; then
        if grep -q "paiDir, 'hooks/" "$PAI_DIR/.claude/hooks/initialize-pai-session.ts" 2>/dev/null; then
            print_warning "Fixing hook paths in initialize-pai-session.ts..."
            sed -i "s|paiDir, 'hooks/|paiDir, '.claude/hooks/|g" "$PAI_DIR/.claude/hooks/initialize-pai-session.ts"
            print_success "initialize-pai-session.ts hook paths fixed"
        fi
    fi

    # Also fix ${PAI_DIR} in commands/load-dynamic-requirements.md
    if [ -f "$PAI_DIR/.claude/commands/load-dynamic-requirements.md" ] && grep -q '${PAI_DIR}' "$PAI_DIR/.claude/commands/load-dynamic-requirements.md" 2>/dev/null; then
        print_warning "Fixing paths in load-dynamic-requirements.md..."

        # Replace ${PAI_DIR} with absolute path
        sed -i "s|\${PAI_DIR}|$PAI_DIR|g" "$PAI_DIR/.claude/commands/load-dynamic-requirements.md"

        # v0.6.0 fix: Update PAI.md path from /PAI/PAI.md to /PAI/.claude/PAI.md
        sed -i "s|$PAI_DIR/PAI\.md|$PAI_DIR/.claude/PAI.md|g" "$PAI_DIR/.claude/commands/load-dynamic-requirements.md"

        print_success "Command paths fixed in load-dynamic-requirements.md"
    fi

    # Fix PAI_DIR environment variable in settings.json env section
    if command_exists jq; then
        current_pai_dir=$(jq -r '.env.PAI_DIR // empty' "$PAI_DIR/.claude/settings.json" 2>/dev/null)
        if [ "$current_pai_dir" != "$PAI_DIR" ]; then
            print_warning "Fixing PAI_DIR environment variable in settings.json..."

            # Update env.PAI_DIR to use absolute path
            jq --arg pai_dir "$PAI_DIR" '.env.PAI_DIR = $pai_dir' "$PAI_DIR/.claude/settings.json" > "$PAI_DIR/.claude/settings.json.tmp" && \
            mv "$PAI_DIR/.claude/settings.json.tmp" "$PAI_DIR/.claude/settings.json"

            print_success "PAI_DIR environment variable fixed"
        fi

        # Update DA (AI assistant name) in settings.json
        current_da=$(jq -r '.env.DA // empty' "$PAI_DIR/.claude/settings.json" 2>/dev/null)
        if [ "$current_da" != "$AI_NAME" ]; then
            print_warning "Updating AI assistant name in settings.json..."

            jq --arg ai_name "$AI_NAME" '.env.DA = $ai_name' "$PAI_DIR/.claude/settings.json" > "$PAI_DIR/.claude/settings.json.tmp" && \
            mv "$PAI_DIR/.claude/settings.json.tmp" "$PAI_DIR/.claude/settings.json"

            print_success "AI assistant name updated to: $AI_NAME"
        fi

        # Update DA_COLOR in settings.json
        current_color=$(jq -r '.env.DA_COLOR // empty' "$PAI_DIR/.claude/settings.json" 2>/dev/null)
        if [ "$current_color" != "$AI_COLOR" ]; then
            print_warning "Updating AI assistant color in settings.json..."

            jq --arg ai_color "$AI_COLOR" '.env.DA_COLOR = $ai_color' "$PAI_DIR/.claude/settings.json" > "$PAI_DIR/.claude/settings.json.tmp" && \
            mv "$PAI_DIR/.claude/settings.json.tmp" "$PAI_DIR/.claude/settings.json"

            print_success "AI assistant color updated to: $AI_COLOR"
        fi
    fi

    # Update PAI.md with the user's chosen AI assistant name and identity assertion
    if [ -f "$PAI_DIR/.claude/PAI.md" ]; then
        # Check if PAI.md needs identity assertion added
        if ! grep -q "IMPORTANT: You are" "$PAI_DIR/.claude/PAI.md" 2>/dev/null; then
            print_warning "Adding identity assertion to PAI.md..."

            # Create a temporary file with the new Core Identity section
            cat > "$PAI_DIR/.pai_identity_tmp" << IDENTITY_EOF
## Core Identity

This system is your Personal AI Infrastructure (PAI) instance.

**IMPORTANT: You are $AI_NAME, NOT "Claude Code"!**

**Name:** $AI_NAME

**Role:** Personal AI assistant integrated into the development workflow.

**Operating Environment:** Personal AI infrastructure built around Claude Code with Skills-based context management.

**Personality:** Friendly, professional, helpful, proactive.

**Identity Assertion:**
- When introducing yourself, use: "I'm $AI_NAME, your AI assistant"
- Do NOT introduce yourself as "Claude Code" unless specifically discussing the underlying platform
- $AI_NAME is your primary identity in this PAI system
- You are powered by Claude (Anthropic's AI) but your name is $AI_NAME

---
IDENTITY_EOF

            # Replace the Core Identity section in PAI.md
            # First, get the line number where Core Identity starts
            core_identity_line=$(grep -n "^## Core Identity" "$PAI_DIR/.claude/PAI.md" | cut -d: -f1)

            if [ -n "$core_identity_line" ]; then
                # Find the next --- after Core Identity
                next_separator_line=$(tail -n +$((core_identity_line + 1)) "$PAI_DIR/.claude/PAI.md" | grep -n "^---" | head -1 | cut -d: -f1)
                next_separator_line=$((core_identity_line + next_separator_line))

                # Create new PAI.md: content before Core Identity + new identity + content after separator
                {
                    head -n $((core_identity_line - 1)) "$PAI_DIR/.claude/PAI.md"
                    cat "$PAI_DIR/.pai_identity_tmp"
                    tail -n +$((next_separator_line + 1)) "$PAI_DIR/.claude/PAI.md"
                } > "$PAI_DIR/.pai_md_tmp"

                mv "$PAI_DIR/.pai_md_tmp" "$PAI_DIR/.claude/PAI.md"
                rm "$PAI_DIR/.pai_identity_tmp"

                print_success "PAI.md updated with AI identity: $AI_NAME"
            else
                print_warning "Could not find Core Identity section in PAI.md"
                rm "$PAI_DIR/.pai_identity_tmp"
            fi
        elif grep -q "default: Kai" "$PAI_DIR/.claude/PAI.md" 2>/dev/null; then
            # Simple case: just update the name line
            print_warning "Updating AI assistant name in PAI.md..."
            sed -i "s/\*\*Name:\*\* You can customize this (default: Kai)/\*\*Name:\*\* $AI_NAME/" "$PAI_DIR/.claude/PAI.md"
            print_success "PAI.md updated with AI name: $AI_NAME"
        fi
    fi


    # Update load-dynamic-requirements.md with the user's chosen AI assistant name
    if [ -f "$PAI_DIR/.claude/commands/load-dynamic-requirements.md" ]; then
        # Replace hardcoded "Kai" references with the user's chosen name
        if grep -q "respond like Kai" "$PAI_DIR/.claude/commands/load-dynamic-requirements.md" 2>/dev/null; then
            print_warning "Updating AI name in load-dynamic-requirements.md..."

            # Replace the two Kai references in the conversational section
            sed -i "s/respond like Kai having a chat/respond like $AI_NAME having a chat/g" "$PAI_DIR/.claude/commands/load-dynamic-requirements.md"
            sed -i "s/You're Kai, their assistant/You're $AI_NAME, their assistant/g" "$PAI_DIR/.claude/commands/load-dynamic-requirements.md"

            print_success "load-dynamic-requirements.md updated with AI name: $AI_NAME"
        fi
    fi

    # Update SKILL.md with the user's chosen AI assistant name
    if [ -f "$PAI_DIR/.claude/skills/CORE/SKILL.md" ]; then
        # Check if SKILL.md still has the template placeholder
        if grep -q "Your Name: \[CUSTOMIZE" "$PAI_DIR/.claude/skills/CORE/SKILL.md" 2>/dev/null; then
            print_warning "Updating AI name in SKILL.md..."

            # Replace the template placeholder with the user's chosen name
            sed -i "s/Your Name: \[CUSTOMIZE - e.g., Kai, Nova, Atlas\]/Your Name: $AI_NAME/" "$PAI_DIR/.claude/skills/CORE/SKILL.md"

            print_success "SKILL.md updated with AI name: $AI_NAME"
        fi
    fi

    # Check if load-dynamic-requirements.ts is missing from UserPromptSubmit
    if ! grep -q "load-dynamic-requirements.ts" "$PAI_DIR/.claude/settings.json" 2>/dev/null; then
        print_warning "Adding missing load-dynamic-requirements.ts hook..."

        # Use jq to add load-dynamic-requirements.ts to UserPromptSubmit hooks
        jq --arg pai_dir "$PAI_DIR" '.hooks.UserPromptSubmit[0] = {
            "matcher": "*",
            "hooks": [
                {
                    "type": "command",
                    "command": ($pai_dir + "/.claude/hooks/load-dynamic-requirements.ts")
                },
                {
                    "type": "command",
                    "command": ($pai_dir + "/.claude/hooks/update-tab-titles.ts")
                }
            ]
        }' "$PAI_DIR/.claude/settings.json" > "$PAI_DIR/.claude/settings.json.tmp" && \
        mv "$PAI_DIR/.claude/settings.json.tmp" "$PAI_DIR/.claude/settings.json"

        print_success "Missing hook added!"
    fi

    # Fix executable permission on load-dynamic-requirements.ts
    chmod +x "$PAI_DIR/.claude/hooks/load-dynamic-requirements.ts" 2>/dev/null

    print_success "Hooks configuration verified"

    echo ""
    print_info "Next steps for Claude Code:"
    echo "  1. Download Claude Code from: https://claude.ai/code"
    echo "  2. Sign in with your Anthropic account"
    echo "  3. Restart Claude Code if it's already running"
    echo ""
else
    print_info "For other AI assistants, refer to the documentation:"
    echo "  $PAI_DIR/.claude/documentation/how-to-start.md"
fi

# ============================================
# Step 8.5: Create Critical Symlinks
# ============================================

print_header "Step 8.5: Creating Critical Symlinks"

# Create hooks symlink (CRITICAL for hooks to work!)
print_step "Linking hooks to Claude Code..."
if [ -L "$HOME/.claude/hooks" ]; then
    print_info "Hooks already linked to PAI"
elif [ -d "$HOME/.claude/hooks" ]; then
    print_warning "Hooks directory already exists"
    if ask_yes_no "Replace it with PAI's hooks?"; then
        mv "$HOME/.claude/hooks" "$HOME/.claude/hooks.backup"
        print_info "Backed up existing hooks to hooks.backup"
        ln -sf "$PAI_DIR/.claude/hooks" "$HOME/.claude/hooks"
        print_success "Hooks linked to PAI!"
    fi
else
    ln -sf "$PAI_DIR/.claude/hooks" "$HOME/.claude/hooks"
    print_success "Hooks linked to PAI!"
fi

# Create skills symlink (PAI-global skills)
print_step "Linking skills to Claude Code..."
if [ -L "$HOME/.claude/skills" ]; then
    print_info "Skills already linked to PAI"
elif [ -d "$HOME/.claude/skills" ]; then
    print_warning "Skills directory already exists"
    if ask_yes_no "Replace it with PAI's skills?"; then
        mv "$HOME/.claude/skills" "$HOME/.claude/skills.backup"
        print_info "Backed up existing skills to skills.backup"
        ln -sf "$PAI_DIR/.claude/skills" "$HOME/.claude/skills"
        print_success "Skills linked to PAI!"
    fi
else
    ln -sf "$PAI_DIR/.claude/skills" "$HOME/.claude/skills"
    print_success "Skills linked to PAI!"
fi

# Create scratchpad directory (required by PAI.md)
print_step "Creating scratchpad directory..."
if [ -d "$HOME/.claude/scratchpad" ]; then
    print_info "Scratchpad directory already exists"
else
    mkdir -p "$HOME/.claude/scratchpad"
    print_success "Scratchpad directory created"
fi

# Clean up old wrapper files from pre-v0.6.0 (if they exist)
print_step "Cleaning up old wrapper files (if any)..."
if [ -d "$HOME/.claude/bin" ]; then
    print_warning "Found old ~/.claude/bin directory from pre-v0.6.0"
    if ask_yes_no "Remove it? (No longer needed in v0.6.0)" "y"; then
        rm -rf "$HOME/.claude/bin"
        print_success "Old bin directory removed"
    fi
elif [ -f "$HOME/.claude/bin" ]; then
    print_warning "Found ~/.claude/bin file (should be a directory or not exist)"
    rm -f "$HOME/.claude/bin"
    print_success "Removed unexpected bin file"
else
    print_info "No old wrapper files found (clean install)"
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
if [ -d "$PAI_DIR/.claude/skills" ]; then
    skill_count=$(find "$PAI_DIR/.claude/skills" -maxdepth 1 -type d | wc -l | tr -d ' ')
    print_success "Found $skill_count skills"
else
    print_warning "Skills directory not found"
fi

# Test 3: Commands directory exists
if [ -d "$PAI_DIR/.claude/commands" ]; then
    command_count=$(find "$PAI_DIR/.claude/commands" -type f -name "*.md" | wc -l | tr -d ' ')
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

# Test 7: Hooks symlink
if [ -L "$HOME/.claude/hooks" ]; then
    hooks_target=$(readlink "$HOME/.claude/hooks")
    if [ "$hooks_target" = "$PAI_DIR/.claude/hooks" ]; then
        print_success "Hooks symlink configured correctly"
    else
        print_warning "Hooks symlink points to wrong location: $hooks_target"
    fi
else
    print_warning "Hooks symlink not found (PAI may not work correctly)"
fi

# Test 8: Skills symlink
if [ -L "$HOME/.claude/skills" ]; then
    skills_target=$(readlink "$HOME/.claude/skills")
    if [ "$skills_target" = "$PAI_DIR/.claude/skills" ]; then
        print_success "Skills symlink configured correctly"
    else
        print_warning "Skills symlink points to wrong location: $skills_target"
    fi
else
    print_info "Skills symlink not found (optional)"
fi

# Test 9: Scratchpad directory
if [ -d "$HOME/.claude/scratchpad" ]; then
    print_success "Scratchpad directory exists"
else
    print_warning "Scratchpad directory not found"
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
echo "   • Edit: $PAI_DIR/.claude/skills/CORE/SKILL.md"
echo "   • Add API keys: $PAI_DIR/.env"
echo "   • Read the docs: $PAI_DIR/.claude/documentation/how-to-start.md"
echo ""

print_header "Quick Reference"

echo "Essential commands to remember:"
echo ""
echo "  ${CYAN}cd \$PAI_DIR${NC}                    # Go to PAI directory"
echo "  ${CYAN}cd \$PAI_DIR && git pull${NC}       # Update PAI to latest version"
echo "  ${CYAN}open -e \$PAI_DIR/.env${NC}         # Edit API keys"
echo "  ${CYAN}ls \$PAI_DIR/.claude/skills${NC}            # See available skills"
echo "  ${CYAN}source ~/.zshrc${NC}                # Reload environment"
echo ""

print_header "Resources"

echo "  📖 Documentation: $PAI_DIR/.claude/documentation/"
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
    if ! open "$PAI_DIR/.claude/documentation/how-to-start.md" 2>/dev/null; then
        # Reset terminal before displaying doc
        stty sane 2>/dev/null || true
        cat "$PAI_DIR/.claude/documentation/how-to-start.md"
        echo ""  # Ensure final newline
    fi
fi

# ============================================
# CRITICAL: Shell Reload Warning
# ============================================

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Restart Your Shell${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Your shell configuration has been updated, but your CURRENT shell"
echo "session still has old settings loaded in memory (including any old"
echo "aliases or PATH configurations)."
echo ""

# Check if old claude alias exists in current session
if alias claude 2>/dev/null | grep -q "claude-wrapper"; then
    echo -e "${RED}${WARN} WARNING: Detected old 'claude' alias in current session!${NC}"
    echo "This WILL cause errors until you reload your shell."
    echo ""
fi

echo "To activate PAI, you MUST do ONE of the following:"
echo ""
echo "  ${CYAN}Option 1 (Recommended):${NC}"
echo "    • Close this terminal window"
echo "    • Open a new terminal"
echo ""
echo "  ${CYAN}Option 2 (Quick):${NC}"
echo "    • Run: ${GREEN}source $SHELL_CONFIG${NC}"
echo "    • Run: ${GREEN}exec bash${NC}"
echo ""
echo "  ${CYAN}Option 3 (Manual):${NC}"
echo "    • Run: ${GREEN}unalias claude 2>/dev/null${NC}"
echo "    • Run: ${GREEN}source $SHELL_CONFIG${NC}"
echo ""
echo -e "${YELLOW}After reloading, test with: ${GREEN}claude --version${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
print_success "Setup complete! Enjoy using PAI! 🎉"
echo ""

# Reset terminal to clean state (fixes newline issues from /dev/tty usage)
stty sane 2>/dev/null || true
