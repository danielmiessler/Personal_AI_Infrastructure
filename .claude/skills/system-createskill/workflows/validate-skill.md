# Validate Skill Workflow

**Purpose:** Audit existing skill for compliance with canonical PAI architectural standards

**When to Use:**
- User says "validate skill", "check skill compliance", "audit skill structure"
- Before deploying a skill to production
- After creating or updating a skill
- When reviewing skill quality
- As part of skill maintenance

**Prerequisites:**
- Target skill exists in ~/.claude/skills/
- Access to SKILL-STRUCTURE-AND-ROUTING.md
- Understanding of validation criteria

---

## Workflow Steps

### Step 1: Read Canonical Architecture

**REQUIRED FIRST STEP:** Read the source of truth:
```bash
~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md
```

**What to extract:**
- The 3 archetypes (Minimal, Standard, Complex)
- Mandatory structural requirements
- Workflow routing rules
- Naming conventions
- Quality checklist

**Output:** Validation criteria loaded

---

### Step 2: Identify Target Skill

**If user specifies skill name:**
```bash
~/.claude/skills/[skill-name]/
```

**If user says "validate this skill":**
- Check current working directory
- If in skill directory (contains SKILL.md), use that
- Otherwise ask user to specify

**Verify skill exists:**
```bash
test -f ~/.claude/skills/[skill-name]/SKILL.md && echo "✅ Skill found" || echo "❌ Skill not found"
```

**Output:** Target skill identified

---

### Step 3: Structural Validation

**Check directory structure:**

```bash
# List all files
tree ~/.claude/skills/[skill-name]/

# Or if tree not available:
find ~/.claude/skills/[skill-name]/ -type f -o -type d
```

**Validate archetype compliance:**

**For Minimal Skill (0-3 workflows):**
- [ ] SKILL.md present
- [ ] workflows/ OR assets/ directory present
- [ ] No unnecessary directories

**For Standard Skill (3-15 workflows):**
- [ ] SKILL.md present
- [ ] workflows/ directory present
- [ ] Optional: documentation/, references/, tools/
- [ ] No unnecessary complexity

**For Complex Skill (15+ workflows):**
- [ ] SKILL.md present
- [ ] workflows/ directory (nested structure)
- [ ] documentation/ directory (CORE is flat exception)
- [ ] Optional: CONSTITUTION.md, METHODOLOGY.md
- [ ] Optional: references/, state/, tools/, testing/

**Count workflows:**
```bash
find ~/.claude/skills/[skill-name]/workflows/ -name "*.md" -type f | wc -l
```

**Determine expected archetype:**
- 0-3 workflows → Should be Minimal
- 3-15 workflows → Should be Standard
- 15+ workflows → Should be Complex

**Check archetype match:**
- ❓ Does structure match workflow count?
- ❓ Is skill over-engineered (Complex structure with 5 workflows)?
- ❓ Is skill under-engineered (Minimal structure with 20 workflows)?

**Naming conventions:**
```bash
# Check SKILL.md is uppercase
test -f ~/.claude/skills/[skill-name]/SKILL.md && echo "✅ SKILL.md correct" || echo "❌ Should be SKILL.md"

# Check workflow naming (should be kebab-case)
find ~/.claude/skills/[skill-name]/workflows/ -name "*.md" -exec basename {} \; | grep -v '^[a-z][a-z0-9-]*\.md$' && echo "❌ Non-kebab-case workflows found" || echo "✅ Workflows kebab-case"
```

**Score: [X/10]**

**Output:** Structural validation results

---

### Step 4: Routing Validation

**Read SKILL.md:**
```bash
~/.claude/skills/[skill-name]/SKILL.md
```

**Check YAML frontmatter:**
- [ ] `name:` field present
- [ ] `description:` field present
- [ ] Description includes USE WHEN triggers
- [ ] Description has 5-10 trigger phrases

**Check Workflow Routing section:**
- [ ] "Workflow Routing (SYSTEM PROMPT)" section present
- [ ] Section is FIRST (immediately after YAML frontmatter)
- [ ] NOT buried in middle or end of file

**Count routed workflows:**
```bash
# Manual inspection - count "When user requests" blocks
grep -c "When user requests" ~/.claude/skills/[skill-name]/SKILL.md
```

