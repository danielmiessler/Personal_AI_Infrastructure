---
name: system-createskill
description: |
  Skill creation and validation framework ensuring compliance with PAI architectural standards.

  USE WHEN user says "create skill", "create a skill", "new skill", "build skill",
  "make skill", "skill for X", "Create-A-Skill", or any request to create new PAI skills.
---

## Workflow Routing (SYSTEM PROMPT)

**CRITICAL: Every skill creation request MUST follow architectural compliance validation.**

**When user requests creating a new skill:**
Examples: "create skill", "create a skill", "new skill", "build skill", "make skill", "skill for X", "Create-A-Skill"
→ **READ:** ~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
→ **READ:** ~/.claude/skills/system-createskill/workflows/create-skill.md
→ **EXECUTE:** Complete skill creation workflow with architectural validation

**When user requests validating existing skill:**
Examples: "validate skill", "check skill compliance", "audit skill", "verify skill structure"
→ **READ:** ~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
→ **READ:** ~/.claude/skills/system-createskill/workflows/validate-skill.md
→ **EXECUTE:** Skill compliance audit workflow

**When user requests updating existing skill:**
Examples: "update skill", "refactor skill", "fix skill routing", "add workflow to skill"
→ **READ:** ~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
→ **READ:** ~/.claude/skills/system-createskill/workflows/update-skill.md
→ **EXECUTE:** Skill update workflow with compliance checking

**When user requests canonicalizing a skill:**
Examples: "canonicalize skill", "canonicalize this skill", "canonicalize [skill-name]", "rebuild skill to standards", "refactor skill to canonical structure"
→ **READ:** ~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
→ **READ:** ~/.claude/skills/system-createskill/workflows/canonicalize-skill.md
→ **EXECUTE:** Complete skill canonicalization workflow - analyze current skill structure and rebuild according to canonical architecture while preserving functionality

---

## When to Activate This Skill

### Direct Skill Creation Requests
- "create skill", "create a skill", "new skill for X"
- "build skill", "make skill", "add skill"
- "Create-A-Skill" (canonical name)
- "skill for [purpose]" or "need a skill that does X"

### Skill Validation Requests
- "validate skill", "check skill compliance", "audit skill structure"
- "verify skill follows standards", "is this skill compliant"
- "review skill architecture", "skill quality check"

### Skill Update Requests
- "update skill", "refactor skill", "fix skill routing"
- "add workflow to skill", "extend skill"
- "reorganize skill structure", "migrate skill"

### Skill Canonicalization Requests
- "canonicalize skill", "canonicalize this skill", "canonicalize [skill-name]"
- "rebuild skill to standards", "refactor skill to canonical structure"
- "fix skill compliance", "bring skill to canonical form"
- "standardize skill structure", "make skill compliant"

### Quality & Compliance Indicators
- User mentions "architectural standards" or "compliance"
- User references "SKILL-STRUCTURE-AND-ROUTING.md"
- User asks about "skill best practices" or "skill patterns"
- User needs to ensure skill follows "template" or "philosophy"

---

## Core Principles

### Architectural Compliance

