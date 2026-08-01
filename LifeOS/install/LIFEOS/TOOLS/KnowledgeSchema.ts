#!/usr/bin/env bun
/**
 * KnowledgeSchema — the single source of truth for the LifeOS Knowledge Archive
 * note schema (the "kb-v3" contract).
 *
 * WHY THIS EXISTS (design: MEMORY/WORK/20260704-knowledge-schema-upgrade-design/DESIGN.md):
 * the archive had THREE competing frontmatter dialects with nothing enforcing any
 * of them (v2.0 28% / pai-memory-v1 2.7% / undocumented blog-import 69%), so it
 * couldn't be queried on the dimensions that matter (source, author, tags, dates,
 * references). This module is the pure-data authority — the Core Envelope, the
 * per-type required fields, the relation vocabulary — PLUS the shared, body-safe
 * frontmatter parse / normalize / validate / serialize logic that both
 * `KnowledgeLint.ts` and `MigrateKnowledge.ts` consume, and that the go-forward
 * writer (`MemorySystem.renderInitialNote`) emits. One data file; the human doc
 * (`_schema.md`) is generated from it and cannot drift.
 *
 * DELIBERATELY SEPARATE from `MemoryTypes.ts`. That module is the memory-WRITE
 * layer (registry: memory|idea|knowledge|proposal; routes notes to dirs). This is
 * the archive OBJECT-schema layer (types: person|company|idea|blog|research). The
 * cross-vendor audit flagged bolting one onto the other as a coupling trap — so
 * they stay separate and MemoryTypes.ts is a consumer, not the authority.
 *
 * BODY SAFETY: every transform is surgical on the FIRST frontmatter block only.
 * The body (everything after the closing `---`) is sliced out verbatim and
 * re-attached byte-for-byte — blog bodies contain copied Markdown with literal
 * `---` delimiters, so we NEVER re-serialize the body.
 *
 * CLI:
 *   bun KnowledgeSchema.ts test          # smoke test (parse/normalize/serialize round-trips)
 *   bun KnowledgeSchema.ts fields        # print the Core Envelope contract as JSON
 */

// ── The contract ──

/** The six archive object-types. `type = X`, on-disk. Topic is a tag, entity is a type. */
export const CANONICAL_TYPES = ["person", "company", "idea", "blog", "research", "book"] as const;
export type CanonicalType = (typeof CANONICAL_TYPES)[number];

/** Which KNOWLEDGE/ subdir each type lives in. */
export const TYPE_TO_DIR: Record<CanonicalType, string> = {
  person: "People",
  company: "Companies",
  idea: "Ideas",
  blog: "Blogs",
  research: "Research",
  book: "Books",
};
export const DIR_TO_TYPE: Record<string, CanonicalType> = {
  People: "person",
  Companies: "company",
  Ideas: "idea",
  Blogs: "blog",
  Research: "research",
  Books: "book",
};

/** Every KNOWLEDGE/ subdir, canonical order. Single source for tools that walk the archive. */
export const ALL_DIRS: readonly string[] = Object.values(TYPE_TO_DIR);

export type FieldFormat = "text" | "number" | "date" | "select" | "list" | "related";

export interface EnvelopeField {
  key: string;
  format: FieldFormat;
  required: boolean;
  /** Closed enum for select fields. */
  values?: readonly string[];
  /** One-line note on the query this field unlocks (feeds the generated _schema.md). */
  query: string;
}

export const SOURCE_KINDS = ["blog", "video", "paper", "tweet", "conversation", "bookmark", "internal"] as const;
export const STATUS_VALUES = ["inbox", "seedling", "budding", "evergreen"] as const;

/**
 * The Core Envelope — every note, every type, flat + typed. Order here IS the
 * canonical serialization order. Flat (not nested) so it queries natively in the
 * kb CLI, Obsidian Bases (no nested-object property type), and Pulse at once.
 */
