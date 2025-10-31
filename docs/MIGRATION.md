# PAI v1.2.0 Migration Guide

**Date:** October 31, 2025
**Migration:** v0.6.0 → v1.2.0
**Pattern:** Skills-as-Containers Architecture

---

## Overview

PAI v1.2.0 introduces the **Skills-as-Containers** pattern, a significant architectural improvement that organizes capabilities into domain-specific modules with `workflows/` subdirectories. This migration guide will help you upgrade your existing PAI installation.

### What Changed

**v0.6.0 Structure (Flat):**
```
.claude/skills/content-creation/
├── SKILL.md
├── write-post.md       # Command at root level
└── publish-post.md     # Command at root level
```

**v1.2.0 Structure (Organized):**
```
.claude/skills/content-creation/
├── SKILL.md            # Core skill definition
├── workflows/          # NEW: Workflows subdirectory
│   ├── write.md       # Workflow file
│   └── publish.md     # Workflow file
└── assets/            # Supporting resources
    └── templates/
```

### Key Benefits

- ✅ **Better Organization:** Related workflows grouped together
- ✅ **Clearer Structure:** workflows/ vs assets/ vs scripts/ separation
- ✅ **Improved Discoverability:** Natural domain-based routing
- ✅ **Progressive Disclosure:** Load only what you need
- ✅ **Easier Maintenance:** Logical grouping reduces confusion

---

## Migration Strategy

### Step 1: Backup Your Current Installation

**CRITICAL:** Always backup before migrating.

```bash
# Backup your entire .claude directory
cp -r ~/.claude ~/.claude.backup.$(date +%Y%m%d)

# Or just backup skills
cp -r ~/.claude/skills ~/.claude/skills.backup.$(date +%Y%m%d)
```

### Step 2: Update PAI Repository

```bash
cd ~/Projects/PAI  # Or wherever your PAI repo is
git pull origin main
```

### Step 3: Choose Migration Approach

You have two options:

#### Option A: Fresh Install (Recommended for New Users)

Start fresh with the new structure:

```bash
# Move your old .claude aside
mv ~/.claude ~/.claude.old

# Run setup from PAI repo
cd ~/Projects/PAI
./setup.sh

# Manually migrate any custom content from ~/.claude.old
```

#### Option B: In-Place Migration (For Existing Installations)

Migrate your existing installation:

```bash
cd ~/.claude/skills

# For each skill with command files at root level:
# 1. Create workflows/ directory
mkdir your-skill-name/workflows/

# 2. Move command files into workflows/
mv your-skill-name/*.md your-skill-name/workflows/
mv your-skill-name/SKILL.md your-skill-name/  # Move SKILL.md back to root

# 3. Create assets/ directory if needed
mkdir -p your-skill-name/assets/
```

**Example - Migrating content-creation skill:**

```bash
cd ~/.claude/skills/content-creation

# Before migration:
# content-creation/
# ├── SKILL.md
# ├── write-post.md
# └── publish-post.md

# Create structure
mkdir workflows/
mkdir assets/

# Move workflow files
mv write-post.md workflows/write.md
mv publish-post.md workflows/publish.md

# After migration:
# content-creation/
# ├── SKILL.md
# ├── workflows/
# │   ├── write.md
# │   └── publish.md
# └── assets/
```

### Step 4: Update SKILL.md References

Update your SKILL.md files to reference the new structure:

**Before (v0.6.0):**
```yaml
---
name: content-creation
description: |
  Content creation workflows.
  USE WHEN user says 'write post', 'publish content'
---

## Available Commands

- write-post.md - Create new content
- publish-post.md - Publish to production
```

**After (v1.2.0):**
```yaml
---
name: content-creation
description: |
  Content creation workflows.
  USE WHEN user says 'write post', 'publish content'
---

## Available Workflows

- **workflows/write.md** - Create new content
- **workflows/publish.md** - Publish to production

## Assets

- **assets/templates/** - Content templates
```

### Step 5: Update Agent Configurations (If Applicable)

If you have custom agents that reference specific commands, update their paths:

