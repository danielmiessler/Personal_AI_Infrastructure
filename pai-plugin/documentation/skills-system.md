# Skills System Documentation

## Overview

The Skills System is PAI's modular capability framework that extends AI functionality through self-contained packages of specialized knowledge, workflows, and tools. Skills provide progressive disclosure of information and activate based on semantic understanding of user intent.

## Core Concepts

### What Are Skills?

Skills are contextual packages that:
1. **Extend capabilities**: Add specialized knowledge or workflows
2. **Load progressively**: Metadata → Instructions → Resources
3. **Activate intelligently**: Match user intent to skill descriptions
4. **Work independently**: Self-contained but inherit global context
5. **Follow standards**: Consistent structure across all skills

### Skills vs Traditional Context Files

**Skills System (Current):**
- Modular, self-contained packages
- Progressive disclosure (SKILL.md → CLAUDE.md → Resources)
- Intent-based activation through descriptions
- Template-driven consistency
- Clear activation triggers

**Context Files (Legacy):**
- Monolithic documentation
- Always loaded in full
- Directory-based organization
- Less structured

### Skills vs Slash Commands

**Skills:**
- Contextual knowledge and workflows
- Always available in system prompt
- Triggered by matching user intent
- Can reference slash commands

**Slash Commands:**
- Executable workflows
- Must be explicitly invoked (`/command-name`)
- Typically orchestrate multiple tools
- Live in `${CLAUDE_PLUGIN_ROOT}/commands/`

**Relationship**: Skills often invoke slash commands (e.g., research skill calls `/conduct-research`)

## How Skills Work

### 1. Three-Layer Architecture

**Layer 1: Metadata (Always Loaded)**
```yaml
---
name: skill-name
description: Clear description with activation triggers
---
```
- Appears in `<available_skills>` in system prompt
- Used for intent matching
- Must be concise but complete

**Layer 2: SKILL.md Body (Loaded When Activated)**
```markdown
## When to Activate This Skill
- Trigger condition 1
- Trigger condition 2

## Core Workflow
[Main instructions]

## Supplementary Resources
For full context: `read ${CLAUDE_PLUGIN_ROOT}/skills/[name]/CLAUDE.md`
```

**Layer 3: Supporting Resources (Loaded As Needed)**
- CLAUDE.md (comprehensive methodology)
- Subdirectories (components, templates)
- Scripts, references, assets

### 2. Intent Matching & Activation

Skills activate when user requests match their descriptions:

```yaml
User: "I need to do research on quantum computing"
↓
System checks available_skills
↓
Matches: "research" skill description contains:
  "USE WHEN user says 'do research', 'research X', 'find information about'..."
↓
Activates research skill
↓
Loads SKILL.md instructions
```

### 3. Progressive Disclosure Flow

```
User Request → Intent Match → Load SKILL.md → Execute Workflow
                                     ↓
                              (If needed) Load CLAUDE.md
                                     ↓
                              (If needed) Load Components
```

## Skill Structure Patterns

### Simple Skill (SKILL.md only)

```
${CLAUDE_PLUGIN_ROOT}/skills/fabric-patterns/
└── SKILL.md          # Everything in one file
```

**Use when:**
- Single focused capability
- Minimal context needed
- Quick reference suffices
- < 100 lines of instruction

**Example: fabric-patterns**
- Clear single purpose (process content with Fabric CLI)
- Lists available patterns
- Provides usage examples
- No sub-components needed

### Complex Skill (Multi-file)

```
${CLAUDE_PLUGIN_ROOT}/skills/development/
├── SKILL.md                      # Quick reference
├── CLAUDE.md                     # Full methodology (500+ lines)
├── primary-stack/                # Reusable components
│   ├── CLAUDE.md
│   ├── auth-setup.md
│   ├── stripe-billing.md
│   └── business-metrics.md
├── style-guide/                  # UI patterns
│   └── [design resources]
└── [other subdirectories]
```

**Use when:**
- Multi-phase workflows
- Extensive methodology
- Multiple sub-components
- Deep context required

**Example: development**
- Comprehensive spec-kit methodology
- Multiple reusable components
- Progressive disclosure (69-line SKILL.md, 500+ line CLAUDE.md)
- Component-based organization

## Creating Skills

### Phase 1: Planning