export const ENVELOPE: readonly EnvelopeField[] = [
  { key: "id",             format: "text",   required: true,  query: "stable link target; survives rename" },
  { key: "type",           format: "select", required: true, values: CANONICAL_TYPES, query: "all companies / all research" },
  { key: "title",          format: "text",   required: true,  query: "display + alphabetical sort" },
  { key: "tags",           format: "list",   required: true,  query: "all `security` notes across every type" },
  { key: "status",         format: "select", required: false, values: STATUS_VALUES, query: "everything still in the inbox / a seedling" },
  { key: "quality",        format: "number", required: true,  query: "stubs to enrich (quality < 3)" },
  { key: "quality_inferred", format: "select", required: false, values: ["true", "false"], query: "which quality scores are backfilled, not human-rated" },
  { key: "confidence",     format: "number", required: false, query: "low-certainty claims to revisit (confidence < 0.5)" },
  { key: "source_name",    format: "text",   required: false, query: "everything from a given publication" },
  { key: "source_url",     format: "text",   required: false, query: "dedup + canonical link (List-typed for multi-source research)" },
  { key: "source_author",  format: "text",   required: false, query: "everything by a given author" },
  { key: "source_date",    format: "date",   required: false, query: "everything published in a given year (vs created = archived)" },
  { key: "source_kind",    format: "select", required: false, values: SOURCE_KINDS, query: "all video-derived notes / all tweets" },
  { key: "source_session", format: "text",   required: false, query: "which ISA/session created this note" },
  { key: "source_harvest_id", format: "text", required: false, query: "which harvest run produced it" },
  { key: "created",        format: "date",   required: true,  query: "everything added in a given quarter" },
  { key: "updated",        format: "date",   required: true,  query: "notes untouched in > 1yr (staleness)" },
  { key: "valid_from",     format: "date",   required: false, query: "temporal validity start" },
  { key: "valid_until",    format: "date",   required: false, query: "temporal validity end (contradiction detector)" },
  { key: "related",        format: "related", required: false, query: "typed-edge graph; every `contradicts` edge (via kb/Dataview, not flat Bases)" },
  { key: "convention",     format: "text",   required: true,  query: "schema-version / migration-state key (kb-v3)" },
];

export const ENVELOPE_KEY_ORDER: readonly string[] = ENVELOPE.map((f) => f.key);
export const REQUIRED_KEYS: readonly string[] = ENVELOPE.filter((f) => f.required).map((f) => f.key);

/** Per-type required fields beyond the envelope. */
export const PER_TYPE_REQUIRED: Record<CanonicalType, readonly string[]> = {
  person: [],
  company: [],
  idea: [],
  blog: ["source_url", "source_author", "source_date"],
  research: ["source_url"],
  book: [],
};

/** Relation vocabulary — closed-but-curated. `derived-from` added for source_blog→edge. */
export const RELATION_VOCAB = [
  "supports", "contradicts", "extends", "part-of",
  "instance-of", "caused-by", "preceded-by", "related", "derived-from",
] as const;
export type RelationType = (typeof RELATION_VOCAB)[number];

export const SCHEMA_VERSION = "kb-v3";

// ── Deterministic id ──

import { createHash } from "node:crypto";

/**
 * Mint a stable, opaque id from the note's slug + created date. Deterministic:
 * a re-run produces the SAME id, so migration is idempotent and never orphans
 * links. `kb_` + first 12 hex of sha256(slug|created).
 */
export function mintId(slug: string, created: string): string {
  const h = createHash("sha256").update(`${slug} ${created}`).digest("hex");
  return `kb_${h.slice(0, 12)}`;
}

// ── Frontmatter parse (ordered, body-preserving) ──

export interface FmField {
  key: string;
  /** The full raw text of this field including any continuation lines, NO trailing newline. */
  raw: string;
  /** For a scalar `key: value`, the value text (unquoted-preserving). Undefined for block fields. */
  scalar?: string;
}

