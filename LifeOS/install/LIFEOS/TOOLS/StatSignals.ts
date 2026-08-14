#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded (LifeOS#1404).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * StatSignals.ts — deterministic, keyless statistical AI-text signals.
 *
 * Implements the "real, measurable (but imperfect)" and "weak/folklore" keyless
 * signals from the 2026-08-12 watermarking research (survey grounding:
 * arXiv:2310.15264). Every signal is a FEATURE with an honesty tier, never a
 * verdict: the same research's core finding is that no keyless statistic is a
 * reliable per-document AI detector, and paraphrase degrades all of them.
 *
 * Signals (tier in parentheses):
 *   unigram/bigram Shannon entropy + type-token ratio  (real-but-imperfect)
 *   trigram repetition ratio                           (real-but-imperfect)
 *   burstiness — sentence-length coefficient of var.   (weak/folklore alone)
 *   paragraph-length uniformity                        (weak/folklore alone)
 *   function-word ratio                                (weak/folklore alone)
 *
 * NOT implemented, with reasons (see --explain):
 *   DetectGPT (arXiv:2301.11305), Binoculars (arXiv:2401.12070) — need
 *   reference-LM logprobs; Gloaguen et al. (arXiv:2405.20777) — needs
 *   black-box query access to the generating model, not a static text.
 *
 * Usage:
 *   bun StatSignals.ts --file <path> [--file <path> ...]
 *   bun StatSignals.ts --text "..."
 *   echo "..." | bun StatSignals.ts
 *   [--json] [--explain]
 */

import { readFileSync } from "node:fs";

type Tier = "real-but-imperfect" | "weak-alone";
interface Signal {
  key: string;
  label: string;
  value: number;
  tier: Tier;
  note: string;
}

// Top English function words — stable, genre-light stylometry basis.
const FUNCTION_WORDS = new Set([
  "the", "of", "and", "a", "to", "in", "is", "it", "that", "for", "on", "with",
  "as", "was", "at", "by", "an", "be", "this", "which", "or", "from", "but",
  "not", "are", "were", "his", "her", "they", "them", "we", "you", "i", "he",
  "she", "its", "their", "our", "your", "my", "me", "him", "us", "who", "whom",
  "what", "when", "where", "how", "why", "all", "any", "both", "each", "few",
  "more", "most", "some", "such", "no", "nor", "only", "own", "same", "so",
  "than", "too", "very", "can", "will", "just", "should", "would", "could",
  "may", "might", "must", "shall", "do", "does", "did", "has", "have", "had",
  "if", "then", "else", "there", "here", "up", "down", "out", "off", "over",
  "under", "again", "further", "once", "about", "into", "through", "during",
  "before", "after", "above", "below", "between", "while", "because",
]);

