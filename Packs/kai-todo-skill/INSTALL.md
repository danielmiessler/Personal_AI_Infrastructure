# Kai Todo Skill v1.0.0 - Installation Guide

This guide will help you install the Kai Todo Skill for your Personal AI Infrastructure. The installation is designed to be executed by an AI agent with your approval at key decision points.

---

## 🤖 AI Assistant Installation Prompt

**Copy this section into Claude Code to begin AI-assisted installation:**

```
You are installing the Kai Todo Skill pack for Personal AI Infrastructure.

Follow these phases in order:

1. SYSTEM ANALYSIS - Check prerequisites and existing installations
2. USER QUESTIONS - Ask required questions and get user approval
3. BACKUP - Create backups if overwriting existing installation
4. INSTALLATION - Copy files, create data storage, verify functionality
5. VERIFICATION - Run comprehensive verification checklist

Use the TodoWrite tool to track progress through these phases.
Refer to sections below for detailed instructions for each phase.
```

---

## Phase 1: System Analysis

### Prerequisites Check

**Required Components:**
- ✅ **Claude Code**: Core PAI infrastructure must be installed
- ✅ **Obsidian Vault**: Directory at `~/Documents/personal/` for task storage
- ✅ **Bun Runtime**: Required for background processor (optional feature)

**Optional Components:**
- ⚪ **MCP Obsidian Server**: For advanced vault integration
- ⚪ **Mobile App Skill**: For mobile task management interface

### AI Instructions - System Analysis

```bash
# Check for Claude Code installation
ls ~/.claude/settings.json

# Check for Obsidian vault directory
ls ~/Documents/personal/

# Check for Bun runtime (optional, for background processor)
bun --version

# Check for existing Kai Todo installation
ls ~/.claude/skills/KaiTodo/SKILL.md

# Check for existing task file
ls ~/Documents/personal/Kai-Todo.md
```

**Decision Logic:**
- If `~/.claude/settings.json` missing → **STOP**: User must install PAI Core first
- If `~/Documents/personal/` missing → **QUESTION**: Create directory or use custom path
- If `bun --version` fails → **NOTE**: Background processor won't work (skill still functions)
- If existing KaiTodo found → **QUESTION**: Ask about overwrite/backup
- If Kai-Todo.md exists → **QUESTION**: Preserve existing tasks or start fresh

---

## Phase 2: User Questions

### Question 1: Vault Directory

**Ask if vault directory is missing:**

```
The Obsidian vault directory ~/Documents/personal/ was not found.

How would you like to proceed?
A) Create ~/Documents/personal/ directory now (recommended)
B) Use a different path for task storage (specify custom path)
C) Cancel installation
```

**Store response in:** `$VAULT_CHOICE`
**If B selected, store path in:** `$CUSTOM_VAULT_PATH`

### Question 2: Existing Installation

**Ask if existing installation detected:**

```
I found an existing Kai Todo installation at ~/.claude/skills/KaiTodo/

How would you like to proceed?
A) Backup existing and install fresh (recommended)
B) Overwrite without backup
C) Cancel installation
```

**Store response in:** `$BACKUP_CHOICE`

### Question 3: Existing Task File

**Ask if Kai-Todo.md already exists:**

```
I found an existing task file at ~/Documents/personal/Kai-Todo.md with X tasks.

How would you like to handle existing tasks?
A) Preserve existing tasks (recommended - new installation will work with current file)
B) Backup existing and start fresh task file
C) View existing tasks before deciding
```

**Store response in:** `$TASK_FILE_CHOICE`

### Question 4: Background Processor

**Ask about background processor (if Bun available):**

```
Bun runtime is available. Would you like to enable the background task processor?

This allows automated execution of queued tasks at regular intervals.

A) Yes, I want background processing enabled
B) No, I'll manually trigger tasks with /kai-todo next
```

**Store response in:** `$PROCESSOR_CHOICE`

### Question 5: Final Confirmation

**Before proceeding with installation:**

```
Ready to install Kai Todo Skill with these settings:
- Installation path: ~/.claude/skills/KaiTodo
- Task storage: ~/Documents/personal/Kai-Todo.md
- Backup existing: [Yes/No based on Q2]
- Preserve tasks: [Yes/No based on Q3]
- Background processor: [Enabled/Disabled based on Q4]

Proceed with installation?
A) Yes, install now
B) No, cancel
```

**Store response in:** `$FINAL_CONFIRMATION`

---

## Phase 3: Backup Operations

### Backup Existing Installation

**Only execute if existing installation found AND user chose backup option.**

```bash
# Create timestamped backup directory
BACKUP_DIR=~/.claude/backups/KaiTodo-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Backup existing installation
cp -r ~/.claude/skills/KaiTodo/* "$BACKUP_DIR/"

# Confirm backup
ls -la "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"
```

