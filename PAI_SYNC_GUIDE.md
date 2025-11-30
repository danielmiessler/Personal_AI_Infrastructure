# PAI Sync Guide

**How to safely sync improvements from Kai to public PAI**

---

## 🎯 The Challenge

You have two systems:
- **Kai** (`${PAI_DIR}/`) - Your private system with personal data, API keys, custom workflows
- **PAI** (`~/Projects/PAI/`) - Public template that must stay sanitized

When you improve Kai, you want to share those improvements with PAI **without** exposing private data.

---

## 🛡️ Protection System

PAI has built-in protection to prevent accidents:

### 1. **Protected Files List** (`.pai-protected.json`)
Defines files that must NOT be overwritten with Kai content:
- `README.md` - PAI-specific (not Kai README)
- `PAI_CONTRACT.md` - Defines PAI boundaries
- `.claude/hooks/lib/pai-paths.ts` - PAI path resolution
- `.claude/hooks/self-test.ts` - PAI health check
- `.claude/.env.example` - Template (no real keys)
- More listed in the manifest

### 2. **Validation Script** (`.claude/hooks/validate-protected.ts`)
Checks for:
- ❌ API keys in committed files
- ❌ Personal email addresses
- ❌ References to private Kai data
- ❌ Secrets or credentials

### 3. **Pre-Commit Hook** (`.git/hooks/pre-commit`)
Automatically runs validation before every commit.

---

## 📋 Safe Sync Workflow

### Step 1: Make Changes in Kai
Work in your private Kai system (`${PAI_DIR}/`):
```bash
cd ~/.claude
# Make improvements, add features, test thoroughly
```

### Step 2: Identify What to Share
Ask yourself:
- ✅ Is this useful for others?
- ✅ Does it work without my personal data?
- ✅ Is it generic enough for a template?
- ❌ Does it reference my private workflows?
- ❌ Does it contain API keys or secrets?

### Step 3: Copy to PAI Repo
```bash
# Example: Copying a new skill
cp -r ${PAI_DIR}/skills/new-skill ~/Projects/PAI/.claude/skills/

# Example: Updating a hook
cp ${PAI_DIR}/hooks/some-hook.ts ~/Projects/PAI/.claude/hooks/
```

