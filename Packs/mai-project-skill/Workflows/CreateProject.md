# CreateProject Workflow

## Purpose

Guide the user through creating a new MAI project with proper structure and documentation.

## Trigger Phrases

- "new project"
- "init project"
- "create project"

## Steps

### 1. Gather Project Type

Ask the user what type of project they're creating:

- **Software**: Code-based projects (packages, applications, libraries)
- **Physical**: Real-world builds (woodworking, construction, repairs)
- **Documentation**: Written artifacts (specs, guides, SOPs)
- **Infrastructure**: System configurations (networking, servers, IaC)

### 2. Collect Project Identity

Required information:
- Project name
- Location (default: `~/workshop/projects/<name>`)
- Owner (default: Joey)

### 3. Define Problem Statement

Ask: "What problem are we solving?"

This should be a clear, concise statement that explains:
- The current situation
- Why it's a problem
- What needs to change

### 4. Establish Success Criteria

Ask: "How do we know we're done?"

Collect at least one measurable criterion. Good criteria are:
- Observable (can be verified)
- Binary (either done or not done)
- Specific (no ambiguity)

### 5. Identify Constraints

Ask: "What are the boundaries?"

Examples:
- Budget limits
- Time constraints
- Technical requirements
- Dependencies on other projects

### 6. Type-Specific Details

Based on project type, collect additional information:

**Software:**
- Language (default: TypeScript)
- Runtime (default: Bun)
- Package manager (default: bun)
- Security considerations

**Physical:**
- Materials needed
- Safety considerations
- Budget allocation

**Documentation:**
- Target audience
- Format requirements

**Infrastructure:**
- Dependencies
- Rollback plan

### 7. Review and Confirm

Present the complete configuration to the user before creating:
- Show the generated CLAUDE.md preview
- Confirm location and files to be created
- Allow user to cancel or modify

### 8. Create Project Files

Generate:
- `CLAUDE.md` - Project identity
- `.gitignore` - Exclude CLAUDE.local.md
- `tasks.yaml` - Empty task list
- `SPEC.md` - (software only) Spec template

## CLI Alternative

Users can also run `mai-init` directly:

```bash
mai-init                    # Interactive wizard
mai-init --existing         # Initialize in current directory
mai-init --type=software    # Pre-select type
```

## Output

On completion:
- Project directory created
- CLAUDE.md populated
- Initial files in place
- Ready for first session

## Next Steps

After project creation:
1. Open the project in Claude Code
2. Start with SPEC phase
3. Pass SPEC_APPROVED gate before moving to DESIGN
