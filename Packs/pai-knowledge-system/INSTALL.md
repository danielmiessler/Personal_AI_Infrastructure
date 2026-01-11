# PAI Knowledge System - Installation

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

**FOR AI AGENTS:** This installation MUST be completed exactly as specified. Follow these rules:
1. **Execute every step** - Do NOT skip steps or mark them as "optional"
2. **Verify outputs** - After each command, check the expected output matches
3. **Stop on errors** - If any step fails, troubleshoot before continuing
4. **Use exact paths** - Do not modify file paths or directory structures
5. **Copy files verbatim** - Do not simplify or "improve" code during installation
6. **Run verification** - After installation, complete ALL checks in VERIFY.md

---


## Prerequisites

**System Requirements:**
- **Podman** 3.0+ or Docker (container runtime)
- **Bun** runtime (for PAI skill execution)
- **OpenAI API key** or compatible LLM provider
- **Claude Code** or compatible PAI-enabled agent system
- **2GB RAM** minimum for container
- **1GB disk space** for graph database

**Pack Dependencies:**
- **pai-history-system** (Required) - The history sync hook reads captured learnings, research, and decisions from the PAI History System and syncs them to the knowledge graph. Install this pack first.

**API Key Requirements:**
- OpenAI API key (recommended): Get from https://platform.openai.com/api-keys
- Alternative: Anthropic, Google Gemini, or Groq (requires OpenAI for embeddings)

---

## Pre-Installation: System Analysis

**IMPORTANT:** Before installing, analyze the current system state to detect conflicts and ensure dependencies are met.

> **FOR AI AGENTS:** Run ALL pre-installation checks before proceeding. If ANY check shows a conflict or missing dependency:
> - **Port in use**: Stop the existing service or choose a different port
> - **Missing dependency**: Install the dependency first (pai-history-system, Podman, Bun)
> - **Existing installation**: Backup existing files, then proceed with update
> - **Missing API key**: Prompt user to provide API key before continuing

### Step 0.1: Detect Current Configuration

Run these commands to understand your current system:

```bash
# 1. Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.claude'}"

# 2. Check for existing PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
if [ -d "$PAI_CHECK" ]; then
  echo "⚠️  PAI directory EXISTS at: $PAI_CHECK"
  echo "Contents:"
  ls -la "$PAI_CHECK" 2>/dev/null || echo "  (empty or inaccessible)"
else
  echo "✓ PAI directory does not exist (clean install)"
fi

# 3. Check for existing MCP server
echo ""
echo "Checking for existing MCP server..."
if podman ps | grep -q "pai-knowledge-graph-mcp"; then
    echo "⚠️  PAI Knowledge MCP server is already running"
    podman ps | grep "pai-knowledge-graph-mcp"
else
    echo "✓ No PAI Knowledge MCP server running"
fi

# 4. Check if port 8000 is available
echo ""
echo "Checking port availability..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use"
    lsof -i :8000 | head -5
else
    echo "✓ Port 8000 is available"
fi

# 5. Check if port 6379 is available (FalkorDB)
echo ""
echo "Checking FalkorDB port 6379..."
if lsof -i :6379 > /dev/null 2>&1; then
    echo "⚠️  Port 6379 is already in use"
    lsof -i :6379 | head -5
else
    echo "✓ Port 6379 is available"
fi

# 6. Check for existing Knowledge skill
echo ""
echo "Checking for existing Knowledge skill..."
if [ -d "$PAI_CHECK/skills/Knowledge" ]; then
  echo "⚠️  Knowledge skill already exists at: $PAI_CHECK/skills/Knowledge"
else
  echo "✓ No existing Knowledge skill found"
fi

# 7. Check environment variables
echo ""
echo "Environment variables:"
echo "  PAI_DIR: ${PAI_DIR:-'NOT SET'}"
echo "  PAI_KNOWLEDGE_OPENAI_API_KEY: ${PAI_KNOWLEDGE_OPENAI_API_KEY:+SET (value hidden)}"

# 8. Check Podman installation
echo ""
echo "Container Runtime Check:"
if command -v podman &> /dev/null; then
    echo "✓ Podman is installed: $(podman --version)"
else
    echo "❌ Podman is NOT installed"
    echo "   Install with: brew install podman (macOS)"
    echo "              or: sudo apt install podman (Ubuntu/Debian)"
fi
```

### Step 0.2: Verify Dependencies

```bash
# Check for required dependencies
echo "Dependency Verification:"
echo "========================"

# Check Bun runtime
if command -v bun &> /dev/null; then
    echo "✓ Bun is installed: $(bun --version)"
else
    echo "❌ Bun is NOT installed"
    echo "   Install with: curl -fsSL https://bun.sh/install | bash"
fi

# Check for API key (prefer PAI_KNOWLEDGE_* prefix)
if [ -n "$PAI_KNOWLEDGE_OPENAI_API_KEY" ] || [ -n "$PAI_KNOWLEDGE_ANTHROPIC_API_KEY" ] || [ -n "$PAI_KNOWLEDGE_GOOGLE_API_KEY" ]; then
    echo "✓ LLM API key is configured (PAI_KNOWLEDGE_* prefix)"
elif [ -n "$OPENAI_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ] || [ -n "$GOOGLE_API_KEY" ]; then
    echo "✓ LLM API key is configured (legacy - consider using PAI_KNOWLEDGE_* prefix)"
else
    echo "⚠️  No LLM API key found in environment"
    echo "   You will need to configure this during installation"
fi

# Check for .env.example file
if [ -f "src/config/.env.example" ]; then
    echo "✓ .env.example found in src/config/ (needed for configuration)"
else
    echo "❌ .env.example not found in src/config/"
    echo "   This file should be in the pack at src/config/.env.example"
fi
```

