# Watermark Workflow

Scan text for watermark and steganography signatures that are readable **without any key** — the character-level covert channels that live directly in the bytes.

## Run it

```bash
bun ~/.claude/LIFEOS/TOOLS/WatermarkScan.ts --file <path>
# also: --text "..."  |  piped stdin  |  --json for machine output  |  --explain for the full model
```

## What it detects (keyless, deterministic)

Zero-width / invisible characters, variation-selector and Unicode Tags-block steganography, bidi-control overrides, homoglyph / mixed-script substitution, anomalous whitespace, plus a weak trigram-repetition heuristic (reported as a hint, never a verdict). Each hit reports its codepoint, name, and byte offset.

## The hard limit — state it every time

It **cannot** detect sampling-time statistical watermarks: Kirchenbauer green-list (arXiv:2301.10226), Aaronson/Gumbel (arXiv:2307.15593), Google SynthID-Text (Nature s41586-024-08025-4), or **Anthropic's announced in-text mark** (support.claude.com/en/articles/16266773). Those bias token choice using a secret key and leave no readable artifact in a single text — detection is key-gated by mathematical design. A clean scan does **not** mean the text is unwatermarked or human-written. Run `--explain` for the detectable-vs-impossible breakdown.

## Pairs with the other measures

Different questions, different tools: **Score** (Pangram) answers "does this read as AI?", **Detect** (heuristics + StatSignals) answers "which AI tells fire, and what's the distributional shape?", and **Watermark** answers "is a covert character-level channel embedded?". For "is this AI and is it marked?", run Score plus Watermark. Note that copy-paste through HTML or a summarizer strips most invisible characters, so a wild sample that scans clean may just have been laundered by transport.
