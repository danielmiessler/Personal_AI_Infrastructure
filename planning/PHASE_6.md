# Phase 6: Testing & Validation

**Duration:** ~1-2 hours
**Priority:** Critical (Quality assurance)
**Dependencies:** Phase 1-5 complete

---

## Objective

Ensure the plugin works correctly for both fresh installations and your personal setup migration through comprehensive testing and validation procedures.

---

## Tasks

### Task 6.1: Create TESTING.md

**File:** `pai-plugin/TESTING.md`

```markdown
# PAI-Boilerplate Testing Guide

## Testing Strategy

This document outlines comprehensive testing procedures for the PAI-Boilerplate plugin to ensure quality and reliability.

---

## Test Environments

### Environment 1: Fresh Installation
- Clean system without `~/.claude/`
- No prior PAI configuration
- Tests new user experience

### Environment 2: Existing Installation
- Existing `~/.claude/` with settings
- Tests migration and compatibility
- Tests upgrade scenarios

### Environment 3: Personal Setup (Your System)
- Your actual working configuration
- Tests backward compatibility
- Verifies no functionality loss

---

## Test Suites

### Suite 1: Installation Tests

#### Test 1.1: Fresh Install via Script
```bash
# Prerequisites: Clean ~/.claude/
rm -rf ~/.claude

# Execute
./install.sh

# Expected Results:
✅ Script completes without errors
✅ ~/.claude/ directory created
✅ settings.json created from template
✅ .mcp.json created from template
✅ Directory structure created (scratchpad/, context/)
✅ Configuration prompts work correctly
✅ User inputs applied to config files
```

#### Test 1.2: Manual Installation
```bash
# Follow INSTALL.md manual steps
# Verify each step completes successfully

✅ Plugin registered via /plugin install
✅ Configuration files copied manually
✅ Plugin loads in Claude Code
```

#### Test 1.3: Installation with Existing Config
```bash
# Prerequisites: Existing ~/.claude/settings.json
./install.sh

# Expected Results:
✅ Backup created before modifications
✅ User prompted about overwrite
✅ Existing data preserved
✅ No data loss
```

---

### Suite 2: Component Tests

#### Test 2.1: Agent Loading
```bash
claude

# Test each agent:
"Use the engineer agent to analyze this code"
"Use the architect agent to create a PRD"
"Use the designer agent to design a UI"
"Use the pentester agent to test security"
"Use the researcher agent to find information"
"Use the perplexity-researcher agent"
"Use the claude-researcher agent"
"Use the gemini-researcher agent"

# Expected Results for Each:
✅ Agent loads without errors
✅ Agent receives correct tools
✅ Agent follows instructions
✅ Response follows expected format
```

#### Test 2.2: Command Execution
```bash
# Test each command:
/conduct-research "test query"
/web-research "test query"
/capture-learning
/create-hormozi-pitch
/load-dynamic-requirements

# Expected Results for Each:
✅ Command executes without errors
✅ Produces expected output
✅ Handles invalid inputs gracefully
```

#### Test 2.3: Skill Activation
```bash
# Test each skill:
"Do research on AI" # → research skill
"Create a threat model" # → fabric skill
"Create a pitch" # → alex-hormozi-pitch skill
"Create a new skill" # → create-skill skill
"Guide me on prompt engineering" # → prompting skill
"Test web fuzzing" # → ffuf skill

# Expected Results for Each:
✅ Skill activates based on intent
✅ Skill executes correctly
✅ SKILL.md loaded appropriately
✅ Supporting files accessible
```

#### Test 2.4: Hook Triggering
```bash
# SessionStart hooks:
claude
# Expected: load-core-context.ts and initialize-pai-session.ts execute

# UserPromptSubmit hook:
"test prompt"
# Expected: update-tab-titles.ts executes

# Stop hook:
# Complete task with 🎯 COMPLETED line
# Expected: stop-hook.ts executes, voice notification (if enabled)

# SessionEnd hook:
# Exit Claude Code
# Expected: capture-session-summary.ts executes

# PostToolUse hook:
# Use any tool
# Expected: capture-tool-output.ts executes

# SubagentStop hook:
# Use any agent
# Expected: subagent-stop-hook.ts executes

# PreCompact hook:
# Trigger context compression
# Expected: context-compression-hook.ts executes

# Verification:
✅ Each hook fires on expected event
✅ Hook scripts execute without errors
✅ Hook outputs are correct
✅ Hooks don't block main execution
```

---

### Suite 3: Integration Tests

#### Test 3.1: MCP Server Connections
```bash
# Test each MCP server (if keys configured):

# BrightData:
"Scrape https://example.com"
✅ mcp__brightdata__scrape_as_markdown works

# Playwright:
"Take a screenshot of https://example.com"
✅ mcp__plugin_PAI-Boilerplate_playwright__browser_snapshot works

# httpx:
"Check server stack for https://example.com"
✅ mcp server connects and responds

