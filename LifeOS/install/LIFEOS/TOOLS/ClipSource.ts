#!/usr/bin/env bun

/**
 * ClipSource.ts — cut a social-ready clip out of ANY source video.
 *
 * The companion to the Descript-driven clip workflow: that one edits the
 * principal's own recordings, this one cuts a range out of someone else's
 * video (a conference talk, a podcast, an interview) and hands back an MP4
 * X/LinkedIn/Bluesky will accept without transcoding surprises.
 *
 * Sources: any yt-dlp-supported URL, or a local file.
 *
 * Usage:
 *   bun ClipSource.ts <url|file> --start 12:04 --end 13:31
 *   bun ClipSource.ts <url> --start 0:30 --end 1:45 --captions
 *   bun ClipSource.ts <file> --start 5 --end 65 --srt subs.srt --captions --aspect 9:16
 *   bun ClipSource.ts <url> --start 1:00 --end 2:00 --out ~/Downloads/clip.mp4 --json
 *
 * Flags:
 *   --start/-s <t>     range start (SS | MM:SS | HH:MM:SS[.ms])   required
 *   --end/-e <t>       range end                                  required
 *   --out/-o <path>    output MP4 (default: <work-dir>/clips/clip-<start>-<end>.mp4)
 *   --captions         burn subtitles into the lower third (muted-feed default OFF)
 *   --srt <path>       subtitle file to burn (else auto-subs are pulled for URLs)
 *   --aspect <a>       source (default) | 9:16 | 1:1 — crops the sides, never letterboxes
 *   --crop-x <0..1>    horizontal center of the crop window (default 0.5)
 *   --speed <n>        playback rate, e.g. 1.2 (default 1.0)
 *   --max-mb <n>       fail if the output exceeds this (default 512, X's ceiling)
 *   --keep-temp        leave the intermediate download in place for inspection
 *   --json             machine-readable summary on stdout
 */

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, readdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { tmpdir } from "os";

// X's own limits — the reason this tool exists is that violating them silently
// produces a post with no video rather than an error.
const X_MAX_BYTES = 512 * 1024 * 1024;
const X_STANDARD_MAX_SECONDS = 140; // longer needs a Premium account

interface Args {
  source: string;
  start: number;
  end: number;
  out?: string;
  captions: boolean;
  srt?: string;
  aspect: "source" | "9:16" | "1:1";
  cropX: number;
  speed: number;
  maxMb: number;
  keepTemp: boolean;
  json: boolean;
}

function die(msg: string): never {
  console.error(`ClipSource: ${msg}`);
  process.exit(1);
}

