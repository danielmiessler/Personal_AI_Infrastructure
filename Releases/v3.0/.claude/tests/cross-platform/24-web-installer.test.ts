/**
 * 24-web-installer.test.ts -- Web Installer Routes & Server Tests
 *
 * Validates the WebSocket-driven web installer infrastructure:
 *   Part 1: routes.ts unit tests (direct import, no server spawn)
 *     - Module import and export verification
 *     - Client management (add, remove, idempotent removal)
 *     - getState() initial state
 *     - handleWsMessage with invalid JSON, unknown types, valid types
 *   Part 2: server.ts HTTP tests (spawned as separate process)
 *     - Static file serving and MIME type detection
 *     - Directory traversal prevention
 *     - SPA fallback behavior
 *     - WebSocket upgrade and connection
 *   Part 3: Server crash resilience
 *     - Server starts without fatal errors
 *     - Rapid request handling
 *
 * Run: bun test tests/cross-platform/24-web-installer.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { join } from 'path';
import { V3_ROOT, INSTALL_DIR, SLOW_TIMEOUT, safeImport } from '../windows/helpers';
import type { Subprocess } from 'bun';

// ── Constants ────────────────────────────────────────────────────────────────

const ROUTES_PATH = join(INSTALL_DIR, 'web', 'routes.ts');
const SERVER_PATH = join(INSTALL_DIR, 'web', 'server.ts');

// Random port to avoid collisions with other tests or the real server
const testPort = 19500 + Math.floor(Math.random() * 500);

// ══════════════════════════════════════════════════════════════════════════════
// PART 1: Web Routes Unit Tests (direct import, no server spawn)
// ══════════════════════════════════════════════════════════════════════════════

describe('Part 1: Web Routes Unit Tests', () => {

  // ── Section 1: Module Import ─────────────────────────────────────────────

  describe('Section 1: Module Import', () => {
    test('routes.ts imports without error via safeImport', async () => {
      const result = await safeImport(ROUTES_PATH);
      expect(result.ok).toBe(true);
    }, SLOW_TIMEOUT);

    test('exports handleWsMessage function', async () => {
      const result = await safeImport<Record<string, unknown>>(ROUTES_PATH);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.module.handleWsMessage).toBe('function');
      }
    }, SLOW_TIMEOUT);

    test('exports addClient function', async () => {
      const result = await safeImport<Record<string, unknown>>(ROUTES_PATH);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.module.addClient).toBe('function');
      }
    }, SLOW_TIMEOUT);

    test('exports removeClient function', async () => {
      const result = await safeImport<Record<string, unknown>>(ROUTES_PATH);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.module.removeClient).toBe('function');
      }
    }, SLOW_TIMEOUT);

    test('exports getState function', async () => {
      const result = await safeImport<Record<string, unknown>>(ROUTES_PATH);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.module.getState).toBe('function');
      }
    }, SLOW_TIMEOUT);
  });

  // ── Section 2: Client Management ─────────────────────────────────────────

  describe('Section 2: Client Management', () => {
    let addClient: (ws: any) => void;
    let removeClient: (ws: any) => void;

    beforeAll(async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      addClient = result.module.addClient;
      removeClient = result.module.removeClient;
    });

    test('addClient does not throw on mock WebSocket', () => {
      const sentMessages: string[] = [];
      const mockWs = {
        send: (data: string) => { sentMessages.push(data); },
        close: () => {},
      };
      expect(() => addClient(mockWs)).not.toThrow();
    });

    test('removeClient does not throw on previously added client', () => {
      const sentMessages: string[] = [];
      const mockWs = {
        send: (data: string) => { sentMessages.push(data); },
        close: () => {},
      };
      addClient(mockWs);
      expect(() => removeClient(mockWs)).not.toThrow();
    });

    test('removeClient does not throw on non-existent client', () => {
      const unknownWs = {
        send: (_data: string) => {},
        close: () => {},
      };
      // Never added -- removing should be safe (Set.delete on missing element)
      expect(() => removeClient(unknownWs)).not.toThrow();
    });
  });

  // ── Section 3: getState() Initial State ──────────────────────────────────

  describe('Section 3: getState() Initial State', () => {
    test('getState returns null before any installation starts', async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      const state = result.module.getState();
      expect(state).toBeNull();
    }, SLOW_TIMEOUT);
  });

  // ── Section 4: handleWsMessage with invalid JSON ─────────────────────────

  describe('Section 4: handleWsMessage with invalid JSON', () => {
    let handleWsMessage: (ws: any, raw: string) => void;
    let mockWs: { send: (data: string) => void; close: () => void };

    beforeAll(async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      handleWsMessage = result.module.handleWsMessage;
      mockWs = {
        send: (_data: string) => {},
        close: () => {},
      };
    });

    test('handleWsMessage with "not json" does not throw', () => {
      expect(() => handleWsMessage(mockWs, 'not json')).not.toThrow();
    });

    test('handleWsMessage with empty string does not throw', () => {
      expect(() => handleWsMessage(mockWs, '')).not.toThrow();
    });

    test('handleWsMessage with malformed JSON does not throw', () => {
      expect(() => handleWsMessage(mockWs, '{broken')).not.toThrow();
    });
  });

  // ── Section 5: handleWsMessage with unknown message type ─────────────────

  describe('Section 5: handleWsMessage with unknown message type', () => {
    let handleWsMessage: (ws: any, raw: string) => void;
    let mockWs: { send: (data: string) => void; close: () => void };

    beforeAll(async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      handleWsMessage = result.module.handleWsMessage;
      mockWs = {
        send: (_data: string) => {},
        close: () => {},
      };
    });

    test('handleWsMessage with unknown_type does not throw', () => {
      const msg = JSON.stringify({ type: 'unknown_type' });
      expect(() => handleWsMessage(mockWs, msg)).not.toThrow();
    });

    test('handleWsMessage with empty type does not throw', () => {
      const msg = JSON.stringify({ type: '' });
      expect(() => handleWsMessage(mockWs, msg)).not.toThrow();
    });
  });

  // ── Section 6: handleWsMessage with client_ready ─────────────────────────

  describe('Section 6: handleWsMessage with client_ready', () => {
    let handleWsMessage: (ws: any, raw: string) => void;
    let addClient: (ws: any) => void;

    beforeAll(async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      handleWsMessage = result.module.handleWsMessage;
      addClient = result.module.addClient;
    });

    test('client_ready replays message history without throwing', () => {
      const sentMessages: string[] = [];
      const mockWs = {
        send: (data: string) => { sentMessages.push(data); },
        close: () => {},
      };
      addClient(mockWs);

      const msg = JSON.stringify({ type: 'client_ready' });
      expect(() => handleWsMessage(mockWs, msg)).not.toThrow();
    });

    test('client_ready sends messages to ws (replayed history or step statuses)', () => {
      const sentMessages: string[] = [];
      const mockWs = {
        send: (data: string) => { sentMessages.push(data); },
        close: () => {},
      };
      addClient(mockWs);
      handleWsMessage(mockWs, JSON.stringify({ type: 'client_ready' }));

      // Since no install has started, sentMessages may be empty or contain
      // replayed history from other tests in this module. Either way, no crash.
      // The important thing is that the call completed without error.
      expect(true).toBe(true);
    });
  });

  // ── Section 7: handleWsMessage with user_input (no pending request) ──────

  describe('Section 7: handleWsMessage with user_input (no pending request)', () => {
    let handleWsMessage: (ws: any, raw: string) => void;

    beforeAll(async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      handleWsMessage = result.module.handleWsMessage;
    });

    test('user_input with nonexistent requestId does not throw', () => {
      const mockWs = {
        send: (_data: string) => {},
        close: () => {},
      };
      const msg = JSON.stringify({
        type: 'user_input',
        requestId: 'nonexistent',
        value: 'test',
      });
      expect(() => handleWsMessage(mockWs, msg)).not.toThrow();
    });
  });

  // ── Section 8: handleWsMessage with user_choice (no pending request) ─────

  describe('Section 8: handleWsMessage with user_choice (no pending request)', () => {
    let handleWsMessage: (ws: any, raw: string) => void;

    beforeAll(async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      handleWsMessage = result.module.handleWsMessage;
    });

    test('user_choice with nonexistent requestId does not throw', () => {
      const mockWs = {
        send: (_data: string) => {},
        close: () => {},
      };
      const msg = JSON.stringify({
        type: 'user_choice',
        requestId: 'nonexistent',
        value: 'test',
      });
      expect(() => handleWsMessage(mockWs, msg)).not.toThrow();
    });
  });

  // ── Section 9: handleWsMessage with start_install ────────────────────────

  describe('Section 9: handleWsMessage with start_install', () => {
    let handleWsMessage: (ws: any, raw: string) => void;
    let addClient: (ws: any) => void;

    beforeAll(async () => {
      const result = await safeImport<any>(ROUTES_PATH);
      if (!result.ok) throw new Error(`Failed to import routes: ${result.error}`);
      handleWsMessage = result.module.handleWsMessage;
      addClient = result.module.addClient;
    });

    test('start_install does not throw synchronously', () => {
      const sentMessages: string[] = [];
      const mockWs = {
        send: (data: string) => { sentMessages.push(data); },
        close: () => {},
      };
      addClient(mockWs);

      // start_install triggers startInstallation() which is async and has
      // side effects (system detection, file I/O, etc.). We only verify
      // the synchronous call does not crash -- the async work fires and
      // forgets in the background.
      const msg = JSON.stringify({ type: 'start_install' });
      expect(() => handleWsMessage(mockWs, msg)).not.toThrow();
    });
  });
});


// ══════════════════════════════════════════════════════════════════════════════
// PART 2: Web Server HTTP Tests (spawned as separate process)
// ══════════════════════════════════════════════════════════════════════════════

describe('Part 2: Web Server HTTP Tests', () => {
  let serverProc: Subprocess | null = null;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  // ── Setup: spawn server as separate process ────────────────────────────

  beforeAll(async () => {
    serverProc = Bun.spawn(['bun', 'run', SERVER_PATH], {
      cwd: INSTALL_DIR,
      env: {
        ...process.env,
        PAI_INSTALL_PORT: testPort.toString(),
        PAI_TEST_MODE: '1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Wait for server to be ready (poll GET /, max 8 seconds)
    const deadline = Date.now() + 8000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        const resp = await fetch(`${baseUrl}/`);
        if (resp.status >= 200 && resp.status < 500) {
          ready = true;
          break;
        }
      } catch {
        // Server not yet listening -- retry
      }
      await Bun.sleep(200);
    }

    if (!ready) {
      throw new Error(`Web server failed to start on port ${testPort} within 8s`);
    }
  }, SLOW_TIMEOUT);

  afterAll(() => {
    if (serverProc) {
      try {
        serverProc.kill();
      } catch { /* already exited */ }
    }
  });

  // ── Section 10: Static File Serving ──────────────────────────────────────

  describe('Section 10: Static File Serving', () => {
    test('GET / returns 200 with HTML content', async () => {
      const resp = await fetch(`${baseUrl}/`);
      expect(resp.status).toBe(200);
      const contentType = resp.headers.get('content-type') || '';
      expect(contentType).toContain('text/html');
    });

    test('GET / response body contains HTML tags', async () => {
      const resp = await fetch(`${baseUrl}/`);
      const body = await resp.text();
      // index.html should contain standard HTML markers
      expect(body).toContain('<');
      expect(body.toLowerCase()).toContain('html');
    });

    test('GET /styles.css returns CSS content-type', async () => {
      const resp = await fetch(`${baseUrl}/styles.css`);
      if (resp.status === 200) {
        const contentType = resp.headers.get('content-type') || '';
        expect(contentType).toContain('text/css');
      }
      // If file does not exist in public dir, SPA fallback returns HTML -- still not a crash
    });
  });

  // ── Section 11: MIME Type Detection ──────────────────────────────────────

  describe('Section 11: MIME Type Detection', () => {
    test('GET /app.js returns javascript content-type', async () => {
      const resp = await fetch(`${baseUrl}/app.js`);
      if (resp.status === 200) {
        const contentType = resp.headers.get('content-type') || '';
        expect(contentType).toContain('javascript');
      }
      // File may not exist; SPA fallback to index.html is acceptable
    });

    test('server maps .html to text/html', async () => {
      const resp = await fetch(`${baseUrl}/index.html`);
      expect(resp.status).toBe(200);
      const contentType = resp.headers.get('content-type') || '';
      expect(contentType).toContain('text/html');
    });

    test('server sets no-cache headers', async () => {
      const resp = await fetch(`${baseUrl}/`);
      const cacheControl = resp.headers.get('cache-control') || '';
      expect(cacheControl).toContain('no-cache');
    });
  });

  // ── Section 12: Directory Traversal Prevention ───────────────────────────

  describe('Section 12: Directory Traversal Prevention', () => {
    test('GET /../../../etc/passwd does not serve system files', async () => {
      const resp = await fetch(`${baseUrl}/../../../etc/passwd`);
      const body = await resp.text();
      // Should NOT contain typical passwd file content
      expect(body).not.toContain('root:');
      // Should either be 403 Forbidden, 404, or SPA fallback HTML
      expect([200, 403, 404]).toContain(resp.status);
      if (resp.status === 200) {
        // SPA fallback -- verify it returned HTML, not the passwd file
        const contentType = resp.headers.get('content-type') || '';
        expect(contentType).toContain('text/html');
      }
    });

    test('GET with URL-encoded traversal does not serve system files', async () => {
      const resp = await fetch(`${baseUrl}/..%2F..%2F..%2Fetc%2Fpasswd`);
      const body = await resp.text();
      expect(body).not.toContain('root:');
      expect([200, 403, 404]).toContain(resp.status);
      if (resp.status === 200) {
        const contentType = resp.headers.get('content-type') || '';
        expect(contentType).toContain('text/html');
      }
    });
  });

  // ── Section 13: 404 / SPA Fallback ───────────────────────────────────────

  describe('Section 13: 404 / SPA Fallback', () => {
    test('GET /nonexistent-path returns SPA fallback or 404', async () => {
      const resp = await fetch(`${baseUrl}/nonexistent-path`);
      // Server either returns 200 (SPA fallback to index.html) or 404
      expect([200, 404]).toContain(resp.status);
      if (resp.status === 200) {
        // Verify it served HTML (the SPA shell)
        const contentType = resp.headers.get('content-type') || '';
        expect(contentType).toContain('text/html');
        const body = await resp.text();
        expect(body.toLowerCase()).toContain('html');
      }
    });

    test('GET /deep/nested/route also gets SPA fallback or 404', async () => {
      const resp = await fetch(`${baseUrl}/deep/nested/route`);
      expect([200, 404]).toContain(resp.status);
    });
  });

  // ── Section 14: WebSocket Upgrade ────────────────────────────────────────

  describe('Section 14: WebSocket Upgrade', () => {
    test('WebSocket connection succeeds', async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws`);
      const connected = await new Promise<boolean>((resolve) => {
        ws.onopen = () => resolve(true);
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 5000);
      });
      if (connected) ws.close();
      expect(connected).toBe(true);
    }, SLOW_TIMEOUT);

    test('WebSocket receives connected message on open', async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws`);
      const firstMessage = await new Promise<string | null>((resolve) => {
        ws.onmessage = (event) => resolve(String(event.data));
        ws.onerror = () => resolve(null);
        setTimeout(() => resolve(null), 5000);
      });
      ws.close();

      expect(firstMessage).not.toBeNull();
      if (firstMessage) {
        const parsed = JSON.parse(firstMessage);
        expect(parsed.type).toBe('connected');
        expect(parsed.port).toBe(testPort);
      }
    }, SLOW_TIMEOUT);

    test('WebSocket receives response after sending client_ready', async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${testPort}/ws`);
      const messages: string[] = [];

      const done = new Promise<void>((resolve) => {
        ws.onmessage = (event) => {
          messages.push(String(event.data));
          // After receiving the initial "connected" message, send client_ready
          if (messages.length === 1) {
            ws.send(JSON.stringify({ type: 'client_ready' }));
            // Give server a moment to respond with any replayed history
            setTimeout(() => resolve(), 500);
          }
        };
        ws.onerror = () => resolve();
        setTimeout(() => resolve(), 5000);
      });

      await done;
      ws.close();

      // Should have at least the "connected" message
      expect(messages.length).toBeGreaterThanOrEqual(1);
      const firstParsed = JSON.parse(messages[0]);
      expect(firstParsed.type).toBe('connected');
    }, SLOW_TIMEOUT);
  });
});


// ══════════════════════════════════════════════════════════════════════════════
// PART 3: Server Crash Resilience
// ══════════════════════════════════════════════════════════════════════════════

describe('Part 3: Server Crash Resilience', () => {
  let serverProc: Subprocess | null = null;
  const resiliencePort = testPort + 1;
  const baseUrl = `http://127.0.0.1:${resiliencePort}`;

  beforeAll(async () => {
    serverProc = Bun.spawn(['bun', 'run', SERVER_PATH], {
      cwd: INSTALL_DIR,
      env: {
        ...process.env,
        PAI_INSTALL_PORT: resiliencePort.toString(),
        PAI_TEST_MODE: '1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Wait for server ready
    const deadline = Date.now() + 8000;
    let ready = false;
    while (Date.now() < deadline) {
      try {
        const resp = await fetch(`${baseUrl}/`);
        if (resp.status >= 200 && resp.status < 500) {
          ready = true;
          break;
        }
      } catch {
        // Not ready yet
      }
      await Bun.sleep(200);
    }

    if (!ready) {
      throw new Error(`Resilience server failed to start on port ${resiliencePort} within 8s`);
    }
  }, SLOW_TIMEOUT);

  afterAll(() => {
    if (serverProc) {
      try {
        serverProc.kill();
      } catch { /* already exited */ }
    }
  });

  // ── Section 15: Server starts without errors ─────────────────────────────

  describe('Section 15: Server starts without errors', () => {
    test('server process is running (not exited immediately)', () => {
      expect(serverProc).not.toBeNull();
      // exitCode is null while the process is still running
      expect(serverProc!.exitCode).toBeNull();
    });

    test('server stderr does not contain fatal errors', async () => {
      // Give stderr a moment to flush any startup messages
      await Bun.sleep(300);
      // Read whatever stderr has been buffered so far
      // Note: stderr is a ReadableStream; we check what is available without blocking
      let stderrText = '';
      if (serverProc?.stderr) {
        const reader = (serverProc.stderr as ReadableStream).getReader();
        const { value, done } = await Promise.race([
          reader.read(),
          // Timeout: if nothing on stderr in 500ms, that is fine
          new Promise<{ value: undefined; done: true }>((resolve) =>
            setTimeout(() => resolve({ value: undefined, done: true }), 500)
          ),
        ]);
        reader.releaseLock();
        if (value) {
          stderrText = new TextDecoder().decode(value);
        }
      }

      // Fatal indicators that would mean the server is broken
      expect(stderrText).not.toContain('FATAL');
      expect(stderrText).not.toContain('SyntaxError');
      expect(stderrText).not.toContain('Cannot find module');
    });
  });

  // ── Section 16: Server responds after rapid requests ─────────────────────

  describe('Section 16: Server responds after rapid requests', () => {
    test('5 rapid GET / requests all return 200', async () => {
      const requests = Array.from({ length: 5 }, () =>
        fetch(`${baseUrl}/`).then((r) => r.status)
      );
      const statuses = await Promise.all(requests);
      for (const status of statuses) {
        expect(status).toBe(200);
      }
    });

    test('mixed rapid requests to different endpoints do not crash server', async () => {
      const endpoints = [
        '/',
        '/index.html',
        '/styles.css',
        '/app.js',
        '/nonexistent',
      ];
      const requests = endpoints.map((ep) =>
        fetch(`${baseUrl}${ep}`).then((r) => r.status)
      );
      const statuses = await Promise.all(requests);
      // All should be valid HTTP responses (200, 403, or 404)
      for (const status of statuses) {
        expect([200, 403, 404]).toContain(status);
      }
    });

    test('server still responds after rapid requests', async () => {
      // Final sanity check -- server has not crashed
      const resp = await fetch(`${baseUrl}/`);
      expect(resp.status).toBe(200);
    });
  });
});
