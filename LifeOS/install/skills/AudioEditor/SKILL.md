---
name: AudioEditor
version: 1.0.26
description: "AI audio editing pipeline: Whisper word-level transcription → Claude segment classification (KEEP/CUT_FILLER/CUT_FALSE_START/CUT_STUTTER/CUT_DEAD_AIR) → ffmpeg with 40ms qsin crossfades and room-tone fill → optional Cleanvoice cloud polish; plus GateScan/GateRepair for noise-gate ticking artifacts. Modes: --preview, --aggressive, --polish. Workflow: Clean. USE WHEN clean audio, edit audio, remove filler words, clean podcast, remove ums, cut dead air, polish audio, trim recording, cut stutters, ticking audio, clicking audio, audio clicks, gate artifacts, popping audio. NOT FOR video composition (use Remotion)."
---

# AudioEditor

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/AudioEditor/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## Voice Notification

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the AudioEditor skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **AudioEditor** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

## What It Does

Cleans recorded audio automatically — strips filler words, false starts, stutters, and dead air, attenuates breaths, and crossfades every cut. It transcribes the file at the word level, has Claude classify each segment (KEEP, CUT_FILLER, CUT_FALSE_START, CUT_STUTTER, CUT_DEAD_AIR), then executes the cuts with ffmpeg. An optional Cleanvoice pass adds final polish. Modes: --preview, --aggressive, --polish.

## The Problem

Cleaning a recording by hand means scrubbing a waveform for every "um," half-started sentence, and three-second silence, then crossfading each cut so it doesn't click. It's slow and tedious, and a blunt auto-tool over-cuts — it kills the rhetorical pause along with the accidental one, or leaves an audible seam where it spliced. This pipeline tells deliberate pauses apart from dead air, fills gaps with room tone, and crossfades each edit, so the output sounds clean rather than chopped.

## How It Works

Whisper produces word-level timestamps, Claude classifies each segment (distinguishing rhetorical emphasis from accidental repetition), and ffmpeg executes the cuts with 40ms qsin crossfades, room-tone gap fill, and breath attenuation at 50% volume rather than removal. An optional Cleanvoice API pass handles mouth-sound removal, residual filler, and loudness normalization.

### Pipeline

```
Audio Input
    |
[Transcribe] Whisper word-level timestamps (insanely-fast-whisper on MPS)
    |
[Analyze] Claude classifies each segment:
    |   KEEP / CUT_FILLER / CUT_FALSE_START / CUT_EDIT_MARKER / CUT_STUTTER / CUT_DEAD_AIR
    |   Distinguishes rhetorical emphasis from accidental repetition
    |
[Edit] ffmpeg executes cuts:
    |   - 40ms qsin crossfades at every edit point
    |   - Room tone extraction and gap filling
    |   - Breath attenuation (50% volume, not removal)
    |
[Polish] (optional) Cleanvoice API final pass:
        - Mouth sound removal
        - Remaining filler detection
        - Loudness normalization

Output: cleaned MP3/WAV
```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Clean** | "clean audio", "edit audio", "remove filler words", "clean podcast", "remove ums", "cut dead air", "polish audio" | `Workflows/Clean.md` |

## Tools

| Tool | Command | Purpose |
|------|---------|---------|
| **Transcribe** | `bun ${LIFEOS_SKILL_DIR}/Tools/Transcribe.ts <file>` | Word-level transcription via Whisper |
| **Analyze** | `bun ${LIFEOS_SKILL_DIR}/Tools/Analyze.ts <transcript.json>` | LLM-powered edit classification |
| **Edit** | `bun ${LIFEOS_SKILL_DIR}/Tools/Edit.ts <file> <edits.json>` | Execute cuts with crossfades + room tone |
| **Polish** | `bun ${LIFEOS_SKILL_DIR}/Tools/Polish.ts <file>` | Cleanvoice API cloud polish |
| **Pipeline** | `bun ${LIFEOS_SKILL_DIR}/Tools/Pipeline.ts <file> [--polish]` | Full end-to-end pipeline |
| **GateScan** | `bun ${LIFEOS_SKILL_DIR}/Tools/GateScan.ts <file> [--json]` | Detect noise-gate ticking (silence-boundary steps); exit 1 on defects |
| **GateRepair** | `bun ${LIFEOS_SKILL_DIR}/Tools/GateRepair.ts <in> <out.mp4> --finalize [--abr 192k]` | Repair gate ticking; --finalize iterates until the ENCODED file scans clean |
| **LoudnessLock** | `bun ${LIFEOS_SKILL_DIR}/Tools/LoudnessLock.ts <in> [--out <out.mp4>]` | Measure or lock delivery loudness to −14 LUFS / −1dBTP (YouTube standard); self re-measures, exit 0 only in tolerance |

