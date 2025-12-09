import type { TTSProvider, AudioResult } from '.';

export class ElevenLabs implements TTSProvider {
  readonly name = 'elevenlabs';

  private get apiKey() { return process.env.ELEVENLABS_API_KEY; }
  private get voiceId() { return process.env.ELEVENLABS_VOICE_ID || 's3TPKV1kjDlVtZbl4Ksh'; }
  private get model() { return process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'; }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async synthesize(text: string, voiceId?: string): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voice = voiceId || this.voiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: this.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes('model') || response.status === 422) {
        throw new Error(`ElevenLabs API error: Invalid model "${this.model}". Update ELEVENLABS_MODEL in ~/.env`);
      }
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return { audio: Buffer.from(audioBuffer), format: 'mp3' };
  }
}
