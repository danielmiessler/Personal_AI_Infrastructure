# PushToPAI Workflow

**Purpose:** Git commit and push changes to your PRIVATE PAI repository (~/.claude). This is the final step after any documentation update.

**Triggers:** "push to PAI", "push to repo", "commit and push", "push changes"

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Pushing to PAI repository"}' \
  > /dev/null 2>&1 &
```

Running the **PushToPAI** workflow from the **System** skill...

---

## CRITICAL: PRIVATE REPO ONLY

This workflow operates on your **PRIVATE** PAI repository:
- **Remote:** Your private git repo (e.g., `git@github.com:{username}/.claude.git`)
- **Directory:** `~/.claude/` (or `$PAI_HOME`)

**NEVER** confuse this with the **PUBLIC** PAI template repository:
- Public repo is at `~/Projects/PAI/`
- Public remote is `git@github.com:danielmiessler/PAI.git`

---

## Execution

### Step 1: MANDATORY Security Verification

**ALWAYS run this FIRST:**

```bash
# Verify we're in the correct directory
cd ~/.claude && pwd
# Expected: $HOME/.claude (your home directory + .claude)

# Verify the remote is YOUR PRIVATE repo
git remote -v
# Expected: Your private repo URL, NOT danielmiessler/PAI.git
```

**STOP IMMEDIATELY if:**
- Directory is NOT `~/.claude` (or your PAI_HOME)
- Remote shows `danielmiessler/PAI.git` (public template repo)
- Any uncertainty about which repo you're in

### Step 2: Check What's Changed

```bash
cd ~/.claude
git status
```

Review changes to ensure:
- No sensitive files being committed accidentally
- Changes are expected from recent work
- No unintended modifications

### Step 3: Stage Changes

```bash
# Stage documentation updates
git add MEMORY/PAISYSTEMUPDATES/

# Stage any other relevant changes
git add skills/ hooks/ tools/

# Or stage all changes
git add -A
```

### Step 4: Commit

```bash
git commit -m "$(cat <<'EOF'
docs: Update system documentation

Auto-generated documentation from session work.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Commit message guidelines:**
- Use conventional commit format: `docs:`, `feat:`, `fix:`, etc.
- Keep first line under 72 characters
- Add Co-Authored-By line

### Step 5: Push

```bash
# Final verification before push
git remote -v
# MUST show YOUR private repo, NOT danielmiessler/PAI.git

# Push to origin
git push origin main
```

### Step 6: Completion

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Changes pushed to PAI repository"}' \
  > /dev/null 2>&1 &
```

---

## When to Use

This workflow is called automatically after:
- `DocumentSession` workflow
- `DocumentRecent` workflow

Can also be called manually when:
- Documentation was created but not pushed
- Other changes need to be committed

---

## Composition

```
IntegrityCheck → DocumentSession → GitPush (this)
                 DocumentRecent → GitPush (this)
                 Manual changes → GitPush (this)
```

---

## Safety Checklist

Before every push, verify:

| Check | Expected |
|-------|----------|
| Directory | `$HOME/.claude` (your PAI installation) |
| Remote | Your private repo URL, NOT `danielmiessler/PAI.git` |
| Branch | `main` |
| No secrets | No API keys or credentials in diff |

---

## Related Workflows

- `DocumentSession.md` - Usually precedes this
- `DocumentRecent.md` - Usually precedes this
- `SecretScanning.md` - Run before push if unsure
