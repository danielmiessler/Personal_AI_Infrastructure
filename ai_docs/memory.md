# Claude Code Memory Management

## Overview

Claude Code supports persistent memory across sessions through a hierarchical system of memory files that store preferences, instructions, and workflows.

## Memory Types (Hierarchical)

The system uses four memory locations, with higher-level entries taking precedence:

### 1. Enterprise Policy
Organization-wide instructions at system level

**Locations:**
- macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
- Linux: `/etc/claude-code/CLAUDE.md`
- Windows: `C:\ProgramData\ClaudeCode\CLAUDE.md`

### 2. Project Memory
Team-shared instructions via source control

**Location:** `./CLAUDE.md` or `./.claude/CLAUDE.md`

### 3. User Memory
Personal preferences across all projects

**Location:** `~/.claude/CLAUDE.md`

### 4. Project Memory (Local)
Deprecated; use imports instead

**Location:** `./CLAUDE.local.md`

## Key Features

### CLAUDE.md Imports
Files can import additional content using `@path/to/import` syntax, supporting both relative and absolute paths. Imports work recursively up to 5 levels deep but aren't evaluated within code spans or blocks.

### Memory Discovery
Claude Code recursively searches from the current working directory upward (excluding root) for CLAUDE.md and CLAUDE.local.md files, plus discovers files in subdirectories when reading those locations.

### Quick Addition
Start input with `#` to quickly add a memory entry and select the target file.

### Direct Editing
Use `/memory` slash command to open memory files in your system editor.

### Project Setup
Run `/init` to bootstrap a CLAUDE.md file for your codebase.

## Best Practices

- Be specific with instructions (e.g., "Use 2-space indentation" rather than vague guidance)
- Structure memories with bullet points under descriptive markdown headings
- Review periodically as projects evolve to maintain relevance

---

**Source:** https://docs.claude.com/en/docs/claude-code/memory
