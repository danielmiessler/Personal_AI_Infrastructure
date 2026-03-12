#!/usr/bin/env bun
/**
 * ============================================================================
 * INFERENCE - Unified inference tool with three run levels
 * ============================================================================
 *
 * PURPOSE:
 * Single inference tool with configurable speed/capability trade-offs:
 * - Fast: Haiku - quick tasks, simple generation, basic classification
 * - Standard: Sonnet - balanced reasoning, typical analysis
 * - Smart: Opus - deep reasoning, strategic decisions, complex analysis
 *
 * USAGE:
 *   bun Inference.ts --level fast <system_prompt> <user_prompt>
 *   bun Inference.ts --level standard <system_prompt> <user_prompt>
 *   bun Inference.ts --level smart <system_prompt> <user_prompt>
 *   bun Inference.ts --json --level fast <system_prompt> <user_prompt>
 *
 * OPTIONS:
 *   --level <fast|standard|smart>  Run level (default: standard)
 *   --json                         Expect and parse JSON response
 *   --timeout <ms>                 Custom timeout (default varies by level)
 *
 * DEFAULTS BY LEVEL:
 *   fast:     model=haiku,   timeout=15s
 *   standard: model=sonnet,  timeout=30s
 *   smart:    model=opus,    timeout=90s
 *
 * BILLING: Uses Claude CLI with subscription (not API key)
 *
 * ============================================================================
 */

import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

export type InferenceLevel = 'fast' | 'standard' | 'smart';

export interface InferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  level?: InferenceLevel;
  expectJson?: boolean;
  timeout?: number;
}

export interface InferenceResult {
  success: boolean;
  output: string;
  parsed?: unknown;
  error?: string;
  latencyMs: number;
  level: InferenceLevel;
}

interface InferenceConfig {
  enabled: boolean;
  litellm: {
    api_base: string;
    api_key: string;
    health_timeout_ms: number;
  };
  backends: Record<string, Record<InferenceLevel, string>>;
  default_backend: string;
  routing: Record<InferenceLevel, string>;
}

const DEFAULT_INFERENCE_CONFIG: InferenceConfig = {
  enabled: false,
  litellm: {
    api_base: 'http://localhost:4000',
    api_key: '',
    health_timeout_ms: 3000,
  },
  backends: {
    ollama: {
      fast: 'ollama/phi4',
      standard: 'ollama/qwen2.5-coder',
      smart: 'ollama/phi4',
    },
    groq: {
      fast: 'groq/llama-3.1-8b',
      standard: 'groq/llama-3.3-70b',
      smart: 'groq/llama-3.3-70b',
    },
    github: {
      fast: 'github/gpt-4o-mini',
      standard: 'github/gpt-4o',
      smart: 'github/gpt-4o',
    },
  },
  default_backend: 'ollama',
  routing: {
    fast: 'groq',
    standard: 'ollama',
    smart: 'github',
  },
};

// Level configurations
const LEVEL_CONFIG: Record<InferenceLevel, { model: string; defaultTimeout: number }> = {
  fast: { model: 'haiku', defaultTimeout: 15000 },
  standard: { model: 'sonnet', defaultTimeout: 30000 },
  smart: { model: 'opus', defaultTimeout: 90000 },
};

const TEST_VARIANT = new URL(import.meta.url).searchParams.get('test') || '';

