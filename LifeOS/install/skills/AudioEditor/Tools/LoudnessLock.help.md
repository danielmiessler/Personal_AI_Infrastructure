# LoudnessLock

Deterministic delivery-loudness finalizer. Target: **−14 LUFS integrated, ≤ −1 dBTP true peak** (the YouTube delivery standard — YouTube turns louder content down and leaves quieter content sounding weak).

## Usage

```bash
# Measure only — PASS/FAIL against target (exit 0 = within ±0.5 LU and TP ≤ −1dBTP)
bun ${LIFEOS_SKILL_DIR}/Tools/LoudnessLock.ts <media>

# Normalize — two-pass loudnorm (linear), video copied, self re-measured
bun ${LIFEOS_SKILL_DIR}/Tools/LoudnessLock.ts <media> --out <out.mp4> [--target -14] [--tp -1] [--abr 256k]
```

## Contract

- Normalize mode exits 0 **only after re-measuring its own output** within tolerance.
- Video stream is bit-copied; only audio re-encodes (AAC, source sample rate).
- Order in the export pipeline: ValidateExport → GateScan → **LoudnessLock** → GateScan again on the locked file → ear-check clips.
- Creative leveling still happens in the editor (Descript); this is the delivery lock, not a replacement for the mix pass.
