# ValidateSkill Workflow

> **Trigger:** "validate skill"
> **Input:** Skill name to validate
> **Output:** Validation report with pass/fail

## Step 1: Run Automated Validation

Run the ValidateSkill.ts CLI tool:

```bash
bun run $PAI_DIR/Tools/ValidateSkill.ts SkillName
```

For JSON output:

```bash
bun run $PAI_DIR/Tools/ValidateSkill.ts --json SkillName
```

To validate all skills:

```bash
bun run $PAI_DIR/Tools/ValidateSkill.ts --all
```

## Step 2: Review Results

ValidateSkill.ts checks:
- **Structure:** Directory exists, SKILL.md exists, Tools/ and Workflows/ directories
- **Frontmatter:** name is TitleCase, matches directory, description is single line with USE WHEN
- **Sections:** Workflow Routing (with table), Examples (1+), Related Skills
- **Workflows:** Files exist, have Trigger/Input/Output header, Completion section, Skills Invoked table

## Step 3: Fix Any Errors

If INVALID:
1. Read the error messages carefully
2. Fix each issue in the listed order
3. Re-run validation until VALID

Common fixes:
- Add missing `USE WHEN` clause to description
- Add missing `## Related Skills` section
- Add `## Skills Invoked` table to workflow files (use null state if none)
- Ensure name is TitleCase and matches directory

## Completion

Validation passes when tool outputs: `Result: VALID`

```
Skill validated: SkillName
Result: VALID
```

If validation continues to fail, check:
- Is this a valid skill directory?
- Are all workflow files properly formatted?
- Does the skill have proper YAML frontmatter?

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
