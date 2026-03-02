# pai-governance-guard

**Deterministic authorization layer for Claude Code** -- structural authority separation via PROPOSE/DECIDE/PROMOTE pipeline.

**Pack ID:** `metacortex-governance-guard-core-v1.0.0`
**Author:** MetaCortex-Dynamics
**License:** MIT

## What This Solves

PAI's SecurityValidator catches known-dangerous commands (`rm -rf`, credential patterns, destructive git ops). Governance-guard addresses a different class of risk: **actions that aren't pattern-matchable as dangerous but exceed authorized scope.**

- Creating accounts on external services
- Sending API requests to third-party services the user never approved
- Writing to directories outside the project scope
- Invoking tools with side effects the user didn't request

These actions pass SecurityValidator cleanly. They don't match any regex tier. But they exceed the user's intended authorization.

## Architecture

Three-phase pipeline as a Claude Code `PreToolUse` hook:

```
Tool Call --> PROPOSE --> DECIDE --> PROMOTE --> Execution
                |           |          |
            serialize    evaluate    gate
            + hash       against    on
            intent       policy     verdict
                         (no LLM)
```

**PROPOSE** -- Serializes the tool call into a structured `ActionIntent` (tool name, action type, target, parameters). Binds with SHA-256 content hash.

**DECIDE** -- Evaluates the intent against a user-defined YAML policy. Pure function. No LLM. No interpretation. Policy + intent = verdict (approve / deny / escalate). Default: deny.

**PROMOTE** -- Approved actions proceed. Denied actions are blocked. Escalated actions prompt the user. Every decision is recorded in a hash-chained witness log.

## How It Integrates With PAI

This pack is a **companion to SecurityValidator**, not a replacement:

| Layer | What It Catches | Mechanism |
|---|---|---|
| `validate-protected.ts` | Credential leaks in commits | Pattern matching on file content |
| `SecurityValidator.hook.ts` | Known-dangerous commands | Regex tiers on bash commands |
| **`governance-guard`** | Unauthorized-but-not-dangerous actions | Deterministic policy evaluation on structured intent |

Both hooks fire on tool calls. Both must pass. SecurityValidator's hard blocks take precedence.

## Action Classification

Tool calls are classified into seven action types:

| Type | Examples |
|---|---|
| `read` | `cat`, `ls`, `grep`, `Read` tool, `Glob` tool |
| `write` | `Write` tool, `Edit` tool, output redirection |
| `execute` | `npm`, `cargo`, `python`, `make` |
| `network` | `curl`, `wget`, `ssh`, `WebFetch`, `WebSearch` |
| `destructive` | `rm -rf`, `git reset --hard`, `DROP TABLE` |
| `credential` | `.env`, `.ssh/`, `credentials`, `api_key` |
| `unknown` | MCP tools, unrecognized tools |

## Policy Presets

Three YAML presets included:

- **`minimal.yaml`** -- Default approve. Blocks destructive + credential access. Escalates network.
- **`standard.yaml`** -- Default deny. Explicit allows for read, write-to-src, test/build execution. Escalates everything else.
- **`strict.yaml`** -- Read-only. Denies all writes, execution, network, and destructive operations.

## Witness Chain

Every governance decision is recorded in a hash-chained JSONL log at `$PAI_DIR/MEMORY/GOVERNANCE/witness-YYYY-MM.jsonl`.

Each record contains:
- Sequence number, timestamp, session ID
- Intent hash and verdict hash (SHA-256)
- Decision (approve/deny/escalate)
- Tool name, action type, target
- `prev_hash` linking to the previous record
- `record_hash` covering all fields (tamper-evident)

Chain integrity can be verified with `verifyChain()`.

## What This Does NOT Do

- Does not replace SecurityValidator (complementary, not competitive)
- Does not verify LLM intent accuracy (structural evaluation, not semantic)
- Does not perform consequence analysis (evaluates against policy rules)
- Witness chain is tamper-evident, not tamper-proof (filesystem deletion detectable but not preventable)

## Zero Dependencies

Custom YAML parser, Node built-in `crypto`. No npm packages at runtime. Matches PAI's principle of deterministic infrastructure.

## Tests

146 tests passing across 6 test files:
- `canonical.test.ts` -- Hash computation, deterministic serialization
- `yaml-parse.test.ts` -- YAML parser, all policy presets
- `intent.test.ts` -- Action classification for all tool types
- `policy-engine.test.ts` -- Rule matching, modal gates, policy loading
- `witness.test.ts` -- Hash chain integrity, tamper detection
- `integration.test.ts` -- End-to-end pipeline
- `adversarial.test.ts` -- Spoofed hashes, path traversal, replay attacks, malformed YAML

## Alignment With PAI Principles

| PAI Principle | How governance-guard implements it |
|---|---|
| **#4: Scaffolding > Model** | Authorization decisions removed from the LLM entirely |
| **#5: Deterministic Infrastructure** | Same policy + same intent = same verdict, every time |
| **#7: Spec / Test / Evals First** | 146 tests including adversarial coverage |
| **#8: UNIX Philosophy** | Does one thing (authorization), composes with existing layers |
| **#9: ENG / SRE Principles** | Hash-chained witness log for incident reconstruction |

---

Built by [MetaCortex Dynamics](https://github.com/MetaCortex-Dynamics)

**AI disclosure:** Architecture review and spec drafting assisted by Claude. All code reviewed, understood, and tested by the author. The PROPOSE/DECIDE/PROMOTE governance architecture is original work.