### Step 0.3: Conflict Resolution Matrix

Based on the detection above, follow the appropriate path:

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No MCP server, ports available, no existing skill | Proceed normally with Step 1 |
| **Server Running** | MCP server already running | Decide: keep existing (skip to Step 4) or stop/reinstall |
| **Port Conflict** | Ports 8000 or 6379 in use | Stop conflicting services or change ports in run.ts |
| **Skill Exists** | Knowledge skill already installed | Backup old skill, compare versions, then replace |
| **Missing Dependencies** | Podman or Bun not installed | Install dependencies first, then retry |

### Step 0.4: Backup Existing Configuration (If Needed)

If conflicts were detected, create a backup before proceeding:

```bash
# Create timestamped backup
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"

echo "Creating backup at: $BACKUP_DIR"

# Backup existing skill if present
if [ -d "$PAI_CHECK/skills/Knowledge" ]; then
  cp -r "$PAI_CHECK/skills/Knowledge" "$BACKUP_DIR/Knowledge"
  echo "✓ Backed up existing Knowledge skill"
fi

# Backup .env if present
if [ -f "src/config/.env" ]; then
  cp src/config/.env "$BACKUP_DIR/.env"
  echo "✓ Backed up existing .env file"
fi

# Backup container if running
if podman ps | grep -q "pai-knowledge-graph-mcp"; then
    podman export pai-knowledge-graph-mcp > "$BACKUP_DIR/pai-container.tar" 2>/dev/null || true
    echo "✓ Backed up running container (if possible)"
fi

echo "Backup complete!"
```

**After completing system analysis, proceed to Step 1.**

---

## Step 1: Verify Pack Contents

> **FOR AI AGENTS:** This step verifies the pack is complete. If ANY file is missing, STOP and inform the user - the pack is incomplete and cannot be installed.

Ensure you have all required files in the pack directory:

```bash
# Navigate to pack directory
cd /path/to/pai-knowledge-system

# Verify required files exist
echo "Checking pack contents..."

REQUIRED_FILES=(
    "README.md"
    "SKILL.md"
    "src/server/run.ts"
    "src/server/podman-compose.yml"
    "src/server/docker-compose.yml"
    "config/.env.example"
    "src/skills/workflows/CaptureEpisode.md"
    "src/skills/workflows/SearchKnowledge.md"
    "src/skills/workflows/SearchFacts.md"
    "src/skills/workflows/GetRecent.md"
    "src/skills/workflows/GetStatus.md"
    "src/skills/workflows/ClearGraph.md"
    "src/skills/workflows/BulkImport.md"
    "src/skills/tools/Install.md"
)

ALL_FOUND=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "✗ MISSING: $file"
        ALL_FOUND=false
    fi
done

if [ "$ALL_FOUND" = true ]; then
    echo ""
    echo "✓ All required files present!"
else
    echo ""
    echo "❌ Some files are missing. Please ensure you have the complete pack."
    exit 1
fi
```

---

## Step 2: Add Configuration to PAI

**Add PAI Knowledge System settings to your PAI configuration:**

