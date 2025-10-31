# PAI Architecture: Skills, Commands, Agents, and MCPs

**Last Updated:** 2025-10-30
**Version:** 1.0

---

## Executive Summary

This document describes the architectural philosophy and design patterns of PAI (Personal AI Infrastructure), validated against Anthropic's official Skills framework. PAI's architecture aligns perfectly with Anthropic's foundational concepts while extending them with sophisticated real-world patterns discovered through production use.

**Key Insight:** Skills aren't just "another primitive" - they're the organizing principle for AI capabilities. In production systems, they naturally become containers for domain-specific workflows that agents orchestrate.

---

## The Four Primitives

### 1. Skills: Meta-Containers for Domain Expertise

**What They Are:**
- Modular capabilities that package domain expertise, workflows, and procedural knowledge
- Filesystem-based with progressive disclosure (metadata → instructions → resources)
- Auto-load based on natural language triggers
- Can contain multiple internal workflows (Commands) and reference materials

**When to Use:**
- You need competence in a topic or domain area
- You have multiple related tasks in the same domain
- You want reusable workflows across conversations
- You need to package expertise (e.g., Content Creation, Development, Security Testing)

**Structure:**
```
~/.claude/skills/content-creation/
├── SKILL.md                    # Core skill definition & workflows
├── write-post.md              # Command: Write new post
├── publish-post.md            # Command: Publish to production
├── assets/
│   ├── frontmatter-template.md
│   └── style-guide.md
└── examples/
    └── example-post.md
```

**Anthropic Alignment:**
✅ Skills as modular capabilities with progressive loading
✅ Filesystem-based, load on-demand
✅ Package workflows and procedural knowledge
✅ Can include executable scripts

**PAI Extensions:**
➕ Skills contain multiple Commands as internal organization
➕ Natural language auto-selects both Skill AND Command
➕ Skills serve as meta-containers for all other primitives

---

### 2. Commands: Discrete Task Workflows Within Skills

**What They Are:**
- Specific task implementations within a Skill domain
- Standalone markdown files containing step-by-step workflows
- Callable directly OR auto-selected by natural language
- Like "exported functions" from a Skill module

**When to Use:**
- You have a discrete, repeatable task within a domain
- The task has clear start/end and specific steps
- You want to invoke it explicitly or let natural language select it
- The task is too specific to live in the main SKILL.md

**Structure:**
```markdown
# write-post.md (Command)

## Trigger
User says: "write a post", "create content", "draft article"

## Workflow
1. Get content from user (raw text, topic, URL)
2. Apply formatting template
3. Process in appropriate style
4. Preview in development environment
5. Confirm with user before publishing
```

**Anthropic Position:**
❓ Not explicitly mentioned - Commands are a PAI extension

**Why It Works:**
- Commands provide granularity between "entire Skill" and "single step"
- Enables composition: Agents can invoke specific Commands
- Supports natural language routing: "write a post" → Content Skill → write-post Command
- Keeps SKILL.md clean - complex workflows live in separate files

---

### 3. Agents: Orchestration Workers for Parallelization

**What They Are:**
- Specialized AI workers configured for specific tasks
- Primarily invoke Skills and Commands to do work
- Enable parallel execution of independent tasks
- Best when you don't need the detailed output (it's logged to filesystem)

**When to Use:**
- Parallelization of independent tasks (3+ similar operations)
- Delegating specialized work (security testing, design, architecture)
- Background processing where results are logged
- Need different "voices" or expertise areas for different tasks

**Pattern:**
```
Agents → Skills → Commands

general-purpose agent → research skill → quick-research command
engineer agent → development skill → implement-feature command
security agent → testing skill → scan-vulnerabilities command
```

**Key Design Principle:**
Agents are NOT standalone workers - they're orchestrators that primarily leverage Skills/Commands for domain expertise.

**Example - Parallel Agent Workflow:**
```
User: "Update all 10 configuration files with new format"

System launches 10 agents in parallel:
  agent1 → reads reference.md → updates config1.md
  agent2 → reads reference.md → updates config2.md
  ...
  agent10 → reads reference.md → updates config10.md

All agents complete simultaneously
Then: spotcheck agent verifies all 10 files
```

**Anthropic Alignment:**
✅ Agents mentioned in SDK documentation
❓ Agent-Skill orchestration pattern not prescribed but supported

