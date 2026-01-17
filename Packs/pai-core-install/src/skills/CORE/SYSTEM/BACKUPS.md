# Backup System

All backups go to `~/.claude/MEMORY/Backups/` - never inside skill directories.

## Directory Structure

```
~/.claude/MEMORY/Backups/
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
cp ~/.claude/skills/Skillname/SKILL.md \
   ~/.claude/MEMORY/Backups/skills/$(date +%Y-%m-%d-%H%M%S)_skill_Skillname-description.md

# Backup a config
cp ~/.claude/settings.json \
   ~/.claude/MEMORY/Backups/config/$(date +%Y-%m-%d-%H%M%S)_config_settings-description.json
```

## Rules

- **NEVER** create `backups/` directories inside skills
- **NEVER** use `.bak` or `.bak2` suffixes
- **ALWAYS** use the centralized MEMORY/Backups location
- **ALWAYS** include timestamp and description in filename
- Clean up old backups monthly (keep major milestones)
