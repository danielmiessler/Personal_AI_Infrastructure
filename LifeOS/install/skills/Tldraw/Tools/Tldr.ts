#!/usr/bin/env bun
/**
 * Tldr.ts — deterministic read/write for tldraw .tldr canvas files.
 *
 * Dependency-free: writes records matching tldraw's store schema
 * (verified against tldraw@5.2.5 parseTldrawJsonFile). The vendored
 * schema snapshot in ../References/SchemaSnapshot.json makes new files
 * loadable by any tldraw surface at or above that version.
 *
 * Usage:
 *   bun Tldr.ts create  <file> [--title "Heading text"]
 *   bun Tldr.ts inspect <file> [--json]
 *   bun Tldr.ts add     <file> --spec <spec.json | ->
 *   bun Tldr.ts remove  <file> --ids id1,id2
 *   bun Tldr.ts move    <file> --id <shapeId> --x N --y N
 *   bun Tldr.ts settext <file> --id <shapeId> --text "New label"
 *   bun Tldr.ts validate <file>
 *
 * Spec file: JSON array of simplified shape specs (see Tldr.help.md).
 */

import { join, dirname } from "node:path"

// ---------- shared ----------

const COLORS = new Set([
  "black", "grey", "light-violet", "violet", "blue", "light-blue",
  "yellow", "orange", "green", "light-green", "light-red", "red", "white",
])
const GEOS = new Set([
  "rectangle", "ellipse", "triangle", "diamond", "pentagon", "hexagon",
  "octagon", "star", "rhombus", "oval", "trapezoid", "arrow-right",
  "arrow-left", "arrow-up", "arrow-down", "x-box", "check-box", "heart", "cloud",
])
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

type Rec = Record<string, any>
interface TldrFile { tldrawFileFormatVersion: number; schema: Rec; records: Rec[] }

function richText(text: string): Rec {
  const paragraphs = String(text).split("\n").map((line) => ({
    type: "paragraph",
    ...(line.length ? { content: [{ type: "text", text: line }] } : {}),
  }))
  return { type: "doc", content: paragraphs }
}

function plainText(rt: any): string {
  if (!rt || typeof rt !== "object") return ""
  const walk = (node: any): string => {
    if (node.type === "text") return node.text ?? ""
    const inner = (node.content ?? []).map(walk).join("")
    return node.type === "paragraph" ? inner + "\n" : inner
  }
  return walk(rt).trimEnd()
}

/** Next fractional index strictly after `last` (base62, no trailing '0'). */
function nextIndex(last: string | undefined): string {
  if (!last) return "a1"
  const tail = last[last.length - 1]
  const pos = DIGITS.indexOf(tail)
  if (pos >= 0 && pos < DIGITS.length - 1) return last.slice(0, -1) + DIGITS[pos + 1]
  return last + "1"
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "shape"
}

async function load(file: string): Promise<TldrFile> {
  const doc = JSON.parse(await Bun.file(file).text())
  if (doc.tldrawFileFormatVersion !== 1 || !Array.isArray(doc.records)) {
    throw new Error(`${file} is not a v1 .tldr file`)
  }
  return doc
}

async function save(file: string, doc: TldrFile): Promise<void> {
  await Bun.write(file, JSON.stringify(doc))
}

function pageIdOf(doc: TldrFile): string {
  const page = doc.records.find((r) => r.typeName === "page")
  if (!page) throw new Error("no page record found")
  return page.id
}

function maxIndex(doc: TldrFile): string | undefined {
  const idxs = doc.records.filter((r) => r.typeName === "shape").map((r) => r.index as string)
  return idxs.sort()[idxs.length - 1]
}

function uniqueId(doc: TldrFile, prefix: string, base: string): string {
  let id = `${prefix}:${base}`
  let n = 2
  const ids = new Set(doc.records.map((r) => r.id))
  while (ids.has(id)) id = `${prefix}:${base}-${n++}`
  return id
}