export interface ParsedNote {
  /** Ordered top-level frontmatter fields. */
  fields: FmField[];
  /** Everything from the closing `---` onward, sliced by BYTE OFFSET (verbatim). */
  body: string;
  /** True if the input had a well-formed leading frontmatter block. */
  hadFrontmatter: boolean;
  /**
   * True if the frontmatter region contained an orphan line — a non-blank line
   * that is neither a `key:` nor a continuation of one. That means the leading
   * `---…---` was NOT real YAML frontmatter (e.g. a Markdown thematic break
   * around a quote). Callers MUST NOT rewrite a malformed note: normalize would
   * silently drop that content. (Forge cross-vendor finding #1, 2026-07-05.)
   */
  malformed: boolean;
}

const KEY_LINE = /^([A-Za-z_][\w-]*):(.*)$/;

/**
 * Parse a note into ordered frontmatter fields + a verbatim body. Only the FIRST
 * `---\n … \n---\n` block is treated as frontmatter; the body (which may contain
 * literal `---`) is sliced out by exact byte offset, never re-serialized.
 * Sets `malformed` when the frontmatter region isn't parseable as YAML key lines,
 * so the migrator can skip it instead of dropping content.
 */
export function parseNote(content: string): ParsedNote {
  if (!content.startsWith("---\n")) {
    return { fields: [], body: content, hadFrontmatter: false, malformed: false };
  }
  // Find the closing delimiter: a line that is exactly `---`.
  const lines = content.split("\n");
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") { closeIdx = i; break; }
  }
  if (closeIdx === -1) {
    return { fields: [], body: content, hadFrontmatter: false, malformed: false };
  }
  // Body = exact original bytes from the start of the closing `---` line onward.
  // Offset-based (not a rejoin) so body-integrity is a real property, not a
  // tautology of serialize concatenating the parser's own inference.
  let offset = 0;
  for (let i = 0; i < closeIdx; i++) offset += lines[i].length + 1;
  const body = content.slice(offset);

  const fmLines = lines.slice(1, closeIdx);
  const fields: FmField[] = [];
  let cur: FmField | null = null;
  let malformed = false;
  for (const line of fmLines) {
    if (line.trim().length === 0) {
      // Blank line: whitespace, not content. Attach to the current block field
      // if any; a leading blank (no cur) is harmless whitespace, not malformed.
      if (cur) cur.raw += "\n" + line;
      continue;
    }
    const m = line.match(KEY_LINE);
    const isContinuation = /^\s/.test(line);
    if (m && !isContinuation) {
      if (cur) fields.push(cur);
      const valuePart = m[2].replace(/^ /, ""); // drop the single space after the colon if present
      cur = { key: m[1], raw: line, scalar: valuePart.length > 0 ? valuePart : undefined };
    } else if (isContinuation && cur) {
      // continuation line (block value like related:) — attach to current
      cur.raw += "\n" + line;
      cur.scalar = undefined;
    } else {
      // Orphan: a non-blank, non-key line with no field to attach to → this is
      // NOT real YAML frontmatter. Flag it; the migrator must not rewrite.
      malformed = true;
      if (cur) { cur.raw += "\n" + line; cur.scalar = undefined; }
    }
  }
  if (cur) fields.push(cur);
  return { fields, body, hadFrontmatter: true, malformed };
}

/** Re-emit a note from ordered fields + verbatim body. */
export function serializeNote(fields: FmField[], body: string): string {
  const fm = fields.map((f) => f.raw).join("\n");
  return `---\n${fm}\n${body}`;
}

// ── Value helpers ──

function fieldByKey(fields: FmField[], key: string): FmField | undefined {
  return fields.find((f) => f.key === key);
}
function scalarValue(fields: FmField[], key: string): string | undefined {
  const f = fieldByKey(fields, key);
  return f?.scalar?.trim();
}
function scalarField(key: string, value: string): FmField {
  return { key, raw: `${key}: ${value}`, scalar: value };
}

/** Slug from a file path (basename without .md). */
export function slugFromPath(filePath: string): string {
  return filePath.split("/").pop()!.replace(/\.md$/, "");
}

// ── Normalize: any dialect → kb-v3 ──

export interface NormalizeResult {
  fields: FmField[];
  changes: string[];
  /** True if the note was already kb-v3 (no changes needed). */
  alreadyCurrent: boolean;
}