**Compare to actual workflows:**
```bash
# Count actual workflow files
find ~/.claude/skills/[skill-name]/workflows/ -name "*.md" -type f | wc -l
```

**Validation:**
- ❓ Are all workflows routed? (route count = file count)
- ❓ Are orphan workflows present? (files not routed)
- ❓ Are dead routes present? (routes to non-existent files)

**Check routing quality:**
For each route:
- [ ] Examples provided (3-5 user phrases)
- [ ] File path is absolute (`~/.claude/skills/...`)
- [ ] EXECUTE description provided
- [ ] Examples are semantic (natural language), not formulaic

**Example of GOOD routing:**
```markdown
**When user requests person research:**
Examples: "do OSINT on [person]", "research [person]", "background check on [person]", "who is [person]", "investigate this person"
→ **READ:** ~/.claude/skills/security-OSINT/workflows/people/lookup.md
→ **EXECUTE:** Complete person OSINT workflow
```

**Example of BAD routing:**
```markdown
**When user requests person research:**
→ READ: workflows/people/lookup.md
→ EXECUTE: Person OSINT
```

**Score: [X/10]**

**Output:** Routing validation results

---

### Step 5: Activation Triggers Validation

**Check "When to Activate This Skill" section:**
- [ ] Section present
- [ ] Located after Workflow Routing section

**8-Category Pattern Coverage:**

Check if skill covers these categories:

1. **Core Skill Name (Noun)** - ❓ Present?
   - Skill name variations
   - Abbreviations

2. **Action Verbs** - ❓ Present?
   - "do [skill]", "run [skill]", "perform [skill]", etc.

3. **Modifiers (Scope/Intensity)** - ❓ Present?
   - "basic [skill]", "quick [skill]", "comprehensive [skill]", etc.

4. **Prepositions (Target Connection)** - ❓ Present?
   - "[skill] on [target]", "[skill] for [target]", etc.

5. **Synonyms & Alternative Phrasings** - ❓ Present?
   - Industry jargon, casual vs formal

6. **Use Case Oriented** - ❓ Present?
   - Why would someone use this?
   - What problem does it solve?

7. **Result-Oriented Phrasing** - ❓ Present?
   - "find [thing]", "discover [thing]", "get [information]"

8. **Tool/Method Specific** - ❓ Present if applicable?
   - Specific tools or techniques

**Category Coverage Score: [X/8]**

**Comprehensiveness check:**
- [ ] Covers at least 5/8 categories
- [ ] Includes casual phrasing ("just do X", "super basic X")
- [ ] Includes natural variations (not just formulaic)
- [ ] Passes "read aloud" test (sounds like real requests)

**Score: [X/10]**

**Output:** Activation trigger validation results

---

### Step 6: Documentation Validation

**Check file linkage:**

**List all .md files in skill:**
```bash
find ~/.claude/skills/[skill-name]/ -name "*.md" -type f
```

**For each file (excluding SKILL.md):**
- ❓ Is it referenced in SKILL.md main body?
- ❓ Is purpose explained?
- ❓ Is when-to-use guidance provided?

**Check for orphan files:**
- Files in skill directory not linked from SKILL.md

**Check for broken links:**
- SKILL.md references non-existent files

**Documentation quality:**
- [ ] Each workflow has clear purpose
- [ ] Each workflow has when-to-use guidance
- [ ] Examples provided
- [ ] Related workflows linked

**Extended context sections:**
- [ ] Core capabilities explained
- [ ] Integration points documented
- [ ] Configuration documented (if applicable)
- [ ] Examples provided

**Score: [X/10]**

**Output:** Documentation validation results

---

### Step 7: Integration Validation

**Check mcp_settings.json registration:**
```bash
grep -A 3 '"[skill-name]"' ~/.claude/mcp_settings.json
```

**Validation:**
- [ ] Skill registered in mcp_settings.json
- [ ] Description field present
- [ ] USE WHEN triggers in description
- [ ] Location set to "user"

**Check for CORE duplication:**
- [ ] Skill doesn't duplicate CORE context
- [ ] References CORE instead of copying
- [ ] Self-contained but inherits CORE

