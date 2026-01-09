<!--
================================================================================
PAI CORE - USER/PAISECURITYSYSTEM/REPOSITORIES.md
================================================================================

PURPOSE:
Documents the critical separation between private and public repositories.
This is essential for preventing accidental exposure of sensitive data.

LOCATION:
- Private Installation: ${PAI_DIR}/skills/CORE/USER/PAISECURITYSYSTEM/REPOSITORIES.md
- PAI Pack: Packs/kai-core-install/src/skills/CORE/USER/PAISECURITYSYSTEM/REPOSITORIES.md

CUSTOMIZATION:
- [ ] Update repository URLs to your own
- [ ] Configure sanitization patterns for your data
- [ ] Set up pre-commit hooks as described

RELATED FILES:
- PROJECTRULES.md - Project-specific rules
- patterns.yaml - Security rules
- QUICKREF.md - Quick reference

LAST UPDATED: 2026-01-08
VERSION: 1.2.0
================================================================================
-->

# Repository Security

**Two Repositories - NEVER CONFUSE THEM**

---

## PRIVATE Installation (Your Personal Infrastructure)

| Property | Value |
|----------|-------|
| **Location** | `${PAI_DIR}/` |
| **Repository** | github.com/[YOUR_USERNAME]/[PRIVATE_REPO] (PRIVATE, STAYS PRIVATE FOREVER) |
| **Contains** | ALL sensitive data, API keys, personal history, contacts, private configurations |
| **Purpose** | Your actual working PAI infrastructure |
| **Status** | NEVER MAKE PUBLIC - contains real API keys, personal data, conversation history |

**This is YOUR HOME** - this contains everything about your life and work.

---

## PUBLIC Repository (Open Source Project)

| Property | Value |
|----------|-------|
| **Location** | `[YOUR_PUBLIC_REPO_PATH]/` |
| **Repository** | github.com/[YOUR_USERNAME]/[PUBLIC_REPO] (PUBLIC) |
| **Contains** | ONLY sanitized, generic, example code for others to use |
| **Purpose** | Share PAI concepts and architecture with the community as templates |
| **Status** | PUBLIC - anyone can see this |

**This is the TEMPLATE** - sanitized versions for public consumption.

---

## Sanitization Process (CRITICAL - READ EVERY TIME)

**When moving ANYTHING from private to public repo:**

### 1. ALWAYS run this checklist BEFORE copying:

```bash
# Check current location
pwd  # Make sure you know where you are
git remote -v  # Verify which repo

# Scan for secrets
grep -r "api[_-]key\|token\|secret\|password" file.ts
grep -r "sk-\|apify_api\|Bearer\|Authorization:" file.ts
grep -r "@your-domain.com" file.ts
```

### 2. Remove ALL sensitive data:

| Find | Replace With |
|------|--------------|
| API keys | `process.env.API_KEY` or `"your_api_key_here"` |
| Tokens | `"your_token_here"` |
| Email addresses | `"user@example.com"` |
| Real names | `"Alice"`, `"Bob"`, generic names |
| Personal project names | `"my-project"`, `"example-app"` |
| Real conversation history | Create GENERIC examples |
| Session IDs, user IDs | Use UUIDs or generic IDs |

### 3. Create .example template files:

```
.env -> .env.example
.mcp.json -> .mcp.json.example
settings.json -> settings.json.example
Any config with secrets -> *.example version
```

### 4. Update documentation:

- Remove references to your specific setup
- Use generic "your infrastructure" language
- Add installation instructions for others
- Include "fill in your own values" notes

### 5. Verify sanitization:

```bash
# In your public repo, search for any leaks:
grep -r "your-username\|your-domain" .
grep -r "sk-\|api_" . --include="*.ts" --include="*.py" --include="*.json"
grep -r "real-email@\|personal@" .
grep -r "[YOUR_VOICE_ID]" .  # Voice IDs
grep -r "claude/" .  # Should not reference private paths
```

### 6. Test the sanitized version:

- Can someone else clone your public repo and use it?
- Are there clear instructions?
- Does it work with placeholder values?
- Is everything documented?

---

## Common Sanitization Patterns

### WRONG (in public repo):

```typescript
const API_KEY = "sk-ant-1234567890abcdef";
const email = "alice@my-company.com";
const dbHost = "my-private-db.amazonaws.com";
```

### RIGHT (in public repo):

```typescript
const API_KEY = process.env.ANTHROPIC_API_KEY || "your_anthropic_api_key";
const email = process.env.ADMIN_EMAIL || "admin@example.com";
const dbHost = process.env.DB_HOST || "your-database-host";
```

### Hook Examples - WRONG:

```typescript
// stop-hook.ts - references your actual setup
const sessionLog = "/Users/myuser/.claude/History/sessions/";
const voiceId = "abc123xyz"; // Your ElevenLabs voice
```

### Hook Examples - RIGHT:

```typescript
// stop-hook.ts - generic for public use
const PAI_DIR = process.env.PAI_DIR || path.join(os.homedir(), '.claude');
const sessionLog = path.join(PAI_DIR, 'History', 'sessions');
const voiceId = process.env.VOICE_ID || "your_elevenlabs_voice_id";
```

---

## Directory Safety Rules

- **NEVER** `git add` or `git commit` from private repo to public
- **ALWAYS** copy files to public repo, sanitize them there, THEN commit
- **NEVER** symlink between private and public repos
- **ALWAYS** run `git remote -v` before committing anything
- **TRIPLE CHECK** you're in the right directory before `git push`

---

## CRITICAL SAFETY CHECK - Repository Confusion

If someone says "push to public" while working in the private directory:

1. **STOP AND REFUSE** - This is almost certainly a mistake
2. The private repo should NEVER be pushed to a public repo
3. Respond: "Hold on - you're in the private directory. Pushing to public would expose private data. Did you mean to push to the private repo instead?"
4. ONLY proceed if explicitly confirmed after the warning
5. This check applies to any variation: "push to public", "commit to public", "update public repo"

---

## Quick Reference Card

```
PRIVATE (${PAI_DIR}/)              PUBLIC ([PUBLIC_REPO]/)
=======================            ========================
OK: Real API keys                  NO: Only placeholders
OK: Personal data                  NO: Generic examples
OK: Conversation history           NO: Sanitized examples
OK: Contact info                   NO: No real contacts
OK: Session logs                   NO: Example logs only
OK: Your actual work               NO: Templates for others
STAYS PRIVATE FOREVER              PUBLIC FOR COMMUNITY
```

### When adding to public repo:

1. You're copying from PRIVATE to PUBLIC
2. You MUST sanitize EVERYTHING
3. Run the full sanitization checklist above
4. Test that it works for others
5. Only then commit to public repo
