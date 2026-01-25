# Verification Checklist - PAI Prompting Skill v2.3.0

## Mandatory Checks

All items must pass before installation is complete.

### Directory Structure

```bash
ls $PAI_DIR/skills/Prompting/
# Expected: SKILL.md Standards.md Templates/ Tools/

ls $PAI_DIR/skills/Prompting/Templates/Primitives/
# Expected: Roster.hbs Voice.hbs Structure.hbs Briefing.hbs Gate.hbs

ls $PAI_DIR/skills/Prompting/Templates/Evals/
# Expected: Judge.hbs Rubric.hbs Comparison.hbs Report.hbs TestCase.hbs

ls $PAI_DIR/skills/Prompting/Templates/Data/
# Expected: Agents.yaml ValidationGates.yaml VoicePresets.yaml
```

- [ ] `$PAI_DIR/skills/Prompting/` directory exists
- [ ] `SKILL.md` present
- [ ] `Standards.md` present
- [ ] `Templates/` directory exists
- [ ] `Templates/Primitives/` contains 5 `.hbs` files
- [ ] `Templates/Evals/` contains 5 `.hbs` files
- [ ] `Templates/Data/` contains 3 `.yaml` files
- [ ] `Templates/Tools/` contains CLI tools and package.json
- [ ] `Tools/` directory exists with `.ts` files

### Dependencies

```bash
cd $PAI_DIR/skills/Prompting/Tools
cat package.json | grep -E '"handlebars"|"yaml"'
# Should show both dependencies
```

- [ ] `handlebars` dependency installed
- [ ] `yaml` dependency installed

### Template Validation

```bash
# Validate all templates
for template in $PAI_DIR/skills/Prompting/Templates/Primitives/*.hbs; do
  bun run $PAI_DIR/skills/Prompting/Tools/ValidateTemplate.ts --template "$template"
done
```

- [ ] All 5 primitive templates pass validation

### Template Rendering

```bash
# Test template rendering
echo 'agents:
  test:
    id: "T-1"
    name: "Test Agent"
    display_name: "Test"
    role: "Tester"
    emoji: "test"
    personality:
      perspective: "Testing perspective"
      traits:
        - "Thorough"
        - "Precise"' > /tmp/test-agents.yaml

bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template $PAI_DIR/skills/Prompting/Templates/Primitives/Roster.hbs \
  --data /tmp/test-agents.yaml \
  --preview
```

- [ ] RenderTemplate.ts runs without errors
- [ ] Output shows formatted agent roster

### Gate Template Test

```bash
echo 'gate:
  name: "Test Gate"
  category: "testing"
  action_on_fail: "STOP"
  mandatory:
    - name: "Check 1"
      description: "First check"
  recommended:
    - name: "Optional 1"
      description: "Optional check"' > /tmp/test-gate.yaml

bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template $PAI_DIR/skills/Prompting/Templates/Primitives/Gate.hbs \
  --data /tmp/test-gate.yaml \
  --preview
```

- [ ] Gate template renders with MANDATORY and RECOMMENDED sections

### Briefing Template Test

```bash
echo 'briefing:
  type: research
agent:
  id: "R-1"
  name: "Research Analyst"
  personality:
    perspective: "What does the data show?"
    traits:
      - "Evidence-based"
context:
  summary: "Testing context handoff"
task:
  description: "Analyze this data."
output_format:
  type: markdown' > /tmp/test-briefing.yaml

bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template $PAI_DIR/skills/Prompting/Templates/Primitives/Briefing.hbs \
  --data /tmp/test-briefing.yaml \
  --preview
```

- [ ] Briefing template renders agent identity, context, and task sections

### Eval Template Test

```bash
echo 'eval:
  type: "judge"
  criteria:
    - name: "Accuracy"
      weight: 0.4
      description: "Response matches expected output"
    - name: "Completeness"
      weight: 0.3
      description: "All requirements addressed"
    - name: "Style"
      weight: 0.3
      description: "Follows formatting guidelines"' > /tmp/test-eval.yaml

bun run $PAI_DIR/skills/Prompting/Tools/RenderTemplate.ts \
  --template $PAI_DIR/skills/Prompting/Templates/Evals/Judge.hbs \
  --data /tmp/test-eval.yaml \
  --preview
```

- [ ] Judge template renders with evaluation criteria

## Verification Summary

| Check | Status |
|-------|--------|
| Directory structure | |
| Dependencies installed | |
| Templates valid | |
| Roster renders | |
| Gate renders | |
| Briefing renders | |
| Eval templates present | |

## Troubleshooting

### Template Not Rendering

1. Verify template path is correct (relative to Templates directory)
2. Check YAML syntax in data file
3. Run ValidateTemplate.ts to check for errors
4. Ensure all required variables exist in data

### Missing Helpers

If a helper isn't working:
1. Check spelling (helpers are case-sensitive)
2. Verify it's registered in RenderTemplate.ts
3. Check the helper signature matches usage

### Variable Not Found

1. Run ValidateTemplate.ts with `--data` to check
2. Verify nested property paths are correct
3. Check for typos in variable names

## Cleanup Test Files

```bash
rm /tmp/test-agents.yaml /tmp/test-gate.yaml /tmp/test-briefing.yaml /tmp/test-eval.yaml
```
