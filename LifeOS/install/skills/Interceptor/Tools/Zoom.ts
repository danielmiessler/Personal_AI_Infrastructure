#!/usr/bin/env bun
/**
 * Zoom.ts — measured zoom for appearance verification.
 *
 * A full-page screenshot is downscaled to the model's image budget before it
 * reaches the model, so fine detail — a logo, a glyph, 2px of spacing — is
 * destroyed before anyone can look at it. Cropping the already-downscaled
 * image does not bring it back.
 *
 * This crops the region from the FULL-RESOLUTION original and scales that
 * region UP to fill the budget, so the pixels spent land on the thing being
 * verified. Coordinates are absolute pixels in the original image.
 *
 * Usage:
 *   bun Zoom.ts <image> --x N --y N --w N --h N [--out <path>] [--budget 1568]
 *
 * Exit 0 = wrote the zoom (path on stdout); 1 = the chosen backend failed;
 * 2 = bad args or out-of-bounds crop; 3 = no usable image backend.
 *
 * Backends, in preference order: `magick` (the same binary Capture.sh and
 * VerifyImageProbe.ts use), then `ffmpeg`. Both produce the same crop-then-
 * upscale; ffmpeg exists so the tool still works on hosts without ImageMagick.
 *
 * public PR #1657, @elhoim
 */
import { existsSync } from "fs";

/** Images are downscaled to ~1568px on the long edge before the model sees
 *  them; upscaling past that buys no detail and just costs tokens. */
const DEFAULT_BUDGET = 1568;

function magickBin(): string | null {
  const w = Bun.which("magick");
  if (w) return w;
  for (const p of ["/opt/homebrew/bin/magick", "/usr/local/bin/magick", "/usr/bin/magick"]) {
    if (existsSync(p)) return p;
  }
  return null;
}

function ffmpegBin(): string | null {
  const w = Bun.which("ffmpeg");
  if (w) return w;
  for (const p of ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"]) {
    if (existsSync(p)) return p;
  }
  return null;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function die(code: number, msg: string): never {
  console.error(msg);
  process.exit(code);
}

/** Source dimensions, via whichever backend is present. */
function dimensions(path: string): { w: number; h: number } | null {
  const m = magickBin();
  if (m) {
    const r = Bun.spawnSync([m, path, "-format", "%w %h", "info:"]);
    const [w, h] = r.stdout.toString().trim().split(/\s+/).map(Number);
    if (Number.isFinite(w) && Number.isFinite(h)) return { w, h };
  }
  const f = ffmpegBin();
  if (f) {
    // ffmpeg reports the stream dimensions on stderr as "…, WxH[ …]"
    const r = Bun.spawnSync([f, "-hide_banner", "-i", path, "-f", "null", "-"]);
    const m2 = r.stderr.toString().match(/,\s(\d+)x(\d+)[\s,]/);
    if (m2) return { w: Number(m2[1]), h: Number(m2[2]) };
  }
  return null;
}

const src = process.argv[2];
if (!src || src.startsWith("--")) {
  die(2, "usage: bun Zoom.ts <image> --x N --y N --w N --h N [--out <path>] [--budget 1568]");
}
if (!existsSync(src)) die(2, `no such image: ${src}`);

const x = Number(arg("x"));
const y = Number(arg("y"));
const w = Number(arg("w"));
const h = Number(arg("h"));
if (![x, y, w, h].every(Number.isFinite)) {
  die(2, "--x, --y, --w and --h are required and must be numbers (original-image pixels)");
}
if (w <= 0 || h <= 0) die(2, `crop must have positive area, got ${w}x${h}`);
if (x < 0 || y < 0) die(2, `crop origin must be non-negative, got ${x},${y}`);

const budget = Number(arg("budget") ?? DEFAULT_BUDGET);
if (!Number.isFinite(budget) || budget <= 0) die(2, `--budget must be a positive number, got ${arg("budget")}`);

const dim = dimensions(src);
if (!dim) die(3, "no usable image backend — install ImageMagick (`magick`) or ffmpeg");
if (x + w > dim.w || y + h > dim.h) {
  die(2, `crop ${w}x${h}+${x}+${y} falls outside the ${dim.w}x${dim.h} original — coordinates are absolute pixels in the source image`);
}

const out = arg("out") ?? src.replace(/(\.[a-z0-9]+)$/i, "") + `.zoom-${x}_${y}_${w}_${h}.png`;

// Scale so the crop's LONG edge lands on the budget. Never downscale: if the
// region is already larger than the budget the model would shrink it anyway,
// and doing it here would just throw away detail earlier.
const longEdge = Math.max(w, h);
const scale = Math.max(1, budget / longEdge);
const outW = Math.round(w * scale);
const outH = Math.round(h * scale);

const m = magickBin();
const f = ffmpegBin();
let ok = false;
let backend = "";

if (m) {
  backend = "magick";
  const r = Bun.spawnSync([
    m, src,
    "-crop", `${w}x${h}+${x}+${y}`,
    "+repage",
    "-filter", "point",           // nearest-neighbour: magnify without inventing detail
    "-resize", `${outW}x${outH}!`,
    out,
  ]);
  ok = r.exitCode === 0;
  if (!ok && !f) die(1, `magick failed: ${r.stderr.toString().trim()}`);
}

if (!ok && f) {
  backend = "ffmpeg";
  const r = Bun.spawnSync([
    f, "-hide_banner", "-loglevel", "error", "-y",
    "-i", src,
    // format=rgba BEFORE scale, and it is load-bearing: without it ffmpeg picks
    // pal8 for the PNG output and quantises the crop's colours (measured: a
    // #3B82F6 marker came back #486CFF). This tool exists to settle appearance
    // claims, so a backend that shifts colour is worse than no backend. rgba,
    // not rgb24 — rgb24 is also exact but flattens transparency to opaque.
    "-vf", `crop=${w}:${h}:${x}:${y},format=rgba,scale=${outW}:${outH}:flags=neighbor`,
    "-frames:v", "1",
    out,
  ]);
  ok = r.exitCode === 0;
  if (!ok) die(1, `ffmpeg failed: ${r.stderr.toString().trim()}`);
}

if (!ok) die(3, "no usable image backend — install ImageMagick (`magick`) or ffmpeg");

console.error(
  `zoom via ${backend}: ${w}x${h}+${x}+${y} of ${dim.w}x${dim.h} → ${outW}x${outH} (${scale.toFixed(2)}x)`
);
console.log(out);