**Questions to answer:**
1. What problem does this skill solve?
2. When should it activate? (User phrases)
3. What tools/commands does it use?
4. Is it simple or complex?
5. Does similar skill exist?
6. What resources does it need?

### Phase 2: Structure Creation

**Simple Skill:**
```bash
mkdir -p ${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]
# Create SKILL.md only
```

**Complex Skill:**
```bash
mkdir -p ${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]
mkdir -p ${CLAUDE_PLUGIN_ROOT}/skills/[skill-name]/[components]
# Create SKILL.md, CLAUDE.md, and component files
```

### Phase 3: Writing Content

**SKILL.md Template:**
```markdown
---
name: skill-name
description: What it does, when to use it, key methods. USE WHEN user says 'trigger phrase', 'another phrase'...
---

# Skill Name

## When to Activate This Skill
- User requests X
- User says "trigger phrase"
- Task involves Y capability

## Core Workflow

[Main instructions in imperative form]

## Examples

[Concrete usage examples]

## Supplementary Resources
For full guide: `read ${CLAUDE_PLUGIN_ROOT}/skills/[name]/CLAUDE.md`
```

**Description Guidelines:**

✅ **Good - research skill:**
```yaml
description: Multi-source comprehensive research using perplexity-researcher,
  claude-researcher, and gemini-researcher agents. Launches up to 10 parallel
  research agents for fast results. USE WHEN user says 'do research', 'research X',
  'find information about', 'investigate', 'analyze trends', 'current events',
  or any research-related request.
```
- Clear what it does (multi-source research)
- Mentions tools (3 researcher types)
- Lists explicit triggers
- Explains benefits (parallel, fast)

❌ **Bad example:**
```yaml
description: A skill for development tasks
```
- Too vague
- No triggers
- No tools mentioned
- Unclear when to use

### Phase 4: Integration

**Update global context:**

Edit your global configuration to include the skill in `<available_skills>`:
```xml
<skill>
<name>your-new-skill</name>
<description>Your description with USE WHEN triggers...</description>
<location>user</location>
</skill>
```

### Phase 5: Testing

**Test activation:**
1. Use natural language that should trigger skill
2. Verify skill loads correctly
3. Check all file references work
4. Validate against examples

**Test workflow:**
1. Follow instructions step-by-step
2. Verify commands execute correctly
3. Check all tools are available
4. Validate output matches expectations

## Skill Categories

### Development & Engineering
- **development**: Spec-kit methodology with TDD
- **chrome-devtools**: Browser automation and testing
- **create-skill**: Skill creation framework

### Research & Information
- **research**: Multi-source parallel research
- **web-scraping**: Data extraction and crawling
- **ref-documentation**: Technical documentation lookup

### Content & Communication
- **fabric-patterns**: Content processing with Fabric CLI
- **youtube-extraction**: YouTube content extraction
- **prompting**: Prompt engineering standards

### Tools & Utilities
- **ai-image-generation**: Image generation workflows
- **ai-video-generation**: Video generation workflows
- **ffuf**: Web fuzzing for security testing

### Meta Skills
- **create-skill**: How to create skills (meta!)
- **prompting**: How to write effective prompts

## Best Practices

### Description Writing

**Critical elements:**
1. **What it does**: Clear capability statement
2. **Key methods/tools**: Mention specific technologies
3. **Activation triggers**: "USE WHEN user says..." phrases
4. **Unique characteristics**: What makes this skill special

### Instruction Writing

**Use imperative/infinitive form:**
- ✅ "Create directory structure"
- ✅ "Launch research agents in parallel"
- ❌ "You should create a directory"
- ❌ "We will launch research agents"

**Be specific and actionable:**
- ✅ "Run `bun dev` to start server"
- ✅ "Execute `/conduct-research` slash command"
- ❌ "Start the application"
- ❌ "Do research"

**Reference, don't duplicate:**
- ✅ "Use contacts from global context"
- ✅ "Follow global security rules"
- ❌ [Copying entire global context into skill]

### Organization

**Progressive disclosure:**
- SKILL.md = Quick reference (< 150 lines)
- CLAUDE.md = Comprehensive guide (extensive)
- Components = Reusable pieces

**Self-contained but not redundant:**
- Include everything needed for the skill
- Reference global context, don't duplicate
- Clear dependencies

## Configuration

### Skill Directory Structure

