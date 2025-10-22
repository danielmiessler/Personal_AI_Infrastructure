# Create Skill - Comprehensive Skill Creation Guide

## 🎯 PURPOSE: EXTENDING KAI'S CAPABILITIES THROUGH MODULAR SKILLS

**Skills are modular, self-contained packages that extend Claude's capabilities with specialized knowledge, workflows, and tools.**

This guide combines:
- Anthropic's official skill methodology
- PAI-specific patterns and conventions
- Best practices from existing skills
- Template-driven quality standards

## 📚 WHAT ARE SKILLS?

### Definition

Skills are contextual packages that:
1. **Extend capabilities**: Add specialized knowledge or workflows
2. **Load progressively**: Metadata → Instructions → Resources
3. **Activate intelligently**: Match user intent to skill descriptions
4. **Work independently**: Self-contained but inherit global context
5. **Follow standards**: Consistent structure across all skills

### Skills vs Slash Commands

**Skills**:
- Contextual knowledge and workflows
- Always available in system prompt
- Triggered by matching user intent
- Can reference slash commands

**Slash Commands**:
- Executable workflows
- Must be explicitly invoked
- Typically orchestrate multiple tools
- Live in `${PAI_DIR}/commands/`

**Relationship**: Skills often invoke slash commands (e.g., research skill calls `/conduct-research`)

## 🏗️ SKILL ARCHITECTURE

### Three-Layer Loading System

**Layer 1: Metadata** (Always Loaded)
```yaml
---
name: skill-name
description: Clear description with activation triggers
---
```
- Appears in `<available_skills>` in system prompt
- Used for intent matching
- Must be concise but complete

**Layer 2: SKILL.md Body** (Loaded When Activated)
- Quick reference instructions
- Core workflows
- Key commands
- Examples
- References to deeper resources

**Layer 3: Supporting Resources** (Loaded As Needed)
- CLAUDE.md (comprehensive context)
- Subdirectories (components, templates, docs)
- Scripts, references, assets

### Directory Structure Patterns

#### Simple Skill Structure
```
${PAI_DIR}/skills/fabric-patterns/
└── SKILL.md          # Everything in one file
```

**Use when:**
- Single focused capability
- Minimal context needed
- Quick reference suffices

#### Complex Skill Structure
```
${PAI_DIR}/skills/development/
├── SKILL.md                      # Quick reference
├── CLAUDE.md                     # Full methodology
├── primary-stack/                # Reusable components
│   ├── auth-setup.md
│   ├── stripe-billing.md
│   └── business-metrics.md
├── style-guide/                  # UI patterns
│   └── [design resources]
└── [other subdirectories]
```

**Use when:**
- Multi-step workflows
- Extensive methodology
- Multiple sub-components
- Deep context required

## ✍️ WRITING EFFECTIVE SKILLS

### SKILL.md Structure

```markdown
---
name: skill-name
description: What it does, when to use it, key methods. USE WHEN triggers...
---

# Skill Name

## When to Activate This Skill
- Trigger phrase 1
- Trigger phrase 2
- User intent description

## Core Workflow / Main Instructions
[Primary instructions in imperative form]

## Available Tools / Commands
[Key commands, tools, or methods]

## Examples
[Concrete usage examples]

## Supplementary Resources
For full context: `read ${PAI_DIR}/skills/[name]/CLAUDE.md`
For components: `read ${PAI_DIR}/skills/[name]/[subdirectory]/`
```

### Description Writing Guidelines

**Critical elements:**
1. **What it does**: Clear capability statement
2. **Key methods/tools**: Mention specific technologies
3. **Activation triggers**: "USE WHEN user says..." phrases
4. **Unique characteristics**: What makes this skill special

**Examples from PAI:**

**Good - research skill:**
```yaml
description: Multi-source comprehensive research using perplexity-researcher,
  claude-researcher, and gemini-researcher agents. Launches up to 10 parallel
  research agents for fast results. USE WHEN user says 'do research', 'research X',
  'find information about', 'investigate', 'analyze trends', 'current events',
  or any research-related request.
```
✅ Clear what it does (multi-source research)
✅ Mentions tools (3 researcher types)
✅ Lists explicit triggers
✅ Explains benefit (parallel, fast)

**Good - chrome-devtools skill:**
```yaml
description: Chrome DevTools MCP for web application debugging, visual testing,
  and browser automation. The ONLY acceptable way to debug web apps - NEVER use
  curl, fetch, or wget. Provides screenshots, console inspection, network monitoring,
  and DOM analysis.
```
✅ States purpose (debugging, testing)
✅ Strong negative trigger (never use curl)
✅ Lists capabilities
✅ Clear domain (web applications)