### Backup Existing Task File

**Only execute if task file exists AND user chose to start fresh.**

```bash
# Create timestamped backup of task file
TASK_BACKUP=~/Documents/personal/Kai-Todo-backup-$(date +%Y%m%d-%H%M%S).md
cp ~/Documents/personal/Kai-Todo.md "$TASK_BACKUP"

echo "✅ Task file backed up to: $TASK_BACKUP"
```

---

## Phase 4: Installation

### Step 1: Create Directory Structure

```bash
# Create skill directory
mkdir -p ~/.claude/skills/KaiTodo

# Create vault directory if needed
mkdir -p ~/Documents/personal

# Set working directory
cd ~/.claude/skills/KaiTodo
```

### Step 2: Copy Skill Files

```bash
# Copy all files from pack src/ to skill directory
cp -r /path/to/kai-todo-skill/src/* ~/.claude/skills/KaiTodo/

# Verify core files are present
ls -la ~/.claude/skills/KaiTodo/SKILL.md
ls -la ~/.claude/skills/KaiTodo/background-processor.ts
```

**Note to AI:** Replace `/path/to/kai-todo-skill` with the actual path where the pack was downloaded/extracted.

### Step 3: Install Dependencies (Optional)

**Only needed if enabling background processor:**

```bash
# Navigate to skill directory
cd ~/.claude/skills/KaiTodo

# Install TypeScript dependencies (if package.json exists)
# Otherwise, Bun can run the .ts file directly
bun install  # Only if dependencies are needed

# Verify background processor can run
bun run background-processor.ts --help
```

### Step 4: Initialize Task File

**Only if starting fresh or file doesn't exist:**

```bash
# Create initial Kai-Todo.md structure
cat > ~/Documents/personal/Kai-Todo.md <<'EOF'
# Kai's Todo List

## Queued

<!-- Tasks waiting to be worked on -->

## In Progress

<!-- Currently active task -->

## Completed

<!-- Finished tasks with completion dates -->

---
*Last updated: $(date +%Y-%m-%d)*
EOF

echo "✅ Task file initialized at ~/Documents/personal/Kai-Todo.md"
```

### Step 5: Configure Skill in Claude Code

The skill should be automatically detected by Claude Code on next session start. To verify:

```bash
# Check skill is in skills directory
ls ~/.claude/skills/KaiTodo/SKILL.md

# Skill will be auto-loaded on next Claude Code session
# No additional configuration needed
```

### Step 6: Set Permissions

```bash
# Make background processor executable (if using)
chmod +x ~/.claude/skills/KaiTodo/background-processor.ts

# Verify permissions
ls -l ~/.claude/skills/KaiTodo/
```

### Step 7: Test Basic Functionality

```bash
# Start new Claude Code session to load skill
# Then test with a simple command

# Example: Add a test task
echo "Testing skill: /kai-todo add test task for verification"

# Verify task was added to file
cat ~/Documents/personal/Kai-Todo.md | grep -A 5 "## Queued"
```

---

## Phase 5: Verification

Run the complete verification checklist from VERIFY.md:

```bash
# Execute verification checks
cd ~/.claude/skills/KaiTodo
# Follow manual checklist in VERIFY.md
```

**Minimum checks:**
1. ✅ SKILL.md exists and is readable
2. ✅ background-processor.ts exists (if using)
3. ✅ ~/Documents/personal/Kai-Todo.md exists and is writable
4. ✅ Claude Code detects the skill in next session
5. ✅ Can add a test task
6. ✅ Can list tasks
7. ✅ Task file is properly formatted

---

## Success Message

```
🎉 Kai Todo Skill Installation Complete!

📋 Quick Start:
   • Add task: Tell Claude "add [task] to kai todo"
   • List tasks: "/kai-todo list"
   • Start next: "/kai-todo next"
   • Complete: "/kai-todo done KT-001"
   • Remove: "/kai-todo remove KT-001"

📁 Task Storage:
   • Location: ~/Documents/personal/Kai-Todo.md
   • Format: Markdown (human-readable and editable)
   • Backup: Recommended to include in version control or backups

🤖 Background Processor (Optional):
   • Start: cd ~/.claude/skills/KaiTodo && bun run background-processor.ts
   • Stop: Ctrl+C or kill process
   • Logs: tail -f processor.log

🔗 Integrations:
   • Mobile App: Access tasks via todo interface
   • Other Skills: Reference with "Skill: [name]" in task notes
   • Obsidian: Tasks stored in your vault, fully editable

📖 Next steps:
   • Add your first real task
   • Set priorities (use "urgent", "later", or default medium)
   • Associate tasks with skills for auto-context loading
   • Try background processor for automated task execution

🆘 Having issues? See Troubleshooting section below.
```

---

