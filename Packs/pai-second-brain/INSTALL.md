# PAI Second Brain v2.0.0 - Installation Guide

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
"I'm installing PAI Second Brain v2.0.0 - Cognitive amplification system with TypeScript tools for deterministic logic, delegation protocols, debate orchestration, and sparring partner mode.

This will transform how I operate - from assistant to strategic sparring partner.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# 1. Check if PAI_DIR is set
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# 2. Check for existing PAI directory
if [ -d "$PAI_CHECK" ]; then
  echo "PAI directory EXISTS at: $PAI_CHECK"
else
  echo "PAI directory does not exist (clean install)"
fi

# 3. Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "pai-core-install is installed"
else
  echo "pai-core-install NOT installed - REQUIRED!"
fi

# 4. Check for existing SecondBrain skill
if [ -d "$PAI_CHECK/skills/SecondBrain" ]; then
  echo "Existing SecondBrain skill found at: $PAI_CHECK/skills/SecondBrain"
  ls -la "$PAI_CHECK/skills/SecondBrain/"
else
  echo "No existing SecondBrain skill (clean install)"
fi

# 5. Check environment variables
echo ""
echo "Environment variables:"
echo "  PAI_DIR: ${PAI_DIR:-'NOT SET'}"
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing SecondBrain skill: [Yes at path / No]

[If pai-core-install missing]: pai-core-install is REQUIRED. Please install it first."
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required for Second Brain. Please install it first, then return to install this pack.

Give me the pai-core-install pack directory and I'll install it for you."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing SecondBrain skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing SecondBrain skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: PARA Folder (Optional)

**Ask if the user has a PARA-structured folder:**

```json
{
  "header": "PARA",
  "question": "Do you have a PARA-structured notes folder?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, I'll provide the path", "description": "I have a folder with _00_Inbox, _01_Projects, etc."},
    {"label": "No / Skip", "description": "Continue without PARA integration (can configure later)"}
  ]
}
```

**If yes:** Ask for the path. Example: `~/Documents/Notes` or `~/Documents/SecondBrain`

**Note:** PARA integration is optional. Core features (delegation, debate, complexity assessment) work without it.

### Question 3: Sparring Intensity

**Customize the challenge level:**

```json
{
  "header": "Challenge",
  "question": "How intensely should I challenge your thinking?",
  "multiSelect": false,
  "options": [
    {"label": "Full Sparring (Recommended)", "description": "Say 'you're wrong' directly, attack assumptions aggressively"},
    {"label": "Moderate Challenge", "description": "Push back thoughtfully but diplomatically"},
    {"label": "Gentle Guidance", "description": "Suggest alternatives without direct contradiction"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Second Brain v1.0.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/second-brain-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/SecondBrain" ] && cp -r "$PAI_DIR/skills/SecondBrain" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create skill directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy philosophy files", "status": "pending", "activeForm": "Copying philosophy files"},
    {"content": "Copy workflow files", "status": "pending", "activeForm": "Copying workflow files"},
    {"content": "Install TypeScript tools", "status": "pending", "activeForm": "Installing TypeScript tools"},
    {"content": "Copy config files", "status": "pending", "activeForm": "Copying config files"},
    {"content": "Configure vault location", "status": "pending", "activeForm": "Configuring vault"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/SecondBrain/Philosophy"
mkdir -p "$PAI_DIR/skills/SecondBrain/Workflows"
mkdir -p "$PAI_DIR/skills/SecondBrain/Tools"
mkdir -p "$PAI_DIR/skills/SecondBrain/types"
mkdir -p "$PAI_DIR/config"
```

**Mark todo as completed.**

### 4.2 Copy Philosophy Files

**Mark todo "Copy philosophy files" as in_progress.**