/**
 * Map any of the three dialects onto the kb-v3 Core Envelope. Pure and
 * deterministic. Preserves unrecognized keys (no data loss). Body is handled by
 * the caller — this only transforms the field list.
 *
 * @param parsed  the parsed note
 * @param slug    the note's slug (from filename) — used for id + self-ref detection
 * @param dirType the canonical type implied by the note's directory
 */
export function normalize(parsed: ParsedNote, slug: string, dirType: CanonicalType): NormalizeResult {
  const changes: string[] = [];
  const src = parsed.fields;
  const has = (k: string) => src.some((f) => f.key === k);
  const get = (k: string) => scalarValue(src, k);

  if (get("convention") === SCHEMA_VERSION) {
    return { fields: src, changes: [], alreadyCurrent: true };
  }

  // Build a working map of canonical fields we will emit.
  const out = new Map<string, FmField>();
  const preserve: FmField[] = []; // unrecognized keys, kept verbatim, appended at end

  // 1. type — normalize `type: knowledge` + entity_type → `type: <entity>`, else keep, else dir.
  let typeVal = get("type");
  const entityType = get("entity_type");
  if (typeVal === "knowledge" && entityType) {
    typeVal = entityType.toLowerCase();
    changes.push(`type: knowledge+entity_type:${entityType} → type:${typeVal}`);
  } else if (typeVal) {
    const lc = typeVal.toLowerCase();
    if (lc !== typeVal) changes.push(`type case-normalized ${typeVal} → ${lc}`);
    typeVal = lc;
  } else {
    typeVal = dirType;
    changes.push(`type absent → inferred ${dirType} from dir`);
  }
  if (!(CANONICAL_TYPES as readonly string[]).includes(typeVal)) {
    // Unknown type value — fall back to the directory's type.
    changes.push(`type "${typeVal}" not canonical → using dir type ${dirType}`);
    typeVal = dirType;
  }
  out.set("type", scalarField("type", typeVal as string));

  // 2. title — prefer title, else name.
  const title = fieldByKey(src, "title");
  const name = get("name");
  if (title) {
    out.set("title", title);
  } else if (name) {
    out.set("title", scalarField("title", name));
    changes.push(`name → title`);
  }

  // 3. created — keep, else map `date`, else leave for validator to flag.
  const created = get("created") ?? get("date");
  if (get("created")) out.set("created", scalarField("created", get("created")!));
  else if (get("date")) { out.set("created", scalarField("created", get("date")!)); changes.push(`date → created`); }

  // 4. updated — keep, else last_updated, else fall back to created.
  if (get("updated")) out.set("updated", scalarField("updated", get("updated")!));
  else if (get("last_updated")) { out.set("updated", scalarField("updated", get("last_updated")!)); changes.push(`last_updated → updated`); }
  else if (created) { out.set("updated", scalarField("updated", created)); changes.push(`updated absent → copied created`); }

  // 5. id — deterministic from slug+created (created may be undefined → use slug alone).
  if (get("id")) out.set("id", scalarField("id", get("id")!));
  else { out.set("id", scalarField("id", mintId(slug, created ?? ""))); changes.push(`id minted`); }

  // 6. tags — keep the raw (may be inline array), else default [untagged].
  const tagsField = fieldByKey(src, "tags");
  if (tagsField) out.set("tags", tagsField);
  else { out.set("tags", scalarField("tags", "[untagged]")); changes.push(`tags absent → [untagged]`); }

  // 7. quality — keep, else backfill (heuristic) + mark inferred.
  if (get("quality")) out.set("quality", scalarField("quality", get("quality")!));
  else {
    const bodyLen = parsed.body.length;
    const q = bodyLen < 400 ? "2" : (typeVal === "blog" ? "6" : "5");
    out.set("quality", scalarField("quality", String(q)));
    out.set("quality_inferred", scalarField("quality_inferred", "true"));
    changes.push(`quality absent → ${q} (inferred)`);
  }

  // 8. confidence — preserve as-is (NOT mapped from quality; different axis).
  if (get("confidence")) out.set("confidence", scalarField("confidence", get("confidence")!));

  // 9. provenance — un-folded.
  //    source → source_name; author → source_author; post_date → source_date; source_url kept.
  let sourceConsumed = false;
  if (get("source_name")) {
    out.set("source_name", scalarField("source_name", get("source_name")!));
    // If BOTH source and source_name exist and differ, keep `source` as an extra
    // (preserved below) rather than silently dropping it (Forge finding #3).
    if (get("source") && get("source") !== get("source_name")) changes.push(`kept source (differs from source_name)`);
  } else if (get("source")) {
    out.set("source_name", scalarField("source_name", get("source")!));
    changes.push(`source → source_name`);
    sourceConsumed = true;
  }

  if (get("source_url")) out.set("source_url", scalarField("source_url", get("source_url")!));

  if (get("source_author")) out.set("source_author", scalarField("source_author", get("source_author")!));
  else if (get("author")) { out.set("source_author", scalarField("source_author", get("author")!)); changes.push(`author → source_author`); }

  if (get("source_date")) out.set("source_date", scalarField("source_date", get("source_date")!));
  else if (get("post_date")) { out.set("source_date", scalarField("source_date", get("post_date")!)); changes.push(`post_date → source_date`); }

  // source_kind — keep, else derive.
  if (get("source_kind")) out.set("source_kind", scalarField("source_kind", get("source_kind")!));
  else {
    const kind = typeVal === "blog" ? "blog" : "internal";
    out.set("source_kind", scalarField("source_kind", kind));
    changes.push(`source_kind absent → ${kind}`);
  }

  // source_session — keep unless the literal "none".
  const ss = get("source_session");
  if (ss && ss !== "none") out.set("source_session", scalarField("source_session", ss));
  else if (ss === "none") changes.push(`dropped source_session: none`);

  // source_harvest_id — preserved distinct (different fact).
  if (get("source_harvest_id")) out.set("source_harvest_id", scalarField("source_harvest_id", get("source_harvest_id")!));

  // valid_from / valid_until — preserve valid_from; drop empty valid_until (0 real uses).
  if (get("valid_from")) out.set("valid_from", scalarField("valid_from", get("valid_from")!));
  const vu = get("valid_until");
  if (vu && vu.length > 0) out.set("valid_until", scalarField("valid_until", vu));

  // 10. related — keep the raw block, then fold source_blog into it as a derived-from edge.
  const relatedField = fieldByKey(src, "related");
  let relatedRaw = relatedField ? relatedField.raw : "related: []";
  const sourceBlog = get("source_blog");
  // Empty iff a single `related:` / `related: []` / `related: [ ]` line (Forge #2).
  const relatedIsEmpty = /^related:\s*(\[\s*\])?\s*$/.test(relatedRaw.trim());
  if (sourceBlog && sourceBlog !== slug) {
    // Points at ANOTHER note → a real edge regardless of this note's type
    // ("which blog did this idea come from"). Not a dropped string (Forge #4:
    // the drop guard is self-reference, not type — a blog citing another blog
    // keeps the edge).
    const edge = `  - slug: ${sourceBlog}\n    type: derived-from`;
    if (relatedIsEmpty) {
      relatedRaw = `related:\n${edge}`;
    } else if (!relatedRaw.includes(`slug: ${sourceBlog}`)) {
      relatedRaw = `${relatedRaw}\n${edge}`;
    }
    changes.push(`source_blog:${sourceBlog} → related derived-from edge`);
  } else if (sourceBlog) {
    changes.push(`dropped source_blog:${sourceBlog} (self-index)`);
  }
  out.set("related", { key: "related", raw: relatedRaw });

  // 11. convention stamp.
  out.set("convention", scalarField("convention", SCHEMA_VERSION));

  // Preserve any unrecognized keys (no data loss) — anything not consumed above.
  const CONSUMED = new Set([
    "type", "entity_type", "title", "name", "created", "date", "updated", "last_updated",
    "id", "tags", "quality", "quality_inferred", "confidence",
    "source_name", "source_url", "source_author", "author", "source_date", "post_date",
    "source_kind", "source_session", "source_harvest_id", "source_blog",
    "valid_from", "valid_until", "related", "convention",
    "domain", // dir-redundant; intentionally dropped
  ]);
  if (has("domain")) changes.push(`dropped domain (dir-redundant)`);
  for (const f of src) {
    if (f.key === "source" && sourceConsumed) continue; // folded into source_name; else preserved
    if (!CONSUMED.has(f.key) && !out.has(f.key)) preserve.push(f);
  }

  // Emit in canonical order, then preserved extras.
  const ordered: FmField[] = [];
  for (const key of ENVELOPE_KEY_ORDER) {
    const f = out.get(key);
    if (f) ordered.push(f);
  }
  for (const f of preserve) ordered.push(f);

  return { fields: ordered, changes, alreadyCurrent: false };
}

