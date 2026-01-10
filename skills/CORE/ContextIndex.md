# Context Index

**Purpose:** Index of reference context files. Load on demand, not upfront.

This follows the Teresa Torres pattern: give Claude an index of where to find things, let it pull relevant files when needed. Keeps context window clean.

---

## Reference Files

| Topic | File | Load When |
|-------|------|-----------|
| **Personal identity & goals** | `Telos.md` | Bio questions, applications, goal setting, motivation |
| **Career history** | `Telos.md` (HISTORY section) | Resumes, introductions, "tell me about yourself" |
| **Active projects** | `Telos.md` (PROJECTS section) | Task planning, daily review, what am I working on |
| **Challenges & strategies** | `Telos.md` (CHALLENGES section) | Problem solving, blockers, motivation |
| **Tech stack preferences** | `CoreStack.md` | Implementation decisions, "which library", "what language" |
| **Contacts directory** | `Contacts.md` | People questions, "who is X", sending messages |
| **PAI architecture** | `PaiArchitecture.md` | System design, hooks, skills, how PAI works |
| **Skill system rules** | `SkillSystem.md` | Creating skills, skill structure, validation |
| **State sync** | `StateSync.md` | Multi-machine sync, what syncs where |

---

## External Context

| Topic | Location | Load When |
|-------|----------|-----------|
| **Future ideas** | `$PAI_DIR/docs/future-ideas.md` | "What should I work on", backlog review |
| **Research docs** | `$PAI_DIR/docs/*.md` | Topic-specific research |
| **Implementation plans** | `$PAI_DIR/plans/*.md` | Continuing work, plan execution |
| **Session history** | `$PAI_DIR/history/sessions/` | "What did we do last time" |

---

## Skill Discovery

| Need | How to Find |
|------|-------------|
| Which skill to use | `$PAI_DIR/skills/skill-index.json` |
| Skill capabilities | Read skill's `SKILL.md` |
| Workflow details | Read skill's `Workflows/*.md` |

---

## Usage Pattern

1. **Don't load everything** - Only load what's relevant to the current task
2. **Use the index** - Check this file to find where information lives
3. **Pull on demand** - Read specific files when topic comes up
4. **Keep global context tiny** - Session start loads minimal context

---

## Adding New Context

When adding new reference context:
1. Create the file in appropriate location
2. Add entry to this index with clear "Load When" trigger
3. Keep files focused - one topic per file
4. Use frontmatter for metadata if needed
