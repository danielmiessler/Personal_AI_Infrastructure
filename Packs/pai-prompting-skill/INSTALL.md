# PAI Prompting Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Prompting Skill v2.3.0 - Meta-prompting system with Handlebars templates, primitives, eval templates, and standards for dynamic prompt generation.

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

# Check for existing Prompting skill
if [ -d "$PAI_CHECK/skills/Prompting" ]; then
  echo "WARNING Existing Prompting skill found at: $PAI_CHECK/skills/Prompting"
  ls -la "$PAI_CHECK/skills/Prompting/"
else
  echo "OK No existing Prompting skill (clean install)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check for fabric patterns (optional integration)
if [ -d "$PAI_CHECK/Tools/fabric/Patterns" ]; then
  PATTERN_COUNT=$(ls "$PAI_CHECK/Tools/fabric/Patterns" 2>/dev/null | wc -l)
  echo "OK Fabric patterns available: $PATTERN_COUNT patterns"
else
  echo "WARNING Fabric patterns not found (optional - can integrate later)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Prompting skill: [Yes at path / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- Fabric patterns: [installed (N patterns) / not installed (optional)]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing Prompting skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Prompting skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Merge templates", "description": "Keep existing custom templates, add new primitives"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Template Extensions

```json
{
  "header": "Templates",
  "question": "Which template categories do you want to install?",
  "multiSelect": true,
  "options": [
    {"label": "Core Primitives (Recommended)", "description": "Roster, Voice, Structure, Briefing, Gate templates"},
    {"label": "Eval Templates (Recommended)", "description": "LLM-as-Judge patterns (Judge.hbs, Rubric.hbs, Comparison.hbs, Report.hbs, TestCase.hbs)"},
    {"label": "Data Examples (Recommended)", "description": "Pre-configured YAML data files (Agents, ValidationGates, VoicePresets)"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Prompting Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/prompting-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/Prompting" ] && cp -r "$PAI_DIR/skills/Prompting" "$BACKUP_DIR/"
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
    {"content": "Copy template primitives", "status": "pending", "activeForm": "Copying template primitives"},
    {"content": "Copy eval templates", "status": "pending", "activeForm": "Copying eval templates"},
    {"content": "Copy data files", "status": "pending", "activeForm": "Copying data files"},
    {"content": "Copy tools", "status": "pending", "activeForm": "Copying tools"},
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Prompting/Templates/Primitives"
mkdir -p "$PAI_DIR/skills/Prompting/Templates/Data"
mkdir -p "$PAI_DIR/skills/Prompting/Templates/Compiled"
mkdir -p "$PAI_DIR/skills/Prompting/Templates/Evals"
mkdir -p "$PAI_DIR/skills/Prompting/Templates/Partials"
mkdir -p "$PAI_DIR/skills/Prompting/Templates/Tools"
mkdir -p "$PAI_DIR/skills/Prompting/Tools"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/Prompting/SKILL.md" "$PAI_DIR/skills/Prompting/"
cp "$PACK_DIR/src/skills/Prompting/Standards.md" "$PAI_DIR/skills/Prompting/"
cp "$PACK_DIR/src/skills/Prompting/Templates/README.md" "$PAI_DIR/skills/Prompting/Templates/"
```

**Files copied:**
- `SKILL.md` - Main skill routing and meta-prompting system
- `Standards.md` - Prompt engineering best practices and patterns
- `Templates/README.md` - Template system documentation

**Mark todo as completed.**

### 4.3 Copy Template Primitives

**Mark todo "Copy template primitives" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy primitive templates
cp "$PACK_DIR/src/skills/Prompting/Templates/Primitives/Roster.hbs" "$PAI_DIR/skills/Prompting/Templates/Primitives/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Primitives/Voice.hbs" "$PAI_DIR/skills/Prompting/Templates/Primitives/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Primitives/Structure.hbs" "$PAI_DIR/skills/Prompting/Templates/Primitives/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Primitives/Briefing.hbs" "$PAI_DIR/skills/Prompting/Templates/Primitives/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Primitives/Gate.hbs" "$PAI_DIR/skills/Prompting/Templates/Primitives/"
```

**Primitives copied:**
- `Roster.hbs` - Agent roster template
- `Voice.hbs` - Voice/persona configuration
- `Structure.hbs` - Output structure template
- `Briefing.hbs` - Task briefing template
- `Gate.hbs` - Quality gate template

**Mark todo as completed.**

### 4.4 Copy Eval Templates

**Mark todo "Copy eval templates" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy eval templates
cp "$PACK_DIR/src/skills/Prompting/Templates/Evals/Judge.hbs" "$PAI_DIR/skills/Prompting/Templates/Evals/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Evals/Rubric.hbs" "$PAI_DIR/skills/Prompting/Templates/Evals/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Evals/Comparison.hbs" "$PAI_DIR/skills/Prompting/Templates/Evals/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Evals/Report.hbs" "$PAI_DIR/skills/Prompting/Templates/Evals/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Evals/TestCase.hbs" "$PAI_DIR/skills/Prompting/Templates/Evals/"
```