function words(text: string): string[] {
  return text.toLowerCase().match(/\b[\p{L}']+\b/gu) ?? [];
}

function shannonEntropy(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  let h = 0;
  for (const c of freq.values()) {
    const p = c / tokens.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(" "));
  return out;
}

function repeatRatio(grams: string[]): number {
  if (grams.length === 0) return 0;
  const seen = new Map<string, number>();
  for (const g of grams) seen.set(g, (seen.get(g) ?? 0) + 1);
  let repeats = 0;
  for (const c of seen.values()) if (c > 1) repeats += c - 1;
  return repeats / grams.length;
}

function coefficientOfVariation(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean === 0) return 0;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  return sd / mean;
}

function sentenceLengths(text: string): number[] {
  return (text.split(/(?<=[.!?])\s+/).map(s => words(s).length)).filter(n => n > 0);
}

function paragraphLengths(text: string): number[] {
  let paras = text.split(/\n\s*\n/).map(p => words(p).length).filter(n => n > 0);
  // Prose separated by single newlines (no blank lines) reads as one giant
  // paragraph under the blank-line split; fall back to line-level split.
  if (paras.length < 2) paras = text.split(/\n+/).map(p => words(p).length).filter(n => n > 0);
  return paras;
}

const MIN_WORDS = 100;

function analyze(text: string): { signals: Signal[]; wordCount: number; short: boolean } {
  const toks = words(text);
  const sents = sentenceLengths(text);
  const paras = paragraphLengths(text);
  const fnCount = toks.filter(t => FUNCTION_WORDS.has(t)).length;
  const uniq = new Set(toks).size;

  const r = (x: number) => Number(x.toFixed(4));
  const signals: Signal[] = [
    { key: "unigram_entropy", label: "Unigram Shannon entropy (bits/token)", value: r(shannonEntropy(toks)),
      tier: "real-but-imperfect",
      note: "AI text tends toward lower-entropy token distributions; length-sensitive, compare like with like." },
    { key: "bigram_entropy", label: "Bigram Shannon entropy (bits/bigram)", value: r(shannonEntropy(ngrams(toks, 2))),
      tier: "real-but-imperfect",
      note: "Low bigram entropy = more formulaic local structure; useful as a feature, weak alone." },
    { key: "type_token_ratio", label: "Type-token ratio (vocabulary diversity)", value: r(toks.length ? uniq / toks.length : 0),
      tier: "real-but-imperfect",
      note: "Falls with length for everyone; only comparable between samples of similar size." },
    { key: "trigram_repeat_ratio", label: "Trigram repetition ratio", value: r(repeatRatio(ngrams(toks, 3))),
      tier: "real-but-imperfect",
      note: "Elevated repetition is a measurable machine tell; low-entropy human writing scores high too." },
    { key: "burstiness", label: "Burstiness (sentence-length coefficient of variation)", value: r(coefficientOfVariation(sents)),
      tier: "weak-alone",
      note: "Low CV = uniform rhythm, the GPTZero-style signal. Formal or non-native human prose also scores low; folklore tier as a standalone." },
    { key: "paragraph_uniformity", label: "Paragraph-length coefficient of variation", value: r(coefficientOfVariation(paras)),
      tier: "weak-alone",
      note: "Uniform paragraph lengths are a structural AI tell word lists cannot see; genre-dependent." },
    { key: "function_word_ratio", label: "Function-word ratio", value: r(toks.length ? fnCount / toks.length : 0),
      tier: "weak-alone",
      note: "Stylometric feature; author- and genre-dependent, corpus-level signal only." },
  ];
  return { signals, wordCount: toks.length, short: toks.length < MIN_WORDS };
}

const EXPLAIN = `
StatSignals — keyless statistical AI-text signals, and what they are NOT
========================================================================

These are FEATURES, never verdicts. Survey grounding (arXiv:2310.15264): as
models scale, the human/AI distributional gap narrows and paraphrase attacks
degrade ALL keyless statistical detectors. Two honesty tiers:

  real-but-imperfect — measurable, genuinely correlated with machine text:
    n-gram entropy, type-token ratio, repetition structure.
  weak-alone — real quantities, unreliable standalone (folklore tier):
    burstiness, paragraph uniformity, function-word stylometry. Formal,
    simple, or non-native human writing false-positives; sampled modern
    models false-negative.

Key-free techniques this tool does NOT implement, and why:
  • DetectGPT (arXiv:2301.11305) — probability-curvature scoring; needs a
    reference language model's logprobs, not available in a static scanner.
  • Binoculars (arXiv:2401.12070) — perplexity/cross-perplexity ratio between
    two models; strongest zero-shot detector, same reference-LM requirement.
    For an empirical model-based score, use the skill's Pangram Score workflow.
  • Gloaguen et al. watermark-presence fingerprinting (arXiv:2405.20777) —
    needs black-box QUERY access to the generating model; does not port to
    file scanning.
  • Unigram green-list recovery (arXiv:2306.17439) — statistically possible
    only over MANY generations known to come from one model, never from the
    documents in front of a scanner.

Watermark payloads (Kirchenbauer, Aaronson/Gumbel, SynthID, Anthropic's mark)
remain key-gated and unreadable from text — WatermarkScan.ts --explain has the
full impossibility model. Nothing here says "AI" or "human"; it reports the
distributional shape and its reliability tier, and interpretation stays with
the caller.
`;

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--explain")) { console.log(EXPLAIN); return; }
  const wantJson = args.includes("--json");

  const inputs: { name: string; text: string }[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) inputs.push({ name: args[i + 1], text: readFileSync(args[i + 1], "utf-8") });
    if (args[i] === "--text" && args[i + 1]) inputs.push({ name: "(text)", text: args[i + 1] });
  }
  if (inputs.length === 0 && !process.stdin.isTTY) inputs.push({ name: "(stdin)", text: readFileSync(0, "utf-8") });
  if (inputs.length === 0) {
    console.error('Usage: bun StatSignals.ts --file <path> [--file ...] | --text "..." | (stdin)   [--json] [--explain]');
    process.exit(2);
  }

  const results = inputs.map(inp => ({ name: inp.name, ...analyze(inp.text) }));

  if (wantJson) {
    console.log(JSON.stringify({
      documents: results.map(res => ({
        name: res.name,
        words: res.wordCount,
        short_sample: res.short,
        signals: res.signals.map(s => ({ key: s.key, value: s.value, tier: s.tier, note: s.note })),
      })),
      caveat: "Features, not verdicts. No keyless statistic reliably detects AI text per-document (arXiv:2310.15264); paraphrase degrades all of them. Run --explain.",
    }, null, 2));
    return;
  }

  for (const res of results) {
    console.log(`\nStatSignals — ${res.name} — ${res.wordCount} words\n${"=".repeat(56)}`);
    if (res.short) console.log(`⚠ under ${MIN_WORDS} words — every signal below is unreliable at this length`);
    for (const s of res.signals) {
      const tag = s.tier === "real-but-imperfect" ? "▪ signal" : "· weak  ";
      console.log(`${tag}  ${s.label}: ${s.value}`);
      console.log(`          ${s.note}`);
    }
  }
  console.log(`\n${"-".repeat(56)}`);
  console.log("Features, not verdicts — no keyless statistic is a reliable per-document");
  console.log("AI detector, and paraphrase degrades all of them. Run --explain.\n");
}

main();
