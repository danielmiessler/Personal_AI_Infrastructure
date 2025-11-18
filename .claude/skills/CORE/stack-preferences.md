# Stack Preferences

**User's Technology Stack Preferences - Definitive Reference**

This document captures User's core technology stack preferences for PAI infrastructure and all development work.

---

## Languages

### TypeScript > Python

**Primary Rule:** We hate Python. Use TypeScript unless explicitly approved by user.

**When to Use TypeScript:**
- All new PAI infrastructure development
- Web services and APIs
- Command-line tools and utilities
- Hook implementations
- Agent orchestration code
- Any general-purpose scripting
- Default choice for all new projects

**When Python is Acceptable:**
- Explicitly approved by user for specific use case
- Existing Python codebase that requires maintenance
- Specialized ML/data science libraries with no TS equivalent
- When interoperating with Python-only ecosystem tools

**Rationale:**
- TypeScript provides superior type safety and tooling
- Better integration with modern web infrastructure
- Faster runtime performance with bun
- More maintainable codebases with explicit types
- Reduces runtime errors through compile-time checking

**Examples:**

✅ **CORRECT:**
```typescript
// New hook implementation in TypeScript
import { readFileSync } from 'fs';

export function processSession(sessionId: string): SessionData {
  const data = readFileSync(`/Users/username/.claude/history/sessions/${sessionId}.md`, 'utf-8');
  return parseSessionData(data);
}
```

❌ **INCORRECT:**
```python
# Don't default to Python for new infrastructure
import os

def process_session(session_id):
    with open(f'/Users/username/.claude/history/sessions/{session_id}.md', 'r') as f:
        data = f.read()
    return parse_session_data(data)
```

---

## Package Managers

### JavaScript/TypeScript: bun (NOT npm/yarn/pnpm)

**Primary Rule:** Use bun for all JavaScript/TypeScript package management and execution.

**Commands:**
- `bun install` - Install dependencies (NOT `npm install`)
- `bun add <package>` - Add new package (NOT `npm install <package>`)
- `bun remove <package>` - Remove package (NOT `npm uninstall`)
- `bun run <script>` - Execute scripts (NOT `npm run`)
- `bun <file.ts>` - Execute TypeScript directly (NOT `ts-node`)

**Why bun:**
- Significantly faster than npm/yarn/pnpm
- Native TypeScript execution without compilation step
- Better performance for package installation
- Modern tooling aligned with User's preferences
- Reduces friction in development workflow

**Examples:**

✅ **CORRECT:**
```bash
# Install dependencies
bun install

# Add a new package
bun add express

# Run a TypeScript file directly
bun run src/hooks/start-hook.ts
```

❌ **INCORRECT:**
```bash
# Don't use npm
npm install
npm install express
npm run build
ts-node src/hooks/start-hook.ts
```

### Python: uv (NOT pip/conda/poetry)

**Primary Rule:** When Python is necessary (with approval), use uv for package management.

**Commands:**
- `uv pip install <package>` - Install packages (NOT `pip install`)
- `uv venv` - Create virtual environment (NOT `python -m venv`)
- `uv pip sync requirements.txt` - Sync dependencies

**Why uv:**
- Dramatically faster than pip (10-100x speed improvement)
- Better dependency resolution
- More reliable and reproducible installs
- Modern alternative aligned with performance goals

**Examples:**

✅ **CORRECT:**
```bash
# Install Python packages with uv
uv pip install anthropic requests

# Create virtual environment
uv venv
source .venv/bin/activate
```

❌ **INCORRECT:**
```bash
# Don't use traditional pip
pip install anthropic requests
python -m venv .venv
```

---

## Formats & Standards

### Markdown > HTML: MARKDOWN ZEALOTRY

**Primary Rule:** WE ARE MARKDOWN ZEALOTS. NEVER use HTML tags for basic content that markdown supports.

**HTML is ONLY acceptable for:**
- Custom components that don't exist in markdown (`<aside>`, `<callout>`, `<notes>`, `<details>`, `<summary>`)
- Interactive elements requiring specific behavior
- Specialized formatting genuinely impossible in markdown

