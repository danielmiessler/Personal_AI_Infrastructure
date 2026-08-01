---
provenance: template
---

# USER/ — Your Identity Layer

This directory holds everything LifeOS knows about you: identity, voice,
goals, projects, work context. Files here are loaded by `CLAUDE.md`
@-imports at every session start, so the DA boots aware of who you
are and what you're working on.

## Layout

```
LIFEOS/USER/
├── PRINCIPAL_IDENTITY.md   # Concise identity (loaded at startup)
├── DA_IDENTITY.md          # Your DA's name, voice, personality (loaded at startup)
├── PROJECTS/PROJECTS.md    # Project registry + routing aliases (loaded at startup)
├── TELOS/PRINCIPAL_TELOS.md # Goals, missions, strategies (loaded at startup)
├── Config/LIFEOS_CONFIG.yaml  # Credentials and config keys
├── RESUME.md               # Career detail
├── CONTACTS.md             # People you work with
├── WRITINGSTYLE.md         # How you write
├── RHETORICALSTYLE.md      # How you argue
├── OPINIONS.md             # Your DA's opinions on working with you
├── DEFINITIONS.md          # Canonical terms in your vocabulary
├── CORECONTENT.md          # The themes you write/talk about
├── AI_WRITING_PATTERNS.md  # Writing patterns to avoid
├── ARCHITECTURE.md         # How your LifeOS fits together
├── FEED.md                 # Sources you read
├── PRONUNCIATIONS.md       # Words the DA needs to say correctly
└── (subdirs) BUSINESS/, FINANCES/, HEALTH/, TELOS/...
```

## Bootstrap

Files arrive as scaffolds. Run `/interview` to populate them with your
real answers. The interview is incremental — you can stop and resume.

## Privacy

Everything in this directory is **private** and never ships in any LifeOS
release. The release builder
deletes the entire `USER/` tree from staging and overlays generic
scaffolds in its place.
