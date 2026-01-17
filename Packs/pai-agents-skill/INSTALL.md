# PAI Agents Skill v2.3.0 - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/Write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing PAI Agents Skill v2.3.0 - Dynamic agent composition and management system.

This pack includes:
- 10+ named agent templates (Engineer, Architect, Designer, etc.)
- Dynamic agent composition from 28 traits
- Voice mapping for personality-based audio
- Parallel agent orchestration patterns

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check for PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "OK pai-core-install is installed"
else
  echo "ERROR pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing Agents skill
if [ -d "$PAI_CHECK/skills/Agents" ]; then
  echo "WARNING Existing Agents skill found at: $PAI_CHECK/skills/Agents"
  ls -la "$PAI_CHECK/skills/Agents/"
else
  echo "OK No existing Agents skill (clean install)"
fi

# Check for existing agents directory
if [ -d "$PAI_CHECK/agents" ]; then
  echo "WARNING Existing agents directory found at: $PAI_CHECK/agents"
  ls "$PAI_CHECK/agents/"
else
  echo "OK No existing agents directory (clean install)"
fi

# Check for bun (required for tools)
if command -v bun &> /dev/null; then
  echo "OK bun is installed: $(bun --version)"
else
  echo "WARNING bun not installed (required for agent tools)"
fi

# Check for voice server (optional)
if [ -d "$PAI_CHECK/VoiceServer" ]; then
  echo "OK VoiceServer directory exists"
else
  echo "INFO VoiceServer not found (optional for voice output)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Agents skill: [Yes at path / No]
- Existing agents templates: [Yes at path / No]
- bun: [installed vX.X / NOT INSTALLED - REQUIRED]
- VoiceServer: [found / not found (optional)]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

