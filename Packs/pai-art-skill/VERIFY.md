# PAI Art Skill - Verification Checklist

## File Verification

Run each check and mark as passing or failing:

### Core Files

| Check | Command | Expected | Pass/Fail |
|-------|---------|----------|-----------|
| SKILL.md exists | `test -f ~/.claude/skills/Art/SKILL.md && echo OK` | OK | [ ] |
| Generate.ts exists | `test -f ~/.claude/skills/Art/Tools/Generate.ts && echo OK` | OK | [ ] |
| Essay.md exists | `test -f ~/.claude/skills/Art/Workflows/Essay.md && echo OK` | OK | [ ] |
| Visualize.md exists | `test -f ~/.claude/skills/Art/Workflows/Visualize.md && echo OK` | OK | [ ] |
| TechnicalDiagrams.md exists | `test -f ~/.claude/skills/Art/Workflows/TechnicalDiagrams.md && echo OK` | OK | [ ] |
| Mermaid.md exists | `test -f ~/.claude/skills/Art/Workflows/Mermaid.md && echo OK` | OK | [ ] |
| Frameworks.md exists | `test -f ~/.claude/skills/Art/Workflows/Frameworks.md && echo OK` | OK | [ ] |
| Stats.md exists | `test -f ~/.claude/skills/Art/Workflows/Stats.md && echo OK` | OK | [ ] |
| CreatePAIPackIcon.md exists | `test -f ~/.claude/skills/Art/Workflows/CreatePAIPackIcon.md && echo OK` | OK | [ ] |

### Environment Verification

| Check | Command | Expected | Pass/Fail |
|-------|---------|----------|-----------|
| Bun installed | `bun --version` | Version number | [ ] |
| FAL_KEY set | `test -n "$FAL_KEY" && echo OK` | OK | [ ] |

---

## Functional Verification

### Test 1: Tool Help Output

```bash
bun run ~/.claude/skills/Art/Tools/Generate.ts --help
```

**Expected:** Help output showing available flags (--model, --prompt, --size, --aspect-ratio, --output, etc.)

**Pass:** [ ]

---

### Test 2: Simple Image Generation

```bash
bun run ~/.claude/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Simple test: blue circle on white background, minimal" \
  --size 1K \
  --aspect-ratio 1:1 \
  --output ~/Downloads/art-skill-test.png
```

**Expected:** Image file created at ~/Downloads/art-skill-test.png

**Verify:**
```bash
test -f ~/Downloads/art-skill-test.png && echo "OK: Image created" || echo "FAIL: No image"
```

**Pass:** [ ]

---

### Test 3: Background Removal

```bash
bun run ~/.claude/skills/Art/Tools/Generate.ts \
  --model nano-banana-pro \
  --prompt "Simple icon: purple star, dark background" \
  --size 1K \
  --aspect-ratio 1:1 \
  --remove-bg \
  --output ~/Downloads/art-skill-transparent.png
```

**Expected:** PNG with transparent background created

**Pass:** [ ]

---

### Test 4: Skill Routing (Interactive)

Ask Claude:
```
"Create an editorial illustration for a blog post about the future of work"
```

**Expected:**
1. Routes to Essay workflow
2. Runs /cse or analyzes content
3. Constructs detailed prompt following Essay.md guidelines
4. Generates image with nano-banana-pro
5. Opens result

**Pass:** [ ]

---

## Workflow Verification

### Essay Workflow

| Criteria | Expected | Pass/Fail |
|----------|----------|-----------|
| Triggers on "illustration for essay/article/blog" | Routes to Essay.md | [ ] |
| Uses /cse for content analysis | Extracts key concepts | [ ] |
| Follows UL color palette | Purple/Teal accents | [ ] |
| Uses 3-tier typography | Valkyrie/Concourse/Advocate | [ ] |
| Validates output | Checks against criteria | [ ] |

### Technical Diagrams Workflow

| Criteria | Expected | Pass/Fail |
|----------|----------|-----------|
| Triggers on "architecture/technical/diagram" | Routes to TechnicalDiagrams.md | [ ] |
| Creates Excalidraw-style output | Clean, slightly organic | [ ] |
| Uses sepia background | #EAE9DF | [ ] |
| Includes title and subtitle | Top-left positioned | [ ] |

### Stats Workflow

| Criteria | Expected | Pass/Fail |
|----------|----------|-----------|
| Triggers on "stat/statistic/percentage" | Routes to Stats.md | [ ] |
| Number is dominant (60-70%) | Large hand-lettered number | [ ] |
| Illustration is small (20-30%) | Supporting context visual | [ ] |

---

## Common Issues

### Issue: "FAL_KEY not found"

**Solution:**
```bash
export FAL_KEY="your-key-here"
# Or add to ~/.zshrc
```

### Issue: "Cannot find module @fal-ai/serverless-client"

**Solution:**
```bash
cd ~/.claude/skills/Art/Tools
bun add @fal-ai/serverless-client
```

### Issue: "Permission denied"

**Solution:**
```bash
chmod +x ~/.claude/skills/Art/Tools/Generate.ts
```

### Issue: Image has baked-in checkerboard

**Solution:** Use `--remove-bg` flag to get actual transparency:
```bash
bun run ~/.claude/skills/Art/Tools/Generate.ts ... --remove-bg
```

---

## Verification Summary

- [ ] All 9 files present
- [ ] Bun installed and working
- [ ] FAL_KEY environment variable set
- [ ] Generate tool runs without errors
- [ ] Image generation produces output
- [ ] Background removal works
- [ ] Skill routing functions correctly

**Installation Status:** [ ] VERIFIED / [ ] NEEDS ATTENTION
