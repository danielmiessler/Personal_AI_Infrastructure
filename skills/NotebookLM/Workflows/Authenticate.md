# Authenticate Workflow

Set up and manage Google authentication for NotebookLM access.

## Trigger Patterns

- User wants to set up NotebookLM: "Set up NotebookLM"
- First-time usage detected (no auth status)
- Authentication error encountered
- User wants to re-authenticate: "Log in to NotebookLM again"

## Workflow Steps

### 1. Check Current Status

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts status
```

If authenticated, inform user and skip setup.

### 2. Initial Setup

```bash
# Opens visible browser window for Google login
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts setup
```

**User Action Required:**
1. Browser window opens automatically
2. User must manually log in to Google
3. User must complete any 2FA prompts
4. Browser closes when auth completes

**Tell user:** "A browser window will open. Please log in to your Google account."

### 3. Verify Authentication

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts status
```

Confirm authentication succeeded.

### 4. Test Access (Optional)

```bash
# List notebooks to verify access works
bun run $PAI_DIR/skills/NotebookLM/Tools/ManageNotebook.ts list
```

## Re-Authentication

When existing auth fails or user wants to switch accounts:

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts reauth
```

Same process as setup - opens visible browser for login.

## Clear Authentication

To remove all stored auth data:

```bash
bun run $PAI_DIR/skills/NotebookLM/Tools/Authenticate.ts clear
```

**Warning:** This removes all session data. User must re-authenticate.

## Error Handling

| Error | Action |
|-------|--------|
| Browser fails to open | Check browser installation |
| Login timeout | Retry setup, user may have been slow |
| 2FA failure | User must complete 2FA manually |
| Network error | Check internet connection |

## Data Storage

Authentication data stored in:
- `$PAI_DIR/skills/NotebookLM/data/auth_info.json` - Auth status
- `$PAI_DIR/skills/NotebookLM/data/browser_state/` - Browser session

**Security:** All auth data protected by `.gitignore`. Never commit to git.

## Completion Criteria

- Authentication status returns "authenticated"
- User can access their NotebookLM notebooks
- Session persists for future queries
