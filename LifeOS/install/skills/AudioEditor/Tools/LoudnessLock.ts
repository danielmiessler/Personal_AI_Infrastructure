#!/usr/bin/env bun
/**
 * LoudnessLock — deterministic delivery-loudness finalizer (YouTube standard).
 *
 * Target: −14 LUFS integrated, ≤ −1 dBTP true peak (YouTube normalizes to ~−14;
 * louder is turned down, quieter just sounds quiet next to other videos).
 *
 * Measure mode (default): report integrated LUFS / true peak / LRA + PASS/FAIL.
 *   bun LoudnessLock.ts <media>                       # exit 0 = within tolerance
 *
 * Normalize mode: two-pass ffmpeg loudnorm (linear when possible), video stream
 * copied, AAC audio at source sample rate, then SELF RE-MEASURE — exits 0 only
 * when the OUTPUT lands within tolerance.
 *   bun LoudnessLock.ts <media> --out <out.mp4> [--target -14] [--tp -1] [--abr 256k]
 *
 * Exit codes: 0 = pass, 1 = fail/out-of-tolerance, 2 = error.
 */
import { spawnSync } from "child_process";

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const opt = (name: string, def: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const OUT = opt("--out", "");
const TARGET = parseFloat(opt("--target", "-14"));
const TP = parseFloat(opt("--tp", "-1"));
const ABR = opt("--abr", "256k");
const TOL = 0.5;
if (!file) { console.error("usage: LoudnessLock.ts <media> [--out out.mp4] [--target -14] [--tp -1] [--abr 256k]"); process.exit(2); }

function measure(f: string) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", `loudnorm=I=${TARGET}:TP=${TP}:LRA=11:print_format=json`, "-f", "null", "-"], { maxBuffer: 1 << 26 });
  const err = r.stderr?.toString() || "";
  const m = err.match(/\{[\s\S]*\}/);
  if (!m) { console.error("loudnorm measurement failed:", err.slice(-400)); process.exit(2); }
  const j = JSON.parse(m[0]);
  return {
    input_i: parseFloat(j.input_i), input_tp: parseFloat(j.input_tp),
    input_lra: parseFloat(j.input_lra), input_thresh: parseFloat(j.input_thresh),
    target_offset: parseFloat(j.target_offset),
  };
}
const verdict = (i: number, tp: number) => Math.abs(i - TARGET) <= TOL && tp <= TP + 0.1;

const m1 = measure(file);
console.log(`${file}: integrated ${m1.input_i} LUFS | true peak ${m1.input_tp} dBTP | LRA ${m1.input_lra} | target ${TARGET} LUFS / ${TP} dBTP`);

if (!OUT) {
  const pass = verdict(m1.input_i, m1.input_tp);
  console.log(pass ? "PASS — within delivery tolerance" : `FAIL — off by ${(m1.input_i - TARGET).toFixed(1)} LU${m1.input_tp > TP ? `, true peak over by ${(m1.input_tp - TP).toFixed(1)}dB` : ""}`);
  process.exit(pass ? 0 : 1);
}

// probe source audio params
const pr = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", file]);
const SR = parseInt(pr.stdout?.toString().trim() || "") || 48000;
const hasVideo = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", file]).stdout?.toString().includes("video");

const af = `loudnorm=I=${TARGET}:TP=${TP}:LRA=11:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true`;
const encArgs = ["-v", "error", "-i", file, ...(hasVideo ? ["-map", "0:v:0", "-c:v", "copy"] : []), "-map", "0:a:0", "-af", af, "-c:a", "aac", "-b:a", ABR, "-ar", String(SR), "-movflags", "+faststart", OUT, "-y"];
const enc = spawnSync("ffmpeg", encArgs, { maxBuffer: 1 << 26 });
if (enc.status !== 0) { console.error("normalize encode failed:", enc.stderr?.toString().slice(-400)); process.exit(2); }

let m2 = measure(OUT);
console.log(`${OUT}: integrated ${m2.input_i} LUFS | true peak ${m2.input_tp} dBTP`);

// correction pass: pure gain for the residual + true-peak limiter (loudnorm's dynamic
// mode can land outside tolerance on large gain requirements)
for (let pass = 1; pass <= 2 && !verdict(m2.input_i, m2.input_tp); pass++) {
  const residual = TARGET - m2.input_i;
  // alimiter caps sample peaks, not inter-sample true peaks — leave 0.8dB margin
  const limitLin = Math.pow(10, (TP - 0.8) / 20).toFixed(4);
  const tmp = OUT + ".corr.mp4";
  console.log(`correction pass ${pass}: ${residual >= 0 ? "+" : ""}${residual.toFixed(2)}dB gain, sample-peak limit ${(TP - 0.8).toFixed(1)}dB (true-peak margin)`);
  const corr = spawnSync("ffmpeg", ["-v", "error", "-i", OUT, ...(hasVideo ? ["-map", "0:v:0", "-c:v", "copy"] : []), "-map", "0:a:0", "-af", `volume=${residual.toFixed(2)}dB,alimiter=limit=${limitLin}:level=false:attack=5:release=50`, "-c:a", "aac", "-b:a", ABR, "-ar", String(SR), "-movflags", "+faststart", tmp, "-y"], { maxBuffer: 1 << 26 });
  if (corr.status !== 0) { console.error("correction encode failed:", corr.stderr?.toString().slice(-300)); process.exit(2); }
  spawnSync("mv", [tmp, OUT]);
  m2 = measure(OUT);
  console.log(`${OUT} (corrected ${pass}): integrated ${m2.input_i} LUFS | true peak ${m2.input_tp} dBTP`);
}

const pass = verdict(m2.input_i, m2.input_tp);
console.log(pass ? `LOCKED — output within ${TOL} LU of ${TARGET} LUFS, TP ≤ ${TP} dBTP` : "FAIL — output out of tolerance after correction pass");
process.exit(pass ? 0 : 1);