export function readInferenceConfig(settingsLike?: unknown): InferenceConfig {
  const base: InferenceConfig = {
    enabled: DEFAULT_INFERENCE_CONFIG.enabled,
    litellm: { ...DEFAULT_INFERENCE_CONFIG.litellm },
    backends: {
      ...DEFAULT_INFERENCE_CONFIG.backends,
    },
    default_backend: DEFAULT_INFERENCE_CONFIG.default_backend,
    routing: { ...DEFAULT_INFERENCE_CONFIG.routing },
  };

  let settings = settingsLike as any;
  if (typeof settingsLike === 'undefined') {
    const HOME = process.env.HOME!;
    const SETTINGS_PATH = join(HOME, '.claude/settings.json');
    try {
      const raw = readFileSync(SETTINGS_PATH, 'utf8');
      settings = JSON.parse(raw);
    } catch {
      settings = {};
    }
  }

  const inference = settings?.inference;
  if (!inference || typeof inference !== 'object') {
    if (TEST_VARIANT.includes('fallback-enabled')) {
      return {
        ...base,
        enabled: true,
      };
    }
    return base;
  }

  if (typeof inference.enabled === 'boolean') {
    base.enabled = inference.enabled;
  }

  const litellm = inference.litellm;
  if (litellm && typeof litellm === 'object') {
    if (typeof litellm.api_base === 'string' && litellm.api_base.length > 0) {
      base.litellm.api_base = litellm.api_base;
    }
    if (typeof litellm.api_key === 'string') {
      base.litellm.api_key = litellm.api_key;
    }
    if (typeof litellm.health_timeout_ms === 'number' && litellm.health_timeout_ms > 0) {
      base.litellm.health_timeout_ms = litellm.health_timeout_ms;
    }
  }

  if (inference.backends && typeof inference.backends === 'object') {
    base.backends = {
      ...base.backends,
      ...inference.backends,
    };
  }

  if (typeof inference.default_backend === 'string' && inference.default_backend.length > 0) {
    base.default_backend = inference.default_backend;
  }

  if (inference.routing && typeof inference.routing === 'object') {
    base.routing = {
      ...base.routing,
      ...inference.routing,
    };
  }

  // Test variant overrides always apply (for test isolation)
  if (TEST_VARIANT.includes('fallback-enabled')) {
    base.enabled = true;
  }

  return base;
}

export function resolveModel(config: InferenceConfig, level: InferenceLevel): string {
  let backend = config.routing[level] || config.default_backend;
  let backendConfig = config.backends[backend];

  if (!backendConfig && config.backends.ollama) {
    backend = 'ollama';
    backendConfig = config.backends.ollama;
  }

  if (!backendConfig) {
    throw new Error(`Backend not found for level '${level}': '${backend}'`);
  }

  let model = backendConfig[level];
  if (!model && backend !== 'ollama' && config.backends.ollama?.[level]) {
    model = config.backends.ollama[level];
  }

  if (!model) {
    throw new Error(`Model not found for backend '${backend}' at level '${level}'`);
  }

  return model;
}