```bash
PAI_ENV="${PAI_DIR:-$HOME/.claude}/.env"

echo ""
echo "📝 Updating PAI Configuration"
echo "=============================="
echo ""
echo "PAI Configuration: $PAI_ENV"
echo ""

# Check if API keys already exist in PAI .env
echo "Checking for existing API keys..."
source "$PAI_ENV" 2>/dev/null || true

AUTO_CONFIGURED=false
# Check for PAI_KNOWLEDGE_* prefixed keys first (preferred)
if [ -n "$PAI_KNOWLEDGE_OPENAI_API_KEY" ] || [ -n "$PAI_KNOWLEDGE_ANTHROPIC_API_KEY" ] || [ -n "$PAI_KNOWLEDGE_GOOGLE_API_KEY" ] || [ -n "$PAI_KNOWLEDGE_GROQ_API_KEY" ]; then
    echo "✓ Found existing API keys in PAI configuration (PAI_KNOWLEDGE_* prefix)"
    AUTO_CONFIGURED=true
# Fall back to legacy keys
elif [ -n "$OPENAI_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ] || [ -n "$GOOGLE_API_KEY" ] || [ -n "$GROQ_API_KEY" ]; then
    echo "✓ Found existing API keys in PAI configuration (legacy - consider migrating to PAI_KNOWLEDGE_* prefix)"
    AUTO_CONFIGURED=true
fi

# Determine provider settings (check PAI_KNOWLEDGE_* first)
if [ -z "$PAI_KNOWLEDGE_LLM_PROVIDER" ] && [ -z "$LLM_PROVIDER" ]; then
    LLM_PROVIDER="openai"
    EMBEDDER_PROVIDER="openai"

    if [ -n "$PAI_KNOWLEDGE_ANTHROPIC_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ]; then
        LLM_PROVIDER="anthropic"
    elif [ -n "$PAI_KNOWLEDGE_GOOGLE_API_KEY" ] || [ -n "$GOOGLE_API_KEY" ]; then
        LLM_PROVIDER="gemini"
        EMBEDDER_PROVIDER="gemini"
    elif [ -n "$PAI_KNOWLEDGE_GROQ_API_KEY" ] || [ -n "$GROQ_API_KEY" ]; then
        LLM_PROVIDER="groq"
    fi
else
    LLM_PROVIDER="${PAI_KNOWLEDGE_LLM_PROVIDER:-$LLM_PROVIDER}"
    EMBEDDER_PROVIDER="${PAI_KNOWLEDGE_EMBEDDER_PROVIDER:-$EMBEDDER_PROVIDER}"
fi

echo ""
echo "Configuration to add to PAI .env:"
echo "  LLM_PROVIDER: $LLM_PROVIDER"
echo "  EMBEDDER_PROVIDER: $EMBEDDER_PROVIDER"
echo ""

# Add PAI Knowledge System configuration to PAI .env
echo "Adding PAI Knowledge System configuration to $PAI_ENV..."

# Use Python to safely update the JSON (or .env file)
python3 << 'PYTHON_EOF'
import os
import re

pai_env = os.path.expanduser("${PAI_DIR:-$HOME/.claude}/.env")

# Read existing content
try:
    with open(pai_env, 'r') as f:
        lines = f.readlines()
except FileNotFoundError:
    lines = []

# Parse existing variables into a dict for easy checking
existing_vars = {}
for line in lines:
    match = re.match(r'^([A-Z_]+)=(.*)$', line.strip())
    if match:
        existing_vars[match.group(1)] = match.group(2)

# Variables to add (only if not already present) - all use PAI_KNOWLEDGE_* prefix
vars_to_add = {
    'PAI_KNOWLEDGE_LLM_PROVIDER': os.getenv('PAI_KNOWLEDGE_LLM_PROVIDER', os.getenv('LLM_PROVIDER', 'openai')),
    'PAI_KNOWLEDGE_EMBEDDER_PROVIDER': os.getenv('PAI_KNOWLEDGE_EMBEDDER_PROVIDER', os.getenv('EMBEDDER_PROVIDER', 'openai')),
    'PAI_KNOWLEDGE_MODEL_NAME': os.getenv('PAI_KNOWLEDGE_MODEL_NAME', os.getenv('MODEL_NAME', 'gpt-4o-mini')),
    'PAI_KNOWLEDGE_DATABASE_TYPE': 'falkordb',
    'PAI_KNOWLEDGE_FALKORDB_HOST': 'pai-knowledge-falkordb',
    'PAI_KNOWLEDGE_FALKORDB_PORT': '6379',
    'PAI_KNOWLEDGE_SEMAPHORE_LIMIT': '10',
    'PAI_KNOWLEDGE_GROUP_ID': 'main',
    'PAI_KNOWLEDGE_GRAPHITI_TELEMETRY_ENABLED': 'false',
}

# Write updated content
with open(pai_env, 'w') as f:
    # Write existing lines, skip ones we're updating
    updated_vars = set()
    for line in lines:
        match = re.match(r'^([A-Z_]+)=', line.strip())
        if match:
            var_name = match.group(1)
            if var_name in vars_to_add and vars_to_add[var_name] != existing_vars.get(var_name):
                # Update this line
                f.write(f"{var_name}={vars_to_add[var_name]}\n")
                updated_vars.add(var_name)
            else:
                f.write(line)
        else:
            f.write(line)

    # Add new variables
    for var_name, var_value in vars_to_add.items():
        if var_name not in existing_vars and var_name not in updated_vars:
            # Add PAI Knowledge System section header if this is the first var
            if len(updated_vars) == 0:
                f.write("\n# PAI Knowledge System Configuration\n")
            f.write(f"{var_name}={var_value}\n")
            updated_vars.add(var_name)

print("✓ PAI Knowledge System configuration added to PAI .env")
PYTHON_EOF

echo ""
echo "✓ Configuration complete"
echo ""
echo "PAI .env is now the source of truth for:"
echo "  - API keys (existing)"
echo "  - PAI Knowledge System settings (newly added)"
```

---

## Step 3: Start MCP Server

> **FOR AI AGENTS:** This step starts the containerized MCP server. The server MUST be running before proceeding.
> - If server fails to start: Check container logs with `podman logs pai-knowledge-graph-mcp`
> - If health check fails: Wait additional 30 seconds and retry - container may still be initializing
> - Server must show "✓ Server is running" before proceeding to Step 4

Launch the Graphiti MCP server with FalkorDB backend:

