import { beforeEach, describe, expect, it, mock } from "bun:test";

import type {
  InferenceConfig,
  InferenceLevel,
  InferenceOptions,
  InferenceResult,
} from "../Inference.ts";

type InferenceModuleContract = {
  inference: (options: InferenceOptions) => Promise<InferenceResult>;
  readInferenceConfig: (settingsLike?: unknown) => InferenceConfig;
  resolveModel: (config: InferenceConfig, level: InferenceLevel) => string;
  dispatchLiteLLM: (
    config: InferenceConfig,
    options: InferenceOptions,
    level: InferenceLevel,
  ) => Promise<string>;
};

type SpawnScenario = {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: Error;
};

function createSpawnMock(scenario: SpawnScenario = {}) {
  const procHandlers: Record<string, Array<(...args: any[]) => void>> = {
    close: [],
    error: [],
  };
  const stdoutHandlers: Record<string, Array<(data: Buffer) => void>> = { data: [] };
  const stderrHandlers: Record<string, Array<(data: Buffer) => void>> = { data: [] };

  const proc = {
    stdin: {
      write: mock(() => undefined),
      end: mock(() => undefined),
    },
    stdout: {
      on: mock((event: string, cb: (data: Buffer) => void) => {
        stdoutHandlers[event] ??= [];
        stdoutHandlers[event].push(cb);
      }),
    },
    stderr: {
      on: mock((event: string, cb: (data: Buffer) => void) => {
        stderrHandlers[event] ??= [];
        stderrHandlers[event].push(cb);
      }),
    },
    on: mock((event: string, cb: (...args: any[]) => void) => {
      procHandlers[event] ??= [];
      procHandlers[event].push(cb);
    }),
    kill: mock(() => undefined),
  };

  const spawn = mock(() => {
    queueMicrotask(() => {
      if (scenario.error) {
        for (const cb of procHandlers.error ?? []) cb(scenario.error);
        return;
      }
      if (scenario.stdout) {
        for (const cb of stdoutHandlers.data ?? []) cb(Buffer.from(scenario.stdout));
      }
      if (scenario.stderr) {
        for (const cb of stderrHandlers.data ?? []) cb(Buffer.from(scenario.stderr));
      }
      for (const cb of procHandlers.close ?? []) cb(scenario.exitCode ?? 0);
    });

    return proc as any;
  });

  return { spawn, proc };
}

async function loadInferenceModule(suffix: string): Promise<InferenceModuleContract> {
  return (await import(`../Inference.ts?test=${suffix}`)) as unknown as InferenceModuleContract;
}

beforeEach(() => {
  mock.restore();
  (globalThis as any).fetch = mock(async () => {
    throw new Error("fetch not mocked in this test");
  });
});

