# Trim Workflow

**Goal:** meaningfully shrink one always-on context file without dropping a single directive. Safest cuts first; the human approves every judgment call.

## Step 0 — Resolve the target

The always-on set is the system prompt, `CLAUDE.md`, the `@`-imports listed in it, and the hook-injected memory files (`PRINCIPAL_MEMORY.md`, `DA_MEMORY.md`).

- Arg given (`/trim OPERATIONAL_RULES`): match it against that set by basename.
- No arg: `wc -c` the whole set and take the largest.
- Confirm the resolved absolute path before touching anything.

## Step 1 — Show the state (grounding, not a claim)

```bash
wc -c <resolved-path>
```

Report `<file> — <bytes>`, and where the weight actually sits (per-section byte counts beat a single total — an auto-append tail is usually the answer). State the target reduction for this run so step 5 has something to measure against.

## Step 2 — Deterministic wins first (zero-risk, run before any judgment call)

```bash
bun LIFEOS/TOOLS/ProposalGC.ts            # dry-run — shows superseded / exact-dup / absorbed
```

If it finds removals, show them, then on approval:

```bash
bun LIFEOS/TOOLS/ProposalGC.ts --apply
```

These are provably-redundant (self-marked `[SUPERSEDED]`, exact duplicates, entries already absorbed into the file body) — safe to remove without judgment. Re-measure with `wc -c`. Often this alone clears enough that Step 3 is unnecessary — stop here if the file is small enough.

## Step 3 — Semantic reductions (human-gated; the judgment part)

Read the file. Build a RANKED list of candidate trims — each with the exact target text and estimated bytes saved. Three moves, in decreasing safety:

- **RELOCATE** (safest): rarely-referenced detail (long mechanism explanations, enumerations, examples) → an on-demand reference doc under `LIFEOS/DOCUMENTATION/…`, leaving a one-line stub + pointer. Pattern already used for ISA hierarchy → `LIFEOS/DOCUMENTATION/ISA/ISAHierarchy.md`. Nothing is lost; it just stops loading every turn.
- **TIGHTEN**: a verbose multi-sentence rule → one plain-language sentence carrying the same directive. Kill throat-clearing, dated war-story prose, and intensifier-only restatements — never the instruction itself.
- **MERGE**: two or more rules that say overlapping things in different words → one rule that carries every distinct directive from all of them.

Rank by `bytes_saved × safety` (relocate/tighten above merge). Present the list; the human picks which to apply (or "all safe ones"). Apply one at a time.

## Step 4 — Safety gate (runs before every semantic write — non-negotiable)

A trim edits live doctrine. Before writing any merge/tighten:

1. **Coverage check** — enumerate every proper noun, file path, tool/command name, env-var name, and imperative verb in the ORIGINAL text. Confirm each survives in the replacement. A missing one = the edit drops a directive → **abort this edit, keep the original.**
2. **Re-read** the replacement as the file's reader: does it still compel the same behavior? If weaker, it's a bad trim.
3. Relocate edits: confirm the moved content landed verbatim in the reference AND the stub points to it before deleting from the source.

Deterministic GC (Step 2) skips this gate — it only removes provably-redundant entries. Only Step-3 semantic edits need it.

## Step 5 — Commit (correct repo) and re-verify

- **USER files** (`LIFEOS/USER/**`: OPERATIONAL_RULES, PROJECTS, PRINCIPAL_IDENTITY, DA_IDENTITY) commit to the USER_DATA repo:
  ```bash
  git -C ~/.config/LIFEOS/USER add <relpath> && git -C ~/.config/LIFEOS/USER commit -q -m "trim: <file> <oldpct>%→<newpct>% (<what>)"
  ```
  Stage ONLY the trimmed file — the USER_DATA repo carries unrelated live memory-loop changes; never sweep them in.
- **System files** (system prompt, CLAUDE.md, ALGORITHM, skills) commit to `~/.claude` (`git -C ~/.claude …`), directly to `main`.
- Re-run `wc -c` and report the new byte count. If it fell short of the target named in Step 1, say how much remains and offer to continue.

## Output shape

Lead with the before→after: `OPERATIONAL_RULES 40,456 → 28,043 B (−31%)`. Then a short list of what was removed/merged/relocated, and the commit SHA. If any candidate was declined by the safety gate, say which and why. Never claim the file was trimmed without the re-run `wc -c` number as evidence.
