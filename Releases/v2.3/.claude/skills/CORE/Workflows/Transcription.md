# Transcription Workflow

Extract transcripts from audio and video files using local faster-whisper or OpenAI Whisper API.

## When to Use

- "transcribe this audio/video file"
- "extract transcript from recording.m4a"
- "convert speech to text"
- "batch transcribe folder of recordings"
- "generate subtitles for video"

## Tools Available

**Location:** `~/.claude/skills/CORE/Tools/`

| Tool | Purpose | Backend |
|------|---------|---------|
| `extract-transcript.py` | Local transcription (recommended) | faster-whisper |
| `ExtractTranscript.ts` | API transcription | OpenAI Whisper API |
| `SplitAndTranscribe.ts` | Large files (>25MB) | OpenAI + splitting |

## Quick Usage

### Single File (Local - Recommended)

```bash
cd ~/.claude/skills/CORE/Tools
uv run extract-transcript.py /path/to/audio.m4a
```

### Single File (OpenAI API)

```bash
bun ~/.claude/skills/CORE/Tools/ExtractTranscript.ts /path/to/audio.m4a
```

### Batch Processing (Local)

```bash
uv run extract-transcript.py /path/to/folder/ --batch
```

## Model Selection (Local)

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| `tiny.en` | 75MB | Fastest | Basic | Quick drafts |
| `base.en` | 150MB | Fast | Good | **General use (default)** |
| `small.en` | 500MB | Medium | Very Good | Important recordings |
| `medium` | 1.5GB | Slow | Excellent | Production quality |
| `large-v3` | 3GB | Slowest | Best | Critical accuracy |

```bash
# Specify model
uv run extract-transcript.py audio.m4a --model small.en
```

## Output Formats

| Format | Use Case |
|--------|----------|
| `txt` | Plain text transcript (default) |
| `json` | Structured data with timestamps |
| `srt` | SubRip subtitles |
| `vtt` | WebVTT subtitles |

```bash
# Specify format
uv run extract-transcript.py audio.m4a --format srt
```

## Supported Input Formats

**Audio:** m4a, mp3, wav, flac, ogg, aac, wma
**Video:** mp4, mov, avi, mkv, webm, flv

## Examples

### Example 1: Meeting Recording

```bash
uv run extract-transcript.py ~/Documents/team-meeting.m4a
# Output: ~/Documents/team-meeting.txt
```

### Example 2: Video with Subtitles

```bash
uv run extract-transcript.py ~/Videos/tutorial.mp4 --format srt
# Output: ~/Videos/tutorial.srt
```

### Example 3: High Accuracy Interview

```bash
uv run extract-transcript.py interview.m4a --model large-v3 --format json
# Output: interview.json with timestamps
```

### Example 4: Batch Process Podcast Episodes

```bash
uv run extract-transcript.py ~/Podcasts/season-1/ --batch --model base.en
# Output: One .txt file per episode
```

### Example 5: Custom Output Directory

```bash
uv run extract-transcript.py recording.m4a --output ~/Transcripts/
# Output: ~/Transcripts/recording.txt
```

## Performance

**Local (faster-whisper):**
- 4x faster than original OpenAI Whisper
- 50% less memory usage
- 100% offline, no API costs
- 1 hour audio = ~15-20 minutes processing (base.en)

**API (OpenAI):**
- 25MB file size limit
- ~$0.006 per minute of audio
- Fast turnaround but requires internet

## Choosing Between Local vs API

| Factor | Local (faster-whisper) | API (OpenAI) |
|--------|------------------------|--------------|
| Privacy | 100% offline | Data sent to OpenAI |
| Cost | Free | $0.006/minute |
| Speed | Depends on hardware | Fast |
| File Size | No limit | 25MB max |
| Accuracy | Excellent (same model) | Excellent |

**Recommendation:** Use local (`extract-transcript.py`) unless you need API-specific features or don't have adequate hardware.

## Troubleshooting

**Dependencies installing on first run:**
Normal - UV auto-installs faster-whisper into isolated environment (~30 seconds first time)

**Model downloading:**
Normal - Models auto-download from HuggingFace on first use

**Slow transcription:**
Use smaller model (`--model tiny.en`) or upgrade hardware

**Poor accuracy:**
Use larger model (`--model small.en` or `--model large-v3`)

**UV not found:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**File too large for API (>25MB):**
Use local transcription instead, or use `SplitAndTranscribe.ts`
