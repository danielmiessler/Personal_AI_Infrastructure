import { spawnSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { platform } from 'os';
import type { TTSProvider, AudioResult } from '.';

export class MacOSSay implements TTSProvider {
  readonly name = 'macos-say';

  isAvailable(): boolean {
    return platform() === 'darwin';
  }

  async synthesize(text: string, voiceId?: string): Promise<AudioResult> {
    const voice = voiceId || 'Samantha';
    const outputFile = `/tmp/say-${Date.now()}.aiff`;

    const result = spawnSync('/usr/bin/say', ['-v', voice, '-o', outputFile, text]);

    if (result.error) throw new Error(`say error: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`say exited with code ${result.status}`);

    const audio = readFileSync(outputFile);
    unlinkSync(outputFile);

    // macOS say outputs AIFF, which afplay can handle
    return { audio, format: 'wav' }; // AIFF is close enough to WAV for playback
  }
}
