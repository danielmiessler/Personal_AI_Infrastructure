#!/usr/bin/env bun
/**
 * ISARender.ts — Render an ISA.md to a branded sibling ISA.html.
 *
 * Usage:
 *   bun ISARender.ts <slug-or-path>
 *   bun ISARender.ts <slug-or-path> --no-refresh
 *   bun ISARender.ts <slug-or-path> --output <path>
 *   bun ISARender.ts <slug-or-path> --stdout
 *
 * Deterministic, zero-token, offline-first. Hand-rolled ISA-aware markdown parser.
 * Reuses McKinsey-family branding via inlined template.css. Reloads matching
 * Interceptor tabs without opening new ones; refresh failure is non-fatal.
 *
 * See: ISA at MEMORY/WORK/20260512-isa-html-mirror-system/ISA.md
 */

import { readFileSync, writeFileSync, existsSync, statSync, renameSync, readdirSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { ASCENT, ASCENT_BRACKETS, PHASE_TO_ASCENT } from "./ascent";

const HOME = process.env.HOME || homedir();
const TOOLS_DIR = resolve(HOME, ".claude/LIFEOS/TOOLS");
const TEMPLATE_HTML = join(TOOLS_DIR, "ISARender/template.html");
const TEMPLATE_CSS = join(TOOLS_DIR, "ISARender/template.css");
// Brand logo: user override via LIFEOS_BRAND_LOGO_PATH env var (absolute path),
// else system default under PAI/ASSETS/, else inert (empty src).
const BRAND_LOGO_PATH_OVERRIDE = process.env.LIFEOS_BRAND_LOGO_PATH ?? "";

const BRAND_LOGO_PATH_DEFAULT = resolve(HOME, ".claude/LIFEOS/ASSETS/pai-logo.png");
const WORK_DIR = resolve(HOME, ".claude/LIFEOS/MEMORY/WORK");
const WORK_JSON = resolve(HOME, ".claude/LIFEOS/MEMORY/STATE/work.json");

// Lifecycle stages come from the one ascent table (LIFEOS/TOOLS/ascent.ts) — the same
// four brackets an ISA can declare, in the same order, under the same names the Kitty tab
// and the Pulse board use. Never define a private stage vocabulary here: a second list is
// how a mirror ends up disagreeing with the tab generated beside it.
const STAGES = ASCENT_BRACKETS;
const STAGE_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(PHASE_TO_ASCENT).map(([phase, state]) => [phase, Math.max(0, ASCENT_BRACKETS.indexOf(state))]),
);

// ─────────── BRAND LOGO LOADER ───────────
function loadBrandLogoB64(): string {
  const paths = [BRAND_LOGO_PATH_OVERRIDE, BRAND_LOGO_PATH_DEFAULT].filter(Boolean);
  for (const p of paths) {
    if (existsSync(p)) {
      try { return readFileSync(p).toString("base64"); } catch {}
    }
  }
  return "";
}

// ─────────── CLI ARG PARSING ───────────

interface Args {
  input: string;
  noRefresh: boolean;
  output: string | null;
  stdout: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { input: "", noRefresh: false, output: null, stdout: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-refresh") args.noRefresh = true;
    else if (a === "--stdout") { args.stdout = true; args.noRefresh = true; }
    else if (a === "--output" && argv[i + 1]) { args.output = argv[++i]; }
    else if (!args.input) args.input = a;
  }
  return args;
}

// ─────────── PATH RESOLUTION ───────────

