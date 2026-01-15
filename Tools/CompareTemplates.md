# Compare Templates

A diagnostic workflow for comparing your personalized PAI files against canonical templates to discover new customization options you may have missed.

---

## What This Does

When you run this comparison, your AI will:

1. **Identify template-derived files** — Files in your installation that started from PAI templates
2. **Compare sections and fields** — Find headings, tables, and configuration options in templates that your local version doesn't have
3. **Compare directory structures** — Identify new files or subdirectories added to canonical packs
4. **Surface new opportunities** — Show you customizations available in newer template versions
5. **Recommend updates** — Suggest which new sections might be valuable for your setup

---

## Why This Matters

PAI evolves. New template versions add:
- New configuration options (personality traits, preferences)
- New reference files (security protocols, system documentation)
- New workflow patterns
- Better examples and documentation

Your personalized files (SKILL.md, Aesthetic.md, Contacts.md) were created from templates at a point in time. **You might be missing features that didn't exist when you first customized.**

---

## How to Use

Give this file to your AI and say:

```
Compare my PAI files against the canonical templates and show me what's new.
```

Or for a specific file:

```
Compare my CORE/SKILL.md against the canonical template.
```

---

## Comparison Workflow

### Step 1: Locate Template Mappings

Check the manifest for template-derived files:

```bash
# If manifest exists
cat $PAI_DIR/pai-manifest.json | jq '.template_derived'

# Default mappings if no manifest:
# Installation File              → Canonical Template
# skills/CORE/SKILL.md           → Packs/pai-core-install/src/skills/CORE/SKILL.md
# skills/CORE/Contacts.md        → Packs/pai-core-install/src/skills/CORE/USER/CONTACTS.md
# skills/CORE/CoreStack.md       → Packs/pai-core-install/src/skills/CORE/USER/TECHSTACKPREFERENCES.md
# skills/Art/Aesthetic.md        → Packs/pai-art-skill/src/skills/Art/Aesthetic.md
```

---

### Step 2: Compare Section Headings

For each template-derived file, extract and compare markdown headings:

```bash
# Extract headings from local file
grep -E '^#{1,3} ' $PAI_DIR/skills/CORE/SKILL.md

# Extract headings from canonical template
grep -E '^#{1,3} ' $PAI_SOURCE/Packs/pai-core-install/src/skills/CORE/SKILL.md
```

**Look for:**
- Headings in template not in local (new sections available)
- Headings in local not in template (your custom additions)
- Different heading structures (template may have reorganized)

---

### Step 3: Compare Directory Structures

Check if canonical packs have new files your installation lacks:

```bash
# List canonical CORE skill structure
find $PAI_SOURCE/Packs/pai-core-install/src/skills/CORE -name "*.md" | sort

# List installed CORE skill structure
find $PAI_DIR/skills/CORE -name "*.md" | sort

# Compare the two
diff <(find $PAI_SOURCE/Packs/pai-core-install/src/skills/CORE -name "*.md" -exec basename {} \; | sort) \
     <(find $PAI_DIR/skills/CORE -name "*.md" -exec basename {} \; | sort)
```

---

### Step 4: Detailed Field Comparison

For configuration files, compare specific fields:

#### SKILL.md Identity Section
```
Template fields:
- Name: [YOUR_AI_NAME]
- Role: [YOUR_NAME]'s AI assistant
- Profession: [YOUR_PROFESSION]    ← New field?

Your fields:
- Name: JOS
- Role: Matthew Pryor's AI assistant
- (missing Profession)              ← Opportunity!
```

#### Personality Calibration (if template has it)
```
Template has:
| Trait | Value | Description |
|-------|-------|-------------|
| Humor | [0-100]/100 | ...
| Curiosity | [0-100]/100 | ...
| Precision | [0-100]/100 | ...
| Formality | [0-100]/100 | ...
| Directness | [0-100]/100 | ...

Your version: (section missing)
→ OPPORTUNITY: Add personality calibration
```

---

### Step 5: Generate Comparison Report

After analysis, produce a structured report:

