---
name: Trim
version: 1.0.4
description: "Reduces an always-on LifeOS context file that has grown too big via a human-gated pass — deterministic GC of stale entries first, then semantic merges and relocations — never dropping a directive and committing every change reversibly. USE WHEN /trim, trim the context, trim OPERATIONAL_RULES, this file is too big, reduce a doctrine file, prune an always-loaded file, fold the proposal inbox, shrink CLAUDE.md or DA_IDENTITY. NOT FOR general code refactoring, trimming video or audio media (use AudioEditor for audio files), or removing AI writing patterns from prose."
---

# Trim

Shrink an always-on context file that has gotten too big. `/trim <file>` walks the reduction, safest cuts first, never dropping a rule.

## Workflow Routing

| Trigger | Workflow |
|---------|----------|
| `/trim <file>`, "trim OPERATIONAL_RULES", "this file is too big", "reduce a doctrine file", "fold the proposal inbox" | `Workflows/Trim.md` |

## Quick Reference

- **Target resolution:** a bare name (`OPERATIONAL_RULES`) resolves against the always-on set — the system prompt, `CLAUDE.md`, its `@`-imports, and the hook-injected memory files. No arg → `wc -c` that set and take the largest.
- **Order is safest-first:** (1) show state, (2) deterministic GC (zero-risk), (3) semantic trims (human-gated), (4) safety gate, (5) re-measure. Full steps: `Workflows/Trim.md`.
- **One tool it orchestrates — never reimplement:** `LIFEOS/TOOLS/ProposalGC.ts` (removes superseded/duplicate/absorbed entries). Sizes come from `wc -c`.
- **Three semantic moves:** MERGE overlapping rules, TIGHTEN verbose ones, RELOCATE rarely-used detail to an on-demand reference (leave a stub + pointer).
- **The invariant:** a trim never drops a distinct directive. If a merge would, keep the original.

## Gotchas

- **USER files commit to the USER_DATA repo, not `~/.claude`.** `LIFEOS/USER/**` (OPERATIONAL_RULES, PROJECTS, the identity files) is a symlink into a separate private repo. Commit with `git -C ~/.config/LIFEOS/USER …`. A `~/.claude` commit captures nothing under `LIFEOS/USER/` — a false safety net.
- **The file can change mid-edit.** The autonomic memory loop appends proposals to these files while you work. If a Write/Edit reports "modified since read", RE-READ before writing — a concurrent correction may have landed (this is how a real deploy-command fix was nearly reverted). Never write from a stale read.
- **Semantic merges must never drop a directive.** Before applying any merge/tighten, confirm every proper noun, path, tool name, and imperative from the originals survives in the result. If one is missing, the merge is wrong — keep the original. Deterministic GC (superseded/dup/absorbed) is always safe; semantic edits are the risky class.
- **`bun`/`bunx` only, never `npm`/`npx`.**
- **Deterministic first, always.** Run ProposalGC before proposing any semantic edit — the free, zero-risk removals often clear enough that no judgment-call edit is needed.

## Examples

```
/trim OPERATIONAL_RULES
# → shows 40,456 B → ProposalGC dry-run (0 removable) → ranks semantic trims (fold the
#   40-entry proposal tail, relocate skill-scoped directives to a reference)
#   → applies approved ones behind the safety gate → commits to USER_DATA → 28,043 B (−31%)

/trim
# → no arg: wc -c the always-on set, take the largest, then the same walkthrough
```

## Execution Log

After completing the workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"Trim","workflow":"Trim","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.claude/LIFEOS/MEMORY/SKILLS/execution.jsonl
```