**Bad example:**
```yaml
description: A skill for development tasks
```
❌ Too vague
❌ No triggers
❌ No tools mentioned
❌ Unclear when to use

### Instruction Writing Standards

**Use imperative/infinitive form** (verb-first instructions):
- ✅ "Create directory structure"
- ✅ "Launch research agents in parallel"
- ✅ "Use Chrome DevTools for debugging"
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
- ✅ "See CLAUDE.md for full methodology"
- ❌ [Copying entire global context into skill]

## 📋 SKILL CREATION WORKFLOW

### Phase 1: Planning

**Questions to answer:**
1. What problem does this skill solve?
2. When should it activate? (User phrases)
3. What tools/commands does it use?
4. Is it simple or complex?
5. Does similar skill exist? (Check existing skills)
6. What resources does it need?

**Decision: Simple vs Complex**

Choose SIMPLE if:
- Single focused capability
- < 100 lines of instruction
- No sub-components needed
- Quick reference is sufficient

Choose COMPLEX if:
- Multi-phase workflow
- Requires extensive methodology
- Has multiple components
- Needs deep context documentation

### Phase 2: Structure Creation

**For Simple Skill:**
```bash
mkdir -p ${PAI_DIR}/skills/[skill-name]
# Create SKILL.md only
```

**For Complex Skill:**
```bash
mkdir -p ${PAI_DIR}/skills/[skill-name]
mkdir -p ${PAI_DIR}/skills/[skill-name]/[component-dirs]
# Create SKILL.md, CLAUDE.md, and component files
```

### Phase 3: Content Writing

**Step 1: Write description first**
- This drives everything else
- Test by asking: "Would Kai activate this skill for relevant requests?"

**Step 2: Document activation triggers**
- List explicit user phrases
- Include natural language variations
- Think about how users express this need

**Step 3: Write core instructions**
- Use imperative form
- Be specific and actionable
- Include examples
- Reference deeper resources

**Step 4: Add supporting resources (if complex)**
- CLAUDE.md for methodology
- Component files for reusable pieces
- Templates or examples

### Phase 4: Integration

**Update global context:**

Edit `${PAI_DIR}/global/KAI.md`:
```markdown
<available_skills>
<skill>
<name>your-new-skill</name>
<description>Your description here</description>
<location>user</location>
</skill>
</available_skills>
```

**Verify location:**
- User-created skills: `<location>user</location>`
- System skills: `<location>system</location>`

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

### Phase 6: Iteration

**Refine based on:**
- Actual usage patterns
- User feedback
- Tool updates
- Methodology improvements

**Skills are living documents** - update as needed!

## 🎨 SKILL TEMPLATES

### Template 1: Simple Skill

```markdown
---
name: skill-name
description: Clear description of what skill does and when to use. USE WHEN user says 'trigger phrase', 'another phrase', or requests this capability.
---

# Skill Name

## When to Activate This Skill
- User requests X
- User says "trigger phrase"
- Task involves Y capability

## Core Workflow

[Main instructions in imperative form]

### Key Command
\`\`\`bash
command-example --flag value
\`\`\`

## Common Patterns

### Pattern 1
[Instructions for common use case]

### Pattern 2
[Instructions for another use case]

## Examples

\`\`\`bash
# Example 1: Basic usage
command "input" -p pattern

# Example 2: Advanced usage
command -u "url" -p pattern | process
\`\`\`

## Supplementary Resources
For advanced usage: `read ${PAI_DIR}/docs/[resource].md`
```

### Template 2: Complex Skill

**SKILL.md** (Quick Reference):
```markdown
---
name: skill-name
description: Comprehensive description. USE WHEN triggers include 'phrase 1', 'phrase 2', and related requests.
---

# Skill Name

## When to Activate This Skill
- Trigger condition 1
- Trigger condition 2
- Related capability requests

## Core Workflow

### Phase 1: Setup
[Quick setup instructions]

### Phase 2: Execution
[Core execution steps]

### Phase 3: Validation
[Validation steps]

## Key Components

- **Component 1**: Brief description
- **Component 2**: Brief description

## Default Configuration

[Standard settings or stack]

## Critical Requirements

- Requirement 1 (mandatory)
- Requirement 2 (mandatory)

## Supplementary Resources

For full methodology: `read ${PAI_DIR}/skills/[name]/CLAUDE.md`
For components: `read ${PAI_DIR}/skills/[name]/[component]/`

## Available Commands

- `/command-1` - What it does
- `/command-2` - What it does

## Key Principles

1. Principle 1
2. Principle 2
3. Principle 3
```

