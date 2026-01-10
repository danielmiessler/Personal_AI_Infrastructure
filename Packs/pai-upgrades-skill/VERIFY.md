# PAI Upgrades Skill Verification

> **FOR AI AGENTS:** Complete this checklist AFTER installation. Every item must pass before declaring the pack installed.

---

## Directory Structure Verification

```bash
# Run these commands and verify output
```

### Check skill directory exists
```bash
ls -la ~/.claude/skills/Upgrades/
```
**Expected:** Directory with SKILL.md, sources.json, youtube-channels.json, Workflows/, Tools/, State/

### Check workflow files
```bash
ls ~/.claude/skills/Upgrades/Workflows/
```
**Expected:** Anthropic.md, YouTube.md, ReleaseNotesDeepDive.md

### Check tools
```bash
ls ~/.claude/skills/Upgrades/Tools/
```
**Expected:** Anthropic.ts

### Check state directory
```bash
ls ~/.claude/skills/Upgrades/State/
```
**Expected:** last-check.json, youtube-videos.json

---

## File Content Verification

### SKILL.md contains workflow routing
```bash
grep "Workflow Routing" ~/.claude/skills/Upgrades/SKILL.md
```
**Expected:** Match found

### sources.json contains Anthropic sources
```bash
grep "anthropic.com" ~/.claude/skills/Upgrades/sources.json
```
**Expected:** Multiple matches (blogs, docs, etc.)

### State files are valid JSON
```bash
python3 -c "import json; json.load(open('$HOME/.claude/skills/Upgrades/State/last-check.json'))" && echo "Valid JSON"
python3 -c "import json; json.load(open('$HOME/.claude/skills/Upgrades/State/youtube-videos.json'))" && echo "Valid JSON"
```
**Expected:** "Valid JSON" for both

---

## Customization Layer Verification (Optional)

### Check customization directory exists
```bash
ls ~/.claude/SKILLCUSTOMIZATIONS/Upgrades/
```
**Expected:** youtube-channels.json (if configured)

### Check customization file is valid JSON
```bash
python3 -c "import json; json.load(open('$HOME/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Upgrades/youtube-channels.json'))" && echo "Valid JSON"
```
**Expected:** "Valid JSON"

---

## Functional Verification

### Test Anthropic workflow trigger
Ask your AI:
```
"What sources does the Upgrades skill monitor?"
```
**Expected:** Lists Anthropic sources (blogs, GitHub repos, changelogs, docs)

### Test sources.json parsing
```bash
cat ~/.claude/skills/Upgrades/sources.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Blogs: {len(d.get(\"blogs\", []))}'); print(f'GitHub Repos: {len(d.get(\"github_repos\", []))}'); print(f'Changelogs: {len(d.get(\"changelogs\", []))}'); print(f'Documentation: {len(d.get(\"documentation\", []))}')"
```
**Expected:** Non-zero counts for each category

---

## Installation Checklist

Mark each item as complete:

```markdown
## PAI Upgrades Skill Installation Verification

### Directory Structure
- [ ] ~/.claude/skills/Upgrades/ exists
- [ ] SKILL.md present
- [ ] sources.json present
- [ ] youtube-channels.json present
- [ ] Workflows/ directory with 3 files
- [ ] Tools/ directory with Anthropic.ts
- [ ] State/ directory with 2 JSON files

### File Integrity
- [ ] SKILL.md contains workflow routing table
- [ ] sources.json contains 30+ sources
- [ ] State files are valid JSON

### Customization (Optional)
- [ ] SKILLCUSTOMIZATIONS/Upgrades/ directory exists
- [ ] youtube-channels.json contains your channels

### Functional
- [ ] AI recognizes "check for updates" trigger
- [ ] AI can list monitored sources
```

---

## Verification Complete

When all items pass:

1. **Confirm to user:** "PAI Upgrades Skill installation verified successfully"
2. **Recommend:** "Run 'check for updates' to test the full workflow"
3. **Note:** Customization layer is optional - channels can be added later

---

## Troubleshooting

### Files missing after copy
Re-run the copy command:
```bash
cp -r src/skills/Upgrades/* ~/.claude/skills/Upgrades/
```

### Invalid JSON in state files
Recreate them:
```bash
echo '{"last_check_timestamp": null, "sources": {}}' > ~/.claude/skills/Upgrades/State/last-check.json
echo '{"last_check_timestamp": null, "channels": {}}' > ~/.claude/skills/Upgrades/State/youtube-videos.json
```

### Skill not routing correctly
Verify SKILL.md frontmatter is intact:
```bash
head -5 ~/.claude/skills/Upgrades/SKILL.md
```
Should show valid YAML frontmatter with name and description.
