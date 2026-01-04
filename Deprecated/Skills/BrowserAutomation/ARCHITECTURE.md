# BrowserAutomation Architecture Analysis & Optimization

**Author:** Architect Agent
**Date:** 2025-12-20
**Status:** Constitutional Review Complete

---

## Executive Summary

The BrowserAutomation skill has fundamental performance issues stemming from:
1. **Stagehand version lag** (v2.5.2 vs latest v3.0.6 - major version behind)
2. **Suboptimal token usage** (using ANTHROPIC_API_KEY instead of CLAUDE_CODE_OAUTH_TOKEN)
3. **Cold-start initialization overhead** (~15 seconds on first command)
4. **Per-command process spawning** (new Node.js process per CLI invocation)
5. **Missing integration points** with QATester, Engineer, and CORE validation requirements

---

## Current Architecture Analysis

### 1. Code Flow (Current - Slow)

```
User Request
    ↓
Claude Code (main agent)
    ↓
Bash: `browser navigate <url>`  ← NEW process spawned
    ↓
Node.js cold start (~3 seconds)
    ↓
Load dotenv, parse .env
    ↓
Check for Chrome running
    ↓
If not: spawn Chrome (~5 seconds)
    ↓
Wait for CDP ready (50 retries × 300ms = up to 15 seconds)
    ↓
Initialize Stagehand (~2 seconds)
    ↓
Wait for page ready (up to 30 retries × 100ms)
    ↓
Execute command
    ↓
process.exit(0)  ← PROCESS DIES
    ↓
Next command: REPEAT ALL OF THE ABOVE
```

**Total first-command latency:** 15-25 seconds
**Subsequent commands (if Chrome stays up):** 5-10 seconds each (still re-initializing Stagehand)

### 2. Token Usage (Inefficient)

Current implementation in `browser-utils.ts`:

```typescript
// Priority order (CURRENT):
1. ANTHROPIC_API_KEY from environment
2. ANTHROPIC_API_KEY from .env file
3. Claude Code keychain token (as fallback)
```

**Issue:** The skill's `.env` file contains `ANTHROPIC_API_KEY` which is a billed API key. Meanwhile, `CLAUDE_CODE_OAUTH_TOKEN` is available in `~/.claude/.env` which is tied to Daniel's Claude subscription - **free for included usage**.

### 3. Stagehand Version (Outdated)

| Current | Latest | Gap |
|---------|--------|-----|
| 2.5.2 | 3.0.6 | Major version behind |

Stagehand 3.x includes:
- Improved caching strategies
- Better element detection
- Performance optimizations
- Updated Claude model support

### 4. Constitutional Compliance Issues

The skill documentation references `browser` CLI commands, but:
- CORE/SKILL.md references **Chrome MCP** as the exclusive tool
- QATesterContext.md references `mcp__claude-in-chrome__*` tools
- METHODOLOGY.md references "Chrome MCP tools" throughout

**There's a naming/tool mismatch** that creates confusion about which tool to use.

---

## Root Cause Analysis

### Why Is It Slow?

1. **Process-per-command architecture**
   - Each `browser <command>` spawns a new Node.js process
   - Even with Chrome persistent, Stagehand reinitializes each time
   - No connection pooling or state persistence

2. **Synchronous initialization**
   - Chrome profile copying happens on first run (can take 30+ seconds)
   - CDP connection polling is blocking
   - No background initialization

3. **API key lookup overhead**
   - Multiple filesystem reads to find credentials
   - Could be cached once per session

4. **No MCP integration**
   - BrowserAutomation is a bash CLI tool
   - MCP servers maintain persistent connections
   - Switching to MCP would eliminate per-command overhead

---

## Proposed Architecture

### Option A: Keep CLI, Optimize for Speed (Recommended Short-Term)