**PAI Pattern:**
➕ Agents primarily invoke Skills (not duplicate their knowledge)
➕ Parallel agent fleets for simultaneous operations
➕ Spotcheck agent after parallel work for verification
➕ Full logging to filesystem for observability

---

### 4. MCPs (Model Context Protocol): When to Use vs Direct API Code

**The Question:**
When should you use an MCP server vs. direct API code in your Skills/Commands?

**The Answer:**
Both are valid - you're optimizing for different targets.

**MCP Advantages:**
- Standardized interface across AI systems
- Maintained separately from Skills/Commands
- Reusable across different agents/applications
- Platform-level abstraction for ecosystem
- Easier to share across organizations

**Direct API Code Advantages:**
- Tighter integration with specific workflow
- No MCP server infrastructure dependency
- Simpler for one-off integrations
- Full control over implementation
- Faster iteration in personal infrastructure

**Decision Matrix:**

| Use MCPs When... | Use Direct API Code When... |
|-----------------|----------------------------|
| Sharing across teams/orgs | Building personal infrastructure |
| Need standardization | Own the full stack |
| Multiple AI systems | Single AI system |
| Platform-level service | Domain-specific integration |
| Community maintains it | You maintain it |

**Recommendation:**
For personal AI infrastructure, direct API code within Skills/Commands provides agility and control. For platform-level tools, use community MCPs.

---

## The Hierarchy: How It All Fits Together

```
User Intent
    ↓
Natural Language Trigger
    ↓
┌─────────────────────────────────────┐
│         SKILL (Container)           │
│  ┌─────────────────────────────┐   │
│  │  Command 1: write-post.md   │   │
│  │  - Step-by-step workflow    │   │
│  │  - Uses API code directly   │   │
│  │  - May invoke MCPs          │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Command 2: publish-post.md │   │
│  │  - Different workflow       │   │
│  │  - Different tools          │   │
│  └─────────────────────────────┘   │
│                                     │
│  Assets/                            │
│  - Templates                        │
│  - Reference files                  │
│  - Helper scripts                   │
└─────────────────────────────────────┘
         ↑
    Invoked by
         │
    ┌────────┐
    │ Agents │ (for parallelization or specialization)
    └────────┘
```

**Two-Level Natural Language Routing:**

1. **Level 1:** Intent → Skill
   - "I need to create content" → Content Creation Skill loads

2. **Level 2:** Specific task → Command
   - "write a post" → write-post.md workflow
   - "publish content" → publish-post.md workflow

This happens automatically - user doesn't need to know the structure.

---

## Progressive Disclosure: Anthropic's Loading Strategy

**The Problem:** Loading all context all the time = token bloat

**The Solution:** Three-tier loading

### Tier 1: Metadata (Always Loaded)
```yaml
---
name: content-creation
description: Complete content workflow from writing to publishing.
  USE WHEN user says 'write content', 'publish post', 'create article'
---
```
~100 tokens, loaded at startup for routing decisions

### Tier 2: Instructions (Loaded When Triggered)
```markdown
# Content Creation Skill

## Write Content Workflow
1. Get content requirements
2. Apply template
3. Format appropriately
4. Preview
...
```
Full SKILL.md loaded when triggered (~2000 tokens)

### Tier 3: Resources (Loaded As Needed)
```
assets/frontmatter-template.md
assets/style-guide.md
examples/example-post.md
```
Individual files loaded only when accessed (~500-2000 tokens each)

**This pattern prevents context bloat while maintaining full capability.**

---

## Real-World Examples from PAI

### Example 1: Content Creation Skill

**Structure:**
```
~/.claude/skills/content-creation/
├── SKILL.md                 # Tier 2: Core workflows
├── write-post.md           # Command: Writing workflow
├── publish-post.md         # Command: Publishing workflow
└── assets/
    ├── frontmatter.md      # Tier 3: Template
    └── style-guide.md      # Tier 3: Style reference
```

**User Experience:**
- Says: "write a post about AI safety"
- AI: Loads Content Skill → write-post Command → creates post
- Says: "publish it"
- AI: Loads publish-post Command → checks quality → deploys

**Behind the Scenes:**
1. Metadata always loaded: knows "post" triggers this Skill
2. write-post.md loads only when writing
3. publish-post.md loads only when publishing
4. Templates load only when referenced

### Example 2: Research Skill with Agent Orchestration