**Check agent compatibility:**
- [ ] Can be invoked via Skill tool
- [ ] Compatible with agent workflows
- [ ] No blocking dependencies

**Score: [X/10]**

**Output:** Integration validation results

---

### Step 8: Quality Validation

**Progressive disclosure check:**
- [ ] SKILL.md is the hub (routing + overview)
- [ ] Workflows contain detailed steps
- [ ] Documentation provides deep context
- [ ] Not all info crammed in SKILL.md

**Naming convention compliance:**
- [ ] SKILL.md is UPPERCASE
- [ ] Root docs are UPPERCASE (METHODOLOGY, CONSTITUTION)
- [ ] Workflows are kebab-case
- [ ] Directories follow conventions (workflows, tools, documentation)

**Template compliance:**
- [ ] Follows canonical SKILL.md template
- [ ] Workflow files follow standard template
- [ ] Consistent structure across files

**Examples present:**
- [ ] SKILL.md has usage examples
- [ ] Workflows have input/output examples
- [ ] Clear demonstration of capabilities

**Score: [X/10]**

**Output:** Quality validation results

---

### Step 9: Generate Validation Report

**Compile all results:**

```markdown
# Skill Validation Report: [skill-name]

**Date:** [YYYY-MM-DD]
**Validator:** system-createskill
**Overall Status:** [PASS / FAIL / NEEDS IMPROVEMENT]

---

## Executive Summary

**Overall Score:** [X/70] ([percentage]%)
**Archetype:** [Minimal/Standard/Complex]
**Compliance Status:** [Compliant/Non-Compliant]

**Critical Issues:** [N]
**Major Issues:** [N]
**Minor Issues:** [N]

---

## Validation Results

### 1. Structural Validation: [X/10]

**Archetype Compliance:**
- Expected: [archetype based on workflow count]
- Actual: [archetype based on structure]
- Match: [Yes/No]

**Directory Structure:**
✅ [Compliant elements]
❌ [Non-compliant elements]
⚠️ [Issues needing attention]

**Naming Conventions:**
✅ [Correct naming]
❌ [Incorrect naming]

---

### 2. Routing Validation: [X/10]

**Workflow Routing Section:**
- Present: [Yes/No]
- Location: [First/Middle/End/Missing]
- ✅/❌ Positioning correct

**Workflow Coverage:**
- Total workflows: [N]
- Routed workflows: [N]
- Orphan workflows: [N]
- Dead routes: [N]

**Routing Quality:**
✅ [Good routing examples]
❌ [Poor routing examples]

---

### 3. Activation Triggers: [X/10]

**8-Category Pattern Coverage: [X/8]**
1. Core Skill Name: [✅/❌]
2. Action Verbs: [✅/❌]
3. Modifiers: [✅/❌]
4. Prepositions: [✅/❌]
5. Synonyms: [✅/❌]
6. Use Case Oriented: [✅/❌]
7. Result-Oriented: [✅/❌]
8. Tool/Method Specific: [✅/❌/N/A]

**Quality:**
✅ [Strengths]
❌ [Weaknesses]

---

### 4. Documentation: [X/10]

**File Linkage:**
- Total files: [N]
- Linked files: [N]
- Orphan files: [N]
- Broken links: [N]

**Documentation Quality:**
✅ [Good documentation]
❌ [Missing or poor documentation]

---

### 5. Integration: [X/10]

**Registration:**
- mcp_settings.json: [✅/❌]
- Description quality: [Good/Needs Improvement]

**CORE Duplication:**
- [✅ No duplication / ❌ Duplication found]

**Agent Compatibility:**
- [✅ Compatible / ❌ Issues found]

---

### 6. Quality: [X/10]

**Progressive Disclosure:** [✅/❌]
**Naming Conventions:** [✅/❌]
**Template Compliance:** [✅/❌]
**Examples Present:** [✅/❌]

---

## Issues Identified

### Critical Issues (Must Fix)
1. [Issue 1 with specific details]
2. [Issue 2 with specific details]

### Major Issues (Should Fix)
1. [Issue 1 with specific details]
2. [Issue 2 with specific details]

### Minor Issues (Nice to Fix)
1. [Issue 1 with specific details]
2. [Issue 2 with specific details]

---

## Recommendations

### Immediate Actions
1. [Action 1 to fix critical issues]
2. [Action 2 to fix critical issues]

### Short-term Improvements
1. [Action 1 for major issues]
2. [Action 2 for major issues]

### Long-term Enhancements
1. [Suggestion 1 for improvement]
2. [Suggestion 2 for improvement]

---

## Compliance Status

**This skill is:**
- [✅ COMPLIANT] - Meets all mandatory requirements
- [⚠️ PARTIALLY COMPLIANT] - Meets most requirements, minor issues
- [❌ NON-COMPLIANT] - Fails mandatory requirements

**Next Steps:**
[What needs to be done to achieve/maintain compliance]

---

## Canonical Reference

All validation based on:
`~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