**CLAUDE.md** (Comprehensive Guide):
```markdown
# Skill Name - Comprehensive Guide

## 🎯 PURPOSE: [HIGH-LEVEL GOAL]

**[Value proposition and core capability]**

This guide covers:
- [Topic 1]
- [Topic 2]
- [Topic 3]

## 📚 WHAT IS [CAPABILITY]?

### Definition
[Detailed explanation]

### Key Concepts
- **Concept 1**: Explanation
- **Concept 2**: Explanation

### [Capability] vs [Alternative]
[Comparison table or explanation]

## 🏗️ ARCHITECTURE / METHODOLOGY

### [Main Framework]
[Detailed explanation of methodology]

### Components
[Detailed component documentation]

## 🔧 [MAIN WORKFLOW SECTION]

### Phase 1: [Step Name]
**Command:** `/command-name`

[Detailed instructions]

**Output:** [What gets created]

### Phase 2: [Step Name]
[Repeat for each phase]

## 💡 BEST PRACTICES

### [Category 1]
- Practice 1
- Practice 2

### [Category 2]
- Practice 1
- Practice 2

## 🛠️ TOOLS AND TECHNOLOGIES

[Detailed tool documentation]

## 📊 [ADDITIONAL SECTIONS]

[Any other necessary deep-dive content]

## 🔗 INTEGRATION POINTS

[How this skill integrates with other skills/tools]

## 🚨 CRITICAL WARNINGS

[Important caveats or rules]

## 🎯 KEY PRINCIPLES

1. Principle 1 with detailed explanation
2. Principle 2 with detailed explanation
[...]
```

### Template 3: Skill with Agents

```markdown
---
name: skill-name
description: Capability using specialized agents. Supports parallel execution. USE WHEN...
---

# Skill Name

## When to Activate This Skill
- Task requiring agent specialization
- Complex multi-step workflows
- Requests for [domain]

## Available Agents

### Agent 1 (Name)
**Training:** [Specialization]
**Voice:** [ElevenLabs ID]
**Configuration:** `${PAI_DIR}/agents/[name].md`
**Use for:** [When to use this agent]

### Agent 2 (Name)
[Same structure]

## Execution Workflow

### Single Agent
[Instructions for single agent use]

### Parallel Agents (Up to 10)
[Instructions for parallel execution]

**Parallelizable Work:**
- Independent task type 1
- Independent task type 2

**Sequential Work:**
- Dependent task type 1
- Task requiring shared state

## Agent Collaboration Protocol

[How agents work together]

## Supplementary Resources
For agent details: `read ${PAI_DIR}/agents/[name].md`
For methodology: `read ${PAI_DIR}/skills/[name]/CLAUDE.md`
```

## 🎯 REAL-WORLD EXAMPLES

### Example 1: Simple Skill (fabric-patterns)

**Analysis:**
- ✅ Single capability (process content with patterns)
- ✅ Straightforward workflow
- ✅ No sub-components needed
- ✅ Only SKILL.md required

**Structure:**
```
skills/fabric-patterns/
└── SKILL.md
```

**Key features:**
- Clear "When to Activate" section
- Lists common patterns
- Provides concrete examples
- References external docs only

### Example 2: Complex Skill (development)

**Analysis:**
- ✅ Multi-phase methodology (spec-kit)
- ✅ Multiple components (primary-stack, style-guide)
- ✅ Extensive context needed
- ✅ Requires SKILL.md + CLAUDE.md + components

**Structure:**
```
skills/development/
├── SKILL.md                    # Quick ref
├── CLAUDE.md                   # 500+ lines of methodology
├── primary-stack/              # Reusable components
│   ├── CLAUDE.md
│   ├── auth-setup.md
│   ├── stripe-billing.md
│   └── business-metrics.md
└── style-guide/                # UI patterns
    └── [resources]
```

**Key features:**
- SKILL.md = quick start (69 lines)
- CLAUDE.md = full guide (500+ lines)
- Progressive disclosure
- Component organization
- References slash commands

### Example 3: Skill with Agents (research)

**Analysis:**
- ✅ Uses multiple specialized agents
- ✅ Supports parallel execution
- ✅ Orchestrates complex workflows
- ✅ Simple SKILL.md sufficient

**Structure:**
```
skills/research/
└── SKILL.md
```

**Key features:**
- Lists available agents
- Explains parallel execution
- References slash command for orchestration
- Clear activation triggers
- Speed benefits highlighted

## 🔧 NAMING CONVENTIONS