**Before:**
```markdown
Use the write-post command from content-creation skill
```

**After:**
```markdown
Use the workflows/write.md workflow from content-creation skill
```

### Step 6: Update Hooks (If Applicable)

If you have custom hooks referencing skills/commands, verify paths:

```bash
# Check hooks directory
ls -la ~/.claude/hooks/

# Update any hardcoded paths from:
# skills/skill-name/command.md
# to:
# skills/skill-name/workflows/command.md
```

### Step 7: Test Your Migration

Verify everything works:

```bash
# Start Claude Code
claude

# Test a few skills:
# - Try natural language: "write a post"
# - Verify routing works
# - Check that workflows execute correctly
```

---

## Skill-by-Skill Migration Guide

### Minimal Skills (No Commands)

**Skills like:** `CORE`, `agent-observability`

**Action:** No migration needed - these are already correct.

### Skills with 1-2 Commands

**Skills like:** `prompting`, `fabric`, `ffuf`

**Migration:**
```bash
cd ~/.claude/skills/skill-name
mkdir workflows/
mv *.md workflows/
mv workflows/SKILL.md .  # Move SKILL.md back to root
```

### Skills with Multiple Commands

**Skills like:** `research`, `development`, `security`

**Migration:**
```bash
cd ~/.claude/skills/skill-name
mkdir workflows/
mkdir assets/

# Move command files
mv *-command.md workflows/

# Move templates/resources
mv templates/* assets/ 2>/dev/null || true
mv resources/* assets/ 2>/dev/null || true

# Update SKILL.md to reference new structure
```

### Skills with Assets/Templates

**If your skill has templates or resources:**

```bash
cd ~/.claude/skills/skill-name

# Create assets directory if needed
mkdir -p assets/

# Organize by type
mkdir -p assets/templates/
mkdir -p assets/examples/
mkdir -p assets/scripts/

# Move files to appropriate locations
mv *.template.md assets/templates/
mv example-*.md assets/examples/
```

---

## Common Migration Scenarios

### Scenario 1: Custom Skill with Commands at Root

**Before:**
```
custom-skill/
├── SKILL.md
├── task-one.md
└── task-two.md
```

**Migration:**
```bash
cd ~/.claude/skills/custom-skill
mkdir workflows/
mv task-one.md workflows/
mv task-two.md workflows/
```

**After:**
```
custom-skill/
├── SKILL.md
└── workflows/
    ├── task-one.md
    └── task-two.md
```

### Scenario 2: Skill with Mixed Content

**Before:**
```
custom-skill/
├── SKILL.md
├── do-task.md
├── template.txt
└── helper-script.sh
```

**Migration:**
```bash
cd ~/.claude/skills/custom-skill
mkdir workflows/
mkdir assets/
mkdir scripts/

mv do-task.md workflows/
mv template.txt assets/
mv helper-script.sh scripts/
```

**After:**
```
custom-skill/
├── SKILL.md
├── workflows/
│   └── do-task.md
├── assets/
│   └── template.txt
└── scripts/
    └── helper-script.sh
```

### Scenario 3: Skill Already Using Subdirectories

**If your skill already has some organization:**

```bash
cd ~/.claude/skills/custom-skill

# Rename existing directories if needed
mv commands/ workflows/ 2>/dev/null || true
mv resources/ assets/ 2>/dev/null || true

# Ensure proper structure
mkdir -p workflows/
mkdir -p assets/
```

---

## Commands Directory

### Important Note

The `.claude/commands/` directory is a Claude Code feature and **is NOT deprecated**. It remains available for:
- Simple one-off commands
- Experimental commands
- Commands that don't fit into a skill domain

**However,** for better organization and discoverability, we recommend:
- Related commands → organize into skills with workflows/
- One-off commands → can stay in .claude/commands/

**Migration recommendation:**
```bash
# Review your commands directory
ls -la ~/.claude/commands/

# For related commands, migrate to skills
# For standalone commands, leave in commands/
```

---

## Troubleshooting

### Issue: "Command not found" after migration

**Cause:** Natural language routing may still reference old paths.