/** SS | MM:SS | HH:MM:SS[.ms] → seconds */
function parseTime(raw: string): number {
  const parts = raw.trim().split(":");
  if (parts.length > 3 || parts.some((p) => p === "" || isNaN(Number(p)))) {
    die(`unparseable time "${raw}" — use SS, MM:SS, or HH:MM:SS`);
  }
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${s % 1 ? `.${Math.round((s % 1) * 1000)}` : ""}`;
}

function parseArgs(argv: string[]): Args {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(readFileSync(new URL(import.meta.url), "utf-8").split("*/")[0].replace(/^#!.*\n/, ""));
    process.exit(0);
  }
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("-")) { positional.push(a); continue; }
    const key = a.replace(/^--?/, "");
    const valueless = ["captions", "keep-temp", "json"];
    if (valueless.includes(key)) { flags[key] = true; continue; }
    flags[key] = argv[++i] ?? "";
  }
  const source = positional[0];
  if (!source) die("no source given — pass a URL or a local file path");
  const startRaw = (flags.start ?? flags.s) as string;
  const endRaw = (flags.end ?? flags.e) as string;
  if (!startRaw || !endRaw) die("--start and --end are both required");
  const start = parseTime(startRaw);
  const end = parseTime(endRaw);
  if (end <= start) die(`--end (${endRaw}) must be after --start (${startRaw})`);

  const aspect = ((flags.aspect as string) || "source") as Args["aspect"];
  if (!["source", "9:16", "1:1"].includes(aspect)) die(`--aspect must be source, 9:16, or 1:1 (got "${aspect}")`);

  return {
    source,
    start,
    end,
    out: (flags.out ?? flags.o) as string | undefined,
    captions: Boolean(flags.captions),
    srt: flags.srt as string | undefined,
    aspect,
    cropX: flags["crop-x"] ? Number(flags["crop-x"]) : 0.5,
    speed: flags.speed ? Number(flags.speed) : 1.0,
    maxMb: flags["max-mb"] ? Number(flags["max-mb"]) : 512,
    keepTemp: Boolean(flags["keep-temp"]),
    json: Boolean(flags.json),
  };
}

async function run(cmd: string[], label: string): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    const tail = (stderr || stdout).trim().split("\n").slice(-6).join("\n");
    die(`${label} failed (exit ${code}):\n${tail}`);
  }
  return stdout;
}

function requireBinary(bin: string, why: string): void {
  const found = Bun.spawnSync(["which", bin]).exitCode === 0;
  if (!found) die(`${bin} not installed — needed to ${why}. brew install ${bin}`);
}

async function probeDuration(file: string): Promise<number> {
  const out = await run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    "ffprobe duration",
  );
  const d = Number(out.trim());
  if (!isFinite(d) || d <= 0) die(`ffprobe returned no usable duration for ${file}`);
  return d;
}

// --- SRT handling -----------------------------------------------------------
// Auto-subs come with the WHOLE video's timeline, so burning them onto a clip
// that starts at 12:04 puts the wrong words on screen (or none at all). Cut the
// cues to the range and rebase them to zero before they touch ffmpeg.

interface Cue { start: number; end: number; text: string }

function parseSrtTime(t: string): number {
  const m = t.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

function fmtSrtTime(s: number): string {
  const ms = Math.round((s % 1) * 1000);
  const total = Math.floor(s);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)},${pad(ms, 3)}`;
}

function sliceSrt(srtText: string, start: number, end: number): string {
  const cues: Cue[] = [];
  for (const block of srtText.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n").filter(Boolean);
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const [from, to] = timeLine.split("-->").map((s) => parseSrtTime(s));
    if (isNaN(from) || isNaN(to)) continue;
    const text = lines.slice(lines.indexOf(timeLine) + 1).join("\n").trim();
    if (!text) continue;
    if (to <= start || from >= end) continue; // outside the clip
    cues.push({ start: Math.max(from, start) - start, end: Math.min(to, end) - start, text });
  }
  // Auto-subs repeat the rolling line; collapse consecutive duplicates so the
  // burn-in doesn't stutter.
  const deduped = cues.filter((c, i) => i === 0 || c.text !== cues[i - 1].text);
  return deduped
    .map((c, i) => `${i + 1}\n${fmtSrtTime(c.start)} --> ${fmtSrtTime(c.end)}\n${c.text}`)
    .join("\n\n") + "\n";
}