```
${CLAUDE_PLUGIN_ROOT}/skills/
├── prompting/           # Simple skill
│   └── SKILL.md
├── create-skill/        # Complex skill with templates
│   ├── SKILL.md
│   ├── CLAUDE.md
│   └── templates/
│       ├── simple-skill-template.md
│       ├── complex-skill-template.md
│       └── skill-with-agents-template.md
├── development/         # Complex skill with components
│   ├── SKILL.md
│   ├── CLAUDE.md
│   ├── primary-stack/
│   │   ├── CLAUDE.md
│   │   ├── auth-setup.md
│   │   └── stripe-billing.md
│   └── style-guide/
└── [your-custom-skills]/
```

### Skill File Naming

- **SKILL.md**: Always exactly this (required)
- **CLAUDE.md**: Always exactly this for comprehensive guides
- **Other files**: Descriptive names with context
  - `auth-setup.md`
  - `stripe-billing.md`
  - `visual-tdd-workflow.md`

### Directory Naming

- **Format**: `lowercase-with-hyphens`
- **Length**: 2-4 words typically
- **Style**: Descriptive, not generic

**Good examples:**
- `chrome-devtools` (specific tool)
- `ai-image-generation` (clear capability)
- `fabric-patterns` (tool + method)
- `web-scraping` (clear domain)

**Bad examples:**
- `testing` (too generic)
- `helper` (meaningless)
- `chrome_devtools` (underscores)
- `ChromeDevTools` (capitals)

## Advanced Features

### Skill Composition

Skills can reference other skills:

```markdown
## Related Skills

This skill works with:
- **development**: For implementation
- **research**: For technology selection
- **chrome-devtools**: For visual testing
```

### Agent Integration

Skills can specify agent usage:

```markdown
## Available Agents

### Perplexity Researcher
**Training:** Web research specialist
**Use for:** Real-time information gathering

### Claude Researcher
**Training:** Deep analysis and synthesis
**Use for:** Comprehensive research reports

Maximum 10 parallel agents for independent research queries.
```

### Tool Orchestration

Skills can orchestrate multiple tools:

```markdown
## Tool Stack

1. **Ref MCP** - Documentation lookup
2. **Chrome DevTools MCP** - Visual testing
3. **Bash** - Command execution
4. **Grep/Glob** - Code search

Execute in sequence or parallel as appropriate.
```

## Troubleshooting

### Skill Won't Activate

**Check:**
1. Is it in global available_skills?
2. Does description match user's intent?
3. Are activation triggers clear?
4. Test with exact trigger phrases

**Debug:**
- Check system prompt for skill in `<available_skills>`
- Verify SKILL.md metadata is valid YAML
- Test description clarity

### Instructions Don't Work

**Check:**
1. Are all referenced files present?
2. Are commands/tools available?
3. Are paths correct (use `${CLAUDE_PLUGIN_ROOT}` variables)?
4. Test step-by-step manually

**Debug:**
- Verify all file paths with `ls`
- Check command availability
- Test each instruction independently

### Skill Too Complex

**Solution:**
1. Split into SKILL.md + CLAUDE.md
2. Create component subdirectories
3. Use progressive disclosure
4. Reference rather than include

## Skill Quality Checklist

### Before Creating Skill

- [ ] Clearly defined purpose
- [ ] Identified activation triggers
- [ ] Checked for existing similar skills
- [ ] Determined simple vs complex structure
- [ ] Listed required tools/commands
- [ ] Identified supporting resources needed

### SKILL.md Quality

- [ ] Complete YAML frontmatter (name, description)
- [ ] Description includes activation triggers
- [ ] "When to Activate" section present
- [ ] Instructions in imperative form
- [ ] Concrete examples included
- [ ] References to deeper resources (if applicable)
- [ ] No duplication of global context
- [ ] Tested with realistic user requests

### Integration Quality

- [ ] Added to global available_skills
- [ ] All file references work correctly
- [ ] Slash commands exist (if referenced)
- [ ] MCP tools available (if referenced)
- [ ] Agents configured (if referenced)
- [ ] Templates present (if referenced)

## Migration from Context System

If you're upgrading from the old context-based system:

### What Changed

**Before (Context System):**
```
${CLAUDE_PLUGIN_ROOT}/context/
├── CLAUDE.md
├── projects/
│   └── website/
│       └── CLAUDE.md
└── tools/
    └── CLAUDE.md
```
- Monolithic files
- Directory-based organization
- Always loaded in full

