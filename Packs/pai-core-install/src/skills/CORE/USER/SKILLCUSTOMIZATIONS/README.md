# Skill Customizations

**Per-Skill Preference Overrides**

This directory allows you to customize how individual skills behave without modifying the skills themselves.

---

## Structure

```
SKILLCUSTOMIZATIONS/
├── Art/
│   └── PREFERENCES.md      # Your aesthetic preferences
├── Browser/
│   └── PREFERENCES.md      # Browser automation settings
├── Development/
│   └── PREFERENCES.md      # Coding style preferences
└── [SkillName]/
    └── PREFERENCES.md      # Custom preferences for any skill
```

---

## How It Works

1. When a skill loads, it checks for `USER/SKILLCUSTOMIZATIONS/{SkillName}/`
2. If PREFERENCES.md exists, those preferences are applied
3. Your customizations persist across PAI updates

---

## Example: Art Skill Preferences

```markdown
# Art Skill Preferences

## Aesthetic Style
- Prefer minimalist, clean designs
- Blue and purple color palette
- Avoid overly complex illustrations

## Image Generation
- Default to 1024x1024 resolution
- Always use --remove-bg for icons
- Prefer flat icon style over 3D
```

---

## Getting Started

1. Create a directory matching the skill name: `mkdir Art/`
2. Create PREFERENCES.md inside it
3. Document your preferences in any format
4. The skill will read and apply them automatically
