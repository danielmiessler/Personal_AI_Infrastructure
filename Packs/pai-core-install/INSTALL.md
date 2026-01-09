# Kai Core Install - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## 🎯 AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/Write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing the CORE skill - the foundation of your PAI system. This provides
skill routing, response formatting, identity configuration, USER/SYSTEM architecture,
and the CreateSkill meta-skill for building new capabilities.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# Check for Bun runtime
which bun && bun --version

# Check for hook system (required dependency)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ Hook system is installed (required)"
else
  echo "❌ Hook system NOT installed - install pai-hook-system first!"
fi

# Check for existing CORE skill
if [ -d "$PAI_CHECK/skills/CORE" ]; then
  echo "⚠️ Existing CORE skill found at: $PAI_CHECK/skills/CORE"
else
  echo "✓ No existing CORE skill (clean install)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- PAI_DIR: [path or NOT SET]
- Bun: [installed vX.X / NOT INSTALLED]
- Hook system: [installed / NOT INSTALLED - REQUIRED]
- Existing CORE skill: [Yes at path / No]"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Missing Hook System (if not installed)

**Only ask if hook system is NOT installed:**

```json
{
  "header": "Dependency",
  "question": "The hook system is required but not installed. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Install pai-hook-system first (Recommended)", "description": "I'll install the hook system pack, then continue with CORE"},
    {"label": "Skip and continue anyway", "description": "CORE will install but session context loading won't work"},
    {"label": "Abort installation", "description": "Cancel - I'll install dependencies manually"}
  ]
}
```

### Question 2: Conflict Resolution (if existing CORE found)