### Skill Name (Directory & Metadata)
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

### File Names

**SKILL.md**: Always exactly this
**CLAUDE.md**: Always exactly this for comprehensive guides
**Other files**: Use descriptive names with context:
- `auth-setup.md`
- `stripe-billing.md`
- `visual-tdd-workflow.md`

## 📊 QUALITY CHECKLIST

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

### CLAUDE.md Quality (if complex)

- [ ] Clear purpose statement at top
- [ ] Comprehensive methodology documented
- [ ] All components explained
- [ ] Examples and patterns included
- [ ] Best practices section
- [ ] Integration points documented
- [ ] Critical warnings highlighted
- [ ] Consistent formatting throughout

### Integration Quality

- [ ] Added to global KAI.md available_skills
- [ ] All file references work correctly
- [ ] Slash commands exist (if referenced)
- [ ] MCP tools available (if referenced)
- [ ] Agents configured (if referenced)
- [ ] Templates present (if referenced)

### Testing Validation

- [ ] Skill activates with natural language
- [ ] All instructions execute correctly
- [ ] Examples work as documented
- [ ] File references resolve
- [ ] Commands/tools are available
- [ ] Workflow completes successfully

## 🚀 ADVANCED PATTERNS

### Pattern 1: Skill Composition

Skills can reference other skills:

```markdown
## Related Skills

This skill works with:
- **development**: For implementation
- **research**: For technology selection
- **chrome-devtools**: For visual testing
```

### Pattern 2: Conditional Loading

Use progressive disclosure:

```markdown
## Quick Start
[Minimal instructions]

## Advanced Usage
For comprehensive methodology: `read ${PAI_DIR}/skills/[name]/CLAUDE.md`

## Component Details
For [specific component]: `read ${PAI_DIR}/skills/[name]/[component]/`
```

### Pattern 3: Agent Integration

Skills can define agent collaboration:

```markdown
## Agent Workflow

1. **Architect** - Planning phases (can parallelize user stories)
2. **Engineer** - Implementation phases (can parallelize [P] tasks)
3. **Designer** - UX specifications (parallel with architect)

Maximum 10 parallel agents per phase.
```

### Pattern 4: Tool Orchestration

Skills can orchestrate multiple tools:

```markdown
## Tool Stack

1. **Ref MCP** - Documentation lookup
2. **Chrome DevTools MCP** - Visual testing
3. **Bash** - Command execution
4. **Grep/Glob** - Code search

Execute in sequence or parallel as appropriate.
```

## 📚 ANTHROPIC SKILL STANDARDS

### Key Principles from Anthropic

1. **Modular Design**: Self-contained packages
2. **Progressive Disclosure**: Load context as needed
3. **Clear Activation**: Description drives discovery
4. **Executable Instructions**: Imperative form
5. **Resource Organization**: Scripts, references, assets
6. **Version Control**: Track changes, iterate

### Anthropic Skill Categories

**Creative & Design:**
- algorithmic-art, canvas-design, slack-gif-creator

**Development & Technical:**
- artifacts-builder, mcp-builder, webapp-testing

**Enterprise & Communication:**
- brand-guidelines, internal-comms, theme-factory

**Meta Skills:**
- skill-creator, template-skill

**PAI follows same categorization principle but with personal infrastructure focus.**

## 🔗 INTEGRATION WITH PAI INFRASTRUCTURE

### Global Context Inheritance

Skills automatically have access to:
- Contacts (from KAI.md)
- Security rules (from KAI.md)
- Response format (from KAI.md)
- Stack preferences (from KAI.md)
- MCP servers (from .mcp.json)
- Agents (from agents directory)
- Commands (from commands directory)

**Don't duplicate - reference!**

### Slash Command Integration

Skills often reference slash commands:

```markdown
## How to Execute

**Execute the `/command-name` slash command**, which handles:
1. Step 1
2. Step 2
3. Step 3
```

**Relationship:**
- Skill = Knowledge + Context
- Command = Executable Workflow
- Skill activates → Command executes

### Agent Integration

Skills can specify agent usage:

```markdown
## Use Trained Agents

For this skill, use:
- **Agent Type**: Purpose
- **Configuration**: `${PAI_DIR}/agents/[name].md`
- **Parallel Execution**: Up to N agents for [work type]
```

### UFC Integration

Skills inherit Universal Output Capture:
- All execution automatically logged
- History searchable via commands
- Learnings captured automatically
- No manual documentation needed

## 🎯 SKILL MAINTENANCE

### When to Update Skills

