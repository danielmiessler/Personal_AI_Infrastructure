#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded (LifeOS#1404).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * WatermarkScan.ts — scan text for KEYLESS-detectable watermark & steganography signatures.
 *
 * What this CAN find (deterministic, no key, no model): character-level covert
 * channels that leave literal artifacts in the bytes — zero-width chars,
 * Unicode variation-selector / Tags-block steganography, bidi controls,
 * homoglyph/mixed-script substitution, and anomalous whitespace. Plus weak
 * statistical tells (n-gram repetition) reported as heuristics, never verdicts.
 *
 * What this CANNOT find, by mathematical design (stated in the report, not hidden):
 * sampling-time statistical watermarks — Kirchenbauer green-list (arXiv:2301.10226),
 * Aaronson/Gumbel distortion-free (arXiv:2307.15593), Google SynthID-Text
 * (Nature s41586-024-08025-4), and Anthropic's announced in-text watermark
 * (support.claude.com/en/articles/16266773, sampling-pipeline per an informal
 * Anthropic-engineer statement). All are key-gated for single-text detection;
 * the output is provably indistinguishable from unwatermarked text without the
 * secret key/seed. No file-scanning tool can read them. See --explain.
 *
 * Usage:
 *   bun WatermarkScan.ts --file <path>
 *   bun WatermarkScan.ts --text "..."
 *   echo "..." | bun WatermarkScan.ts
 *   bun WatermarkScan.ts --file <path> --json
 *   bun WatermarkScan.ts --explain      # print the detectability model and exit
 */

import { readFileSync } from "node:fs";

// ── Signature catalog ──────────────────────────────────────────────────────
// Each entry: a class of keyless-detectable covert channel, its codepoints,
// and why it matters. Codepoints are matched exactly; ranges expanded lazily.

type Severity = "high" | "medium" | "low";
interface Hit { cp: number; name: string; index: number; }
interface ClassResult {
  key: string;
  label: string;
  severity: Severity;
  hits: Hit[];
  note: string;
}

const NAMED: Record<number, string> = {
  0x200b: "ZERO WIDTH SPACE",
  0x200c: "ZERO WIDTH NON-JOINER",
  0x200d: "ZERO WIDTH JOINER",
  0x2060: "WORD JOINER",
  0xfeff: "ZERO WIDTH NO-BREAK SPACE / BOM",
  0x00ad: "SOFT HYPHEN",
  0x180e: "MONGOLIAN VOWEL SEPARATOR",
  0x061c: "ARABIC LETTER MARK",
  0x00a0: "NO-BREAK SPACE",
  0x2009: "THIN SPACE",
  0x200a: "HAIR SPACE",
  0x202f: "NARROW NO-BREAK SPACE",
  0x205f: "MEDIUM MATHEMATICAL SPACE",
  0x3000: "IDEOGRAPHIC SPACE",
  0x2007: "FIGURE SPACE",
  0x2028: "LINE SEPARATOR",
  0x2029: "PARAGRAPH SEPARATOR",
  0x202a: "LEFT-TO-RIGHT EMBEDDING",
  0x202b: "RIGHT-TO-LEFT EMBEDDING",
  0x202c: "POP DIRECTIONAL FORMATTING",
  0x202d: "LEFT-TO-RIGHT OVERRIDE",
  0x202e: "RIGHT-TO-LEFT OVERRIDE",
  0x2066: "LEFT-TO-RIGHT ISOLATE",
  0x2067: "RIGHT-TO-LEFT ISOLATE",
  0x2068: "FIRST STRONG ISOLATE",
  0x2069: "POP DIRECTIONAL ISOLATE",
};

// Latin letters and the confusable codepoints most used for homoglyph swaps
// (Cyrillic + Greek lookalikes). Value = the Latin letter it imitates.
const CONFUSABLES: Record<number, string> = {
  0x0430: "a", 0x0435: "e", 0x043e: "o", 0x0440: "p", 0x0441: "c", 0x0445: "x",
  0x0443: "y", 0x0456: "i", 0x0458: "j", 0x0405: "S", 0x0410: "A", 0x0412: "B",
  0x0415: "E", 0x041a: "K", 0x041c: "M", 0x041d: "H", 0x041e: "O", 0x0420: "P",
  0x0421: "C", 0x0422: "T", 0x0425: "X", 0x0391: "A", 0x0392: "B", 0x0395: "E",
  0x0396: "Z", 0x0397: "H", 0x0399: "I", 0x039a: "K", 0x039c: "M", 0x039d: "N",
  0x039f: "O", 0x03a1: "P", 0x03a4: "T", 0x03a5: "Y", 0x03a7: "X", 0x03bf: "o",
  0x03b1: "a", 0x03b5: "e", 0x0501: "d",
};

