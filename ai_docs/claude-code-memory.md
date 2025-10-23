# Claude Code Memory Management

## Overview

Claude Code enables persistent memory across sessions through a hierarchical system of memory files that store preferences, instructions, and workflows.

## Memory Types and Locations

The system implements four memory levels with the following purposes:

### Enterprise Policy (highest priority)

- **macOS**: `/Library/Application Support/ClaudeCode/CLAUDE.md`
- **Linux**: `/etc/claude-code/CLAUDE.md`
- **Windows**: `C:\ProgramData\ClaudeCode\CLAUDE.md`
- **Purpose**: Organization-wide instructions for all users

### Project Memory

- **Location**: `./CLAUDE.md` or `./.claude/CLAUDE.md`
- **Purpose**: Team-shared instructions via source control
- **Use Case**: Project-specific coding standards and workflows

### User Memory

- **Location**: `~/.claude/CLAUDE.md`
- **Purpose**: Personal preferences across all projects

### Project Local Memory (deprecated)

- **Location**: `./CLAUDE.local.md`
- **Purpose**: Individual project preferences (replaced by imports)

## Key Features

### CLAUDE.md Imports

Files support importing additional documentation using `@path/to/file` syntax, enabling modular memory organization. Imports support up to 5 levels of recursion and work with both relative and absolute paths.

### Memory Lookup

Claude Code recursively searches from the current working directory upward to discover CLAUDE.md files, plus any files in subdirectories under the current location.

### Quick Addition

Starting input with `#` triggers a prompt to save text to the appropriate memory file.

### Direct Editing

The `/memory` slash command opens memory files in your system editor.

## Setup and Best Practices

### Initialization

Initialize project memory with `/init` command to bootstrap a CLAUDE.md file. Include:
- Frequently used commands
- Code style preferences
- Architectural patterns

### Memory Best Practices

- **Specificity**: "Use 2-space indentation" outperforms vague guidance
- **Structured Organization**: Use bullet points and markdown headings
- **Periodic Reviews**: Update memory as projects evolve