**MANDATORY: Every skill MUST comply with the canonical architecture defined in:**
`~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

This document defines:
- The 3 skill archetypes (Minimal, Standard, Complex)
- The 4-level routing hierarchy
- Mandatory structural requirements
- Workflow organization patterns
- Naming conventions
- Routing patterns

**NON-NEGOTIABLE Requirements:**

1. **Workflow Routing Section FIRST** - Immediately after YAML frontmatter
2. **Every Workflow Must Be Routed** - No orphaned workflow files
3. **Every Secondary File Must Be Linked** - From main SKILL.md body
4. **Canonical Structure Template** - Follow the exact structure
5. **Progressive Disclosure** - SKILL.md → workflows → documentation → references

### Template-Driven Philosophy

**Consistency over creativity** when it comes to structure:
- Use established archetypes (Minimal/Standard/Complex)
- Follow canonical naming conventions
- Implement proven routing patterns
- Maintain predictable organization

**Creativity where it matters:**
- Domain-specific workflows
- Custom capabilities
- Unique integrations
- Innovative approaches to problems

### Quality Gates

Every created/updated skill must pass:

1. **Structural Validation**
   - Correct archetype directory structure
   - Proper file naming conventions
   - Required files present

2. **Routing Validation**
   - Workflow Routing section present and FIRST
   - All workflows explicitly routed
   - Activation triggers comprehensive (8-category pattern)

3. **Documentation Validation**
   - All files referenced in SKILL.md
   - Clear purpose and when-to-use guidance
   - Examples provided

4. **Integration Validation**
   - Registered in mcp_settings.json
   - No duplication of CORE context
   - Compatible with agent workflows

---

## Skill Creation Process

### Step 1: Define Skill Purpose

Ask user to clarify:
- **What does this skill do?** (Core capability)
- **When should it activate?** (Trigger patterns)
- **What workflows does it need?** (Count and categories)
- **What integrations?** (MCPs, agents, external services)

### Step 2: Choose Archetype

Based on workflow count and complexity:

**Minimal Skill (1-3 workflows)**
```
skill-name/
├── SKILL.md
└── workflows/ OR assets/
    └── *.md
```

**Standard Skill (3-15 workflows)**
```
skill-name/
├── SKILL.md
├── workflows/
│   └── *.md (flat or nested)
└── [optional: documentation/, tools/, references/]
```

**Complex Skill (15+ workflows)**
```
skill-name/
├── SKILL.md
├── CONSTITUTION.md (optional)
├── METHODOLOGY.md (optional)
├── documentation/
├── workflows/ (nested)
├── references/
├── state/
└── tools/
```

### Step 3: Read Architecture Document

**ALWAYS read the canonical architecture before creating:**
```bash
~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
```

This ensures:
- Latest architectural requirements
- Current best practices
- Proven routing patterns
- Quality standards

### Step 4: Create Skill Structure

Use the canonical template from SKILL-STRUCTURE-AND-ROUTING.md:

```markdown
---
name: skill-name
description: |
  What this skill does and when to use it.

  USE WHEN: user says "trigger phrase", "another trigger", or any related request.
---

## Workflow Routing (SYSTEM PROMPT)

**When user requests [action 1]:**
Examples: "actual user phrases", "variations", "synonyms"
→ **READ:** ~/.claude/skills/skill-name/workflows/workflow1.md
→ **EXECUTE:** What to do with this workflow

[Route EVERY workflow file]

---

## When to Activate This Skill

[Comprehensive activation triggers using 8-category pattern]

---

## Extended Context / Main Body

[Detailed information, file links, examples]
```

### Step 5: Validate Compliance

Run through quality gates:
- ✅ Workflow Routing section present and FIRST?
- ✅ All workflows explicitly routed?
- ✅ All files referenced in main body?
- ✅ Activation triggers comprehensive?
- ✅ Examples provided?
- ✅ Naming conventions followed?

### Step 6: Register Skill

Add to `~/.claude/mcp_settings.json`:

```json
{
  "skills": {
    "skill-name": {
      "description": "Brief description. USE WHEN user says 'trigger', 'pattern', or requests 'task type'.",
      "location": "user"
    }
  }
}
```

### Step 7: Test Activation

Verify skill activates with natural language triggers from description.

---

## The 8-Category Routing Pattern

**For comprehensive activation triggers, cover these categories:**

1. **Core Skill Name (Noun)** - "OSINT", "research", "skill name"
2. **Action Verbs** - "do [skill]", "run [skill]", "perform [skill]", "execute [skill]"
3. **Modifiers** - "basic [skill]", "quick [skill]", "comprehensive [skill]", "deep [skill]"
4. **Prepositions** - "[skill] on [target]", "[skill] for [target]", "[skill] about [target]"
5. **Synonyms** - Industry jargon, casual vs formal phrasings
6. **Use Case Oriented** - Why would someone use this? What problem does it solve?
7. **Result-Oriented** - "find [thing]", "discover [thing]", "get [information]"
8. **Tool/Method Specific** - Specific tools or techniques within the skill

**Example from security-OSINT skill:**
```markdown
## When to Activate This Skill