# Check all registered servers:
# In Claude Code, check available tools
✅ All mcp__* tools appear
✅ Tools execute without errors
```

#### Test 3.2: Research Workflow
```bash
# End-to-end research test:
/conduct-research "quantum computing in 2025"

# Expected:
✅ Query decomposed into sub-questions
✅ Multiple research agents launched in parallel
✅ Perplexity-researcher executes
✅ Claude-researcher executes
✅ Gemini-researcher executes (if key configured)
✅ Results synthesized with confidence levels
✅ Source attribution included
✅ Metrics calculated correctly
✅ Response in < 2 minutes
✅ Voice notification (if enabled)
```

#### Test 3.3: Agent Coordination
```bash
# Test agent chaining:
"Use architect agent to create a PRD, then use engineer agent to implement it"

# Expected:
✅ Architect agent creates PRD
✅ PRD passed to engineer agent
✅ Engineer agent implements from PRD
✅ Both agents use correct context
✅ Workflow completes smoothly
```

---

### Suite 4: Configuration Tests

#### Test 4.1: Voice Disabled
```bash
# In ~/.claude/settings.json:
"ENABLE_VOICE": "false"

# Complete a task
# Expected:
✅ Task completes normally
✅ No voice notification attempts
✅ No errors about voice server
✅ Debug log shows voice disabled
```

#### Test 4.2: Voice Enabled, Server Running
```bash
# Start voice server:
cd ~/.claude/voice-server && bun server.ts &

# In settings.json:
"ENABLE_VOICE": "true"

# Complete a task
# Expected:
✅ Voice notification plays
✅ Correct voice and rate used
✅ Message matches 🎯 COMPLETED line
```

#### Test 4.3: Voice Enabled, Server Down
```bash
# Stop voice server:
pkill -f "bun server.ts"

# In settings.json:
"ENABLE_VOICE": "true"

# Complete a task
# Expected:
✅ Task completes normally
✅ Graceful failure (no crash)
✅ Debug log shows voice unavailable
✅ 2-second timeout works
```

#### Test 4.4: Per-Agent Voice Filtering
```bash
# In settings.json:
"VOICE_ENABLED_AGENTS": "engineer,architect"

# Use engineer agent:
✅ Voice notification triggered

# Use designer agent:
✅ No voice notification
✅ Task completes normally
```

---

### Suite 5: Path and Variable Tests

#### Test 5.1: ${CLAUDE_PLUGIN_ROOT} Resolution
```bash
# Check that all paths resolve correctly:
# In agent files, commands, skills, hooks

# Verify:
✅ No instances of ${PAI_DIR} remain
✅ All ${CLAUDE_PLUGIN_ROOT} references resolve
✅ Files load from correct plugin location
✅ Context templates found
```

#### Test 5.2: Template Context Files
```bash
# Verify context loading:
# Agent tries to load ${CLAUDE_PLUGIN_ROOT}/templates/context/CLAUDE.md

# Expected:
✅ File exists and is readable
✅ Content loads correctly
✅ Agent receives context
```

---

### Suite 6: Error Handling Tests

#### Test 6.1: Invalid Configuration
```bash
# Test with malformed settings.json
# Expected:
✅ Clear error message
✅ No crash
✅ Guidance on fixing

# Test with missing API keys
# Expected:
✅ Research agents report missing keys
✅ Other features still work
✅ Clear error messages
```

#### Test 6.2: Network Failures
```bash
# Disconnect network and test MCP servers
# Expected:
✅ Graceful timeout
✅ Helpful error messages
✅ Plugin doesn't hang
```

#### Test 6.3: Permission Errors
```bash
# Test with readonly ~/.claude/
# Expected:
✅ Clear error about permissions
✅ Doesn't corrupt existing files
```

---

### Suite 7: Performance Tests

#### Test 7.1: Parallel Research Speed
```bash
# Time research workflow:
time /conduct-research "test query"

# Expected:
✅ Completes in < 2 minutes
✅ 10 agents run in parallel
✅ No serial bottlenecks
```

#### Test 7.2: Hook Overhead
```bash
# Measure hook execution time
# Expected:
✅ Hooks don't add noticeable latency
✅ UserPromptSubmit hook < 100ms
✅ Stop hook < 500ms
```

---

### Suite 8: Compatibility Tests

#### Test 8.1: Personal Setup Migration
```bash
# On your actual system:
# After applying variable migration

# Test all your existing workflows:
✅ All your commands still work
✅ All your agents still work
✅ All your hooks still fire
✅ Voice notifications still work
✅ MCP connections still work
✅ No functionality lost
```

#### Test 8.2: Cross-Platform (if applicable)
```bash
# Test on different systems:
# - macOS
# - Linux
# - Windows (if Bun supports)

