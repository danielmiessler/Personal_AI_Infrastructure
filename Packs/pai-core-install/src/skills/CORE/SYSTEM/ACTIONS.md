<!--
================================================================================
PAI CORE - SYSTEM/ACTIONS.md
================================================================================

PURPOSE:
Multi-step workflow patterns for complex tasks. Actions are discrete, repeatable
workflow patterns with clear goals, verification criteria, and deliverables.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/ACTIONS.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/ACTIONS.md

CUSTOMIZATION:
- Create new actions in ${PAI_DIR}/ACTIONS/
- Follow Domain_Verb-Object naming convention
- Define verification criteria for each action

RELATED FILES:
- PIPELINES.md - Orchestrating action sequences
- SKILLSYSTEM.md - Skills vs Actions distinction
- PAISYSTEMARCHITECTURE.md - Core architecture

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# Actions

**Multi-Step Workflow Patterns for Complex Tasks**

Actions are one of PAI's four primitives (alongside Skills, Tools, and Pipelines). They provide structured, repeatable workflow patterns for tasks that require multiple steps, verification gates, and specific deliverables.

---

## What Actions Are

Actions are **discrete, multi-step workflow patterns** stored as directories containing an ACTION.md file. Unlike Skills (which provide amorphous domain knowledge and context), Actions define:

- A clear goal and deliverable
- Specific steps to execute
- Tools to use at each step
- Verification criteria
- Expected output format

**Key Distinction from Skills:**

| Aspect | Skills | Actions |
|--------|--------|---------|
| Purpose | Domain knowledge, context, workflows | Discrete task execution |
| Structure | SKILL.md + Workflows/ | Directory with ACTION.md |
| Invocation | Loaded for domain context | Executed for specific tasks |
| Output | Guidance and context | Concrete deliverables |
| Scope | Amorphous, multi-purpose | Single, well-defined goal |

---

## When to Use Actions

**USE ACTIONS FOR:**

1. **Creative Processes** - Art generation, content creation, visual design
   - Generating essay header images
   - Creating YouTube thumbnails
   - Building technical diagrams

2. **Business Workflows** - Structured operational tasks
   - Deploying websites
   - Publishing blog posts
   - Creating sales materials

3. **Multi-Step Analysis** - Structured thinking patterns
   - Red team analysis (parallel agents)
   - First principles deconstruction
   - Council debates

4. **Development Workflows** - Spec-driven development phases
   - Dev_Spec, Dev_Plan, Dev_Execute
   - Worktree management

5. **Security Tasks** - Structured assessment patterns
   - Threat modeling
   - Vulnerability analysis
   - Reconnaissance workflows

**DON'T USE ACTIONS FOR:**

- Simple, stateless operations (use Tools instead)
- General domain context (use Skills instead)
- Multi-action orchestration (use Pipelines instead)

---

## ACTION.md Format

### Required Sections

Every ACTION.md should contain these sections:

```markdown
---
name: Domain_Verb-Object
tags: [domain, type, related-tags]
version: 1.0
core_context: ${PAI_DIR}/skills/CORE/REFERENCE.md  # Optional
---

# Action Name (Human Readable)

## Goal

One sentence describing the concrete deliverable.

## Context

### Shared Context
Reference to shared context files (if applicable).

### Action-Specific Context
Details unique to this action - methodology, requirements, constraints.

### Anti-Patterns (NEVER)
Things to explicitly avoid.

## Tools

| Tool | Purpose | Command |
|------|---------|---------|
| tool-name | What it does | `command` |

## Ideal State

Bulleted list of what success looks like. Each criterion should be verifiable.

## Verification

| # | Criterion | Oracle | Command/Method |
|---|-----------|--------|----------------|
| 1 | Criterion name | Verification method | How to check |

## Output Format

Template or example of the expected output structure.
```

### Optional Sections

- **When to Use / Don't Use** - Explicit triggers and anti-triggers
- **Architecture** - Technical details for infrastructure actions
- **Integration Notes** - Dependencies on other actions/skills
- **Examples** - Worked examples for complex actions
- **Execution Checklist** - Step-by-step checklist for long workflows

---

## Directory Structure

### Naming Convention

```
Domain_Verb-Object/
    ACTION.md
```

- **Domain**: The capability area (Art, Blog, Think, Security, Dev, etc.)
- **Verb-Object**: What the action does (Create-Header, Deploy, Parallel-Analysis)
- **Underscore**: Separates domain from action
- **Hyphens**: Separate words within domain or action name

### Examples

```
${PAI_DIR}/ACTIONS/
├── Art_Create-Essay-Header/
│   └── ACTION.md
├── Art_Create-YouTube-Thumbnail/
│   └── ACTION.md
├── Blog_Deploy/
│   └── ACTION.md
├── Blog_Publish/
│   └── ACTION.md
├── Think_Red-Team-Parallel-Analysis/
│   └── ACTION.md
├── Think_First-Principles-Deconstruct/
│   └── ACTION.md
├── Dev_Spec/
│   └── ACTION.md
├── Security_Create-Threat-Model/
│   └── ACTION.md
└── [more actions]/
```

### Domain Categories

