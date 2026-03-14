# Governance Policy Schema

Policy files are YAML documents that define authorization rules for tool calls.

## Top-Level Fields

```yaml
version: "1.0"                    # Policy format version (required)
name: my-policy                   # Human-readable policy name (required)
description: "Policy description" # What this policy does (optional)
default_decision: deny            # approve | deny | escalate (required)

rules: []                         # Array of policy rules (required)

box_policy:                       # Modal gate: necessarily true (optional)
  requireDefiniteTrue: true
  requireNoObstructions: true
  maxSeverity: warn               # info | warn | error | fatal

diamond_policy:                   # Modal gate: possibly true (optional)
  allowIfDefiniteFalse: false
  maxSeverity: warn               # info | warn | error | fatal
```

## Rule Format

```yaml
rules:
  - id: rule-name                 # Unique rule identifier (required)
    tool_name: "^Bash$"           # Regex pattern for tool name (optional)
    action_type: execute          # Action type filter (optional)
    target: "**/src/**"           # Glob pattern for target (optional)
    decision: approve             # approve | deny | escalate (required)
    reason: "Why this rule exists" # Human-readable explanation (required)
```

### Rule Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier for this rule |
| `tool_name` | string (regex) | No | Regex pattern matched against tool name |
| `action_type` | string or array | No | One or more of: read, write, execute, network, destructive, credential, unknown |
| `target` | string (glob) | No | Glob pattern matched against the tool's target (file path, command, URL) |
| `decision` | string | Yes | What to do when this rule matches: approve, deny, or escalate |
| `reason` | string | Yes | Human-readable explanation shown to the user |

### Rule Matching

1. Rules are evaluated **in order** (first match wins)
2. All specified conditions must match (AND logic)
3. Omitted conditions match everything
4. If no rule matches, `default_decision` applies

### Glob Patterns

| Pattern | Matches |
|---|---|
| `*` | Any characters except `/` |
| `**` | Any characters including `/` (directory traversal) |
| `?` | Any single character except `/` |

Examples:
- `**/src/**` matches `/project/src/app.ts`
- `npm test*` matches `npm test --verbose`
- `*.env` matches `production.env`

### Tool Name Regex

Standard JavaScript regex syntax:
- `^Bash$` matches only the Bash tool
- `^(Read\|Glob\|Grep)$` matches read-only tools
- `^mcp__` matches all MCP tools
- Omit `tool_name` to match any tool

## Action Types

| Type | Tools that produce it | Description |
|---|---|---|
| `read` | Read, Glob, Grep, `cat`, `ls` | Reading files or searching |
| `write` | Write, Edit, output redirection | Creating or modifying files |
| `execute` | Bash (`npm`, `cargo`, etc.) | Running programs |
| `network` | WebFetch, WebSearch, `curl`, `ssh` | Network access |
| `destructive` | `rm -rf`, `git reset --hard`, `DROP TABLE` | Irreversible operations |
| `credential` | `.env`, `.ssh/`, `credentials` access | Sensitive data access |
| `unknown` | MCP tools, unrecognized tools | Unclassified operations |

## Modal Gates (Advanced)

Modal gates provide fine-grained control over the approve/deny/escalate decision:

**Box policy** (necessarily true -- all conditions must be met for approval):
- `requireDefiniteTrue`: Rule must produce a definitive "approve" (default: true)
- `requireNoObstructions`: No warnings or errors allowed (default: false)
- `maxSeverity`: Maximum obstruction severity to tolerate (info/warn/error/fatal)

**Diamond policy** (possibly true -- at least one path allows):
- `allowIfDefiniteFalse`: Allow escalation even for definitive "deny" rules (default: false)
- `maxSeverity`: Maximum severity for escalation (default: warn)

**Decision flow with modal gates:**
1. Rule match produces an internal verdict
2. If box gate passes: **approve**
3. If diamond gate passes (but box fails): **escalate**
4. If both fail: **deny**

Without modal gates, the rule's `decision` field is used directly.

## Examples

### Allow reads, deny everything else
```yaml
version: "1.0"
name: read-only
default_decision: deny
rules:
  - id: allow-read
    action_type: read
    decision: approve
    reason: "Read operations are safe"
```

### Allow project work, escalate external access
```yaml
version: "1.0"
name: project-scoped
default_decision: deny
rules:
  - id: allow-read
    action_type: read
    decision: approve
    reason: "Reads are safe"
  - id: allow-project-write
    action_type: write
    target: "**/my-project/**"
    decision: approve
    reason: "Writing within project scope"
  - id: escalate-network
    action_type: network
    decision: escalate
    reason: "Network access needs confirmation"
  - id: deny-destructive
    action_type: destructive
    decision: deny
    reason: "Destructive operations blocked"
```
