# Verification Guide

## Quick Validation

```bash
# 1. Check skill is registered
ls ~/.claude/skills/System/SKILL.md && echo "Skill file present"

# 2. Check all workflows exist
ls ~/.claude/skills/System/Workflows/*.md | wc -l
# Expected: 8 workflows

# 3. Check all tools exist
ls ~/.claude/skills/System/Tools/*.ts | wc -l
# Expected: 4 tools

# 4. Verify PAISYSTEMUPDATES directory structure
ls ~/.claude/MEMORY/PAISYSTEMUPDATES/
# Expected: Directories for years (2025/, 2026/, etc.)

# 5. Check index exists
ls ~/.claude/MEMORY/PAISYSTEMUPDATES/index.json
```

## Functional Tests

### Test 1: CreateUpdate Tool

```bash
# Test creating an update entry
echo '{
  "title": "Test Update Entry Creation Works",
  "significance": "trivial",
  "change_type": "doc_update",
  "files": ["test/verification.md"],
  "purpose": "Verify CreateUpdate tool works correctly",
  "expected_improvement": "Confirms installation is working"
}' | bun ~/.claude/skills/System/Tools/CreateUpdate.ts --stdin

# Expected: Creates file in MEMORY/PAISYSTEMUPDATES/YYYY/MM/
```

### Test 2: UpdateSearch Tool

```bash
# List recent updates
bun ~/.claude/skills/System/Tools/UpdateSearch.ts recent 5

# Expected: Table of last 5 updates
```

### Test 3: UpdateIndex Tool

```bash
# Validate index integrity
bun ~/.claude/skills/System/Tools/UpdateIndex.ts validate

# Expected: "Index is up to date!" or list of discrepancies
```

### Test 4: Voice Notification

```bash
# Test notification server connection
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "System skill verification complete"}'

# Expected: HTTP 200 (or connection refused if server not running)
```

## Workflow Validation

### IntegrityCheck Workflow

```
User: "Run an integrity check"

Expected behavior:
1. Voice notification plays
2. Parallel agents spawn to audit system
3. Report generated with issues found
4. Optional: Issues auto-fixed
```

### DocumentSession Workflow

```
User: "Document this session"

Expected behavior:
1. Voice notification plays
2. Session analyzed for changes
3. Update entry created in PAISYSTEMUPDATES
4. Automatically calls GitPush
```

### GitPush Workflow

```
User: "Git Push"

Expected behavior:
1. Voice notification plays
2. Verifies correct directory (must be ~/.claude)
3. Verifies correct remote (must be .claude.git)
4. git add, commit, push executed
```

### SecretScanning Workflow

```
User: "Check for secrets in ~/.claude"

Expected behavior:
1. Voice notification plays
2. TruffleHog scan runs
3. Report shows findings (if any)
```

## Expected Directory Structure After Installation

```
~/.claude/
  skills/
    System/
      SKILL.md              # Skill definition and routing
      Workflows/
        IntegrityCheck.md   # Parallel audit workflow
        DocumentSession.md  # Current session documentation
        DocumentRecent.md   # Catch-up documentation
        GitPush.md        # Git push workflow
        SecretScanning.md   # Credential scanning
        CrossRepoValidation.md
        PrivacyCheck.md
        WorkContextRecall.md
      Tools/
        CreateUpdate.ts     # Create update entries
        UpdateIndex.ts      # Index regeneration
        UpdateSearch.ts     # Search updates
        ExtractArchitectureUpdates.ts
      Templates/
        Update.md           # Update file template
  MEMORY/
    PAISYSTEMUPDATES/
      index.json           # Searchable index
      CHANGELOG.md         # Human-readable log
      2025/                # Year directories
        01/                # Month directories
          *.md             # Individual updates
      2026/
        ...
```

## Common Issues

### Issue: CreateUpdate fails with "Title too short"

**Cause:** Title must be 4-8 words
**Fix:** Provide a more descriptive title

### Issue: UpdateIndex shows missing entries

**Cause:** Index is out of sync with files
**Fix:** Run `bun UpdateIndex.ts regenerate`

### Issue: GitPush refuses to push

**Cause:** Wrong directory or remote detected
**Fix:** Navigate to ~/.claude and verify `git remote -v`

### Issue: Voice notification fails

**Cause:** VoiceServer not running
**Fix:** Start with `bun ~/.claude/VoiceServer/server.ts`

## Success Criteria

Installation is verified when:

1. All 8 workflow files are in `Workflows/`
2. All 4 tool files are in `Tools/`
3. Template file is in `Templates/`
4. SKILL.md contains proper routing table
5. CreateUpdate.ts successfully creates entries
6. UpdateSearch.ts can query the index
7. Voice notifications work (if server running)

## Cleanup Test Entries

If you created test entries during verification:

```bash
# Find and remove test entries
find ~/.claude/MEMORY/PAISYSTEMUPDATES -name "*test-update*" -delete

# Regenerate index
bun ~/.claude/skills/System/Tools/UpdateIndex.ts regenerate
```
