# Bugfix: Statusline MEMORY Section Shows Zeros

## Issue Summary
The statusline MEMORY section displayed zeros for Work, Sessions, and Research counters due to three related bugs.

## Root Causes

### Bug 1: UpdateCounts.ts Missing Counters
**File:** `Releases/v2.5/.claude/hooks/handlers/UpdateCounts.ts`

UpdateCounts.ts (hook handler) only wrote 5 of 8 counters to settings.json:
- ✅ skills, workflows, hooks, signals, files
- ❌ work, research, ratings (missing)

GetCounts.ts (standalone tool) had all 8 counters as reference implementation.

### Bug 2: Signals Definition Inconsistency
**Files:** Both UpdateCounts.ts and GetCounts.ts

Same field name, different data sources:
- UpdateCounts.ts: `signals` = lines in ratings.jsonl (rating entries)
- GetCounts.ts: `signals` = .md files in MEMORY/LEARNING/ (learning documents)

This caused whichever tool read the value to get wrong numbers.

### Bug 3: Statusline Uses Undeclared fd Dependency
**File:** `Releases/v2.5/.claude/statusline-command.sh` (lines 251-253)

Statusline used `fd` command to count work/sessions/research:
```bash
work_count=$(fd -t d -d 1 . "$PAI_DIR/MEMORY/WORK" 2>/dev/null | wc -l | tr -d ' ')
sessions_count=$(fd -e jsonl . "$PAI_DIR/MEMORY" 2>/dev/null | wc -l | tr -d ' ')
research_count=$(fd -e md -e json . "$PAI_DIR/MEMORY/RESEARCH" 2>/dev/null | wc -l | tr -d ' ')
```

If `fd` wasn't installed (not listed as dependency), all three returned 0.

## Fixes Applied

### Fix 1: Add Missing Counters to UpdateCounts.ts

**Added interface fields:**
```typescript
interface Counts {
  skills: number;
  workflows: number;
  hooks: number;
  signals: number;
  files: number;
  work: number;      // ← Added
  research: number;  // ← Added
  ratings: number;   // ← Added
  updatedAt: string;
}
```

**Added counting functions:**
```typescript
function countWorkDirs(paiDir: string): number {
  let count = 0;
  const workDir = join(paiDir, 'MEMORY/WORK');
  try {
    for (const entry of readdirSync(workDir, { withFileTypes: true })) {
      if (entry.isDirectory()) count++;
    }
  } catch {}
  return count;
}

function countResearchFiles(paiDir: string): number {
  const researchDir = join(paiDir, 'MEMORY/RESEARCH');
  return countFilesRecursive(researchDir, '.md') + 
         countFilesRecursive(researchDir, '.json');
}
```

**Updated getCounts() to include all 8 counters:**
```typescript
function getCounts(paiDir: string): Counts {
  return {
    skills: countSkills(paiDir),
    workflows: countWorkflowFiles(join(paiDir, 'skills')),
    hooks: countHooks(paiDir),
    signals: countFilesRecursive(join(paiDir, 'MEMORY/LEARNING'), '.md'),
    files: countFilesRecursive(join(paiDir, 'skills/PAI/USER')),
    work: countWorkDirs(paiDir),           // ← Added
    research: countResearchFiles(paiDir),  // ← Added
    ratings: countRatingsLines(join(paiDir, 'MEMORY/LEARNING/SIGNALS/ratings.jsonl')), // ← Added
    updatedAt: new Date().toISOString(),
  };
}
```

### Fix 2: Align Signals Definition

**Standardized across both files:**
- `signals` = .md files in MEMORY/LEARNING/ (learning documents)
- `ratings` = lines in ratings.jsonl (rating entries)

This matches GetCounts.ts reference implementation and provides semantic clarity.

### Fix 3: Remove fd Dependency from Statusline

**Replaced fd commands with settings.json reads:**
```bash
jq -r '
    "skills_count=" + (.counts.skills // 0 | tostring) + "\n" +
    "workflows_count=" + (.counts.workflows // 0 | tostring) + "\n" +
    "hooks_count=" + (.counts.hooks // 0 | tostring) + "\n" +
    "learnings_count=" + (.counts.signals // 0 | tostring) + "\n" +
    "files_count=" + (.counts.files // 0 | tostring) + "\n" +
    "work_count=" + (.counts.work // 0 | tostring) + "\n" +        # ← Now from settings.json
    "research_count=" + (.counts.research // 0 | tostring) + "\n" + # ← Now from settings.json
    "ratings_count=" + (.counts.ratings // 0 | tostring) + "\n" +   # ← Now from settings.json
    "sessions_count=" + (.counts.ratings // 0 | tostring)           # ← Sessions = ratings count
' "$SETTINGS_FILE" > "$_parallel_tmp/counts.sh" 2>/dev/null
```

**Note:** `sessions_count` uses `.counts.ratings` as they represent the same data (session rating entries).

## Benefits

1. **No external dependencies:** Removed reliance on `fd` command
2. **Single source of truth:** All counters now in settings.json
3. **Consistent definitions:** signals vs ratings clearly separated
4. **Complete data:** All 8 counters properly tracked and displayed
5. **Instant startup:** No file scanning at session start (UpdateCounts runs at session end)

## Testing

To verify the fix:
1. Run a session to trigger UpdateCounts.ts via stop hook
2. Check `~/.claude/settings.json` contains all 8 counters in `.counts` section
3. Start new session and verify statusline MEMORY section shows correct values
4. Confirm no zeros for Work, Sessions, Research counters

## Related Issues

- #549 - v2.5 Upgrade: Statusline shows all zeros (PAI_DIR not expanded, fd missing)
