# Joplin Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `$PAI_DIR/skills/Joplin/` exists
- [ ] `$PAI_DIR/skills/Joplin/SKILL.md` exists
- [ ] `$PAI_DIR/skills/Joplin/Tools/` contains 7 .ts files
- [ ] `$PAI_DIR/skills/Joplin/Workflows/` contains 5 .md files

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "Checking directories..."
ls -la "$PAI_DIR/skills/Joplin/"
echo ""
echo "Tools:"
ls "$PAI_DIR/skills/Joplin/Tools/"
echo ""
echo "Workflows:"
ls "$PAI_DIR/skills/Joplin/Workflows/"
```

---

## Authentication

- [ ] Joplin API token stored in macOS Keychain

```bash
security find-generic-password -s "joplin-token" -a "claude-code" -w && echo "✓ Token found"
```

---

## Connection Test

- [ ] Ping succeeds

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
bun run "$PAI_DIR/skills/Joplin/Tools/Ping.ts"
```

**Expected:**
```json
{ "status": "ok", "message": "Joplin is running and accessible" }
```

---

## Tool Tests

### Notes Tool
- [ ] Can list notes in a notebook

```bash
bun run "$PAI_DIR/skills/Joplin/Tools/Notes.ts" find_in_notebook "YourNotebookName" --limit 5
```

### Notebooks Tool
- [ ] Can list notebooks

```bash
bun run "$PAI_DIR/skills/Joplin/Tools/Notebooks.ts" list
```

### Tags Tool
- [ ] Can list tags

```bash
bun run "$PAI_DIR/skills/Joplin/Tools/Tags.ts" list
```

### Search Tool
- [ ] Can search notes

```bash
bun run "$PAI_DIR/skills/Joplin/Tools/Search.ts" find_notes "*" --limit 5
```

---

## Smart Display Test

- [ ] Long notes return TOC instead of full content

```bash
# Find a note with >100 lines
bun run "$PAI_DIR/skills/Joplin/Tools/Search.ts" find_notes "*" --limit 5
# Get a note (replace with actual ID)
bun run "$PAI_DIR/skills/Joplin/Tools/Notes.ts" get <note_id>
```

If note is >100 lines, output should include `toc` array and message about using `--section`.

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | ☐ |
| API token in Keychain | ☐ |
| Ping succeeds | ☐ |
| Notes tool works | ☐ |
| Notebooks tool works | ☐ |
| Tags tool works | ☐ |
| Search tool works | ☐ |
| Smart display works | ☐ |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"
TOOLS="$PAI_DIR/skills/Joplin/Tools"

echo "=== Joplin Skill Verification ==="
echo ""

echo "1. Ping..."
bun run "$TOOLS/Ping.ts" && echo "✓ Ping OK" || echo "✗ Ping FAILED"
echo ""

echo "2. Notebooks..."
bun run "$TOOLS/Notebooks.ts" list | head -5 && echo "✓ Notebooks OK" || echo "✗ Notebooks FAILED"
echo ""

echo "3. Tags..."
bun run "$TOOLS/Tags.ts" list | head -5 && echo "✓ Tags OK" || echo "✗ Tags FAILED"
echo ""

echo "4. Search..."
bun run "$TOOLS/Search.ts" find_notes "*" --limit 3 | head -10 && echo "✓ Search OK" || echo "✗ Search FAILED"
echo ""

echo "=== Verification Complete ==="
```
