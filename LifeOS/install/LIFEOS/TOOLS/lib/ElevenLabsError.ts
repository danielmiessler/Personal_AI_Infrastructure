/**
 * ElevenLabsError.ts — read the human message out of an ElevenLabs error body.
 *
 * ElevenLabs answers a failed request with
 * `{"detail":{"type":"…","code":"quota_exceeded","message":"…"}}`. Doctor's
 * TTS probe keeps only the first 200 characters of that body, so a long
 * message arrives as cut-off JSON. This helper returns the message either
 * way, or null when the body is not that shape (HTML from a proxy, empty).
 */
export function elevenLabsMessage(body: string): string | null {
  try {
    const msg = JSON.parse(body)?.detail?.message;
    return typeof msg === 'string' && msg.length > 0 ? msg : null;
  } catch {
    const m = body.match(/"message"\s*:\s*"([^"]*)/);
    return m?.[1] || null;
  }
}
