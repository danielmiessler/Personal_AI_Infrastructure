# PAI CreateCLI Skill v2.3.0 - Installation Guide

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
"I'm installing PAI CreateCLI Skill v2.3.0 - TypeScript CLI generator. This skill helps you create well-structured command-line tools with best practices, documentation, and testing built in.

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

# Check for existing CreateCLI skill
if [ -d "$PAI_CHECK/skills/CreateCLI" ]; then
  echo "WARNING Existing CreateCLI skill found at: $PAI_CHECK/skills/CreateCLI"
  ls "$PAI_CHECK/skills/CreateCLI/"
else
  echo "OK No existing CreateCLI skill (clean install)"
fi

# Check for Bun runtime (REQUIRED)
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED for generated CLIs!"
fi

# Check for Bin output directory
if [ -d "$PAI_CHECK/Bin" ]; then
  echo "OK Bin directory exists for generated CLIs"
else
  echo "NOTE Bin directory will be created"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing CreateCLI skill: [Yes / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- Bin output directory: [exists / will be created]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing CreateCLI directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing CreateCLI skill detected. How should I proceed?",
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
  "question": "Ready to install PAI CreateCLI Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/createcli-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/CreateCLI" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/CreateCLI" "$BACKUP_DIR/"
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
    {"content": "Copy workflow files from pack", "status": "pending", "activeForm": "Copying workflow files"},
    {"content": "Create Bin output directory", "status": "pending", "activeForm": "Creating Bin directory"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/CreateCLI/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/CreateCLI/SKILL.md" "$PAI_DIR/skills/CreateCLI/"
cp "$PACK_DIR/src/skills/CreateCLI/FrameworkComparison.md" "$PAI_DIR/skills/CreateCLI/"
cp "$PACK_DIR/src/skills/CreateCLI/Patterns.md" "$PAI_DIR/skills/CreateCLI/"
cp "$PACK_DIR/src/skills/CreateCLI/TypescriptPatterns.md" "$PAI_DIR/skills/CreateCLI/"
```

**Files included:**
- `SKILL.md` - Skill definition and routing
- `FrameworkComparison.md` - CLI framework comparison
- `Patterns.md` - CLI design patterns
- `TypescriptPatterns.md` - TypeScript-specific patterns

**Mark todo as completed.**

### 4.3 Copy Workflow Files

**Mark todo "Copy workflow files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/CreateCLI/Workflows/"*.md "$PAI_DIR/skills/CreateCLI/Workflows/"
```

**Workflows included:**
- `CreateCli.md` - Create new CLI project
- `AddCommand.md` - Add command to existing CLI
- `UpgradeTier.md` - Upgrade CLI complexity tier

**Mark todo as completed.**

### 4.4 Create Bin Output Directory

**Mark todo "Create Bin output directory" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/Bin"
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI CreateCLI Skill v2.3.0 Verification ==="

# Check skill file
echo "Checking skill file..."
[ -f "$PAI_DIR/skills/CreateCLI/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"

# Check documentation files
echo ""
echo "Checking documentation files..."
[ -f "$PAI_DIR/skills/CreateCLI/FrameworkComparison.md" ] && echo "OK FrameworkComparison.md" || echo "ERROR FrameworkComparison.md missing"
[ -f "$PAI_DIR/skills/CreateCLI/Patterns.md" ] && echo "OK Patterns.md" || echo "ERROR Patterns.md missing"
[ -f "$PAI_DIR/skills/CreateCLI/TypescriptPatterns.md" ] && echo "OK TypescriptPatterns.md" || echo "ERROR TypescriptPatterns.md missing"

# Check workflows
echo ""
echo "Checking workflows..."
for workflow in CreateCli AddCommand UpgradeTier; do
  [ -f "$PAI_DIR/skills/CreateCLI/Workflows/${workflow}.md" ] && echo "OK ${workflow}.md" || echo "ERROR ${workflow}.md missing"
done

# Check Bin directory
echo ""
echo "Checking Bin directory..."
[ -d "$PAI_DIR/Bin" ] && echo "OK Bin directory exists" || echo "ERROR Bin directory missing"

# Check Bun
echo ""
echo "Checking Bun..."
command -v bun &> /dev/null && echo "OK Bun is available: $(bun --version)" || echo "ERROR Bun not installed"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI CreateCLI Skill v2.3.0 installed successfully!

What's available:
- Create new TypeScript CLIs with best practices
- Add commands to existing CLIs
- Framework comparison and pattern documentation
- Three complexity tiers: Simple, Standard, Complex

Usage:
- 'Create a CLI called [name] that does [thing]' - Create new CLI
- 'Add a command to [CLI] that [does thing]' - Add command
- 'Upgrade [CLI] to use subcommands' - Increase complexity tier

Generated CLIs are placed in: $PAI_DIR/Bin/"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/skills/
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

### "bun: command not found"

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or restart terminal
```

### Skill not found

```bash
# Verify SKILL.md exists
ls -la $PAI_DIR/skills/CreateCLI/SKILL.md

# Check frontmatter is valid
head -20 $PAI_DIR/skills/CreateCLI/SKILL.md
```

### Permission denied on generated CLI

```bash
chmod +x $PAI_DIR/Bin/[cli-name]/[cli-name].ts
```

### Cannot find module errors

```bash
# Check tsconfig.json in generated CLI
cat $PAI_DIR/Bin/[cli-name]/tsconfig.json
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |
| `FrameworkComparison.md` | CLI framework comparison |
| `Patterns.md` | CLI design patterns |
| `TypescriptPatterns.md` | TypeScript patterns |

### Workflows

| File | Purpose |
|------|---------|
| `Workflows/CreateCli.md` | Create new CLI |
| `Workflows/AddCommand.md` | Add command to CLI |
| `Workflows/UpgradeTier.md` | Upgrade CLI tier |

---

## Usage

### Create a New CLI

```
"Create a simple CLI called 'hello' that prints 'Hello, World!'"
"Build a CLI for managing tasks with add, list, and complete commands"
```

### CLI Complexity Tiers

| Tier | Use Case | Features |
|------|----------|----------|
| Simple | Single-purpose tool | One command, minimal args |
| Standard | Multi-command tool | Subcommands, flags, config |
| Complex | Full application | Plugins, config files, state |

### Add Commands

```
"Add a 'delete' command to my tasks CLI"
"Add a --verbose flag to the hello CLI"
```

### Upgrade Tier

```
"Upgrade hello CLI to standard tier with subcommands"
"Add plugin support to my CLI"
```

### Output Location

Generated CLIs are placed in:
```
$PAI_DIR/Bin/[cli-name]/
├── [cli-name].ts    # Main CLI file
├── README.md        # Generated documentation
├── QUICKSTART.md    # Quick start guide
├── package.json     # Dependencies
└── tsconfig.json    # TypeScript config
```

Run with:
```bash
bun run $PAI_DIR/Bin/[cli-name]/[cli-name].ts
```
