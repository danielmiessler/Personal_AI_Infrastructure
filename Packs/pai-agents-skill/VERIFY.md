# Verification Checklist - Kai Agents Skill

## Mandatory Completion Checklist

**IMPORTANT**: This checklist MUST be completed before marking installation as done.

### File Structure Verification

- [ ] `$PAI_DIR/skills/Agents/SKILL.md` exists
- [ ] `$PAI_DIR/skills/Agents/Data/Traits.yaml` exists
- [ ] `$PAI_DIR/skills/Agents/Tools/AgentFactory.ts` exists
- [ ] `$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs` exists
- [ ] `$PAI_DIR/skills/Agents/Workflows/CreateCustomAgent.md` exists
- [ ] `$PAI_DIR/skills/Agents/Workflows/ListTraits.md` exists

### CLI Tool Verification

- [ ] `bun run AgentFactory.ts --help` shows usage information
- [ ] `bun run AgentFactory.ts --list` displays available traits
- [ ] `bun run AgentFactory.ts --traits "security,skeptical"` produces agent composition

### Functional Tests

#### Test 1: List Traits
```bash
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts --list
```
**Expected**: Shows 10 expertise, 10 personality, 8 approach traits

#### Test 2: Compose Agent by Traits
```bash
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "security,skeptical,thorough" \
  --output summary
```
**Expected**: Shows composed agent name, traits, and voice

#### Test 3: Compose Agent by Task
```bash
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --task "Review this API for vulnerabilities" \
  --output json
```
**Expected**: Infers security-related traits from task description

#### Test 4: Generate Full Prompt
```bash
bun run $PAI_DIR/skills/Agents/Tools/AgentFactory.ts \
  --traits "research,enthusiastic,exploratory" \
  --output prompt
```
**Expected**: Full agent prompt with personality and approach sections

---

## Quick Verification Script

```bash
#!/bin/bash
PAI_DIR="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Agents Skill Verification ==="
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
[ -f "$PAI_DIR/skills/Agents/SKILL.md" ]
check $? "SKILL.md exists"

[ -f "$PAI_DIR/skills/Agents/Data/Traits.yaml" ]
check $? "Traits.yaml exists"

[ -f "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" ]
check $? "AgentFactory.ts exists"

[ -f "$PAI_DIR/skills/Agents/Templates/DynamicAgent.hbs" ]
check $? "DynamicAgent.hbs exists"

# CLI check
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" --help >/dev/null 2>&1
check $? "CLI tool runs"

# List traits check
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" --list 2>/dev/null | grep -q "EXPERTISE"
check $? "Traits list works"

# Composition check
bun run "$PAI_DIR/skills/Agents/Tools/AgentFactory.ts" --traits "security,skeptical" --output summary 2>/dev/null | grep -q "COMPOSED"
check $? "Agent composition works"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ $FAIL -eq 0 ]; then
  echo "Agents Skill installation verified successfully!"
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
| AgentFactory.ts not found | Check `$PAI_DIR` is set correctly |
| Missing dependencies | Run `bun add yaml handlebars` in Tools directory |
| Traits.yaml parse error | Check YAML syntax is valid |
| Template not found | Verify DynamicAgent.hbs exists in Templates/ |
| Voice IDs not working | Replace placeholder IDs with actual TTS provider IDs |
