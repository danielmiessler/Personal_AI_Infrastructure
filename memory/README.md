# PAI Memory System

Auto-loaded memory files that persist across sessions.

## Purpose

The memory system allows PAI to retain learnings, workflows, and patterns across conversations. Memory files are automatically loaded at session start and can be updated during conversations.

## Files

- **MEMORY.md** - Main memory file with core learnings (auto-loaded, first 200 lines)
- **workflows.md** - Detailed workflow documentation for complex tasks

## Structure

Memory should be:
- **Concise** - Keep MEMORY.md under 200 lines (truncated after that)
- **Semantic** - Organize by topic, not chronologically
- **Actionable** - Focus on learnings that improve future performance
- **Updated** - Remove outdated information, keep fresh

## Usage

Memory files are located at: `~/.claude/projects/-home-txmyer/memory/`

To update memory during a conversation:
```
User: "update yourself"
Eko: [reads current memory, captures new learnings, updates files]
```

## Current Learnings

See individual files for detailed content:
- Fabric pattern formatting requirements
- YouTube wisdom extraction workflows
- Notion integration patterns
- Workaround strategies for missing tools

## Last Updated

February 7, 2026
