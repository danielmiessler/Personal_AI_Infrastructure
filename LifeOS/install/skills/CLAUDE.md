# skills/CLAUDE.md

## MANDATORY: Use the CreateSkill skill for ALL skill work

Creating, modifying structure of, or validating any skill under this directory
REQUIRES invoking `Skill("CreateSkill")` first. Reading CreateSkill's workflows
and executing the steps by hand is NOT compliance — it is the exact
handrolling anti-pattern documented in feedback_invoke_blogging_skill_never_handroll.md.

### Triggers (MUST invoke CreateSkill)

- Creating a new skill directory
- Adding / removing / renaming Workflows, Tools, or References
- Editing SKILL.md frontmatter (name, description, license)
- Validating an existing skill against canonical format
- Canonicalizing a legacy skill
- Public-clean audit

### NOT triggers (direct edits allowed)

- Fixing a typo in a single workflow file
- Updating the gotchas section in SKILL.md body (not frontmatter)
- Adding a new reference entry to an existing References/ file
- Accumulating lessons in an existing Gotchas section

### Enforcement

If you are about to `Write` or `Edit` a `SKILL.md`, a new file under
`Workflows/`, `Tools/`, or `References/`, or scaffold a new skill directory —
**STOP** and invoke `Skill("CreateSkill")` with your intent. Let the skill
orchestrate the work.

"I read CreateSkill's workflow and am now following its steps" is handrolling.
Invoke the skill; the skill invokes the steps.
