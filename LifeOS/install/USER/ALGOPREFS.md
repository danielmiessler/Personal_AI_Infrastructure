---
provenance: template
---

# Algorithm Preferences

> How you want the LifeOS Algorithm to behave in your sessions.

## Depth Defaults

- **Default response depth:** Concise — the shortest answer that fully answers, depth added only when the task demands it
- **When to go deeper:** Multi-file refactors, production deploys, security review
- **Fast-path:** Enabled for single-verb commands and direct lookups

## Communication Style

- **Response length:** (interview — concise / balanced / thorough)
- **Explanation depth:** (interview — show work / give answer / ask first)
- **Follow-ups:** (interview — ask before acting / act and report / batch decisions)

## Capability Selection

- **Always-on thinking skills:** (interview — e.g., Science, FirstPrinciples, RootCauseAnalysis)
- **Preferred capability stack:** (interview — your go-to analysis patterns)

## Verification

- **Live probes required:** Yes (no "should work")
- **Independent second look on high-impact work:** Yes (default) — a fresh-context, non-forked review. `Max` is the named in-family agent for it (top rung, read-only); the builder never reviews its own build.
- **Cross-vendor audit (Forge) on high-stakes verification:** Yes (default) — a different vendor's eye, for the blind spots every Claude-family reviewer shares.

---
*These override per-session defaults in the Algorithm. Read at OBSERVE to tune effort, capability, and verification posture to your preferences.*
