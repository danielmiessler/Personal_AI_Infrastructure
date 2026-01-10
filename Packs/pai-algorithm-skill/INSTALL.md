# THE ALGORITHM Skill v0.5.0 - Installation Guide

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
"I'm installing THE ALGORITHM Skill v0.5.0 - Universal execution engine using scientific method to achieve ideal state.

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
  echo "✓ pai-core-install is installed"
else
  echo "❌ pai-core-install NOT installed - REQUIRED!"
fi

# Check if pai-agents-skill is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/Agents/SKILL.md" ]; then
  echo "✓ pai-agents-skill is installed"
else
  echo "❌ pai-agents-skill NOT installed - REQUIRED!"
fi

# Check for existing THEALGORITHM skill
if [ -d "$PAI_CHECK/skills/THEALGORITHM" ]; then
  echo "⚠️  Existing THEALGORITHM skill found at: $PAI_CHECK/skills/THEALGORITHM"
  ls -la "$PAI_CHECK/skills/THEALGORITHM/"
else
  echo "✓ No existing THEALGORITHM skill (clean install)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed: $(bun --version)"
else
  echo "❌ Bun not installed - REQUIRED!"
fi

# Check for pai-voice-system (optional)
if [ -d "$PAI_CHECK/VoiceServer" ]; then
  echo "✓ pai-voice-system is installed (voice features available)"
else
  echo "⚠️  pai-voice-system not installed (voice transitions unavailable)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- pai-agents-skill: [installed / NOT INSTALLED - REQUIRED]
