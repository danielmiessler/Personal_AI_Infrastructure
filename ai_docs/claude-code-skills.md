# Agent Skills - Claude Code Documentation

## Overview

Agent Skills are modular capabilities that extend Claude's functionality in Claude Code. They consist of a `SKILL.md` file with instructions, plus optional supporting files like scripts and templates.

**Key distinction**: Skills are model-invoked (Claude autonomously decides when to use them), unlike slash commands which are user-invoked.

## Creating Skills

### Storage Locations

- **Personal Skills**: `~/.claude/skills/my-skill-name/`
- **Project Skills**: `.claude/skills/my-skill-name/` (shared via git)
- **Plugin Skills**: Bundled with installed plugins

### SKILL.md Structure

Required YAML frontmatter with:
- `name`: Lowercase, alphanumeric with hyphens (max 64 chars)
- `description`: What the skill does and when to use it (max 1024 chars)

The description critically enables Claude's discovery—it should specify both functionality and usage triggers.

## Key Features

### Tool Restrictions

Use `allowed-tools` frontmatter to limit capabilities:

```yaml
allowed-tools: Read, Glob, Grep
```

This prevents unauthorized tool access without requiring permission requests.

### Supporting Files

Skills can include:
- Documentation files (reference.md, examples.md)
- Scripts and utilities
- Templates
- Claude loads additional files only when needed

## Team Collaboration

### Sharing via Git

1. Add skill to `.claude/skills/` in project
2. Commit and push to repository
3. Team members automatically receive skills on git pull

### Plugin Distribution

The recommended approach for broader sharing through plugin marketplaces.

## Troubleshooting

**Skills not activating**: Ensure descriptions are specific with concrete trigger terms (e.g., "Extract text from PDF files" rather than "Helps with documents").

**File path issues**: Verify correct directory structure and use Unix-style forward slashes.

**YAML validation**: Check for proper `---` delimiters, correct indentation (spaces, not tabs).

## Best Practices

- Keep each skill focused on one capability
- Write descriptive, trigger-rich descriptions
- Test with team members
- Document skill versions in SKILL.md
- Use plugins for team-wide distribution