**Eval templates copied:**
- `Judge.hbs` - LLM-as-Judge evaluation template
- `Rubric.hbs` - Scoring rubric template
- `Comparison.hbs` - Side-by-side comparison template
- `Report.hbs` - Evaluation report template
- `TestCase.hbs` - Test case generation template

**Mark todo as completed.**

### 4.5 Copy Data Files

**Mark todo "Copy data files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy data files
cp "$PACK_DIR/src/skills/Prompting/Templates/Data/Agents.yaml" "$PAI_DIR/skills/Prompting/Templates/Data/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Data/ValidationGates.yaml" "$PAI_DIR/skills/Prompting/Templates/Data/"
cp "$PACK_DIR/src/skills/Prompting/Templates/Data/VoicePresets.yaml" "$PAI_DIR/skills/Prompting/Templates/Data/"
```

**Data files copied:**
- `Agents.yaml` - Pre-configured agent definitions
- `ValidationGates.yaml` - Pre-configured validation gate definitions
- `VoicePresets.yaml` - Pre-configured voice/persona presets

**Mark todo as completed.**

### 4.6 Copy Tools

**Mark todo "Copy tools" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/Prompting/Tools/RenderTemplate.ts" "$PAI_DIR/skills/Prompting/Tools/"
cp "$PACK_DIR/src/skills/Prompting/Tools/ValidateTemplate.ts" "$PAI_DIR/skills/Prompting/Tools/"
cp "$PACK_DIR/src/skills/Prompting/Tools/index.ts" "$PAI_DIR/skills/Prompting/Tools/"

# Also copy Templates/Tools for template-specific tooling
cp -r "$PACK_DIR/src/skills/Prompting/Templates/Tools/"* "$PAI_DIR/skills/Prompting/Templates/Tools/"
```

**Tools copied:**
- `RenderTemplate.ts` - Renders Handlebars templates with YAML data
- `ValidateTemplate.ts` - Validates template syntax and data structure
- `index.ts` - Tool exports
- `Templates/Tools/*` - Template-specific CLI tools and configs

**Mark todo as completed.**

### 4.7 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Install dependencies in Templates/Tools
cd "$PAI_DIR/skills/Prompting/Templates/Tools"
bun install

# Install dependencies in main Tools
cd "$PAI_DIR/skills/Prompting/Tools"
bun add handlebars yaml
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Prompting Skill Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/Prompting/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"
[ -f "$PAI_DIR/skills/Prompting/Standards.md" ] && echo "OK Standards.md" || echo "ERROR Standards.md missing"

# Check template files
echo ""
echo "Checking template primitives..."
[ -f "$PAI_DIR/skills/Prompting/Templates/Primitives/Roster.hbs" ] && echo "OK Roster.hbs" || echo "ERROR Roster.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Primitives/Voice.hbs" ] && echo "OK Voice.hbs" || echo "ERROR Voice.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Primitives/Structure.hbs" ] && echo "OK Structure.hbs" || echo "ERROR Structure.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Primitives/Briefing.hbs" ] && echo "OK Briefing.hbs" || echo "ERROR Briefing.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Primitives/Gate.hbs" ] && echo "OK Gate.hbs" || echo "ERROR Gate.hbs missing"

# Check eval templates
echo ""
echo "Checking eval templates..."
[ -f "$PAI_DIR/skills/Prompting/Templates/Evals/Judge.hbs" ] && echo "OK Judge.hbs" || echo "ERROR Judge.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Evals/Rubric.hbs" ] && echo "OK Rubric.hbs" || echo "ERROR Rubric.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Evals/Comparison.hbs" ] && echo "OK Comparison.hbs" || echo "ERROR Comparison.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Evals/Report.hbs" ] && echo "OK Report.hbs" || echo "ERROR Report.hbs missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Evals/TestCase.hbs" ] && echo "OK TestCase.hbs" || echo "ERROR TestCase.hbs missing"

# Check data files
echo ""
echo "Checking data files..."
[ -f "$PAI_DIR/skills/Prompting/Templates/Data/Agents.yaml" ] && echo "OK Agents.yaml" || echo "ERROR Agents.yaml missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Data/ValidationGates.yaml" ] && echo "OK ValidationGates.yaml" || echo "ERROR ValidationGates.yaml missing"
[ -f "$PAI_DIR/skills/Prompting/Templates/Data/VoicePresets.yaml" ] && echo "OK VoicePresets.yaml" || echo "ERROR VoicePresets.yaml missing"