## Troubleshooting

### Task File Not Found

**Problem**: Skill can't find ~/Documents/personal/Kai-Todo.md

**Solutions:**
```bash
# Verify directory exists
ls ~/Documents/personal/

# Create directory if missing
mkdir -p ~/Documents/personal

# Recreate task file
cat > ~/Documents/personal/Kai-Todo.md <<'EOF'
# Kai's Todo List

## Queued

## In Progress

## Completed
EOF

# Verify file is readable/writable
ls -la ~/Documents/personal/Kai-Todo.md
```

### Skill Not Recognized

**Problem**: Claude Code doesn't respond to /kai-todo commands

**Solutions:**
```bash
# Verify SKILL.md exists
cat ~/.claude/skills/KaiTodo/SKILL.md

# Check skill metadata format
head -20 ~/.claude/skills/KaiTodo/SKILL.md

# Restart Claude Code session
# Skills are loaded at session start

# Verify skills directory structure
ls ~/.claude/skills/
```

### Background Processor Won't Start

**Problem**: `bun run background-processor.ts` fails

**Solutions:**
```bash
# Verify Bun is installed
bun --version

# Check for TypeScript errors
bun run background-processor.ts --dry-run

# Verify file permissions
ls -la ~/.claude/skills/KaiTodo/background-processor.ts

# Try running with explicit path
cd ~/.claude/skills/KaiTodo
bun run ./background-processor.ts

# Check for required dependencies
bun install
```

### Task IDs Not Incrementing

**Problem**: New tasks get duplicate IDs or wrong sequence

**Solutions:**
```bash
# Check existing IDs in task file
grep "### \[KT-" ~/Documents/personal/Kai-Todo.md

# Ensure task format matches specification
# Each task should have: ### [KT-XXX] Title format

# Manually fix if needed (edit file in text editor)
# Tasks should be numbered sequentially: KT-001, KT-002, etc.
```

### Tasks Not Moving Between Sections

**Problem**: `/kai-todo next` or `done` doesn't move tasks

**Solutions:**
```bash
# Verify section headers are correct
grep "^## " ~/Documents/personal/Kai-Todo.md
# Should show: ## Queued, ## In Progress, ## Completed

# Check task format
cat ~/Documents/personal/Kai-Todo.md

# Ensure tasks use proper heading level (###)
# Format: ### [KT-XXX] Task Title

# Try manual edit to verify structure
open ~/Documents/personal/Kai-Todo.md
```

### Permission Errors

**Problem**: Can't write to Kai-Todo.md

**Solutions:**
```bash
# Check file permissions
ls -la ~/Documents/personal/Kai-Todo.md

# Fix ownership if needed
sudo chown $USER ~/Documents/personal/Kai-Todo.md

# Fix permissions
chmod 644 ~/Documents/personal/Kai-Todo.md

# Verify directory permissions
ls -la ~/Documents/personal/
```

---

## Manual Installation (Without AI)

If you prefer to install manually without AI assistance:

1. **Download/clone the pack** to a temporary location
2. **Copy src/ contents** to `~/.claude/skills/KaiTodo/`
3. **Create vault directory**: `mkdir -p ~/Documents/personal`
4. **Initialize task file**: Copy template from Step 4 above
5. **Verify**: Follow VERIFY.md checklist
6. **Test**: Start new Claude Code session and try `/kai-todo list`

---

## Uninstallation

To completely remove the Kai Todo Skill:

```bash
# Remove skill directory
rm -rf ~/.claude/skills/KaiTodo

# Optionally backup task file before removing
cp ~/Documents/personal/Kai-Todo.md ~/Kai-Todo-final-backup.md

# Remove task file (CAUTION: This deletes all tasks)
# rm ~/Documents/personal/Kai-Todo.md

# Verify skill is removed
ls ~/.claude/skills/ | grep -i kai
```

**Note**: Removing the task file will delete all your queued and completed tasks. Back up first if you want to preserve history.

---

## Custom Vault Path

If using a custom vault path instead of `~/Documents/personal/`:

1. **Edit SKILL.md** after installation:
   ```bash
   # Open SKILL.md in editor
   nano ~/.claude/skills/KaiTodo/SKILL.md

   # Find line: ~/Documents/personal/Kai-Todo.md
   # Replace with your custom path
   ```

2. **Create task file at custom location**:
   ```bash
   mkdir -p /your/custom/path
   # Copy task file template to custom location
   ```

3. **Update background processor** (if using):
   ```bash
   # Edit background-processor.ts
   # Update TASK_FILE_PATH constant
   ```

---

## Support

- **Issues**: Report at GitHub repository
- **Documentation**: See README.md for full feature list
- **Verification**: Run VERIFY.md checklist for diagnostics
- **File Format**: See README.md "Architecture" section for task template specification