Copy all files from the pack's `src/skills/SecondBrain/Philosophy/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/SecondBrain/SKILL.md" "$PAI_DIR/skills/SecondBrain/"
cp "$PACK_DIR/src/skills/SecondBrain/Philosophy/DELEGATION.md" "$PAI_DIR/skills/SecondBrain/Philosophy/"
cp "$PACK_DIR/src/skills/SecondBrain/Philosophy/SPARRING.md" "$PAI_DIR/skills/SecondBrain/Philosophy/"
cp "$PACK_DIR/src/skills/SecondBrain/Philosophy/AUTHORIZATION.md" "$PAI_DIR/skills/SecondBrain/Philosophy/"
cp "$PACK_DIR/src/skills/SecondBrain/Philosophy/COGNITIVE-DIVERSITY.md" "$PAI_DIR/skills/SecondBrain/Philosophy/"
```

**Files copied:**
- `SKILL.md` - Main skill routing and quick reference
- `Philosophy/DELEGATION.md` - Never-execute-directly protocol
- `Philosophy/SPARRING.md` - Challenge and friction guidelines
- `Philosophy/AUTHORIZATION.md` - Full freedom authorization
- `Philosophy/COGNITIVE-DIVERSITY.md` - Multi-AI coordination patterns

**Mark todo as completed.**

### 4.3 Copy Workflow Files

**Mark todo "Copy workflow files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/SecondBrain/Workflows/Delegate.md" "$PAI_DIR/skills/SecondBrain/Workflows/"
cp "$PACK_DIR/src/skills/SecondBrain/Workflows/Debate.md" "$PAI_DIR/skills/SecondBrain/Workflows/"
cp "$PACK_DIR/src/skills/SecondBrain/Workflows/ArchiveSynthesis.md" "$PAI_DIR/skills/SecondBrain/Workflows/"
```

**Files copied:**
- `Workflows/Delegate.md` - Multi-agent delegation workflow
- `Workflows/Debate.md` - Team friction and synthesis workflow
- `Workflows/ArchiveSynthesis.md` - Subconscious retrieval patterns

**Mark todo as completed.**

### 4.4 Install TypeScript Tools

**Mark todo "Install TypeScript tools" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy TypeScript tools
cp "$PACK_DIR/src/skills/SecondBrain/Tools/"*.ts "$PAI_DIR/skills/SecondBrain/Tools/"

# Copy types
cp "$PACK_DIR/src/types/SecondBrain.ts" "$PAI_DIR/skills/SecondBrain/types/"

echo "TypeScript tools installed to: $PAI_DIR/skills/SecondBrain/Tools/"

# Note: yaml dependency is resolved from Bun's global cache (~/.bun/install/cache/)
# If tools fail with "Module not found: yaml", run: bun add yaml -g
```

**Files installed:**
- `Tools/ComplexityAssessor.ts` - Pattern-based complexity detection
- `Tools/DelegationRouter.ts` - Route to delegation strategy
- `Tools/DebateOrchestrator.ts` - Multi-perspective debates
- `types/SecondBrain.ts` - Type definitions

**Mark todo as completed.**

### 4.5 Copy Config Files

**Mark todo "Copy config files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/config/para-mapping.yaml" "$PAI_DIR/config/"
cp "$PACK_DIR/src/config/context-thresholds.json" "$PAI_DIR/config/"
cp "$PACK_DIR/src/config/delegation-rules.yaml" "$PAI_DIR/config/"
```

**Files copied:**
- `config/para-mapping.yaml` - PARA to PAI Memory integration
- `config/context-thresholds.json` - Budget alert configuration
- `config/delegation-rules.yaml` - Agent routing configuration

**Mark todo as completed.**

### 4.6 Configure PARA Vault Location

**Mark todo "Configure vault location" as in_progress.**

**Only if user specified a vault:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
VAULT_PATH="[USER_SPECIFIED_PATH]"

