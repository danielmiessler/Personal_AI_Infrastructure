# SKILLCUSTOMIZATIONS

User-specific preferences and extensions for **system skills** (TitleCase naming).

**Personal skills (_ALLCAPS) do NOT use this system** - they already contain personal data and are never shared.

## The Pattern

**System skills check `SKILLCUSTOMIZATIONS/{SkillName}/` for user customizations before executing.**

This keeps skill files shareable (no personal data) while allowing full customization.

## Directory Structure

```
SKILLCUSTOMIZATIONS/
├── README.md                    # This file
├── Art/                         # Art skill customizations
│   ├── EXTEND.yaml              # Manifest (required)
│   ├── PREFERENCES.md           # Aesthetic preferences
│   └── CharacterSpecs.md        # Character design specs
├── Agents/                      # Agents skill customizations
│   ├── EXTEND.yaml              # Manifest
│   ├── PREFERENCES.md           # Named agent definitions
│   └── VoiceConfig.json         # ElevenLabs voice mappings
├── FrontendDesign/              # FrontendDesign skill customizations
│   ├── EXTEND.yaml              # Manifest
│   └── PREFERENCES.md           # Design tokens, palette
└── [SkillName]/                 # Any skill
    ├── EXTEND.yaml              # Required manifest
    └── [config-files]           # Skill-specific configs
```

## How It Works

1. Skill activates based on user intent
2. Skill checks `SKILLCUSTOMIZATIONS/{SkillName}/`
3. If directory exists, loads and applies all configurations
4. Skill executes with user preferences applied
5. If no customizations, skill uses defaults

## Creating a Customization

### Step 1: Create Directory

```bash
mkdir -p ~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/SkillName
```

### Step 2: Create EXTEND.yaml (Required)

```yaml
# EXTEND.yaml - Extension manifest
---
skill: SkillName                   # Must match skill name exactly
extends:
  - PREFERENCES.md                 # Files to load
merge_strategy: override           # append | override | deep_merge
enabled: true                      # Toggle on/off
description: "What this customization adds"
```

### Step 3: Create PREFERENCES.md

```markdown
# SkillName Preferences

User-specific preferences for the SkillName skill.

## [Category]

**[Setting]:** value

## [Another Category]

Details about preferences...
```

### Step 4: Add Additional Files (Optional)

Some skills support additional configuration files:
- Character specifications (Art skill)
- Voice configurations (Agents skill)
- Scene templates
- etc.

## Merge Strategies

| Strategy | Behavior |
|----------|----------|
| `append` | Add items to existing config |
| `override` | Replace default behavior entirely (default) |
| `deep_merge` | Recursive merge of nested objects |

## Example: Art Skill Customization

```bash
mkdir -p ~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Art
```

**Art/EXTEND.yaml:**
```yaml
skill: Art
extends:
  - PREFERENCES.md
merge_strategy: override
enabled: true
description: "Custom aesthetic preferences"
```

**Art/PREFERENCES.md:**
```markdown
# Art Preferences

## Style
**Primary aesthetic:** Minimalist, clean lines
**Color palette:** Monochrome with accent colors

## Technical
**Default format:** PNG with transparency
**Resolution:** 2048x2048 for icons, 1920x1080 for headers
```

## Disabling Customizations

Set `enabled: false` in EXTEND.yaml:

```yaml
enabled: false  # Skill uses defaults, customizations ignored
```

## Full Documentation

See: `~/.claude/skills/CORE/SYSTEM/SKILLSYSTEM.md` (Skill Customization System section)
