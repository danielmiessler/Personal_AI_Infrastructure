# StructureCanvas Workflow

Read a human's rough canvas — scattered notes, boxes, fragments — and write back an organized version: clustered, framed, connected, nothing lost.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running StructureCanvas in Tldraw"}' \
  > /dev/null 2>&1 &
```

Running **StructureCanvas** in **Tldraw**...

## Step 0 — Sufficiency Check

Confirm the file path and that the user wants the SAME file mutated (default) vs a structured copy alongside. If the canvas is open in their editor, ask them to close or expect to reopen (see SKILL.md Gotchas — editors hold files in memory).

## Ideal state

- Every piece of user content survives: no shape's text is deleted or reworded — organizing means moving, grouping, framing, and connecting, not editing their words. (Adding NEW summary/label shapes is fine and encouraged.)
- Related items sit in named clusters (frames with titles), spatially separated from other clusters; cross-cluster relationships drawn as labeled arrows.
- The file still passes `Tldr.ts validate`, and `inspect` before/after shows identical user text content.
- The response summarizes the structure found (clusters, the one-line story of the canvas) — the reading itself is a deliverable, not just the file mutation.

## Tool contract

```bash
T=~/.claude/skills/Tldraw/Tools/Tldr.ts
bun $T inspect <file.tldr> --json              # full read: shapes, text, positions, edges
bun $T move <file.tldr> --id <id> --x N --y N  # regroup existing shapes
bun $T add <file.tldr> --spec <spec.json>      # frames, arrows, summary labels
bun $T validate <file.tldr>
```

## Safety gate

Before the first mutation, copy the file to `<file>.bak.tldr` beside it and say so — this is a user-authored artifact, and the backup is the undo.

## Privacy

An ideation canvas is personal content. Keep all reading and writing local; never suggest a web surface for a private canvas.