# Check tools
echo ""
echo "Checking tools..."
[ -f "$PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts" ] && echo "OK RenderTemplate.ts" || echo "ERROR RenderTemplate.ts missing"
[ -f "$PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts" ] && echo "OK ValidateTemplate.ts" || echo "ERROR ValidateTemplate.ts missing"

# Test RenderTemplate CLI
echo ""
echo "Testing RenderTemplate..."
bun run "$PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts" --help | head -5

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Prompting Skill v2.3.0 installed successfully!

What's available:
- 5 template primitives (Roster, Voice, Structure, Briefing, Gate)
- 5 eval templates (Judge, Rubric, Comparison, Report, TestCase)
- 3 pre-configured data files (Agents, ValidationGates, VoicePresets)
- RenderTemplate.ts - Compile templates with YAML data
- ValidateTemplate.ts - Validate template syntax
- Standards.md - Prompt engineering best practices

Try it: Ask me to 'render a briefing template' or 'validate my prompt template'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/skills/
4. Verify handlebars and yaml packages installed
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

### Template rendering fails

```bash
# Check dependencies are installed
cd $PAI_DIR/skills/Prompting/Tools
bun install

# Or reinstall
bun add handlebars yaml
```

### "Cannot find module 'handlebars'"

```bash
# Reinstall dependencies
cd $PAI_DIR/skills/Prompting/Tools
rm -rf node_modules bun.lockb
bun add handlebars yaml
```

### Template validation errors

```bash
# Validate template syntax
bun run $PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts \
  --template "$PAI_DIR/skills/Prompting/Templates/Primitives/Briefing.hbs"
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `Standards.md` | Prompt engineering best practices |
| `Templates/README.md` | Template system documentation |
| `Templates/Primitives/Roster.hbs` | Agent roster template |
| `Templates/Primitives/Voice.hbs` | Voice/persona configuration |
| `Templates/Primitives/Structure.hbs` | Output structure template |
| `Templates/Primitives/Briefing.hbs` | Task briefing template |
| `Templates/Primitives/Gate.hbs` | Quality gate template |
| `Templates/Evals/Judge.hbs` | LLM-as-Judge evaluation template |
| `Templates/Evals/Rubric.hbs` | Scoring rubric template |
| `Templates/Evals/Comparison.hbs` | Side-by-side comparison template |
| `Templates/Evals/Report.hbs` | Evaluation report template |
| `Templates/Evals/TestCase.hbs` | Test case generation template |
| `Templates/Data/Agents.yaml` | Pre-configured agent definitions |
| `Templates/Data/ValidationGates.yaml` | Pre-configured validation gates |
| `Templates/Data/VoicePresets.yaml` | Pre-configured voice presets |
| `Templates/Tools/*` | Template-specific CLI tools |
| `Tools/RenderTemplate.ts` | Template rendering CLI |
| `Tools/ValidateTemplate.ts` | Template validation CLI |

---

## Usage

### From Claude Code

```
"Render the briefing template with this task data"
"Validate my custom template for syntax errors"
"Show me prompt engineering standards"
"Create a new primitive template for X"
```

### CLI Examples

```bash
# Render a template with YAML data
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template "Primitives/Briefing.hbs" \
  --data "path/to/briefing-data.yaml"

# Validate template syntax
bun run $PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts \
  --template "Primitives/Gate.hbs"

# Render to file
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template "Primitives/Roster.hbs" \
  --data "agents.yaml" \
  --output "compiled/agent-roster.md"
```

---

## Integration with Other Skills

### Agents Skill

Use prompting templates to generate agent system prompts:
```bash
bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template "Primitives/Briefing.hbs" \
  --data "agent-config.yaml"
```

### Evals Skill

The Prompting skill hosts eval-specific templates (`Judge.hbs`, `Rubric.hbs`) that the Evals skill references for LLM-as-Judge patterns.

### THEALGORITHM Skill

Reference `Standards.md` for prompt best practices during ISC creation and capability selection.

---

## Creating Custom Templates

### Add New Primitives

1. Create a new `.hbs` file in `Templates/Primitives/`
2. Follow Handlebars syntax
3. Document expected data structure in template header
4. Validate with `ValidateTemplate.ts`

### Extend Helpers

Add custom Handlebars helpers in `Tools/RenderTemplate.ts`:

```typescript
Handlebars.registerHelper('myHelper', (value: string) => {
  // Your custom logic
  return transformedValue;
});
```

### Template Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Primitives | `Templates/Primitives/` | Core building blocks |
| Evals | `Templates/Evals/` | LLM-as-Judge patterns |
| Partials | `Templates/Partials/` | Reusable fragments |
| Data | `Templates/Data/` | Pre-configured YAML sources |
| Compiled | `Templates/Compiled/` | Rendered output cache |