**Fix:**
1. Check SKILL.md has correct workflow references
2. Verify workflow files are in workflows/ subdirectory
3. Restart Claude Code to reload skill metadata

### Issue: Workflows not executing

**Cause:** File permissions or syntax errors.

**Fix:**
```bash
# Check file permissions
ls -la ~/.claude/skills/skill-name/workflows/

# Ensure files are readable
chmod 644 ~/.claude/skills/skill-name/workflows/*.md

# Check for syntax errors in YAML frontmatter
head -20 ~/.claude/skills/skill-name/SKILL.md
```

### Issue: Assets not loading

**Cause:** Incorrect asset paths in workflows.

**Fix:**
Update workflow references:

**Before:**
```markdown
Use template from ../template.md
```

**After:**
```markdown
Use template from ../assets/template.md
```

### Issue: Hooks failing after migration

**Cause:** Hardcoded paths in hooks.

**Fix:**
```bash
# Check hooks for hardcoded paths
grep -r "skills/" ~/.claude/hooks/

# Update any absolute paths to use new structure
# Change: ~/.claude/skills/skill/command.md
# To: ~/.claude/skills/skill/workflows/command.md
```

### Issue: Agent can't find workflows

**Cause:** Agent configurations reference old paths.

**Fix:**
Update agent configurations in `~/.claude/agents/`:
```bash
# Find agents referencing old structure
grep -r "\.md" ~/.claude/agents/

# Update references from:
# "use write-post.md"
# to:
# "use workflows/write.md"
```

---

## Rollback Procedure

If you encounter issues and need to rollback:

```bash
# Stop Claude Code first
# Then restore from backup:

# Full rollback
rm -rf ~/.claude
mv ~/.claude.backup.YYYYMMDD ~/.claude

# Or just skills rollback
rm -rf ~/.claude/skills
mv ~/.claude/skills.backup.YYYYMMDD ~/.claude/skills

# Restart Claude Code
```

---

## Post-Migration Checklist

After migration, verify:

- [ ] All skills have proper structure (SKILL.md at root, workflows/ subdirectory)
- [ ] Natural language routing works ("write a post" → correct workflow)
- [ ] Assets are in assets/ subdirectory and accessible
- [ ] Scripts are in scripts/ subdirectory (if applicable)
- [ ] Agents can invoke workflows correctly
- [ ] Hooks are functioning (check logs)
- [ ] No errors in Claude Code console

---

## Getting Help

### Documentation

- **Architecture Guide:** `/docs/ARCHITECTURE.md`
- **Example Skill:** `.claude/skills/example-skill/`
- **PAI Repository:** https://github.com/danielmiessler/PAI

### Common Questions

**Q: Do I need to migrate all skills at once?**
A: No - you can migrate incrementally. The old structure still works, but the new structure is recommended for better organization.

**Q: What about the commands directory?**
A: The commands directory remains available as a Claude Code feature. Use it for one-off commands, but organize related commands into skills with workflows/.

**Q: Can I use both old and new structures?**
A: Yes, during migration. But for consistency, fully migrate to the new structure when possible.

**Q: Will my existing prompts/commands break?**
A: No - functionality is preserved. Only the file organization changes.

**Q: How do I create new skills with the correct structure?**
A: Use the example-skill as a template: `cp -r .claude/skills/example-skill .claude/skills/your-skill-name`

---

## Summary

The v1.2.0 Skills-as-Containers migration:

1. **Organizes workflows** into workflows/ subdirectories
2. **Separates concerns** with assets/, scripts/, workflows/ directories
3. **Improves discoverability** through domain-based organization
4. **Maintains compatibility** - old structure still works during transition
5. **Provides clear patterns** via example-skill

**Migration Time:** ~30-60 minutes for typical installations
**Risk Level:** Low (backups recommended)
**Benefit:** Significant organizational improvement

---

**Questions or issues?** Create an issue on GitHub: https://github.com/danielmiessler/PAI/issues

---

**Document Version:** 1.0
**Last Updated:** 2025-10-31
**Applies To:** PAI v1.2.0 and later
