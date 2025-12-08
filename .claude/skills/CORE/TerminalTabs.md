# Terminal Tab Title System

## Overview

The PAI system automatically updates your terminal tab title with a 4-word summary of what was done after each task completion. This provides instant visual feedback in your terminal tabs, making it easy to see what each Claude session accomplished.

## How It Works

The `stop-hook.ts` hook runs after every task completion and:

1. **Extracts the task summary** from the COMPLETED line in responses
2. **Generates a 4-word title** that summarizes what was accomplished
3. **Updates your terminal tab** using ANSI escape sequences

## Features

### 4-Word Summary Format

The system creates meaningful 4-word summaries by:
- Using past-tense action verbs (Created, Updated, Fixed, etc.)
- Extracting key nouns from the task
- Prioritizing words from the COMPLETED line when available
- Falling back to the user's original query if needed

### Examples

| User Query | Tab Title |
|------------|-----------|
| "Update the README documentation" | Updated Readme Documentation Done |
| "Fix the stop-hook" | Fixed Stop Hook Successfully |
| "Send email to Angela" | Sent Email Angela Done |
| "Research AI trends" | Researched AI Trends Complete |

## Terminal Compatibility

The tab title system works with terminals that support OSC (Operating System Command) sequences:

- **Kitty** - Full support
- **iTerm2** - Full support
- **Terminal.app** - Full support
- **Alacritty** - Full support
- **VS Code Terminal** - Full support

## Implementation Details

### Escape Sequences Used

```bash
# OSC 0 - Sets icon and window title
printf '\033]0;Title Here\007'

# OSC 2 - Sets window title
printf '\033]2;Title Here\007'

# OSC 30 - Kitty-specific tab title
printf '\033]30;Title Here\007'
```

### Hook Location

The terminal tab functionality is implemented in:
```
${PAI_DIR}/hooks/stop-hook.ts
```

### Key Functions

1. **generateTabTitle(prompt, completedLine)** - Creates the 4-word summary
2. **setKittyTabTitle(title)** - Sends escape sequences to update the tab
3. **Hook execution** - Runs automatically after every task

## Debugging

If tab titles aren't updating:

1. **Check hook is executable:**
   ```bash
   ls -la ${PAI_DIR}/hooks/stop-hook.ts
   # Should show: -rwxr-xr-x
   ```

2. **Verify Claude Code settings:**
   - Ensure stop-hook is configured in your Claude Code settings
   - Path should be: `${PAI_DIR}/hooks/stop-hook.ts`

3. **Test manually:**
   ```bash
   printf '\033]0;Test Title\007' >&2
   ```

4. **Check stderr output:**
   The hook logs to stderr with:
   - 🏷️ Tab title changes
   - 📝 User queries processed
   - ✅ Completed text extracted

## Customization

To modify the tab title behavior, edit `${PAI_DIR}/hooks/stop-hook.ts`:

- Change word count (currently 4 words)
- Modify verb tense (currently past tense)
- Add custom prefixes or suffixes
- Filter different stop words

## Benefits

- **Visual Task Tracking** - See what each tab accomplished at a glance
- **Multi-Session Management** - Easily identify different Claude sessions
- **Task History** - Tab titles persist as a record of completed work
- **No Manual Updates** - Fully automatic, runs on every task completion

## Integration with Voice System

The terminal tab system works alongside the voice notification system:
- Both extract information from the COMPLETED line
- Tab gets a 4-word visual summary
- Voice speaks the completion message
- Both provide immediate feedback through different channels