# Update para-mapping.yaml with vault location
if [ -f "$PAI_DIR/config/para-mapping.yaml" ]; then
  # Add vault_root to the config
  echo "" >> "$PAI_DIR/config/para-mapping.yaml"
  echo "# PARA vault location (any folder with PARA structure)" >> "$PAI_DIR/config/para-mapping.yaml"
  echo "vault_root: \"$VAULT_PATH\"" >> "$PAI_DIR/config/para-mapping.yaml"
  echo "Configured vault at: $VAULT_PATH"
fi

# Also set environment variable hint
echo ""
echo "To make this permanent, add to your shell profile:"
echo "  export PARA_VAULT=\"$VAULT_PATH\""
```

**Mark todo as completed (or skip if no vault).**

### 4.7 Verify TypeScript Tools

**Quick verification that tools work:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Test complexity assessor
bun run "$PAI_DIR/skills/SecondBrain/Tools/ComplexityAssessor.ts" -p "What is TypeScript?"
bun run "$PAI_DIR/skills/SecondBrain/Tools/ComplexityAssessor.ts" -p "Should we migrate to microservices?"

# List available perspectives
bun run "$PAI_DIR/skills/SecondBrain/Tools/DebateOrchestrator.ts" --list
```

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Second Brain Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/SecondBrain/SKILL.md" ] && echo "SKILL.md" || echo "SKILL.md missing"