# Verify:
✅ Installation script works
✅ Hooks execute correctly
✅ Paths resolve correctly
```

---

## Validation Checklist

After all tests complete, verify:

### Plugin Structure
- [ ] plugin.json has all required fields
- [ ] hooks.json properly registers all hooks
- [ ] All paths use ${CLAUDE_PLUGIN_ROOT}
- [ ] No personal data in plugin files
- [ ] Template files have placeholders

### Components
- [ ] All 8 agents load and work
- [ ] All 5 commands execute correctly
- [ ] All 7 skills activate on intent
- [ ] All 12 hooks fire on events

### Configuration
- [ ] settings.example.json is complete
- [ ] .mcp.example.json is complete
- [ ] Installation script works
- [ ] Uninstall script works

### Documentation
- [ ] INSTALL.md is accurate
- [ ] QUICKSTART.md examples work
- [ ] CONTRIBUTING.md is clear
- [ ] All links in docs work

### Quality
- [ ] No errors in normal operation
- [ ] Graceful error handling
- [ ] Good performance
- [ ] No data loss scenarios

---

## Regression Testing

Before each release, run:
1. Full test suite on fresh install
2. Migration test on existing setup
3. Your personal setup verification
4. All examples in documentation

---

## Reporting Issues

When reporting test failures:
1. Environment details (OS, Claude Code version, Bun version)
2. Exact steps to reproduce
3. Expected vs actual behavior
4. Error messages and logs
5. Configuration (redacted)

---

## Continuous Testing

Consider:
- Automated testing for hooks
- Integration test suite
- Performance benchmarks
- Compatibility matrix
```

---

### Task 6.2: Execute Fresh Install Test

**Environment:** Clean system or VM without ~/.claude/

```bash
# Backup if needed
mv ~/.claude ~/.claude.backup.test

# Run installation
cd pai-plugin
./install.sh

# Manual verification checklist
```

**Checklist:**
- [ ] Installation completes without errors
- [ ] All configuration files created
- [ ] Directory structure correct
- [ ] Plugin shows in /plugin list
- [ ] Commands available in /help
- [ ] At least one agent works
- [ ] At least one skill activates
- [ ] No critical errors in logs

---

### Task 6.3: Execute Personal Setup Migration Test

**Environment:** Your actual ~/.claude/ directory

```bash
# Backup first!
cp -r ~/.claude ~/.claude.backup.migration

# Apply variable migration from Phase 2
# Update hooks registration from Phase 1

# Test your actual workflows
```

**Checklist:**
- [ ] All your existing workflows still work
- [ ] Hooks still fire correctly
- [ ] Voice notifications work (if you use them)
- [ ] MCP servers still connect
- [ ] No error messages
- [ ] No performance degradation

---

### Task 6.4: Create Test Report Template

**File:** `pai-plugin/TEST_REPORT_TEMPLATE.md`

```markdown
# Test Report - PAI-Boilerplate v0.7.0

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [OS, Claude Code version, Bun version]
**Test Type:** [ ] Fresh Install [ ] Migration [ ] Personal Setup

---

## Test Results Summary

- **Total Tests:** X
- **Passed:** X
- **Failed:** X
- **Skipped:** X

---

## Component Tests

### Agents (8 total)
- [ ] engineer
- [ ] architect
- [ ] designer
- [ ] pentester
- [ ] researcher
- [ ] perplexity-researcher
- [ ] claude-researcher
- [ ] gemini-researcher

### Commands (5 total)
- [ ] conduct-research
- [ ] web-research
- [ ] capture-learning
- [ ] create-hormozi-pitch
- [ ] load-dynamic-requirements

### Skills (7 total)
- [ ] PAI
- [ ] research
- [ ] fabric
- [ ] create-skill
- [ ] alex-hormozi-pitch
- [ ] ffuf
- [ ] prompting

### Hooks (8 types)
- [ ] SessionStart
- [ ] UserPromptSubmit
- [ ] Stop
- [ ] SessionEnd
- [ ] PostToolUse
- [ ] SubagentStop
- [ ] PreCompact
- [ ] Notification

---

## Issues Found

### Critical (Blocking)
1. [Issue description]
   - **Steps to reproduce:**
   - **Expected:**
   - **Actual:**

### High (Important)
[Issues list]

### Medium (Should fix)
[Issues list]

### Low (Nice to have)
[Issues list]

---

## Performance Notes

- Installation time: X minutes
- Research query time: X seconds
- Hook overhead: Negligible/Noticeable

---

## Recommendations

1. [Recommendation]
2. [Recommendation]

---

## Approval Status

- [ ] ✅ Approved for release
- [ ] ⚠️ Approved with minor issues
- [ ] ❌ Requires fixes before release
```

---

## Verification Checklist

- [ ] TESTING.md created with comprehensive test procedures
- [ ] Fresh install test executed successfully
- [ ] Personal setup migration test successful
- [ ] Test report template created
- [ ] All critical tests pass
- [ ] Known issues documented
- [ ] Performance acceptable
- [ ] No regressions found

---

## Files Created Summary

**Created (2 files):**
1. `pai-plugin/TESTING.md` - Comprehensive test guide
2. `pai-plugin/TEST_REPORT_TEMPLATE.md` - Report template

---

## Next Phase

Once Phase 6 testing is complete and all issues resolved, proceed to:
→ [Phase 7: Distribution Preparation](./PHASE_7.md)

This will prepare the plugin for public distribution and release.
