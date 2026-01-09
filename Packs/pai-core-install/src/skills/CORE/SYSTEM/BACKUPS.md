<!--
================================================================================
PAI CORE - SYSTEM/BACKUPS.md
================================================================================

PURPOSE:
Backup system documentation. Where backups go, naming conventions, and when
to create them.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/BACKUPS.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/BACKUPS.md

CUSTOMIZATION:
- Adjust paths to match your PAI_DIR
- These patterns are generic and apply to all implementations

RELATED FILES:
- MEMORYSYSTEM.md - Overall memory architecture

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# Backup System

All backups go to `${PAI_DIR}/MEMORY/Backups/` - never inside skill directories.

## Directory Structure

```
${PAI_DIR}/MEMORY/Backups/
├── skills/        # Skill backups before major changes
├── config/        # Configuration file backups
└── Workflows/     # Workflow backups
```

## Naming Convention

```
YYYY-MM-DD-HHMMSS_[type]_[description].md
```

**Examples:**
- `2025-11-26-184500_skill_CORE-pre-canonicalization.md`
- `2025-11-26-190000_config_mcp-settings-backup.json`
- `2025-11-26-191500_workflow_blogging-create-refactor.md`

## When to Create Backups

1. **Before major skill restructuring** - canonicalization, consolidation
2. **Before risky refactoring** - large-scale changes
3. **Before deleting content** - if unsure it's safe to remove
4. **Saving working versions** - before experimental changes

## How to Backup

```bash
# Backup a skill
cp ${PAI_DIR}/skills/Skillname/SKILL.md \
   ${PAI_DIR}/MEMORY/Backups/skills/$(date +%Y-%m-%d-%H%M%S)_skill_Skillname-description.md

# Backup a config
cp ${PAI_DIR}/settings.json \
   ${PAI_DIR}/MEMORY/Backups/config/$(date +%Y-%m-%d-%H%M%S)_config_settings-description.json
```

## Rules

- **NEVER** create `backups/` directories inside skills
- **NEVER** use `.bak` or `.bak2` suffixes
- **ALWAYS** use the centralized MEMORY/Backups location
- **ALWAYS** include timestamp and description in filename
- Clean up old backups monthly (keep major milestones)