function baseShape(id: string, type: string, parentId: string, x: number, y: number, index: string, props: Rec): Rec {
  return { id, typeName: "shape", type, parentId, x, y, rotation: 0, index, isLocked: false, opacity: 1, meta: {}, props }
}

function die(msg: string): never {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

// ---------- spec expansion ----------

function centerOf(shape: Rec): { x: number; y: number } {
  const w = shape.props?.w ?? 0
  const h = shape.props?.h ?? 0
  return { x: shape.x + w / 2, y: shape.y + h / 2 }
}

function expandSpec(doc: TldrFile, spec: Rec, pageId: string, index: string): Rec[] {
  const kind = spec.kind
  const color = spec.color ?? "black"
  if (spec.color && !COLORS.has(spec.color)) die(`invalid color "${spec.color}" — one of: ${[...COLORS].join(", ")}`)
  const name = spec.name ?? slug(spec.text ?? kind)
  const font = spec.font ?? "draw"

  if (kind === "box" || kind === "ellipse") {
    const geo = kind === "ellipse" ? "ellipse" : (spec.geo ?? "rectangle")
    if (!GEOS.has(geo)) die(`invalid geo "${geo}"`)
    return [baseShape(uniqueId(doc, "shape", name), "geo", pageId, spec.x ?? 0, spec.y ?? 0, index, {
      geo, w: spec.w ?? 220, h: spec.h ?? 120, color, labelColor: "black",
      fill: spec.fill ?? "none", dash: spec.dash ?? "draw", size: spec.size ?? "m", font,
      align: "middle", verticalAlign: "middle", growY: 0, url: spec.url ?? "",
      scale: 1, richText: richText(spec.text ?? ""),
    })]
  }
  if (kind === "text") {
    return [baseShape(uniqueId(doc, "shape", name), "text", pageId, spec.x ?? 0, spec.y ?? 0, index, {
      color, size: spec.size ?? "m", w: spec.w ?? 400, font,
      textAlign: spec.textAlign ?? "start", autoSize: spec.w === undefined, scale: 1,
      richText: richText(spec.text ?? ""),
    })]
  }
  if (kind === "note") {
    return [baseShape(uniqueId(doc, "shape", name), "note", pageId, spec.x ?? 0, spec.y ?? 0, index, {
      color: spec.color ?? "yellow", richText: richText(spec.text ?? ""), size: spec.size ?? "m", font,
      align: "middle", verticalAlign: "middle", labelColor: "black", growY: 0,
      fontSizeAdjustment: 1, url: "", scale: 1, textLastEditedBy: null,
    })]
  }
  if (kind === "frame") {
    return [baseShape(uniqueId(doc, "shape", name), "frame", pageId, spec.x ?? 0, spec.y ?? 0, index, {
      w: spec.w ?? 640, h: spec.h ?? 360, name: spec.title ?? spec.text ?? "", color,
    })]
  }
  if (kind === "arrow") {
    const fromShape = doc.records.find((r) => r.id === `shape:${spec.from}` || r.id === spec.from)
    const toShape = doc.records.find((r) => r.id === `shape:${spec.to}` || r.id === spec.to)
    if (!fromShape || !toShape) die(`arrow needs existing from/to shapes ("${spec.from}" → "${spec.to}")`)
    const a = centerOf(fromShape)
    const b = centerOf(toShape)
    const arrowName = spec.name ?? (spec.text ? slug(spec.text) : `arrow-${slug(String(spec.from))}-${slug(String(spec.to))}`)
    const arrowId = uniqueId(doc, "shape", arrowName)
    const bindingProps = { isPrecise: false, isExact: false, normalizedAnchor: { x: 0.5, y: 0.5 }, snap: "none" }
    return [
      baseShape(arrowId, "arrow", pageId, 0, 0, index, {
        kind: "arc", elbowMidPoint: 0.5, dash: spec.dash ?? "draw", size: spec.size ?? "m", fill: "none",
        color, labelColor: "black", bend: spec.bend ?? 0,
        start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y },
        arrowheadStart: spec.arrowheadStart ?? "none", arrowheadEnd: spec.arrowheadEnd ?? "arrow",
        richText: richText(spec.text ?? ""), labelPosition: 0.5, font, scale: 1,
      }),
      { id: uniqueId(doc, "binding", `${slug(String(spec.from))}-start`), typeName: "binding", type: "arrow",
        fromId: arrowId, toId: fromShape.id, props: { ...bindingProps, terminal: "start" }, meta: {} },
      { id: uniqueId(doc, "binding", `${slug(String(spec.to))}-end`), typeName: "binding", type: "arrow",
        fromId: arrowId, toId: toShape.id, props: { ...bindingProps, terminal: "end" }, meta: {} },
    ]
  }
  die(`unknown spec kind "${kind}" — one of: box, ellipse, text, note, frame, arrow`)
}

