import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";

/**
 * These tests verify the API response handling logic by using a test server
 * that simulates API responses. This allows us to test:
 * - Non-streaming response parsing
 * - Streaming response parsing
 * - Error handling
 * - Token counting
 */

describe("API Response Handling", () => {
  const testDir = join(tmpdir(), `pai-api-test-${Date.now()}`);
  const originalEnv = { ...process.env };
  let server: ReturnType<typeof Bun.serve> | null = null;
  let serverPort: number;

  beforeEach(async () => {
    mkdirSync(testDir, { recursive: true });
    process.env.PAI_DIR = testDir;

    // Find an available port
    serverPort = 9000 + Math.floor(Math.random() * 1000);
  });

  afterEach(async () => {
    if (server) {
      server.stop();
      server = null;
    }

    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}

    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe("Claude response parsing", () => {
    test("parses non-streaming response correctly", async () => {
      // Create a mock server that returns a Claude-like response
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return Response.json({
            content: [{ type: "text", text: "Hello from mock Claude!" }],
            usage: {
              input_tokens: 10,
              output_tokens: 5,
            },
          });
        },
      });

      // Create a test script that uses our mock server
      const testScript = `
        const response = await fetch('http://localhost:${serverPort}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test' }),
        });
        const data = await response.json();

        // Parse like Claude.ts does
        const text = data.content?.[0]?.text || '';
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;

        console.log(JSON.stringify({ text, inputTokens, outputTokens }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.text).toBe("Hello from mock Claude!");
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(5);
    });

    test("handles empty response gracefully", async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return Response.json({
            content: [],
            usage: { input_tokens: 0, output_tokens: 0 },
          });
        },
      });

      const testScript = `
        const response = await fetch('http://localhost:${serverPort}', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        console.log(JSON.stringify({ text, isEmpty: text === '' }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("OpenAI response parsing", () => {
    test("parses non-streaming response correctly", async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return Response.json({
            choices: [{ message: { content: "Hello from mock OpenAI!" } }],
            usage: {
              prompt_tokens: 15,
              completion_tokens: 8,
              total_tokens: 23,
            },
          });
        },
      });

      const testScript = `
        const response = await fetch('http://localhost:${serverPort}', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        const data = await response.json();

        // Parse like OpenAI.ts does
        const text = data.choices?.[0]?.message?.content || '';
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;

        console.log(JSON.stringify({ text, promptTokens, completionTokens, totalTokens }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.text).toBe("Hello from mock OpenAI!");
      expect(result.promptTokens).toBe(15);
      expect(result.completionTokens).toBe(8);
      expect(result.totalTokens).toBe(23);
    });
  });

  describe("Gemini response parsing", () => {
    test("parses non-streaming response correctly", async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return Response.json({
            candidates: [{
              content: {
                parts: [{ text: "Hello from mock Gemini!" }]
              }
            }],
            usageMetadata: {
              promptTokenCount: 12,
              candidatesTokenCount: 6,
              totalTokenCount: 18,
            },
          });
        },
      });

      const testScript = `
        const response = await fetch('http://localhost:${serverPort}', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        const data = await response.json();

        // Parse like Gemini.ts does
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const promptTokens = data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
        const totalTokens = data.usageMetadata?.totalTokenCount || 0;

        console.log(JSON.stringify({ text, promptTokens, completionTokens, totalTokens }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.text).toBe("Hello from mock Gemini!");
      expect(result.promptTokens).toBe(12);
      expect(result.completionTokens).toBe(6);
      expect(result.totalTokens).toBe(18);
    });
  });

  describe("Error response handling", () => {
    test("handles HTTP error responses", async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(
            JSON.stringify({
              error: {
                code: "rate_limit_exceeded",
                message: "You have exceeded your rate limit",
              },
            }),
            { status: 429 }
          );
        },
      });

      const testScript = `
        const response = await fetch('http://localhost:${serverPort}', {
          method: 'POST',
          body: JSON.stringify({}),
        });

        console.log(JSON.stringify({
          ok: response.ok,
          status: response.status,
        }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.ok).toBe(false);
      expect(result.status).toBe(429);
    });

    test("parses error details from response body", async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          return new Response(
            JSON.stringify({
              error: {
                code: "invalid_api_key",
                message: "The API key provided is invalid",
              },
            }),
            { status: 401 }
          );
        },
      });

      const testScript = `
        const response = await fetch('http://localhost:${serverPort}', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        const data = await response.json();

        console.log(JSON.stringify({
          errorCode: data.error?.code,
          errorMessage: data.error?.message,
        }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.errorCode).toBe("invalid_api_key");
      expect(result.errorMessage).toBe("The API key provided is invalid");
    });
  });

  describe("Streaming response parsing", () => {
    test("parses OpenAI-style streaming chunks", async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          const chunks = [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" from"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" stream!"}}]}\n\n',
            'data: [DONE]\n\n',
          ];

          return new Response(
            new ReadableStream({
              async start(controller) {
                for (const chunk of chunks) {
                  controller.enqueue(new TextEncoder().encode(chunk));
                  await new Promise(r => setTimeout(r, 10));
                }
                controller.close();
              },
            }),
            {
              headers: { "Content-Type": "text/event-stream" },
            }
          );
        },
      });

      const testScript = `
        const response = await fetch('http://localhost:${serverPort}');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch {}
          }
        }

        console.log(JSON.stringify({ fullText }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.fullText).toBe("Hello from stream!");
    });

    test("parses Claude-style streaming chunks", async () => {
      server = Bun.serve({
        port: serverPort,
        fetch(req) {
          const chunks = [
            'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
            'data: {"type":"content_block_delta","delta":{"text":" Claude"}}\n\n',
            'data: {"type":"content_block_delta","delta":{"text":"!"}}\n\n',
            'data: {"type":"message_delta","usage":{"output_tokens":3}}\n\n',
          ];

          return new Response(
            new ReadableStream({
              async start(controller) {
                for (const chunk of chunks) {
                  controller.enqueue(new TextEncoder().encode(chunk));
                  await new Promise(r => setTimeout(r, 10));
                }
                controller.close();
              },
            }),
            {
              headers: { "Content-Type": "text/event-stream" },
            }
          );
        },
      });

      const testScript = `
        const response = await fetch('http://localhost:${serverPort}');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let outputTokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                fullText += parsed.delta?.text || '';
              } else if (parsed.type === 'message_delta' && parsed.usage) {
                outputTokens = parsed.usage.output_tokens || 0;
              }
            } catch {}
          }
        }

        console.log(JSON.stringify({ fullText, outputTokens }));
      `;

      const proc = Bun.spawn(["bun", "-e", testScript], {
        stdout: "pipe",
        env: { ...process.env },
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      const result = JSON.parse(stdout.trim());
      expect(result.fullText).toBe("Hello Claude!");
      expect(result.outputTokens).toBe(3);
    });
  });
});
