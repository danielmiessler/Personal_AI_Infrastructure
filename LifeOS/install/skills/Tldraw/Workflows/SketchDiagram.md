# SketchDiagram Workflow

Produce a diagram as a `.tldr` canvas file in the hand-drawn tldraw register — the human-sketch alternative to polished generated art.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running SketchDiagram in Tldraw"}' \
  > /dev/null 2>&1 &
```

Running **SketchDiagram** in **Tldraw**...

## Step 0 — Sufficiency Check

Before drawing, confirm you know: what the diagram must communicate, roughly how many elements, and where the file should land (default: a `Canvases/` dir per user preferences, else the current project). If an interpretation fork would change the diagram's structure, flag it in one line (`⚠️ Picking X over Y because R; redirect if wrong.`) and proceed with the best default.

## Ideal state

- A `.tldr` file exists at an agreed path, passes `Tldr.ts validate`, and contains the full diagram — every concept the user named is a shape, every relationship an arrow, nothing extra.
- Layout reads left-to-right or top-to-bottom in flow order; no overlapping shapes; related items visibly grouped (proximity or a frame).
- The response tells the user the file path and how to open it (see SKILL.md § Opening a canvas), with the local-surface option first for private content.

## Tool contract

```bash
T=~/.claude/skills/Tldraw/Tools/Tldr.ts
bun $T create <file.tldr> [--title "Heading"]
bun $T add <file.tldr> --spec <spec.json>     # spec: JSON array, kinds: box, ellipse, text, note, frame, arrow
bun $T validate <file.tldr>
bun $T inspect <file.tldr>                    # confirm what actually landed
```

Spec format and full prop tables: `../References/TldrFormat.md`.

## Layout constraints (verified conventions)

- Boxes default 220×120; leave ≥140 px horizontal / ≥100 px vertical gaps so bound arrows have room.
- Arrows reference shapes by `name` and bind automatically — add the boxes first (or in the same spec array, boxes before arrows).
- Color is meaning: pick 2–4 colors max from the enum in TldrFormat.md; `fill: "solid"` only for the shapes you want to pop.
- A `frame` groups a region and titles it; prefer one frame per cluster over floating labels.

## Verification (gate)

`validate` passing plus `inspect` output matching the intended shape/edge list closes the claim. You cannot see rendered pixels from here — say so plainly: report "validated structurally; open it to eyeball the layout", never "it looks good".
