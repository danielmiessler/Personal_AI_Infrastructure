# Hook System Documentation

## Overview

The PAI Hook System provides event-driven automation and control throughout the AI interaction lifecycle. Hooks are scripts that execute at specific points, allowing you to intercept, modify, and enhance AI behavior.

## Hook Types

### 1. User Prompt Submit Hook
**File**: `user-prompt-submit-hook`
**Trigger**: Before user prompts are processed
**Purpose**: Load context, validate input, prepare environment

### 2. Tool Use Hook  
**File**: `tool-use-hook`
**Trigger**: Before tool execution
**Purpose**: Validate tool calls, modify parameters, security checks

### 3. Post Execution Hook
**File**: `post-execution-hook`
**Trigger**: After commands complete
**Purpose**: Cleanup, logging, notifications

### 4. Response Hook
**File**: `response-hook`
**Trigger**: Before AI response is shown
**Purpose**: Format output, add information, filter content

## Hook Execution Flow

```
User Input
    ↓
[user-prompt-submit-hook]
    ↓
AI Processing
    ↓
Tool Request → [tool-use-hook] → Tool Execution
    ↓
[post-execution-hook]
    ↓
[response-hook]
    ↓
User Output
```

## Creating Hooks

### Basic Hook Structure

```bash
#!/bin/bash
# Hook Name: user-prompt-submit-hook
# Purpose: Pre-process user prompts

# Access environment variables
USER_PROMPT="$1"
CONTEXT_DIR="${PAI_DIR}/context"

# Perform actions
echo "Processing prompt: $USER_PROMPT"

# Load context based on intent
if [[ "$USER_PROMPT" =~ "website" ]]; then
    cat "${CONTEXT_DIR}/projects/website/CLAUDE.md"
fi

# Return status (0 = success, non-zero = block)
exit 0
```

### Hook Configuration

Hooks must be:
1. **Executable**: `chmod +x hook-name`
2. **Located in**: `${PAI_DIR}/hooks/`
3. **Named correctly**: Exact hook name without extension
4. **Return proper exit codes**: 0 for success, non-zero to block

## Hook Examples

### Example 1: Context Loading Hook

```bash
#!/bin/bash
# user-prompt-submit-hook
# Dynamically loads context based on user intent

PROMPT="$1"
PAI_DIR="${PAI_DIR:-$HOME/PAI}"

# Load UFC context system
if [[ -f "${PAI_DIR}/hooks/load-dynamic-requirements" ]]; then
    source "${PAI_DIR}/hooks/load-dynamic-requirements"
fi

# Analyze intent and load context
case "$PROMPT" in
    *website*|*blog*|*site*)
        echo "Loading website context..."
        cat "${PAI_DIR}/context/projects/website/CLAUDE.md"
        ;;
    *research*|*investigate*)
        echo "Launching researcher agent..."
        echo "AGENT: researcher"
        ;;
    *security*|*vulnerability*)
        echo "Launching pentester agent..."
        echo "AGENT: pentester"
        ;;
esac

exit 0
```

### Example 2: Security Validation Hook

```bash
#!/bin/bash
# tool-use-hook
# Validates and sanitizes tool calls

TOOL_NAME="$1"
TOOL_PARAMS="$2"

# Block dangerous commands
BLOCKED_PATTERNS=(
    "rm -rf /"
    "sudo"
    "passwd"
    "format"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
    if [[ "$TOOL_PARAMS" =~ $pattern ]]; then
        echo "BLOCKED: Dangerous command pattern detected"
        exit 1
    fi
done

# Validate file paths
if [[ "$TOOL_NAME" == "Edit" ]] || [[ "$TOOL_NAME" == "Write" ]]; then
    FILE_PATH=$(echo "$TOOL_PARAMS" | grep -o '"file_path":"[^"]*"' | cut -d'"' -f4)
    
    # Ensure path is within PAI_DIR
    if [[ ! "$FILE_PATH" =~ ^${PAI_DIR} ]]; then
        echo "WARNING: File operation outside PAI_DIR"
    fi
fi

exit 0
```

### Example 3: Notification Hook

```bash
#!/bin/bash
# post-execution-hook
# Sends voice notifications after task completion

COMMAND="$1"
EXIT_CODE="$2"
OUTPUT="$3"

# Send notification based on result
if [ "$EXIT_CODE" -eq 0 ]; then
    MESSAGE="Task completed successfully"
else
    MESSAGE="Task failed with error"
fi

# Send to voice server
curl -X POST http://localhost:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$MESSAGE\"}" \
    2>/dev/null

exit 0
```

### Example 4: Output Formatting Hook

```bash
#!/bin/bash
# response-hook
# Formats AI responses

RESPONSE="$1"

# Add timestamp
echo "[$( date '+%Y-%m-%d %H:%M:%S' )]"
echo "$RESPONSE"

# Add context information
if [ -n "$CURRENT_PROJECT" ]; then
    echo "Project: $CURRENT_PROJECT"
fi

exit 0
```

## Advanced Hook Features

### Hook Communication

Hooks can communicate through:

1. **Environment Variables**
```bash
export HOOK_DATA="value"
```

2. **Temporary Files**
```bash
echo "data" > /tmp/hook_data.txt
```

3. **Standard Output**
```bash
echo "CONTEXT: Additional context here"
```

