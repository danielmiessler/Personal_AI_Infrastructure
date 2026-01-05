# Voice Server Extra Args Configuration

**Date:** 2026-01-05
**Status:** Approved
**Package:** kai-voice-system

## Problem

The voice server hardcodes audio player arguments, making it impossible to configure platform-specific settings like PulseAudio output (`-o pulse`) needed for container environments.

## Solution

Add `VOICE_SERVER_EXTRA_ARGS` configuration that appends custom arguments to all audio players.

## Configuration

### Environment Variable
```bash
# In $PAI_DIR/.env
VOICE_SERVER_EXTRA_ARGS="-o pulse"
```

### CLI Flag
```bash
bun run server.ts --extra-args="-o pulse"
```

### Precedence
CLI `--extra-args` > `VOICE_SERVER_EXTRA_ARGS` env var > empty

## Implementation

### 1. Add `findPlayer()` function (replaces hardcoded paths)

```typescript
import { execSync } from 'child_process';

function findPlayer(name: string): string | null {
  try {
    return execSync(`which ${name}`, { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}
```

### 2. Add CLI argument parsing

```typescript
import { parseArgs } from 'util';

const cliArgs = parseArgs({
  args: process.argv.slice(2),
  options: {
    'extra-args': { type: 'string', default: '' },
  },
});
```

### 3. Add `getExtraArgs()` function

```typescript
function getExtraArgs(): string[] {
  const raw = cliArgs.values['extra-args'] || process.env.VOICE_SERVER_EXTRA_ARGS || '';
  return raw.trim() ? raw.trim().split(/\s+/) : [];
}
```

### 4. Update `playAudio()` function

**Before (hardcoded paths, separate if blocks):**
```typescript
if (existsSync('/usr/bin/mpg123')) {
  player = '/usr/bin/mpg123';
  args = ['-q', tempFile];
} else if (existsSync('/usr/bin/mpv')) {
  player = '/usr/bin/mpv';
  args = ['--no-terminal', tempFile];
} else if (existsSync('/snap/bin/mpv')) {
  player = '/snap/bin/mpv';
  args = ['--no-terminal', tempFile];
}
```

**After (dynamic detection with extra args):**
```typescript
// Linux: use which to find player
const mpg123 = findPlayer('mpg123');
const mpv = findPlayer('mpv');

if (mpg123) {
  player = mpg123;
  playerArgs = ['-q', tempFile, ...getExtraArgs()];
} else if (mpv) {
  player = mpv;
  playerArgs = ['--no-terminal', tempFile, ...getExtraArgs()];
}

// Mac: afplay (always at /usr/bin/afplay)
if (process.platform === 'darwin') {
  player = '/usr/bin/afplay';
  playerArgs = [tempFile, ...getExtraArgs()];
}
```

### 5. Add startup logging

```typescript
const extraArgs = getExtraArgs();
if (extraArgs.length > 0) {
  console.log(`[Voice Server] Extra player args: ${extraArgs.join(' ')}`);
}
```

## Files Changed

| File | Changes |
|------|---------|
| `src/voice/server.ts` | Add findPlayer(), getExtraArgs(), CLI parsing, update playAudio() |
| `README.md` | Document VOICE_SERVER_EXTRA_ARGS configuration |

## README Addition

Add to README.md after "Google Cloud TTS Voices" section:

````markdown
### Audio Player Arguments

Configure extra arguments for audio players (useful for containers or specific audio setups):

**Environment Variable:**
```bash
# In $PAI_DIR/.env
VOICE_SERVER_EXTRA_ARGS="-o pulse"
```

**CLI Flag (overrides env var):**
```bash
bun run server.ts --extra-args="-o pulse"
```

**Common use cases:**
| Use Case | Configuration |
|----------|---------------|
| Container with PulseAudio | `VOICE_SERVER_EXTRA_ARGS="-o pulse"` |
| Specific ALSA device | `VOICE_SERVER_EXTRA_ARGS="-o alsa -a hw:1,0"` |

### Devcontainer Setup

To use voice notifications inside a devcontainer:

1. **Mount PulseAudio socket** from host in `devcontainer.json`
2. **Set `VOICE_SERVER_EXTRA_ARGS`** in your `.env` file

**Example `devcontainer.json`:**
```json
{
  "name": "My Devcontainer",
  "image": "mcr.microsoft.com/devcontainers/python:2-3.12-bullseye",
  "mounts": [
    "source=/run/user/1000/pulse,target=/run/user/1000/pulse,type=bind"
  ],
  "runArgs": [
    "--device=/dev/snd:/dev/snd"
  ],
  "containerEnv": {
    "PULSE_SERVER": "unix:/run/user/1000/pulse/native"
  }
}
```

**In your `$PAI_DIR/.env`:**
```bash
VOICE_SERVER_EXTRA_ARGS="-o pulse"
```

**Key points:**
- Mount `/run/user/1000/pulse` to access host's PulseAudio
- Set `PULSE_SERVER` in container so audio apps find the socket
- Set `VOICE_SERVER_EXTRA_ARGS` in `.env` (not devcontainer.json)
````

## Benefits

1. **Flexibility**: Configure audio output without code changes
2. **Container support**: Enable PulseAudio/ALSA in containerized environments
3. **Simplified code**: `which` replaces hardcoded paths
4. **Consistent**: Same extra args apply to all players (mpg123, mpv, afplay)