```
┌─────────────────────────────────────────────────────────┐
│                     Claude Code                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              BrowserAutomation Skill                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │  SKILL.md - Unified interface documentation      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│          Persistent Browser Daemon (NEW)                │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │
│  │ HTTP API   │→ │ Stagehand  │→ │ Chrome (CDP)   │    │
│  │ :9223      │  │ Singleton  │  │ :9222          │    │
│  └────────────┘  └────────────┘  └────────────────┘    │
│  - OAuth token loaded once                              │
│  - Stagehand stays initialized                          │
│  - Chrome connection persisted                          │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- CLI commands become thin HTTP calls (~50ms)
- Daemon manages Chrome lifecycle
- Single Stagehand instance, reused
- OAuth token loaded once at startup

### Option B: Native MCP Server (Recommended Long-Term)

```
┌─────────────────────────────────────────────────────────┐
│                     Claude Code                          │
│              mcp__browser-automation__*                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│          Browser Automation MCP Server                   │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Tools:                                          │    │
│  │  - navigate(url)                                 │    │
│  │  - act(action)                                   │    │
│  │  - extract(instruction, schema)                  │    │
│  │  - observe(query)                                │    │
│  │  - screenshot()                                  │    │
│  │  - close()                                       │    │
│  └─────────────────────────────────────────────────┘    │
│  - Persistent connection                                │
│  - Zero per-call overhead                               │
│  - OAuth token from environment                         │
│  - Stagehand singleton                                  │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- Native Claude Code integration
- Automatic tool discovery
- Zero CLI process overhead
- Matches QATester/METHODOLOGY expectations

---

## Speed Optimization Recommendations

### 1. Use OAuth Token (Immediate Fix)

**Change in `.env`:**
```bash
# DELETE: ANTHROPIC_API_KEY=sk-ant-api03-...
# ADD (or use from ~/.claude/.env):
ANTHROPIC_API_KEY=${CLAUDE_CODE_OAUTH_TOKEN}
```

**Better: Update `getAnthropicApiKey()` priority:**
```typescript
export function getAnthropicApiKey(): { apiKey: string; source: string } | null {
  // Priority 1: CLAUDE_CODE_OAUTH_TOKEN (subscription, preferred)
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { apiKey: process.env.CLAUDE_CODE_OAUTH_TOKEN, source: 'oauth' };
  }
  // Priority 2: Claude Code keychain
  const claudeCodeKey = getClaudeCodeApiKey();
  if (claudeCodeKey) {
    return { apiKey: claudeCodeKey, source: 'keychain' };
  }
  // Priority 3: ANTHROPIC_API_KEY (fallback)
  if (process.env.ANTHROPIC_API_KEY) {
    return { apiKey: process.env.ANTHROPIC_API_KEY, source: 'env' };
  }
  return null;
}
```

### 2. Update Stagehand Version

```bash
cd ~/.claude/plugins/marketplaces/browser-tools
pnpm update @browserbasehq/stagehand@^3.0.6
pnpm run build
```

### 3. Implement Daemon Mode

Create `src/daemon.ts`:
```typescript
// HTTP server on localhost:9223
// Keeps Stagehand initialized
// CLI commands become: curl http://localhost:9223/navigate?url=...
// Latency drops from 5-15s to <100ms
```

### 4. Background Chrome Prewarming

On session start, pre-launch Chrome:
```bash
# In CORE session initialization hook
~/.claude/plugins/marketplaces/browser-tools/dist/src/cli.js prewarm &
```

This starts Chrome and Stagehand in background, ready for first command.

---

## Integration Design

### QATester Agent Integration

**Current (Broken):**
- QATesterContext.md references `mcp__claude-in-chrome__*`
- This tool doesn't exist - it's the BrowserAutomation skill

**Fix - Update QATesterContext.md:**
```markdown
## Browser Automation (Constitutional Requirement)

**BrowserAutomation skill is THE EXCLUSIVE TOOL.**

**Standard Validation Flow:**
1. `browser navigate <url>` - Navigate to target
2. `browser screenshot` - Capture current state
3. Read screenshot with Read tool - Visual verification
4. `browser act "<action>"` - Test interactions
5. `browser observe "<query>"` - Discover elements
6. `browser close` - Clean up when done
```

### Engineer Agent Integration