**Structure:**
```
~/.claude/skills/research/
├── SKILL.md                    # Tier 2: Research strategies
├── quick-research.md          # Command: 3 parallel agents
├── standard-research.md       # Command: 9 parallel agents
├── extensive-research.md      # Command: 24 parallel agents
└── assets/
    └── research-template.md   # Tier 3: Output format
```

**User Experience:**
- Says: "do extensive research on AI agent planning"
- AI: Loads Research Skill → extensive-research Command → launches 24 agents in parallel

**Agent Pattern:**
```
User → Research Skill → extensive-research Command →
  ├─ researcher agent × 8 (source 1)
  ├─ researcher agent × 8 (source 2)
  └─ researcher agent × 8 (source 3)

All 24 agents complete simultaneously
Results consolidated → saved to history/
```

**Why This Works:**
- Research Skill contains the STRATEGY (how to research)
- Commands define SCALE (quick/standard/extensive)
- Agents do the WORK (parallel execution)
- Each agent may invoke OTHER skills as needed

### Example 3: Development Skill (Direct API Code)

**Structure:**
```
~/.claude/skills/development/
├── SKILL.md                 # Tier 2: Development methodology
├── implement-feature.md    # Command: Feature implementation
├── run-tests.md            # Command: Test execution
└── scripts/
    └── test-runner.ts      # Tier 3: Test runner
```

**Direct API Integration:**
```typescript
// Within run-tests.md Command
// Uses direct bash execution, not MCP
const testCommand = `npm test -- ${testFiles}`;
await bash(testCommand);
```

**Why Direct vs MCP:**
- Development tools are domain-specific (not platform-wide)
- Full control over command-line flags and options
- Easier to customize for specific needs
- No MCP server dependency

---

## Design Patterns That Emerged

### Pattern 1: Skill + Commands + Agents = Powerful Composition

**Problem:** Need to update 10 configuration files with same change

**Solution:**
```
AI (orchestrator)
  └─ Launches 10 agents in parallel
      └─ Each agent uses same pattern:
          1. Read reference file
          2. Update target file
          3. Follow standards (from Skill context)
  └─ Launches 1 spotcheck agent
      └─ Verifies all 10 files updated correctly
```

**Key Insight:** Agents don't need to "know" everything - they leverage Skills for domain knowledge and execute Commands with full context.

### Pattern 2: Natural Language Workflow Selection

**Problem:** Users shouldn't need to remember command names

**Solution:**
```
User: "create a new post"
  ↓
Triggers: Content Skill (from "post")
  ↓
Auto-selects: write-post Command (from "create")
  ↓
Executes: Complete workflow automatically
```

**Implementation:**
- Skill metadata includes trigger phrases
- Commands include specific task phrases
- AI matches intent → Skill → Command
- User experiences seamless workflow

### Pattern 3: Spotcheck After Parallel Work

**Problem:** Parallel agents might make inconsistent changes

**Solution:**
```
1. Launch N parallel agents (each with full context)
2. All complete simultaneously
3. Launch 1 spotcheck agent with:
   - List of ALL modified files
   - Original requirements
   - Success criteria
4. Spotcheck verifies consistency
5. Reports issues OR confirms success
```

**Why It Works:**
- Maintains quality despite parallelization
- Catches edge cases or inconsistencies
- Provides confidence in parallel workflows
- Costs minimal tokens (1 additional agent)

---

## Comparison: Anthropic's Framework vs PAI's Implementation

| Aspect | Anthropic Documentation | PAI Implementation | Alignment |
|--------|------------------------|-------------------|-----------|
| **Skills Definition** | Modular capabilities with progressive loading | Meta-containers for domain expertise | ✅ Perfect |
| **Progressive Disclosure** | 3-tier loading (metadata/instructions/resources) | Exact same pattern in practice | ✅ Perfect |
| **Skills vs Prompts** | Filesystem-based, reusable vs one-off | Same distinction | ✅ Perfect |
| **Skills vs Tools** | Workflows/knowledge vs discrete functions | Same distinction | ✅ Perfect |
| **Natural Language Triggers** | "Use when..." in metadata | Auto-routing via trigger phrases | ✅ Perfect |
| **Executable Code** | Bundle scripts for deterministic operations | Direct API code in Skills/Commands | ✅ Perfect |
| **Commands** | Not mentioned | Internal Skill organization | ➕ Extension |
| **Agent-Skill Orchestration** | Not prescribed | Agents primarily invoke Skills | ➕ Extension |
| **Two-Level Routing** | Not mentioned | Intent→Skill, Task→Command | ➕ Extension |
| **MCPs vs Direct Code** | MCPs for platform services | Both - context-dependent | ❓ Different optimization |