| Domain | Purpose | Examples |
|--------|---------|----------|
| Art_ | Visual content creation | Essay headers, thumbnails, diagrams |
| Blog_ | Website/blog operations | Deploy, publish, proofread |
| Think_ | Structured thinking patterns | Red team, council, first principles |
| Dev_ | Development workflows | Spec, plan, execute, worktree |
| Security_ | Security assessments | Threat model, vuln analysis |
| Newsletter_ | Newsletter operations | Draft, stats, quality check |
| Social_ | Social media content | Posts, teasers |
| Parse_ | Content parsing | Articles, videos, entities |
| Recon_ | Reconnaissance | Domain, IP, netblock |
| CLI_ | CLI tool creation | Create, add command, upgrade |

---

## Verification Patterns

Actions self-verify through oracle criteria. Each verification entry specifies:

1. **Criterion**: What to check
2. **Oracle**: The method of verification (file, command, visual, manual)
3. **Command/Method**: How to execute the check

### Oracle Types

| Oracle Type | When to Use | Example |
|-------------|-------------|---------|
| `file` | Check file existence/content | `test -f ~/path/file.png` |
| `command` | Run a command, check output | `identify image.png` |
| `visual` | Requires human visual inspection | Read image with Read tool |
| `manual` | Requires human approval | "Preview in Finder, get approval" |
| `API` | Query external service | `curl -s API_URL` |

### Example Verification Table

```markdown
| # | Criterion | Oracle | Command |
|---|-----------|--------|---------|
| 1 | Image exists | file | `test -f ~/Downloads/[name].png` |
| 2 | 2K resolution | identify | `identify ~/Downloads/[name].png` |
| 3 | Correct aspect ratio | identify | `identify -format "%[fx:w/h]" [file]` |
| 4 | Subject matches content | visual | Read image - content check |
| 5 | User approval | manual | Preview, get approval |
```

---

## Example Actions

### Simple Action: Blog_Deploy

Minimal action for quick deployment:

```markdown
# Deploy Website

## Goal
Deploy the website to production.

## When to Use
- User says "push" or "deploy"
- Changes are committed, just need deployment

## Deployment Command
\`\`\`bash
cd "/path/to/Website" && bun run deploy
\`\`\`

## Verification
1. Build completes without errors
2. Wrangler reports successful deployment
3. Live site reflects changes
```

### Complex Action: Art_Create-Essay-Header

Full action with tools, context, and verification:

- **Frontmatter**: name, tags, version, core_context
- **Goal**: Clear deliverable (gallery-worthy charcoal sketch)
- **Context**: Shared (ART.md) + action-specific (content analysis, emotional registers)
- **Anti-Patterns**: Explicit "NEVER" list
- **Tools**: Table with tool, purpose, command
- **Ideal State**: 9-point success criteria
- **Verification**: 10-row oracle table
- **Output Format**: YAML template for deliverables

### Parallel Action: Think_Red-Team-Parallel-Analysis

Multi-phase action with agent delegation:

- **Five Phases**: Decomposition, Parallel Analysis, Synthesis, Steelman, Counter-Argument
- **Multiple Agents**: Engineers, Architects, Pentesters, Interns
- **Agent Roster**: Personality and attack angle per agent
- **Prompt Template**: Standard prompt structure for all agents
- **Integration Notes**: Required tools and paired skills

---

## Creating New Actions

### Step 1: Identify the Need

Ask:
- Is this a multi-step task with clear deliverables?
- Will it be repeated?
- Does it need verification gates?

If yes to all three, create an action.

### Step 2: Choose Domain and Name

Follow the `Domain_Verb-Object` convention:
- Domain matches existing category or creates new one
- Verb describes the primary action
- Object describes what's acted upon

### Step 3: Write ACTION.md

Use the format above. Include at minimum:
- Goal
- Context (or reference to shared context)
- Tools (if applicable)
- Verification criteria
- Output format

### Step 4: Place in Directory

```bash
mkdir -p ${PAI_DIR}/ACTIONS/Domain_Verb-Object
# Write ACTION.md
```

---

## Relationship to Other Primitives

```
┌─────────────────────────────────────────────────────────────┐
│                        PIPELINES                             │
│   Orchestrate sequences of Actions with verification gates   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         ACTIONS                              │
│      Multi-step workflow patterns with clear deliverables    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│         SKILLS          │     │          TOOLS          │
│   Domain knowledge and  │     │   Stateless CLI         │
│   amorphous context     │     │   utilities             │
└─────────────────────────┘     └─────────────────────────┘
```

- **Skills** provide domain context that Actions may reference
- **Tools** are invoked by Actions for specific operations
- **Pipelines** chain multiple Actions together

---

## References

- **Architecture Overview**: `${PAI_DIR}/skills/CORE/SYSTEM/PAISYSTEMARCHITECTURE.md`
- **Tools Documentation**: `${PAI_DIR}/skills/CORE/SYSTEM/TOOLS.md`
- **Skills Documentation**: `${PAI_DIR}/skills/CORE/SYSTEM/SKILLSYSTEM.md`
- **Actions Directory**: `${PAI_DIR}/ACTIONS/`
