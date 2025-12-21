---
name: CreateCLI
description: Generate production-quality TypeScript CLIs with full documentation, error handling, and best practices. Creates deterministic, type-safe command-line tools following PAI's CLI-First Architecture. USE WHEN user says "create a CLI", "build a command-line tool", "make a CLI for X", or requests CLI generation. (user)
location: user
---

# system-createcli

**Automated CLI Generation System**

Generate production-ready TypeScript CLIs with comprehensive documentation, type safety, error handling, and PAI's CLI-First Architecture principles.

---

## 🎯 WORKFLOW ROUTING (SYSTEM PROMPT)

**When user requests CLI creation, follow this routing:**

### Primary Workflow: Create New CLI
**Triggers:** "create CLI", "build command-line tool", "make CLI for X", "generate CLI"
**Route to:** `workflows/create-cli.md`
**Action:** Generate complete CLI from requirements

### Extension Workflow: Add Command
**Triggers:** "add command to CLI", "extend CLI with", "add feature to existing CLI"
**Route to:** `workflows/add-command.md`
**Action:** Add new command to existing CLI

### Migration Workflow: Upgrade Complexity Tier
**Triggers:** "upgrade CLI", "migrate to Commander", "CLI needs more complexity"
**Route to:** `workflows/upgrade-tier.md`
**Action:** Migrate Tier 1 → Tier 2 (manual → Commander.js)

### Testing Workflow: Add Test Suite
**Triggers:** "add tests to CLI", "test scaffolding", "need CLI tests"
**Route to:** `workflows/add-testing.md`
**Action:** Generate comprehensive test suite

### Distribution Workflow: Setup Publishing
**Triggers:** "publish CLI", "distribute CLI", "make standalone binary"
**Route to:** `workflows/setup-distribution.md`
**Action:** Configure npm publishing or binary distribution

---

## 🚀 WHEN TO ACTIVATE THIS SKILL

Activate when you see these patterns:

### Direct Requests
- "Create a CLI for [API/service/tool]"
- "Build a command-line interface for X"
- "Make a CLI that does Y"
- "Generate a TypeScript CLI"
- "I need a CLI tool for Z"

### Context Clues
- User describes repetitive API calls → Suggest CLI
- User mentions "I keep typing this command" → Suggest CLI wrapper
- User has bash script doing complex work → Suggest TypeScript CLI replacement
- User working with API that lacks official CLI → Suggest creating one

### Examples
- ✅ "Create a CLI for the GitHub API"
- ✅ "Build a command-line tool to process CSV files"
- ✅ "Make a CLI for my database migrations"
- ✅ "Generate a CLI that wraps this API"
- ✅ "I need a tool like llcli but for Notion API"

---

## 💡 CORE CAPABILITIES

### Three-Tier Template System

**Tier 1: llcli-Style (DEFAULT - 80% of use cases)**
- Manual argument parsing (process.argv)
- Zero framework dependencies
- Bun + TypeScript
- Type-safe interfaces
- ~300-400 lines total
- **Perfect for:** API clients, data transformers, simple automation

**When to use Tier 1:**
- ✅ 2-10 commands
- ✅ Simple arguments (flags, values)
- ✅ JSON output
- ✅ No subcommands
- ✅ Fast development

**Tier 2: Commander.js (ESCALATION - 15% of use cases)**
- Framework-based parsing
- Subcommands + nested options
- Auto-generated help
- Plugin-ready
- **Perfect for:** Complex multi-command tools

**When to use Tier 2:**
- ❌ 10+ commands needing grouping
- ❌ Complex nested options
- ❌ Plugin architecture
- ❌ Multiple output formats

**Tier 3: oclif (REFERENCE ONLY - 5% of use cases)**
- Documentation only (no templates)
- Enterprise-grade plugin systems
- **Perfect for:** Heroku CLI, Salesforce CLI scale (rare)

### What Every Generated CLI Includes

**1. Complete Implementation**
- TypeScript source with full type safety
- All commands functional and tested
- Error handling with proper exit codes
- Configuration management

**2. Comprehensive Documentation**
- README.md with philosophy, usage, examples
- QUICKSTART.md for common patterns
- Inline help text (--help)
- API response documentation

**3. Development Setup**
- package.json (Bun configuration)
- tsconfig.json (strict mode)
- .env.example (configuration template)
- File permissions configured

**4. Quality Standards**
- Type-safe throughout
- Deterministic output (JSON)
- Composable (pipes to jq, grep)
- Error messages with context
- Exit code compliance

---

## 🏗️ INTEGRATION WITH KAI

### Technology Stack Alignment

Generated CLIs follow PAI's standards:
- ✅ **Runtime:** Bun (NOT Node.js)
- ✅ **Language:** TypeScript (NOT JavaScript or Python)
- ✅ **Package Manager:** Bun (NOT npm/yarn/pnpm)
- ✅ **Testing:** Vitest (when tests added)
- ✅ **Output:** Deterministic JSON (composable)
- ✅ **Documentation:** README + QUICKSTART (llcli pattern)

### Repository Placement

Generated CLIs go to:
- `${PAI_DIR}/bin/[cli-name]/` - Personal CLIs (like llcli)
- `~/Projects/[project-name]/` - Project-specific CLIs
- `~/Projects/PAI/examples/clis/` - Example CLIs (PUBLIC repo)

**SAFETY:** Always verify repository location before git operations

### CLI-First Architecture Principles