function cpName(cp: number): string {
  return NAMED[cp] ?? `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

function scan(text: string): ClassResult[] {
  const invisible: Hit[] = [];
  const varsel: Hit[] = [];
  const tags: Hit[] = [];
  const bidi: Hit[] = [];
  const whitespace: Hit[] = [];
  const homoglyph: Hit[] = [];

  const BIDI = new Set([0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]);
  const INVIS = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad, 0x180e, 0x061c]);
  const ODD_WS = new Set([0x00a0, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000, 0x2007, 0x2028, 0x2029]);

  let i = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (INVIS.has(cp)) invisible.push({ cp, name: cpName(cp), index: i });
    else if (BIDI.has(cp)) bidi.push({ cp, name: cpName(cp), index: i });
    else if (ODD_WS.has(cp)) whitespace.push({ cp, name: cpName(cp), index: i });
    else if ((cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef))
      varsel.push({ cp, name: cpName(cp), index: i });
    else if (cp >= 0xe0000 && cp <= 0xe007f) tags.push({ cp, name: cpName(cp), index: i });
    else if (CONFUSABLES[cp]) homoglyph.push({ cp, name: `${cpName(cp)} (imitates '${CONFUSABLES[cp]}')`, index: i });
    i += ch.length;
  }

  return [
    { key: "invisible", label: "Zero-width / invisible characters", severity: "high", hits: invisible,
      note: "Zero-width chars carry no glyph; a classic covert channel for embedding a payload or ID. Rare in legitimate prose." },
    { key: "variation_selectors", label: "Variation-selector steganography", severity: "high", hits: varsel,
      note: "VS15/16 and the supplementary VS block ride invisibly after a base char — a documented channel for hiding data in emoji/text." },
    { key: "unicode_tags", label: "Unicode Tags block (deprecated covert channel)", severity: "high", hits: tags,
      note: "U+E0000–E007F 'tag' chars are invisible and near-universally a deliberate hidden channel — almost never legitimate." },
    { key: "bidi_controls", label: "Bidirectional control overrides", severity: "medium", hits: bidi,
      note: "Bidi overrides can reorder rendered text (Trojan-Source style) and act as an invisible marker." },
    { key: "homoglyphs", label: "Homoglyph / mixed-script substitution", severity: "medium", hits: homoglyph,
      note: "Cyrillic/Greek lookalikes swapped for Latin letters encode a signal that survives copy-paste but is invisible to a reader." },
    { key: "whitespace", label: "Anomalous whitespace", severity: "low", hits: whitespace,
      note: "Non-standard spaces (NBSP, thin/hair, ideographic) can encode bits; also common benign artifacts, so weight lightly." },
  ];
}

// ── Weak statistical tells (heuristic, never a verdict) ─────────────────────
function repetitionScore(text: string): { trigramRepeatRatio: number; note: string } {
  const words = text.toLowerCase().match(/\b[\p{L}']+\b/gu) ?? [];
  if (words.length < 30) return { trigramRepeatRatio: 0, note: "sample too short for a meaningful repetition read" };
  const seen = new Map<string, number>();
  let total = 0;
  for (let i = 0; i + 2 < words.length; i++) {
    const g = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    seen.set(g, (seen.get(g) ?? 0) + 1);
    total++;
  }
  let repeats = 0;
  for (const c of seen.values()) if (c > 1) repeats += c - 1;
  const ratio = total ? repeats / total : 0;
  return {
    trigramRepeatRatio: Number(ratio.toFixed(4)),
    note: "elevated trigram repetition is a weak AI-text tell, not a watermark; low-entropy human writing scores high too",
  };
}

const EXPLAIN = `
WatermarkScan — what it can and cannot detect
=============================================

DETECTABLE (this tool finds them, no key required):
  These are CHARACTER-LEVEL covert channels — they add literal codepoints to the
  bytes, so a scanner sees them directly.
  • Zero-width / invisible characters (U+200B..U+200D, U+FEFF, U+00AD, ...)
  • Variation-selector steganography (U+FE00..FE0F, U+E0100..E01EF)
  • Unicode Tags-block hidden channel (U+E0000..E007F)
  • Bidirectional control overrides (Trojan-Source class)
  • Homoglyph / mixed-script substitution (Cyrillic/Greek imitating Latin)
  • Anomalous whitespace (NBSP, thin/hair/ideographic spaces)

NOT DETECTABLE from text alone, BY DESIGN (this tool says so and stops):
  These are SAMPLING-TIME STATISTICAL watermarks — they bias token choice using a
  SECRET KEY and add no visible or invisible characters. Without the key the
  output is provably indistinguishable from ordinary text.
  • Kirchenbauer green-list/red-list  — arXiv:2301.10226 (z-test needs the hash key)
  • Aaronson / Gumbel distortion-free — arXiv:2307.15593 (marginal distribution unchanged)
  • Google SynthID-Text             — Nature s41586-024-08025-4 (code open, detection key-gated)
  • Anthropic's in-text watermark    — support.claude.com/en/articles/16266773
        (mechanism undisclosed; an informal Anthropic-engineer statement describes a
         sampling-pipeline scheme referencing SynthID. A detection API is "coming" from
         Anthropic; until it ships, nothing detects this from text — with or without a key.)

  The ONE real keyless watermark-PRESENCE test (Gloaguen et al., ICLR 2025,
  arXiv:2405.20777) needs black-box QUERY access to the model, not a static file,
  so it is out of scope for a text scanner. Their 2024 run found no strong
  watermark evidence in GPT-4, Claude 3, or Gemini 1.0 Pro.

Bottom line: a green result here means "no character-level covert channel found."
It does NOT mean the text is unwatermarked or human-written.
`;

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--explain")) { console.log(EXPLAIN); return; }
  const wantJson = args.includes("--json");

  let text = "";
  const fileIdx = args.indexOf("--file");
  const textIdx = args.indexOf("--text");
  if (fileIdx !== -1 && args[fileIdx + 1]) text = readFileSync(args[fileIdx + 1], "utf-8");
  else if (textIdx !== -1 && args[textIdx + 1]) text = args[textIdx + 1];
  else if (!process.stdin.isTTY) text = readFileSync(0, "utf-8");
  else {
    console.error("Usage: bun WatermarkScan.ts --file <path> | --text \"...\" | (stdin)   [--json] [--explain]");
    process.exit(2);
  }

  const classes = scan(text);
  const repetition = repetitionScore(text);
  const flaggedClasses = classes.filter(c => c.hits.length > 0);
  const highSeverityHit = flaggedClasses.some(c => c.severity === "high");

  if (wantJson) {
    console.log(JSON.stringify({
      chars: [...text].length,
      signatures_found: flaggedClasses.length,
      high_severity: highSeverityHit,
      classes: classes.map(c => ({
        key: c.key, label: c.label, severity: c.severity, count: c.hits.length,
        sample: c.hits.slice(0, 8).map(h => ({ codepoint: `U+${h.cp.toString(16).toUpperCase().padStart(4, "0")}`, name: h.name, index: h.index })),
        note: c.note,
      })),
      heuristics: { trigram_repeat_ratio: repetition.trigramRepeatRatio, note: repetition.note },
      undetectable_by_design: "Sampling-time statistical watermarks (Kirchenbauer, Gumbel/Aaronson, SynthID, Anthropic's announced mark) cannot be read from text without the secret key. Run --explain.",
    }, null, 2));
    return;
  }

  console.log(`\nWatermarkScan — ${[...text].length} chars\n${"=".repeat(48)}`);
  if (flaggedClasses.length === 0) {
    console.log("No character-level covert-channel signatures found.");
  } else {
    for (const c of flaggedClasses) {
      const tag = c.severity === "high" ? "⚑ HIGH" : c.severity === "medium" ? "• MED " : "· LOW ";
      console.log(`\n${tag}  ${c.label} — ${c.hits.length} hit(s)`);
      console.log(`        ${c.note}`);
      for (const h of c.hits.slice(0, 6)) console.log(`        @${h.index}  ${h.name}`);
      if (c.hits.length > 6) console.log(`        …+${c.hits.length - 6} more`);
    }
  }
  console.log(`\nHeuristic — trigram repeat ratio: ${repetition.trigramRepeatRatio}  (${repetition.note})`);
  console.log(`\n${"-".repeat(48)}`);
  console.log("Cannot detect from text alone: sampling-time statistical watermarks");
  console.log("(Kirchenbauer, Gumbel/Aaronson, SynthID, Anthropic's announced mark).");
  console.log("Key-gated by design. A clean scan does NOT mean unwatermarked. Run --explain.\n");
}

main();
