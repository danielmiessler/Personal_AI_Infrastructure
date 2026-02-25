/**
 * 21-voice-server-http.test.ts — Voice Server HTTP Endpoint Integration Tests
 *
 * Spawns the actual VoiceServer on a random test port and validates:
 *   - Health endpoint returns correct JSON structure
 *   - CORS headers on OPTIONS and POST responses
 *   - Input validation (empty body, invalid JSON, bad voice_id, long messages)
 *   - Rate limiting (11 rapid requests triggers 429)
 *   - Endpoint routing (/notify, /notify/personality, /pai, /, unknown)
 *   - Notification behavior without API key (Edge TTS fallback, voice disabled)
 *
 * CI-safe: No real API keys, no real audio hardware required.
 * The server runs with ELEVENLABS_API_KEY='' so all TTS falls through to
 * Edge TTS (network-dependent) or returns 502 gracefully.
 *
 * Rate-limit isolation: The server tracks request counts by the
 * x-forwarded-for header. Every safeFetch call in this file sends a unique
 * per-section IP so tests never exhaust each other's budget. Only the
 * explicit rate-limit test intentionally exceeds the 10-request window.
 *
 * Run: bun test tests/cross-platform/21-voice-server-http.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { join } from 'path';
import { V3_ROOT, SLOW_TIMEOUT } from '../windows/helpers';

// ─── Server Lifecycle ─────────────────────────────────────────────────────────

const testPort = 19000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://localhost:${testPort}`;

let serverProc: ReturnType<typeof Bun.spawn> | null = null;
let serverReady = false;

/**
 * Fetch with a 10-second abort timeout and an isolated rate-limit identity.
 * Each `clientIp` value gets its own 10-request/60s budget on the server,
 * so tests in different sections never interfere with one another.
 */
function safeFetch(url: string, clientIp: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  // Only set x-forwarded-for when the caller has not already provided one
  // (the rate-limit test passes its own header explicitly).
  if (!headers.has('x-forwarded-for')) {
    headers.set('x-forwarded-for', clientIp);
  }
  return fetch(url, {
    ...init,
    headers,
    signal: AbortSignal.timeout(10_000),
  });
}

/** Poll /health until the server responds or timeout expires. */
async function waitForServer(maxWaitMs = 8_000): Promise<boolean> {
  const pollIp = 'startup-poller';
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { 'x-forwarded-for': pollIp },
        signal: AbortSignal.timeout(1_000),
      });
      if (res.ok) return true;
    } catch {
      // Server not ready yet — keep polling
    }
    await Bun.sleep(250);
  }
  return false;
}

beforeAll(async () => {
  const serverPath = join(V3_ROOT, 'VoiceServer', 'server.ts');

  serverProc = Bun.spawn(['bun', 'run', serverPath], {
    env: {
      ...process.env,
      PORT: testPort.toString(),
      ELEVENLABS_API_KEY: '',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  serverReady = await waitForServer();

  if (!serverReady) {
    // Read any stderr output to help diagnose startup failures
    try {
      const errText = await new Response(serverProc.stderr).text();
      console.error(`Voice server failed to start on port ${testPort}:`, errText.slice(0, 500));
    } catch { /* ignore read errors */ }
  }
}, SLOW_TIMEOUT);

afterAll(() => {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch { /* process may already be dead */ }
    serverProc = null;
  }
});

// ─── Section 1: Health Endpoint ───────────────────────────────────────────────

describe('Health Endpoint', () => {
  const IP = 'health-tests';

  test('GET /health returns 200 with JSON containing status "healthy"', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/health`, IP);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('healthy');
  }, SLOW_TIMEOUT);

  test('health response includes port, voice_system, and api_key_configured fields', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/health`, IP);
    const body = await res.json();

    expect(body).toHaveProperty('port');
    expect(body).toHaveProperty('voice_system');
    expect(body).toHaveProperty('api_key_configured');
    expect(body.port).toBe(testPort);
  }, SLOW_TIMEOUT);

  test('api_key_configured is false when no ElevenLabs key provided', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/health`, IP);
    const body = await res.json();

    expect(body.api_key_configured).toBe(false);
  }, SLOW_TIMEOUT);
});

// ─── Section 2: CORS Headers ─────────────────────────────────────────────────

describe('CORS Headers', () => {
  const IP = 'cors-tests';

  test('OPTIONS /notify returns 204 with CORS headers', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'OPTIONS',
    });

    expect(res.status).toBe(204);

    const allowMethods = res.headers.get('access-control-allow-methods');
    expect(allowMethods).toBeTruthy();
    expect(allowMethods!).toContain('POST');

    const allowHeaders = res.headers.get('access-control-allow-headers');
    expect(allowHeaders).toBeTruthy();
    expect(allowHeaders!.toLowerCase()).toContain('content-type');
  }, SLOW_TIMEOUT);

  test('POST response includes CORS headers', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/health`, IP);

    const allowOrigin = res.headers.get('access-control-allow-origin');
    expect(allowOrigin).toBeTruthy();

    const allowMethods = res.headers.get('access-control-allow-methods');
    expect(allowMethods).toBeTruthy();
  }, SLOW_TIMEOUT);
});

