# Create Skill Workflow

**Purpose:** Create a brand new PAI skill following canonical architectural standards

**When to Use:**
- User says "create skill", "create a skill", "new skill", "build skill", "make skill"
- User wants to add new capability domain to PAI
- User requests "skill for [purpose]"

**Prerequisites:**
- Access to SKILL-STRUCTURE-AND-ROUTING.md
- Understanding of skill purpose and requirements
- Target skill name determined

---

## Workflow Steps

### Step 1: Read Canonical Architecture

**REQUIRED FIRST STEP:** Read the source of truth before creating:
```bash
~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
```

**What to extract:**
- The 3 archetypes (Minimal, Standard, Complex)
- Canonical SKILL.md structure template
- Mandatory structural requirements
- Workflow routing rules
- Naming conventions
- The 8-category activation pattern
- Quality checklist

**Output:** Canonical architecture loaded into context

---

### Step 2: Define Skill Requirements

**Ask user to clarify:**

1. **What does this skill do?** (Core capability)
   - What problem does it solve?
   - What domain does it cover?
   - What are the main capabilities?

2. **When should it activate?** (Trigger patterns)
   - What phrases will users say?
   - What tasks trigger this skill?
   - What synonyms and variations?

3. **What workflows does it need?** (Count and types)
   - How many distinct workflows?
   - What are the workflow categories?
   - Are workflows sequential or independent?

4. **What integrations?** (Dependencies)
   - MCPs needed?
   - Agents required?
   - External services?
   - Tools or scripts?

5. **Skill name?** (Naming)
   - Kebab-case format: "skill-name"
   - Descriptive and clear
   - Follows naming conventions

**Output:** Complete skill requirements specification

---

### Step 3: Choose Archetype

**Based on workflow count and complexity:**

**Minimal Skill (0-3 workflows)**
- **Use when:** Single purpose, few workflows, no complex state
- **Structure:** SKILL.md + workflows/ OR assets/
- **Example:** be-creative, social-xpost

**Standard Skill (3-15 workflows)**
- **Use when:** Multi-workflow, clear domain, some documentation
- **Structure:** SKILL.md + workflows/ + optional (documentation/, references/, tools/)
- **Example:** research, blogging, media

**Complex Skill (15+ workflows)**
- **Use when:** Many workflows, extensive docs, state management, embedded apps
- **Structure:** SKILL.md + full directory tree
- **Example:** development, business, CORE

**Decision criteria:**
```
Workflow count:
├─ 0-3 → MINIMAL
├─ 3-15 → STANDARD
└─ 15+ → COMPLEX

Additional factors:
- State management needed? → Bump up one level
- Embedded applications? → COMPLEX
- Extensive documentation? → Bump up one level
```

**Output:** Archetype selected with rationale

---

### Step 4: Create Directory Structure

**For Minimal Skill:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/workflows
touch ~/.claude/skills/[skill-name]/SKILL.md
```

**For Standard Skill:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/{workflows,documentation}
touch ~/.claude/skills/[skill-name]/SKILL.md
```

**For Complex Skill:**
```bash
mkdir -p ~/.claude/skills/[skill-name]/{workflows,documentation,references,state,tools,testing}
touch ~/.claude/skills/[skill-name]/{SKILL.md,CONSTITUTION.md,METHODOLOGY.md}
```

**Verify creation:**
```bash
ls -la ~/.claude/skills/[skill-name]/
```

**Output:** Directory structure created

---

### Step 5: Create SKILL.md

**Use the canonical template from SKILL-STRUCTURE-AND-ROUTING.md:**

