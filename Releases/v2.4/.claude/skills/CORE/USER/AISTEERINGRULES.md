# AI Steering Rules - Personal

Personal behavioral rules for {PRINCIPAL.NAME}. These extend and override `SYSTEM/AISTEERINGRULES.md`.

These rules were derived from failure analysis of 84 rating 1 events (2026-01-08 to 2026-01-17).

---

## Rule Format

Statement
: The rule in clear, imperative language

Bad
: Detailed example of incorrect behavior showing the full interaction

Correct
: Detailed example of correct behavior showing the full interaction

---

## Use Fast CLI Utilities Over Legacy Tools

Statement
: When using Bash for file operations, always prefer modern Rust-based utilities over legacy POSIX tools. Use `fd` not `find`, `rg` not `grep`, `bat` not `cat`, `eza` not `ls`, `dust` not `du`.

Bad
: User asks to find all TypeScript files with "TODO" comments. AI runs `find . -name "*.ts" -exec grep -l "TODO" {} \;`. This takes 15 seconds on a large codebase. User waits unnecessarily.

Correct
: User asks to find all TypeScript files with "TODO" comments. AI runs `rg "TODO" --type ts -l`. This completes in under 1 second. User gets results immediately.

### Utility Mapping

| Task | Slow | Fast | Speed Gain |
|------|---------|---------|------------|
| File search | `find` | `fd` | ~4x faster |
| Text search | `grep` | `rg` | ~10x faster |
| File view | `cat` | `bat` | Syntax highlighting |
| Directory list | `ls` | `eza` | Git-aware, icons |
| Disk usage | `du` | `dust` | Visual tree |

### When CC Native Tools Apply

Claude Code's native tools (Grep, Glob, Read) are already optimized and should be used first. This rule applies when:
- Bash is explicitly required for piping/scripting
- Complex command chains need shell features
- Interactive terminal operations

### Exceptions

Legacy tools acceptable when:
- Writing portable scripts for systems without modern tools
- Inside Docker/CI with only POSIX tools
- Modern tool lacks needed functionality

---

## Verify All Browser Work Before Claiming Success

Statement
: NEVER claim a page is open, loading, working, finished, or completed without first using the Browser skill to take a screenshot and verify the actual state. Visual verification is MANDATORY before any claim of success for web-related work.

Bad
: User asks to open a blog post preview. AI runs `open "http://localhost:5174/drafts/my-post"` and immediately reports "Draft is now open for preview at localhost:5174/drafts/my-post". The page is actually a 404 but AI never checked.

Correct
: User asks to open a blog post preview. AI runs `open "http://localhost:5174/drafts/my-post"`, then runs `bun run ~/.claude/skills/Browser/Tools/Browse.ts "http://localhost:5174/drafts/my-post"` to get a screenshot. AI sees 404 in screenshot, reports the failure, and investigates why (e.g., VitePress doesn't serve /drafts/ path).

### What Requires Browser Verification

| Action | Verification Required |
|--------|----------------------|
| Opening a URL | Screenshot showing expected content |
| Deploying a website | Screenshot of production page |
| Verifying a fix works | Screenshot showing fix in action |
| Testing UI changes | Screenshot showing the change |
| Any "it's working" claim | Screenshot proving it's working |

### The Rule

**If you haven't SEEN it with Browser skill, you CANNOT claim it works.**

Saying "I opened the page" without a screenshot is lying. The page might be:
- 404 error
- Blank page
- Wrong content
- Error state
- Not what user expected

### Exceptions

None. This rule has no exceptions. Even if "it should work", verify it.

---

These rules extend `CORE/SYSTEM/AISTEERINGRULES.md`. Both must be followed.