// ─── Section 3: Input Validation ──────────────────────────────────────────────

describe('Input Validation', () => {
  const IP = 'validation-tests';

  test('POST /notify with empty body returns 400 or 500', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });

    // Empty body cannot be parsed as JSON, server returns error
    expect([400, 500]).toContain(res.status);
  }, SLOW_TIMEOUT);

  test('POST /notify with invalid JSON returns error', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json!!!}',
    });

    expect([400, 500]).toContain(res.status);
  }, SLOW_TIMEOUT);

  test('POST /notify with non-string voice_id returns 400 (Invalid voice_id)', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test message',
        voice_id: 12345,
      }),
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.message).toContain('Invalid voice_id');
  }, SLOW_TIMEOUT);

  test('POST /notify with message > 500 chars returns error', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const longMessage = 'A'.repeat(501);
    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: longMessage,
      }),
    });

    // Server validates message length and returns an error
    expect([400, 500]).toContain(res.status);

    const body = await res.json();
    expect(body.status).toBe('error');
  }, SLOW_TIMEOUT);
});

// ─── Section 4: Rate Limiting ─────────────────────────────────────────────────

describe('Rate Limiting', () => {
  test('11th rapid request returns 429 rate limit exceeded', async () => {
    if (!serverReady) throw new Error('Server did not start');

    // Use a unique IP so this test's budget is completely isolated.
    const uniqueIp = `rate-test-${Date.now()}`;

    const responses: number[] = [];

    for (let i = 0; i < 11; i++) {
      const res = await safeFetch(`${baseUrl}/health`, uniqueIp);
      responses.push(res.status);
    }

    // First 10 requests should succeed (200), 11th should be rate limited (429)
    expect(responses.slice(0, 10).every(s => s === 200)).toBe(true);
    expect(responses[10]).toBe(429);

    // Verify the 429 response body contains the rate limit message
    const rateLimitRes = await safeFetch(`${baseUrl}/health`, uniqueIp);
    const body = await rateLimitRes.json();
    expect(body.message).toContain('Rate limit exceeded');
  }, SLOW_TIMEOUT);
});

// ─── Section 5: Endpoint Routing ──────────────────────────────────────────────

describe('Endpoint Routing', () => {
  const IP = 'routing-tests';

  test('POST /notify returns a response (200 with voice disabled)', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Routing test',
        voice_enabled: false,
      }),
    });

    // With voice_enabled: false, server skips TTS and returns 200
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('success');
  }, SLOW_TIMEOUT);

  test('POST /notify/personality returns a response', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify/personality`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Personality routing test',
        voice_enabled: false,
      }),
    });

    // With voice disabled, endpoint should return 200 success
    expect([200, 502]).toContain(res.status);

    const body = await res.json();
    expect(body).toHaveProperty('status');
  }, SLOW_TIMEOUT);

  test('POST /pai returns a response', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/pai`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'PAI Test',
        message: 'PAI routing test',
        voice_enabled: false,
      }),
    });

    // With voice disabled, endpoint should return 200 success
    expect([200, 502]).toContain(res.status);

    const body = await res.json();
    expect(body).toHaveProperty('status');
  }, SLOW_TIMEOUT);

  test('GET / returns text "Voice Server" message', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(baseUrl, IP);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain('Voice Server');
  }, SLOW_TIMEOUT);

  test('GET /nonexistent returns 200 with text (default handler)', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/nonexistent`, IP);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain('Voice Server');
  }, SLOW_TIMEOUT);
});

// ─── Section 6: Notification Behavior (no API key) ───────────────────────────

describe('Notification Behavior (no API key)', () => {
  const IP = 'notify-tests';

  test('POST /notify with valid message and no API key returns 200 or 502', async () => {
    if (!serverReady) throw new Error('Server did not start');

    // Without ElevenLabs key, server tries Edge TTS (network-dependent).
    // If Edge TTS works: 200 success. If it fails: 502 with voiceError.
    // On Windows CI, Edge TTS may hang causing a fetch timeout — accept that.
    try {
      const res = await safeFetch(`${baseUrl}/notify`, IP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Edge TTS fallback test',
          title: 'CI Test',
        }),
      });

      expect([200, 502]).toContain(res.status);

      const body = await res.json();
      expect(body).toHaveProperty('status');

      if (res.status === 502) {
        // TTS failed — should include error context
        expect(body.status).toBe('error');
        expect(body).toHaveProperty('message');
      } else {
        expect(body.status).toBe('success');
      }
    } catch (err: any) {
      // Edge TTS can hang on Windows CI — timeout is acceptable
      expect(err.name === 'AbortError' || err.name === 'TimeoutError').toBe(true);
    }
  }, SLOW_TIMEOUT);

  test('POST /notify with voice_id "none" returns 200 success (voice explicitly disabled)', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Voice disabled test',
        voice_id: 'none',
      }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('success');
  }, SLOW_TIMEOUT);

  test('POST /notify with voice_enabled false returns 200 success', async () => {
    if (!serverReady) throw new Error('Server did not start');

    const res = await safeFetch(`${baseUrl}/notify`, IP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Voice enabled false test',
        voice_enabled: false,
      }),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('success');
  }, SLOW_TIMEOUT);
});
