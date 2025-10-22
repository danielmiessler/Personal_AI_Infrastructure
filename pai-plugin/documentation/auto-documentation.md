# Automatic Documentation Updates

## Overview

The PAI repository includes an automatic documentation update system that runs as part of the pre-commit git hook. This system ensures that documentation stays in sync with code changes without manual intervention.

## How It Works

### Pre-Commit Hook Flow

When you commit changes, the pre-commit hook:

1. **Security Scan** (First)
   - Scans for sensitive content (API keys, credentials, personal data)
   - **BLOCKS commit if sensitive content detected**
   - See `.git/hooks/pre-commit` for full security patterns

2. **Documentation Update** (After security passes)
   - Analyzes which files changed in your commit
   - Determines which documentation areas are affected
   - Automatically updates relevant documentation files
   - Auto-stages the updated docs to include in the commit
   - **Non-blocking** - warns if update fails but allows commit

### File-to-Documentation Mapping

The system automatically maps changed files to documentation updates:

| Changed Files | Updated Documentation |
|--------------|----------------------|
| `skills/**` | `documentation/skills-system.md` |
| `commands/**` | `documentation/command-system.md` |
| `hooks/**` | `documentation/hook-system.md` |
| `agents/**` | `documentation/agent-system.md` |
| `voice-server/**` | `documentation/voice-system.md` |
| `package.json` | Dependencies section |
| `.mcp.json` | MCP servers documentation |
| Any non-doc file | `README.md` (timestamp) |

### What Gets Updated

For each affected documentation file:
- Adds/updates a `<!-- Last Updated: YYYY-MM-DD -->` timestamp
- Updates are minimal and non-destructive
- Only modifies metadata, not content

For README.md:
- Updates the "Recent Updates" section with change summary
- Reflects which areas were modified

## Installation

### Method 1: Automatic Setup

```bash
bun run setup.sh
```

This will:
- Copy the pre-commit hook template to `.git/hooks/pre-commit`
- Make it executable
- Verify bun is installed
- Test the hook

### Method 2: Manual Installation

```bash
# Copy the enhanced pre-commit hook
cp hooks/pre-commit-with-docs.template .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit

# Verify it works
git add <some-file>
git commit -m "test: Verify auto-documentation"
```

### Method 3: Integrate with Existing Hook

If you already have a custom pre-commit hook:

```bash
# Edit your existing .git/hooks/pre-commit and add:

# After your existing logic, before exit 0:
if [ -f "hooks/update-documentation.ts" ]; then
    bun run hooks/update-documentation.ts || true
fi
```

## Testing

### Test the Documentation Updater Directly

```bash
# Stage some changes
git add skills/some-skill.md

# Run the updater manually
bun run hooks/update-documentation.ts

# Check what it would update
git status
```

### Test the Full Pre-Commit Hook

```bash
# Make a change to a skill
echo "# Test" >> skills/PAI/test.md

# Stage and commit
git add skills/PAI/test.md
git commit -m "test: Verify auto-doc updates"

# You should see:
# ✅ Security scan passed
# ✅ Documentation updated (skills-system.md, README.md)
# ✅ 3 files changed (your change + 2 auto-updated docs)
```

## Configuration

### Excluded Files

The updater automatically excludes these from triggering updates:
- `documentation/**` - Documentation files themselves
- `README.md` - The README itself
- `hooks/update-documentation.ts` - The updater script itself

This prevents circular updates and infinite loops.

### Customizing File Mappings

To add custom file-to-doc mappings, edit `hooks/update-documentation.ts`:

```typescript
// In analyzeChanges() function:
if (file.startsWith('your-directory/')) {
  affectedAreas.add('your-area');
  needsDocUpdate.set('documentation/your-doc.md', true);
}
```

## Bypassing the Hook

### For Documentation-Only Commits

The hook automatically detects when you're only changing documentation files and skips the update phase:

```bash
git add documentation/some-doc.md
git commit -m "docs: Update documentation"
# ✅ Skips auto-update (no code changes)
```

