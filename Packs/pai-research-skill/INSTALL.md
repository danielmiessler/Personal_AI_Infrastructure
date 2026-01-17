# PAI Research Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Research Skill v2.3.0 - Multi-model research orchestration. This skill coordinates research across multiple AI models (Claude, Gemini, Grok, Codex) for comprehensive topic coverage.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "OK pai-core-install is installed"
else
  echo "ERROR pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing Research skill
if [ -d "$PAI_CHECK/skills/Research" ]; then
  echo "WARNING Existing Research skill found at: $PAI_CHECK/skills/Research"
  ls "$PAI_CHECK/skills/Research/"
else
  echo "OK No existing Research skill (clean install)"
fi

# Check for MEMORY/research directory
if [ -d "$PAI_CHECK/MEMORY/research" ]; then
  echo "OK Research MEMORY directory exists"
else
  echo "NOTE Research MEMORY directory will be created"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Research skill: [Yes / No]
- Research MEMORY: [exists / will be created]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing Research directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Research skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Research Skill v2.3.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation"},
    {"label": "Show me what will change", "description": "Lists all files that will be created"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/research-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/Research" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/Research" "$BACKUP_DIR/"
  echo "Backup created at: $BACKUP_DIR"
fi
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files from pack", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Create MEMORY directory", "status": "pending", "activeForm": "Creating MEMORY directory"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Research/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/Research/` directory:

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/skills/Research/"* "$PAI_DIR/skills/Research/"
```

**Files included:**
- `SKILL.md` - Main skill definition and routing
- `QuickReference.md` - Quick reference for research patterns
- `UrlVerificationProtocol.md` - URL verification guidelines
- `Workflows/*.md` - Research workflow definitions

**Mark todo as completed.**

### 4.3 Create MEMORY Directory

**Mark todo "Create MEMORY directory" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/MEMORY/research"
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Research Skill v2.3.0 Verification ==="

# Check skill files
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/Research/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"
[ -f "$PAI_DIR/skills/Research/QuickReference.md" ] && echo "OK QuickReference.md" || echo "ERROR QuickReference.md missing"
[ -f "$PAI_DIR/skills/Research/UrlVerificationProtocol.md" ] && echo "OK UrlVerificationProtocol.md" || echo "ERROR UrlVerificationProtocol.md missing"

# Check Workflows directory
echo ""
echo "Checking workflows..."
[ -d "$PAI_DIR/skills/Research/Workflows" ] && echo "OK Workflows directory exists" || echo "ERROR Workflows directory missing"
WORKFLOW_COUNT=$(ls "$PAI_DIR/skills/Research/Workflows/"*.md 2>/dev/null | wc -l)
echo "Found $WORKFLOW_COUNT workflow files"

# Check MEMORY directory
echo ""
echo "Checking MEMORY..."
[ -d "$PAI_DIR/MEMORY/research" ] && echo "OK MEMORY/research directory exists" || echo "ERROR MEMORY/research missing"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Research Skill v2.3.0 installed successfully!

What's available:
- Multi-model research: Orchestrates Claude, Gemini, Grok, Codex researchers
- URL verification: Validates sources before including in results
- Research workflows: Structured approaches for different research types

Usage:
- 'Research [topic]' - General multi-model research
- 'Deep research on [topic]' - Comprehensive investigation
- 'Quick research on [topic]' - Fast, focused lookup"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Check directory permissions on $PAI_DIR/skills/
3. Verify all workflow files copied
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

### Skill not recognized

```bash
# Verify SKILL.md exists
ls -la $PAI_DIR/skills/Research/SKILL.md

# Check frontmatter is valid
head -20 $PAI_DIR/skills/Research/SKILL.md
```

### Workflows not found

```bash
# Check workflow files
ls -la $PAI_DIR/skills/Research/Workflows/

# Re-copy if missing
cp -r src/skills/Research/Workflows/* $PAI_DIR/skills/Research/Workflows/
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |
| `QuickReference.md` | Research patterns quick reference |
| `UrlVerificationProtocol.md` | URL verification guidelines |
| `Workflows/*.md` | Research workflow definitions |

### MEMORY Structure

| Directory | Purpose |
|-----------|---------|
| `MEMORY/research/` | Research results and cached data |

---

## Usage

### Basic Research

```
"Research the history of quantum computing"
"What are the latest developments in AI?"
```

### Multi-Model Research

The skill automatically coordinates multiple AI researchers:
- **ClaudeResearcher**: Academic, scholarly sources
- **GeminiResearcher**: Broad coverage, multiple perspectives
- **GrokResearcher**: Contrarian analysis, social topics
- **CodexResearcher**: Technical, code-focused research

### Research Modes

| Mode | Use Case | Triggered By |
|------|----------|--------------|
| Quick | Fast lookup | "quick research on..." |
| Standard | Balanced coverage | "research..." |
| Deep | Comprehensive | "deep research on..." |

### URL Verification

All URLs are verified before inclusion. The skill:
1. Checks URL accessibility
2. Validates source credibility
3. Confirms content relevance
4. Reports broken or suspicious links