### Direct OSINT Requests (Categories 1-4)
- "do OSINT on [target]" or "do some OSINT"
- "run OSINT", "perform OSINT", "conduct OSINT"
- "basic OSINT", "quick OSINT", "comprehensive OSINT"
- "OSINT [target]", "OSINT on [target]", "OSINT for [target]"

### Investigation & Research (Categories 5-7)
- "investigate [person/company]", "research [target]"
- "background check", "due diligence", "find information"
- "who is [person]", "what can you find about [target]"
```

---

## Routing Patterns Reference

### Pattern 1: Semantic Routing
**Use when:** Distinct capabilities map to different user intents

```markdown
**When user requests [specific intent]:**
Examples: "phrase 1", "phrase 2", "phrase 3"
→ **READ:** ~/.claude/skills/skill-name/workflows/workflow1.md
→ **EXECUTE:** Brief description
```

### Pattern 2: State-Based Routing
**Use when:** Routing depends on current task state or phase

```markdown
### Phase 1: [State Name]
**Current State:** No spec exists
**Use:** workflow1.md to create spec
```

### Pattern 3: Agent-Delegated Routing
**Use when:** Complex context requires agent decision

```markdown
## Available Capabilities

### Category 1
- workflow1.md - Description of capability
- workflow2.md - Description of capability
```

### Pattern 4: Cross-Skill Delegation
**Use when:** Another skill has specialized methodology

```markdown
**CRITICAL: Check if request should be delegated to specialized skills FIRST**