```bash
# Detect container runtime (Podman or Docker)
if command -v podman &> /dev/null; then
    CONTAINER_RUNTIME="podman"
    echo "✓ Detected Podman"
elif command -v docker &> /dev/null; then
    CONTAINER_RUNTIME="docker"
    echo "✓ Detected Docker"
else
    echo "❌ No container runtime found!"
    echo "   Install Podman: brew install podman (macOS)"
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Start the server
echo ""
echo "🚀 Starting MCP Server"
echo "======================"
echo ""
bun run src/server/run.ts

# Wait for server to initialize
echo ""
echo "Waiting for server to start..."
sleep 15

# Check server health (verify SSE endpoint responds)
echo "Verifying server health..."
if curl -s --max-time 5 http://localhost:8000/sse -H "Accept: text/event-stream" | grep -q "endpoint"; then
    echo "✓ Server is running and responding to SSE connections!"
else
    echo "⚠️  Server health check failed"
    echo "Check logs with: bun run src/skills/tools/logs.ts"
    echo "The server may still be starting up. Wait 30 seconds and try again."
fi
```

**Expected output:**
```
✓ Server is running and healthy!
```

**Alternative: Using Docker Compose**
If you prefer Docker Compose:
```bash
# For Docker users
docker compose -f src/server/docker-compose.yml up -d

# Check status
bun run src/skills/tools/status.ts
```

**Troubleshooting:**
- If server fails to start, check logs: `bun run src/skills/tools/logs.ts`
- If port is already in use, stop conflicting service or modify `src/server/run.ts` to use different ports
- If API key validation fails, verify your API key has available credits/quota

---

## Step 4: Install Knowledge Skill

> **FOR AI AGENTS:** This step copies the Knowledge skill to the PAI skills directory.
> - The skill MUST be copied to `$PAI_DIR/skills/Knowledge` or `~/.claude/skills/Knowledge`
> - Verify the copy succeeded by checking the directory structure
> - All workflow files must be present after copy

Copy the skill to your Claude skills directory:

```bash
echo ""
echo "📦 Installing Knowledge Skill"
echo "=============================="
echo ""

# Determine PAI skills directory (prioritize $PAI_DIR if set)
if [[ -n "$PAI_DIR" ]]; then
    PAI_SKILLS_DIR="$PAI_DIR/skills"
elif [[ -d "$HOME/.claude" ]]; then
    PAI_SKILLS_DIR="$HOME/.claude/skills"
else
    echo "⚠️  PAI directory not found."
    echo "Creating PAI directory structure at ~/.claude/skills"
    PAI_SKILLS_DIR="$HOME/.claude/skills"
fi
mkdir -p "$PAI_SKILLS_DIR"

# Copy entire src/skills directory as Knowledge skill
echo "Installing Knowledge skill..."
cp -r src/skills "$PAI_SKILLS_DIR/Knowledge"

echo ""
echo "✓ Knowledge skill installed to: $PAI_SKILLS_DIR/Knowledge"
echo ""
echo "Installed structure:"
ls -la "$PAI_SKILLS_DIR/Knowledge/"
```

---

## Step 5: Configure MCP Server in Claude Code

> **FOR AI AGENTS:** This step configures Claude Code to connect to the Knowledge MCP server.
> - The MCP server configuration MUST be added to `~/.claude.json`
> - After configuration, Claude Code must be restarted for changes to take effect
> - Verify the MCP server appears in Claude Code's server list after restart

**Enable the MCP server connection in Claude Code:**

The Knowledge skill requires MCP server integration. Configure it globally:

```bash
echo ""
echo "📝 Configuring MCP Server in Claude Code"
echo "========================================="
echo ""

# Configure MCP servers in global Claude config
CLAUDE_CONFIG="$HOME/.claude.json"

echo "Creating global MCP configuration..."

# Check if ~/.claude.json exists
if [ -f "$CLAUDE_CONFIG" ]; then
    echo "Found existing ~/.claude.json"
    # Read existing config or create new structure
    if ! grep -q "mcpServers" "$CLAUDE_CONFIG" 2>/dev/null; then
        # File exists but no mcpServers section
        echo "Adding mcpServers section to ~/.claude.json"
        python3 << 'PYTHON_EOF'
import json

config_path = "$CLAUDE_CONFIG"
try:
    with open(config_path, 'r') as f:
        config = json.load(f)
except json.JSONDecodeError:
    config = {}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['pai-knowledge'] = {
    'type': 'sse',
    'url': 'http://localhost:8000/sse'
}

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("✓ Added pai-knowledge MCP server to ~/.claude.json")
PYTHON_EOF
    else
        # Check if pai-knowledge already configured
        if ! grep -q "pai-knowledge" "$CLAUDE_CONFIG" 2>/dev/null; then
            echo "Adding pai-knowledge to existing mcpServers"
            python3 << 'PYTHON_EOF'
import json

config_path = "$CLAUDE_CONFIG"
with open(config_path, 'r') as f:
    config = json.load(f)

config['mcpServers']['pai-knowledge'] = {
    'type': 'sse',
    'url': 'http://localhost:8000/sse'
}

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("✓ Added pai-knowledge MCP server to ~/.claude.json")
PYTHON_EOF
        else
            echo "✓ pai-knowledge MCP server already configured"
        fi
    fi
else
    echo "Creating new ~/.claude.json"
    cat > "$CLAUDE_CONFIG" << 'EOF'
{
  "mcpServers": {
    "pai-knowledge": {
      "type": "sse",
      "url": "http://localhost:8000/sse"
    }
  }
}
EOF
    echo "✓ Created ~/.claude.json with MCP configuration"
fi

echo ""
echo "Configuration:"
echo "  File: ~/.claude.json"
echo "  Server: pai-knowledge"
echo "  Transport: SSE (Server-Sent Events)"
echo "  URL: http://localhost:8000/sse"
echo ""

# Also create .mcp.json in project for reference
echo "Creating project-level .mcp.json for reference..."
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "pai-knowledge": {
      "type": "sse",
      "url": "http://localhost:8000/sse"
    }
  }
}
EOF
echo "✓ Created .mcp.json (project reference)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "IMPORTANT: Restart Claude Code to load MCP configuration!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

**What this does:**
- Configures `pai-knowledge` MCP server in global `~/.claude.json`
- Creates project-level `.mcp.json` for reference
- Enables MCP tools globally across all Claude Code sessions
- Uses SSE (Server-Sent Events) transport for real-time communication

**Available MCP Tools:**
After restart, Claude Code will have access to:
- `add_episode` - Add knowledge to graph
- `search_nodes` - Search entities and summaries
- `search_facts` - Find relationships
- `get_episodes` - Retrieve recent knowledge
- `get_status` - Check system health
- `clear_graph` - Delete all knowledge
- `delete_episode` - Remove specific episodes
- `delete_entity_edge` - Remove relationships
- `get_entity_edge` - Get edge details

---

## Step 6: Verify Installation

> **FOR AI AGENTS:** This step runs basic verification. ALL checks must pass (show ✓).
> - If ANY check fails (shows ✗), STOP and troubleshoot before proceeding
> - After this step succeeds, you MUST also complete the full VERIFY.md checklist
> - Do NOT consider installation complete until VERIFY.md passes

Run comprehensive verification checks:

```bash
echo ""
echo "✅ Installation Verification"
echo "============================"
echo ""