```
Template Comparison Report
==========================

FILE: skills/CORE/SKILL.md
Template: Packs/pai-core-install/src/skills/CORE/SKILL.md

SECTIONS IN TEMPLATE NOT IN LOCAL:
  + ## Personality Calibration
  + ## Examples
  + ### Voice Integration

SECTIONS IN LOCAL NOT IN TEMPLATE:
  ~ ## PAI/JOS Architecture (CRITICAL)  [your custom addition]

FIELDS/OPTIONS YOU'RE MISSING:
  • Identity → Profession field
  • Response Format → 🗣️ voice line explanation
  • Personality traits table (Humor, Curiosity, etc.)

────────────────────────────────────────

DIRECTORY: skills/CORE/
Template: Packs/pai-core-install/src/skills/CORE/

NEW FILES IN TEMPLATE NOT INSTALLED:
  + USER/ABOUTME.md          - Personal background
  + USER/BASICINFO.md        - Basic user information
  + USER/DAIDENTITY.md       - AI identity config
  + USER/TELOS.md            - Purpose and goals
  + USER/RESUME.md           - Professional background
  + USER/ALGOPREFS.md        - Algorithm preferences
  + USER/ASSETMANAGEMENT.md  - Asset handling preferences
  + USER/REMINDERS.md        - Persistent reminders
  + USER/DEFINITIONS.md      - Custom terminology
  + SYSTEM/                  - System architecture docs (12 files)
  + USER/PAISECURITYSYSTEM/  - Security protocols (7 files)

RECOMMENDATION:
  Consider reviewing these new template files. They offer
  customization options that weren't in your original template.

────────────────────────────────────────

FILE: skills/Art/Aesthetic.md
Template: Packs/pai-art-skill/src/skills/Art/Aesthetic.md

STATUS: ✅ Up to date (or your custom version)
  Your file has custom content - this is expected for aesthetic.
  Compare manually if you want template suggestions.
```

---

## Standard Template Mappings

### Core Identity Files

| Your Installation | Canonical Template | Purpose |
|-------------------|-------------------|---------|
| `skills/CORE/SKILL.md` | `Packs/pai-core-install/src/skills/CORE/SKILL.md` | Main identity config |
| `skills/CORE/Contacts.md` | `Packs/pai-core-install/src/skills/CORE/USER/CONTACTS.md` | Contact information |
| `skills/CORE/CoreStack.md` | `Packs/pai-core-install/src/skills/CORE/USER/TECHSTACKPREFERENCES.md` | Tech preferences |

### Art Skill Files

| Your Installation | Canonical Template | Purpose |
|-------------------|-------------------|---------|
| `skills/Art/Aesthetic.md` | `Packs/pai-art-skill/src/skills/Art/Aesthetic.md` | Visual style |
| `skills/Art/SKILL.md` | `Packs/pai-art-skill/src/skills/Art/SKILL.md` | Art skill config |

### New Files Worth Reviewing

These files exist in canonical templates but may not be in older installations:

| Template File | Purpose | Consider If... |
|---------------|---------|----------------|
| `USER/TELOS.md` | Define your AI's purpose and goals | You want focused, goal-oriented behavior |
| `USER/ABOUTME.md` | Rich personal context | You want AI to understand your background |
| `USER/DAIDENTITY.md` | Detailed AI personality | You want fine-tuned AI behavior |
| `USER/PAISECURITYSYSTEM/` | Security protocols | You work with sensitive data/code |
| `SYSTEM/` | Architecture documentation | You want AI to understand PAI internals |

---

## After Comparison

### To adopt a new section:

1. Read the canonical template section
2. Customize the content for your situation
3. Add to your local file
4. (Don't push personal content to PAI source)

### To adopt a new file:

1. Copy the template file to your installation
2. Replace placeholder values with your information
3. Update any skill references if needed

### To track what you've reviewed:

Add to your manifest:

```json
"template_comparisons": [
  {
    "date": "2026-01-11",
    "file": "skills/CORE/SKILL.md",
    "template_version": "pai-core-install v1.4.0",
    "new_sections_found": ["Personality Calibration", "Examples"],
    "adopted": ["Personality Calibration"],
    "skipped": ["Examples"],
    "notes": "Added personality traits, skipped examples as not needed"
  }
]
```

---

## Quick Commands

```bash
# Set your paths
PAI_DIR=~/.claude
PAI_SOURCE=~/proj/personal/PAI

# Compare CORE skill headings
diff <(grep -E '^#{1,3} ' $PAI_DIR/skills/CORE/SKILL.md) \
     <(grep -E '^#{1,3} ' $PAI_SOURCE/Packs/pai-core-install/src/skills/CORE/SKILL.md)

# List new CORE files
comm -23 \
  <(find $PAI_SOURCE/Packs/pai-core-install/src/skills/CORE -name "*.md" -exec basename {} \; | sort) \
  <(find $PAI_DIR/skills/CORE -name "*.md" -exec basename {} \; | sort)

# Full structure comparison
tree $PAI_SOURCE/Packs/pai-core-install/src/skills/CORE
tree $PAI_DIR/skills/CORE
```

---

## AI Agent Instructions

When running this comparison:

1. **Set paths first** — Confirm `$PAI_DIR` (installation) and `$PAI_SOURCE` (PAI repo) locations

2. **Check manifest** — Look for `template_derived` mappings in `pai-manifest.json`

3. **Compare systematically** — Go through each mapping, extract headings, identify gaps

4. **Highlight opportunities** — Focus on new features the user might want, not just differences

5. **Be specific** — Show exact section names, field names, file paths

6. **Respect personalization** — User's custom content is intentional; focus on *additions* they might want, not *differences* from template

7. **Don't auto-modify** — Present findings and let user decide what to adopt

---

*Part of the [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/PAI) project.*
