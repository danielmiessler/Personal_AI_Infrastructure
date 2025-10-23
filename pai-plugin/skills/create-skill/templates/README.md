# Skill Templates

This directory contains templates for creating new skills in Kai's personal AI infrastructure.

## Available Templates

### 1. simple-skill-template.md
**Use for:**
- Single focused capability
- Straightforward workflows
- Minimal context needed (< 100 lines)
- Quick reference is sufficient

**Examples from PAI:**
- fabric-patterns
- youtube-extraction
- email

**Structure:**
- YAML frontmatter (name, description)
- When to Activate section
- Core workflow
- Commands/tools
- Examples
- Supplementary resources

### 2. complex-skill-template.md
**Use for:**
- Multi-phase workflows
- Extensive methodology
- Multiple components
- Requires deep context

**Examples from PAI:**
- development (with CLAUDE.md, primary-stack, style-guide)
- website (full lifecycle management)
- consulting (professional services)

**Structure:**
- YAML frontmatter
- When to Activate section
- Core workflow (multi-phase)
- Key components
- Configuration/stack
- Critical requirements
- Available commands
- Key principles

**Note:** Complex skills should have:
- SKILL.md (quick reference - use this template)
- CLAUDE.md (comprehensive guide - use CLAUDE-template.md)
- Supporting subdirectories as needed

### 3. skill-with-agents-template.md
**Use for:**
- Skills that use specialized agents
- Workflows requiring agent expertise
- Parallel execution capabilities
- Agent collaboration protocols

**Examples from PAI:**
- research (parallel researcher agents)
- development (architect + engineer agents)

**Structure:**
- YAML frontmatter
- When to Activate section
- Available agents (with training, voice, config)
- Execution workflow (single vs parallel)
- Agent collaboration protocol
- Speed benefits
- Supplementary resources

### 4. CLAUDE-template.md
**Use for:**
- Comprehensive documentation for complex skills
- Deep methodology guides
- Complete system documentation

**Pairs with:** complex-skill-template.md

**Structure:**
- Purpose statement
- What is [concept]?
- Architecture/methodology
- Complete workflow (all phases)
- Best practices
- Technology stack/tools
- Integration points
- Critical warnings
- Core principles
- Examples and patterns
- Troubleshooting
- Quick reference

## How to Use These Templates

### Step 1: Choose Template
Decide if your skill is:
- Simple → simple-skill-template.md
- Complex → complex-skill-template.md + CLAUDE-template.md
- Agent-based → skill-with-agents-template.md

### Step 2: Copy Template
```bash
cp ${CLAUDE_PLUGIN_ROOT}/skills/create-skill/templates/[template-name].md \
   ${CLAUDE_PLUGIN_ROOT}/skills/[new-skill-name]/SKILL.md
```

### Step 3: Customize
Replace all placeholders:
- `[skill-name]` → actual skill name
- `[description]` → actual description
- `[trigger phrase]` → actual trigger phrases
- All bracketed content → actual content

### Step 4: Write Content
Follow the structure, fill in all sections with actual content.

### Step 5: Add to Global Context
Update `${CLAUDE_PLUGIN_ROOT}/global/KAI.md` available_skills section.

### Step 6: Test
Test activation with natural language phrases.

## Template Placeholders

Look for these patterns and replace them:

- `[skill-name]` - The actual skill name
- `[description]` - Skill description
- `[trigger phrase]` - User phrases that activate skill
- `[capability]` - What the skill does
- `[domain]` - Area of expertise
- `[Main Content Sections]` - Section headings
- `[Phase Name]` - Workflow phase names
- `[Action]` - Specific actions
- `[Use Case Name]` - Example scenario names
- `[tool]`, `[command]`, `[resource]` - Actual tool/command/resource names
- `[Component]` - Actual component names
- `[HIGH-LEVEL GOAL]` - Purpose statement

## Validation Checklist

After using a template, verify:
- [ ] All `[bracketed placeholders]` replaced
- [ ] YAML frontmatter complete (name, description)
- [ ] Description includes activation triggers
- [ ] "When to Activate" section filled
- [ ] Instructions in imperative form
- [ ] Concrete examples included
- [ ] File paths are correct
- [ ] References work (if any)
- [ ] Added to KAI.md
- [ ] Tested with user phrases

## Common Mistakes

1. **Forgetting placeholders** - Search for `[` to find all
2. **Keeping template examples** - Replace with actual content
3. **Wrong template choice** - Simple skills don't need complex template
4. **Missing description triggers** - Add "USE WHEN" phrases
5. **Not testing** - Always test with natural language

## Further Reading

- Complete guide: `read ${CLAUDE_PLUGIN_ROOT}/skills/create-skill/CLAUDE.md`
- Quick reference: `read ${CLAUDE_PLUGIN_ROOT}/skills/create-skill/SKILL.md`
- Example skills: `ls ${CLAUDE_PLUGIN_ROOT}/skills/`
- Anthropic examples: https://github.com/anthropics/skills