4. **Exit Codes**
```bash
exit 0  # Success, continue
exit 1  # Failure, block operation
```

### Hook Chaining

Multiple hooks can work together:

```bash
# Hook 1: Analyze intent
echo "INTENT: research" > /tmp/intent.txt

# Hook 2: Load based on intent
INTENT=$(cat /tmp/intent.txt)
if [ "$INTENT" = "research" ]; then
    load_research_context
fi
```

### Conditional Execution

Hooks can run conditionally:

```bash
# Only run for specific users
if [ "$USER" != "authorized_user" ]; then
    exit 0
fi

# Only run in certain directories
if [ "$PWD" != "${HOME}/Projects" ]; then
    exit 0
fi
```

## Hook Best Practices

### 1. Performance
- Keep hooks lightweight
- Avoid blocking operations
- Use background processes when possible
- Cache frequently used data

### 2. Error Handling
```bash
set -e  # Exit on error
trap 'echo "Hook failed: $?"' ERR
```

### 3. Logging
```bash
LOG_FILE="${HOME}/Library/Logs/hooks.log"
echo "[$(date)] Hook executed: $0" >> "$LOG_FILE"
```

### 4. Security
- Validate all inputs
- Sanitize file paths
- Check permissions
- Avoid executing user input

## Built-in Hook Variables

Hooks have access to these environment variables:

| Variable | Description |
|----------|-------------|
| `PAI_DIR` | PAI configuration directory |
| `USER_PROMPT` | Current user prompt |
| `TOOL_NAME` | Tool being called |
| `TOOL_PARAMS` | Tool parameters |
| `CONTEXT_DIR` | Context files directory |
| `HOOKS_DIR` | Hooks directory |
| `AGENT_TYPE` | Current agent type |

## Debugging Hooks

### Enable Debug Mode

```bash
export HOOK_DEBUG=true
```

### Debug Output

```bash
#!/bin/bash
if [ "$HOOK_DEBUG" = "true" ]; then
    set -x  # Enable trace
    exec 2>>"${HOME}/Library/Logs/hook_debug.log"
fi
```

### Testing Hooks

```bash
# Test hook directly
./user-prompt-submit-hook "test prompt"

# Check exit code
echo $?

# View output
cat /tmp/hook_output.txt
```

## Common Hook Patterns

### Pattern 1: Context Injection

```bash
# Inject context before prompt processing
cat << EOF
CONTEXT: You are working on project X
CONSTRAINTS: Follow coding style Y
GOALS: Implement feature Z
EOF
```

### Pattern 2: Tool Wrapper

```bash
# Wrap tool execution with pre/post actions
pre_action
$TOOL_COMMAND
post_action
```

### Pattern 3: Validation Gate

```bash
# Validate before allowing operation
if ! validate_request; then
    echo "ERROR: Validation failed"
    exit 1
fi
```

### Pattern 4: Event Notification

```bash
# Notify external systems
webhook_notify "https://api.example.com/hooks" "$EVENT_DATA"
```

## Troubleshooting

### Hook Not Executing

1. **Check permissions**: `ls -la ${PAI_DIR}/hooks/`
2. **Verify name**: Must match exactly
3. **Test directly**: `./hook-name test`
4. **Check logs**: `tail -f ${HOME}/Library/Logs/hooks.log`

### Hook Blocking Operations

- Check exit codes
- Review error output
- Verify logic conditions
- Test with `set -x` for trace

### Performance Issues

- Profile with `time ./hook-name`
- Move heavy operations to background
- Cache expensive computations
- Use timeout for external calls

## Hook Security

### Input Validation

```bash
# Sanitize user input
sanitize() {
    echo "$1" | sed 's/[^a-zA-Z0-9 ._-]//g'
}

SAFE_INPUT=$(sanitize "$USER_INPUT")
```

### Path Restrictions

```bash
# Restrict file operations
if [[ ! "$FILE_PATH" =~ ^${PAI_DIR} ]]; then
    echo "Access denied: Outside PAI_DIR"
    exit 1
fi
```

### Command Filtering

```bash
# Block dangerous commands
DANGEROUS_CMDS=("rm -rf" "sudo" "chmod 777")
for cmd in "${DANGEROUS_CMDS[@]}"; do
    if [[ "$COMMAND" =~ $cmd ]]; then
        exit 1
    fi
done
```

## Future Enhancements

### Planned Features

1. **Hook Marketplace**: Share and download hooks
2. **Hook Templates**: Pre-built hook patterns
3. **Visual Hook Editor**: GUI for hook creation
4. **Hook Testing Framework**: Automated testing
5. **Hook Analytics**: Usage and performance metrics

### Experimental Features

- **Async Hooks**: Non-blocking execution
- **Hook Priorities**: Execution order control
- **Hook Dependencies**: Inter-hook requirements
- **Remote Hooks**: Cloud-based hooks

---

*Hook System Version 1.0.0*
*Last Updated: [Current Date]*


## Recent Changes (2025-10-19)

- ➕ `hooks/initialize-pai-session.ts` (added)
  - +130 / -0 lines
- ➕ `hooks/load-core-context.ts` (added)
  - +88 / -0 lines
- 🗑️ `hooks/session-start-hook.ts` (deleted)
  - +0 / -86 lines

---
<!-- Last Updated: 2025-10-19 -->
