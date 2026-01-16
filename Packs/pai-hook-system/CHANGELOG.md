# Changelog - pai-hook-system

## [v2.1.1] - 2026-01-15

### Added
- ✨ **Restored deleted memory capture hooks** (Issue #372)
  - `capture-all-events.ts` - Universal event capture to JSONL
  - `capture-session-summary.ts` - Session summary generation
  - `stop-hook.ts` - Main session stop handler
  - `subagent-stop-hook.ts` - Subagent completion handler
- ✨ **Restored missing libraries** (Issues #377, #362)
  - `lib/observability.ts` - Event observability functions
  - `lib/metadata-extraction.ts` - Agent metadata enrichment

### Fixed
- 🐛 **Fixed path references** (Issue #350)
  - Updated `initialize-session.ts` to use MEMORY/ instead of history/
  - Now creates three-tier directory structure (Work/, Learning/, History/)
  - Added State/ and Signals/ directory creation
- 🐛 **Module resolution errors** resolved
  - All hooks now import from correct lib/ locations

### Changed
- 📝 Updated directory creation to match v2.1.0 three-tier architecture
- 📝 All paths now point to `$PAI_DIR/MEMORY/` structure

## Migration from v2.1.0

If you installed v2.1.0 and have existing data in `history/`, run the migration script:

```bash
bun run migrate-to-memory.ts
```

This will:
1. Move `history/sessions/` → `MEMORY/History/sessions/`
2. Move `history/learnings/` → `MEMORY/History/learnings/`
3. Move `history/research/` → `MEMORY/History/research/`
4. Create new three-tier structure (Work/, Learning/, Signals/)

## Notes

This release restores functionality that was deleted during the kai-* to pai-* rebrand (commit 45bb441). All hooks were recovered from git history and updated for the new MEMORY system architecture.

**Fixes Issues:** #372, #377, #362, #350
