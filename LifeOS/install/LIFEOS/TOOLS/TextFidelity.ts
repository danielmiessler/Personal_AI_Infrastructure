#!/usr/bin/env bun
/**
 * TextFidelity.ts — "did every source word arrive in the rendered document?", defined ONCE.
 *
 * WHY IT EXISTS, AND WHY IT IS SHARED
 * A PDF text gate had been asking this question for weeks (and caught a command
 * literal silently dropped by a nested-code-span bug) while the docx path had
 * NOTHING of the kind — its only verification was looking at pages, on the very
 * day its backend was rewritten, i.e. when losing text nodes is most likely.
 * If the two pipelines held two copies of this logic they would diverge: one
 * would learn that image paths are not content and the other would not, and the
 * day one of them stays silent you cannot tell healthy from ignorant.
 * One definition, N callers.
 *
 * WHAT IT IS NOT. Deliberately NARROW: words and numbers of 4+ characters,
 * presence only. It does not see position, glyph overlap, or layout. A correct
 * text layer is NOT a correct page — pages still get looked at. This exists for
 * what the eye cannot do: check hundreds of words one by one.
 */

import { execFileSync } from "node:child_process";

/**
 * The vocabulary that MUST survive: words and numbers of at least 4 characters,
 * with markdown markers stripped and everything that by definition never lands
 * on the page excluded.
 *
 * The exclusions are correctness, not convenience — a gate that cries wolf gets
 * disarmed:
 *   · fenced blocks and frontmatter: never rendered
 *   · an image's PATH: `![caption](assets/photo.png)` renders the caption, never
 *     the path. Without this line every document with a photo declared the
 *     on-disk path segments "lost". The CAPTION stays in the vocabulary: it must
 *     reach the page, and it is exactly what the gate should watch.
 *   · a link's URL: renderers print the label and drop the address. Found on a
 *     real client document: `[Product Name](…/product-name)` declared `product`
 *     and `name` lost, because the dash strip splits the URL path into words.
 *     A BARE url outside link syntax stays watched: that one is content.
 *   · HTML comments: notes for the author, stripped by every renderer.
 */
export function sourceVocabulary(md: string): string[] {
  const cleaned = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^---[\s\S]*?^---/m, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/[#*_`>|~[\]()-]/g, " ");
  // EDGE punctuation is trimmed BEFORE the filter, not after. Earlier the filter
  // required a token made ONLY of letters and digits, so every word followed by
  // a period, comma or colon fell out of the vocabulary — in practice the last
  // word of every sentence was watched by no one. Measured on one line of prose
  // with a price in it, the gate checked 3 tokens out of 11, and among the
  // discarded ones was `5.000,00`. A gate that declares "every word and every
  // number" and then skips the numbers is worse than no gate: it certifies what
  // it never looked at. Found by the probe's negative pole, not by a broken
  // document.
  //
  // INNER punctuation stays: `5.000,00` and `dell'azienda` are one token each,
  // and splitting them would push the pieces under the 4-char floor — out of
  // the gate again.
  const trimEdges = (w: string) => w.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");
  return [...new Set(
    cleaned
      .split(/\s+/)
      .map(trimEdges)
      .filter(w => w.length >= 4 && /^[\p{L}\p{N}][\p{L}\p{N}À-ÿ.,'’\/]*[\p{L}\p{N}]$/u.test(w)),
  )];
}

/** Vocabulary words missing from the rendered text. Empty = nothing lost. */
export function lostWords(vocab: string[], renderedText: string): string[] {
  const flat = renderedText.replace(/\s+/g, " ");
  return vocab.filter(w => !flat.includes(w));
}

/**
 * Census of non-ASCII symbols: counts every character above U+007F in source and
 * rendered output, and reports the ones the render lost or mangled. `lostWords`
 * watches WORDS and stays blind to a vanished accent, an em-dash turned into
 * '?', a dropped Greek letter — the CHARACTER destruction an incomplete-font
 * renderer produces. Returns the symbols whose rendered count fell below 98% of
 * the source count.
 */
export function lostSymbols(src: string, rendered: string): Array<{ sym: string; src: number; out: number }> {
  const count = (s: string): Map<string, number> => {
    const m = new Map<string, number>();
    for (const ch of s) if (ch.codePointAt(0)! > 0x7f && !/\s/.test(ch)) m.set(ch, (m.get(ch) ?? 0) + 1);
    return m;
  };
  const inSrc = count(src);
  const inOut = count(rendered);
  const lost: Array<{ sym: string; src: number; out: number }> = [];
  for (const [sym, n] of inSrc) {
    const out = inOut.get(sym) ?? 0;
    if (out < n * 0.98) lost.push({ sym, src: n, out });
  }
  return lost;
}

/**
 * The text a .docx ACTUALLY contains, read from the OOXML rather than from
 * whoever wrote it.
 *
 * Boundaries matter, and they are the one delicate point: `</w:p>` (paragraph
 * end) and `<w:br/>` become ONE SPACE; every other tag vanishes with NO space.
 * It must be this way because bold splits a word across runs —
 * `**bo**ld` is `<w:t>bo</w:t>…<w:t>ld</w:t>` — and inserting a space between
 * runs would turn "bold" into two words: a loss invented by the verifier.
 */
export function docxText(docxPath: string): string {
  // Explicit maxBuffer: execFileSync defaults to 1 MB and a long document's
  // document.xml blows through it. OOXML costs ~6-10x the source markdown
  // because every run carries its own formatting block. Probed live: the gate
  // died with ENOBUFS on a well-built document — the WORST failure shape,
  // because it looks like a defective document.
  const xml = execFileSync("unzip", ["-p", docxPath, "word/document.xml"], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 << 20 }).toString();
  return xml
    .replace(/<\/w:p>/g, " ")
    .replace(/<w:br\b[^>]*\/?>/g, " ")
    .replace(/<w:tab\b[^>]*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

// ── selftest ────────────────────────────────────────────────────────────────
// Both poles, because a fidelity gate that never went red is an assertion in a
// gate costume: a dropped word MUST be caught, an intact render MUST pass, and
// the two link/image exclusions MUST NOT invent losses.
if (import.meta.main && process.argv.includes("--selftest")) {
  const md = "# Title\n\nA sentence with a number: 4271 and a rare word: saffron.\n\n![the caption](assets/deep/path/photo.png)\n\n[Product Name](https://example.com/product-name)\n";
  const vocab = sourceVocabulary(md);
  const fails: string[] = [];
  const expect = (label: string, cond: boolean) => { if (!cond) fails.push(label); console.log(`${cond ? "✅" : "🔴"} ${label}`); };
  expect("vocabulary keeps words, numbers, caption and label", ["sentence", "number", "4271", "saffron", "caption", "Product", "Name"].every(w => vocab.includes(w)));
  expect("image path and URL are NOT vocabulary", !vocab.some(w => w.includes("photo") || w.includes("example.com") || w.includes("assets")));
  expect("intact render passes", lostWords(vocab, "Title A sentence with a number: 4271 and a rare word: saffron. the caption Product Name").length === 0);
  expect("dropped word is caught", lostWords(vocab, "Title A sentence with a number: 4271 and a rare word: . the caption Product Name").includes("saffron"));
  expect("lost symbol is caught", lostSymbols("caffè — sì", "caffe - si").length >= 2);
  expect("intact symbols pass", lostSymbols("caffè — sì", "caffè — sì").length === 0);
  console.log(fails.length ? "SELFTEST: FAILED" : "SELFTEST: all poles hold");
  process.exit(fails.length ? 1 : 0);
}