// ---------- commands ----------

async function cmdCreate(file: string) {
  const schemaPath = join(dirname(Bun.main), "..", "References", "SchemaSnapshot.json")
  const schema = JSON.parse(await Bun.file(schemaPath).text())
  const doc: TldrFile = {
    tldrawFileFormatVersion: 1,
    schema,
    records: [
      { gridSize: 10, name: "", meta: {}, id: "document:document", typeName: "document" },
      { meta: {}, id: "page:page", name: "Page 1", index: "a1", typeName: "page" },
    ],
  }
  const title = arg("--title")
  if (title) {
    doc.records.push(baseShape("shape:title", "text", "page:page", 0, -80, "a1", {
      color: "black", size: "xl", w: 700, font: "draw", textAlign: "start",
      autoSize: false, scale: 1, richText: richText(title),
    }))
  }
  await save(file, doc)
  console.log(`created ${file} (${doc.records.length} records)`)
}

async function cmdInspect(file: string) {
  const doc = await load(file)
  const shapes = doc.records.filter((r) => r.typeName === "shape")
  const bindings = doc.records.filter((r) => r.typeName === "binding")
  const out = {
    file,
    pages: doc.records.filter((r) => r.typeName === "page").map((r) => ({ id: r.id, name: r.name })),
    shapes: shapes.map((s) => ({
      id: s.id, type: s.type, x: s.x, y: s.y,
      w: s.props?.w, h: s.props?.h, color: s.props?.color,
      text: plainText(s.props?.richText) || undefined,
      ...(s.type === "frame" ? { title: s.props?.name } : {}),
    })),
    edges: bindings
      .filter((b) => b.props?.terminal === "start")
      .map((b) => {
        const end = bindings.find((x) => x.fromId === b.fromId && x.props?.terminal === "end")
        const label = plainText(shapes.find((s) => s.id === b.fromId)?.props?.richText)
        return { arrow: b.fromId, from: b.toId, to: end?.toId, label: label || undefined }
      }),
  }
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(out, null, 2))
  } else {
    console.log(`${file} — ${out.pages.length} page(s), ${shapes.length} shape(s)`)
    for (const s of out.shapes) {
      console.log(`  ${s.id} [${s.type}] @(${s.x},${s.y})${s.w ? ` ${s.w}x${s.h}` : ""}${s.text ? ` "${s.text.replace(/\n/g, " / ")}"` : ""}`)
    }
    for (const e of out.edges) console.log(`  ${e.from} → ${e.to}${e.label ? ` "${e.label}"` : ""}`)
  }
}

async function cmdAdd(file: string) {
  const doc = await load(file)
  const specArg = arg("--spec") ?? die("add requires --spec <file|->")
  const raw = specArg === "-" ? await Bun.stdin.text() : await Bun.file(specArg).text()
  const specs: Rec[] = JSON.parse(raw)
  if (!Array.isArray(specs)) die("--spec must be a JSON array of shape specs")
  const pageId = pageIdOf(doc)
  let index = maxIndex(doc)
  const added: string[] = []
  for (const spec of specs) {
    index = nextIndex(index)
    const recs = expandSpec(doc, spec, pageId, index)
    doc.records.push(...recs)
    added.push(recs[0].id)
  }
  await save(file, doc)
  console.log(`added ${added.length} shape(s): ${added.join(", ")}`)
}

