# Verification Checklist - Kai Art Skill

## Mandatory Completion Checklist

**IMPORTANT**: This checklist MUST be completed before marking installation as done.

### File Structure Verification

- [ ] `$PAI_DIR/skills/Art/SKILL.md` exists and is readable
- [ ] `$PAI_DIR/skills/Art/Aesthetic.md` exists and is readable
- [ ] `$PAI_DIR/skills/Art/Workflows/TechnicalDiagrams.md` exists
- [ ] `$PAI_DIR/skills/Art/Workflows/Essay.md` exists
- [ ] `$PAI_DIR/skills/Art/Workflows/Comics.md` exists
- [ ] `$PAI_DIR/skills/Art/Tools/Generate.ts` exists and is executable

### CLI Tool Verification

- [ ] `bun run $PAI_DIR/skills/Art/Tools/Generate.ts --help` shows usage information
- [ ] At least one API key is configured in `$PAI_DIR/.env`

### Functional Tests

#### Test 1: Help Output
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts --help
```
**Expected**: Shows usage information with REQUIRED and OPTIONS sections

#### Test 2: Generate Test Image (if API key available)
```bash
bun run $PAI_DIR/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Simple test: blue circle on dark background" \
  --size 1K \
  --aspect-ratio 1:1 \
  --output ~/Downloads/art-test.png
```
**Expected**: Creates `~/Downloads/art-test.png`

#### Test 3: Verify Image Created
```bash
ls -la ~/Downloads/art-test.png
```
**Expected**: File exists with reasonable size (>10KB)

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Art Skill Verification ==="
echo ""

PASS=0
FAIL=0

check() {
  if [ "$1" = "0" ]; then
    echo "[PASS] $2"
    ((PASS++))
  else
    echo "[FAIL] $2"
    ((FAIL++))
  fi
}

# File checks
[ -f "$PAI_DIR/skills/Art/SKILL.md" ]
check $? "SKILL.md exists"

[ -f "$PAI_DIR/skills/Art/Aesthetic.md" ]
check $? "Aesthetic.md exists"

[ -f "$PAI_DIR/skills/Art/Workflows/TechnicalDiagrams.md" ]
check $? "TechnicalDiagrams.md exists"

[ -f "$PAI_DIR/skills/Art/Workflows/Essay.md" ]
check $? "Essay.md exists"

[ -f "$PAI_DIR/skills/Art/Workflows/Comics.md" ]
check $? "Comics.md exists"

[ -f "$PAI_DIR/skills/Art/Tools/Generate.ts" ]
check $? "Generate.ts exists"

# CLI check
bun run "$PAI_DIR/skills/Art/Tools/Generate.ts" --help >/dev/null 2>&1
check $? "CLI tool runs"

# API key check
if [ -n "$REPLICATE_API_TOKEN" ] || [ -n "$GOOGLE_API_KEY" ] || [ -n "$OPENAI_API_KEY" ]; then
  check 0 "At least one API key configured"
else
  check 1 "At least one API key configured"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo "Art Skill installation verified successfully!"
  exit 0
else
  echo "Some checks failed. Review the output above."
  exit 1
fi
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Generate.ts not found | Check `$PAI_DIR` is set correctly |
| API key errors | Verify keys in `$PAI_DIR/.env` |
| Missing dependencies | Run `bun install replicate openai @google/genai` |
| Permission denied | Check file permissions on Generate.ts |
| No image output | Check API key is valid and has credits |