```markdown
---
name: skill-name
description: |
  Brief description of what this skill does and its core capabilities.

  USE WHEN user says "trigger phrase 1", "trigger phrase 2", "trigger phrase 3",
  "another variation", or any request related to [domain/purpose].
---

## Workflow Routing (SYSTEM PROMPT)

**CRITICAL: This section MUST be FIRST and route EVERY workflow.**

**When user requests [action 1]:**
Examples: "actual user phrase 1", "variation 1", "variation 2", "variation 3", "casual phrasing"
→ **READ:** ~/.claude/skills/skill-name/workflows/workflow1.md
→ **EXECUTE:** Brief description of what this workflow does

**When user requests [action 2]:**
Examples: "actual user phrase 1", "variation 1", "variation 2", "variation 3", "result-oriented phrasing"
→ **READ:** ~/.claude/skills/skill-name/workflows/workflow2.md
→ **EXECUTE:** Brief description of what this workflow does

[Continue for EVERY workflow - NO EXCEPTIONS]

---

## When to Activate This Skill

**Use the 8-category pattern for comprehensive coverage:**

### Direct [Skill Name] Requests (Categories 1-4)
- Core skill name and all variations
- "do [skill]", "run [skill]", "perform [skill]", "execute [skill]", "conduct [skill]"
- "basic [skill]", "quick [skill]", "simple [skill]", "comprehensive [skill]", "deep [skill]", "full [skill]"
- "[skill] on [target]", "[skill] for [target]", "[skill] about [target]"

### [Primary Use Case Category] (Categories 5-7)
- Synonyms and alternative phrasings
- Use case oriented: why would someone use this?
- Result-oriented: "find [thing]", "discover [thing]", "get [information]"

### [Secondary Use Case Category] (Category 8)
- Tool/method specific triggers if applicable
- Specialized scenarios

### [Additional Categories as Needed]
- Cover all major use cases
- Natural language variations

---

## Core Capabilities

**What this skill provides:**
- Capability 1: Description
- Capability 2: Description
- Capability 3: Description

---

## Workflow Overview

**[Category 1 - if applicable]**
- **workflow1.md** - Description and when to use
- **workflow2.md** - Description and when to use

**[Category 2 - if applicable]**
- **workflow3.md** - Description and when to use
- **workflow4.md** - Description and when to use

---

## Extended Context

[Additional information, configuration, integration details]

**Related Documentation:**
[Link any supporting docs]

**Integration Points:**
[MCPs, agents, external services]

**Configuration:**
[Any required setup or configuration]

---

## Examples

**Example 1: [Use Case Name]**

User: "example request"

Skill Response:
1. Routes to [workflow-name].md
2. Executes steps: [brief description]
3. Outcome: [what happens]

**Example 2: [Use Case Name]**

User: "another example request"

Skill Response:
1. Routes to [workflow-name].md
2. Executes steps: [brief description]
3. Outcome: [what happens]

---

**Related Documentation:**
- `~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md` - Canonical structure guide
- `~/.claude/skills/CORE/CONSTITUTION.md` - Overall PAI philosophy

**Last Updated:** [YYYY-MM-DD]
```

**Critical elements to include:**
1. ✅ YAML frontmatter with name and comprehensive description
2. ✅ USE WHEN triggers in description (5-10 variations)
3. ✅ Workflow Routing section FIRST (after YAML)
4. ✅ Every workflow explicitly routed with examples
5. ✅ 8-category activation pattern in "When to Activate"
6. ✅ Clear capability descriptions
7. ✅ Workflow overview linking all files
8. ✅ Concrete examples

**Output:** SKILL.md file created and compliant

---

### Step 6: Create Workflow Files

**For each workflow identified in Step 2:**

```bash
touch ~/.claude/skills/[skill-name]/workflows/[workflow-name].md
```

**Use standard workflow template:**

```markdown
# [Workflow Name]

**Purpose:** One-line description of what this workflow does

**When to Use:**
- Specific trigger condition 1
- Specific trigger condition 2
- When user needs to [specific outcome]

**Prerequisites:**
- Required tool or configuration
- Required state or artifact
- Any dependencies

---

## Workflow Steps

### Step 1: [Action Name]

**Description:** What this step accomplishes

**Actions:**
```bash
# Commands if applicable
command-to-run
```

**Expected Outcome:** What should happen

---

### Step 2: [Action Name]

**Description:** What this step accomplishes

**Actions:**
- Bullet point action 1
- Bullet point action 2

**Expected Outcome:** What should happen

---

### Step 3: [Final Action]

**Description:** Wrap up and verification

**Verification:**
- Success criteria 1
- Success criteria 2

---

## Outputs

**What this workflow produces:**
- Output 1: Description and location
- Output 2: Description and location

**Where outputs are stored:**
- Path or location

---

## Related Workflows

- **next-workflow.md** - What to do after this (if sequential)
- **alternative-workflow.md** - Alternative approach (if applicable)
- **parent-workflow.md** - Broader workflow this belongs to (if nested)

---

## Examples

**Example 1:**
Input: [Example input]
Process: [What happens]
Output: [Example output]

**Example 2:**
Input: [Example input]
Process: [What happens]
Output: [Example output]

---

**Last Updated:** [YYYY-MM-DD]
```

**Output:** All workflow files created

---

### Step 7: Validate Skill Structure

**Run structural validation:**

```bash
# Verify SKILL.md exists
test -f ~/.claude/skills/[skill-name]/SKILL.md && echo "✅ SKILL.md present" || echo "❌ SKILL.md missing"

# Verify workflows directory
test -d ~/.claude/skills/[skill-name]/workflows && echo "✅ workflows/ present" || echo "❌ workflows/ missing"

# Count workflow files
echo "Workflow count: $(find ~/.claude/skills/[skill-name]/workflows/ -name "*.md" | wc -l)"

# Verify archetype compliance
# Check against archetype rules
```

**Manual validation checklist:**
- [ ] YAML frontmatter present
- [ ] Workflow Routing section present and FIRST
- [ ] All workflows routed in Workflow Routing section
- [ ] "When to Activate This Skill" section present
- [ ] 8-category activation pattern used
- [ ] All workflow files exist
- [ ] All workflow files linked in SKILL.md
- [ ] Directory structure matches archetype
- [ ] Naming conventions followed
- [ ] Examples provided