async function cmdRemove(file: string) {
  const doc = await load(file)
  const ids = (arg("--ids") ?? die("remove requires --ids a,b")).split(",").map((s) => s.trim())
  const drop = new Set<string>()
  for (const id of ids) {
    const full = doc.records.find((r) => r.id === id || r.id === `shape:${id}`)?.id
    if (!full) die(`no record ${id}`)
    drop.add(full)
  }
  // cascade: bindings touching dropped shapes, and arrows left dangling
  for (const b of doc.records.filter((r) => r.typeName === "binding")) {
    if (drop.has(b.toId) || drop.has(b.fromId)) { drop.add(b.id); drop.add(b.fromId) }
  }
  const before = doc.records.length
  doc.records = doc.records.filter((r) => !drop.has(r.id))
  await save(file, doc)
  console.log(`removed ${before - doc.records.length} record(s)`)
}

async function cmdMove(file: string) {
  const doc = await load(file)
  const id = arg("--id") ?? die("move requires --id")
  const shape = doc.records.find((r) => r.id === id || r.id === `shape:${id}`) ?? die(`no shape ${id}`)
  shape.x = Number(arg("--x") ?? shape.x)
  shape.y = Number(arg("--y") ?? shape.y)
  await save(file, doc)
  console.log(`moved ${shape.id} to (${shape.x},${shape.y})`)
}

async function cmdSetText(file: string) {
  const doc = await load(file)
  const id = arg("--id") ?? die("settext requires --id")
  const text = arg("--text") ?? die("settext requires --text")
  const shape = doc.records.find((r) => r.id === id || r.id === `shape:${id}`) ?? die(`no shape ${id}`)
  if (shape.type === "frame") shape.props.name = text
  else if (shape.props?.richText) shape.props.richText = richText(text)
  else die(`shape ${shape.id} (${shape.type}) has no text`)
  await save(file, doc)
  console.log(`set text on ${shape.id}`)
}

async function cmdValidate(file: string) {
  const doc = await load(file)
  const errs: string[] = []
  const ids = new Set(doc.records.map((r) => r.id))
  if (!doc.records.some((r) => r.typeName === "document")) errs.push("missing document record")
  if (!doc.records.some((r) => r.typeName === "page")) errs.push("missing page record")
  for (const r of doc.records) {
    if (!r.id || !r.typeName) errs.push(`record without id/typeName: ${JSON.stringify(r).slice(0, 60)}`)
    if (r.typeName === "shape" && r.parentId && !ids.has(r.parentId) && !String(r.parentId).startsWith("page:")) {
      errs.push(`${r.id}: parent ${r.parentId} not found`)
    }
    if (r.typeName === "binding") {
      if (!["start", "end"].includes(r.props?.terminal)) errs.push(`${r.id}: binding missing terminal start|end`)
      if (!ids.has(r.fromId) || !ids.has(r.toId)) errs.push(`${r.id}: dangling binding`)
    }
    if (r.typeName === "shape" && r.props?.color && !COLORS.has(r.props.color)) {
      errs.push(`${r.id}: invalid color ${r.props.color}`)
    }
  }
  if (errs.length) { console.error("INVALID:\n  " + errs.join("\n  ")); process.exit(1) }
  console.log(`valid: ${file} (${doc.records.length} records)`)
}

// ---------- main ----------

const [cmd, file] = [process.argv[2], process.argv[3]]
if (!cmd || !file) {
  console.log("Usage: bun Tldr.ts <create|inspect|add|remove|move|settext|validate> <file.tldr> [flags]")
  process.exit(cmd === "--help" || cmd === "help" ? 0 : 1)
}
const commands: Record<string, (f: string) => Promise<void>> = {
  create: cmdCreate, inspect: cmdInspect, add: cmdAdd,
  remove: cmdRemove, move: cmdMove, settext: cmdSetText, validate: cmdValidate,
}
const run = commands[cmd] ?? die(`unknown command "${cmd}"`)
await run(file)