**After (Skills System):**
```
${CLAUDE_PLUGIN_ROOT}/skills/
├── website/
│   ├── SKILL.md
│   └── CLAUDE.md
├── prompting/
│   └── SKILL.md
└── create-skill/
    ├── SKILL.md
    ├── CLAUDE.md
    └── templates/
```
- Modular packages
- Intent-based activation
- Progressive disclosure

### Migration Steps

1. **Identify capabilities** in old context files
2. **Group related** content into skill topics
3. **Create SKILL.md** for each capability
4. **Extract methodology** into CLAUDE.md (if complex)
5. **Add descriptions** with activation triggers
6. **Update global context** to include skills
7. **Test activation** with natural language
8. **Remove old** context directory

## Key Principles

1. **Progressive disclosure**: SKILL.md = quick ref, CLAUDE.md = deep dive
2. **Clear activation**: Description enables intent matching
3. **Executable instructions**: Imperative form, actionable steps
4. **No duplication**: Reference global context, don't copy
5. **Self-contained**: Work independently with clear dependencies
6. **Template-driven**: Use templates for consistency
7. **Test thoroughly**: Validate with real user requests
8. **Iterate constantly**: Skills are living documents
9. **Document clearly**: Future you will thank you
10. **Follow standards**: Consistency across all skills

## Examples from PAI

### Example 1: Simple Skill (fabric-patterns)

**Analysis:**
- ✅ Single capability (process content with patterns)
- ✅ Straightforward workflow
- ✅ No sub-components needed
- ✅ Only SKILL.md required (69 lines)

**Key features:**
- Clear "When to Activate" section
- Lists all available Fabric patterns
- Provides concrete examples
- References external Fabric docs

### Example 2: Complex Skill (development)

**Analysis:**
- ✅ Multi-phase methodology (spec-kit)
- ✅ Multiple components (primary-stack, style-guide)
- ✅ Extensive context needed
- ✅ Requires SKILL.md + CLAUDE.md + components

**Structure:**
- SKILL.md = 69 lines (quick start)
- CLAUDE.md = 500+ lines (full methodology)
- Components organized by function
- Progressive disclosure in action

**Key features:**
- Quick reference in SKILL.md
- Comprehensive guide in CLAUDE.md
- Reusable components
- References slash commands

### Example 3: Agent Skill (research)

**Analysis:**
- ✅ Uses multiple specialized agents
- ✅ Supports parallel execution
- ✅ Orchestrates complex workflows
- ✅ Simple SKILL.md sufficient

**Key features:**
- Lists 3 research agent types
- Explains parallel execution (up to 10)
- References `/conduct-research` slash command
- Clear activation triggers
- Speed benefits highlighted

## Further Reading

### Anthropic Resources
- Official skills: https://github.com/anthropics/skills
- skill-creator: Meta-skill for creating skills
- template-skill: Basic structure template

### PAI Resources
- `${CLAUDE_PLUGIN_ROOT}/skills/prompting/` - Prompt engineering standards
- `${CLAUDE_PLUGIN_ROOT}/skills/create-skill/` - Comprehensive skill creation guide
- `${CLAUDE_PLUGIN_ROOT}/agents/` - Agent configurations
- `${CLAUDE_PLUGIN_ROOT}/commands/` - Slash commands

---

*Skills System Version 2.0.0*
*Migrated from UFC Context System October 2025*

## Recent Changes (2025-10-19)

- ➕ `skills/fabric/SKILL.md` (added)
  - +18 / -0 lines


## Recent Changes (2025-10-19)

- ➕ `skills/always-init/SKILL.md` (added)
  - +98 / -0 lines


## Recent Changes (2025-10-19)

- ✏️ `skills/PAI/SKILL.md` (modified)
  - +93 / -199 lines
- 🗑️ `skills/PAI/contacts.md` (deleted)
  - +0 / -41 lines
- 🗑️ `skills/PAI/preferences.md` (deleted)
  - +0 / -53 lines
- 🗑️ `skills/PAI/response-format.md` (deleted)
  - +0 / -70 lines
- 🗑️ `skills/PAI/security-detailed.md` (deleted)
  - +0 / -82 lines
- 🗑️ `skills/PAI/voice-ids.md` (deleted)
  - +0 / -59 lines

---
<!-- Last Updated: 2025-10-19 -->