echo "Checking philosophy files..."
[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/DELEGATION.md" ] && echo "DELEGATION.md" || echo "DELEGATION.md missing"
[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/SPARRING.md" ] && echo "SPARRING.md" || echo "SPARRING.md missing"
[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/AUTHORIZATION.md" ] && echo "AUTHORIZATION.md" || echo "AUTHORIZATION.md missing"
[ -f "$PAI_DIR/skills/SecondBrain/Philosophy/COGNITIVE-DIVERSITY.md" ] && echo "COGNITIVE-DIVERSITY.md" || echo "COGNITIVE-DIVERSITY.md missing"

echo "Checking workflow files..."
[ -f "$PAI_DIR/skills/SecondBrain/Workflows/Delegate.md" ] && echo "Delegate.md" || echo "Delegate.md missing"
[ -f "$PAI_DIR/skills/SecondBrain/Workflows/Debate.md" ] && echo "Debate.md" || echo "Debate.md missing"
[ -f "$PAI_DIR/skills/SecondBrain/Workflows/ArchiveSynthesis.md" ] && echo "ArchiveSynthesis.md" || echo "ArchiveSynthesis.md missing"

echo "Checking TypeScript tools..."
[ -f "$PAI_DIR/skills/SecondBrain/Tools/ComplexityAssessor.ts" ] && echo "✓ ComplexityAssessor.ts" || echo "✗ ComplexityAssessor.ts missing"
[ -f "$PAI_DIR/skills/SecondBrain/Tools/DelegationRouter.ts" ] && echo "✓ DelegationRouter.ts" || echo "✗ DelegationRouter.ts missing"
[ -f "$PAI_DIR/skills/SecondBrain/Tools/DebateOrchestrator.ts" ] && echo "✓ DebateOrchestrator.ts" || echo "✗ DebateOrchestrator.ts missing"
[ -f "$PAI_DIR/skills/SecondBrain/types/SecondBrain.ts" ] && echo "✓ types/SecondBrain.ts" || echo "✗ types/SecondBrain.ts missing"

echo "Checking config files..."
[ -f "$PAI_DIR/config/para-mapping.yaml" ] && echo "✓ para-mapping.yaml" || echo "✗ para-mapping.yaml missing"
[ -f "$PAI_DIR/config/context-thresholds.json" ] && echo "✓ context-thresholds.json" || echo "✗ context-thresholds.json missing"
[ -f "$PAI_DIR/config/delegation-rules.yaml" ] && echo "✓ delegation-rules.yaml" || echo "✗ delegation-rules.yaml missing"

echo "Testing TypeScript tools execution..."
bun run "$PAI_DIR/skills/SecondBrain/Tools/ComplexityAssessor.ts" -p "test" > /dev/null 2>&1 && echo "✓ ComplexityAssessor runs" || echo "✗ ComplexityAssessor failed"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Second Brain v2.0.0 installed successfully!

What's changed:
- I now operate as DIRECTOR, not executor
- Simple tasks: I'll delegate to at least 1 subagent
- Complex tasks: I'll spawn 3+ subagents with debate
- I will challenge your assumptions (sparring partner mode)
- Archives are now living subconscious memory
- Context budget actively protected

Try it: Ask me a complex strategic question and watch the cognitive collision.

Example: 'Should I build a SaaS product or offer consulting services?'

I'll spawn multiple perspectives, let them debate, and synthesize breakthrough insights."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Check directory permissions on $PAI_DIR/skills/
3. Verify the pack directory contains src/ folder
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

### "Permission denied"

```bash
# Check ownership of PAI directory
ls -la $PAI_DIR

# Fix permissions if needed
chmod -R u+rw $PAI_DIR
```

### "Files not copying"

```bash
# Verify pack structure
ls -la src/skills/SecondBrain/
ls -la src/config/

# Manual copy if needed
cp -r src/skills/SecondBrain $PAI_DIR/skills/
cp src/config/*.yaml $PAI_DIR/config/
cp src/config/*.json $PAI_DIR/config/
```

### "Configure PARA folder later"

```bash
# Add to para-mapping.yaml
echo 'vault_root: "/path/to/your/notes"' >> ~/.claude/config/para-mapping.yaml

# Or set environment variable
export PARA_VAULT="/path/to/your/notes"
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill routing and quick reference |
| **Philosophy** | |
| `Philosophy/DELEGATION.md` | Never-execute-directly protocol |
| `Philosophy/SPARRING.md` | Challenge and friction guidelines |
| `Philosophy/AUTHORIZATION.md` | Full freedom authorization |
| `Philosophy/COGNITIVE-DIVERSITY.md` | Multi-AI coordination |
| **Workflows** | |
| `Workflows/Delegate.md` | Multi-agent delegation workflow |
| `Workflows/Debate.md` | Team friction and synthesis |
| `Workflows/ArchiveSynthesis.md` | Subconscious retrieval |
| **TypeScript Tools** | |
| `Tools/ComplexityAssessor.ts` | Pattern-based complexity detection |
| `Tools/DelegationRouter.ts` | Route to delegation strategy |
| `Tools/DebateOrchestrator.ts` | Multi-perspective debates |
| `types/SecondBrain.ts` | Type definitions |
| **Config** | |
| `config/para-mapping.yaml` | PARA to PAI Memory mapping |
| `config/context-thresholds.json` | Budget alert configuration |
| `config/delegation-rules.yaml` | Agent routing rules |

---

## Post-Installation

After installation, the Second Brain philosophy is **always active**. There are no slash commands to invoke - it changes how your AI fundamentally operates.

**TypeScript tool commands:**
```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
bun run "$PAI_DIR/skills/SecondBrain/Tools/ComplexityAssessor.ts" -p "prompt"    # Assess complexity level
bun run "$PAI_DIR/skills/SecondBrain/Tools/DelegationRouter.ts" -p "prompt"      # Get delegation plan
bun run "$PAI_DIR/skills/SecondBrain/Tools/DebateOrchestrator.ts" -t "topic"     # Run multi-perspective debate
```

**Key behavioral changes:**
1. I will delegate tasks to subagents instead of executing directly
2. Complexity assessment determines agent count (simple=1, medium=2, complex=3+)
3. I will challenge your assumptions (sparring partner mode)
4. I will monitor context budget and warn when it's filling
5. I will retrieve from archives for breakthrough synthesis
6. Complex decisions will involve multi-agent debate

**To test:** Ask a complex strategic question and observe the difference.
