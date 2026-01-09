# Issues Skill Verification

Complete this checklist to verify successful installation.

---

## Directory Structure

- [ ] `mai-issues-skill/` exists
- [ ] `mai-issues-skill/SKILL.md` exists
- [ ] `mai-issues-skill/Tools/` contains 2 .ts files (health.ts, list.ts)
- [ ] `mai-issues-skill/package.json` exists

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"

echo "Checking directories..."
ls -la "$PACK_DIR/"
echo ""
echo "Tools:"
ls "$PACK_DIR/Tools/"
```

---

## Dependencies

- [ ] Dependencies installed
- [ ] mai-issues-core linked

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"

cd "$PACK_DIR" && bun install
echo ""
echo "Checking mai-issues-core link..."
ls -la "$PACK_DIR/node_modules/mai-issues-core" 2>/dev/null && echo "Link OK" || echo "Link missing - run: bun install"
```

---

## Backend Configuration

- [ ] providers.yaml configured with issues domain

```bash
PAI_CONFIG="${PAI_CONFIG:-$HOME/.config/pai/providers.yaml}"

if [ -f "$PAI_CONFIG" ]; then
  echo "providers.yaml found:"
  grep -A 10 "issues:" "$PAI_CONFIG" || echo "No issues domain configured"
else
  echo "providers.yaml not found at $PAI_CONFIG"
fi
```

---

## Health Check

- [ ] Health check succeeds

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"
bun run "$PACK_DIR/Tools/health.ts"
```

**Expected:**
```json
{
  "healthy": true,
  "message": "Issues provider connected",
  "backend": "joplin"
}
```

---

## Tool Tests

### List Tool
- [ ] Can list issues with default settings

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"
bun run "$PACK_DIR/Tools/list.ts" --limit 5
```

### List Tool with Filters
- [ ] Can filter by status

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"
bun run "$PACK_DIR/Tools/list.ts" --status open --limit 5
```

### List Tool JSON Output
- [ ] Can output as JSON

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"
bun run "$PACK_DIR/Tools/list.ts" --format json --limit 3
```

---

## TypeScript Check

- [ ] TypeScript compiles without errors

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"
cd "$PACK_DIR" && bun run typecheck
```

---

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| Dependencies installed | |
| Backend configured | |
| Health check passes | |
| List tool works | |
| Filter by status works | |
| JSON output works | |
| TypeScript compiles | |

**All checks must pass for installation to be complete.**

---

## Quick Full Test

Run all verifications at once:

```bash
PACK_DIR="${PACK_DIR:-$HOME/src/pai/Personal_AI_Infrastructure/Packs/mai-issues-skill}"
TOOLS="$PACK_DIR/Tools"

echo "=== Issues Skill Verification ==="
echo ""

echo "1. Directory structure..."
ls "$PACK_DIR/SKILL.md" >/dev/null 2>&1 && echo "   SKILL.md OK" || echo "   SKILL.md MISSING"
ls "$TOOLS/health.ts" >/dev/null 2>&1 && echo "   health.ts OK" || echo "   health.ts MISSING"
ls "$TOOLS/list.ts" >/dev/null 2>&1 && echo "   list.ts OK" || echo "   list.ts MISSING"
echo ""

echo "2. Dependencies..."
cd "$PACK_DIR" && bun install --silent && echo "   Dependencies OK" || echo "   Dependencies FAILED"
echo ""

echo "3. TypeScript check..."
cd "$PACK_DIR" && bun run typecheck && echo "   TypeScript OK" || echo "   TypeScript FAILED"
echo ""

echo "4. Health check..."
bun run "$TOOLS/health.ts" && echo "   Health OK" || echo "   Health FAILED"
echo ""

echo "5. List issues..."
bun run "$TOOLS/list.ts" --limit 3 --format json | head -10 && echo "   List OK" || echo "   List FAILED"
echo ""

echo "=== Verification Complete ==="
```

---

## Troubleshooting

### Health check fails with "No provider configured"

Ensure `providers.yaml` has an issues domain:

```yaml
domains:
  issues:
    primary: joplin
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
```

### mai-issues-core not found

The skill depends on mai-issues-core. Ensure it's installed:

```bash
cd "$PACK_DIR" && bun install
```

### List returns empty results

1. Check that your backend (Joplin, Linear, etc.) is running
2. Verify you have issues/tasks in the configured notebook or project
3. Try without filters: `bun run Tools/list.ts`
