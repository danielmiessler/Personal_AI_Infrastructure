# USER Directory

**Your Personal Knowledge Base**

This directory stores information your AI needs about YOU. Content here is NEVER synced to public PAI—it's your private space that makes PAI truly personal.

---

## Directory Structure

```
USER/
├── README.md              ← You are here
│
├── ─── Identity & Preferences ───
├── ABOUTME.md             # Your bio, background, preferences
├── BASICINFO.md           # Basic personal information
├── DAIDENTITY.md          # Your DA's personality and voice
├── RESPONSEFORMAT.md      # Customize response format
├── PRODUCTIVITY.md        # Work habits, focus preferences
├── REMINDERS.md           # Standing reminders and alerts
│
├── ─── Professional Context ───
├── RESUME.md              # Professional background
├── CONTACTS.md            # People you work with
├── ASSETMANAGEMENT.md     # Digital assets, domains, sites
├── CORECONTENT.md           # Catalog of your published work
├── DEFINITIONS.md         # Domain-specific definitions
│
├── ─── Technical Preferences ───
├── TECHSTACKPREFERENCES.md # Languages, frameworks, tools
├── ARCHITECTURE.md        # System architecture preferences
├── ALGOPREFS.md           # Algorithm preferences
│
├── ─── Life Operating System ───
├── TELOS/                 # Complete life framework
│   ├── README.md          # How to use TELOS
│   ├── TELOS.md           # Master overview
│   ├── MISSION.md         # M# - Life missions
│   ├── GOALS.md           # G# - Specific objectives
│   ├── CHALLENGES.md      # C# - Current obstacles
│   ├── STRATEGIES.md      # S# - Approaches
│   ├── PROBLEMS.md        # P# - World problems to solve
│   ├── NARRATIVES.md      # N# - Talking points
│   ├── BELIEFS.md         # B# - Core beliefs
│   ├── FRAMES.md          # FR# - Useful perspectives
│   ├── MODELS.md          # MO# - Mental models
│   ├── TRAUMAS.md         # TR# - Formative experiences
│   ├── IDEAS.md           # I# - Ideas to explore
│   ├── PREDICTIONS.md     # Future predictions
│   ├── BOOKS.md           # Influential books
│   ├── MOVIES.md          # Influential films
│   ├── STATUS.md          # Current state snapshot
│   ├── LEARNED.md         # Lessons from experience
│   ├── WISDOM.md          # Collected insights
│   └── WRONG.md           # Things you've been wrong about
│
├── ─── Domain-Specific Data ───
├── HEALTH/                # Personal health tracking
│   └── README.md          # Templates for health files
├── FINANCES/              # Financial management
│   └── README.md          # Templates for finance files
├── BUSINESS/              # Business ventures
│   └── README.md          # Templates for business files
├── WORK/                  # Customer data, consulting, client deliverables
│   └── README.md          # Work data guide
│
├── ─── System Customization ───
├── SKILLCUSTOMIZATIONS/   # Per-skill customizations
│   ├── README.md          # How to customize skills
│   └── [SkillName]/       # Customizations for specific skills
├── PAISECURITYSYSTEM/     # Custom security patterns
│   └── README.md          # Security customization guide
├── TERMINAL/              # Terminal configuration
│   ├── README.md          # Terminal setup guide
│   ├── kitty.conf         # Kitty configuration
│   └── ZSHRC              # Shell configuration
└── STATUSLINE/            # Status line customization
    └── README.md          # Status line guide
```

---

## Quick Start

### Essential Files (Create First)

| Priority | File | Purpose |
|----------|------|---------|
| **1** | `ABOUTME.md` | Who you are, what you do |
| **2** | `DAIDENTITY.md` | Configure your DA's personality |
| **3** | `TELOS/MISSION.md` | Your core life purposes |
| **4** | `TECHSTACKPREFERENCES.md` | Your technical preferences |

### Optional Files (Add As Needed)

| File | When to Create |
|------|----------------|
| `CORECONTENT.md` | When you publish content (blog, video, etc) |
| `CONTACTS.md` | When you want AI to know your network |
| `HEALTH/` files | When tracking health |
| `FINANCES/` files | When managing finances |
| `BUSINESS/` files | When running a business |
| `WORK/` files | When doing consulting, client work, or need customer isolation |
| `SKILLCUSTOMIZATIONS/` | When customizing specific skills |