**Verdict:**
- **5/5 Core Concepts:** Perfect alignment
- **4 Extensions:** Sophisticated real-world patterns
- **1 Different Optimization:** MCPs vs direct code (both valid)

---

## When to Use What: Decision Tree

```
Do you need AI capabilities?
  │
  ├─ YES → Do you need this across multiple conversations?
  │         │
  │         ├─ YES → Do you have multiple related tasks in this domain?
  │         │        │
  │         │        ├─ YES → CREATE A SKILL
  │         │        │        └─ Add Commands for each task
  │         │        │        └─ Include assets/templates as Tier 3
  │         │        │
  │         │        └─ NO → CREATE A COMMAND (single workflow)
  │         │
  │         └─ NO → USE A PROMPT (one-off instruction)
  │
  └─ NO → Do you need to execute this task in parallel?
           │
           ├─ YES → USE AGENTS
           │        └─ Have them invoke Skills/Commands
           │
           └─ NO → Do you need standardized platform service?
                    │
                    ├─ YES → USE MCP (Chrome, etc.)
                    │
                    └─ NO → USE DIRECT API CODE (domain-specific)
```

---

## Best Practices from PAI Production Use

### 1. Skill Organization
- ✅ One Skill per domain/topic area
- ✅ Multiple Commands within a Skill for different tasks
- ✅ Assets in subdirectories (templates/, examples/, scripts/)
- ✅ Clear trigger phrases in metadata
- ❌ Don't create Skills for one-off tasks
- ❌ Don't duplicate knowledge across Skills

### 2. Command Design
- ✅ Self-contained workflows with clear steps
- ✅ Include trigger phrases for auto-selection
- ✅ Reference Skill assets when needed
- ✅ Keep focused on ONE specific task
- ❌ Don't make Commands too granular (combine related steps)
- ❌ Don't duplicate Skill context

### 3. Agent Orchestration
- ✅ Launch agents in parallel for independent tasks
- ✅ Provide FULL context to each agent
- ✅ Always run spotcheck agent after parallel work
- ✅ Have agents invoke Skills/Commands (not duplicate knowledge)
- ❌ Don't use agents for sequential work
- ❌ Don't launch agents without full context

### 4. Direct API vs MCP
- ✅ Use direct API for domain-specific integrations
- ✅ Use MCPs for standardized platform services
- ✅ Prefer simplicity in personal infrastructure
- ✅ Document dependencies clearly
- ❌ Don't add MCP infrastructure for one-off use
- ❌ Don't reinvent platform services (use community MCPs)

### 5. Logging and Observability
- ✅ All agent work logs to filesystem
- ✅ Session summaries capture valuable work
- ✅ Research outputs saved permanently
- ✅ Hooks auto-capture to history
- ❌ Don't rely solely on hooks (verify manually)
- ❌ Don't leave valuable work in temporary directories

---

## Future Directions

### Potential Enhancements

1. **Skill Composition:**
   - Skills that invoke other Skills
   - Dependency graphs between Skills
   - Shared asset libraries

2. **Dynamic Command Generation:**
   - AI generates Commands from natural language
   - Commands as data structures, not just markdown
   - Version control for Command evolution

3. **Agent Specialization:**
   - Domain-specific agents with pre-loaded Skills
   - Agent teams with complementary Skills
   - Automatic agent selection based on task analysis

4. **Hybrid MCP + Direct Code:**
   - MCPs for infrastructure, direct code for business logic
   - Skill-level abstraction over MCPs
   - Easier migration between approaches

---

## Skills-as-Containers: Organizational Pattern

### The Evolution

PAI's architecture evolved from a flat command structure to a hierarchical Skills-as-Containers pattern. This migration (v1.2.0, October 2025) demonstrated a critical insight about organizing AI capabilities.

### Before: Flat Command Structure

```
~/.claude/commands/
├── write-post.md
├── publish-post.md
├── quick-research.md
├── extensive-research.md
├── implement-feature.md
├── run-tests.md
└── [75+ scattered commands]
```

**Problems:**
- No logical grouping by domain
- Hard to discover related workflows
- Scattered knowledge across files
- Difficult to maintain consistency

### After: Skills-as-Containers