// --- Main -------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const isUrl = /^https?:\/\//i.test(args.source);
  const requested = args.end - args.start;

  requireBinary("ffmpeg", "encode the clip");
  requireBinary("ffprobe", "verify the clip");
  if (isUrl) requireBinary("yt-dlp", "fetch the source video");

  const temp = join(tmpdir(), `clipsource-${process.pid}`);
  mkdirSync(temp, { recursive: true });

  let workFile: string;
  let offsetInWorkFile = 0; // where the requested range starts inside workFile

  try {
    if (isUrl) {
      // Section download: yt-dlp re-encodes at the cut boundaries, so the file
      // normally comes back as exactly the requested range starting at 0.
      const tmpl = join(temp, "section.%(ext)s");
      await run(
        ["yt-dlp", "--no-playlist", "--force-keyframes-at-cuts",
         "--download-sections", `*${fmtTime(args.start)}-${fmtTime(args.end)}`,
         "-f", "bv*[height<=1080]+ba/b[height<=1080]/b",
         "--merge-output-format", "mp4", "-o", tmpl, args.source],
        "yt-dlp section download",
      );
      const got = readdirSync(temp).filter((f) => f.startsWith("section."));
      if (!got.length) die("yt-dlp reported success but wrote no file");
      workFile = join(temp, got[0]);

      // Keyframe alignment can still hand back a longer span. When it does,
      // fall back to the whole video and cut precisely — slower, always right.
      const sectionDur = await probeDuration(workFile);
      if (Math.abs(sectionDur - requested) > 0.75) {
        const fullTmpl = join(temp, "full.%(ext)s");
        await run(
          ["yt-dlp", "--no-playlist", "-f", "bv*[height<=1080]+ba/b[height<=1080]/b",
           "--merge-output-format", "mp4", "-o", fullTmpl, args.source],
          "yt-dlp full download (section fallback)",
        );
        const fulls = readdirSync(temp).filter((f) => f.startsWith("full."));
        if (!fulls.length) die("section download was inaccurate and the full-download fallback wrote no file");
        workFile = join(temp, fulls[0]);
        offsetInWorkFile = args.start;
      }
    } else {
      workFile = resolve(args.source.replace(/^~/, process.env.HOME!));
      if (!existsSync(workFile)) die(`source file not found: ${workFile}`);
      offsetInWorkFile = args.start;
    }

    // A section download holds ONLY the requested range, so its duration says
    // nothing about where the source ends (and its accuracy was already checked
    // above). Every other path holds the whole source, so the range must fit.
    const holdsWholeSource = !isUrl || offsetInWorkFile > 0;
    if (holdsWholeSource) {
      const sourceDur = await probeDuration(workFile);
      if (args.end > sourceDur + 1) {
        die(`--end ${fmtTime(args.end)} is past the source's duration (${fmtTime(sourceDur)})`);
      }
    }

    // Subtitles
    let srtPath: string | undefined;
    if (args.captions) {
      let srtText: string | undefined;
      if (args.srt) {
        const p = resolve(args.srt.replace(/^~/, process.env.HOME!));
        if (!existsSync(p)) die(`--srt file not found: ${p}`);
        srtText = readFileSync(p, "utf-8");
      } else if (isUrl) {
        await run(
          ["yt-dlp", "--no-playlist", "--skip-download", "--write-subs", "--write-auto-subs",
           "--sub-langs", "en.*", "--convert-subs", "srt", "-o", join(temp, "subs"), args.source],
          "yt-dlp subtitle fetch",
        );
        const sub = readdirSync(temp).find((f) => f.startsWith("subs") && f.endsWith(".srt"));
        if (!sub) die("--captions asked for burn-in but the source has no subtitles — pass --srt");
        srtText = readFileSync(join(temp, sub), "utf-8");
      } else {
        die("--captions on a local file needs --srt");
      }
      // Auto-subs are on the full-video timeline; a section download is not.
      const subOffset = isUrl && offsetInWorkFile === 0 ? args.start : offsetInWorkFile;
      srtPath = join(temp, "clip.srt");
      const sliced = sliceSrt(srtText!, subOffset, subOffset + requested);
      if (sliced.trim().length === 0) die("no subtitle cues fall inside the requested range");
      writeFileSync(srtPath, sliced);
    }

    // Output path
    let out = args.out ? resolve(args.out.replace(/^~/, process.env.HOME!)) : undefined;
    if (!out) {
      const workDir = Bun.spawnSync(["bun", join(import.meta.dir, "current-work-dir.ts")]);
      const base = workDir.exitCode === 0 && workDir.stdout.toString().trim()
        ? join(workDir.stdout.toString().trim(), "clips")
        : join(process.env.HOME!, "Downloads");
      out = join(base, `clip-${fmtTime(args.start).replace(/[:.]/g, "")}-${fmtTime(args.end).replace(/[:.]/g, "")}.mp4`);
    }
    mkdirSync(dirname(out), { recursive: true });

    // Filter chain: crop → even dims → captions → speed. Captions come after
    // the geometry so the lower third is the FINAL frame's lower third.
    const vf: string[] = [];
    if (args.aspect === "9:16") vf.push(`crop=ih*9/16:ih:(iw-ih*9/16)*${args.cropX}:0`);
    if (args.aspect === "1:1") vf.push(`crop=ih:ih:(iw-ih)*${args.cropX}:0`);
    vf.push("scale=trunc(iw/2)*2:trunc(ih/2)*2");
    if (srtPath) {
      const style = "FontName=Helvetica,Bold=1,FontSize=15,PrimaryColour=&H00FFFFFF," +
        "BorderStyle=3,Outline=1,Shadow=0,BackColour=&HA0000000,Alignment=2,MarginV=32";
      vf.push(`subtitles=${srtPath}:force_style='${style}'`);
    }
    if (args.speed !== 1.0) vf.push(`setpts=PTS/${args.speed}`);

    const cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"];
    if (offsetInWorkFile > 0) cmd.push("-ss", String(offsetInWorkFile));
    cmd.push("-i", workFile, "-t", String(requested));
    cmd.push("-vf", vf.join(","));
    if (args.speed !== 1.0) cmd.push("-filter:a", `atempo=${args.speed}`);
    cmd.push(
      "-c:v", "libx264", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
      "-crf", "20", "-maxrate", "6M", "-bufsize", "12M", "-preset", "medium",
      "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
      "-movflags", "+faststart", out,
    );
    await run(cmd, "ffmpeg encode");

    // Verify what we actually produced — the claim is the file, not the command.
    const bytes = statSync(out).size;
    const duration = await probeDuration(out);
    const streams = JSON.parse(await run(
      ["ffprobe", "-v", "error", "-show_streams", "-of", "json", out], "ffprobe streams",
    ));
    const v = streams.streams.find((s: any) => s.codec_type === "video");
    const a = streams.streams.find((s: any) => s.codec_type === "audio");
    const expected = requested / args.speed;

    const summary = {
      out,
      duration_s: Number(duration.toFixed(3)),
      expected_s: Number(expected.toFixed(3)),
      drift_s: Number((duration - expected).toFixed(3)),
      size_mb: Number((bytes / 1024 / 1024).toFixed(2)),
      video: v ? `${v.codec_name} ${v.profile} ${v.width}x${v.height} ${v.pix_fmt}` : null,
      audio: a ? `${a.codec_name} ${a.sample_rate}Hz` : null,
      captions: Boolean(srtPath),
      x_size_ok: bytes <= Math.min(X_MAX_BYTES, args.maxMb * 1024 * 1024),
      x_standard_duration_ok: duration <= X_STANDARD_MAX_SECONDS,
    };

    if (!summary.x_size_ok) {
      die(`output is ${summary.size_mb}MB, over the ${args.maxMb}MB ceiling — re-run with a shorter range or --aspect 9:16`);
    }
    // A clip shorter than asked means the range ran off the end of the source or
    // the cut landed wrong. Silently shipping it is how a post goes out with the
    // punchline missing.
    if (Math.abs(summary.drift_s) > 0.5) {
      die(`clip is ${summary.duration_s}s but ${summary.expected_s}s was requested (drift ${summary.drift_s}s) — the range likely runs past the source. Output left at ${out} for inspection.`);
    }

    if (args.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`Clip: ${out}`);
      console.log(`  ${summary.duration_s}s (asked ${summary.expected_s}s, drift ${summary.drift_s}s) · ${summary.size_mb}MB`);
      console.log(`  ${summary.video} · ${summary.audio}${summary.captions ? " · captions burned in" : ""}`);
      if (!summary.x_standard_duration_ok) {
        console.log(`  Note: ${summary.duration_s}s exceeds X's ${X_STANDARD_MAX_SECONDS}s standard limit — needs a Premium account.`);
      }
    }
  } finally {
    if (!args.keepTemp) rmSync(temp, { recursive: true, force: true });
    else console.error(`(temp kept: ${temp})`);
  }
}

main().catch((err) => {
  console.error(`ClipSource: ${err?.message || err}`);
  process.exit(1);
});
