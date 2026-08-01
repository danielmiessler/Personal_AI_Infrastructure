# .tldr Format Reference

Facts below verified against tldraw@5.2.5: records built this way pass `parseTldrawJsonFile` (tldraw's own load path). Source of truth for the file container: `packages/tldraw/src/lib/utils/tldr/file.ts` in the tldraw repo.

## File container

```json
{
  "tldrawFileFormatVersion": 1,
  "schema": { "schemaVersion": 2, "sequences": { "...": 0 } },
  "records": [ ... ]
}
```

- `schema` drives migrations on load; this skill vendors a serialized snapshot (`SchemaSnapshot.json`) taken from tldraw 5.2.5. Older tldraw surfaces reject files with a NEWER schema; newer surfaces migrate older ones. If generated files ever fail to open after a tldraw major release, re-snapshot the schema (see Maintenance below).
- Minimum viable records: one `document:document` and one `page:page`. Editors synthesize `instance`/`camera` records themselves on load — do not write them.

## Record envelope (every shape)

```json
{ "id": "shape:<name>", "typeName": "shape", "type": "geo|text|note|frame|arrow",
  "parentId": "page:page", "x": 0, "y": 0, "rotation": 0, "index": "a1",
  "isLocked": false, "opacity": 1, "meta": {}, "props": { ... } }
```

- `index` is a fractional-index string (base62 `0-9A-Za-z`, lexicographic z-order, must not end in `0`).
- Raw records get NO editor defaulting — every prop listed below is required.

## Required props by type (tldraw 5.2.5 `getDefaultProps()` values)

| Type | Props |
|------|-------|
| `geo` | geo, w, h, color, labelColor, fill, dash, size, font, align, verticalAlign, growY, url, scale, richText |
| `text` | color, size, w, font, textAlign, autoSize, scale, richText |
| `note` | color, richText, size, font, align, verticalAlign, labelColor, growY, fontSizeAdjustment, url, scale, textLastEditedBy |
| `frame` | w, h, name, color |
| `arrow` | kind ("arc"), elbowMidPoint, dash, size, fill, color, labelColor, bend, start {x,y}, end {x,y}, arrowheadStart, arrowheadEnd, richText, labelPosition, font, scale |

Arrow binding record (one per bound terminal):

```json
{ "id": "binding:<name>", "typeName": "binding", "type": "arrow",
  "fromId": "shape:<arrow>", "toId": "shape:<target>",
  "props": { "isPrecise": false, "isExact": false, "terminal": "start",
             "normalizedAnchor": { "x": 0.5, "y": 0.5 }, "snap": "none" }, "meta": {} }
```

`terminal` ("start"|"end") is required by the validator even though `ArrowBindingUtil.getDefaultProps()` omits it.

## richText

ProseMirror doc JSON; one `paragraph` node per line. Empty paragraphs omit `content`.

```json
{ "type": "doc", "content": [ { "type": "paragraph", "content": [ { "type": "text", "text": "line 1" } ] } ] }
```

## Enums

- **color / labelColor**: black, grey, light-violet, violet, blue, light-blue, yellow, orange, green, light-green, light-red, red, white
- **fill**: none, semi, solid, pattern, fill
- **dash**: draw, solid, dashed, dotted
- **size**: s, m, l, xl
- **font**: draw (hand-drawn), sans, serif, mono
- **geo**: rectangle, ellipse, triangle, diamond, pentagon, hexagon, octagon, star, rhombus, oval, trapezoid, arrow-right, arrow-left, arrow-up, arrow-down, x-box, check-box, heart, cloud
- **arrowheadStart / arrowheadEnd**: none, arrow, triangle, square, dot, pipe, diamond, inverted, bar

## Tldr.ts spec format

`add --spec` takes a JSON **array**; each entry:

| kind | Required | Optional |
|------|----------|----------|
| `box` | text or name; x, y | w, h, color, fill, geo, dash, size, font, url, name |
| `ellipse` | same as box (geo forced to ellipse) | — |
| `text` | text; x, y | size, font, color, w (setting w disables autoSize), textAlign, name |
| `note` | text; x, y | color (default yellow), size, font, name |
| `frame` | title; x, y, w, h | color, name |
| `arrow` | from, to (names or shape ids of EXISTING shapes) | text, color, bend, dash, size, arrowheadStart, arrowheadEnd, name |

`name` becomes the shape id (`shape:<name>`); omit it and one is derived from the text. Arrows must come after the shapes they connect (later in the same spec array is fine).

## Coordinates

Page space, y-down, origin arbitrary. `x,y` is a shape's top-left. Bound arrows recompute their path from the bound shapes, so their `start`/`end` points only matter until first render.

## Maintenance

To re-snapshot the schema after a tldraw upgrade: in a throwaway dir, `bun add tldraw`, then
`createTLStore({shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils}).schema.serialize()` → write the JSON over `SchemaSnapshot.json`, and re-run a generated file through `parseTldrawJsonFile` to confirm.
