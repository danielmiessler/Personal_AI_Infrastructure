# Work Command v1.0.0 - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing Work Command v1.0.0 — instant recall of prior work sessions by topic.

This pack adds two slash commands:
- /w [topic] — short form for quick access
- /work [topic] — descriptive form

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check for Claude Code commands directory
CLAUDE_DIR="$HOME/.claude"
echo "Claude directory: $CLAUDE_DIR"

# Check if commands directory exists
if [ -d "$CLAUDE_DIR/commands" ]; then
  echo "OK Commands directory exists at: $CLAUDE_DIR/commands"
  ls -la "$CLAUDE_DIR/commands/" 2>/dev/null
else
  echo "INFO Commands directory does not exist (will be created)"
fi

# Check for existing w.md or work.md commands
if [ -f "$CLAUDE_DIR/commands/w.md" ]; then
  echo "WARNING Existing /w command found at: $CLAUDE_DIR/commands/w.md"
else
  echo "OK No existing /w command (clean install)"
fi

if [ -f "$CLAUDE_DIR/commands/work.md" ]; then
  echo "WARNING Existing /work command found at: $CLAUDE_DIR/commands/work.md"
else
  echo "OK No existing /work command (clean install)"
fi

# Check for PAI MEMORY structure (optional, enhances results)
if [ -d "$CLAUDE_DIR/MEMORY/wORK" ]; then
  echo "OK PAI MEMORY/wORK directory exists (full functionality available)"
else
  echo "INFO PAI MEMORY/wORK not found (command will work but may return fewer results)"
fi

if [ -f "$CLAUDE_DIR/MEMORY/STATE/work.json" ]; then
  echo "OK work.json session registry exists"
else
  echo "INFO work.json not found (session registry search will be skipped)"
fi

if [ -f "$CLAUDE_DIR/MEMORY/STATE/session-names.json" ]; then
  echo "OK session-names.json exists"
else
  echo "INFO session-names.json not found (session name search will be skipped)"
fi

# Check if ~/.claude is a git repo (for git history search)
if [ -d "$CLAUDE_DIR/.git" ]; then
  echo "OK ~/.claude is a git repository (git history search available)"
else
  echo "INFO ~/.claude is not a git repository (git history search will be skipped)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- Commands directory: [exists / will be created]
- Existing /w command: [found — will ask about conflict / not found]
- Existing /work command: [found — will ask about conflict / not found]
- PAI MEMORY structure: [found (full functionality) / not found (basic functionality)]
- Git repository: [found / not found]

[If MEMORY not found]: Note: The Work Command searches PAI's MEMORY directories
for prior work sessions. Without PAI installed, the command will still work but
will only search git history. For full functionality, consider installing PAI:
https://github.com/danielmiessler/Personal_AI_Infrastructure"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing commands found)

**Only ask if existing /w or /work command detected:**

```json
{
  "header": "Conflict — Existing Command",
  "question": "An existing /w or /work command was found. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup of existing command, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing command without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing command"}
  ]
}
```

### Question 2: Command Selection

```json
{
  "header": "Command Names",
  "question": "Which command names would you like to install?",
  "multiSelect": false,
  "options": [
    {"label": "Both /w and /work (Recommended)", "description": "/w for quick access, /work for discoverability"},
    {"label": "Only /w", "description": "Short form only"},
    {"label": "Only /work", "description": "Descriptive form only"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install Work Command v1.0.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Copies command files to ~/.claude/commands/"},
    {"label": "Show me what will change", "description": "Lists all files that will be created"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

**If user chose "Show me what will change":**
```
"Files to be created:
- ~/.claude/commands/w.md (slash command definition)
- ~/.claude/commands/work.md (slash command definition, same content)

No other files will be modified. No hooks, no configuration changes."
```

Then re-ask the final confirmation question.

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and Replace":**

```bash
CLAUDE_DIR="$HOME/.claude"
BACKUP_DIR="$CLAUDE_DIR/Backups/work-command-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing commands
[ -f "$CLAUDE_DIR/commands/w.md" ] && cp "$CLAUDE_DIR/commands/w.md" "$BACKUP_DIR/w.md" && echo "Backed up w.md"
[ -f "$CLAUDE_DIR/commands/work.md" ] && cp "$CLAUDE_DIR/commands/work.md" "$BACKUP_DIR/work.md" && echo "Backed up work.md"

echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create commands directory", "status": "pending", "activeForm": "Creating commands directory"},
    {"content": "Copy command files", "status": "pending", "activeForm": "Copying command files"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Commands Directory

**Mark todo "Create commands directory" as in_progress.**

```bash
CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR/commands"
```

**Mark todo as completed.**

### 4.2 Copy Command Files

**Mark todo "Copy command files" as in_progress.**

**Copy files based on user's command selection:**

**For "Both /w and /work" (default):**
```bash
PACK_DIR="$(pwd)"
CLAUDE_DIR="$HOME/.claude"
cp "$PACK_DIR/src/commands/w.md" "$CLAUDE_DIR/commands/w.md"
cp "$PACK_DIR/src/commands/work.md" "$CLAUDE_DIR/commands/work.md"
echo "Installed /w and /work commands"
```

**For "Only /w":**
```bash
PACK_DIR="$(pwd)"
CLAUDE_DIR="$HOME/.claude"
cp "$PACK_DIR/src/commands/w.md" "$CLAUDE_DIR/commands/w.md"
echo "Installed /w command"
```

**For "Only /work":**
```bash
PACK_DIR="$(pwd)"
CLAUDE_DIR="$HOME/.claude"
cp "$PACK_DIR/src/commands/work.md" "$CLAUDE_DIR/commands/work.md"
echo "Installed /work command"
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
CLAUDE_DIR="$HOME/.claude"

echo "=== Work Command Verification ==="

# Check command files exist
echo "Checking command files..."
[ -f "$CLAUDE_DIR/commands/w.md" ] && echo "OK /w command installed" || echo "SKIP /w not installed (user chose /work only)"
[ -f "$CLAUDE_DIR/commands/work.md" ] && echo "OK /work command installed" || echo "SKIP /work not installed (user chose /w only)"

# Check frontmatter is valid
echo "Checking frontmatter..."
if [ -f "$CLAUDE_DIR/commands/w.md" ]; then
  head -1 "$CLAUDE_DIR/commands/w.md" | grep -q "^---" && echo "OK w.md has valid frontmatter" || echo "ERROR w.md missing frontmatter"
fi
if [ -f "$CLAUDE_DIR/commands/work.md" ]; then
  head -1 "$CLAUDE_DIR/commands/work.md" | grep -q "^---" && echo "OK work.md has valid frontmatter" || echo "ERROR work.md missing frontmatter"
fi

# Check file contents are complete
echo "Checking file contents..."
if [ -f "$CLAUDE_DIR/commands/w.md" ]; then
  grep -q "WORK RECALL" "$CLAUDE_DIR/commands/w.md" && echo "OK w.md contains work recall template" || echo "ERROR w.md incomplete"
  grep -q "work.json" "$CLAUDE_DIR/commands/w.md" && echo "OK w.md references session registry" || echo "ERROR w.md missing search sources"
fi

# Check data sources (informational, not blocking)
echo ""
echo "Data source availability (informational):"
[ -f "$CLAUDE_DIR/MEMORY/STATE/work.json" ] && echo "  OK work.json — session registry available" || echo "  INFO work.json — not found (install PAI for this feature)"
[ -d "$CLAUDE_DIR/MEMORY/wORK" ] && echo "  OK MEMORY/wORK — PRD directory available" || echo "  INFO MEMORY/wORK — not found (install PAI for this feature)"
[ -f "$CLAUDE_DIR/MEMORY/STATE/session-names.json" ] && echo "  OK session-names.json — session names available" || echo "  INFO session-names.json — not found (install PAI for this feature)"
[ -d "$CLAUDE_DIR/.git" ] && echo "  OK .git — git history available" || echo "  INFO .git — not found (git history search unavailable)"

echo ""
echo "=== Verification Complete ==="
```

**Mark todo as completed when file checks pass.**

---

## Success/Failure Messages

### On Success

```
"Work Command v1.0.0 installed successfully!

What's available:
- /w [topic] — quick search for prior work
- /work [topic] — same command, descriptive name

Try it now: Type '/w' followed by any topic you've worked on before.

Example: /w authentication
Example: /w dashboard
Example: /w deploy

Note: Results improve the more you use PAI's work tracking system (PRDs, session names, git commits)."
```

### On Success (Without PAI MEMORY)

```
"Work Command v1.0.0 installed successfully!

The commands are ready, but PAI's MEMORY system isn't installed yet.
Right now, the commands will search git history only.

For full functionality (PRD search, session registry, work directories), install PAI:
https://github.com/danielmiessler/Personal_AI_Infrastructure

Try it now: /w [any topic]"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure ~/.claude/ directory exists (created by Claude Code)
2. Check write permissions on ~/.claude/commands/
3. Run the verification commands in VERIFY.md

Need help? Open an issue at https://github.com/danielmiessler/Personal_AI_Infrastructure/issues"
```

---

## Troubleshooting

### Commands not showing up after installation

Restart Claude Code. Custom commands from `~/.claude/commands/` are loaded at session start.

### "No prior work found" for everything

This is expected if PAI's MEMORY system isn't installed. The command searches PAI-specific directories. Options:
1. Install PAI for full work tracking: https://github.com/danielmiessler/Personal_AI_Infrastructure
2. The command will still search git history if `~/.claude/` is a git repo

### Command works but results are sparse

The Work Command searches data created by PAI's Algorithm (PRDs, session metadata). The more you use PAI's structured workflow, the richer the search results become.

---

## What's Included

| File | Purpose |
|------|---------|
| `src/commands/w.md` | Primary slash command — short form `/w` |
| `src/commands/work.md` | Alias slash command — descriptive form `/work` |

Both files contain identical logic. The only difference is the `name` field in the frontmatter (`W` vs `work`), which determines the slash command name in Claude Code.

---

## Usage

### From Claude Code

```
/w authentication
/w dashboard redesign
/w deploy
/work security audit
/work blog publishing
```

### How It Works

When you type `/w [topic]`, Claude Code:
1. Loads the command template from `~/.claude/commands/w.md`
2. Substitutes `$ARGUMENTS` with your topic
3. The AI executes the five parallel searches defined in the template
4. Results are presented in a structured format
5. The AI reads the most recent matching PRD for full context

### Integration with PAI

If you have PAI installed, the Work Command becomes significantly more powerful:
- **work.json** provides structured session metadata
- **MEMORY/wORK/*/PRD.md** provides full context, criteria, and decisions
- **session-names.json** provides human-readable session names
- **Git history** provides commit-level detail

Without PAI, the command still works but only searches git history.
