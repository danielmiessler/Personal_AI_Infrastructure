# Kai Core Install - Installation Guide

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system)
- **Write access** to `$PAI_DIR/` (or your PAI directory)
- **kai-hook-system Pack** installed (required for session context loading)

---

## Pre-Installation: System Analysis

### Step 0.1: Verify Environment and Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# Check for hook system (required)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ Hook system is installed (required)"
else
  echo "❌ Hook system NOT installed - install kai-hook-system first!"
fi

# Check for history system (optional)
if [ -d "$PAI_CHECK/history" ]; then
  echo "✓ History system is installed (optional)"
else
  echo "ℹ️  History system not installed (skill usage won't be logged)"
fi
```

### Step 0.2: Detect Existing Installation

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check for existing Skills directory
if [ -d "$PAI_CHECK/skills" ]; then
  echo "⚠️  Skills directory EXISTS at: $PAI_CHECK/skills"
  ls -la "$PAI_CHECK/skills" 2>/dev/null

  if [ -d "$PAI_CHECK/skills/CORE" ]; then
    echo ""
    echo "⚠️  CORE skill directory exists - will merge/update"
  fi
else
  echo "✓ No existing Skills directory (clean install)"
fi
```

### Step 0.3: Backup Existing (If Needed)

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

## Step 1: Create Directory Structure

```bash
# Create the Skills directory
mkdir -p $PAI_DIR/skills/CORE/Workflows
mkdir -p $PAI_DIR/skills/CORE/tools
mkdir -p $PAI_DIR/skills/CreateSkill/Workflows
mkdir -p $PAI_DIR/skills/CreateSkill/tools
mkdir -p $PAI_DIR/tools
```

---

## Step 2: Install SkillSystem.md

Copy `src/skills/CORE/SkillSystem.md` to `$PAI_DIR/skills/CORE/SkillSystem.md`

---

## Step 3: Install Tools

Copy the following tools to `$PAI_DIR/tools/`:
- `src/tools/SkillSearch.ts` → `$PAI_DIR/tools/SkillSearch.ts`
- `src/tools/GenerateSkillIndex.ts` → `$PAI_DIR/tools/GenerateSkillIndex.ts`
- `src/tools/PaiArchitecture.ts` → `$PAI_DIR/tools/PaiArchitecture.ts`

---

## Step 4: Install CORE Skill

Copy `src/skills/CORE/SKILL.md` to `$PAI_DIR/skills/CORE/SKILL.md`

**IMPORTANT:** Customize the placeholders in SKILL.md:
- `[YOUR_AI_NAME]` - Name for your AI (e.g., "Kai", "Atlas")
- `[YOUR_NAME]` - Your name
- `[YOUR_PROFESSION]` - Your profession

---

## Step 5: Install CreateSkill Meta-Skill

Copy `src/skills/CreateSkill/SKILL.md` to `$PAI_DIR/skills/CreateSkill/SKILL.md`

---

## Step 6: Install Workflows

Copy `src/skills/CORE/Workflows/UpdateDocumentation.md` to:
`$PAI_DIR/skills/CORE/Workflows/UpdateDocumentation.md`

---

## Step 7: Generate Initial Index

```bash
bun run $PAI_DIR/tools/GenerateSkillIndex.ts
```

---

## Step 8: Generate Initial Architecture

```bash
bun run $PAI_DIR/tools/PaiArchitecture.ts generate
bun run $PAI_DIR/tools/PaiArchitecture.ts log-upgrade "Initial kai-core-install installation"
```

---

## Step 9: Verify Installation

Run the verification checklist in VERIFY.md to confirm everything works.

---

## Customization

### Recommended: Define Your Personality and Identity

Edit `$PAI_DIR/skills/CORE/SKILL.md`:

1. **Fill in Your Identity**
```markdown
## Identity

**Assistant:**
- Name: [Choose a name for your AI - e.g., "Kai", "Atlas", "Sage"]
- Role: [Your name]'s AI assistant

**User:**
- Name: [Your name]
- Profession: [Your profession - e.g., "Software Engineer", "Researcher"]
```

2. **Calibrate Personality Traits**
```markdown
| Trait | Value | Description |
|-------|-------|-------------|
| Humor | 60/100 | Higher = more witty, lower = more serious |
| Curiosity | 90/100 | Higher = asks more questions, explores tangents |
| Precision | 95/100 | Higher = more exact details |
| Formality | 50/100 | Higher = more professional, lower = more casual |
| Directness | 80/100 | Higher = blunt, lower = diplomatic |
```

### Optional Customization

| Customization | File | Impact |
|---------------|------|--------|
| **Contacts Directory** | `Contacts.md` | Add your frequent contacts |
| **Stack Preferences** | `CoreStack.md` | Define your technology preferences |
| **Response Format** | `SKILL.md` | Modify the structured response format |
| **Security Protocols** | `SecurityProtocols.md` | Add project-specific security rules |

---

## Troubleshooting

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
