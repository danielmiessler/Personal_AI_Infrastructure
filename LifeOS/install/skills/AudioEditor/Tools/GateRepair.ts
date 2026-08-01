#!/usr/bin/env bun
/**
 * GateRepair — repairs hard noise-gate truncation artifacts ("ticking") in recorded speech.
 *
 * Defect model (incident 2026-07-13): a capture-chain noise gate (recorder filter or
 * macOS Voice Isolation) truncates audio to the noise floor instantly. Every gate
 * close/open is a step discontinuity; downstream leveling (+gain/compression) amplifies
 * each edge into an audible tick.
 *
 * Repair (minimal-touch — samples outside repair windows pass through untouched):
 *  1. Map gate regions: 2ms RMS below max(p05×6, median×0.025) sustained ≥8ms.
 *  2. Merge gate-chatter blips (<35ms audio islands between ≥40ms gate regions) into
 *     their regions and HARD-ZERO them (+1ms margins) — fade-down-and-up preserves the
 *     blip's edges and its leading step; zeroing is step-free because surroundings are
 *     already below threshold.
 *  3. 6ms raised-cosine ramps into and out of every gate region.
 *  4. V-notch safety sweep: any residual one-sample step >0.03 adjacent to near-silence
 *     gets a ±1.5ms cosine notch to zero at the boundary. Iterated until zero
 *     (one-sided fades don't converge on stray boundary impulses; the notch does).
 *
 * Modes:
 *   bun GateRepair.ts <in-media> <out.wav>
 *     → repaired f32 WAV (all streams' audio replaced; channels preserved)
 *   bun GateRepair.ts <in-media> <out.mp4> --finalize [--abr 192k]
 *     → full pipeline: repair → AAC encode + video-stream copy → scan the ENCODED file
 *       (AAC re-introduces steps near silence) → V-notch offenders → re-encode, until the
 *       encoded output scans clean (max 5 iterations). Exit 1 if not converged.
 */
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const args = process.argv.slice(2);
const pos = args.filter(a => !a.startsWith("--") && !/^\d+k$/.test(a));
const [inFile, outFile] = pos;
const finalize = args.includes("--finalize");
const abrIdx = args.indexOf("--abr");
const ABR = abrIdx >= 0 ? args[abrIdx + 1] : "192k";
if (!inFile || !outFile) { console.error("usage: GateRepair.ts <in> <out.wav|out.mp4 --finalize [--abr 192k]>"); process.exit(2); }

const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels", "-of", "csv=p=0", inFile]);
const [srS, chS] = (pr.stdout?.toString().trim() || "").split(",");
const SR = parseInt(srS), CH = parseInt(chS);
if (!SR || !CH) { console.error("ffprobe failed on", inFile); process.exit(2); }

const ff = spawnSync("ffmpeg", ["-v", "error", "-i", inFile, "-map", "0:a:0", "-f", "f32le", "-"], { maxBuffer: 8 * (1 << 30) });
if (ff.status !== 0) { console.error("decode failed:", ff.stderr?.toString().slice(0, 300)); process.exit(2); }
const buf: Buffer = ff.stdout;
const total = Math.floor(buf.length / 4);
const inter = new Float32Array(buf.buffer, buf.byteOffset, total);
const n = Math.floor(total / CH);

const mono = new Float32Array(n);
for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < CH; c++) s += inter[i * CH + c]; mono[i] = s / CH; }

// 2ms RMS on 1ms hop
const W = Math.floor(SR * 0.002), HOP = Math.floor(SR * 0.001);
const frames = Math.floor((n - W) / HOP);
const rms = new Float32Array(frames);
for (let f = 0; f < frames; f++) { let s = 0; const off = f * HOP; for (let i = 0; i < W; i++) { const v = mono[off + i]; s += v * v; } rms[f] = Math.sqrt(s / W); }

const sorted = Array.from(rms).sort((a, b) => a - b);
const p05 = sorted[Math.floor(frames * 0.05)], p50 = sorted[Math.floor(frames * 0.5)];
const T = Math.max(p05 * 6, p50 * 0.025, 1e-5);
console.log(`SR=${SR} CH=${CH} dur=${(n / SR).toFixed(1)}s | floor(p5)=${p05.toExponential(2)} median=${p50.toExponential(2)} gateThresh=${T.toExponential(2)}`);

// gate regions (sample indices)
type Region = { s: number; e: number };
const regions: Region[] = [];
{
  let f = 0;
  while (f < frames) {
    if (rms[f] < T) {
      let g = f; while (g < frames && rms[g] < T) g++;
      if (g - f >= 8) regions.push({ s: f * HOP, e: g * HOP + W });
      f = g;
    } else f++;
  }
  for (let i = regions.length - 2; i >= 0; i--) {
    if (regions[i + 1].s - regions[i].e < SR * 0.003) { regions[i].e = regions[i + 1].e; regions.splice(i + 1, 1); }
  }
}

// merge chatter blips
let blips = 0;
const minGate = SR * 0.04, maxBlip = SR * 0.035;
for (let i = regions.length - 2; i >= 0; i--) {
  const a = regions[i], bR = regions[i + 1];
  const island = bR.s - a.e;
  if (island > 0 && island < maxBlip && (a.e - a.s) >= minGate && (bR.e - bR.s) >= minGate) {
    a.e = bR.e; regions.splice(i + 1, 1); blips++;
  }
}

