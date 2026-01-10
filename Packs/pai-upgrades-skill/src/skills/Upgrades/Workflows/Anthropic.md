# Anthropic Workflow

Check 30+ official Anthropic sources for updates relevant to PAI infrastructure.

## Process

### Step 1: Run the Anthropic Check Tool

```bash
bun ~/.claude/skills/Upgrades/Tools/Anthropic.ts
```

**Options:**
- No arguments: Check last 30 days (default)
- `14` or `7`: Check last N days
- `--force`: Ignore state, check all sources

### Step 2: Analyze Results

The tool outputs a prioritized report:
- 🔥 **HIGH PRIORITY** - Must-review features/changes for PAI
- 📌 **MEDIUM PRIORITY** - Interesting updates to check
- 📝 **LOW PRIORITY** - FYI information

### Step 3: Provide Recommendations

Based on the output, advise user on:
- What changed and why it matters for PAI
- Which updates to review immediately
- Specific actions to take (e.g., update skills, test new features)

## Sources Monitored

1. **Blogs & News** (4 sources) - Main blog, Alignment, Research, Interpretability
2. **GitHub Repositories** (21+ repos) - claude-code, skills, MCP, SDKs, cookbooks, courses
3. **Changelogs** (5 locations) - Claude Code CHANGELOG, releases, docs notes, MCP changelog
4. **Documentation** (6 sites) - Claude docs, API docs, MCP docs, spec, registry
5. **Community** (1 official) - Discord server

## State Tracking

State is stored in `state/last-check.json`:
- Last check timestamp
- Content hashes for each source
- Last seen commit SHAs, release versions, blog titles

This prevents duplicate reports - only NEW content is shown.
