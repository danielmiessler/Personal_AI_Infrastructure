---
category: ops
kind: reference
publish: false
provenance: template
last_updated: 2026-05-03
---

# USER/ Templates

This directory ships with every LifeOS release. Each `*.md` file is a starter scaffold for one Pulse v2 page.

## How to use

1. Copy a template into `USER/` (without `_TEMPLATES/`):
   ```bash
   cp LIFEOS/USER_TEMPLATES/Books.md LIFEOS/USER/Books.md
   ```
2. Edit the file. Add your own content. Pulse will detect the change and flip `provenance: template` → `provenance: customized` automatically.
3. Or delete the template and write your own from scratch — Pulse only requires that the file exist where the manifest points (`LIFEOS/PULSE/pages/<id>.manifest.toml`).

## What the frontmatter does

- `provenance: template` — public release pipeline INCLUDES this file in the next release. Anyone running LifeOS gets the same starter content.
- `provenance: customized` — pipeline EXCLUDES this file. Your edits stay private.

You never have to flip provenance manually. The system detects edits (via Pulse inline editor or direct mtime change) and flips it for you. The `MarkTemplate.ts` and `MarkCustomized.ts` CLIs exist for the rare cases when you need to override.

## Adding a new page type

1. Create the template here under a clear name.
2. Add a `<id>.manifest.toml` under `LIFEOS/PULSE/pages/` pointing at the new template's path.
3. Pick a kind (`collection`, `narrative`, `reference`, `index`) — that decides which UI component renders it.
4. Pick or write an adapter prompt under `LIFEOS/PULSE/adapters/prompts/`.
5. Run `bun LIFEOS/PULSE/Tools/ValidateManifests.ts` to confirm the new manifest is wired up.