**IMPORTANT:** Do NOT use `cp -r ~/.claude ~/Projects/PAI/` (don't bulk copy everything)

### Step 4: Sanitize Content
Remove any:
- API keys (`ANTHROPIC_API_KEY=sk-...`)
- Personal emails (`daniel@danielmiessler.com`)
- Private file paths (`/Users/daniel/.claude/skills/personal`)
- References to private services

Replace with placeholders:
```bash
# Before
ANTHROPIC_API_KEY=sk-ant-1234567890

# After
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Step 5: Run Self-Test
```bash
cd ~/Projects/PAI
bun .claude/hooks/self-test.ts
```

Expected output:
```
✅ PAI_DIR Resolution: /Users/yourname/Projects/PAI/.claude
✅ Hooks Directory: Found
✅ CORE Skill: loads correctly
...
🎉 PAI is healthy! All core guarantees working.
```

### Step 6: Run Protection Validation
```bash
cd ~/Projects/PAI
bun .claude/hooks/validate-protected.ts
```

Expected output:
```
✅ README.md
✅ PAI_CONTRACT.md
✅ .claude/hooks/lib/pai-paths.ts
...
✅ All protected files validated successfully!
```

If validation fails:
```
❌ .claude/.env.example
   → Contains secret or personal email: @danielmiessler.com
```

Fix the issues and re-run validation.

### Step 7: Review Changes
```bash
cd ~/Projects/PAI
git status
git diff
```

Check:
- ✅ No API keys visible
- ✅ No personal emails
- ✅ No private file paths
- ✅ Protected files unchanged (unless intentional)

### Step 8: Commit (with automatic validation)
```bash
git add .
git commit -m "feat: add new skill for X"
```

The pre-commit hook automatically runs validation. If it fails, the commit is blocked.

### Step 9: Push to GitHub
```bash
git push origin main
```

---

## 🚨 Common Mistakes

### Mistake 1: Bulk Copying Everything
```bash
# ❌ DON'T DO THIS
cp -r ${PAI_DIR}/* ~/Projects/PAI/.claude/
```

**Problem:** Overwrites protected files, copies personal data

**Solution:** Copy specific files/directories only

### Mistake 2: Forgetting to Sanitize
```bash
# ❌ File contains
ELEVENLABS_API_KEY=a1b2c3d4e5f6
```

**Problem:** Real API key committed to public repo

**Solution:** Always run `validate-protected.ts` before committing

### Mistake 3: Overwriting Protected Files
```bash
# ❌ Copied Kai's README to PAI
cp ${PAI_DIR}/../README.md ~/Projects/PAI/README.md
```

**Problem:** PAI's README explains public template, Kai's README is private

**Solution:** Check `.pai-protected.json` before copying

### Mistake 4: Not Testing After Sync
```bash
# ❌ Commit immediately without testing
git add . && git commit -m "updates"
```

**Problem:** Broken hooks, missing dependencies, invalid paths

**Solution:** Always run `self-test.ts` first

---

## 🔧 Installing Protection Hook

The pre-commit hook is NOT installed by default (to avoid interfering with other workflows).

To install:
```bash
cd ~/Projects/PAI
cp .claude/hooks/pre-commit.template .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Now validation runs automatically before every commit.

To bypass (not recommended):
```bash
git commit --no-verify -m "message"
```

---

## 📁 Protected Files Reference

See `.pai-protected.json` for the complete list.

**Categories:**

1. **Core Documents**
   - `README.md` - PAI-specific introduction
   - `PAI_CONTRACT.md` - Defines what PAI guarantees
   - `SECURITY.md` - Public security guidance

2. **PAI Infrastructure**
   - `.claude/hooks/lib/pai-paths.ts` - Path resolution library
   - `.claude/hooks/self-test.ts` - Health check system
   - `.claude/hooks/validate-protected.ts` - Protection validator
   - `.pai-protected.json` - This manifest

3. **Sanitized Config**
   - `.claude/.env.example` - Template with placeholders
   - `.claude/settings.json` - Generic settings (no personal tweaks)

4. **Forbidden Patterns**
   - Personal email addresses
   - Real API keys
   - Private file paths
   - Sensitive data patterns

---

## 🎯 Quick Reference

**Before every PAI commit:**
```bash
# 1. Test PAI works
bun ~/Projects/PAI/.claude/hooks/self-test.ts

# 2. Validate protected files
bun ~/Projects/PAI/.claude/hooks/validate-protected.ts

# 3. Review changes
git diff

# 4. Commit (validation runs automatically if hook installed)
git commit -m "your message"
```

**When validation fails:**
1. Read the error messages
2. Fix the violations (remove secrets, sanitize data)
3. Re-run validation
4. Commit once validation passes

---

## ❓ FAQ

**Q: Can I disable the protection system?**
A: Yes, but not recommended. You can skip by not installing the pre-commit hook or using `--no-verify`.

**Q: What if I need to update a protected file?**
A: That's fine! The validation checks the *content*, not that files don't change. Just ensure the content stays PAI-appropriate.

**Q: How do I add a new protected file?**
A: Edit `.pai-protected.json` and add the file path to the appropriate category.

**Q: Can I use rsync instead of manual copying?**
A: Use with extreme caution. Better to copy specific files to avoid accidents.

**Q: What if I accidentally commit secrets?**
A: Immediately rotate the API keys, then force-push to remove from history (or contact GitHub support).

---

## 🚀 Example: Syncing a New Skill

Complete example of adding a new skill from Kai to PAI:

```bash
# 1. Copy skill from Kai to PAI
cp -r ${PAI_DIR}/skills/my-new-skill ~/Projects/PAI/.claude/skills/

# 2. Sanitize the skill's SKILL.md
cd ~/Projects/PAI/.claude/skills/my-new-skill
nano SKILL.md  # Remove any personal references

# 3. Check if there's an .env or config file
# Remove any real API keys, replace with placeholders

# 4. Test PAI
cd ~/Projects/PAI
bun .claude/hooks/self-test.ts

# 5. Validate protection
bun .claude/hooks/validate-protected.ts

# 6. Review changes
git status
git diff

# 7. Commit
git add .claude/skills/my-new-skill
git commit -m "feat(skills): add my-new-skill for doing X"

# 8. Push
git push origin main
```

---

**Remember:** PAI is public. Kai is private. The protection system helps keep them separate while allowing you to share improvements with the community.

🤖 **Happy syncing!**
