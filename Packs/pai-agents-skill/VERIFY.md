# PAI Agents Skill Verification

> **FOR AI AGENTS:** Complete this checklist AFTER installation. Every item must pass before declaring the pack installed.

---

## Directory Structure Verification

```bash
# Run these commands and verify output
```

### Check Agents skill directory exists
```bash
ls -la ~/.claude/skills/Agents/
```
**Expected:** Directory with SKILL.md, AgentPersonalities.md, Data/, Templates/, Tools/, Workflows/

### Check data files
```bash
ls ~/.claude/skills/Agents/Data/
```
**Expected:** Traits.yaml

### Check templates
```bash
ls ~/.claude/skills/Agents/Templates/
```
**Expected:** DynamicAgent.hbs

### Check tools directory
```bash
ls ~/.claude/skills/Agents/Tools/
```
**Expected:** AgentFactory.ts, LoadAgentContext.ts, SpawnAgentWithProfile.ts, package.json

### Check workflows
```bash
ls ~/.claude/skills/Agents/Workflows/
```
**Expected:** CreateCustomAgent.md, ListTraits.md, SpawnParallelAgents.md

### Check agent templates
```bash
ls ~/.claude/agents/
```
**Expected:** Engineer.md, Architect.md, Designer.md, QATester.md, Pentester.md, Artist.md, Intern.md, plus researcher variants

---

## File Content Verification

### SKILL.md contains workflow routing
```bash
grep "Workflow Routing" ~/.claude/skills/Agents/SKILL.md
```
**Expected:** Match found

### Traits.yaml contains all trait categories
```bash
grep -E "^expertise:|^personality:|^approach:" ~/.claude/skills/Agents/Data/Traits.yaml
```
**Expected:** All three categories found

### Traits.yaml contains voice mappings
```bash
grep "voice_mappings:" ~/.claude/skills/Agents/Data/Traits.yaml
```
**Expected:** Match found

### DynamicAgent template is valid Handlebars
```bash
grep "{{#if expertise}}" ~/.claude/skills/Agents/Templates/DynamicAgent.hbs
```
**Expected:** Match found

### Agent templates have correct frontmatter
```bash
head -10 ~/.claude/agents/Engineer.md
```
**Expected:** YAML frontmatter with name, description, model, voiceId

---

## Tool Verification

### AgentFactory runs successfully
```bash
cd ~/.claude/skills/Agents/Tools && bun run AgentFactory.ts --list | head -30
```
**Expected:** Lists expertise, personality, approach categories

### AgentFactory composes agent from task
```bash
cd ~/.claude/skills/Agents/Tools && bun run AgentFactory.ts --task "Review security" --output summary
```
**Expected:** Shows composed agent with traits and voice

### AgentFactory composes agent from traits
```bash
cd ~/.claude/skills/Agents/Tools && bun run AgentFactory.ts --traits "security,skeptical,thorough" --output summary
```
**Expected:** Shows "Security Expert Skeptical Thorough" agent

### LoadAgentContext lists available agents
```bash
cd ~/.claude/skills/Agents/Tools && bun run LoadAgentContext.ts
```
**Expected:** Lists Architect, Engineer, Designer, QATester

---

## Context File Verification

### EngineerContext.md exists and has required sections
```bash
grep "## Required Knowledge" ~/.claude/skills/Agents/EngineerContext.md
```
**Expected:** Match found (context files are in skills/Agents/, not agents/)

### All context files exist (9 total)
```bash
for ctx in Architect Artist ClaudeResearcher CodexResearcher Designer Engineer GeminiResearcher GrokResearcher QATester; do
  [ -f ~/.claude/skills/Agents/${ctx}Context.md ] && echo "OK ${ctx}Context.md" || echo "MISSING ${ctx}Context.md"
done
```
**Expected:** All 9 show OK

---

## Integration Verification

### Trait count verification
```bash
cd ~/.claude/skills/Agents/Tools && bun run AgentFactory.ts --list 2>/dev/null | grep -c "^  [a-z]"
```
**Expected:** 28 or more (10 expertise + 10 personality + 8 approach)

### Voice mapping verification
```bash
grep "voice_registry:" ~/.claude/skills/Agents/Data/Traits.yaml
```
**Expected:** Match found