**Last Updated:** [YYYY-MM-DD]
```

**Output:** Complete validation report

---

### Step 10: Present Results to User

**Summarize findings:**
- Overall score and status
- Critical issues requiring immediate attention
- Recommendations for improvement
- Next steps

**If COMPLIANT:**
"✅ Skill [skill-name] is COMPLIANT with canonical architecture. Score: [X/70] ([percentage]%)"

**If NON-COMPLIANT:**
"❌ Skill [skill-name] has compliance issues. Score: [X/70] ([percentage]%). [N] critical issues found. Recommend using canonicalize-skill workflow to fix."

**Output:** User informed of validation results

---

## Success Criteria

**Validation is complete when:**
- ✅ All 6 validation categories checked
- ✅ Scores calculated for each category
- ✅ Overall score computed
- ✅ Issues identified and categorized
- ✅ Recommendations provided
- ✅ Compliance status determined
- ✅ Report generated
- ✅ User informed

**Skill is COMPLIANT when:**
- Score ≥ 60/70 (≥85%)
- No critical issues
- Workflow Routing section present and FIRST
- All workflows routed
- Registered in mcp_settings.json

---

## Common Validation Failures

### Failure 1: Missing Workflow Routing Section
**Symptom:** No "Workflow Routing" section in SKILL.md
**Impact:** CRITICAL - Workflows never invoked
**Fix:** Add Workflow Routing section FIRST, route all workflows

### Failure 2: Orphan Workflows
**Symptom:** Workflow files exist but not routed in SKILL.md
**Impact:** CRITICAL - Workflows inaccessible
**Fix:** Add routing for each orphan workflow

### Failure 3: Workflow Routing Not First
**Symptom:** Routing section buried in middle/end of SKILL.md
**Impact:** MAJOR - Workflows may be missed
**Fix:** Move Workflow Routing section to FIRST position

### Failure 4: Incomplete Activation Triggers
**Symptom:** Only 2-3 categories covered, missing action verbs or modifiers
**Impact:** MAJOR - Skill won't activate with common phrasings
**Fix:** Expand to cover all 8 categories

### Failure 5: Vague Examples
**Symptom:** Examples like "user asks for [skill]" instead of actual phrases
**Impact:** MAJOR - Pattern matching fails
**Fix:** Use real user phrasings, not templates

### Failure 6: Unlinked Files
**Symptom:** Files in skill directory not referenced in SKILL.md
**Impact:** MINOR - Files undiscoverable
**Fix:** Link all files from SKILL.md main body

### Failure 7: Wrong Archetype
**Symptom:** Complex structure with 5 workflows, or Minimal with 20
**Impact:** MINOR - Over/under-engineered
**Fix:** Refactor to appropriate archetype

---

## Related Workflows

- **create-skill.md** - Create new compliant skill
- **canonicalize-skill.md** - Fix non-compliant existing skill
- **update-skill.md** - Update skill while maintaining compliance

---

## Notes

**Validation Philosophy:**
- Objective criteria (not subjective opinion)
- Based on canonical architecture
- Actionable recommendations
- Clear pass/fail for critical items

**Use Cases:**
- Pre-deployment quality gate
- Post-creation verification
- Periodic skill audits
- Skill maintenance

**One Source of Truth:**
`~/.claude/skills/CORE/SKILL-STRUCTURE-AND-ROUTING.md`

---

**Last Updated:** 2025-11-17