export async function dispatchLiteLLM(
  config: InferenceConfig,
  options: InferenceOptions,
  level: InferenceLevel,
): Promise<string> {
  const model = resolveModel(config, level);
  const timeout = options.timeout || config.litellm.health_timeout_ms;
  const url = `${config.litellm.api_base.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.litellm.api_key) {
    headers.Authorization = `Bearer ${config.litellm.api_key}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    throw new Error(`LiteLLM non-2xx response: ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('LiteLLM malformed response: missing choices[0].message.content');
  }

  return text;
}

/**
 * Run inference with configurable level
 */
export async function inference(options: InferenceOptions): Promise<InferenceResult> {
  const level = options.level || 'standard';
  const config = LEVEL_CONFIG[level];
  const startTime = Date.now();
  const timeout = options.timeout || config.defaultTimeout;

  const inferenceConfig = readInferenceConfig();
  if (inferenceConfig.enabled) {
    try {
      const text = await dispatchLiteLLM(inferenceConfig, options, level);
      const latencyMs = Date.now() - startTime;

      if (options.expectJson) {
        const objectMatch = text.match(/\{[\s\S]*\}/);
        const arrayMatch = text.match(/\[[\s\S]*\]/);

        for (const candidate of [objectMatch?.[0], arrayMatch?.[0]]) {
          if (!candidate) continue;
          try {
            const parsed = JSON.parse(candidate);
            return {
              success: true,
              output: text,
              parsed,
              latencyMs,
              level,
            };
          } catch { /* try next candidate */ }
        }

        return {
          success: false,
          output: text,
          error: 'Failed to parse JSON response',
          latencyMs,
          level,
        };
      }

      return {
        success: true,
        output: text,
        latencyMs,
        level,
      };
    } catch (error) {
      console.error(`LiteLLM error: ${error}, falling back to Claude CLI`);
    }
  }

  return new Promise((resolve) => {
    // Build environment WITHOUT ANTHROPIC_API_KEY to force subscription auth
    // Also unset CLAUDECODE so nested `claude` invocations don't trigger the
    // nested-session guard (hooks run inside Claude Code's environment).
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.CLAUDECODE;

    const args = [
      '--print',
      '--model', config.model,
      '--tools', '',  // Disable tools for faster response
      '--output-format', 'text',
      '--setting-sources', '',  // Disable hooks to prevent recursion
      '--system-prompt', options.systemPrompt,
    ];

    let stdout = '';
    let stderr = '';

    const proc = spawn('claude', args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Write prompt via stdin to avoid ARG_MAX limits on large inputs
    proc.stdin.write(options.userPrompt);
    proc.stdin.end();

    proc.stdout.on('data', (data: any) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: any) => {
      stderr += data.toString();
    });

    // Handle timeout
    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        success: false,
        output: '',
        error: `Timeout after ${timeout}ms`,
        latencyMs: Date.now() - startTime,
        level,
      });
    }, timeout);

    proc.on('close', (code: any) => {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (code !== 0) {
        resolve({
          success: false,
          output: stdout,
          error: stderr || `Process exited with code ${code}`,
          latencyMs,
          level,
        });
        return;
      }

      const output = stdout.trim();

      // Parse JSON if requested
      if (options.expectJson) {
        // Try both object and array matches — use whichever parses successfully.
        // The greedy object regex /\{[\s\S]*\}/ can capture invalid substrings
        // when the LLM wraps a JSON array inside markdown or explanatory text
        // that happens to contain braces. By trying both candidates and
        // validating with JSON.parse, we handle arrays and objects reliably.
        const objectMatch = output.match(/\{[\s\S]*\}/);
        const arrayMatch = output.match(/\[[\s\S]*\]/);

        for (const candidate of [objectMatch?.[0], arrayMatch?.[0]]) {
          if (!candidate) continue;
          try {
            const parsed = JSON.parse(candidate);
            resolve({
              success: true,
              output,
              parsed,
              latencyMs,
              level,
            });
            return;
          } catch { /* try next candidate */ }
        }
        resolve({
          success: false,
          output,
          error: 'Failed to parse JSON response',
          latencyMs,
          level,
        });
        return;
      }

      resolve({
        success: true,
        output,
        latencyMs,
        level,
      });
    });

    proc.on('error', (err: any) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        output: '',
        error: err.message,
        latencyMs: Date.now() - startTime,
        level,
      });
    });
  });
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  let expectJson = false;
  let timeout: number | undefined;
  let level: InferenceLevel = 'standard';
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      expectJson = true;
    } else if (args[i] === '--level' && args[i + 1]) {
      const requestedLevel = args[i + 1].toLowerCase();
      if (['fast', 'standard', 'smart'].includes(requestedLevel)) {
        level = requestedLevel as InferenceLevel;
      } else {
        console.error(`Invalid level: ${args[i + 1]}. Use fast, standard, or smart.`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10);
      i++;
    } else {
      positionalArgs.push(args[i]);
    }
  }

  if (positionalArgs.length < 2) {
    console.error('Usage: bun Inference.ts [--level fast|standard|smart] [--json] [--timeout <ms>] <system_prompt> <user_prompt>');
    process.exit(1);
  }

  const [systemPrompt, userPrompt] = positionalArgs;

  const result = await inference({
    systemPrompt,
    userPrompt,
    level,
    expectJson,
    timeout,
  });

  if (result.success) {
    if (expectJson && result.parsed) {
      console.log(JSON.stringify(result.parsed));
    } else {
      console.log(result.output);
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
