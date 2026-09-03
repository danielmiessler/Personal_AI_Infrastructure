/**
 * ElevenLabsError contract tests.
 *
 * Doctor's ElevenLabs probe truncates the error body to 200 characters before
 * reading it, so the parser must survive cut-off JSON, not just well-formed
 * JSON. A non-JSON body (proxy HTML, empty) must yield null so the caller
 * falls back to its own wording.
 *
 * Run: bun test LIFEOS/TOOLS/lib/ElevenLabsError.test.ts
 */
import { describe, expect, test } from 'bun:test';
import { elevenLabsMessage } from './ElevenLabsError';

describe('elevenLabsMessage', () => {
  test('reads detail.message from a complete body', () => {
    const body = '{"detail":{"type":"invalid_request","code":"quota_exceeded","message":"over by 1 credit"}}';
    expect(elevenLabsMessage(body)).toBe('over by 1 credit');
  });

  test('reads the message from a body truncated mid-string', () => {
    const body = '{"detail":{"type":"invalid_request","code":"quota_exceeded","message":"This request exceeds your quota of 34292. You hav';
    expect(elevenLabsMessage(body)).toBe('This request exceeds your quota of 34292. You hav');
  });

  test('returns null for a non-JSON body', () => {
    expect(elevenLabsMessage('<html><body>502 Bad Gateway</body></html>')).toBeNull();
    expect(elevenLabsMessage('')).toBeNull();
  });

  test('returns null when detail.message is missing or empty', () => {
    expect(elevenLabsMessage('{"detail":{"code":"quota_exceeded","message":""}}')).toBeNull();
    expect(elevenLabsMessage('{"detail":"plain string"}')).toBeNull();
  });
});
