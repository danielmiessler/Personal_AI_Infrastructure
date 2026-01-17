# PAI Hook System v2.3.0 - Installation Guide

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
"I'm installing PAI Hook System v2.3.0 - Event-driven automation for Claude Code. This major release includes 15 hooks for security validation, session management, context injection, learning capture, and sentiment analysis.

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

# Check for existing hooks directory
if [ -d "$PAI_CHECK/hooks" ]; then
  echo "WARNING Existing hooks directory found at: $PAI_CHECK/hooks"
  ls "$PAI_CHECK/hooks"/*.hook.ts 2>/dev/null | head -10
else
  echo "OK No existing hooks directory (clean install)"
fi

# Check Claude settings for existing hooks
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ -f "$CLAUDE_SETTINGS" ]; then
  if grep -q '"hooks"' "$CLAUDE_SETTINGS" 2>/dev/null; then
    echo "WARNING Existing hooks configuration found in settings.json"
  else
    echo "OK No hooks configured in settings.json"
  fi
else
  echo "OK No Claude settings.json (will be created)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check environment variables
echo ""
echo "Environment Variables:"
echo "  DA: ${DA:-'NOT SET (default: PAI)'}"
echo "  TIME_ZONE: ${TIME_ZONE:-'NOT SET (default: system)'}"
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing hooks directory: [Yes (N hooks) / No]
- Claude settings.json: [has hooks / no hooks / doesn't exist]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- DA environment variable: [set / not set]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing hooks found)

**Only ask if existing hooks directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing hooks detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Merge with existing (Recommended)", "description": "Adds new hooks alongside your existing hooks"},
    {"label": "Backup and replace", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Environment Variables (if not set)

**Only ask if DA or TIME_ZONE are not set:**

```json
{
  "header": "Environment",
  "question": "Environment variables not set. How should I configure them?",
  "multiSelect": false,
  "options": [
    {"label": "Create .env file (Recommended)", "description": "Creates $PAI_DIR/.env with default values"},
    {"label": "I'll set them in shell profile", "description": "Skip .env, set in ~/.zshrc or ~/.bashrc"},
    {"label": "Use defaults", "description": "Continue with default values (DA=PAI)"}
  ]
}
```

### Question 3: Hook Selection

```json
{
  "header": "Hooks",
  "question": "Which hook categories should I enable?",
  "multiSelect": true,
  "options": [
    {"label": "Security (Recommended)", "description": "SecurityValidator - blocks dangerous commands"},
    {"label": "Session Management (Recommended)", "description": "LoadContext, StartupGreeting, CheckVersion"},
    {"label": "UI Automation (Recommended)", "description": "UpdateTabTitle, SetQuestionTab"},
    {"label": "Output Processing", "description": "FormatEnforcer, StopOrchestrator, SessionSummary"},
    {"label": "Learning System", "description": "WorkCompletionLearning, ExplicitRatingCapture, ImplicitSentimentCapture"},
    {"label": "Agent Orchestration", "description": "AgentOutputCapture for subagent management"},
    {"label": "Work Tracking", "description": "AutoWorkCreation, QuestionAnswered"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Hook System v2.3.0?",
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

**Only execute if user chose "Backup and replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/hook-system-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup hooks directory
[ -d "$PAI_DIR/hooks" ] && cp -r "$PAI_DIR/hooks" "$BACKUP_DIR/"

# Backup settings.json
[ -f "$HOME/.claude/settings.json" ] && cp "$HOME/.claude/settings.json" "$BACKUP_DIR/"

echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create hooks directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy hook files from pack", "status": "pending", "activeForm": "Copying hook files"},
    {"content": "Copy library files from pack", "status": "pending", "activeForm": "Copying library files"},
    {"content": "Copy handler files from pack", "status": "pending", "activeForm": "Copying handler files"},
    {"content": "Set up environment variables", "status": "pending", "activeForm": "Setting up environment"},
    {"content": "Register hooks in settings.json", "status": "pending", "activeForm": "Registering hooks"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Hooks Directory Structure

**Mark todo "Create hooks directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/hooks/lib"
mkdir -p "$PAI_DIR/hooks/handlers"
```

**Mark todo as completed.**

### 4.2 Copy Hook Files

**Mark todo "Copy hook files from pack" as in_progress.**

Copy hook files from the pack's `src/hooks/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy all hook files
cp "$PACK_DIR/src/hooks/"*.hook.ts "$PAI_DIR/hooks/"
```

**Hooks included (15 total):**
- `SecurityValidator.hook.ts` - PreToolUse: Block dangerous commands
- `LoadContext.hook.ts` - SessionStart: Load CORE skill context
- `StartupGreeting.hook.ts` - SessionStart: Voice greeting
- `CheckVersion.hook.ts` - SessionStart: Version compatibility
- `UpdateTabTitle.hook.ts` - UserPromptSubmit: Tab automation
- `SetQuestionTab.hook.ts` - UserPromptSubmit: Question tracking
- `ExplicitRatingCapture.hook.ts` - UserPromptSubmit: Rating capture
- `FormatEnforcer.hook.ts` - Stop: Format compliance
- `StopOrchestrator.hook.ts` - Stop: Post-response coordination
- `SessionSummary.hook.ts` - Stop: Session summaries
- `QuestionAnswered.hook.ts` - Stop: Question completion
- `AutoWorkCreation.hook.ts` - Stop: Work entry creation
- `WorkCompletionLearning.hook.ts` - Stop: Learning capture
- `ImplicitSentimentCapture.hook.ts` - Stop: Sentiment analysis
- `AgentOutputCapture.hook.ts` - SubagentStop: Agent output routing

**Mark todo as completed.**

### 4.3 Copy Library Files

**Mark todo "Copy library files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/hooks/lib/"*.ts "$PAI_DIR/hooks/lib/"
```

**Libraries included (12 total):**
- `observability.ts` - Event logging and dashboard integration
- `notifications.ts` - Voice and notification system
- `identity.ts` - Session and user identity
- `paths.ts` - PAI directory utilities
- `time.ts` - Timezone formatting
- `change-detection.ts` - Response change detection
- `learning-utils.ts` - Learning capture utilities
- `metadata-extraction.ts` - Metadata extraction
- `recovery-types.ts` - Error recovery types
- `response-format.ts` - Format validation
- `IdealState.ts` - Goal tracking
- `TraceEmitter.ts` - Trace emission

**Mark todo as completed.**

### 4.4 Copy Handler Files

**Mark todo "Copy handler files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/hooks/handlers/"*.ts "$PAI_DIR/hooks/handlers/"
```

**Handlers included (4 total):**
- `capture.ts` - Output capture coordination
- `voice.ts` - Voice notification handling
- `tab-state.ts` - Tab state management
- `SystemIntegrity.ts` - System integrity checks

**Mark todo as completed.**

### 4.5 Set Up Environment Variables (If User Chose Yes)

**Mark todo "Set up environment variables" as in_progress.**

**Only execute if user chose to create .env file:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create .env if it doesn't exist
if [ ! -f "$PAI_DIR/.env" ]; then
  cat > "$PAI_DIR/.env" << 'EOF'
# PAI Hook System Configuration
DA="PAI"
PAI_DIR="${HOME}/.claude"
TIME_ZONE="America/Los_Angeles"
PAI_SOURCE_APP="${DA}"
EOF
  echo "Created $PAI_DIR/.env"
else
  echo ".env already exists at $PAI_DIR/.env"
fi
```

Tell the user:
```
"Created .env at $PAI_DIR/.env
You can customize:
- DA - Your AI assistant name (default: PAI)
- TIME_ZONE - Your timezone
- PAI_SOURCE_APP - Source app identifier"
```

**Mark todo as completed (or skip if user declined).**

### 4.6 Register Hooks in settings.json

**Mark todo "Register hooks in settings.json" as in_progress.**

Read the existing `~/.claude/settings.json` and merge hook configurations.

**For new installations:**
```bash
# If no settings.json exists, create a basic one with hooks
mkdir -p ~/.claude
```

**Hook configuration to add:**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {"type": "command", "command": "bun run $PAI_DIR/hooks/StartupGreeting.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/LoadContext.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/CheckVersion.hook.ts"}
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {"type": "command", "command": "bun run $PAI_DIR/hooks/SecurityValidator.hook.ts"}
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {"type": "command", "command": "bun run $PAI_DIR/hooks/UpdateTabTitle.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/SetQuestionTab.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/ExplicitRatingCapture.hook.ts"}
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {"type": "command", "command": "bun run $PAI_DIR/hooks/FormatEnforcer.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/StopOrchestrator.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/SessionSummary.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/QuestionAnswered.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/AutoWorkCreation.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/WorkCompletionLearning.hook.ts"},
          {"type": "command", "command": "bun run $PAI_DIR/hooks/ImplicitSentimentCapture.hook.ts"}
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {"type": "command", "command": "bun run $PAI_DIR/hooks/AgentOutputCapture.hook.ts"}
        ]
      }
    ]
  }
}
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Hook System v2.3.0 Verification ==="

# Check hook files (15 expected)
echo "Checking hook files..."
HOOK_COUNT=$(ls "$PAI_DIR/hooks/"*.hook.ts 2>/dev/null | wc -l)
echo "Found $HOOK_COUNT hook files (expected: 15)"

# Check critical hooks
[ -f "$PAI_DIR/hooks/SecurityValidator.hook.ts" ] && echo "OK SecurityValidator.hook.ts" || echo "ERROR SecurityValidator.hook.ts missing"
[ -f "$PAI_DIR/hooks/LoadContext.hook.ts" ] && echo "OK LoadContext.hook.ts" || echo "ERROR LoadContext.hook.ts missing"
[ -f "$PAI_DIR/hooks/StopOrchestrator.hook.ts" ] && echo "OK StopOrchestrator.hook.ts" || echo "ERROR StopOrchestrator.hook.ts missing"

# Check library files (12 expected)
echo ""
echo "Checking library files..."
LIB_COUNT=$(ls "$PAI_DIR/hooks/lib/"*.ts 2>/dev/null | wc -l)
echo "Found $LIB_COUNT library files (expected: 12)"

# Check handler files (4 expected)
echo ""
echo "Checking handler files..."
HANDLER_COUNT=$(ls "$PAI_DIR/hooks/handlers/"*.ts 2>/dev/null | wc -l)
echo "Found $HANDLER_COUNT handler files (expected: 4)"

# Check settings.json
echo ""
echo "Checking settings.json..."
if [ -f ~/.claude/settings.json ]; then
  if grep -q '"hooks"' ~/.claude/settings.json; then
    echo "OK Hooks section exists in settings.json"
  else
    echo "ERROR Hooks section missing from settings.json"
  fi
else
  echo "ERROR settings.json not found"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

Tell the user:
```
"Hooks are loaded when Claude Code starts. Please restart Claude Code to activate the hooks."
```

---

## Success/Failure Messages

### On Success

```
"PAI Hook System v2.3.0 installed successfully!

What's available:
- Security: SecurityValidator blocks dangerous commands
- Session: LoadContext, StartupGreeting, CheckVersion
- UI: UpdateTabTitle, SetQuestionTab
- Output: FormatEnforcer, StopOrchestrator, SessionSummary
- Learning: WorkCompletionLearning, ExplicitRatingCapture, ImplicitSentimentCapture
- Agents: AgentOutputCapture for subagent management
- Work: AutoWorkCreation, QuestionAnswered

The hooks fire automatically on the appropriate events.

**Important:** Restart Claude Code to activate the hooks."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/
4. Verify hooks are registered in ~/.claude/settings.json
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

### "bun: command not found"

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal or source ~/.bashrc
```

### Hooks not firing

```bash
# Check hooks are registered
grep -A 30 '"hooks"' ~/.claude/settings.json

# Verify file paths use $PAI_DIR correctly
echo "PAI_DIR is: $PAI_DIR"

# Restart Claude Code to reload hooks
# Hooks are only loaded at startup
```

### Security validator blocking valid commands

```bash
# Review attack patterns in SecurityValidator.hook.ts
cat $PAI_DIR/hooks/SecurityValidator.hook.ts | grep -A 5 "ATTACK_PATTERNS"

# Adjust patterns or add exceptions as needed
```

### Tab titles not updating

```bash
# Check terminal supports OSC escape sequences
# Most modern terminals (iTerm2, Hyper, etc.) support this

# Verify the UserPromptSubmit hook is registered
grep "UpdateTabTitle" ~/.claude/settings.json
```

---

## What's Included

### Hooks (15 files)

| File | Event | Purpose |
|------|-------|---------|
| `SecurityValidator.hook.ts` | PreToolUse | Block dangerous commands |
| `LoadContext.hook.ts` | SessionStart | Load CORE skill context |
| `StartupGreeting.hook.ts` | SessionStart | Voice greeting |
| `CheckVersion.hook.ts` | SessionStart | Version check |
| `UpdateTabTitle.hook.ts` | UserPromptSubmit | Tab automation |
| `SetQuestionTab.hook.ts` | UserPromptSubmit | Question tracking |
| `ExplicitRatingCapture.hook.ts` | UserPromptSubmit | Rating capture |
| `FormatEnforcer.hook.ts` | Stop | Format compliance |
| `StopOrchestrator.hook.ts` | Stop | Post-response coordination |
| `SessionSummary.hook.ts` | Stop | Session summaries |
| `QuestionAnswered.hook.ts` | Stop | Question completion |
| `AutoWorkCreation.hook.ts` | Stop | Work entry creation |
| `WorkCompletionLearning.hook.ts` | Stop | Learning capture |
| `ImplicitSentimentCapture.hook.ts` | Stop | Sentiment analysis |
| `AgentOutputCapture.hook.ts` | SubagentStop | Agent output routing |

### Libraries (12 files)

| File | Purpose |
|------|---------|
| `observability.ts` | Dashboard integration |
| `notifications.ts` | Voice/notification system |
| `identity.ts` | Identity management |
| `paths.ts` | Path utilities |
| `time.ts` | Time formatting |
| `change-detection.ts` | Change detection |
| `learning-utils.ts` | Learning utilities |
| `metadata-extraction.ts` | Metadata extraction |
| `recovery-types.ts` | Recovery types |
| `response-format.ts` | Format validation |
| `IdealState.ts` | Goal tracking |
| `TraceEmitter.ts` | Trace emission |

### Handlers (4 files)

| File | Purpose |
|------|---------|
| `capture.ts` | Output capture |
| `voice.ts` | Voice handling |
| `tab-state.ts` | Tab management |
| `SystemIntegrity.ts` | System checks |

---

## Usage

### Automatic Behavior

Hooks fire automatically on their respective events:
- **SessionStart**: Context loaded, greeting sent, version checked
- **PreToolUse (Bash)**: Commands validated before execution
- **UserPromptSubmit**: Tab title updated, ratings captured
- **Stop**: Format enforced, summaries generated, learnings captured
- **SubagentStop**: Agent outputs captured and routed

### Hook Events

| Event | When | Hooks |
|-------|------|-------|
| `SessionStart` | Claude Code starts | LoadContext, StartupGreeting, CheckVersion |
| `PreToolUse` | Before tool execution | SecurityValidator (Bash only) |
| `UserPromptSubmit` | User sends message | UpdateTabTitle, SetQuestionTab, ExplicitRatingCapture |
| `Stop` | Agent finishes | FormatEnforcer, StopOrchestrator, SessionSummary, QuestionAnswered, AutoWorkCreation, WorkCompletionLearning, ImplicitSentimentCapture |
| `SubagentStop` | Subagent finishes | AgentOutputCapture |

### Adding Custom Hooks

Create a new `.hook.ts` file in `$PAI_DIR/hooks/` and register it in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/MyCustom.hook.ts"
          }
        ]
      }
    ]
  }
}
```