# Check 1: Container running
if bun run src/skills/tools/status.ts 2>/dev/null | grep -q "running"; then
    echo "✓ PAI Knowledge container is running"
else
    echo "✗ Container may not be running"
    echo "  Start with: bun run src/skills/tools/start.ts"
fi

# Check 2: Server responding (SSE endpoint)
if curl -s --max-time 5 http://localhost:8000/sse -H "Accept: text/event-stream" | grep -q "endpoint"; then
    echo "✓ MCP server is responding at http://localhost:8000/sse"
else
    echo "✗ MCP server SSE endpoint check failed"
    echo "  Check logs: bun run src/skills/tools/logs.ts"
fi

# Check 3: FalkorDB accessible
if podman exec pai-knowledge-graph-mcp redis-cli -p 6379 PING > /dev/null 2>&1; then
    echo "✓ FalkorDB is accessible on port 6379"
elif docker exec pai-knowledge-graph-mcp redis-cli -p 6379 PING > /dev/null 2>&1; then
    echo "✓ FalkorDB is accessible on port 6379"
else
    echo "✗ FalkorDB may not be accessible"
fi

# Check 4: Skill installed
if [[ -d "$PAI_SKILLS_DIR/Knowledge" ]]; then
    echo "✓ Knowledge skill is installed at: $PAI_SKILLS_DIR/Knowledge"
else
    echo "✗ Knowledge skill installation failed"
fi

# Check 5: Configuration exists
if [[ -f "config/.env" ]] && grep -q "PAI_KNOWLEDGE_OPENAI_API_KEY=sk-" config/.env 2>/dev/null; then
    echo "✓ Configuration file exists with API key"
else
    echo "⚠️  API key may not be configured properly"
    echo "  Edit config/.env and add your PAI_KNOWLEDGE_OPENAI_API_KEY"
fi

# Check 6: Required skill files
SKILL_FILES=(
    "$PAI_SKILLS_DIR/Knowledge/SKILL.md"
    "$PAI_SKILLS_DIR/Knowledge/README.md"
    "$PAI_SKILLS_DIR/Knowledge/src/skills/workflows/CaptureEpisode.md"
)

ALL_SKILL_FILES=true
for file in "${SKILL_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "✗ Missing skill file: $file"
        ALL_SKILL_FILES=false
    fi
done

if [[ "$ALL_SKILL_FILES" = true ]]; then
    echo "✓ All required skill files are present"
fi

echo ""
echo "Installation verification complete!"
```

---

## Step 7: Test Installation

Verify the system works end-to-end:

```bash
echo ""
echo "🧪 Testing Installation"
echo "======================="
echo ""

# Test 1: Check SSE endpoint is available
echo "Test 1: Checking SSE endpoint..."
if curl -s --max-time 5 http://localhost:8000/sse -H "Accept: text/event-stream" | grep -q "endpoint"; then
    echo "✓ SSE endpoint is available"
else
    echo "✗ SSE endpoint not responding"
fi

# Test 2: Check containers are running
echo ""
echo "Test 2: Checking containers..."
if podman ps 2>/dev/null | grep -q "pai-knowledge" || docker ps 2>/dev/null | grep -q "pai-knowledge"; then
    echo "✓ Knowledge system containers are running"
    podman ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | grep pai-knowledge || \
    docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | grep pai-knowledge
else
    echo "✗ Containers not found"
fi