Every generated CLI follows:
1. **Deterministic** - Same input → Same output
2. **Clean** - Single responsibility
3. **Composable** - JSON output pipes to other tools
4. **Documented** - Comprehensive help and examples
5. **Testable** - Predictable behavior

---

## 📚 EXTENDED CONTEXT

**For detailed information, read these files:**

### Workflow Documentation
- `workflows/create-cli.md` - Main CLI generation workflow (decision tree, 10-step process)
- `workflows/add-command.md` - Add commands to existing CLIs
- `workflows/upgrade-tier.md` - Migrate simple → complex
- `workflows/add-testing.md` - Test suite generation
- `workflows/setup-distribution.md` - Publishing configuration

### Reference Documentation
- `framework-comparison.md` - Manual vs Commander vs oclif (with research)
- `patterns.md` - Common CLI patterns (from llcli analysis)
- `testing-strategies.md` - CLI testing approaches (Jest, Vitest, Playwright)
- `distribution.md` - Publishing strategies (npm, standalone binaries)
- `typescript-patterns.md` - Type safety patterns (from tsx, vite, bun research)

### Tools & Templates
- `tools/templates/tier1/` - llcli-style templates (default)
- `tools/templates/tier2/` - Commander.js templates (escalation)
- `tools/generators/` - Generation scripts (TypeScript)
- `tools/validators/` - Quality gates (validation)

### Examples
- `examples/api-cli/` - API client (reference: llcli)
- `examples/file-processor/` - File operations
- `examples/data-transform/` - Complex CLI (Commander.js)

---

## 📖 EXAMPLES

### Example 1: API Client CLI (Tier 1)

**User Request:**
"Create a CLI for the GitHub API that can list repos, create issues, and search code"

**Generated Structure:**
```
${PAI_DIR}/bin/ghcli/
├── ghcli.ts              # 350 lines, complete implementation
├── package.json          # Bun + TypeScript
├── tsconfig.json         # Strict mode
├── .env.example          # GITHUB_TOKEN=your_token
├── README.md             # Full documentation
└── QUICKSTART.md         # Common use cases
```

**Usage:**
```bash
ghcli repos --user danielmiessler
ghcli issues create --repo pai --title "Bug fix"
ghcli search "typescript CLI"
ghcli --help
```

---

### Example 2: File Processor (Tier 1)

**User Request:**
"Build a CLI to convert markdown files to HTML with frontmatter extraction"

**Generated Structure:**
```
${PAI_DIR}/bin/md2html/
├── md2html.ts
├── package.json
├── README.md
└── QUICKSTART.md
```

**Usage:**
```bash
md2html convert input.md output.html
md2html batch *.md output/
md2html extract-frontmatter post.md
```

---

### Example 3: Data Pipeline (Tier 2)

**User Request:**
"Create a CLI for data transformation with multiple formats, validation, and analysis commands"

**Generated Structure:**
```
${PAI_DIR}/bin/data-cli/
├── data-cli.ts           # Commander.js with subcommands
├── package.json
├── README.md
└── QUICKSTART.md
```

**Usage:**
```bash
data-cli convert json csv input.json
data-cli validate schema data.json
data-cli analyze stats data.csv
data-cli transform filter --column=status --value=active
```

---

## ✅ QUALITY STANDARDS

Every generated CLI must pass these gates:

### 1. Compilation
- ✅ TypeScript compiles with zero errors
- ✅ Strict mode enabled
- ✅ No `any` types except justified

### 2. Functionality
- ✅ All commands work as specified
- ✅ Error handling comprehensive
- ✅ Exit codes correct (0 success, 1 error)

### 3. Documentation
- ✅ README explains philosophy and usage
- ✅ QUICKSTART has common examples
- ✅ --help text comprehensive
- ✅ All flags/options documented

### 4. Code Quality
- ✅ Type-safe throughout
- ✅ Clean function separation
- ✅ Error messages actionable
- ✅ Configuration externalized

### 5. Integration
- ✅ Follows PAI tech stack (Bun, TypeScript)
- ✅ CLI-First Architecture principles
- ✅ Deterministic output (JSON)
- ✅ Composable with other tools

---

## 🎯 PHILOSOPHY

### Why This Skill Exists

Daniel repeatedly creates CLIs for APIs and tools. Each time:
1. Starts with bash script
2. Realizes it needs error handling
3. Realizes it needs help text
4. Realizes it needs type safety
5. Rewrites in TypeScript
6. Adds documentation
7. Now has production CLI

**This skill automates steps 1-7.**

### The llcli Pattern

The `llcli` CLI (Limitless.ai API) proves this pattern works:
- 327 lines of TypeScript
- Zero dependencies (no framework)
- Complete error handling
- Comprehensive documentation
- Production-ready immediately

**This skill replicates that success.**

### Design Principles

1. **Start Simple** - Default to Tier 1 (llcli-style)
2. **Escalate When Needed** - Tier 2 only when justified
3. **Complete, Not Scaffold** - Every CLI is production-ready
4. **Documentation First** - README explains "why" not just "how"
5. **Type Safety** - TypeScript strict mode always

---

## 🔗 RELATED SKILLS

- **development** - For complex feature development (not CLI-specific)
- **system-mcp** - For web scraping CLIs (Bright Data, Apify wrappers)
- **personal-lifelog** - Example of skill using llcli

---

**This skill turns "I need a CLI for X" into production-ready tools in minutes, following proven patterns from llcli and PAI's CLI-First Architecture.**