function resolveISAPath(input: string): string {
  if (input.endsWith(".md") && existsSync(input)) return resolve(input);
  // Slug → look up in work.json or scan WORK_DIR
  if (existsSync(WORK_JSON)) {
    try {
      const reg = JSON.parse(readFileSync(WORK_JSON, "utf-8"));
      const session = reg.sessions?.[input];
      if (session?.isaPath && existsSync(session.isaPath)) return resolve(session.isaPath);
    } catch {}
  }
  const direct = join(WORK_DIR, input, "ISA.md");
  if (existsSync(direct)) return direct;
  // Fuzzy: directory name contains slug
  if (existsSync(WORK_DIR)) {
    for (const d of readdirSync(WORK_DIR)) {
      if (d.includes(input)) {
        const p = join(WORK_DIR, d, "ISA.md");
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error(`Could not resolve ISA from: ${input}`);
}

// ─────────── FRONTMATTER PARSER ───────────

interface Frontmatter {
  [key: string]: string;
}

function parseFrontmatter(src: string): { fm: Frontmatter; body: string; warnings: string[] } {
  const warnings: string[] = [];
  if (!src.startsWith("---\n")) {
    warnings.push("missing-frontmatter");
    return { fm: {}, body: src, warnings };
  }
  const end = src.indexOf("\n---\n", 4);
  if (end === -1) {
    warnings.push("unclosed-frontmatter");
    return { fm: {}, body: src, warnings };
  }
  const yamlBlock = src.slice(4, end);
  const body = src.slice(end + 5);
  const fm: Frontmatter = {};
  for (const raw of yamlBlock.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }
  // Minimal frontmatter: only `phase` is required for a useful render. `task` falls back
  // to the H1 title, `slug` to the directory name. Do not warn on `effort` — it is a legacy
  // field that still appears on old ISAs and means nothing now.
  for (const req of ["phase"]) {
    if (!fm[req]) warnings.push(`missing-frontmatter:${req}`);
  }
  return { fm, body, warnings };
}

// ─────────── BODY → SECTIONS ───────────

interface Section { name: string; slug: string; lines: string[]; }

function splitSections(body: string): Section[] {
  const lines = body.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (current) sections.push(current);
      const name = h[1].trim();
      current = { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ─────────── INLINE MARKDOWN ───────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderInline(s: string): string {
  let out = escapeHtml(s);
  // Code spans first (protect contents)
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic (single underscore or asterisk)
  out = out.replace(/(^|[\s(])_([^_]+)_($|[\s).,;:])/g, "$1<em>$2</em>$3");
  out = out.replace(/(^|[\s(])\*([^*]+)\*($|[\s).,;:])/g, "$1<em>$2</em>$3");
  // Links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

// ─────────── ISC LINE PARSER ───────────

interface ISCRow {
  status: "pending" | "passed" | "deferred";
  id: string;
  kind: "normal" | "anti" | "antecedent" | "tombstone";
  body: string;
}

// Claim IDs: `ISC-1` / `ISC-2.1` (spec ≤v2.14), plus the Algorithm v8 short
// forms — `C1`, `A3`, `EQ-12` (2026-07-22 claims-vocabulary fix, mirrors
// hooks/lib/isa-utils.ts). Separator is `:` or an em/en dash.
const CLAIM_ID = "(ISC-[0-9A-Za-z.-]+|[A-Z]{1,6}-[A-Z0-9][\\w-]*|[A-Z]{1,4}-?\\d+(?:\\.\\d+)*)";

function parseISCLine(line: string): ISCRow | null {
  // Match: - [ ] ISC-1: ...  - [x] C2 — ...  - [DEFERRED-VERIFY] ISC-3: ...
  // Tolerate a parenthetical or `backtick` marker between the ID and its
  // separator, e.g. `- [ ] H-FLOW (Tier 2, pending build): ...` or
  // ``- [ ] CRS-FULFILL `[DEFERRED-VERIFY]`: ...`` (H3-style claim IDs).
  const m = line.match(new RegExp(`^-\\s+\\[([ xX]|DEFERRED-VERIFY)\\]\\s+${CLAIM_ID}\\s*(?:\\([^)]*\\)\\s*|\`[^\`]*\`\\s*)?(?::|[—–-])\\s*(.*)$`));
  if (!m) return null;
  const statusTok = m[1].trim().toLowerCase();
  const status: ISCRow["status"] =
    statusTok === "x" ? "passed" :
    statusTok === "deferred-verify" ? "deferred" : "pending";
  const id = m[2];
  let body = m[3];
  let kind: ISCRow["kind"] = "normal";
  if (/^\[DROPPED/i.test(body)) kind = "tombstone";
  else if (/^Anti:/.test(body)) kind = "anti";
  else if (/^Antecedent:/.test(body)) kind = "antecedent";
  // v8 convention: `A`-prefixed short IDs are anti-claims by construction.
  if (kind === "normal" && /^A\d/.test(id)) kind = "anti";
  return { status, id, kind, body };
}

// Anti-claims in v8 ISAs often live in a dedicated `## Anti-claims` section as
// plain ID bullets without checkboxes: `- A1 — must NOT ...`. Parsed only
// inside that section so ordinary bullets elsewhere are untouched.
function parseAntiClaimLine(line: string): ISCRow | null {
  const m = line.match(new RegExp(`^-\\s+${CLAIM_ID}\\s*(?::|[—–-])\\s*(.*)$`));
  if (!m) return null;
  return { status: "pending", id: m[1], kind: "anti", body: m[2] };
}

function renderISCRow(row: ISCRow): string {
  const glyphMap: Record<string, string> = {
    pending: "○",
    passed: "●",
    deferred: "◐",
  };
  let glyph = glyphMap[row.status];
  if (row.kind === "anti") glyph = "⛔";
  else if (row.kind === "antecedent") glyph = "◆";
  else if (row.kind === "tombstone") glyph = "✕";

  const classes = ["isc", row.status];
  if (row.kind !== "normal") classes.push(row.kind);

  // Pull off the "Anti:" / "Antecedent:" prefix for display, render as labeled span
  let body = row.body;
  let prefixHtml = "";
  if (row.kind === "anti") {
    body = body.replace(/^Anti:\s*/, "");
    prefixHtml = `<span class="isc-prefix">Anti:</span>`;
  } else if (row.kind === "antecedent") {
    body = body.replace(/^Antecedent:\s*/, "");
    prefixHtml = `<span class="isc-prefix">Antecedent:</span>`;
  }
  const anchor = `<a id="${row.id}"></a>`;
  return `<li class="${classes.join(" ")}">${anchor}<span class="isc-glyph">${glyph}</span><span class="isc-id">${row.id}</span><span class="isc-body">${prefixHtml}${renderInline(body)}</span></li>`;
}

// ─────────── TABLE PARSER ───────────

interface ParsedTable { headers: string[]; rows: string[][]; }

function parseTable(lines: string[], startIdx: number): { table: ParsedTable; endIdx: number } | null {
  const headerLine = lines[startIdx];
  if (!headerLine?.trim().startsWith("|")) return null;
  const sepLine = lines[startIdx + 1];
  if (!sepLine?.trim().match(/^\|?[\s|:-]+\|?$/)) return null;
  const headers = headerLine.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
  const rows: string[][] = [];
  let i = startIdx + 2;
  for (; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln?.trim().startsWith("|")) break;
    const cells = ln.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    rows.push(cells);
  }
  return { table: { headers, rows }, endIdx: i - 1 };
}

function renderTable(t: ParsedTable): string {
  const head = t.headers.map(h => `<th>${renderInline(h)}</th>`).join("");
  const body = t.rows.map(r => `<tr>${r.map(c => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("");
  return `<table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// ─────────── GENERIC SECTION BODY RENDERER ───────────

function renderSectionBody(section: Section): string {
  const lines = section.lines;
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inCodeBlock = false;
  let codeBuf: string[] = [];
  let paragraphBuf: string[] = [];

  const flushPara = () => {
    if (paragraphBuf.length) {
      out.push(`<p>${renderInline(paragraphBuf.join(" "))}</p>`);
      paragraphBuf = [];
    }
  };
  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  // Special handling: Criteria/Claims sections group ISCs by bold subheaders
  const isCriteria = section.slug === "criteria" || section.slug === "claims" || section.slug === "isc-criteria";
  // v8 anti-claims sections carry ID bullets without checkboxes
  const isAntiSection = section.slug === "anti-claims";

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.trim().startsWith("```")) {
      flushPara(); closeLists();
      if (!inCodeBlock) { inCodeBlock = true; codeBuf = []; }
      else { inCodeBlock = false; out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`); }
      i++; continue;
    }
    if (inCodeBlock) { codeBuf.push(line); i++; continue; }

    // Blank line: paragraph break
    if (!line.trim()) { flushPara(); closeLists(); i++; continue; }

    // Table (starts with | and next line is |---|)
    if (line.trim().startsWith("|") && lines[i + 1]?.trim().match(/^\|?[\s|:-]+\|?$/)) {
      flushPara(); closeLists();
      const parsed = parseTable(lines, i);
      if (parsed) { out.push(renderTable(parsed.table)); i = parsed.endIdx + 1; continue; }
    }

    // ISC line (only meaningful in Criteria/Claims, but support anywhere).
    // In an Anti-claims section, checkbox-less ID bullets also parse.
    const isc = parseISCLine(line) ?? (isAntiSection ? parseAntiClaimLine(line) : null);
    if (isc) {
      flushPara(); closeLists();
      if (!out.length || !out[out.length - 1].startsWith("<ul class=\"isc-list\"")) {
        out.push(`<ul class="isc-list">`);
      } else if (out[out.length - 1] === "</ul>") {
        out.pop();
      }
      out.push(renderISCRow(isc));
      // If next line is also an ISC or empty, leave list open
      const parseRow = (l: string) => parseISCLine(l) ?? (isAntiSection ? parseAntiClaimLine(l) : null);
      const next = lines[i + 1];
      const nextIsIsc = next && parseRow(next);
      if (!nextIsIsc) {
        // Lookahead for blank line then another ISC group header
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        const peek = lines[j];
        if (peek && parseRow(peek)) {
          // continue list across blanks
        } else {
          out.push(`</ul>`);
        }
      }
      i++; continue;
    }

    // Bold-only line (used in Criteria as group titles, e.g. **Engine — Markdown to Branded HTML**)
    const boldGroup = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (boldGroup && isCriteria) {
      flushPara(); closeLists();
      out.push(`<div class="isc-group-title">${renderInline(boldGroup[1])}</div>`);
      i++; continue;
    }

    // Bullet (non-ISC)
    if (/^-\s+/.test(line.trim())) {
      flushPara();
      if (!inUl) { out.push("<ul>"); inUl = true; }
      const content = line.trim().replace(/^-\s+/, "");
      out.push(`<li>${renderInline(content)}</li>`);
      i++; continue;
    }
    // Numbered list
    if (/^\d+\.\s+/.test(line.trim())) {
      flushPara();
      if (!inOl) { out.push("<ol>"); inOl = true; }
      const content = line.trim().replace(/^\d+\.\s+/, "");
      out.push(`<li>${renderInline(content)}</li>`);
      i++; continue;
    }

    // Blockquote
    if (line.trim().startsWith("> ")) {
      flushPara(); closeLists();
      // Collect contiguous quote lines
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Feature-block heading (### F<n> · Name) — v2.16.0 feature blocks
    const featH = line.match(/^###\s+(F\d+)\s*[·.\-–—]?\s*(.*)$/);
    if (featH) {
      flushPara(); closeLists();
      out.push(`<h3 class="feature-title"><span class="feature-id">${escapeHtml(featH[1])}</span>${featH[2] ? " " + renderInline(featH[2]) : ""}</h3>`);
      i++; continue;
    }

    // Sub-heading (### or ####)
    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3) { flushPara(); closeLists(); out.push(`<h3>${renderInline(h3[1])}</h3>`); i++; continue; }

    // Feature "Why:" line — the feature's one-line ideal-state (v2.16.0)
    const whyLine = line.match(/^Why:\s*(.+)$/);
    if (whyLine) {
      flushPara(); closeLists();
      out.push(`<p class="feature-why"><span class="feature-why-label">Why</span>${renderInline(whyLine[1])}</p>`);
      i++; continue;
    }

    // Default: paragraph line
    closeLists();
    paragraphBuf.push(line.trim());
    i++;
  }
  flushPara(); closeLists();
  return out.join("\n");
}

// ─────────── PHASE BAR ───────────

function renderPhaseBar(currentPhase: string): string {
  const cur = (currentPhase || "marking").toLowerCase();
  const curIdx = STAGE_MAP[cur] ?? 0;
  return STAGES.map((p, i) => {
    const classes = ["phase-slot"];
    if (i === curIdx) classes.push("active");
    else if (i < curIdx) classes.push("passed");
    return `<div class="${classes.join(" ")}"><div class="dot"></div><div class="label">${ASCENT[p].icon} ${ASCENT[p].label}</div></div>`;
  }).join("");
}

// ─────────── HERO BADGES ───────────
// Tier badge removed 2026-07-23 — effort tiers were retired 2026-07-11.

function renderHeroBadges(fm: Frontmatter): string {
  const badges: string[] = [];
  if (fm.phase) {
    const state = PHASE_TO_ASCENT[fm.phase.toLowerCase()] ?? "marking";
    const stageClass = state === "cairn" ? "complete" : state;
    badges.push(`<span class="badge phase ${stageClass}"><span class="label">Phase</span> ${ASCENT[state].icon} ${ASCENT[state].label.toUpperCase()}</span>`);
  }
  if (fm.iteration && parseInt(fm.iteration, 10) > 1) {
    badges.push(`<span class="badge phase"><span class="label">Iteration</span> ×${escapeHtml(fm.iteration)}</span>`);
  }
  return badges.join(" ");
}

// ─────────── BRAND TAG (top-right of the brand bar) ───────────
// Formerly the effort-tier display; now a claims summary.

function renderBrandTag(fm: Frontmatter, body: string): string {
  const m = (fm.progress || "").match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return `${m[1]}/${m[2]} claims closed`;
  const total = countISCs(body);
  if (total > 0) {
    let closed = 0;
    for (const line of body.split("\n")) {
      const row = parseISCLine(line);
      if (row?.status === "passed") closed++;
    }
    return `${closed}/${total} claims closed`;
  }
  return "Ideal State Artifact";
}

// ─────────── PROGRESS RAIL ───────────
function renderProgressRail(fm: Frontmatter): string {
  if (!fm.progress) return "";
  const m = fm.progress.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return "";
  const done = parseInt(m[1], 10);
  const total = parseInt(m[2], 10);
  if (!total) return "";
  const pct = Math.round((done / total) * 100);
  return `<div class="progress-rail">
    <span class="text">PROGRESS</span>
    <div class="rail"><div class="fill" style="width:${pct}%"></div></div>
    <span class="text"><span class="num">${done}</span> / ${total} <span style="opacity:.6">·</span> ${pct}%</span>
  </div>`;
}

// ─────────── TABLE OF CONTENTS ───────────
function renderTOC(sections: Section[]): string {
  return sections.map((s, i) => {
    const num = String(i + 1).padStart(2, "0");
    return `<li><a href="#section-${s.slug}"><span class="toc-num">${num}</span>${escapeHtml(s.name)}</a></li>`;
  }).join("");
}

// ─────────── ISC COUNTS STRIP ───────────
function renderISCCounts(body: string): string {
  const counts = { pending: 0, passed: 0, deferred: 0, anti: 0, antecedent: 0 };
  for (const line of body.split("\n")) {
    const row = parseISCLine(line);
    if (!row) continue;
    if (row.kind === "anti") counts.anti++;
    else if (row.kind === "antecedent") counts.antecedent++;
    else if (row.status === "passed") counts.passed++;
    else if (row.status === "deferred") counts.deferred++;
    else counts.pending++;
  }
  const items: string[] = [];
  if (counts.passed)     items.push(`<span class="isc-count passed"><span class="dot"></span><span class="n">${counts.passed}</span><span class="lbl">passed</span></span>`);
  if (counts.pending)    items.push(`<span class="isc-count pending"><span class="dot"></span><span class="n">${counts.pending}</span><span class="lbl">pending</span></span>`);
  if (counts.deferred)   items.push(`<span class="isc-count deferred"><span class="dot"></span><span class="n">${counts.deferred}</span><span class="lbl">deferred</span></span>`);
  if (counts.anti)       items.push(`<span class="isc-count anti"><span class="dot"></span><span class="n">${counts.anti}</span><span class="lbl">anti</span></span>`);
  if (counts.antecedent) items.push(`<span class="isc-count antecedent"><span class="dot"></span><span class="n">${counts.antecedent}</span><span class="lbl">antecedent</span></span>`);
  if (!items.length) return "";
  return `<div class="isc-counts">${items.join("")}</div>`;
}

// ─────────── HERO CALLOUT ───────────

function renderHeroCallout(fm: Frontmatter): string {
  if (!fm.principal_stated_goal) return "";
  return `<aside class="hero-callout">
    <div class="hero-callout-label">Principal-stated goal</div>
    <div class="hero-callout-text">${escapeHtml(fm.principal_stated_goal)}</div>
  </aside>`;
}

// ─────────── WARNINGS ───────────

function renderWarnings(warnings: string[]): string {
  if (!warnings.length) return "";
  const items = warnings.map(w => `<li>${escapeHtml(w)}</li>`).join("");
  return `<div style="padding:0 56px;">
    <div class="warning-callout">
      <div class="label">Render warnings</div>
      <ul>${items}</ul>
    </div>
  </div>`;
}

// ─────────── INTERCEPTOR REFRESH ───────────

async function refreshInterceptorTabs(htmlPath: string): Promise<{ refreshed: number; warning?: string }> {
  const fileUrl = `file://${htmlPath}`;
  try {
    const tabsOut = await runCmd("interceptor", ["tabs", "--json"], 5000);
    if (!tabsOut.ok) return { refreshed: 0, warning: `interceptor tabs failed: ${tabsOut.stderr.slice(0, 100)}` };
    let tabs: any[] = [];
    try {
      const parsed = JSON.parse(tabsOut.stdout);
      tabs = Array.isArray(parsed) ? parsed : (parsed.data ?? parsed.tabs ?? parsed.result ?? []);
    } catch {
      return { refreshed: 0, warning: "interceptor tabs returned non-JSON" };
    }
    const matches = tabs.filter(t => t.url && (t.url === fileUrl || t.url.endsWith(htmlPath) || t.url.includes(htmlPath)));
    if (matches.length === 0) return { refreshed: 0 };

    // Strategy: keystroke-based reload (Meta+r on macOS) is the most reliable
    // primitive — `interceptor tab switch` and `interceptor navigate` against
    // file:// URLs are flaky when the extension service worker is asleep.
    // Sending a keypress to the active tab works as long as the matching tab
    // is foregrounded (which it typically is when {{PRINCIPAL_NAME}} is reading the ISA).
    const reloadKey = process.platform === "darwin" ? "Meta+r" : "Control+r";
    let refreshed = 0;
    const activeMatch = matches.find(t => t.active);
    if (activeMatch) {
      const rl = await runCmd("interceptor", ["keys", reloadKey], 1500);
      if (rl.ok) refreshed++;
    }
    for (const tab of matches) {
      if (tab === activeMatch) continue;
      const tabId = tab.id ?? tab.tabId;
      if (tabId == null) continue;
      const sw = await runCmd("interceptor", ["tab", "switch", String(tabId)], 1500);
      if (!sw.ok) continue;
      const rl = await runCmd("interceptor", ["keys", reloadKey], 1500);
      if (rl.ok) refreshed++;
    }
    return { refreshed };
  } catch (e: any) {
    return { refreshed: 0, warning: `interceptor unavailable: ${e?.message ?? "unknown"}` };
  }
}

function runCmd(cmd: string, args: string[], timeoutMs: number): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; proc.kill(); resolve({ ok: false, stdout, stderr: stderr + " [timeout]" }); } }, timeoutMs);
    proc.stdout.on("data", (d) => stdout += d.toString());
    proc.stderr.on("data", (d) => stderr += d.toString());
    proc.on("close", (code) => { if (!done) { done = true; clearTimeout(timer); resolve({ ok: code === 0, stdout, stderr }); } });
    proc.on("error", (e) => { if (!done) { done = true; clearTimeout(timer); resolve({ ok: false, stdout, stderr: e.message }); } });
  });
}

// ─────────── MAIN ───────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error("Usage: bun ISARender.ts <slug-or-path> [--no-refresh] [--output <path>] [--stdout]");
    process.exit(1);
  }
  const isaPath = resolveISAPath(args.input);
  const isaDir = dirname(isaPath);
  const outPath = args.output ? resolve(args.output) : join(isaDir, "ISA.html");

  // mtime-equality skip
  if (!args.stdout && !args.output && existsSync(outPath)) {
    const isaMtime = statSync(isaPath).mtimeMs;
    const htmlMtime = statSync(outPath).mtimeMs;
    if (htmlMtime >= isaMtime) {
      // Already fresh — just refresh tab and exit
      if (!args.noRefresh) {
        const r = await refreshInterceptorTabs(outPath);
        if (r.refreshed > 0) console.log(JSON.stringify({ status: "fresh", refreshed: r.refreshed, path: outPath }));
        else console.log(JSON.stringify({ status: "fresh", refreshed: 0, path: outPath, ...(r.warning ? { warning: r.warning } : {}) }));
      } else {
        console.log(JSON.stringify({ status: "fresh", path: outPath }));
      }
      return;
    }
  }

  const src = readFileSync(isaPath, "utf-8");
  const { fm, body, warnings } = parseFrontmatter(src);
  const sections = splitSections(body);

  // Render sections — section eyebrow + h2 with anchor-link + body. Criteria
  // gets a counts strip injected at the top.
  const sectionHtml = sections.map((s, i) => {
    const inner = renderSectionBody(s);
    const num = String(i + 1).padStart(2, "0");
    const eyebrow = `  <div class="section-eyebrow"><span class="num">${num}</span>${escapeHtml(s.name)}</div>`;
    const countsStrip = (s.slug === "criteria" || s.slug === "claims" || s.slug === "features") ? renderISCCounts(body) : "";
    return `${eyebrow}
  <section class="section section-${s.slug}" id="section-${s.slug}">
    <h2>${escapeHtml(s.name)} <a class="anchor-link" href="#section-${s.slug}" aria-label="link to section">#</a></h2>
${countsStrip}
${inner}
  </section>`;
  }).join("\n\n");

  // Load template
  const tplHtml = readFileSync(TEMPLATE_HTML, "utf-8");
  const css = readFileSync(TEMPLATE_CSS, "utf-8");

  const renderedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  // Minimal-frontmatter fallbacks: title from `task:`, `title:`, or the H1.
  const h1 = body.match(/^#\s+(?:ISA\s*[—–:-]\s*)?(.+?)\s*$/m)?.[1];
  const taskDisplay = fm.task || fm.title || h1 || "(untitled ISA)";
  const html = tplHtml
    .replaceAll("{{TITLE}}", escapeHtml(taskDisplay))
    .replaceAll("{{CSS}}", css)
    .replaceAll("{{BRAND_LOGO_B64}}", loadBrandLogoB64())
    .replaceAll("{{TASK}}", renderInline(taskDisplay))
    .replaceAll("{{SLUG}}", escapeHtml(fm.slug || basename(isaDir)))
    .replaceAll("{{UPDATED}}", escapeHtml(fm.updated || "—"))
    .replaceAll("{{BRAND_TAG}}", escapeHtml(renderBrandTag(fm, body)))
    .replaceAll("{{HERO_BADGES}}", renderHeroBadges(fm))
    .replaceAll("{{HERO_CALLOUT}}", renderHeroCallout(fm))
    .replaceAll("{{PROGRESS_RAIL}}", renderProgressRail(fm))
    .replaceAll("{{PHASE_BAR}}", renderPhaseBar(fm.phase || "observe"))
    .replaceAll("{{TOC}}", renderTOC(sections))
    .replaceAll("{{WARNINGS}}", renderWarnings(warnings))
    .replaceAll("{{SECTIONS}}", sectionHtml)
    .replaceAll("{{FOOTER_LEFT}}", escapeHtml(isaPath))
    .replaceAll("{{RENDERED_AT}}", escapeHtml(renderedAt));

  if (args.stdout) { process.stdout.write(html); return; }

  // Atomic write
  const tmpPath = outPath + ".tmp";
  writeFileSync(tmpPath, html, "utf-8");
  renameSync(tmpPath, outPath);

  let refreshInfo: { refreshed: number; warning?: string } = { refreshed: 0 };
  if (!args.noRefresh) refreshInfo = await refreshInterceptorTabs(outPath);

  console.log(JSON.stringify({
    status: "rendered",
    path: outPath,
    bytes: html.length,
    isc_count: countISCs(body),
    warnings,
    refreshed: refreshInfo.refreshed,
    ...(refreshInfo.warning ? { refresh_warning: refreshInfo.warning } : {}),
  }, null, 2));
}

function countISCs(body: string): number {
  let n = 0;
  for (const line of body.split("\n")) if (parseISCLine(line)) n++;
  return n;
}

main().catch(e => { console.error("ISARender error:", e?.stack ?? e?.message ?? e); process.exit(1); });
