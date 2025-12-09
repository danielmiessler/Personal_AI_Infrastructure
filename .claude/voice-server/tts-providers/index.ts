import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type AudioFormat = 'mp3' | 'wav';

export interface AudioResult {
  audio: Buffer;
  format: AudioFormat;
}

export interface TTSProvider {
  isAvailable(): boolean;
  synthesize(text: string, voiceId?: string): Promise<AudioResult>;
}

export interface ProviderResult {
  provider: TTSProvider;
  name: string;
}

export { ElevenLabs } from './ElevenLabs';
export { Piper } from './Piper';
export { MacOSSay } from './MacOSSay';

// Maps config.json provider names to their constructors
const providerConstructorsFromConfigNames: Record<string, () => TTSProvider> = {
  'elevenlabs': () => new (require('./ElevenLabs').ElevenLabs)(),
  'piper': () => new (require('./Piper').Piper)(),
  'macos-say': () => new (require('./MacOSSay').MacOSSay)(),
};

/**
 * Load the first available TTS provider based on config.json order.
 * Returns null if config.json is missing or no providers are available.
 */
export function loadProvider(configDir: string): ProviderResult | null {
  const configPath = join(configDir, 'config.json');

  if (!existsSync(configPath)) {
    return null;
  }

  let providerOrder: string[] = [];
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (Array.isArray(config.providers)) {
      providerOrder = config.providers;
    }
  } catch {
    return null;
  }

  for (const name of providerOrder) {
    const create = providerConstructorsFromConfigNames[name];
    if (create) {
      const provider = create();
      if (provider.isAvailable()) {
        return { provider, name };
      }
    }
  }

  return null;
}
