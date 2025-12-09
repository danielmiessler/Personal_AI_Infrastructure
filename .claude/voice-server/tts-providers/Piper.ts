import { spawnSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { TTSProvider, AudioResult } from '.';

interface VoiceConfig {
  model: string;
  speaker: number;
}

export class Piper implements TTSProvider {
  readonly name = 'piper';
  private baseDir: string;
  private binary: string;
  private modelsDir: string;
  private voices: Record<string, VoiceConfig> = {};

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(import.meta.dir, '..');
    const configPath = join(this.baseDir, 'voices.json');

    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      this.binary = join(this.baseDir, config.piper?.binary || 'piper-bin/piper/piper');
      this.modelsDir = join(this.baseDir, config.piper?.models_dir || 'piper-voices');
      this.voices = config.voices || {};
    } else {
      this.binary = join(this.baseDir, 'piper-bin/piper/piper');
      this.modelsDir = join(this.baseDir, 'piper-voices');
    }
  }

  isAvailable(): boolean {
    return existsSync(this.binary);
  }

  async synthesize(text: string, voiceId?: string): Promise<AudioResult> {
    const voice = this.voices[voiceId || 'default'] || { model: 'en_US-libritts_r-medium', speaker: 0 };
    const modelPath = join(this.modelsDir, `${voice.model}.onnx`);

    if (!existsSync(modelPath)) {
      throw new Error(`Piper model not found: ${modelPath}`);
    }

    // Use Piper's native WAV output instead of manual PCM conversion
    const outputFile = `/tmp/piper-${Date.now()}.wav`;

    const result = spawnSync(this.binary, [
      '--model', modelPath,
      '--speaker', voice.speaker.toString(),
      '--output_file', outputFile,
      '--quiet'
    ], { input: text, maxBuffer: 10 * 1024 * 1024 });

    if (result.error) throw new Error(`Piper error: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`Piper failed: ${result.stderr?.toString()}`);

    const audio = readFileSync(outputFile);
    unlinkSync(outputFile);

    return { audio, format: 'wav' };
  }
}
