---
name: isdown
description: Check whether a site is down for everyone or just you — local probe + downforeveryoneorjustme API, with --deep for a 7-node worldwide sweep via check-host.net.
argument-hint: <domain-or-url> [--deep] [--json]
---

# /isdown — Is this site down, or is it just me?

Thin invoker for `LIFEOS/TOOLS/IsDown.ts`.

```bash
bun ~/.claude/LIFEOS/TOOLS/IsDown.ts $ARGUMENTS
```

Exit codes: 0 up everywhere · 1 down for everyone · 2 down just for you · 3 probe error.

Report the verdict line and the per-probe evidence. If the verdict is `just-you`, suggest the usual local culprits (DNS cache, VPN, hosts file, router). If `--deep` was passed, include the per-node table.