### Agent template count
```bash
ls ~/.claude/agents/*.md 2>/dev/null | wc -l
```
**Expected:** 11 or more agent templates

---

## Installation Checklist

Mark each item as complete:

```markdown
## PAI Agents Skill Installation Verification

### Directory Structure
- [ ] ~/.claude/skills/Agents/ exists
- [ ] SKILL.md present
- [ ] AgentPersonalities.md present
- [ ] AgentProfileSystem.md present
- [ ] Data/ directory with Traits.yaml
- [ ] Templates/ directory with DynamicAgent.hbs
- [ ] Tools/ directory with 3+ TypeScript files
- [ ] Workflows/ directory with 3 workflow files

### Agent Templates
- [ ] ~/.claude/agents/ exists
- [ ] Engineer.md present
- [ ] Architect.md present
- [ ] Designer.md present
- [ ] QATester.md present
- [ ] Pentester.md present
- [ ] Artist.md present
- [ ] Intern.md present

### Context Files (9 total)
- [ ] EngineerContext.md present
- [ ] ArchitectContext.md present
- [ ] DesignerContext.md present
- [ ] QATesterContext.md present
- [ ] ArtistContext.md present
- [ ] ClaudeResearcherContext.md present
- [ ] CodexResearcherContext.md present
- [ ] GeminiResearcherContext.md present
- [ ] GrokResearcherContext.md present

### Tools
- [ ] AgentFactory.ts runs with --list
- [ ] AgentFactory.ts composes from --task
- [ ] AgentFactory.ts composes from --traits
- [ ] LoadAgentContext.ts lists available agents

### Functional
- [ ] AI recognizes "create custom agents" trigger
- [ ] AI recognizes "list traits" trigger
- [ ] AI can compose agent with specific traits
```

---

## Verification Complete

When all items pass:

1. **Confirm to user:** "PAI Agents Skill installation verified successfully"
2. **Recommend:** "Try creating a custom agent: 'create a skeptical security agent to review this code'"
3. **Note:** Voice integration requires VoiceServer to be running for audio output

---

## Troubleshooting

### AgentFactory fails to run
Check dependencies are installed:
```bash
cd ~/.claude/skills/Agents/Tools
bun install
```

### "Module not found" errors
Ensure package.json exists with dependencies:
```bash
cat > ~/.claude/skills/Agents/Tools/package.json << 'EOF'
{
  "name": "agent-tools",
  "type": "module",
  "dependencies": {
    "yaml": "^2.3.4",
    "handlebars": "^4.7.8"
  }
}
EOF
bun install
```

### Agent templates not recognized
Verify frontmatter is valid YAML:
```bash
head -20 ~/.claude/agents/Engineer.md
```
Should show valid `---` delimited frontmatter.

### Traits.yaml parsing errors
Verify YAML syntax:
```bash
python3 -c "import yaml; yaml.safe_load(open('$HOME/.claude/skills/Agents/Data/Traits.yaml'))" && echo "Valid YAML"
```

### Voice output not working
1. Ensure VoiceServer is running: `curl http://localhost:8888/health`
2. Check ElevenLabs API key is configured
3. Verify agent has valid voiceId in template frontmatter

---

## Quick Functional Test

Run this comprehensive test:

```bash
echo "=== PAI Agents Skill Quick Test ==="

# 1. Directory check
[ -d ~/.claude/skills/Agents ] && echo "OK Skill dir" || echo "FAIL Skill dir"

# 2. Agent templates check
[ -f ~/.claude/agents/Engineer.md ] && echo "OK Engineer template" || echo "FAIL Engineer template"

# 3. Traits file check
[ -f ~/.claude/skills/Agents/Data/Traits.yaml ] && echo "OK Traits.yaml" || echo "FAIL Traits.yaml"

# 4. AgentFactory test
cd ~/.claude/skills/Agents/Tools && bun run AgentFactory.ts --traits "security,skeptical" --output summary 2>/dev/null | grep -q "Security Expert" && echo "OK AgentFactory" || echo "FAIL AgentFactory"

echo "=== Test Complete ==="
```

**All four should show "OK" for a successful installation.**