**STOP if bun is not installed.** Tell the user:
```
"bun is required for the agent tools. Install with: curl -fsSL https://bun.sh/install | bash"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing Agents skill found)

**Only ask if existing Agents skill detected:**

```json
{
  "header": "Conflict - Agents Skill",
  "question": "Existing Agents skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Conflict Resolution (if existing agents templates found)

**Only ask if existing agents directory detected:**

```json
{
  "header": "Conflict - Agent Templates",
  "question": "Existing agent templates found at ~/.claude/agents/. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new templates"},
    {"label": "Merge (Keep Existing, Add Missing)", "description": "Only add templates that don't exist"},
    {"label": "Skip Agent Templates", "description": "Install skill only, keep existing templates"},
    {"label": "Abort Installation", "description": "Cancel installation entirely"}
  ]
}
```

### Question 3: Voice Server Integration

```json
{
  "header": "Voice Integration",
  "question": "Configure voice server integration for agent personalities?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, configure voice integration (Recommended)", "description": "Agents will use ElevenLabs voices based on personality"},
    {"label": "Skip voice setup", "description": "Agents work without voice output"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Agents Skill v2.3.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation using choices above"},
    {"label": "Show me what will change", "description": "Lists all files that will be created/modified"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and Replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/agents-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup Agents skill
[ -d "$PAI_DIR/skills/Agents" ] && cp -r "$PAI_DIR/skills/Agents" "$BACKUP_DIR/skills-Agents"

# Backup agents templates
[ -d "$PAI_DIR/agents" ] && cp -r "$PAI_DIR/agents" "$BACKUP_DIR/agents"

echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create Agents skill directory structure", "status": "pending", "activeForm": "Creating skill directory structure"},
    {"content": "Copy Agents skill files", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Create agents templates directory", "status": "pending", "activeForm": "Creating agents directory"},
    {"content": "Copy agent template files", "status": "pending", "activeForm": "Copying agent templates"},
    {"content": "Install tool dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Agents Skill Directory Structure

**Mark todo "Create Agents skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Agents"/{Data,Templates,Tools,Workflows}
```

**Mark todo as completed.**

### 4.2 Copy Agents Skill Files

**Mark todo "Copy Agents skill files" as in_progress.**

Copy all files from the pack's `src/skills/Agents/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Main skill files
cp "$PACK_DIR/src/skills/Agents/SKILL.md" "$PAI_DIR/skills/Agents/"
cp "$PACK_DIR/src/skills/Agents/AgentPersonalities.md" "$PAI_DIR/skills/Agents/"
cp "$PACK_DIR/src/skills/Agents/AgentProfileSystem.md" "$PAI_DIR/skills/Agents/"

# Context files (9 total)
cp "$PACK_DIR/src/skills/Agents/"*Context.md "$PAI_DIR/skills/Agents/"

# Data
cp "$PACK_DIR/src/skills/Agents/Data/Traits.yaml" "$PAI_DIR/skills/Agents/Data/"

# Templates
cp "$PACK_DIR/src/skills/Agents/Templates/DynamicAgent.hbs" "$PAI_DIR/skills/Agents/Templates/"

# Tools
cp "$PACK_DIR/src/skills/Agents/Tools/"*.ts "$PAI_DIR/skills/Agents/Tools/"
cp "$PACK_DIR/src/skills/Agents/Tools/package.json" "$PAI_DIR/skills/Agents/Tools/"

# Workflows
cp "$PACK_DIR/src/skills/Agents/Workflows/"*.md "$PAI_DIR/skills/Agents/Workflows/"
```

**Files copied:**
- `SKILL.md` - Main skill routing and documentation
- `AgentPersonalities.md` - Named agent definitions with voices
- `AgentProfileSystem.md` - Context loading system docs
- `*Context.md` - Agent-specific context files (9 files: Architect, Artist, ClaudeResearcher, CodexResearcher, Designer, Engineer, GeminiResearcher, GrokResearcher, QATester)
- `Data/Traits.yaml` - 28 composable traits + 45 voice mappings
- `Templates/DynamicAgent.hbs` - Dynamic agent prompt template
- `Tools/*.ts` - AgentFactory, LoadAgentContext, SpawnAgentWithProfile
- `Tools/package.json` - Dependencies (yaml, handlebars)
- `Workflows/*.md` - CreateCustomAgent, ListTraits, SpawnParallelAgents

**Mark todo as completed.**

### 4.3 Create Agents Templates Directory

**Mark todo "Create agents templates directory" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/agents"
```

**Mark todo as completed.**

### 4.4 Copy Agent Template Files

**Mark todo "Copy agent template files" as in_progress.**

**Handle based on user's conflict choice:**

**For "Replace" or clean install:**
```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cp "$PACK_DIR/src/agents/"*.md "$PAI_DIR/agents/"
```

**For "Merge" (only add missing):**
```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
for file in "$PACK_DIR/src/agents/"*.md; do
  basename=$(basename "$file")
  if [ ! -f "$PAI_DIR/agents/$basename" ]; then
    cp "$file" "$PAI_DIR/agents/"
    echo "Added: $basename"
  else
    echo "Skipped (exists): $basename"
  fi
done
```

**Agent templates included:**
- `Engineer.md` - Elite principal engineer with TDD focus
- `Architect.md` - System design specialist
- `Designer.md` - UX/UI specialist
- `QATester.md` - Quality validation agent
- `Pentester.md` - Security specialist
- `Artist.md` - Visual content creator
- `Intern.md` - Fast parallel grunt work
- `ClaudeResearcher.md` - Claude-powered research
- `GeminiResearcher.md` - Gemini-powered research
- `GrokResearcher.md` - Grok-powered research
- `CodexResearcher.md` - Codex-powered research

**Mark todo as completed.**

### 4.5 Install Tool Dependencies

**Mark todo "Install tool dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/Agents/Tools"
bun install
```

**If package.json doesn't exist, create it:**
```bash
cat > "$PAI_DIR/skills/Agents/Tools/package.json" << 'EOF'
{
  "name": "agent-tools",
  "type": "module",
  "dependencies": {
    "yaml": "^2.3.4",
    "handlebars": "^4.7.8"
  }
}
EOF
bun install
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Agents Skill Verification ==="

# Check skill directory
echo "Checking skill directory..."
ls -la "$PAI_DIR/skills/Agents/" || echo "ERROR Skill directory missing"

# Check data files
echo "Checking data files..."
[ -f "$PAI_DIR/skills/Agents/Data/Traits.yaml" ] && echo "OK Traits.yaml" || echo "ERROR Traits.yaml missing"

# Check templates
echo "Checking templates..."
[ -f "$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs" ] && echo "OK DynamicAgent.hbs" || echo "ERROR DynamicAgent.hbs missing"

# Check tools
echo "Checking tools..."
ls "$PAI_DIR/skills/Agents/Tools/"*.ts 2>/dev/null && echo "OK Tools found" || echo "ERROR Tools missing"

# Check workflows
echo "Checking workflows..."
ls "$PAI_DIR/skills/Agents/Workflows/"*.md 2>/dev/null && echo "OK Workflows found" || echo "ERROR Workflows missing"

# Check agent templates
echo "Checking agent templates..."
ls "$PAI_DIR/agents/"*.md 2>/dev/null && echo "OK Agent templates found" || echo "ERROR Agent templates missing"

# Test AgentFactory
echo "Testing AgentFactory..."
cd "$PAI_DIR/skills/Agents/Tools" && bun run AgentFactory.ts --list 2>/dev/null | head -20

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Agents Skill v2.3.0 installed successfully!

What's available:
- 'create custom agents' - Compose specialized agents from traits
- 'list agent traits' - See all available trait combinations
- 'spawn parallel agents' - Launch multiple workers simultaneously

Named Agents Ready:
- Engineer, Architect, Designer, QATester, Pentester, Artist, Intern
- Plus 4 research variants

Try it: Ask me to 'create 3 custom security agents to analyze this architecture'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Ensure bun is installed: curl -fsSL https://bun.sh/install | bash
3. Check directory permissions on ~/.claude/skills/
4. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "bun not found"

Install bun:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### AgentFactory fails to run

Check dependencies:
```bash
cd ~/.claude/skills/Agents/Tools
bun install
```

### Voice output not working

Ensure VoiceServer is configured:
1. Check `~/.claude/VoiceServer/` exists
2. Verify ElevenLabs API key is set
3. Test with: `curl http://localhost:8888/health`

### Traits.yaml parsing errors

Verify YAML is valid:
```bash
python3 -c "import yaml; yaml.safe_load(open('$HOME/.claude/skills/Agents/Data/Traits.yaml'))"
```

---

## What's Included

### Skill Files
| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `AgentPersonalities.md` | Named agent definitions with voices |
| `AgentProfileSystem.md` | Context loading system documentation |
| `*Context.md` | Agent-specific context files |
| `Data/Traits.yaml` | 28 composable traits + voice mappings |
| `Templates/DynamicAgent.hbs` | Dynamic agent prompt template |
| `Tools/AgentFactory.ts` | Dynamic agent composition engine |
| `Tools/LoadAgentContext.ts` | Context loader utility |
| `Workflows/*.md` | CreateCustomAgent, ListTraits, SpawnParallel |

### Agent Templates
| Template | Role |
|----------|------|
| `Engineer.md` | Elite principal engineer |
| `Architect.md` | System design specialist |
| `Designer.md` | UX/UI specialist |
| `QATester.md` | Quality validation |
| `Pentester.md` | Security specialist |
| `Artist.md` | Visual content creator |
| `Intern.md` | Parallel grunt work |
| `*Researcher.md` | LLM-powered research variants |

---

## Usage

### From Claude Code

```
"Create 5 custom science agents to analyze this data"
"What agent personalities can you create?"
"Launch agents to research these companies"
"Use the Engineer agent to implement this feature"
```

### Testing Installation

```
"List available agent traits"
# Should show expertise, personality, and approach categories
```

### CLI Usage

```bash
# List all traits
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts --list

# Compose agent for task
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts --task "Review security architecture"

# Compose agent with explicit traits
bun run ~/.claude/skills/Agents/Tools/AgentFactory.ts --traits "security,skeptical,thorough"
```