**Only ask if existing CORE skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing CORE skill detected at $PAI_DIR/skills/CORE. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Merge/Update", "description": "Keep existing customizations, add new files"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing CORE"}
  ]
}
```

### Question 3: AI Identity Configuration

```json
{
  "header": "Identity",
  "question": "What should I name your AI assistant?",
  "multiSelect": false,
  "options": [
    {"label": "Kai (Recommended)", "description": "The default PAI assistant name"},
    {"label": "Atlas", "description": "Alternative name"},
    {"label": "Custom name", "description": "I'll ask you for a custom name"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install CORE skill with USER/SYSTEM architecture?",
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

**Only execute if user chose "Backup and Replace" for conflicts:**

```bash
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

if [ -d "$PAI_CHECK/skills/CORE" ]; then
  mkdir -p "$BACKUP_DIR/skills"
  cp -r "$PAI_CHECK/skills/CORE" "$BACKUP_DIR/skills/CORE"
  echo "✓ Backed up CORE skill to $BACKUP_DIR/skills/CORE"
fi
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Create MEMORY/ structure", "status": "pending", "activeForm": "Creating MEMORY structure"},
    {"content": "Install settings.json template", "status": "pending", "activeForm": "Installing settings template"},
    {"content": "Install USER/ templates", "status": "pending", "activeForm": "Installing USER/ templates"},
    {"content": "Install PAISECURITYSYSTEM/ templates", "status": "pending", "activeForm": "Installing PAISECURITYSYSTEM/ templates"},
    {"content": "Install SYSTEM/ templates", "status": "pending", "activeForm": "Installing SYSTEM/ templates"},
    {"content": "Install tools", "status": "pending", "activeForm": "Installing tools"},
    {"content": "Install CORE skill", "status": "pending", "activeForm": "Installing CORE skill"},
    {"content": "Install CreateSkill meta-skill", "status": "pending", "activeForm": "Installing CreateSkill"},
    {"content": "Generate initial index", "status": "pending", "activeForm": "Generating skill index"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
mkdir -p $PAI_DIR/skills/CORE/USER
mkdir -p $PAI_DIR/skills/CORE/SYSTEM
mkdir -p $PAI_DIR/skills/CORE/Workflows
mkdir -p $PAI_DIR/skills/CORE/Tools
mkdir -p $PAI_DIR/skills/CreateSkill/Workflows
mkdir -p $PAI_DIR/skills/CreateSkill/Tools
mkdir -p $PAI_DIR/Tools
```

**Mark todo as completed.**

### 4.2 Create MEMORY/ Structure

**Mark todo "Create MEMORY/ structure" as in_progress.**

Create the MEMORY directory skeleton:

```bash
mkdir -p $PAI_DIR/MEMORY/{research,sessions,learnings,decisions,execution,security,recovery,raw-outputs,backups,State,History}
```

Copy the MEMORY README:
```bash
cp src/MEMORY/README.md $PAI_DIR/MEMORY/README.md
```

Create .gitkeep files to preserve empty directories:
```bash
for dir in research sessions learnings decisions execution security recovery raw-outputs backups State History; do
  touch "$PAI_DIR/MEMORY/$dir/.gitkeep"
done
```

**Mark todo as completed.**

### 4.3 Install Settings Template

**Mark todo "Install settings.json template" as in_progress.**

Copy the settings template to the PAI directory:

```bash
cp src/config/settings.json.template $PAI_DIR/settings.json.template
```

**If no settings.json exists**, create one from the template:

```bash
if [ ! -f "$PAI_DIR/settings.json" ]; then
  cp src/config/settings.json.template $PAI_DIR/settings.json
  echo "✓ Created settings.json from template"
else
  echo "⚠️ settings.json already exists - template saved as settings.json.template"
fi
```

**IMPORTANT:** The settings.json template includes hooks from:
- `pai-hook-system`: Session initialization, security validation, tab titles
- `pai-history-system`: Event capture, session summaries

These hooks will only work after installing those packs. The template serves as documentation for the full hook configuration.

**Mark todo as completed.**

### 4.4 Install USER/ Templates

**Mark todo "Install USER/ templates" as in_progress.**

Copy all files from `src/skills/CORE/USER/` to `$PAI_DIR/skills/CORE/USER/`:

| Source | Destination |
|--------|-------------|
| `src/skills/CORE/USER/README.md` | `$PAI_DIR/skills/CORE/USER/README.md` |
| `src/skills/CORE/USER/BASICINFO.md` | `$PAI_DIR/skills/CORE/USER/BASICINFO.md` |
| `src/skills/CORE/USER/CONTACTS.md` | `$PAI_DIR/skills/CORE/USER/CONTACTS.md` |
| `src/skills/CORE/USER/DAIDENTITY.md` | `$PAI_DIR/skills/CORE/USER/DAIDENTITY.md` |
| `src/skills/CORE/USER/TECHSTACKPREFERENCES.md` | `$PAI_DIR/skills/CORE/USER/TECHSTACKPREFERENCES.md` |
| `src/skills/CORE/USER/ASSETMANAGEMENT.md` | `$PAI_DIR/skills/CORE/USER/ASSETMANAGEMENT.md` |
| `src/skills/CORE/USER/DEFINITIONS.md` | `$PAI_DIR/skills/CORE/USER/DEFINITIONS.md` |
| `src/skills/CORE/USER/CORECONTENT.md` | `$PAI_DIR/skills/CORE/USER/CORECONTENT.md` |
| `src/skills/CORE/USER/RESUME.md` | `$PAI_DIR/skills/CORE/USER/RESUME.md` |
| `src/skills/CORE/USER/REMINDERS.md` | `$PAI_DIR/skills/CORE/USER/REMINDERS.md` |
| `src/skills/CORE/USER/ALGOPREFS.md` | `$PAI_DIR/skills/CORE/USER/ALGOPREFS.md` |
| `src/skills/CORE/USER/ART.md` | `$PAI_DIR/skills/CORE/USER/ART.md` |
| `src/skills/CORE/USER/ABOUTME.md` | `$PAI_DIR/skills/CORE/USER/ABOUTME.md` |
| `src/skills/CORE/USER/TELOS.md` | `$PAI_DIR/skills/CORE/USER/TELOS.md` |

**Mark todo as completed.**

### 4.5 Install PAISECURITYSYSTEM/ Templates (v1.3.0)

**Mark todo "Install PAISECURITYSYSTEM/ templates" as in_progress.**

Create the security directory and copy all files:

```bash
mkdir -p $PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM
```

Copy all files from `src/skills/CORE/USER/PAISECURITYSYSTEM/`:

| Source | Destination |
|--------|-------------|
| `src/skills/CORE/USER/PAISECURITYSYSTEM/README.md` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/README.md` |
| `src/skills/CORE/USER/PAISECURITYSYSTEM/ARCHITECTURE.md` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/ARCHITECTURE.md` |
| `src/skills/CORE/USER/PAISECURITYSYSTEM/patterns.yaml` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/patterns.yaml` |
| `src/skills/CORE/USER/PAISECURITYSYSTEM/PROMPTINJECTION.md` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/PROMPTINJECTION.md` |
| `src/skills/CORE/USER/PAISECURITYSYSTEM/COMMANDINJECTION.md` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/COMMANDINJECTION.md` |
| `src/skills/CORE/USER/PAISECURITYSYSTEM/PROJECTRULES.md` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/PROJECTRULES.md` |
| `src/skills/CORE/USER/PAISECURITYSYSTEM/REPOSITORIES.md` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/REPOSITORIES.md` |
| `src/skills/CORE/USER/PAISECURITYSYSTEM/QUICKREF.md` | `$PAI_DIR/skills/CORE/USER/PAISECURITYSYSTEM/QUICKREF.md` |

**Mark todo as completed.**

### 4.6 Install SYSTEM/ Templates (renumbered)

**Mark todo "Install SYSTEM/ templates" as in_progress.**

Copy all files from `src/skills/CORE/SYSTEM/` to `$PAI_DIR/skills/CORE/SYSTEM/`:

| Source | Destination |
|--------|-------------|
| `src/skills/CORE/SYSTEM/README.md` | `$PAI_DIR/skills/CORE/SYSTEM/README.md` |
| `src/skills/CORE/SYSTEM/PAISYSTEMARCHITECTURE.md` | `$PAI_DIR/skills/CORE/SYSTEM/PAISYSTEMARCHITECTURE.md` |
| `src/skills/CORE/SYSTEM/SKILLSYSTEM.md` | `$PAI_DIR/skills/CORE/SYSTEM/SKILLSYSTEM.md` |
| `src/skills/CORE/SYSTEM/MEMORYSYSTEM.md` | `$PAI_DIR/skills/CORE/SYSTEM/MEMORYSYSTEM.md` |
| `src/skills/CORE/SYSTEM/THEHOOKSYSTEM.md` | `$PAI_DIR/skills/CORE/SYSTEM/THEHOOKSYSTEM.md` |
| `src/skills/CORE/SYSTEM/THEDELEGATIONSYSTEM.md` | `$PAI_DIR/skills/CORE/SYSTEM/THEDELEGATIONSYSTEM.md` |
| `src/skills/CORE/SYSTEM/THENOTIFICATIONSYSTEM.md` | `$PAI_DIR/skills/CORE/SYSTEM/THENOTIFICATIONSYSTEM.md` |
| `src/skills/CORE/SYSTEM/AGENTS.md` | `$PAI_DIR/skills/CORE/SYSTEM/AGENTS.md` |
| `src/skills/CORE/SYSTEM/ACTIONS.md` | `$PAI_DIR/skills/CORE/SYSTEM/ACTIONS.md` |
| `src/skills/CORE/SYSTEM/PIPELINES.md` | `$PAI_DIR/skills/CORE/SYSTEM/PIPELINES.md` |
| `src/skills/CORE/SYSTEM/TOOLS.md` | `$PAI_DIR/skills/CORE/SYSTEM/TOOLS.md` |
| `src/skills/CORE/SYSTEM/CLIFIRSTARCHITECTURE.md` | `$PAI_DIR/skills/CORE/SYSTEM/CLIFIRSTARCHITECTURE.md` |
| `src/skills/CORE/SYSTEM/THEFABRICSYSTEM.md` | `$PAI_DIR/skills/CORE/SYSTEM/THEFABRICSYSTEM.md` |
| `src/skills/CORE/SYSTEM/SCRAPINGREFERENCE.md` | `$PAI_DIR/skills/CORE/SYSTEM/SCRAPINGREFERENCE.md` |
| `src/skills/CORE/SYSTEM/TERMINALTABS.md` | `$PAI_DIR/skills/CORE/SYSTEM/TERMINALTABS.md` |
| `src/skills/CORE/SYSTEM/DOCUMENTATIONINDEX.md` | `$PAI_DIR/skills/CORE/SYSTEM/DOCUMENTATIONINDEX.md` |
| `src/skills/CORE/SYSTEM/BACKUPS.md` | `$PAI_DIR/skills/CORE/SYSTEM/BACKUPS.md` |

**Mark todo as completed.**

### 4.6 Install Tools

**Mark todo "Install tools" as in_progress.**

Copy the following tools to `$PAI_DIR/Tools/`:
- `src/tools/SkillSearch.ts` → `$PAI_DIR/Tools/SkillSearch.ts`
- `src/tools/GenerateSkillIndex.ts` → `$PAI_DIR/Tools/GenerateSkillIndex.ts`
- `src/tools/PaiArchitecture.ts` → `$PAI_DIR/Tools/PaiArchitecture.ts`

**Mark todo as completed.**

### 4.7 Install CORE Skill

**Mark todo "Install CORE skill" as in_progress.**

Copy `src/skills/CORE/SKILL.md` to `$PAI_DIR/skills/CORE/SKILL.md`

**IMPORTANT:** Replace placeholders with user's choices from Question 3:
- `[YOUR_AI_NAME]` → User's chosen AI name
- `[YOUR_NAME]` → Ask user for their name
- `[YOUR_PROFESSION]` → Ask user for their profession

**Mark todo as completed.**

### 4.8 Install CreateSkill Meta-Skill

**Mark todo "Install CreateSkill meta-skill" as in_progress.**

Copy `src/skills/CreateSkill/SKILL.md` to `$PAI_DIR/skills/CreateSkill/SKILL.md`

**Mark todo as completed.**

### 4.9 Install Workflows

Copy `src/skills/CORE/Workflows/UpdateDocumentation.md` to:
`$PAI_DIR/skills/CORE/Workflows/UpdateDocumentation.md`

### 4.10 Generate Initial Index

**Mark todo "Generate initial index" as in_progress.**

```bash
bun run $PAI_DIR/Tools/GenerateSkillIndex.ts
bun run $PAI_DIR/Tools/PaiArchitecture.ts generate
bun run $PAI_DIR/Tools/PaiArchitecture.ts log-upgrade "Initial pai-core-install v1.1.0 installation"
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md.**

Quick verification:
```bash
# Check CORE skill exists
ls $PAI_DIR/skills/CORE/SKILL.md

# Check USER/ directory (15 files)
ls $PAI_DIR/skills/CORE/USER/ | wc -l

# Check SYSTEM/ directory (17 files)
ls $PAI_DIR/skills/CORE/SYSTEM/ | wc -l

# Check tools exist
ls $PAI_DIR/Tools/SkillSearch.ts
ls $PAI_DIR/Tools/GenerateSkillIndex.ts

# Check CreateSkill exists
ls $PAI_DIR/skills/CreateSkill/SKILL.md

# Run SkillSearch
bun run $PAI_DIR/Tools/SkillSearch.ts "test"
```

**Mark todo as completed when all VERIFY.md checks pass.**

---

## Success/Failure Messages

### On Success

```
"CORE skill v1.1.0 installed successfully!

What's available:
- Skill routing system with USE WHEN triggers
- Structured response format
- Identity configuration for [AI_NAME]
- USER/ directory with 15 personal configuration templates
- SYSTEM/ directory with 17 system architecture documents
- CreateSkill meta-skill for building new capabilities
- Architecture tracking with PaiArchitecture.ts

Your AI assistant [AI_NAME] is now configured and ready.

Next steps:
1. Customize USER/DAIDENTITY.md with your AI's personality
2. Add your contacts to USER/CONTACTS.md
3. Set your tech preferences in USER/TECHSTACKPREFERENCES.md"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Hook system installed? Run: ls $PAI_DIR/hooks/lib/observability.ts
2. Directories created? Run: ls $PAI_DIR/skills/CORE/
3. USER/ files installed? Run: ls $PAI_DIR/skills/CORE/USER/
4. SYSTEM/ files installed? Run: ls $PAI_DIR/skills/CORE/SYSTEM/
5. Tools copied? Run: ls $PAI_DIR/Tools/
6. Check VERIFY.md for the specific failing check

Need help? See Troubleshooting section below."
```

---

## Customization Guide

### After Installation: Customize Your PAI

**Step 1: Configure Your Identity**

Edit `$PAI_DIR/skills/CORE/USER/DAIDENTITY.md`:
- Set your AI's name
- Configure personality traits (0-100 scale)
- Define communication style

**Step 2: Add Your Contacts**

Edit `$PAI_DIR/skills/CORE/USER/CONTACTS.md`:
- Add personal contacts
- Add work colleagues
- Include relationship context

**Step 3: Set Tech Preferences**

Edit `$PAI_DIR/skills/CORE/USER/TECHSTACKPREFERENCES.md`:
- Language preferences (TypeScript vs Python)
- Package managers (bun, npm, uv)
- Deployment preferences

**Step 4: Configure Security**

Edit `$PAI_DIR/skills/CORE/USER/SECURITYSYSTEM.md`:
- Define protected paths
- Set up sanitization rules
- Configure prompt injection defense

---

## Troubleshooting

### USER/ or SYSTEM/ Files Missing

```bash
# Check if directories exist
ls -la $PAI_DIR/skills/CORE/USER/
ls -la $PAI_DIR/skills/CORE/SYSTEM/

# If missing, manually copy from pack
cp -r /path/to/pai-core-install/src/skills/CORE/USER/* $PAI_DIR/skills/CORE/USER/
cp -r /path/to/pai-core-install/src/skills/CORE/SYSTEM/* $PAI_DIR/skills/CORE/SYSTEM/
```

### Skills Not Routing

1. Verify SKILL.md has single-line description with USE WHEN
2. Run GenerateSkillIndex.ts to rebuild index
3. Check skill frontmatter format

### Format Not Being Used

1. Verify CORE loads at session start (check hooks)
2. Ensure SKILL.md contains response format section

### Architecture Not Generating

1. Check PaiArchitecture.ts exists in Tools/
2. Verify write permissions to skills/CORE/
3. Run with explicit PAI_DIR: `PAI_DIR=~/.config/pai bun run ...`
