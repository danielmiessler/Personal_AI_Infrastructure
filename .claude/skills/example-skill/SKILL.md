---
name: example-skill
description: |
  Example skill demonstrating the Skills-as-Containers pattern with workflows,
  assets, and natural language routing. This is a teaching tool showing the
  complete PAI v1.2.0 architecture.

  USE WHEN user says 'show me an example', 'demonstrate the pattern',
  'how do skills work', 'example skill'
---

# Example Skill

**Purpose:** This skill exists to demonstrate the Skills-as-Containers pattern introduced in PAI v1.2.0. Use it as a template for creating your own skills.

## Architecture Overview

Skills in PAI v1.2.0 are organized as self-contained containers with:

### Core Components
- **SKILL.md** - Core skill definition with routing logic (you're reading it now!)
- **workflows/** - Specific task workflows for discrete operations
- **assets/** - Templates, references, and helper files

### Progressive Disclosure
1. **Metadata** (always loaded) - Name, description, triggers
2. **Instructions** (loaded when triggered) - This SKILL.md content
3. **Resources** (loaded as needed) - Individual workflow and asset files

## Included Workflows

This skill includes three example workflows demonstrating different complexity levels:

### 1. simple-task.md
**Purpose:** Basic single-step workflow
**Trigger:** User says "simple example", "basic task"
**Demonstrates:** Minimal workflow structure

### 2. complex-task.md
**Purpose:** Multi-step workflow with dependencies
**Trigger:** User says "complex example", "multi-step task"
**Demonstrates:** Structured workflow with validation

### 3. parallel-task.md
**Purpose:** Agent orchestration for parallel execution
**Trigger:** User says "parallel example", "parallel task"
**Demonstrates:** Multi-agent coordination pattern

## Routing Logic

Natural language automatically routes to the right workflow:

```
User Intent → Skill Activation → Workflow Selection → Execution

Example Flow:
"Show me a simple example"
    ↓ (matches trigger)
example-skill loads
    ↓ (analyzes intent: "simple")
simple-task.md selected
    ↓
Workflow executes
```

## Assets

This skill includes example assets in the `assets/` directory:
- `template.md` - Example template file
- `reference.md` - Example reference material

These demonstrate how to organize supporting resources.

## Usage Examples

### Basic Usage
```
User: "Show me a simple example"
→ Loads example-skill
→ Executes simple-task.md workflow
→ Returns basic workflow demonstration
```

### Complex Usage
```
User: "I need a complex multi-step example"
→ Loads example-skill
→ Executes complex-task.md workflow
→ Returns structured multi-step demonstration
```

### Parallel Usage
```
User: "How do I parallelize work?"
→ Loads example-skill
→ Executes parallel-task.md workflow
→ Returns agent orchestration demonstration
```

## Creating Your Own Skill

Use this skill as a template:

1. **Copy the structure:**
   ```bash
   cp -r ~/.claude/skills/example-skill ~/.claude/skills/your-skill-name
   ```

2. **Update SKILL.md:**
   - Change name and description in frontmatter
   - Update trigger phrases
   - Replace example content with your skill's purpose

3. **Create workflows:**
   - Add workflow files in workflows/ directory
   - Each workflow = one specific task
   - Name workflows descriptively

4. **Add assets (optional):**
   - Templates, references, helper scripts
   - Keep organized in assets/ directory

5. **Test activation:**
   - Test trigger phrases
   - Verify workflow routing
   - Ensure natural language works

## Best Practices

### Skill Organization
- ✅ One skill per domain/topic area
- ✅ Multiple workflows within a skill
- ✅ Clear trigger phrases
- ❌ Don't create skills for one-off tasks
- ❌ Don't duplicate knowledge across skills

### Workflow Design
- ✅ Self-contained with clear steps
- ✅ Focused on ONE specific task
- ✅ Include trigger phrases
- ❌ Don't make workflows too granular
- ❌ Don't duplicate skill context

### Natural Language Routing
- ✅ Use descriptive trigger phrases
- ✅ Test with variations
- ✅ Think like a user
- ❌ Don't require exact phrase matching
- ❌ Don't make users memorize commands

## Technical Details

### File Structure
```
example-skill/
├── SKILL.md              # This file (core definition)
├── workflows/            # Specific task workflows
│   ├── simple-task.md
│   ├── complex-task.md
│   └── parallel-task.md
├── assets/               # Supporting resources
│   ├── template.md
│   └── reference.md
└── README.md             # Overview documentation
```

### Loading Behavior
1. Skill metadata always loaded (YAML frontmatter)
2. SKILL.md body loaded when skill activates
3. Individual workflows loaded when selected
4. Assets loaded when referenced

### Integration Points
- **Natural Language:** Trigger phrases activate skill
- **Other Skills:** Can reference this skill's workflows
- **Agents:** Can invoke specific workflows
- **Commands:** Can route to this skill's workflows

## Documentation

- **Architecture:** See `~/Projects/PAI/docs/ARCHITECTURE.md`
- **Migration Guide:** See `~/Projects/PAI/docs/MIGRATION.md`
- **Skill Development:** See `~/.claude/skills/create-skill/`

## References

- **Anthropic Skills:** https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
- **PAI Repository:** https://github.com/danielmiessler/Personal_AI_Infrastructure
- **v1.2.0 Changes:** Skills-as-Containers migration completed 2025-10-31

---

**This is a template skill - customize it for your needs!**
