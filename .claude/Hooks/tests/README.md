# Hook Testing Suite

Comprehensive test scripts for validating individual PAI hooks. Each hook has its own dedicated test script that validates configuration, functionality, and voice notification integration.

## Individual Test Scripts

### 1. test-initialize-session.sh

Tests the session initialization hook that runs at the start of every Claude Code session.

```bash
# Run the test
./test-initialize-session.sh
```

**What it tests:**
- Hook file exists and is executable
- Stop-hook configuration is valid
- Tab title is set to "DA Ready"
- Voice notification is sent with greeting message
- Debouncing prevents duplicate notifications
- Subagent sessions are properly skipped

**Expected output:**
- ✅ Stop-hook found and is executable
- 📍 Set initial tab title: "PAI Ready" (or your DA name)
- Voice notification: "PAI here, ready to go"
- No errors

### 2. test-context-compression-hook.sh

Tests the PreCompact hook that notifies before context compression.

```bash
# Run the test
./test-context-compression-hook.sh
```

**What it tests:**
- Hook file exists and is executable
- Reads transcript to count messages
- Calculates compression statistics
- Sends voice notification about compression
- Uses DA voice from settings.json
- Handles both manual and auto compression types

**Expected output:**
- Transcript analysis showing message count
- Voice notification about context compression
- No errors

### 3. test-stop-hook.sh

Tests the main assistant completion hook that runs when tasks complete.

```bash
# Run the test
./test-stop-hook.sh
```

**What it tests:**
- Hook file exists and is executable
- Reads transcript for task information
- Extracts COMPLETED message with **🎯 emoji** (required format: `🎯 COMPLETED: {message}`)
- Validates 12-word max completion message from PAI response format
- Updates terminal tab title with task status
- Sends voice notification with DA voice
- Proper integration with voice server

**Expected output:**
- ✅ COMPLETED line found (with 🎯 emoji)
- Transcript parsing successful
- Tab title updated
- 🎤 Voice notification sent to voice server
- No errors

**Important:** The COMPLETED line must include the 🎯 emoji: `🎯 COMPLETED: {message}`

For voice-optimized short messages (8 words max), use: `🗣️ CUSTOM COMPLETED: {message}`

**Note:** This test creates a `test-transcript.jsonl` file that is preserved for reference by other tests.

### 4. test-subagent-stop-hook.sh

Tests the subagent completion hook that runs when specialized agents finish tasks. This is the most comprehensive test script with support for testing individual agents or all agents.

```bash
# Test all agent types
./test-subagent-stop-hook.sh

# Test a specific agent
./test-subagent-stop-hook.sh researcher

# Clean up test files
./test-subagent-stop-hook.sh clean

# Show help
./test-subagent-stop-hook.sh help
```

**Supported agent types:**
- `researcher` - Research agent
- `engineer` - Engineering agent
- `architect` - Architecture agent
- `designer` - Design agent
- `artist` - Artist agent
- `pentester` - Penetration testing agent
- `writer` - Writing agent
- `main` - Main assistant agent

**What it tests:**
- Hook file exists and is executable
- Voice configuration loading from voices.json
- Agent-specific voice ID mapping
- COMPLETED message extraction with [AGENT:type] format
- Task result parsing from transcript
- Voice notifications with correct agent voice
- All 8 agent types have proper voice configuration

**Expected output for each agent:**
- ✓ Loaded {agent_type}: {voice_id}
- ✅ Sent: [{AgentName}] {completion_message} with voice ID: {voice_id}
- No errors

## Common Test Patterns

All test scripts follow a consistent pattern:

1. **Color-coded output** - Blue headers, green success, yellow warnings, red errors
2. **Hook validation** - Checks existence and executable permissions
3. **Test execution** - Runs hook with appropriate test data
4. **Exit code validation** - Confirms successful execution
5. **Expected behavior documentation** - Lists what should happen
6. **Notes section** - Explains hook functionality and integration

## Test Output Format

```
╔════════════════════════════════════════╗
║  Testing {hook-name}.ts                ║
╚════════════════════════════════════════╝

📋 Test Information:
   Hook: {hook-name}.ts
   Function: {description}
   Expected: {expected behavior}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running {hook-name} hook...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Hook output here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test completed successfully

Expected behavior:
   1. [Step 1]
   2. [Step 2]
   ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notes:
   • [Note 1]
   • [Note 2]
```

## Running All Tests

To run all hook tests in sequence:

```bash
# From the tests directory
./test-initialize-session.sh
./test-context-compression-hook.sh
./test-stop-hook.sh
./test-subagent-stop-hook.sh
```

Or create a simple runner script:

```bash
#!/bin/bash
cd "$(dirname "$0")"

echo "Running all hook tests..."
echo ""

./test-initialize-session.sh
echo ""
./test-context-compression-hook.sh
echo ""
./test-stop-hook.sh
echo ""
./test-subagent-stop-hook.sh

echo ""
echo "All tests completed!"
```

## Prerequisites

Before running tests, ensure:

1. **PAI Directory Set:** `$PAI_DIR` environment variable is configured
2. **Settings Configured:** `~/.claude/settings.json` has required values:
   - `DA` - Your AI's name
   - `DA_VOICE_ID` - Your ElevenLabs voice ID
   - `VOICE_SERVER_PORT` - Voice server port (default: 8888)
3. **Voice Server Running:** (optional, tests will work without it but voice notifications won't be sent)
   ```bash
   cd ~/.claude/voice-server
   bun run server.ts
   ```
4. **Hooks Executable:** All hook files have execute permissions
   ```bash
   chmod +x ~/.claude/Hooks/*.ts
   ```

## Troubleshooting

### Test Script Not Executable

```bash
chmod +x test-*.sh
```

### Hook File Not Found

Ensure you're running tests from the `~/.claude/Hooks/tests/` directory and that hooks are in the parent `Hooks/` directory.

### Voice Notifications Not Working

- Check if voice server is running: `curl http://localhost:8888/health`
- Verify `VOICE_SERVER_PORT` in settings.json
- Check DA_VOICE_ID is configured

### Transcript Errors

Tests create temporary transcript files. If you see parsing errors, ensure:
- Test is running from correct directory
- Write permissions exist in tests directory
- Previous test runs cleaned up properly

## Integration with Hook Refactoring

These tests validate the hook refactoring that consolidated settings loading into the shared `Hooks/lib/pai-settings.ts` library. All hooks now:

- Load settings once (cached)
- Use consistent fallback chains
- Share unified PAISettings interface
- Eliminate duplicate configuration code

## Adding New Hook Tests

To create a test for a new hook:

1. **Copy an existing test** as a template
2. **Update the hook name** in the header and script
3. **Create appropriate test input** (transcript JSON if needed)
4. **Document expected behavior** specific to your hook
5. **Make it executable:** `chmod +x test-your-hook.sh`
6. **Update this README** to include your new test

Example template structure:

```bash
#!/bin/bash
# Test script for your-hook.ts
# Brief description

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing your-hook.ts                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Validation checks
# Test execution
# Result reporting
# Exit
```