# Test 3: Check FalkorDB is responding
echo ""
echo "Test 3: Checking FalkorDB..."
if podman exec pai-knowledge-falkordb redis-cli PING 2>/dev/null | grep -q "PONG" || \
   docker exec pai-knowledge-falkordb redis-cli PING 2>/dev/null | grep -q "PONG"; then
    echo "✓ FalkorDB is responding"
else
    echo "⚠️  FalkorDB ping failed (may still be starting)"
fi

# Test 4: Verify Lucene sanitization for hyphenated group_ids
echo ""
echo "Test 4: Testing Lucene query sanitization..."
echo "This test verifies that hyphens in group_ids are properly escaped"
echo "to prevent Lucene syntax errors."

# Create a test script that calls the MCP server with a hyphenated group_id
cat > /tmp/test_lucene_sanitization.ts << 'EOF'
import { sanitizeGroupId } from './src/hooks/lib/lucene';

// Test cases with various hyphenated patterns
const testCases = [
  'test-group',
  'my-knowledge-base',
  'pai-history-system',
  'multi-hyphen-group-id',
  'group-with-dashes-123',
];

console.log('Testing Lucene query sanitization for hyphenated group_ids:\n');

let allPassed = true;
testCases.forEach(group => {
  try {
    const sanitized = sanitizeGroupId(group);
    console.log(`✓ ${group} → "${sanitized}"`);
  } catch (error) {
    console.log(`✗ ${group} → ERROR: ${error}`);
    allPassed = false;
  }
});

console.log('\n' + (allPassed ? '✓ All sanitization tests passed!' : '✗ Some tests failed'));
process.exit(allPassed ? 0 : 1);
EOF

# Run the test
if bun run /tmp/test_lucene_sanitization.ts 2>&1; then
    echo "✓ Lucene sanitization is working correctly"
    echo "  Hyphenated group_ids will be properly escaped in queries"
else
    echo "⚠️  Lucene sanitization test failed"
    echo "  Check that src/hooks/lib/lucene.ts exists and exports sanitizeGroupId"
fi

# Clean up test file
rm -f /tmp/test_lucene_sanitization.ts

echo ""
echo "Testing complete!"
echo ""
echo "Note: Full MCP functionality is tested via Claude Code after restart."
echo "The MCP server uses SSE transport - tools are accessed through Claude Code's MCP integration."
```

---

## Step 8: Post-Installation Configuration

Restart Claude Code to load the new skill:

```bash
echo ""
echo "📝 Next Steps"
echo "============"
echo ""
echo "1. **Restart Claude Code** to load the PAI Knowledge System skill"
echo ""
echo "2. **Test the skill** in Claude Code:"
echo "   Remember that I'm testing the PAI Knowledge System installation."
echo ""
echo "3. **Check system status** in Claude Code:"
echo "   Show the knowledge graph status"
echo ""
echo "4. **Search your knowledge** (after adding some):"
echo "   What do I know about PAI?"
echo ""

# Optional: Add to shell profile for convenience
echo "Would you like to add environment variables to your shell profile? (y/N)"
read -r ADD_TO_PROFILE

if [[ "$ADD_TO_PROFILE" =~ ^[Yy]$ ]]; then
    PROFILE="$HOME/.zshrc"
    if [[ ! -f "$PROFILE" ]]; then
        PROFILE="$HOME/.bashrc"
    fi

    echo ""
    echo "Adding to profile: $PROFILE"
    echo "" >> "$PROFILE"
    echo "# PAI Knowledge System" >> "$PROFILE"
    echo "export PAI_DIR=\"\${PAI_DIR:-\$HOME/.claude}\"" >> "$PROFILE"
    echo "alias pai-status='curl -s http://localhost:8000/health'" >> "$PROFILE"
    echo "alias pai-logs='bun run src/skills/tools/logs.ts'" >> "$PROFILE"
    echo "alias pai-start='bun run src/skills/tools/start.ts'" >> "$PROFILE"
    echo "alias pai-stop='bun run src/skills/tools/stop.ts'" >> "$PROFILE"
    echo "alias pai-restart='bun run src/skills/tools/stop.ts && bun run src/skills/tools/start.ts'" >> "$PROFILE"
    echo ""
    echo "✓ Added aliases to $PROFILE"
    echo "  Source with: source $PROFILE"
fi

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "Documentation:"
echo "  - README: pai-knowledge-system/README.md"
echo "  - Installation: INSTALL.md"
echo "  - Quick Start: QUICKSTART.md"
echo ""
echo "Skill installed as: Knowledge"
echo "  - Location: $PAI_SKILLS_DIR/Knowledge"
echo ""
echo "Management Commands:"
echo "  - View logs: bun run src/skills/tools/logs.ts"
echo "  - Restart: bun run src/skills/tools/stop.ts && bun run src/skills/tools/start.ts"
echo "  - Stop: bun run src/skills/tools/stop.ts"
echo "  - Start: bun run src/skills/tools/start.ts"
echo "  - Status: bun run src/skills/tools/status.ts"
```

---

## Step 9: Install History Sync Hook (Optional but Recommended)

The history sync hook automatically syncs captured learnings, research, and decisions from the PAI History System to the knowledge graph. This provides a seamless integration where your daily captures become searchable knowledge.

**Prerequisites:**
- PAI History System (`pai-history-system`) must be installed and configured
- History directory at `~/.config/pai/history/` should exist with content

```bash
echo ""
echo "🔗 Installing History Sync Hook"
echo "================================"
echo ""

