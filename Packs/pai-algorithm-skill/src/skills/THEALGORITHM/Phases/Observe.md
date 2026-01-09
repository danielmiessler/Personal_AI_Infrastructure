# OBSERVE Phase

**Purpose:** CREATE ISC rows from the request and user context.

**ISC Mutation:** CREATE rows

**Gate Question:** Do I have 2+ rows? Did I use user context to infer requirements?

## What Happens

1. **Parse the request** - Identify explicit requirements
2. **Load user context** - Read CORE preferences, tech stack, patterns
3. **Create EXPLICIT rows** - What user literally asked for
4. **Create INFERRED rows** - What context implies (TypeScript from prefs, etc.)
5. **Create IMPLICIT rows** - Universal standards (security, tests pass, quality)

## Context Sources

| Source | File | Infers |
|--------|------|--------|
| Tech Stack | TECHSTACKPREFERENCES.md | TypeScript > Python, bun, markdown |
| Assets | ASSETMANAGEMENT.md | Deployment patterns, project structure |
| Definitions | DEFINITIONS.md | User's canonical terms |
| Contacts | CONTACTS.md | People references |

## Row Creation Guidelines

**EXPLICIT rows:**
- Direct quotes from the request
- Specific features mentioned
- Clear success criteria stated

**INFERRED rows:**
- From TECHSTACKPREFERENCES: "Uses TypeScript", "Uses bun"
- From project context: "Follows existing patterns"
- From session history: "Consistent with previous work"

**IMPLICIT rows:**
- "No security vulnerabilities"
- "Existing tests continue to pass"
- "No regressions introduced"
- "Code is readable and maintainable"

## Example

**Request:** "Add a logout button to the navbar"

**OBSERVE creates:**

| # | What Ideal Looks Like | Source |
|---|------------------------|--------|
| 1 | Logout button in navbar | EXPLICIT |
| 2 | Clicking logs user out | EXPLICIT |
| 3 | Uses TypeScript | INFERRED |
| 4 | Follows existing component patterns | INFERRED |
| 5 | No security issues | IMPLICIT |
| 6 | Existing tests pass | IMPLICIT |

## Commands

```bash
# Create ISC with request
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts create --request "Add logout button"

# Add rows as you identify them
bun run ISCManager.ts add -d "Logout button in navbar" -s EXPLICIT
bun run ISCManager.ts add -d "Uses TypeScript" -s INFERRED
bun run ISCManager.ts add -d "Tests pass" -s IMPLICIT
```

## Exit Criteria

- At least 2 ISC rows created
- User context was consulted for INFERRED rows
- IMPLICIT standards are included
- Ready for THINK phase