- Existing THEALGORITHM skill: [Yes at path / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- pai-voice-system: [installed / not installed (optional)]"
```

**STOP if pai-core-install, pai-agents-skill, or Bun is not installed.** Tell the user:
```
"pai-core-install, pai-agents-skill, and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing THEALGORITHM skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing THEALGORITHM skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Voice Transitions

**Only ask if pai-voice-system is installed:**

```json
{
  "header": "Voice",
  "question": "Enable voice announcements during phase transitions?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, enable voice (Recommended)", "description": "AlgorithmDisplay will speak phase changes"},
    {"label": "Silent mode", "description": "Visual display only, no voice"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install THE ALGORITHM Skill v0.5.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/thealgorithm-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/THEALGORITHM" ] && cp -r "$PAI_DIR/skills/THEALGORITHM" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create skill directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files from pack", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Create MEMORY directories", "status": "pending", "activeForm": "Creating MEMORY directories"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/THEALGORITHM/Tools"
mkdir -p "$PAI_DIR/skills/THEALGORITHM/Data"
mkdir -p "$PAI_DIR/skills/THEALGORITHM/Phases"
mkdir -p "$PAI_DIR/skills/THEALGORITHM/Reference"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/THEALGORITHM/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy main skill file
cp "$PACK_DIR/src/skills/THEALGORITHM/SKILL.md" "$PAI_DIR/skills/THEALGORITHM/"

# Copy data files
cp "$PACK_DIR/src/skills/THEALGORITHM/Data/Capabilities.yaml" "$PAI_DIR/skills/THEALGORITHM/Data/"

# Copy tools
cp "$PACK_DIR/src/skills/THEALGORITHM/Tools/"*.ts "$PAI_DIR/skills/THEALGORITHM/Tools/"

# Copy phase documentation
cp "$PACK_DIR/src/skills/THEALGORITHM/Phases/"*.md "$PAI_DIR/skills/THEALGORITHM/Phases/"

# Copy reference documentation
cp "$PACK_DIR/src/skills/THEALGORITHM/Reference/"*.md "$PAI_DIR/skills/THEALGORITHM/Reference/"
```

**Files copied:**
- `SKILL.md` - Main skill routing and quick reference
- `Data/Capabilities.yaml` - 30+ orchestratable capabilities registry
- `Tools/AlgorithmDisplay.ts` - LCARS-style visual display with voice
- `Tools/EffortClassifier.ts` - Request effort level classification
- `Tools/CapabilityLoader.ts` - Load capabilities by effort level
- `Tools/CapabilitySelector.ts` - Select capabilities for ISC rows
- `Tools/ISCManager.ts` - Create/update/query ISC tables
- `Tools/TraitModifiers.ts` - Effort-to-trait mappings
- `Tools/RalphLoopExecutor.ts` - Persistent iteration executor
- `Phases/*.md` - Detailed phase documentation (OBSERVE through LEARN)
- `Reference/*.md` - Capability and effort matrices

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/THEALGORITHM/Tools"
bun add yaml
```

**Mark todo as completed.**

### 4.4 Create MEMORY Directories

**Mark todo "Create MEMORY directories" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/MEMORY/Work"
mkdir -p "$PAI_DIR/MEMORY/State"
```

These directories store ISC state between sessions.

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== THE ALGORITHM Skill Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/THEALGORITHM/SKILL.md" ] && echo "✓ SKILL.md" || echo "❌ SKILL.md missing"
[ -f "$PAI_DIR/skills/THEALGORITHM/Data/Capabilities.yaml" ] && echo "✓ Capabilities.yaml" || echo "❌ Capabilities.yaml missing"
[ -f "$PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts" ] && echo "✓ EffortClassifier.ts" || echo "❌ EffortClassifier.ts missing"
[ -f "$PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts" ] && echo "✓ ISCManager.ts" || echo "❌ ISCManager.ts missing"
[ -f "$PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts" ] && echo "✓ AlgorithmDisplay.ts" || echo "❌ AlgorithmDisplay.ts missing"

# Check MEMORY directories
echo ""
echo "Checking MEMORY directories..."
[ -d "$PAI_DIR/MEMORY/Work" ] && echo "✓ MEMORY/Work" || echo "❌ MEMORY/Work missing"
[ -d "$PAI_DIR/MEMORY/State" ] && echo "✓ MEMORY/State" || echo "❌ MEMORY/State missing"

# Test EffortClassifier
echo ""
echo "Testing EffortClassifier..."
bun run "$PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts" --request "Add a new feature" --output json | head -10

# Test ISCManager
echo ""
echo "Testing ISCManager..."
bun run "$PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts" --help | head -5

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"THE ALGORITHM Skill v0.5.0 installed successfully!

What's available:
- 7 execution phases: OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
- ISC (Ideal State Criteria) tracking
- Effort-based capability selection (TRIVIAL → DETERMINED)
- Ralph Loop for persistent iteration
- LCARS-style visual display with voice support

Try it: Ask me to 'run the algorithm on: Add dark mode toggle'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Ensure pai-agents-skill is installed second
3. Verify Bun is installed: `bun --version`
4. Check directory permissions on $PAI_DIR/skills/
5. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "pai-agents-skill not found"

This pack requires pai-agents-skill for custom agent composition. Install it:
```
Give the AI the pai-agents-skill pack directory and ask it to install.
```

### "bun: command not found"

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal or source ~/.bashrc
```

### EffortClassifier not found

```bash
# Check PAI_DIR is set correctly
echo $PAI_DIR
# Should output your PAI directory (default: ~/.claude)
```

### Capability loading fails

```bash
# Validate YAML syntax
bun -e "const yaml = require('yaml'); yaml.parse(require('fs').readFileSync('$PAI_DIR/skills/THEALGORITHM/Data/Capabilities.yaml', 'utf8'))"
```

### Voice not working

```bash
# Check if voice server is running
curl -s http://localhost:8888/status || echo "Voice server not running"
# Install pai-voice-system if needed
```

### ISC not saving

```bash
# Check MEMORY directories exist
ls -la "$PAI_DIR/MEMORY/Work/"
ls -la "$PAI_DIR/MEMORY/State/"
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `Data/Capabilities.yaml` | 30+ orchestratable capabilities registry |
| `Tools/AlgorithmDisplay.ts` | LCARS-style visual display with voice |
| `Tools/EffortClassifier.ts` | Classify requests by effort level |
| `Tools/CapabilityLoader.ts` | Load capabilities by effort level |
| `Tools/CapabilitySelector.ts` | Select capabilities for ISC rows |
| `Tools/ISCManager.ts` | Create, update, query ISC tables |
| `Tools/TraitModifiers.ts` | Effort-to-trait mappings |
| `Tools/RalphLoopExecutor.ts` | Persistent iteration executor |
| `Phases/*.md` | Phase documentation (OBSERVE through LEARN) |
| `Reference/*.md` | Capability and effort matrices |

---

## Usage

### From Claude Code

```
"Run the algorithm on: Add dark mode toggle"
"Use THE ALGORITHM for this complex task"
"Start algorithm with effort level THOROUGH"
```

### CLI Examples

```bash
# Start with visual display
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts start STANDARD -r "Add dark mode toggle"

# Classify effort level
bun run $PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "Add dark mode toggle"

# Create ISC
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts create --request "Add dark mode toggle"

# Transition phases
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts phase THINK
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts phase EXECUTE

# Ralph loop for persistent iteration
bun run $PAI_DIR/skills/THEALGORITHM/Tools/RalphLoopExecutor.ts \
  --prompt "Fix the auth bug" \
  --completion-promise "All tests pass" \
  --max-iterations 15
```

---

## Integration with Other Skills

THE ALGORITHM integrates with:
- **Agents skill** - For custom agent composition via AgentFactory
- **BeCreative skill** - For UltraThink thinking mode
- **Council skill** - For multi-perspective debate (THOROUGH+)
- **RedTeam skill** - For adversarial analysis (DETERMINED)
- **FirstPrinciples skill** - For assumption challenging
- **Browser skill** - For web verification

These integrations work automatically if the skills are installed.