# Verify history system is installed
HISTORY_DIR="${PAI_DIR:-$HOME/.claude}/history"
if [ ! -d "$HISTORY_DIR" ]; then
    echo "⚠️  History directory not found at: $HISTORY_DIR"
    echo "   Install pai-history-system first, or skip this step."
    echo "   The hook can be installed later with: bun run src/server/install.ts"
    exit 0
fi

echo "✓ History directory found: $HISTORY_DIR"

# Hooks install to ~/.claude/hooks/ (where Claude Code reads them)
PAI_HOOKS_DIR="$HOME/.claude/hooks"
mkdir -p "$PAI_HOOKS_DIR/lib"

echo "Installing hook files to: $PAI_HOOKS_DIR"

# Copy hook implementation files
cp src/hooks/sync-history-to-knowledge.ts "$PAI_HOOKS_DIR/"
cp -r src/hooks/lib/* "$PAI_HOOKS_DIR/lib/"

echo "✓ Hook files installed"

# Create sync state directory
SYNC_STATE_DIR="$HISTORY_DIR/.synced"
mkdir -p "$SYNC_STATE_DIR"
echo "✓ Created sync state directory: $SYNC_STATE_DIR"

# Register hook in Claude Code settings.json (NOT PAI_DIR settings)
SETTINGS_FILE="$HOME/.claude/settings.json"
echo ""
echo "Registering hook in: $SETTINGS_FILE"

# Use bun/node to merge hook configuration
bun << 'SCRIPT_EOF'
const fs = require('fs');
const path = require('path');

// Claude Code reads settings from ~/.claude/settings.json
const settingsPath = path.join(process.env.HOME, '.claude/settings.json');

let settings = {};
try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch (e) {
    // File doesn't exist or invalid JSON
}

// Ensure hooks structure exists
if (!settings.hooks) settings.hooks = {};
if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

// Check if hook already registered
const hookExists = settings.hooks.SessionStart.some(h =>
    h.hooks?.some(hook => hook.command?.includes('sync-history-to-knowledge'))
);

if (!hookExists) {
    settings.hooks.SessionStart.push({
        matcher: "*",
        hooks: [{
            type: "command",
            command: `bun run ${process.env.HOME}/.claude/hooks/sync-history-to-knowledge.ts`,
            timeout: 30000
        }]
    });

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log("✓ Hook registered in settings.json");
} else {
    console.log("✓ Hook already registered (skipping)");
}
SCRIPT_EOF

echo ""
echo "Hook installation complete!"
echo ""
echo "What the hook does:"
echo "  - Runs automatically when a Claude Code session starts"
echo "  - Scans history directories: learnings/, research/, decisions/"
echo "  - Syncs new captures to the knowledge graph"
echo "  - Tracks synced files to avoid duplicates"
echo ""
echo "Manual sync commands:"
echo "  - Sync all:    bun run src/hooks/sync-history-to-knowledge.ts --all"
echo "  - Dry run:     bun run src/hooks/sync-history-to-knowledge.ts --dry-run"
echo "  - Verbose:     bun run src/hooks/sync-history-to-knowledge.ts --verbose"
```

**Verifying the Hook:**

```bash
# Check hook files are installed
PAI_HOOKS="${PAI_DIR:-$HOME/.claude}/hooks"

if [ -f "$PAI_HOOKS/sync-history-to-knowledge.ts" ]; then
    echo "✓ Hook script installed"
else
    echo "✗ Hook script not found"
fi

# Check required lib files
echo "Checking hook lib files..."
REQUIRED_LIB_FILES=(
    "frontmatter-parser.ts"
    "knowledge-client.ts"
    "lucene.ts"
    "sync-state.ts"
)

for file in "${REQUIRED_LIB_FILES[@]}"; do
    if [ -f "$PAI_HOOKS/lib/$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ MISSING: $file"
    fi
done

# Check hook is registered
if grep -q "sync-history-to-knowledge" "${PAI_DIR:-$HOME/.claude}/settings.json" 2>/dev/null; then
    echo "✓ Hook registered in settings.json"
else
    echo "✗ Hook not registered"
fi

# Test hook manually (dry run)
echo ""
echo "Running hook in dry-run mode..."
bun run src/hooks/sync-history-to-knowledge.ts --dry-run --verbose
```

**Sync State:**

The hook tracks which files have been synced in `~/.claude/history/.synced/sync-state.json`:

```json
{
  "version": "1.0.0",
  "last_sync": "2026-01-04T12:00:00.000Z",
  "synced_files": [
    {
      "filepath": "/path/to/learning.md",
      "synced_at": "2026-01-04T12:00:00.000Z",
      "episode_uuid": "abc-123",
      "capture_type": "LEARNING",
      "content_hash": "sha256-abc123def456..."
    }
  ]
}
```

**SyncedFile Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `filepath` | string | Absolute path to the synced file |
| `synced_at` | string | ISO timestamp when file was synced |
| `episode_uuid` | string? | UUID returned by knowledge graph (if successful) |
| `capture_type` | string | Type of capture: LEARNING, SESSION, RESEARCH, DECISION |
| `content_hash` | string? | SHA-256 hash of episode_body for content-level deduplication |

**Troubleshooting Hook Issues:**

| Issue | Solution |
|-------|----------|
| Hook not running | Check `settings.json` has the hook registered |
| Files not syncing | Run with `--verbose` to see what's being skipped |
| Duplicate syncs | Check sync-state.json or delete it to resync all |
| MCP server offline | Hook gracefully skips when server unavailable |
| Permission errors | Ensure hook script is readable: `chmod 644 sync-history-to-knowledge.ts` |

---

## Troubleshooting

### Server Won't Start

**Symptoms:** `bun run src/server/run.ts` fails or container exits immediately

**Diagnosis:**
```bash
# Check container logs
bun run src/skills/tools/logs.ts

# Check if ports are available
lsof -i :8000
lsof -i :6379
```

**Solutions:**
1. **Port conflict:** Stop conflicting service or modify ports in `src/server/run.sh`
2. **API key invalid:** Verify API key in `src/config/.env` has credits/quota
3. **Image pull failed:** Check internet connection and try again
4. **Resource limits:** Ensure system has at least 2GB RAM available

### Skill Not Loading

**Symptoms:** Claude Code doesn't recognize skill commands

**Diagnosis:**
```bash
# Check skill files exist
ls -la ~/.claude/skills/Knowledge/

# Check SKILL.md syntax
cat ~/.claude/skills/Knowledge/SKILL.md | head -20
```

**Solutions:**
1. **Restart Claude Code** - Skills are loaded on startup
2. **Check SKILL.md format** - Ensure frontmatter is valid YAML
3. **Verify file paths** - All workflows and tools should be in `src/skills/`
4. **Check PAI directory** - Verify PAI_DIR or ~/.claude is correct

### Knowledge Not Being Captured

**Symptoms:** "Remember this" doesn't store knowledge

**Diagnosis:**
```bash
# Check server is running
curl http://localhost:8000/health

# Check server logs
bun run src/skills/tools/logs.ts | tail -50
```

**Solutions:**
1. **Server not running:** Start with `bun run src/skills/tools/start.ts`
2. **API quota exceeded:** Check OpenAI usage dashboard
3. **Content too brief:** Add more context and detail
4. **Network issue:** Verify MCP server endpoint is reachable

### Poor Search Results

**Symptoms:** Knowledge search returns irrelevant or no results

**Solutions:**
1. **Use specific terms:** Include domain-specific terminology
2. **Add more knowledge:** Graph needs data to search effectively
3. **Try different queries:** Use synonyms or related concepts
4. **Check model:** gpt-4o extracts better entities than gpt-3.5-turbo

### API Rate Limits

**Symptoms:** Errors about rate limits or 429 responses

**Diagnosis:**
```bash
# Check current SEMAPHORE_LIMIT
grep SEMAPHORE_LIMIT src/config/.env
```

**Solutions:**
1. **Reduce concurrency:** Lower `SEMAPHORE_LIMIT` in `src/config/.env`
2. **Upgrade API tier:** Higher tiers allow more concurrent requests
3. **Add delay:** Workflows automatically retry with exponential backoff
4. **Switch model:** gpt-4o-mini has higher rate limits than gpt-4o

### Lucene Query Errors with Hyphenated Groups

**Symptoms:** Search fails with "Lucene query syntax error" when using hyphenated group_ids like "test-group"

**Diagnosis:**
```bash
# Check if lucene.ts exists and exports sanitizeGroupId
cat src/hooks/lib/lucene.ts | grep -A 5 "sanitizeGroupId"
```

**Solutions:**
1. **Verify sanitization function exists:** The `sanitizeGroupId()` function should escape hyphens
2. **Update client code:** Ensure all search calls use `sanitizeGroupId()` on group_id parameters
3. **Check imports:** Verify both `knowledge-client.ts` and `mcp-client.ts` import and use the sanitization function
4. **Test manually:** Run the sanitization test in Step 7 above

---

## Uninstallation

To completely remove the Knowledge skill:

```bash
# 1. Stop and remove container
bun run src/skills/tools/stop.ts
podman rm pai-knowledge-graph-mcp
# or for Docker users:
# docker rm pai-knowledge-graph-mcp

# 2. Remove Knowledge skill
rm -rf ~/.claude/skills/Knowledge

# 3. Remove configuration (optional - keeps your API key)
# rm src/config/.env

# 4. Remove backup files (optional)
# rm src/config/.env.backup
```

**Note:** This does not delete your knowledge graph data. To completely wipe data:
```bash
# Clear the graph via API before stopping container
curl -X POST http://localhost:8000/mcp/ \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"clear_graph","arguments":{}}}'
```

---

## Getting Help

If you encounter issues not covered here:

1. **Check logs:** `bun run src/skills/tools/logs.ts`
2. **Check status:** `bun run src/skills/tools/status.ts`
3. **Review documentation:**
   - `README.md` - Complete pack documentation
   - `QUICKSTART.md` - Quick start guide
   - `VERIFY.md` - Verification checklist

---

**Related Documentation:**
- [VERIFY.md](VERIFY.md) - Installation verification checklist
- [README.md](pai-knowledge-system/README.md) - Complete pack documentation
- [INTEGRATION.md](INTEGRATION.md) - Integration guide with other PAI components
