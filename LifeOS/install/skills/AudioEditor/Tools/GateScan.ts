#!/usr/bin/env bun
/**
 * GateScan — detects noise-gate truncation artifacts (audible "ticking") in audio/video files.
 *
 * Two detectors:
 *  - STEP: one-sample amplitude jump >0.03 where one side is near-silence
 *    (max |x| < 0.006 over 4ms). This is the audible defect: a hard gate
 *    closing/opening mid-waveform. Sample-domain, immune to the fade-foot
 *    false positive that dB-domain detectors have.
 *  - CLIFF (informational): 2ms-window RMS changing >28dB within 2ms while the
 *    louder side is above −46dBFS. Counts gate edges even when they don't step
 *    in one sample. NOTE: a legitimate fade into digital zero also trips this
 *    (dB slope → −∞ at the foot), so CLIFF alone never fails a file.
 *
 * Exit codes: 0 = clean (no STEPs), 1 = STEP defects found, 2 = error.
 *
 * Usage: bun GateScan.ts <media-file> [--json] [--step-thresh 0.03] [--sil-thresh 0.006]
 */
import { spawnSync } from "child_process";

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
const opt = (name: string, def: number) => {
  const i = args.indexOf(name);
  return i >= 0 ? parseFloat(args[i + 1]) : def;
};
const STEP = opt("--step-thresh", 0.03);
const SIL = opt("--sil-thresh", 0.006);
const asJson = args.includes("--json");
if (!file) { console.error("usage: GateScan.ts <file> [--json]"); process.exit(2); }

const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", file]);
const SR = parseInt(pr.stdout?.toString().trim() || "") || 48000;
const ff = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-map", "0:a:0", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 8 * (1 << 30) });
if (ff.status !== 0) { console.error("decode failed:", ff.stderr?.toString().slice(0, 300)); process.exit(2); }
const b: Buffer = ff.stdout;
const n = Math.floor(b.length / 4);
const x = new Float32Array(b.buffer, b.byteOffset, n);

// STEP detector
const w4 = Math.floor(SR * 0.004);
const steps: { t: number; jump: number }[] = [];
for (let i = 1; i < n; i++) {
  const d = Math.abs(x[i] - x[i - 1]);
  if (d < STEP) continue;
  let lmax = 0, rmax = 0;
  for (let k = Math.max(0, i - w4); k < i; k++) { const v = Math.abs(x[k]); if (v > lmax) lmax = v; }
  for (let k = i + 1; k < Math.min(n, i + w4); k++) { const v = Math.abs(x[k]); if (v > rmax) rmax = v; }
  if (Math.min(lmax, rmax) < SIL) { steps.push({ t: +(i / SR).toFixed(3), jump: +d.toFixed(3) }); i += w4; }
}

// CLIFF detector (informational)
const W = Math.floor(SR * 0.002), HOP = Math.floor(SR * 0.0005);
const frames = Math.floor((n - W) / HOP);
const rms = new Float32Array(frames);
{
  let s = 0; for (let i = 0; i < W; i++) s += x[i] * x[i];
  rms[0] = Math.sqrt(s / W);
  for (let f = 1; f < frames; f++) {
    const off = f * HOP;
    for (let i = off - HOP; i < off; i++) { s -= x[i] * x[i]; s += x[i + W] * x[i + W]; }
    rms[f] = Math.sqrt(Math.max(s, 0) / W);
  }
}
const db = (v: number) => 20 * Math.log10(Math.max(v, 1e-7));
let cliffs = 0, last = -1;
for (let f = 2; f < frames - 2; f++) {
  const a = rms[f - 2], c = rms[f + 2];
  const hi = Math.max(a, c), lo = Math.min(a, c);
  if (db(hi) > -46 && db(hi) - db(lo) > 28) {
    const t = f * 0.0005;
    if (t - last > 0.05) cliffs++;
    last = t;
  }
}

const result = { file, durationSec: +(n / SR).toFixed(1), steps: steps.length, cliffs, stepList: steps.slice(0, 50) };
if (asJson) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`${file}: ${result.durationSec}s | STEPS (audible gate ticks): ${steps.length} | cliffs (gate edges, informational): ${cliffs}`);
  for (const s of steps.slice(0, 20)) console.log(`  STEP @ ${s.t}s jump=${s.jump}`);
  if (steps.length > 20) console.log(`  ... ${steps.length - 20} more`);
}
process.exit(steps.length > 0 ? 1 : 0);
