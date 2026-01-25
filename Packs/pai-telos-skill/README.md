---
name: TELOS Life Operating System
pack-id: danielmiessler-pai-telos-skill-v2.3
version: 2.3
author: danielmiessler
description: Life OS and project analysis framework for managing goals, beliefs, projects, and personal context
type: skill
purpose-type: [life-management, project-analysis, personal-development]
platform: claude-code
dependencies: [pai-core-install]
keywords: [telos, life-os, goals, beliefs, projects, wisdom, personal-context]
---

<p align="center">
  <img src="../icons/pai-telos-skill.png" alt="TELOS Skill" width="256">
</p>

# TELOS Life Operating System

> A comprehensive framework for managing life context (beliefs, goals, lessons, wisdom) and analyzing projects/organizations.

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using `INSTALL.md`.

---

## What This Pack Provides

**TELOS** (Telic Evolution and Life Operating System) has two applications:

1. **Personal TELOS** - Your life context system stored at `~/.claude/skills/CORE/USER/TELOS/`
2. **Project TELOS** - Analysis framework for organizations/projects

### Capabilities

- **Life Context Management** - Track beliefs, goals, lessons, wisdom, books, movies
- **Automatic Backups** - Every update creates timestamped backups
- **Project Analysis** - Scan directories for relationships and dependencies
- **Dashboard Generation** - Build interactive UIs from TELOS data
- **McKinsey-Style Reports** - Generate professional consulting reports

---

## Architecture

```
~/.claude/skills/Telos/          # Skill definition (this pack)
├── SKILL.md                      # Skill routing
├── Workflows/
│   ├── Update.md                 # Update TELOS files
│   ├── WriteReport.md            # McKinsey-style reports
│   ├── CreateNarrativePoints.md  # Narrative extraction
│   └── InterviewExtraction.md    # Interview analysis
└── DashboardTemplate/            # Next.js dashboard template

~/.claude/skills/CORE/USER/TELOS/ # Your personal content (private)
├── BELIEFS.md                    # Core beliefs
├── GOALS.md                      # Life goals
├── BOOKS.md                      # Favorite books
├── PROJECTS.md                   # Active projects
└── ... (15+ files)
```

**Key Point:** The skill is the operator; personal content stays in CORE/USER/TELOS.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Skill Definition | src/SKILL.md | Routing and documentation |
| Update Workflow | src/Workflows/Update.md | Add/modify TELOS entries |
| Report Workflow | src/Workflows/WriteReport.md | Professional report generation |
| Narrative Workflow | src/Workflows/CreateNarrativePoints.md | Extract story points |
| Interview Workflow | src/Workflows/InterviewExtraction.md | Analyze interviews |
| Dashboard Template | src/DashboardTemplate/ | Next.js dashboard scaffold |

---

## Usage Examples

**Add a book to TELOS:**
```
"Add Project Hail Mary to my TELOS books"
```

**Update goals:**
```
"Update my TELOS goals with: Launch SaaS product by Q2"
```

**Analyze a project:**
```
"Analyze ~/Projects/MyApp with TELOS"
```

**Generate a report:**
```
"Create a TELOS report for Acme Corp"
```

---

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production PAI system
- **License:** MIT

## Changelog

### 2.3 - 2026-01-15
- Initial public release
- Sanitized all personal references to use `{principal.name}`
- Fixed paths to reference `CORE/USER/TELOS/`
- Removed personal workflows (AnalyzeProjectWithGemini3, VoiceNarrative)