- Tool versions change (e.g., new MCP capabilities)
- Methodology improves (e.g., better workflows discovered)
- User feedback reveals gaps
- Integration points change
- New components added

### Version Control

Track skill changes in git:
```bash
git add skills/[skill-name]/
git commit -m "Update [skill-name]: [what changed]"
```

### Deprecation

If skill becomes obsolete:
1. Mark as deprecated in description
2. Point to replacement skill
3. Don't delete immediately (grace period)
4. Remove from KAI.md available_skills

## 💡 KEY PRINCIPLES

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

## 🚨 COMMON MISTAKES TO AVOID

### Mistake 1: Vague Descriptions
❌ "A skill for web development"
✅ "Build applications using spec-kit methodology with TDD..."

### Mistake 2: Duplicating Global Context
❌ Copying contacts list into every skill
✅ "Use contacts from global context"

### Mistake 3: Missing Activation Triggers
❌ No "USE WHEN" phrases
✅ "USE WHEN user says 'do research', 'investigate'..."

### Mistake 4: Imperative Form Violations
❌ "You should create a directory"
✅ "Create directory structure"

### Mistake 5: Over-complicating Simple Skills
❌ Creating CLAUDE.md for 20-line skill
✅ Keep it simple with just SKILL.md

### Mistake 6: Under-documenting Complex Skills
❌ 500-line SKILL.md with no CLAUDE.md
✅ Split into SKILL.md (quick ref) + CLAUDE.md (full)

### Mistake 7: Broken References
❌ Referencing files that don't exist
✅ Verify all paths before committing

### Mistake 8: No Examples
❌ Only abstract instructions
✅ Include concrete usage examples

### Mistake 9: Skipping Testing
❌ Committing without validation
✅ Test with natural language first

### Mistake 10: Forgetting KAI.md Update
❌ Creating skill but not adding to available_skills
✅ Always update global context

## 🎓 LEARNING FROM EXISTING SKILLS

### Study These Examples

**For simple skills:**
- `fabric-patterns` - Clean, focused, complete
- `youtube-extraction` - Single capability, clear workflow
- `email` - Straightforward with important rules

**For complex skills:**
- `development` - Multi-phase methodology, components
- `website` - Full lifecycle management
- `consulting` - Professional service delivery

**For agent skills:**
- `research` - Parallel agent execution
- `development` - Agent collaboration protocol

**Read their code, understand their patterns, apply to your skills.**

## 🔧 TROUBLESHOOTING

### Skill Won't Activate

**Check:**
1. Is it in KAI.md available_skills?
2. Does description match user's intent?
3. Are activation triggers clear?
4. Test with exact trigger phrases

### Instructions Don't Work

**Check:**
1. Are all referenced files present?
2. Are commands/tools available?
3. Are paths correct?
4. Test step-by-step manually

### Complex Skill Overwhelming

**Solution:**
1. Split into SKILL.md + CLAUDE.md
2. Create component subdirectories
3. Use progressive disclosure
4. Reference rather than include

### Skill Too Generic

**Solution:**
1. Narrow the scope
2. Add specific trigger phrases
3. Define clear boundaries
4. Mention specific tools/methods

## 📚 FURTHER READING

### Anthropic Resources
- Official skills repository: https://github.com/anthropics/skills
- skill-creator: Study the meta-skill
- template-skill: Basic structure template
- Document skills: Advanced examples (PDF, DOCX, etc.)

### PAI Resources
- `${PAI_DIR}/global/KAI.md` - Global context and available_skills
- `${PAI_DIR}/agents/` - Agent configurations
- `${PAI_DIR}/commands/` - Slash commands
- `${PAI_DIR}/docs/` - MCP and tool documentation

### Testing Your Skills
- Launch new Claude session to test clean state
- Use various phrasings of activation triggers
- Verify all file references work
- Check commands execute correctly
- Validate against examples

---

## 🎯 FINAL CHECKLIST: BEFORE DECLARING SKILL COMPLETE

- [ ] **Purpose** - Crystal clear what skill does
- [ ] **Structure** - Correct simple/complex pattern
- [ ] **Description** - Includes activation triggers
- [ ] **Instructions** - Imperative form, actionable
- [ ] **Examples** - Concrete usage scenarios
- [ ] **References** - All paths work
- [ ] **Integration** - Added to KAI.md
- [ ] **Testing** - Validated with user phrases
- [ ] **Documentation** - CLAUDE.md if complex
- [ ] **Templates** - Included if applicable
- [ ] **Quality** - Reviewed against checklist
- [ ] **Commit** - Version controlled

**If all checked, skill is ready to use! 🚀**
