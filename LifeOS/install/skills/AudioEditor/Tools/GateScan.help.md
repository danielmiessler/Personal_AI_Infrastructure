# GateScan

Detects noise-gate truncation artifacts (audible "ticking") in any audio or video file.

## Usage

```bash
bun ${LIFEOS_SKILL_DIR}/Tools/GateScan.ts <media-file> [--json] [--step-thresh 0.03] [--sil-thresh 0.006]
```

## Output

- **STEPS** — one-sample amplitude jumps adjacent to near-silence: the audible gate ticks. Any STEP fails the scan (exit 1).
- **cliffs** — >28dB/2ms RMS edges (informational only): counts gate activity even when smoothed; a legitimate fade into digital zero also trips this, so it never fails a file on its own.

## Exit codes

- `0` — clean (zero STEPs)
- `1` — STEP defects found
- `2` — decode/probe error

## When to run (the gate)

1. On the RAW source before any leveling/gain/compression — if it shows gate activity, run GateRepair BEFORE leveling.
2. On the FINAL ENCODED export before any upload — AAC encoding re-introduces steps near silence; scan the encode, not the intermediate WAV.
