# GitHub Issues Analysis & Recommended Responses

## CRITICAL FIXES STILL NEEDED (Before responding to issues):

### 1. Fix load-core-context.ts hook (Issue #108)
**File:** `.claude/hooks/load-core-context.ts` line 47
**Problem:** References `skills/PAI/SKILL.md` (old name)
**Fix:** Change to `skills/CORE/SKILL.md`
**Impact:** Blocks PAI from loading for all new users

### 2. Remove system-mcp references from CORE/SKILL.md (Issue #109)
**File:** `.claude/skills/CORE/SKILL.md`
**Problem:** Routes to system-mcp skill that doesn't exist in public repo
**Fix:** Remove entire "Web Scraping & MCP Systems" section
**Impact:** Users get confusing errors when trying web scraping

### 3. Check all hooks for PAI vs CORE references
**Files:** All `.claude/hooks/*.ts`
**Problem:** May have other references to old PAI skill name
**Fix:** Global search/replace PAI → CORE in hooks
**Impact:** Various hook failures

---

## ISSUES WE CAN CLOSE IMMEDIATELY (Already fixed by recent commits):

### ✅ Issue #74: "Documentation error?"
**Status:** FIXED by commit aade312 (docs: fix all broken documentation links)
**What we fixed:**
- All README.md links now use relative paths (.claude/ vs /)
- All references to missing files removed
- All 11 documentation links verified working

**Recommended response:**
```
Thanks for reporting! This has been fixed in commit aade312.

All documentation links in README.md and QUICKSTART.md are now working:
- Fixed absolute paths (/) → relative paths (.claude/)
- Updated voice-server/USAGE.md → voice-server/README.md
- Removed references to files not in public repo

Please pull the latest changes and the documentation should work perfectly.
```

---

## ISSUES THAT WILL BE FIXED (After completing critical fixes above):

### ⏳ Issue #108: "SessionStart hook load-core-context.ts fails"
**Status:** Will be fixed once we update hook to reference CORE/SKILL.md
**Root cause:** Hook references old PAI skill name
**Fix in progress:** Update load-core-context.ts line 47

**Recommended response (AFTER FIX):**
```
Thanks for the detailed bug report! This has been fixed in commit [COMMIT_HASH].

The issue was that load-core-context.ts was referencing the old skill name (PAI/SKILL.md) 
instead of the new name (CORE/SKILL.md).

Changes made:
- Updated hook to reference skills/CORE/SKILL.md
- Verified SessionStart hooks work correctly
- Added fallback logic for better error messages

Please pull the latest and try again. Let us know if you hit any other issues!
```

### ⏳ Issue #109: "system-mcp skill not included"  
**Status:** Will be fixed once we remove references from CORE/SKILL.md
**Root cause:** Private skill referenced in public docs
**Fix in progress:** Remove system-mcp section from CORE/SKILL.md

**Recommended response (AFTER FIX):**
```
Great catch! The system-mcp skill is part of the private Kai infrastructure and shouldn't 
have been referenced in the public PAI template.

Fixed in commit [COMMIT_HASH]:
- Removed system-mcp routing from CORE/SKILL.md
- Cleaned up web scraping references
- PAI template now only includes skills that are actually present

For web scraping, you can:
1. Use the research skill for basic content extraction
2. Create your own scraping skill following the skill creation guide
3. Wait for us to create a public web scraping skill template

Thanks for reporting!
```

---

## ISSUES REQUIRING INVESTIGATION (Not fixed by our changes):

### 🔍 Issue #110: "settings.json needs local edits (PAI_DIR)"
**Problem:** PAI_DIR environment variable not expanded
**Status:** Needs investigation - may be Claude Code bug vs our issue
**Recommend:** Ask user for more details, check if this is expected behavior

### 🔍 Issue #107: "PAI_DIR default not expanded"
**Problem:** Duplicate of #110
**Recommend:** Close as duplicate

### 🔍 Issue #106: "Missing folders since Cloudflare outage"
**Problem:** commands/ and documents/ folders missing
**Root cause:** These were deliberately removed in our documentation cleanup
**Status:** Need to decide if we want them back or update docs
**Impact:** Medium - affects users who had v0.6.0

**Recommended response:**
```
The commands/ and documents/ folders were removed in recent cleanup as part of
simplifying PAI to "start clean, start small."

If you need these:
- commands/ → Use slash commands in .claude/commands/ (see QUICKSTART)
- documents/ → Create .claude/documents/ if needed for your workflow

The focus is now on CORE skill + individual skills in skills/ directory.
Let us know if there's functionality you're missing!
```

### 🔍 Issue #105: "Voice server not providing audio"
**Status:** Needs investigation - voice server specific
**Recommend:** Ask for voice-server logs and configuration

### 🔍 Issue #104: "FABRIC cannot be updated"
**Status:** Needs investigation - fabric skill specific
**Recommend:** Check fabric skill documentation and update process

---

## ISSUES THAT CAN BE CLOSED (Won't fix / Out of scope):

### ❌ Issue #106: "Missing folders" 
**Reason:** Intentional cleanup, documented in commit history
**Response:** Explain cleanup philosophy, point to current structure

### ❌ Issue #87: "Command folder"
**Status:** Check if duplicate of #106
**Recommend:** Close as duplicate or won't fix (intentional removal)

---

## SUMMARY OF ACTIONS:

**IMMEDIATE (Do before responding to issues):**
1. Fix load-core-context.ts (PAI → CORE)
2. Remove system-mcp references from CORE/SKILL.md
3. Audit all hooks for PAI vs CORE references
4. Test hooks actually work
5. Commit fixes

**THEN RESPOND TO:**
1. Close #74 (documentation - already fixed)
2. Close #108 with fix commit (after applying fix)
3. Close #109 with fix commit (after applying fix)
4. Investigate #110, #107 (PAI_DIR expansion)
5. Respond to #106 (explain cleanup)
6. Investigate #105, #104 (voice, fabric)

**ESTIMATED IMPACT:**
- Will close ~5 issues immediately
- Will improve setup experience for new users significantly  
- Addresses main complaint: "project is a mess, links broken"