### For Emergency Commits (Not Recommended)

```bash
git commit --no-verify -m "emergency: Skip all hooks"
```

**⚠️ WARNING**: This bypasses BOTH security scanning AND documentation updates!

## Benefits

### ✅ Always-Current Documentation
- Documentation timestamps always reflect latest code changes
- No manual "remember to update docs" step required
- Clear audit trail of when docs were last touched

### ✅ Zero Developer Overhead
- Completely automatic - no action required
- Non-blocking - doesn't interrupt workflow
- Smart detection - only updates what's relevant

### ✅ Clean Commit History
- Documentation updates bundled with code changes
- No separate "update docs" commits cluttering history
- All related changes in one atomic commit

### ✅ Team Consistency
- Everyone gets automatic doc updates
- No reliance on developers remembering to update docs
- Enforced via git hooks (automatic after repo clone)

## Troubleshooting

### Hook Doesn't Run

```bash
# Check if hook exists and is executable
ls -la .git/hooks/pre-commit

# If missing, reinstall:
cp hooks/pre-commit-with-docs.template .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Hook Runs But Doesn't Update Docs

```bash
# Test the updater directly
bun run hooks/update-documentation.ts

# Check for errors
git add some-file.ts
bun run hooks/update-documentation.ts
```

### Documentation Not Staged

The hook should auto-stage updated docs. If not:

```bash
# Check git status after hook runs
git status

# Manually stage if needed
git add documentation/*.md README.md
```

### Bun Not Found

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
which bun
bun --version
```

## Advanced Usage

### CI/CD Integration

For GitHub Actions, add to your workflow:

```yaml
- name: Check Documentation Sync
  run: |
    bun run hooks/update-documentation.ts
    if ! git diff --quiet; then
      echo "Documentation out of sync!"
      git diff
      exit 1
    fi
```

### Post-Commit Documentation

If you prefer post-commit updates (not recommended), see research on handling the "commit after commit" problem in:
- GitHub Actions workflows (recommended)
- Post-commit with environment variable guards
- Post-commit with --amend (solo dev only)

## Architecture

### Files

- `hooks/update-documentation.ts` - Main documentation updater script
- `hooks/pre-commit-with-docs.template` - Git hook template
- `.git/hooks/pre-commit` - Active git hook (not tracked)
- `documentation/*.md` - Documentation files that get updated

### Flow Diagram

```
Developer runs: git commit
           ↓
    Pre-commit hook triggers
           ↓
    ┌──────────────────────┐
    │  Security Scan       │
    │  (Blocks if fails)   │
    └──────────────────────┘
           ↓ Pass
    ┌──────────────────────┐
    │  Analyze Changes     │
    │  (Which files?)      │
    └──────────────────────┘
           ↓
    ┌──────────────────────┐
    │  Update Docs         │
    │  (Add timestamps)    │
    └──────────────────────┘
           ↓
    ┌──────────────────────┐
    │  Stage Updated Docs  │
    │  (Auto git add)      │
    └──────────────────────┘
           ↓
       Commit proceeds
    (Code + Updated Docs)
```

## Future Enhancements

### Planned Features
- [ ] AI-powered documentation content updates (not just timestamps)
- [ ] Analyze git diffs with LLM to determine what docs need rewriting
- [ ] Auto-generate changelog entries from conventional commits
- [ ] Update code examples in documentation based on actual code changes
- [ ] Detect broken links in documentation
- [ ] Validate code blocks in markdown compile correctly

### Potential AI Integration
```typescript
// Future: Use Claude API to analyze changes
const analysis = await analyzeWithClaude(gitDiff);
const docUpdates = analysis.suggestedUpdates;

for (const update of docUpdates) {
  await applyDocUpdate(update.file, update.changes);
}
```

See research findings in: (research conducted 2025-10-18)
- Claude Auto-Commit (npm package)
- readme-ai (multi-LLM README generation)
- Aider (terminal-based AI pair programmer)

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0
**Status**: Production-ready ✅