**HTML is FORBIDDEN for:**
- Paragraphs (use markdown paragraphs, not `<p>`)
- Headers (use `#`, `##`, `###`, not `<h1>`, `<h2>`, `<h3>`)
- Lists (use `-` or `1.`, not `<ul>`, `<ol>`, `<li>`)
- Links (use `[text](url)`, not `<a href="">`)
- Emphasis (use `*italic*` and `**bold**`, not `<em>`, `<strong>`)
- Code blocks (use triple backticks, not `<pre><code>`)
- Blockquotes (use `>`, not `<blockquote>`)
- Tables (use markdown tables, not `<table>`)

**If you see HTML where markdown works, that's a BUG and must be fixed.**

**Rationale:**
- Markdown is cleaner, more readable, more maintainable
- Reduces cognitive load when editing documentation
- Better version control diffs (HTML is noisy)
- Consistent with modern documentation practices
- Easier to work with in text editors

**Examples:**

✅ **CORRECT - Markdown:**
```markdown
# Stack Preferences

This document contains **User's** technology preferences.

## Languages

- TypeScript (preferred)
- Python (only when approved)

[Read more about TypeScript](https://www.typescriptlang.org/)

> TypeScript provides superior type safety
```

❌ **INCORRECT - Unnecessary HTML:**
```html
<h1>Stack Preferences</h1>

<p>This document contains <strong>User's</strong> technology preferences.</p>

<h2>Languages</h2>

<ul>
  <li>TypeScript (preferred)</li>
  <li>Python (only when approved)</li>
</ul>

<a href="https://www.typescriptlang.org/">Read more about TypeScript</a>

<blockquote>TypeScript provides superior type safety</blockquote>
```

✅ **ACCEPTABLE - Custom HTML component:**
```markdown
<details>
<summary>Advanced Configuration Options</summary>

This uses HTML because markdown doesn't have collapsible sections.
</details>

<aside class="warning">
This is a custom callout component that doesn't exist in markdown.
</aside>
```

---

## Workflow Patterns

### Analysis vs Action: Explicit Intent Required

**Primary Rule:** If asked to analyze, do analysis ONLY - don't change things unless explicitly asked.

**Analysis Tasks (Read-Only):**
- "Analyze the authentication flow"
- "Review this code for issues"
- "What's wrong with this implementation?"
- "Examine the performance bottleneck"
- "Assess security vulnerabilities"

**Action Tasks (Modifications Allowed):**
- "Fix the authentication bug"
- "Refactor this code"
- "Optimize the performance"
- "Update the security implementation"
- "Implement the new feature"

**Rationale:**
- Prevents unwanted modifications during investigation
- Allows user to understand before approving changes
- Separates understanding from execution
- Reduces risk of premature optimization or changes
- Provides opportunity for strategic decision-making

**Examples:**

✅ **CORRECT - Analysis request:**
```
User: "Analyze why the hook system is failing"

Kai:
1. Reads hook configuration and implementation
2. Examines logs and error messages
3. Identifies root cause (missing environment variable)
4. Reports findings WITHOUT making changes
5. Recommends fix options for user to approve
```

❌ **INCORRECT - Premature action:**
```
User: "Analyze why the hook system is failing"

Kai:
1. Reads hook configuration
2. Sees missing environment variable
3. IMMEDIATELY adds the variable to .env
4. Restarts the service
5. Reports "Fixed it!"

Problem: user wanted to understand first, not have it auto-fixed
```

✅ **CORRECT - Action request:**
```
User: "Fix the hook system failure"

Kai:
1. Investigates the issue
2. Identifies root cause
3. Implements the fix (adds environment variable)
4. Verifies the fix works
5. Reports completion
```

### Scratchpad vs History: Permanent vs Temporary

**Primary Rule:** When in doubt, save to history NOT scratchpad.

#### Scratchpad (~/.claude/scratchpad/)

**TEMPORARY working files ONLY:**
- Tests and experiments
- Draft outputs before finalization
- Random one-off requests
- Quick prototypes and POCs
- Files you'll delete when done
- Throwaway analysis or exploration

**Directory Naming Convention:**
- Use: `YYYY-MM-DD-HHMMSS_description/`
- Example: `~/.claude/scratchpad/2025-11-01-143022_prime-numbers-test/`

**Lifecycle:**
- Create for temporary work
- Delete when tests complete
- Clean up periodically
- **NEVER leave permanent valuable content here**

#### History (~/.claude/history/)

