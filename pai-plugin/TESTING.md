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

#### Test 1.2: Validation
```bash
./scripts/validate-installation.sh

# Expected:
✅ All checks pass
✅ No critical errors
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
/capture-learning

# Expected Results:
✅ Command executes without errors
✅ Produces expected output
✅ Handles invalid inputs gracefully
```

#### Test 2.3: Skill Activation
```bash
# Test skills:
"Do research on AI" # → research skill
"Create a threat model" # → fabric skill
"Create a pitch" # → alex-hormozi-pitch skill

# Expected Results:
✅ Skill activates based on intent
✅ Skill executes correctly
✅ SKILL.md loaded appropriately
```

#### Test 2.4: Hook Triggering
```bash
# SessionStart hooks:
claude
# Expected: load-core-context.ts and initialize-pai-session.ts execute

# Stop hook:
# Complete task with 🎯 COMPLETED line
# Expected: stop-hook.ts executes, voice notification (if enabled)

# Expected:
✅ Each hook fires on expected event
✅ Hook scripts execute without errors
✅ Hooks don't block main execution
```

---

### Suite 3: Configuration Tests

#### Test 3.1: Voice Disabled
```bash
# In ~/.claude/settings.json:
"ENABLE_VOICE": "false"

# Complete a task
# Expected:
✅ Task completes normally
✅ No voice notification attempts
✅ No errors about voice server
```

#### Test 3.2: Voice Enabled, Server Running
```bash
# Start voice server:
cd ~/.claude/voice-server && bun server.ts &

# In settings.json:
"ENABLE_VOICE": "true"

# Complete a task
# Expected:
✅ Voice notification plays
✅ Correct voice and rate used
```

#### Test 3.3: Voice Enabled, Server Down
```bash
# Stop voice server:
pkill -f "bun server.ts"

# In settings.json:
"ENABLE_VOICE": "true"

# Complete a task
# Expected:
✅ Task completes normally
✅ Graceful failure (no crash)
✅ 2-second timeout works
```

---

### Suite 4: Path and Variable Tests

#### Test 4.1: ${CLAUDE_PLUGIN_ROOT} Resolution
```bash
# Verify:
✅ No instances of ${PAI_DIR} remain
✅ All ${CLAUDE_PLUGIN_ROOT} references resolve
✅ Files load from correct plugin location
✅ Context templates found
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
- [ ] All hooks fire on events

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
3. All examples in documentation

---

## Reporting Issues

When reporting test failures:
1. Environment details (OS, Claude Code version, Bun version)
2. Exact steps to reproduce
3. Expected vs actual behavior
4. Error messages and logs
5. Configuration (redacted)