```
~/.claude/skills/
├── content-creation/
│   └── workflows/
│       ├── write.md
│       └── publish.md
├── research/
│   └── workflows/
│       ├── quick.md
│       └── extensive.md
└── development/
    └── workflows/
        ├── implement.md
        └── test.md
```

**Benefits:**
- ✅ Domain knowledge colocated with workflows
- ✅ Clear ownership and responsibility
- ✅ Easy to discover related capabilities
- ✅ Natural language routing to skills first, then workflows
- ✅ Encapsulation of domain-specific context

### Migration Pattern

When restructuring from flat commands to Skills-as-Containers:

**1. Identify Domains:**
Group related commands by functional domain (content, research, development, etc.)

**2. Create Skill Structure:**
```
~/.claude/skills/{domain}/
├── SKILL.md              # Domain expertise & routing
├── workflows/            # Specific task workflows (formerly commands)
├── scripts/              # Executable helpers
└── context/              # Reference materials
```

**3. Move Commands to Workflows:**
- Commands become workflows within their skill
- Preserve functionality while improving organization
- Update cross-references in agents and other skills

**4. Archive Deprecated Files:**
```
~/.claude/history/upgrades/deprecated/{date}_{migration-name}/
├── README.md             # Comprehensive migration documentation
└── {old-files}/          # Preserved for historical reference
```

### Deprecation Pattern for Architectural Upgrades

**Standard Process:**

1. **Create dated deprecation directory:**
   ```
   history/upgrades/deprecated/YYYY-MM-DD_upgrade-name/
   ```

2. **Move deprecated files with full context:**
   - All deprecated files in organized subdirectories
   - Comprehensive README.md explaining what/why
   - Migration path documentation
   - QA results and metrics
   - Links to related documentation

3. **Document the upgrade:**
   - Executive summary with statistics
   - Before/after comparisons
   - Quality metrics (pass rates, errors found)
   - Impact assessment

4. **Update architecture docs:**
   - Reference the deprecation pattern
   - Include in main documentation
   - Add to upgrade history

**Example: Skills-as-Containers Migration (v1.2.0)**

**Scope:**
- 73 commands migrated to skill workflows
- 21 skills enhanced with workflow subdirectories
- 1 new skill created (content-enhancement)
- Commands directory reduced from 75 files to 0

**Quality Metrics:**
- Zero errors in QA verification
- 100% functionality preserved
- Backward compatibility maintained
- Complete in ~25 minutes using parallel agents

**Key Principle:**
Storage is cheap, history is valuable. Never delete deprecated files - archive them with comprehensive context for learning, reference, and potential rollback.

### When to Use Skills-as-Containers

**Use this pattern when:**
- You have 3+ related workflows in the same domain
- Natural grouping by functional area exists
- You want to improve discoverability
- Domain context should be shared across workflows
- Preparing for long-term maintainability

**Don't use when:**
- You have truly standalone, unrelated workflows
- The overhead of skill structure outweighs benefits
- Workflows are experimental and may be deleted

### Integration with Natural Language Routing

**How it works:**

```
User: "I need to publish my article"
  ↓
Level 1: Skill Selection
  - Analyzes intent: "publish" + "article"
  - Loads: content-creation skill
  ↓
Level 2: Workflow Selection
  - Within content-creation skill
  - Matches "publish" to publish.md workflow
  ↓
Execution: Runs complete workflow with domain context
```

This two-level routing happens automatically - users don't need to know the internal structure.

---

## Conclusion

**The Core Insight:**

Skills aren't just "modular capabilities" - they're the **organizing principle** for AI systems.

When you build real production AI infrastructure, a natural hierarchy emerges:
1. **Skills** organize domain expertise
2. **Commands** define specific workflows
3. **Agents** orchestrate parallel execution
4. **MCPs/Direct Code** provide implementation flexibility

This architecture:
- ✅ Aligns perfectly with Anthropic's foundational framework
- ✅ Extends it with practical real-world patterns
- ✅ Scales from simple workflows to complex multi-agent systems
- ✅ Balances reusability, modularity, and simplicity

**Anthropic gave us the building blocks.**
**PAI shows what you can build with them.**

---

## References

- **Anthropic Skills Documentation:** https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
- **PAI Repository:** https://github.com/danielmiessler/PAI
- **Analysis Date:** 2025-10-30
- **Validated Against:** Anthropic's official Skills framework

---

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**License:** MIT (Part of PAI - Personal AI Infrastructure)