**Add to EngineerContext.md:**
```markdown
## Browser Validation (Gate 3 - Required for Web Work)

Before claiming web work complete:
1. `browser navigate http://localhost:<port>`
2. `browser screenshot` - Capture rendered state
3. Read screenshot - Verify visual correctness
4. `browser act "check console for errors"` (via observe)
5. If errors found, fix and repeat
```

### CORE Integration

**Update CORE/SKILL.md Web Validation section:**
```markdown
### Browser Automation Usage

**Tool:** BrowserAutomation skill (`~/.claude/Skills/BrowserAutomation/`)
**Commands:** `browser navigate`, `browser act`, `browser extract`, `browser observe`, `browser screenshot`, `browser close`

**Example Workflow:**
```bash
browser navigate http://localhost:5173
# View the screenshot output
browser act "click the login button"
browser screenshot
# Read the screenshot to verify
browser close
```
```

---

## Updated SKILL.md Structure

The SKILL.md needs restructuring for clarity:

```markdown
---
name: Browser Automation
description: [same]
allowed-tools: Bash
---

# Browser Automation

## Quick Start (TL;DR)

```bash
browser navigate https://example.com
browser screenshot
browser act "click the Sign In button"
browser extract "get the page title"
browser close
```

## Constitutional Mandate

This skill implements Article IX (Integration-First Testing). Browser automation
is THE EXCLUSIVE tool for web validation. Never use curl/fetch for visual verification.

## Speed Tips

1. **Keep browser open** - Don't close between related commands
2. **Use observe sparingly** - It's slower than act
3. **Batch screenshots** - One after your action sequence, not each step

## Command Reference

[existing content]

## Integration Points

### For QATester Agents
[validation workflow]

### For Engineer Agents
[Gate 3 verification]

### For Main Claude Code Agent
[CORE web validation requirements]
```

---

## Implementation Roadmap

### Phase 1: Immediate Fixes (Today)
1. Delete `~/.claude/Skills/BrowserAutomation/.env` (force OAuth lookup)
2. Update `browser-utils.ts` to prioritize CLAUDE_CODE_OAUTH_TOKEN
3. Update Stagehand to v3.0.6
4. Rebuild: `pnpm install && pnpm run build`

### Phase 2: Short-Term Optimization (This Week)
1. Implement daemon mode with HTTP API
2. Add `browser prewarm` command for background initialization
3. Add to CORE session hooks to auto-prewarm

### Phase 3: Long-Term (MCP Server)
1. Create native MCP server for browser automation
2. Register as `mcp__browser-automation`
3. Update all agent contexts to use MCP tools
4. Deprecate CLI interface

### Phase 4: Agent Context Updates
1. Update QATesterContext.md with correct tool references
2. Update EngineerContext.md with Gate 3 browser validation
3. Update CORE/SKILL.md Web Validation section
4. Update METHODOLOGY.md to reference BrowserAutomation skill

---

## Performance Targets

| Metric | Current | Target (Daemon) | Target (MCP) |
|--------|---------|-----------------|--------------|
| First command | 15-25s | 3-5s | <1s |
| Subsequent commands | 5-10s | <100ms | <100ms |
| Screenshot | 1-2s | <500ms | <500ms |
| Memory footprint | 500MB | 500MB | 300MB |

---

## Risk Assessment

### High Risk
- **Breaking existing workflows:** Changing tool names breaks automation scripts
  - Mitigation: Maintain CLI interface, add MCP as additional interface

### Medium Risk
- **Chrome profile corruption:** Daemon mode could lock profile
  - Mitigation: Use fresh profile, not user's main Chrome profile

### Low Risk
- **API token changes:** OAuth tokens have different rate limits
  - Mitigation: Monitor usage, fall back to API key if needed

---

## Summary

The BrowserAutomation skill is fundamentally sound but needs optimization:

1. **Token Usage:** Switch to CLAUDE_CODE_OAUTH_TOKEN (subscription-based)
2. **Version:** Update Stagehand to v3.0.6
3. **Architecture:** Implement daemon mode for persistent connections
4. **Integration:** Update agent contexts with correct tool references

This is a constitutional requirement - browser automation MUST be used for all web validation. The current performance issues are blocking efficient QA workflows and need immediate attention.