## Gate Artifacts (on-report only — routine checks retired 2026-07-15)

Capture-chain noise gates (recorder filters, macOS Voice Isolation) truncate audio to digital zero with no fade; leveling amplifies each edge into an audible tick — the 2026-07-13 incident (774 edges, two public launch videos, listener complaints). The class was root-fixed at capture: {{PRINCIPAL_NAME}} removed the OBS noise-gate filter from the mic chain 2026-07-14, and on 2026-07-15 directed the routine per-export GateScan checks REMOVED from the standard workflows — don't re-scan every export.

**When someone actually reports ticking/clicking in audio:** `GateScan` the file to confirm (sample-domain steps, exit 1 on defects), `GateRepair --finalize` to fix (repair before leveling when possible; scan the final ENCODE, not the intermediate WAV — AAC re-introduces steps near silence). If a RAW recording scans dirty, a capture-chain gate is back on — surface it.

## API Keys Required

| Service | Env Var | Where to Get |
|---------|---------|-------------|
| Anthropic (for analyze step) | `ANTHROPIC_API_KEY` | Already set via Claude Code |
| Cleanvoice (for polish step, optional) | `CLEANVOICE_API_KEY` | cleanvoice.ai Dashboard Settings API Key |

## Examples

**Example 1: Clean a podcast recording**
```
User: "clean up the audio on this podcast file"
-> Invokes Clean workflow
-> Runs full pipeline: transcribe -> analyze -> edit
-> Outputs cleaned MP3 with filler words, stutters, and dead air removed
```

**Example 2: Preview edits before applying**
```
User: "show me what edits you'd make to this recording"
-> Invokes Clean workflow with --preview flag
-> Transcribes and analyzes, shows proposed edits without modifying audio
-> User reviews edit list, then runs again to apply
```

**Example 3: Aggressive clean with cloud polish**
```
User: "aggressively clean this audio and polish it"
-> Invokes Clean workflow with --aggressive --polish flags
-> Tighter thresholds for filler detection
-> Cleanvoice API pass for mouth sounds and normalization
```

## Gotchas

- **Transcription accuracy varies with audio quality.** Background noise, multiple speakers, and accents reduce accuracy.
- **Cut detection is heuristic-based.** Always preview edits before committing — automated cuts can remove intentional pauses.
- **Cloud polish uploads audio to external service.** Confirm the user is okay with cloud processing for sensitive content.
- **dB-domain cliff detectors false-positive on fade feet.** A legitimate cosine fade into digital zero has infinite dB slope at its foot, so any >NdB/2ms detector flags it forever. Verify repairs with sample-domain STEP detection (GateScan), never dB slopes. (2026-07-13)
- **One-sided iterative fades don't converge on stray boundary impulses.** A single sample sitting on a gate boundary survives repeated one-sided fades; fade-down-then-up "mutes" preserve a blip's edges and its leading step. The V-notch (cosine to zero at the boundary, both sides) and hard-zeroing inside gated silence are the converging fixes. (2026-07-13)
- **Meter-clean ≠ ear-clean.** Scanners find ticks; repairs can create audible holes the tick-scanner calls clean (the 2026-07-12 duck incident). Match the probe to the defect class a human hears, keep repairs minimal-touch, and give the principal before/after listen clips at swap time.

## Execution Log

After completing any workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"AudioEditor","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.claude/LIFEOS/MEMORY/SKILLS/execution.jsonl
```

Replace `WORKFLOW_USED` with the workflow executed, `8_WORD_SUMMARY` with a brief input description, and `SECONDS` with approximate wall-clock time. Log `status: "error"` if the workflow failed.