**Output:** Validation results

---

### Step 8: Register Skill

**Add to `~/.claude/mcp_settings.json`:**

```json
{
  "skills": {
    "skill-name": {
      "description": "Brief description of skill. USE WHEN user says 'trigger 1', 'trigger 2', 'trigger 3', or requests [domain/task].",
      "location": "user"
    }
  }
}
```

**Important:**
- Description should be 1-2 sentences max
- Include 3-10 trigger phrases
- Include USE WHEN for clarity
- Location is "user" for user skills

**Verify registration:**
```bash
grep -A 3 '"skill-name"' ~/.claude/mcp_settings.json
```

**Output:** Skill registered in system

---

### Step 9: Test Skill Activation

**Test natural language triggers:**

1. **Start fresh conversation** (to load new skill)
2. **Try primary trigger:** "do [skill-name] for [target]"
3. **Try casual trigger:** "quick [skill-name]"
4. **Try result-oriented:** "find [result using skill]"
5. **Try use-case oriented:** "[problem that skill solves]"

**Expected:**
- Skill loads SKILL.md
- Routes to correct workflow
- Executes workflow steps

**If skill doesn't activate:**
- Check mcp_settings.json registration
- Verify trigger phrases in description
- Test with more explicit phrasing
- Review system prompt skill loading

**Output:** Skill activation confirmed

---

### Step 10: Document Creation

**Create skill creation record:**

```markdown
# Skill Creation: [skill-name]

**Created:** [YYYY-MM-DD]
**Archetype:** [Minimal/Standard/Complex]
**Workflow Count:** [N]

## Purpose
[Brief description of what this skill does]

## Capabilities
- Capability 1
- Capability 2
- Capability 3

## Workflows
1. workflow1.md - Purpose
2. workflow2.md - Purpose
[...]

## Integration Points
- MCP: [if applicable]
- Agents: [if applicable]
- External Services: [if applicable]

## Activation Triggers
- "trigger 1"
- "trigger 2"
- "trigger 3"

## Quality Validation
✅ Structural compliance
✅ Routing compliance
✅ Documentation complete
✅ Registered in mcp_settings.json
✅ Tested and functional

## Notes
[Any special considerations or future enhancements]
```

**Optional:** Add to skill inventory or changelog

**Output:** Creation documented

---

## Success Criteria

**Skill creation is complete when:**
- ✅ Archetype chosen and implemented
- ✅ Directory structure created
- ✅ SKILL.md written using canonical template
- ✅ Workflow Routing section present and FIRST
- ✅ ALL workflows routed explicitly
- ✅ 8-category activation pattern used
- ✅ All workflow files created
- ✅ All files referenced in SKILL.md
- ✅ Naming conventions followed
- ✅ Registered in mcp_settings.json
- ✅ Tested with natural language triggers
- ✅ Validated against quality checklist
- ✅ Documentation complete

---

## Common Patterns

### Pattern 1: Simple Utility Skill (Minimal)

**Example:** Generate API documentation

**Structure:**
```
api-docs/
├── SKILL.md
└── workflows/
    └── generate-docs.md
```

**Characteristics:**
- Single workflow
- No state
- Clear input/output
- Minimal configuration

### Pattern 2: Multi-Workflow Domain Skill (Standard)

**Example:** Database operations

**Structure:**
```
database/
├── SKILL.md
└── workflows/
    ├── run-migration.md
    ├── backup-database.md
    ├── optimize-queries.md
    └── execute-query.md
```

**Characteristics:**
- 4 distinct workflows
- Related capabilities
- Semantic routing
- Category-based organization

### Pattern 3: Comprehensive Framework Skill (Complex)

**Example:** Security testing framework

**Structure:**
```
security-testing/
├── SKILL.md
├── METHODOLOGY.md
├── documentation/
│   └── tools.md
├── workflows/
│   ├── recon/
│   ├── exploitation/
│   └── reporting/
├── tools/
│   └── automation/
└── references/
    └── checklists/
```

**Characteristics:**
- 15+ workflows
- Methodology document
- Nested organization
- State management
- Tool integration

---

## Related Workflows

- **validate-skill.md** - Validate created skill for compliance
- **canonicalize-skill.md** - Fix non-compliant existing skill
- **update-skill.md** - Add workflows or extend existing skill

---

## Notes

**Critical Success Factors:**
1. **ALWAYS read SKILL-STRUCTURE-AND-ROUTING.md FIRST**
2. **Workflow Routing section MUST be FIRST**
3. **Every workflow MUST be routed**
4. **8-category activation pattern is NOT optional**
5. **Test activation before declaring complete**

**One Source of Truth:**
Everything must align with:
`~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

**Progressive Disclosure:**
- SKILL.md is the hub (routing + overview)
- Workflows contain detailed steps
- Documentation provides deep context
- References provide supporting material

---

**Last Updated:** 2025-11-17