**When user requests [use case needing delegation]:**
Examples: "phrase 1", "phrase 2"
→ **INVOKE SKILL:** specialized-skill-name
→ **REASON:** Why delegation is required
```

---

## Common Anti-Patterns to Avoid

### ❌ Missing Workflow Routing Section
**Problem:** Workflows never get invoked
**Solution:** Add "Workflow Routing (SYSTEM PROMPT)" section FIRST

### ❌ Workflows Not Explicitly Routed
**Problem:** Orphaned workflow files that are never used
**Solution:** Route EVERY workflow with examples and file paths

### ❌ Files Not Linked from Main Body
**Problem:** Files are invisible and undiscoverable
**Solution:** Reference every .md file in appropriate section

### ❌ Vague Activation Triggers
**Problem:** "Any security testing request" - too broad
**Solution:** Use 8-category pattern with specific examples

### ❌ Wrong Section Order
**Problem:** Workflow routing buried in middle of file
**Solution:** Workflow Routing section immediately after YAML

### ❌ Duplication of CORE Context
**Problem:** Skill repeats information already in CORE
**Solution:** Reference CORE docs, don't duplicate

### ❌ No Examples
**Problem:** Users don't understand when to use skill
**Solution:** Provide clear example requests and outcomes

---

## Quality Checklist

Before considering a skill complete, verify:

**Structure:**
- [ ] Correct archetype directory structure
- [ ] SKILL.md present and properly formatted
- [ ] YAML frontmatter with name and description
- [ ] workflows/ directory (if Standard or Complex)

**Routing:**
- [ ] Workflow Routing section present
- [ ] Workflow Routing section is FIRST (after YAML)
- [ ] Every workflow explicitly routed with examples
- [ ] File paths are absolute and correct

**Activation:**
- [ ] Comprehensive trigger patterns (8-category coverage)
- [ ] "When to Activate This Skill" section detailed
- [ ] USE WHEN in YAML description
- [ ] Natural language variations covered

**Documentation:**
- [ ] All files referenced in SKILL.md main body
- [ ] Clear purpose and when-to-use for each file
- [ ] Examples provided
- [ ] Related workflows linked

**Integration:**
- [ ] Registered in mcp_settings.json
- [ ] No duplication of CORE context
- [ ] Compatible with existing skills
- [ ] Tested activation with natural language

**Quality:**
- [ ] Follows naming conventions
- [ ] Progressive disclosure pattern
- [ ] Self-contained but inherits CORE
- [ ] Validated against SKILL-STRUCTURE-AND-ROUTING.md

---

## Extended Context

### Primary Reference Document

**~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md**
- Canonical guide for all skill structure and routing
- Defines the 3 archetypes (Minimal, Standard, Complex)
- The 4-level routing hierarchy
- All structural requirements and naming conventions
- Routing pattern examples
- Complete skill ecosystem reference
- **ALWAYS read this before creating or updating skills**

### Workflow Files

**~/.claude/skills/system-createskill/workflows/create-skill.md**
- Complete skill creation workflow
- Step-by-step process with validation gates
- Template generation
- Quality assurance checks

**~/.claude/skills/system-createskill/workflows/validate-skill.md**
- Skill compliance audit workflow
- Structural validation
- Routing validation
- Documentation validation
- Integration validation

**~/.claude/skills/system-createskill/workflows/update-skill.md**
- Skill update and refactoring workflow
- Adding workflows to existing skills
- Reorganizing skill structure
- Migration patterns

---

## Examples

### Example 1: Creating a Minimal Skill

**User:** "Create a skill for generating API documentation"

**System-CreateSkill Response:**
1. Read SKILL-STRUCTURE-AND-ROUTING.md
2. Determine archetype: Minimal (single workflow)
3. Create structure:
   ```
   api-docs/
   ├── SKILL.md
   └── workflows/
       └── generate-docs.md
   ```
4. Write SKILL.md with:
   - YAML: name, description with USE WHEN triggers
   - Workflow Routing section (FIRST)
   - When to Activate section (8-category pattern)
   - Main body with workflow description
5. Validate against quality checklist
6. Register in mcp_settings.json
7. Test activation: "generate API docs for my service"

### Example 2: Creating a Standard Skill

**User:** "Create a skill for database operations - migrations, backups, queries, optimization"

**System-CreateSkill Response:**
1. Read SKILL-STRUCTURE-AND-ROUTING.md
2. Determine archetype: Standard (4 workflows)
3. Create structure:
   ```
   database/
   ├── SKILL.md
   └── workflows/
       ├── run-migration.md
       ├── backup-database.md
       ├── optimize-queries.md
       └── execute-query.md
   ```
4. Write SKILL.md with semantic routing:
   - Route "run migration" → run-migration.md
   - Route "backup database" → backup-database.md
   - Route "optimize" → optimize-queries.md
   - Route "query" → execute-query.md
5. Comprehensive activation triggers covering all 4 workflows
6. Validate and register
7. Test each workflow activation

### Example 3: Validating Existing Skill

**User:** "Validate the research skill for compliance"

**System-CreateSkill Response:**
1. Read SKILL-STRUCTURE-AND-ROUTING.md
2. Read ~/.claude/skills/research/SKILL.md
3. Run validation:
   - ✅ Workflow Routing section present and FIRST
   - ✅ All 12 workflows explicitly routed
   - ✅ Activation triggers comprehensive
   - ✅ All files referenced
   - ✅ Standard archetype structure correct
4. Report: "research skill is COMPLIANT - no issues found"

---

## Summary

**system-createskill ensures:**
- Every created skill follows architectural standards
- Compliance is validated automatically
- Templates drive consistency
- Quality gates prevent non-compliant skills
- Philosophy is embedded in process

**Three core operations:**
1. **Create** - New skills with architectural compliance
2. **Validate** - Existing skills against standards
3. **Update** - Modify skills while maintaining compliance

**One source of truth:**
`~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

**Zero tolerance for:**
- Orphaned workflows (not routed)
- Invisible files (not linked)
- Vague triggers (not comprehensive)
- Structural violations (wrong archetype)

---

**Related Documentation:**
- `~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md` - Canonical architecture guide (PRIMARY)
- `~/.claude/skills/CORE/CONSTITUTION.md` - Overall PAI philosophy

**Last Updated:** 2025-11-17
