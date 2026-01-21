#!/usr/bin/env bash
# PAI for OpenCode - Installation Script (Linux/macOS)
# Version: 1.0.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ██████╗  █████╗ ██╗    ███████╗ ██████╗ ██████╗                ║
║   ██╔══██╗██╔══██╗██║    ██╔════╝██╔═══██╗██╔══██╗               ║
║   ██████╔╝███████║██║    █████╗  ██║   ██║██████╔╝               ║
║   ██╔═══╝ ██╔══██║██║    ██╔══╝  ██║   ██║██╔══██╗               ║
║   ██║     ██║  ██║██║    ██║     ╚██████╔╝██║  ██║               ║
║   ╚═╝     ╚═╝  ╚═╝╚═╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝               ║
║                                                                   ║
║        Personal AI Infrastructure - OpenCode Edition              ║
║                       v1.0.0                                      ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${YELLOW}This installer will set up PAI for OpenCode.${NC}"
echo ""

# Function to ask yes/no questions
ask_yn() {
    local prompt="$1"
    local default="${2:-y}"
    local yn

    if [[ "$default" == "y" ]]; then
        prompt="$prompt [Y/n]: "
    else
        prompt="$prompt [y/N]: "
    fi

    while true; do
        read -p "$prompt" yn
        yn=${yn:-$default}
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Function to ask for input with default
ask_input() {
    local prompt="$1"
    local default="$2"
    local value

    read -p "$prompt [$default]: " value
    echo "${value:-$default}"
}

# Detect platform
PLATFORM="$(uname -s)"
case "$PLATFORM" in
    Linux*)     PLATFORM_NAME="Linux";;
    Darwin*)    PLATFORM_NAME="macOS";;
    *)          PLATFORM_NAME="UNKNOWN";;
esac

echo -e "${GREEN}✓ Detected platform: $PLATFORM_NAME${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Bun not found${NC}"
    echo ""
    echo "Bun is required to run PAI tools."
    echo "Install it from: https://bun.sh"
    echo ""
    echo "Quick install:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Bun found: $(bun --version)${NC}"

# Check for OpenCode
if ! command -v opencode &> /dev/null; then
    echo -e "${YELLOW}⚠ OpenCode not found in PATH${NC}"
    echo ""
    echo "OpenCode should be installed before continuing."
    echo "Install from: https://opencode.ai"
    echo ""
    if ! ask_yn "Continue anyway?"; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ OpenCode found${NC}"
fi

echo ""

# Set up directories
OPENCODE_DIR="${HOME}/.opencode"
PAI_DIR="${OPENCODE_DIR}/pai"
CONFIG_FILE="${HOME}/.opencode.json"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  CONFIGURATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Gather configuration
DA_NAME=$(ask_input "What would you like to name your AI assistant?" "Kai")
USER_NAME=$(ask_input "What is your name?" "User")
TIME_ZONE=$(ask_input "What's your timezone?" "$(timedatectl show -p Timezone --value 2>/dev/null || echo 'America/New_York')")

echo ""
echo -e "${GREEN}Configuration:${NC}"
echo "  Assistant Name: $DA_NAME"
echo "  User Name: $USER_NAME"
echo "  Timezone: $TIME_ZONE"
echo "  PAI Directory: $PAI_DIR"
echo ""

if ! ask_yn "Proceed with installation?"; then
    echo "Installation cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  INSTALLATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Create directory structure
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p "$PAI_DIR"/{skills/CORE/{workflows,tools},history/{sessions,learnings,decisions},tools,mcp-servers}
echo -e "${GREEN}✓ Directories created${NC}"

# Generate SKILL.md
echo -e "${YELLOW}Generating SKILL.md...${NC}"
cat > "$PAI_DIR/skills/CORE/SKILL.md" << EOF
---
name: CORE
description: Personal AI Infrastructure core. AUTO-LOADS at session start. USE WHEN any session begins OR user asks about identity, response format, contacts, stack preferences.
---

# CORE - Personal AI Infrastructure

**Auto-loads at session start.** This skill defines your AI's identity, response format, and core operating principles.

## Identity

**Assistant:**
- Name: $DA_NAME
- Role: $USER_NAME's AI assistant
- Operating Environment: Personal AI infrastructure built on OpenCode

**User:**
- Name: $USER_NAME

---

## First-Person Voice (CRITICAL)

Your AI should speak as itself, not about itself in third person.

**Correct:**
- "for my system" / "in my architecture"
- "I can help" / "my delegation patterns"
- "we built this together"

**Wrong:**
- "for $DA_NAME" / "for the $DA_NAME system"
- "the system can" (when meaning "I can")

---

## Stack Preferences

Default preferences (customize in CoreStack.md):

- **Language:** TypeScript preferred over Python
- **Package Manager:** bun (NEVER npm/yarn/pnpm)
- **Runtime:** Bun
- **Markup:** Markdown (NEVER HTML for basic content)

---

## Response Format (Optional)

Define a consistent response format for task-based responses:

\`\`\`
📋 SUMMARY: [One sentence]
🔍 ANALYSIS: [Key findings]
⚡ ACTIONS: [Steps taken]
✅ RESULTS: [Outcomes]
➡️ NEXT: [Recommended next steps]
\`\`\`

Customize this format in SKILL.md to match your preferences.
EOF
echo -e "${GREEN}✓ SKILL.md created${NC}"

# Generate Contacts.md
echo -e "${YELLOW}Generating Contacts.md...${NC}"
cat > "$PAI_DIR/skills/CORE/Contacts.md" << 'EOF'
# Contact Directory

Quick reference for frequently contacted people.

---

## Contacts

| Name | Role | Email | Notes |
|------|------|-------|-------|
| [Add contacts here] | [Role] | [email] | [Notes] |

---

## Adding Contacts

To add a new contact, edit this file following the table format above.
EOF
echo -e "${GREEN}✓ Contacts.md created${NC}"

# Generate CoreStack.md
echo -e "${YELLOW}Generating CoreStack.md...${NC}"
cat > "$PAI_DIR/skills/CORE/CoreStack.md" << EOF
# Core Stack Preferences

Technical preferences for code generation and tooling.

Generated: $(date +%Y-%m-%d)

---

## Language Preferences

| Priority | Language | Use Case |
|----------|----------|----------|
| 1 | TypeScript | Primary for all new code |
| 2 | Python | Data science, ML, when required |

---

## Package Managers

| Language | Manager | Never Use |
|----------|---------|-----------|
| JavaScript/TypeScript | bun | npm, yarn, pnpm |
| Python | uv | pip, pip3 |

---

## Runtime

| Purpose | Tool |
|---------|------|
| JavaScript Runtime | Bun |
| Serverless | Cloudflare Workers |

---

## Markup Preferences

| Format | Use | Never Use |
|--------|-----|-----------|
| Markdown | All content, docs, notes | HTML for basic content |
| YAML | Configuration, frontmatter | - |
| JSON | API responses, data | - |

---

## Code Style

- Prefer explicit over clever
- No unnecessary abstractions
- Comments only where logic isn't self-evident
- Error messages should be actionable
EOF
echo -e "${GREEN}✓ CoreStack.md created${NC}"

# Create .env file
echo -e "${YELLOW}Creating .env file...${NC}"
cat > "$PAI_DIR/.env" << EOF
# PAI Environment Configuration
# Created by PAI for OpenCode installer - $(date +%Y-%m-%d)

DA=$DA_NAME
TIME_ZONE=$TIME_ZONE
PAI_DIR=$PAI_DIR

# Add API keys below as needed
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# ELEVENLABS_API_KEY=
EOF
echo -e "${GREEN}✓ .env created${NC}"

# Create or update .opencode.json
echo -e "${YELLOW}Configuring OpenCode...${NC}"

if [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠ Existing .opencode.json found${NC}"
    if ask_yn "Backup and update existing config?"; then
        cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
        echo -e "${GREEN}✓ Backup created: ${CONFIG_FILE}.backup${NC}"
    fi
fi

# Create basic OpenCode config with PAI context server
cat > "$CONFIG_FILE" << EOF
{
  "data": {
    "directory": "$OPENCODE_DIR"
  },
  "mcpServers": {
    "pai-context": {
      "command": "bun",
      "args": ["run", "$PAI_DIR/mcp-servers/context-server.ts"],
      "env": {
        "PAI_DIR": "$PAI_DIR",
        "DA": "$DA_NAME",
        "TIME_ZONE": "$TIME_ZONE"
      }
    }
  }
}
EOF
echo -e "${GREEN}✓ OpenCode configuration created${NC}"

# Create MCP context server
echo -e "${YELLOW}Creating MCP context server...${NC}"
cat > "$PAI_DIR/mcp-servers/context-server.ts" << 'EOF'
#!/usr/bin/env bun
/**
 * PAI Context Server for OpenCode
 *
 * This MCP server loads your CORE skill (identity, contacts, stack preferences)
 * and makes it available to OpenCode at session start.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.opencode', 'pai');
const SKILL_PATH = join(PAI_DIR, 'skills', 'CORE', 'SKILL.md');

// MCP server stdin/stdout protocol
process.stdin.setEncoding('utf8');

// Handle MCP requests
process.stdin.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString());

    if (request.method === 'initialize') {
      // Load CORE skill content
      let skillContent = '';
      if (existsSync(SKILL_PATH)) {
        skillContent = readFileSync(SKILL_PATH, 'utf-8');
      }

      // Return context to OpenCode
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          context: skillContent,
          metadata: {
            name: 'PAI Context',
            version: '1.0.0',
            description: 'Personal AI Infrastructure context loader'
          }
        }
      };

      process.stdout.write(JSON.stringify(response) + '\n');
    }
  } catch (error) {
    console.error('MCP server error:', error);
  }
});

// Keep server alive
process.stdin.resume();
EOF
chmod +x "$PAI_DIR/mcp-servers/context-server.ts"
echo -e "${GREEN}✓ MCP context server created${NC}"

# Installation complete
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  INSTALLATION COMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Your PAI system is configured for OpenCode:${NC}"
echo ""
echo "  📁 PAI Directory: $PAI_DIR"
echo "  🤖 Assistant Name: $DA_NAME"
echo "  👤 User: $USER_NAME"
echo "  🌍 Timezone: $TIME_ZONE"
echo "  ⚙️  OpenCode Config: $CONFIG_FILE"
echo ""
echo -e "${YELLOW}Files created:${NC}"
echo "  - $PAI_DIR/skills/CORE/SKILL.md"
echo "  - $PAI_DIR/skills/CORE/Contacts.md"
echo "  - $PAI_DIR/skills/CORE/CoreStack.md"
echo "  - $PAI_DIR/.env"
echo "  - $CONFIG_FILE"
echo "  - $PAI_DIR/mcp-servers/context-server.ts"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Start OpenCode:"
echo "     $ opencode"
echo ""
echo "  2. Your CORE skill will auto-load via the PAI context MCP server"
echo ""
echo "  3. (Optional) Install additional PAI packs:"
echo "     - Browse packs in ../Packs/"
echo "     - Give pack files to OpenCode to install"
echo ""
echo -e "${GREEN}For more information, see OpenCode/README.md${NC}"
echo ""