// hard-zero loud stretches inside regions (chatter/impulses), +1ms margins
let muted = 0;
const margin = Math.floor(SR * 0.001);
for (const r of regions) {
  for (let i = r.s; i < Math.min(r.e, n); i++) {
    if (Math.abs(mono[i]) > T * 4) {
      let j = i; while (j < r.e && !(Math.abs(mono[j]) < T && Math.abs(mono[Math.min(j + 48, n - 1)]) < T)) j++;
      const z0 = Math.max(r.s, i - margin), z1 = Math.min(Math.min(r.e, n), j + margin);
      for (let k = z0; k < z1; k++) { for (let c = 0; c < CH; c++) inter[k * CH + c] = 0; mono[k] = 0; }
      muted += z1 - z0;
      i = j;
    }
  }
}

// 6ms edge ramps
const RAMP = Math.floor(SR * 0.006);
for (const r of regions) {
  const s0 = Math.max(0, r.s - RAMP);
  for (let k = s0; k < r.s; k++) {
    const g = 0.5 * (1 + Math.cos(Math.PI * (k - s0) / (r.s - s0)));
    for (let c = 0; c < CH; c++) inter[k * CH + c] *= g;
    mono[k] *= g;
  }
  const e1 = Math.min(n, r.e + RAMP);
  for (let k = r.e; k < e1 && k < n; k++) {
    const g = 0.5 * (1 - Math.cos(Math.PI * (k - r.e) / (e1 - r.e)));
    for (let c = 0; c < CH; c++) inter[k * CH + c] *= g;
    mono[k] *= g;
  }
}
console.log(`gate regions: ${regions.length} | chatter blips zeroed: ${blips} (${muted} samples) | edge ramps: ${regions.length * 2}`);

// V-notch at a boundary sample index (mutates inter + mono)
const notch = (c: number, halfMs = 1.5) => {
  const half = Math.floor(SR * halfMs / 1000);
  const s0 = Math.max(0, c - half), e1 = Math.min(n, c + half);
  for (let k = s0; k < e1; k++) {
    const ph = (k - s0) / (e1 - s0);
    const gv = 1 - 0.5 * (1 - Math.cos(2 * Math.PI * ph)); // 1 at edges, 0 at center
    for (let ch = 0; ch < CH; ch++) inter[k * CH + ch] *= gv;
    mono[k] *= gv;
  }
};

// safety sweep on the working buffer
const stepScan = (sig: Float32Array, sr: number): number[] => {
  const w4 = Math.floor(sr * 0.004);
  const out: number[] = [];
  for (let i = 1; i < sig.length; i++) {
    const d = Math.abs(sig[i] - sig[i - 1]);
    if (d < 0.03) continue;
    let lmax = 0, rmax = 0;
    for (let k = Math.max(0, i - w4); k < i; k++) { const v = Math.abs(sig[k]); if (v > lmax) lmax = v; }
    for (let k = i + 1; k < Math.min(sig.length, i + w4); k++) { const v = Math.abs(sig[k]); if (v > rmax) rmax = v; }
    if (Math.min(lmax, rmax) < 0.006) { out.push(i); i += w4; }
  }
  return out;
};
for (let pass = 1; pass <= 5; pass++) {
  const sites = stepScan(mono, SR);
  console.log(`safety sweep pass ${pass}: ${sites.length} residual steps`);
  if (!sites.length) break;
  for (const i of sites) notch(i);
  if (pass === 5) { console.error("WARN: sweep hit pass limit"); }
}

// write WAV
const writeWav = (path: string) => {
  const dataBytes = total * 4;
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + dataBytes, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(CH, 22);
  hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * CH * 4, 28); hdr.writeUInt16LE(CH * 4, 32); hdr.writeUInt16LE(32, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(dataBytes, 40);
  writeFileSync(path, Buffer.concat([hdr, Buffer.from(inter.buffer, inter.byteOffset, dataBytes)]));
};

if (!finalize) {
  writeWav(outFile);
  console.log(`wrote ${outFile}`);
  process.exit(0);
}

// --finalize: encode + scan the ENCODED output, notch offenders, iterate
const tmpWav = outFile + ".gaterepair.tmp.wav";
for (let iter = 1; iter <= 5; iter++) {
  writeWav(tmpWav);
  const enc = spawnSync("ffmpeg", ["-v", "error", "-i", inFile, "-i", tmpWav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", ABR, "-ar", String(SR), "-movflags", "+faststart", outFile, "-y"]);
  if (enc.status !== 0) { console.error("encode failed:", enc.stderr?.toString().slice(0, 300)); process.exit(2); }
  const dec = spawnSync("ffmpeg", ["-v", "error", "-i", outFile, "-map", "0:a:0", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 8 * (1 << 30) });
  const xb: Buffer = dec.stdout;
  const xe = new Float32Array(xb.buffer, xb.byteOffset, Math.floor(xb.length / 4));
  const sites = stepScan(xe, SR);
  console.log(`finalize iter ${iter}: encoded steps = ${sites.length}`);
  if (!sites.length) {
    try { unlinkSync(tmpWav); } catch {}
    console.log(`CLEAN: ${outFile}`);
    process.exit(0);
  }
  for (const i of sites) notch(Math.min(i, n - 1), 2);
}
try { unlinkSync(tmpWav); } catch {}
console.error("FAILED to converge in 5 finalize iterations");
process.exit(1);