// ── Validate against the contract ──

export interface Violation {
  key: string;
  problem: string;
}

export function validate(parsed: ParsedNote, _slug: string, dirType: CanonicalType): Violation[] {
  const v: Violation[] = [];
  // Decode a scalar for enum comparison: strip a trailing `# comment` and any
  // surrounding quotes, so `type: "idea"` and `type: idea # note` both pass
  // (Forge #6 — raw-string compares gave false positives on quoted values).
  const deq = (s?: string) => s?.replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
  const get = (k: string) => scalarValue(parsed.fields, k);
  const field = (k: string) => parsed.fields.find((f) => f.key === k);
  const has = (k: string) => parsed.fields.some((f) => f.key === k);
  // A field is empty iff it's a single line with no value (`quality:` /
  // `source_url:`); a BLOCK field with a continuation line (`tags:` or `related:`
  // in list form) is never "empty". `scalar` is undefined for BOTH an empty value
  // and a block, so the raw-newline check is what disambiguates (Forge #5, and the
  // block-tags false-positive it would otherwise cause).
  const isEmptyField = (f: FmField) => !f.raw.includes("\n") && (!f.scalar || f.scalar.trim() === "");
  const missingOrEmpty = (k: string) => {
    const f = field(k);
    return !f || isEmptyField(f);
  };

  // convention (quote/comment-tolerant)
  if (deq(get("convention")) !== SCHEMA_VERSION) v.push({ key: "convention", problem: `not ${SCHEMA_VERSION} (dialect not migrated)` });

  // required envelope keys
  for (const key of REQUIRED_KEYS) {
    const f = field(key);
    if (!f) v.push({ key, problem: "required envelope field missing" });
    else if (isEmptyField(f)) v.push({ key, problem: "required field is empty" });
  }

  // type value
  const t = deq(get("type"));
  if (t && !(CANONICAL_TYPES as readonly string[]).includes(t)) {
    v.push({ key: "type", problem: `"${t}" not a canonical type` });
  }
  if (t && (CANONICAL_TYPES as readonly string[]).includes(t) && t !== dirType) {
    // type disagrees with directory
    v.push({ key: "type", problem: `type "${t}" ≠ dir type "${dirType}"` });
  }

  // per-type required (present AND non-empty)
  const effType = ((CANONICAL_TYPES as readonly string[]).includes(t ?? "") ? t : dirType) as CanonicalType;
  // `source_kind: internal` means the note has no external origin — it IS the
  // primary artifact (a LifeOS corpus, a design decision, an own-prose capture),
  // so demanding a source_url of it asks for a URL that cannot exist. Externally
  // sourced notes still must carry their provenance. (public PR #1684, @elhoim)
  const isInternal = deq(get("source_kind")) === "internal";
  for (const key of PER_TYPE_REQUIRED[effType] ?? []) {
    if (isInternal && key.startsWith("source_")) continue;
    if (missingOrEmpty(key)) v.push({ key, problem: `required for type ${effType}` });
  }

  // title-not-name
  if (has("name") && !has("title")) v.push({ key: "title", problem: "uses `name` instead of `title`" });

  // related vocab — matches both block form (`type: X` under `- slug:`) and
  // inline `[{slug: y, type: X}]` (Forge #6 — block-only regex missed inline).
  const rel = field("related");
  if (rel) {
    for (const m of rel.raw.matchAll(/\btype:\s*([A-Za-z-]+)/g)) {
      const rt = m[1].trim();
      if (!(RELATION_VOCAB as readonly string[]).includes(rt)) {
        v.push({ key: "related", problem: `off-vocabulary relation type "${rt}"` });
      }
    }
  }

  return v;
}