**PERMANENT valuable outputs:**
- Research findings and analyses
- Learnings and insights
- Important decisions and specifications
- Alpha extractions and wisdom summaries
- Session summaries and work logs
- Anything you'll reference later
- Documentation and guides

**Directory Structure:**
- `research/` - Research findings
- `learnings/` - Captured insights
- `sessions/` - Session logs
- `execution/` - Completed work logs
- `security/` - Security incident reports
- `upgrades/` - Architectural evolution tracking

**Critical Rules:**

1. **Default to history** - When unsure, save to history
2. **Hooks auto-capture** - But they can fail, so verify
3. **Manual backup** - If hooks miss it, manually save to history
4. **Never lose work** - Permanent content must reach history
5. **Verify capture** - After valuable work, check it's in history
6. **Clean scratchpad** - Don't let temporary files accumulate

**Workflow Example:**

```
1. Start work in scratchpad (temporary workspace)
   → ~/.claude/scratchpad/2025-11-01-143022_auth-analysis/

2. Complete analysis

3. Check if hooks captured to history
   → Look in ~/.claude/history/research/2025-11-01_auth-analysis/

4. If NOT captured, manually save:
   → Copy valuable findings to history location
   → Keep scratchpad only if still iterating

5. If iteration complete, delete scratchpad version
```

**Examples:**

✅ **CORRECT - Temporary in scratchpad:**
```bash
# Quick test of a regex pattern
~/.claude/scratchpad/2025-11-01-143022_regex-test/test.ts

# Delete after confirming pattern works
```

✅ **CORRECT - Permanent in history:**
```bash
# Comprehensive authentication research
~/.claude/history/research/2025-11-01_oauth2-implementation/
  ├── analysis.md
  ├── recommendations.md
  └── implementation-plan.md

# Keep forever, reference later
```

❌ **INCORRECT - Valuable work in scratchpad:**
```bash
# DON'T leave important research in scratchpad
~/.claude/scratchpad/2025-11-01_critical-security-findings/
  └── major-vulnerability-report.md

# This should be in history/security/ immediately!
```

❌ **INCORRECT - Temporary junk in history:**
```bash
# DON'T pollute history with throwaway tests
~/.claude/history/execution/2025-11-01_random-test-123/
  └── quick-test.ts

# This belongs in scratchpad, not permanent history
```

**NEVER drop random projects/content directly in `~/.claude/` root directory:**
- Use scratchpad for temporary work
- Use history for permanent content
- Keep root directory clean and organized

---

## Additional Preferences

### File Naming Conventions

**Dates in filenames:**
- Use ISO format: `YYYY-MM-DD`
- Example: `2025-11-01_stack-preferences.md`

**Descriptive names:**
- Use kebab-case: `stack-preferences.md` (NOT `StackPreferences.md` or `stack_preferences.md`)
- Be specific: `oauth2-implementation-guide.md` (NOT `guide.md`)
- Include context: `2025-11-01_research-findings.md` (NOT `findings.md`)

### Git Practices

**Commit Messages:**
- Start with verb: "Add", "Update", "Fix", "Remove"
- Be specific about what changed
- Reference context when relevant
- Example: "Add stack preferences reference to CORE documentation"

**Branch Strategy:**
- Work on main for PAI private infrastructure
- Use feature branches for complex changes when appropriate
- Always verify git remote before committing

---

## Summary Reference Card

```
LANGUAGES:
  ✓ TypeScript (default)
  ✗ Python (only when approved)

PACKAGE MANAGERS:
  JS/TS: ✓ bun    ✗ npm/yarn/pnpm
  Python: ✓ uv     ✗ pip/conda/poetry

FORMATS:
  ✓ Markdown (default)
  ✗ HTML (only for custom components)

WORKFLOW:
  Analysis → Read only, report findings
  Action → Modify with confidence

  Scratchpad → Temporary, delete when done
  History → Permanent, keep forever

FILES:
  Naming: YYYY-MM-DD_kebab-case-description.md
  Location: Organized in appropriate subdirectories
  Never: Drop files in root directory
```

---

## When to Reference This Document

- Starting any new development work
- Choosing tools for a task
- Writing documentation
- Making architectural decisions
- Reviewing code or implementations
- Onboarding new agents or team members
- Resolving conflicts between approaches

This is the **definitive reference** for stack preferences. When in doubt, consult this document.

**Last Updated:** 2025-11-01
