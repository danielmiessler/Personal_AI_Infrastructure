# GateRepair

Repairs hard noise-gate truncation artifacts ("ticking") in recorded speech: 6ms raised-cosine ramps at every gate edge, hard-zeroed gate-chatter blips, V-notch safety sweep for residual boundary steps. Minimal-touch — audio outside repair windows passes through untouched. Video stream is bit-copied in `--finalize` mode.

## Usage

```bash
# Repaired WAV only
bun ${LIFEOS_SKILL_DIR}/Tools/GateRepair.ts <in-media> <out.wav>

# Full pipeline: repair → AAC encode + video copy → scan ENCODED file → iterate to clean
bun ${LIFEOS_SKILL_DIR}/Tools/GateRepair.ts <in-media> <out.mp4> --finalize [--abr 192k]
```

## Verification contract

`--finalize` exits 0 only when the ENCODED output has zero silence-boundary steps (GateScan STEP criterion). Always follow with a duration check against the source and (for video) frame-count validation.

## Provenance

Built 2026-07-13 from the launch-video ticking incident (774 gate edges in a 13-min recording, amplified ~14dB by leveling, shipped to two public videos). Method details and false-positive gotchas: AudioEditor SKILL.md § Gotchas.
