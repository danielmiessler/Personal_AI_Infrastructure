---
provenance: template
---

# Skill Customizations

**Purpose:** Per-skill overrides — the place to change a default skill behavior without forking the skill itself.

**What lives here:** One subdir per customized skill, named to match the skill (e.g. `CUSTOMIZATIONS/SKILLS/<SkillName>/`). Each skill that supports customization documents which files it reads from its override dir — typically configuration, templates, or prompt fragments that the skill merges over its defaults at runtime.

**How it gets populated:** By the user explicitly. You only create a subdir here when you actively want to override a skill's default behavior; otherwise leave this dir empty and skills will run with their shipped defaults.

**Sample state for fresh installs:** Empty / Just this README. Real content appears as you use LifeOS.
