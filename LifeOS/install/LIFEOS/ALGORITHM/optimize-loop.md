---
last_updated: 2026-05-13
last_updated_by: da
convention: pai-freshness-v1
status: redirect
---

# Optimize Loop Protocol — Moved

> **RETIRED 2026-07-11.** The mode system is gone — `mode:` is never written on new
> ISAs (`LIFEOS/DOCUMENTATION/ISA/ISAFormat.md`). Nothing below is operative.
>
> **This file has moved.** Historical Optimize mode doctrine is at [`modes/optimize.md`](archive/modes/optimize.md).
>
> Reason: the 2026-05-13 mode reorg consolidated per-mode docs into a single `modes/` directory. See [`modes/README.md`](archive/modes/README.md) for the full mode taxonomy.

## Where things live now

- **Optimize mode doctrine:** [`modes/optimize.md`](archive/modes/optimize.md) — metric vs eval modes, parameters, presets, the optimization loop, ISC guard-rail role
- **Mode taxonomy:** [`modes/README.md`](archive/modes/README.md)
- **Parameter schema:** [`archive/parameter-schema.md`](archive/parameter-schema.md)
- **Eval mode guide:** [`eval-guide.md`](eval-guide.md)
- **Target types:** [`archive/target-types.md`](archive/target-types.md)
- **Optimize skill (router):** `~/.claude/skills/Optimize/SKILL.md`

## Backwards-compat note

References to this file from older code/docs still resolve to this redirect pointer. When you update Optimize logic, update [`modes/optimize.md`](archive/modes/optimize.md) — not this file.