describe("Inference multi-backend contract (RED phase)", () => {
  describe("Group 1 - Config Parsing", () => {
    it("returns deterministic defaults when inference config is missing", async () => {
      const mod = await loadInferenceModule("config-defaults");
      const settings = { preferences: { temperatureUnit: "fahrenheit" } };

      const config = mod.readInferenceConfig(settings);

      expect(config.enabled).toBe(false);
      expect(config.litellm.api_base).toBe("http://localhost:4000");
      expect(config.litellm.health_timeout_ms).toBe(3000);
      expect(config.default_backend).toBe("ollama");
    });

    it("parses explicit litellm block values from settings object", async () => {
      const mod = await loadInferenceModule("config-litellm-explicit");
      const settings = {
        inference: {
          enabled: true,
          litellm: {
            api_base: "http://127.0.0.1:4000",
            api_key: "sk-local",
            health_timeout_ms: 900,
          },
        },
      };

      const config = mod.readInferenceConfig(settings);

      expect(config.enabled).toBe(true);
      expect(config.litellm.api_base).toBe("http://127.0.0.1:4000");
      expect(config.litellm.api_key).toBe("sk-local");
      expect(config.litellm.health_timeout_ms).toBe(900);
    });

    it("merges partial backend/routing settings with safe defaults", async () => {
      const mod = await loadInferenceModule("config-merge-partial");
      const settings = {
        inference: {
          enabled: true,
          backends: {
            groq: { fast: "groq/llama-3.1-8b" },
          },
          routing: {
            fast: "groq",
          },
        },
      };

      const config = mod.readInferenceConfig(settings);

      expect(config.backends.groq.fast).toBe("groq/llama-3.1-8b");
      expect(config.backends.ollama.standard.length).toBeGreaterThan(0);
      expect(config.routing.standard).toBeDefined();
      expect(config.routing.smart).toBeDefined();
    });

    it("normalizes malformed timeout to default milliseconds", async () => {
      const mod = await loadInferenceModule("config-timeout-normalize");
      const settings = {
        inference: {
          litellm: {
            api_base: "http://localhost:4000",
            api_key: "",
            health_timeout_ms: -1,
          },
        },
      };

      const config = mod.readInferenceConfig(settings);

      expect(config.litellm.health_timeout_ms).toBe(3000);
    });

    it("preserves canonical model map shape for fast/standard/smart", async () => {
      const mod = await loadInferenceModule("config-model-map-shape");
      const config = mod.readInferenceConfig({
        inference: {
          enabled: true,
          backends: {
            ollama: {
              fast: "ollama/phi4",
              standard: "ollama/qwen2.5-coder",
              smart: "ollama/phi4",
            },
            groq: {
              fast: "groq/llama-3.1-8b",
              standard: "groq/llama-3.3-70b",
              smart: "groq/llama-3.3-70b",
            },
            github: {
              fast: "github/gpt-4o-mini",
              standard: "github/gpt-4o",
              smart: "github/gpt-4o",
            },
          },
        },
      });

      expect(config.backends.ollama.fast).toContain("/");
      expect(config.backends.ollama.standard).toContain("/");
      expect(config.backends.ollama.smart).toContain("/");
      expect(config.backends.groq.fast).toContain("/");
      expect(config.backends.github.smart).toContain("/");
    });
  });

  describe("Group 2 - Backend Selection / Routing", () => {
    it("resolveModel prefers routing backend for fast level", async () => {
      const mod = await loadInferenceModule("routing-fast");
      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "ollama",
        routing: { fast: "groq", standard: "ollama", smart: "github" },
      } as unknown as InferenceConfig;

      expect(mod.resolveModel(cfg, "fast")).toBe("groq/llama-3.1-8b");
    });

    it("resolveModel falls back to default_backend when routing is absent", async () => {
      const mod = await loadInferenceModule("routing-default-backend");
      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "github",
        routing: {},
      } as unknown as InferenceConfig;

      expect(mod.resolveModel(cfg, "standard")).toBe("github/gpt-4o");
    });

    it("resolveModel falls back to ollama when selected backend missing", async () => {
      const mod = await loadInferenceModule("routing-fallback-ollama");
      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
        },
        default_backend: "github",
        routing: { smart: "github" },
      } as unknown as InferenceConfig;

      expect(mod.resolveModel(cfg, "smart")).toBe("ollama/phi4");
    });

    it("resolveModel returns level-specific model from routed backend", async () => {
      const mod = await loadInferenceModule("routing-level-specific");
      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "ollama",
        routing: { fast: "groq", standard: "ollama", smart: "github" },
      } as unknown as InferenceConfig;

      expect(mod.resolveModel(cfg, "fast")).toBe("groq/llama-3.1-8b");
      expect(mod.resolveModel(cfg, "standard")).toBe("ollama/qwen2.5-coder");
      expect(mod.resolveModel(cfg, "smart")).toBe("github/gpt-4o");
    });

    it("resolveModel throws deterministic error when model cannot be determined", async () => {
      const mod = await loadInferenceModule("routing-error");
      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {},
        default_backend: "ollama",
        routing: {},
      } as unknown as InferenceConfig;

      expect(() => mod.resolveModel(cfg, "fast")).toThrow(/model|backend|routing/i);
    });
  });

  describe("Group 3 - HTTP Client", () => {
    it("dispatchLiteLLM sends OpenAI chat-completions payload", async () => {
      const mod = await loadInferenceModule("http-payload");
      const fetchMock = mock(async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "ok" } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
      (globalThis as any).fetch = fetchMock;

      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "ollama",
        routing: { fast: "groq", standard: "ollama", smart: "github" },
      } as unknown as InferenceConfig;

      await mod.dispatchLiteLLM(
        cfg,
        {
          systemPrompt: "You are concise",
          userPrompt: "say hello",
          level: "fast",
        },
        "fast",
      );

      const [url, init] = (fetchMock as any).mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/chat/completions");
      const body = JSON.parse(String(init.body));
      expect(body).toEqual({
        model: "groq/llama-3.1-8b",
        messages: [
          { role: "system", content: "You are concise" },
          { role: "user", content: "say hello" },
        ],
      });
    });

    it("dispatchLiteLLM attaches Authorization header when api_key exists", async () => {
      const mod = await loadInferenceModule("http-auth-header");
      const fetchMock = mock(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      (globalThis as any).fetch = fetchMock;

      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "sk-test", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "ollama",
        routing: { fast: "groq", standard: "ollama", smart: "github" },
      } as unknown as InferenceConfig;

      await mod.dispatchLiteLLM(
        cfg,
        { systemPrompt: "sys", userPrompt: "usr", level: "smart" },
        "smart",
      );

      const [, init] = (fetchMock as any).mock.calls[0] as [string, RequestInit];
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer sk-test");
    });

    it("dispatchLiteLLM extracts choices[0].message.content", async () => {
      const mod = await loadInferenceModule("http-content-extract");
      (globalThis as any).fetch = mock(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "response text here" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "ollama",
        routing: { fast: "groq", standard: "ollama", smart: "github" },
      } as unknown as InferenceConfig;

      const content = await mod.dispatchLiteLLM(
        cfg,
        { systemPrompt: "sys", userPrompt: "usr", level: "standard" },
        "standard",
      );

      expect(content).toBe("response text here");
    });

    it("dispatchLiteLLM uses AbortSignal.timeout from health_timeout_ms", async () => {
      const mod = await loadInferenceModule("http-timeout");
      const timeoutSpy = mock((ms: number) => {
        const ac = new AbortController();
        return ac.signal;
      });
      const originalTimeout = AbortSignal.timeout;
      (AbortSignal as any).timeout = timeoutSpy;

      (globalThis as any).fetch = mock(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 1234 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "ollama",
        routing: { fast: "groq", standard: "ollama", smart: "github" },
      } as unknown as InferenceConfig;

      try {
        await mod.dispatchLiteLLM(cfg, { systemPrompt: "sys", userPrompt: "usr", level: "fast" }, "fast");
      } finally {
        (AbortSignal as any).timeout = originalTimeout;
      }

      expect(timeoutSpy).toHaveBeenCalledWith(1234);
    });

    it("dispatchLiteLLM throws typed error on non-2xx or malformed response", async () => {
      const mod = await loadInferenceModule("http-error");
      (globalThis as any).fetch = mock(async () =>
        new Response(JSON.stringify({ error: "upstream unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      );

      const cfg = {
        enabled: true,
        litellm: { api_base: "http://localhost:4000", api_key: "", health_timeout_ms: 3000 },
        backends: {
          ollama: { fast: "ollama/phi4", standard: "ollama/qwen2.5-coder", smart: "ollama/phi4" },
          groq: { fast: "groq/llama-3.1-8b", standard: "groq/llama-3.3-70b", smart: "groq/llama-3.3-70b" },
          github: { fast: "github/gpt-4o-mini", standard: "github/gpt-4o", smart: "github/gpt-4o" },
        },
        default_backend: "ollama",
        routing: { fast: "groq", standard: "ollama", smart: "github" },
      } as unknown as InferenceConfig;

      await expect(
        mod.dispatchLiteLLM(cfg, { systemPrompt: "sys", userPrompt: "usr", level: "fast" }, "fast"),
      ).rejects.toThrow(/503|non-2xx|malformed|litellm/i);
    });
  });

  describe("Group 4 - Fallback Behavior", () => {
    it("inference uses LiteLLM path when config enabled=true", async () => {
      const { spawn } = createSpawnMock({ stdout: "from claude" });
      mock.module("child_process", () => ({ spawn }));

      const mod = await loadInferenceModule("fallback-enabled-path");

      (globalThis as any).fetch = mock(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "from litellm" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await mod.inference({
        systemPrompt: "sys",
        userPrompt: "usr",
        level: "fast",
      } as InferenceOptions);

      expect(result.output).toBe("from litellm");
      expect(spawn).not.toHaveBeenCalled();
    });

    it("inference falls back to Claude CLI spawn when LiteLLM fetch throws", async () => {
      const { spawn } = createSpawnMock({ stdout: "fallback-output" });
      mock.module("child_process", () => ({ spawn }));

      const mod = await loadInferenceModule("fallback-fetch-throws");
      (globalThis as any).fetch = mock(async () => {
        throw new Error("ECONNREFUSED");
      });

      const result = await mod.inference({
        systemPrompt: "sys",
        userPrompt: "usr",
        level: "smart",
      } as InferenceOptions);

      expect(spawn).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.output).toBe("fallback-output");
    });

    it("inference uses Claude CLI directly when inference.enabled=false", async () => {
      const { spawn } = createSpawnMock({ stdout: "claude-only" });
      mock.module("child_process", () => ({ spawn }));

      const mod = await loadInferenceModule("fallback-disabled");
      const fetchSpy = mock(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "unused" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      (globalThis as any).fetch = fetchSpy;

      const result = await mod.inference({
        systemPrompt: "sys",
        userPrompt: "usr",
        level: "standard",
      } as InferenceOptions);

      expect(spawn).toHaveBeenCalledTimes(1);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.output).toBe("claude-only");
    });

    it("fallback preserves stderr-driven error contract on spawn non-zero exit", async () => {
      const { spawn } = createSpawnMock({ stdout: "partial", stderr: "boom", exitCode: 2 });
      mock.module("child_process", () => ({ spawn }));

      const mod = await loadInferenceModule("fallback-spawn-error");
      (globalThis as any).fetch = mock(async () => {
        throw new Error("unreachable");
      });

      const result = await mod.inference({
        systemPrompt: "sys",
        userPrompt: "usr",
        level: "fast",
      } as InferenceOptions);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/boom|code 2/i);
      expect(result.output).toBe("partial");
    });
  });

  describe("Group 5 - Interface Preservation", () => {
    it("InferenceResult preserves required shape contract", async () => {
      const { spawn } = createSpawnMock({ stdout: "shape-check" });
      mock.module("child_process", () => ({ spawn }));

      const mod = await loadInferenceModule("interface-shape");
      const result = await mod.inference({
        systemPrompt: "sys",
        userPrompt: "usr",
        level: "standard",
      } as InferenceOptions);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("latencyMs");
      expect(result).toHaveProperty("level");
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.output).toBe("string");
      expect(typeof result.latencyMs).toBe("number");
    });

    it("inference result level echoes requested level exactly", async () => {
      const { spawn } = createSpawnMock({ stdout: "level-check" });
      mock.module("child_process", () => ({ spawn }));

      const mod = await loadInferenceModule("interface-level");
      const result = await mod.inference({
        systemPrompt: "sys",
        userPrompt: "usr",
        level: "smart",
      } as InferenceOptions);

      expect(result.level).toBe("smart");
    });
  });
});
