# Verification Guide: PAI Tools

## Gemini Adapter (gemini-pai.ts)

The `gemini-pai` adapter is a wrapper for the Gemini CLI that integrates it with the PAI hook and history systems.

### Quick Verification

Run these commands to verify the adapter:

```bash
# 1. Verify the adapter exists and is executable
ls -la $PAI_DIR/tools/gemini-pai.ts
# OR if you are in the repository:
ls -la Tools/gemini-pai.ts

# 2. Test the adapter's help (should pass through to gemini --help)
alias gemini-pai="bun $PAI_DIR/tools/gemini-pai.ts"
gemini-pai --help

# 3. Test context injection (Dry Run)
PAI_DEBUG=true gemini-pai --version
```

### Functional Verification

1. **Session Initialization**:
   - Run `gemini-pai`
   - Check if `$PAI_DIR/.current-session` was updated.

2. **Context Injection**:
   - Run `gemini-pai` (interactive mode)
   - Ask: "Who are you and what is your operating environment?"
   - It should respond with the name and environment defined in your `CORE/SKILL.md` (e.g., "[AI_NAME]", "[USER_NAME]'s AI assistant", "built on Claude Code / Gemini CLI").

3. **History Capture**:
   - Complete a session in `gemini-pai`.
   - Check `$PAI_DIR/history/sessions/` for a new markdown file.
