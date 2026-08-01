---
name: Tldraw
version: 1.0.0
description: Read, create, and edit tldraw .tldr canvas files deterministically — sketch hand-drawn-register diagrams (boxes, arrows, sticky notes, frames, text) directly into a canvas file the user opens in any tldraw surface, and read a rough canvas back as structured data to organize it. USE WHEN tldraw, .tldr file, whiteboard, canvas, sketch a diagram, hand-drawn diagram, draw this on a canvas, put this on the whiteboard, structure my canvas, organize my whiteboard, read my canvas, cluster my sticky notes. NOT FOR polished static images, infographics, or mermaid diagrams (use Art), web UI design (use Webdesign), programmatic video (use Remotion).
---

# Tldraw

Deterministic read/write for tldraw canvases. The `.tldr` format is plain JSON (`{tldrawFileFormatVersion: 1, schema, records}`); `Tools/Tldr.ts` writes records that pass tldraw's own validator, so generated files open cleanly in the tldraw web editor, the VS Code tldraw extension, or the desktop app. Two directions: model → canvas (sketch diagrams) and canvas → model (read and structure a human's rough thinking).

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Tldraw/`

If this directory exists, load and apply any PREFERENCES.md found there (default canvas directory, preferred colors/register, default open surface). If not, proceed with defaults.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running WORKFLOWNAME in Tldraw"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running **WorkflowName** in **Tldraw**...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **SketchDiagram** | "sketch a diagram", "draw this on a canvas", "tldraw diagram" | `Workflows/SketchDiagram.md` |
| **StructureCanvas** | "structure my canvas", "organize my whiteboard", "read my canvas" | `Workflows/StructureCanvas.md` |

## Quick Reference

- Tool: `bun ~/.claude/skills/Tldraw/Tools/Tldr.ts <create|inspect|add|remove|move|settext|validate> <file.tldr> [flags]`
- Record shapes, spec format, coordinate conventions: `References/TldrFormat.md`
- Vendored schema (tldraw 5.2.5): `References/SchemaSnapshot.json`

## Examples

**Example 1: Diagram for a post**
```
User: "Sketch the three-stage pipeline as a hand-drawn diagram"
→ Invokes SketchDiagram workflow
→ Writes spec JSON, runs Tldr.ts create + add, validates
→ Returns the .tldr path and how to open it; user nudges shapes and exports
```

**Example 2: Organize an ideation canvas**
```
User: "I dumped ideas on my canvas — structure them"
→ Invokes StructureCanvas workflow
→ Tldr.ts inspect --json reads every shape's text and position
→ Clusters related items, adds frames + arrows, moves shapes into groups
→ User reopens the same file and sees the organized version
```

## Gotchas

- **zsh `echo` mangles spec JSON** — it expands `\n` inside strings into real newlines, breaking JSON. Write the spec to a file (or use `printf '%s'`) and pass `--spec <file>`; the tool also accepts `--spec -` on stdin, but only feed it from something that doesn't reinterpret escapes.
- **Text is `richText`, never a plain string** — labels on geo/text/note/arrow shapes are ProseMirror doc JSON (`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"..."}]}]}`). A bare string prop is rejected by tldraw's validator. `Tldr.ts` builds this for you; never hand-write a `text` prop.
- **Arrow bindings require `terminal: "start"|"end"`** — tldraw's own `ArrowBindingUtil.getDefaultProps()` omits it, but the schema validator rejects a binding without it (verified against tldraw 5.2.5). The tool sets it; if you hand-edit bindings, keep it.
- **Raw records need every prop** — records written to the file bypass editor defaulting, so a missing prop (e.g. `growY` on geo) fails validation on load. Always go through `Tldr.ts add`; don't append hand-rolled records.
- **Fractional index strings order shapes** — `index` values (`a1`, `a2`, …) are base62 lexicographic and must never end in `0`. The tool generates them; duplicates cause z-order glitches in the editor.
- **The desktop-app `.tldraw` format is a different thing** — the tldraw desktop app's native save is a zip (sqlite + assets + scripts), not this JSON. This skill targets portable `.tldr` JSON, which the web editor, the VS Code extension, and the desktop app can all open/import.
- **Editors hold files in memory** — if the user has the canvas open while you edit it on disk, their surface may not reload (or may overwrite your change on save). Edit while closed, or tell the user to reopen after your write.

## Opening a canvas

- **VS Code / Cursor**: the official tldraw extension opens `.tldr` files in-editor — fully local, right choice for private content.
- **tldraw.com**: File → Open. Content goes to a third-party web app — only for content already public-destined.
- **Export to image**: from any tldraw surface, select all → Export as SVG/PNG. (No headless export path ships with this skill.)

## Execution Log

After completing any workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"Tldraw","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.claude/LIFEOS/MEMORY/SKILLS/execution.jsonl
```