---

## Two-Tier Pattern

PAI uses a SYSTEM/USER two-tier pattern everywhere:

```
SYSTEM → Provides defaults (updated with PAI releases)
USER   → Your overrides (never overwritten)
```

### How It Works

1. PAI checks for a USER version first
2. If found, USER version is used
3. If not found, SYSTEM default is used
4. Your customizations are safe during PAI updates

### Examples

| Component | SYSTEM Default | USER Override |
|-----------|----------------|---------------|
| Response format | `SYSTEM/RESPONSEFORMAT.md` | `USER/RESPONSEFORMAT.md` |
| Security patterns | `PAISECURITYSYSTEM/` | `USER/PAISECURITYSYSTEM/` |
| Skill behavior | Skill's `SKILL.md` | `USER/SKILLCUSTOMIZATIONS/[Skill]/` |

---

## File Templates

### ABOUTME.md
```markdown
# About Me

## Who I Am
[Your name, background, what you do]

## Current Focus
[What you're working on right now]

## Preferences
- Communication style: [Direct / Detailed / etc]
- Work hours: [Timezone, availability]
- Interaction preferences: [How you like to work with AI]
```

### BASICINFO.md
```markdown
# Basic Information

- **Name:** [Your name]
- **Location:** [City, Country]
- **Timezone:** [Your timezone]
- **Languages:** [Languages you speak]
```

### DAIDENTITY.md
```markdown
# DA Identity

## Name
**Name:** [Your DA's name]

## Personality
[How your DA should interact - personality traits, communication style]

## Voice
- **ElevenLabs Voice ID:** [Voice ID for TTS]
- **Prosody:** [How the voice should sound]

## Relationship
[How you want to relate to your DA - assistant, collaborator, etc]
```

### CONTACTS.md
```markdown
# Contacts

## Work Contacts
| Name | Role | Relationship | Notes |
|------|------|--------------|-------|
| [Name] | [Title] | [How you know them] | [Key info] |

## Personal Contacts
| Name | Relationship | Notes |
|------|--------------|-------|
| [Name] | [Relationship] | [Key info] |
```

### CORECONTENT.md
```markdown
# Core Content

A catalog of your published work - your AI uses this to reference and cross-link your creations.

## Essential Reading
Your most important pieces that best represent your thinking.

| Title | URL | Topic |
|-------|-----|-------|
| [Title] | [URL] | [Topic] |

## Blog Posts / Articles
| Title | URL | Date | Topic |
|-------|-----|------|-------|
| [Title] | [URL] | [Date] | [Topic] |

## Videos
| Title | Platform | URL |
|-------|----------|-----|
| [Title] | YouTube | [URL] |

## Projects / Tools
| Name | URL | Description |
|------|-----|-------------|
| [Name] | [URL] | [What it does] |

## Social Profiles
| Platform | URL |
|----------|-----|
| Twitter/X | [URL] |
| YouTube | [URL] |
| Website | [URL] |
```

### TECHSTACKPREFERENCES.md
```markdown
# Tech Stack Preferences

## Languages
- **Primary:** [TypeScript / Python / etc]
- **Avoid:** [Languages you don't want]

## Frameworks
- **Web:** [Next.js / etc]
- **Backend:** [Bun / Node / etc]

## Tools
- **Editor:** [VS Code / Neovim / etc]
- **Terminal:** [Kitty / etc]
- **Browser:** [Arc / Chrome / etc]

## Deployment
- **Preferred:** [Cloudflare / Vercel / etc]
```

---

## Privacy Guarantee

Everything in this USER directory:

- ✅ Stays on your local machine
- ✅ Is never synced to public repositories
- ✅ Is only read by your local AI instance
- ✅ Survives PAI updates (never overwritten)
- ✅ Can be backed up/encrypted as you choose

The public PAI repository contains only empty templates in USER directories.

---

## Getting Started

1. **Start Small**: Create `ABOUTME.md` and `DAIDENTITY.md`
2. **Add TELOS**: Fill in `TELOS/MISSION.md` and `TELOS/GOALS.md`
3. **Customize**: Add skill customizations as needed
4. **Expand**: Add HEALTH/FINANCES/BUSINESS as relevant to your life

Your USER directory grows with you. Start with what you need now; add more as it becomes useful.

---

*See each subdirectory's README.md for detailed templates and guidance.*