// ── CLI / smoke test ──

function smokeTest(): number {
  let pass = 0, fail = 0;
  const check = (n: string, ok: boolean, d?: string) => {
    if (ok) { pass++; console.log(`  ✓ ${n}${d ? ` — ${d}` : ""}`); }
    else { fail++; console.error(`  ✗ ${n}${d ? ` — ${d}` : ""}`); }
  };

  // Body-preservation: a note whose body contains literal `---`.
  const blogNote = `---
title: 10 Essential Firefox Plugins
type: blog
tags: [blogs, exampleblog]
created: 2026-04-28
updated: 2026-04-28
author: "Jane Author"
source: "Example Blog"
source_url: https://example.com/blog/x
post_date: 2023-05-26
source_blog: example-post
related:
  - slug: some-archive-index
    type: part-of
---

# Body with a literal delimiter below

---

Section after a horizontal rule. Should be preserved byte-for-byte.
`;
  const parsed = parseNote(blogNote);
  check("parse: hadFrontmatter", parsed.hadFrontmatter);
  check("parse: body starts at closing ---", parsed.body.startsWith("---\n\n# Body"));
  check("parse: body preserves inner literal ---", parsed.body.includes("\n---\n\nSection after"));
  const roundtrip = serializeNote(parsed.fields, parsed.body);
  check("round-trip: byte-identical when unchanged", roundtrip === blogNote, `${roundtrip.length} vs ${blogNote.length}`);

  const norm = normalize(parsed, "example-post", "blog");
  const nf = (k: string) => norm.fields.find((f) => f.key === k)?.scalar;
  check("normalize: author → source_author", nf("source_author") === '"Jane Author"');
  check("normalize: source → source_name", nf("source_name") === '"Example Blog"');
  check("normalize: post_date → source_date", nf("source_date") === "2023-05-26");
  check("normalize: source_kind blog", nf("source_kind") === "blog");
  check("normalize: id minted deterministically", nf("id") === mintId("example-post", "2026-04-28"));
  check("normalize: convention kb-v3", nf("convention") === "kb-v3");
  check("normalize: source_blog==slug dropped (self-index)", !norm.changes.some((c) => c.includes("derived-from")));
  // body must survive normalize+serialize byte-for-byte
  const migrated = serializeNote(norm.fields, parsed.body);
  check("normalize: body byte-identical after migrate", migrated.endsWith(parsed.body));

  // pai-memory-v1 knowledge note
  const v1 = `---
type: knowledge
entity_type: research
name: "Shor's Algorithm"
created: 2026-06-03T23:12:18.348Z
last_updated: 2026-06-03T23:12:18.348Z
source_session: none
confidence: 0.95
related:
  - slug: grovers-algorithm
    type: contradicts
convention: pai-memory-v1
---

# Shor's Algorithm

Body.
`;
  const p2 = parseNote(v1);
  const n2 = normalize(p2, "shor-s-algorithm", "research");
  const g2 = (k: string) => n2.fields.find((f) => f.key === k)?.scalar;
  check("v1: type knowledge+research → research", g2("type") === "research");
  check("v1: name → title", g2("title") === `"Shor's Algorithm"`);
  check("v1: last_updated → updated", g2("updated") === "2026-06-03T23:12:18.348Z");
  check("v1: confidence preserved", g2("confidence") === "0.95");
  check("v1: source_session:none dropped", !n2.fields.some((f) => f.key === "source_session"));
  check("v1: tags backfilled untagged", g2("tags") === "[untagged]");
  check("v1: quality backfilled + inferred", !!g2("quality") && g2("quality_inferred") === "true");
  // validate the migrated result → should be clean except research needs source_url
  const migratedNote = serializeNote(n2.fields, p2.body);
  const reparsed = parseNote(migratedNote);
  const viols = validate(reparsed, "shor-s-algorithm", "research");
  check("v1: migrated validates (only source_url missing for research)", viols.every((x) => x.key === "source_url"), viols.map((x) => `${x.key}:${x.problem}`).join("; "));

  // idempotency: normalize a kb-v3 note → no changes
  const n3 = normalize(reparsed, "shor-s-algorithm", "research");
  check("idempotent: kb-v3 note normalizes to alreadyCurrent", n3.alreadyCurrent && n3.changes.length === 0);

  // ── Forge cross-vendor hardening (2026-07-05) — lock-in regressions ──
  // #1 non-key first line = Markdown thematic break, NOT frontmatter → malformed.
  const mal = parseNote("---\nSome quote line\n---\nAuthor\n");
  check("#1 malformed: non-key first line flagged", mal.malformed === true);
  check("#1 malformed: body offset-preserved", mal.body === "---\nAuthor\n", JSON.stringify(mal.body));
  check("#1 well-formed note not flagged", parseNote("---\ntype: idea\ntitle: X\n---\nbody\n").malformed === false);

  // #2 `related: [ ]` (spaces) folds to a clean block, not malformed YAML.
  const relN = normalize(parseNote("---\ntype: idea\ntitle: X\nsource_blog: other-note\nrelated: [ ]\n---\nb\n"), "this-note", "idea");
  const relRaw = relN.fields.find((f) => f.key === "related")!.raw;
  check("#2 related: [ ] folds cleanly", relRaw === "related:\n  - slug: other-note\n    type: derived-from", relRaw);

  // #3 both source + source_name (differ) → source preserved, not silently dropped.
  const bothN = normalize(parseNote('---\ntype: blog\ntitle: X\nsource_name: "Pub"\nsource: "Someone"\n---\nb\n'), "x", "blog");
  check("#3 differing source kept", bothN.fields.some((f) => f.key === "source"));

  // #4 source_blog on a BLOG pointing elsewhere → derived-from edge, not "self-index" drop.
  const blogCiteN = normalize(parseNote("---\ntype: blog\ntitle: X\nsource_blog: another-blog\nrelated: []\n---\nb\n"), "this-blog", "blog");
  check("#4 blog citing another blog keeps the edge", blogCiteN.changes.some((c) => c.includes("derived-from")));

  // #5 empty required scalar fails validate.
  const emptyReq = parseNote("---\nid: kb_x\ntype: idea\ntitle: X\ntags: [a]\nquality: \ncreated: 2026-01-01\nupdated: 2026-01-01\nconvention: kb-v3\n---\nb\n");
  check("#5 empty required (quality:) flagged", validate(emptyReq, "x", "idea").some((v) => v.key === "quality" && v.problem.includes("empty")));

  // #6 quoted/commented enum values pass (no false positive).
  const quoted = parseNote('---\nid: kb_x\ntype: "idea"\ntitle: X\ntags: [a]\nquality: 5\ncreated: 2026-01-01\nupdated: 2026-01-01\nconvention: "kb-v3"\n---\nb\n');
  check("#6 quoted type/convention not false-flagged", !validate(quoted, "x", "idea").some((v) => v.key === "type" || v.key === "convention"));

  console.log(`\n${pass} passed, ${fail} failed`);
  return fail === 0 ? 0 : 1;
}

if (import.meta.main) {
  const cmd = process.argv[2];
  if (cmd === "test") process.exit(smokeTest());
  if (cmd === "fields") {
    console.log(JSON.stringify({ version: SCHEMA_VERSION, types: CANONICAL_TYPES, envelope: ENVELOPE, per_type_required: PER_TYPE_REQUIRED, relations: RELATION_VOCAB }, null, 2));
    process.exit(0);
  }
  console.error("Usage: bun KnowledgeSchema.ts {test|fields}");
  process.exit(2);
}
