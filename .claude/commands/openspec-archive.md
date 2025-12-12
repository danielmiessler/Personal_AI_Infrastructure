# /openspec-archive

Archive a completed change, merging spec deltas into current specs.

## When Invoked

1. **Identify the change to archive:**
   > Which change should I archive?
   >
   > List active changes with: `ls [openspec-path]/changes/`

2. **Verify completion:**
   - [ ] All tasks in tasks.md are checked
   - [ ] All tests pass
   - [ ] Implementation matches spec requirements

3. **Merge spec deltas into specs/:**

   For each file in `changes/[name]/specs/`:
   - **ADDED Requirements** → Append to `specs/[domain].md`
   - **MODIFIED Requirements** → Replace in `specs/[domain].md`
   - **REMOVED Requirements** → Delete from `specs/[domain].md`

4. **Update CHANGELOG.md:**

   ```markdown
   ## [Unreleased]

   ### Added
   - [Feature name]: [description from proposal.md]

   ### Changed
   - [If any modifications]

   ### Removed
   - [If any removals]
   ```

5. **Move to archive:**

   ```bash
   # Create dated archive folder
   mv openspec/changes/[name] openspec/archive/$(date +%Y-%m-%d)-[name]
   ```

6. **Report completion:**
   > Archived `[change-name]`:
   >
   > **Specs updated:** [list files]
   > **CHANGELOG:** Updated with [summary]
   > **Archive location:** `openspec/archive/YYYY-MM-DD-[name]/`
   >
   > Ready for release workflow? See `/specfirst-release`

## Archive Structure

```
openspec/archive/
└── 2025-12-12-add-name-flag/    # ← Archived change
    ├── proposal.md               # Preserved for audit
    ├── tasks.md                  # Preserved for audit
    └── specs/                    # Preserved for audit
        └── ingest-direct.md
```

## What Gets Updated

| Source | Destination |
|--------|-------------|
| `changes/[name]/specs/*.md` | `specs/*.md` (merged) |
| `proposal.md` summary | `CHANGELOG.md` |
| Entire change folder | `archive/YYYY-MM-DD-[name]/` |

## Reference

- CHANGELOG format: https://keepachangelog.com
- Release workflow: `.claude/skills/SpecFirst/workflows/Release.md`
