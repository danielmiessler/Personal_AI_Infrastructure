# Operational Rules — <PRINCIPAL_NAME>

> **Template.** This file ships as a scaffold. It is populated during Hermes setup with the principal's actual values. It is a **skill reference file**, not a `CLAUDE.md` `@`-import — the **Config** skill reads it (Layer 5, Operational) when a repo convention, environment path, tool preference, or vendor gotcha is relevant. Replace every `<PLACEHOLDER>` with real values; delete rows that do not apply.

## Principal

- **Name:** `<PRINCIPAL_NAME>`
- **Timezone:** `<TIMEZONE>`
- **Home:** `$HERMES_HOME` = `<HERMES_HOME_PATH>`

## Repo conventions

- Default branch policy: `<e.g. commit straight to main | branch + PR>` for `<which repos>`
- Commit style: `<e.g. conventional commits, no co-author trailer unless asked>`
- "Ship it" means: `<e.g. deploy AND push, per project>`

## Environment paths

- Canonical secrets: `<e.g. $HERMES_HOME/.env>`
- TELOS source: `E:/Dropbox/ARON BIJL MSC/TELOS/`
- `<other load-bearing path>`: `<value>`

## Tool preferences

- Package manager: `<e.g. bun, never npm>`
- Search / file tools: `<e.g. rg over grep, fd over find>`
- Language-native fs APIs in portable skill code; `<shell fallback preference>`

## Vendor-specific doctrine

- **Cloudflare:** `<e.g. how to verify a token; deploy = wrangler deploy; known false-negative probes>`
- **`<vendor>`:** `<rotation playbook | verification step | known gotcha>`

---
*Keep each rule concrete and sourced to the moment it was learned — the most useful entries encode a mistake not to repeat. The Config skill surfaces this file on demand; it is not injected into every prompt.*
