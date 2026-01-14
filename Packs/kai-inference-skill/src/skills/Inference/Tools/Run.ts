#!/usr/bin/env bun

/**
 * run - Simple Ollama Execution Wrapper
 *
 * Simplified interface for running Ollama models from Claude Code.
 * Designed to be easily invoked by Claude during conversations.
 *
 * Usage:
 *   bun run Run.ts "Your prompt" llama3.2
 *   bun run Run.ts "Code review this" qwen2.5-coder:7b
 *   bun run Run.ts "Summarize" mistral --system "Be concise"
 */

import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BackendRegistry } from "../lib/BackendRegistry.js";
import { OllamaBackend } from "../lib/backends/OllamaBackend.js";
import { AnthropicBackend } from "../lib/backends/AnthropicBackend.js";

// ============================================================================
// Environment Loading
// ============================================================================

async function loadEnv(): Promise<void> {
  const paiDir = process.env.PAI_DIR || resolve(process.env.HOME!, '.config/pai');
  const envPaths = [
    resolve(paiDir, '.env'),
    resolve(process.env.HOME!, '.claude/.env'),
  ];

  for (const envPath of envPaths) {
    try {
      const envContent = await readFile(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      break;
    } catch {
      continue;
    }
  }
}

// ============================================================================
// Types
// ============================================================================

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface CLIArgs {
  prompt: string;
  model?: string;
  backend?: string;
  system?: string;
  temperature?: number;
  format?: 'json';
  noStream?: boolean;
  help?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen3:4b',
  temperature: 0.7,
  timeout: 30000,
};

// ============================================================================
// CLI Error Handling
// ============================================================================

class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = 'CLIError';
  }
}

// OllamaClient removed - now using BackendRegistry

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values, positionals } = parseArgs({
    options: {
      model: { type: 'string', short: 'm' },
      backend: { type: 'string', short: 'b' },
      system: { type: 'string', short: 's' },
      temperature: { type: 'string', short: 't' },
      format: { type: 'string', short: 'f' },
      'no-stream': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  // Support both positional and --prompt
  let prompt = '';
  let model: string | undefined;

  if (positionals.length >= 1) {
    prompt = positionals[0];
    if (positionals.length >= 2) {
      model = positionals[1];
    }
  }

  return {
    prompt,
    model: model || (values.model as string | undefined),
    backend: values.backend as string | undefined,
    system: values.system as string | undefined,
    temperature: values.temperature ? parseFloat(values.temperature) : undefined,
    format: values.format as 'json' | undefined,
    noStream: values['no-stream'] ?? false,
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Multi-Backend Run - Simple Execution Wrapper

USAGE:
  bun run Run.ts "prompt" [model] [OPTIONS]

POSITIONAL ARGUMENTS:
  prompt                    Text prompt for generation (required)
  model                     Model to use (auto-detects backend)

OPTIONS:
  -m, --model <name>        Model to use (auto-detects backend from name)
  -b, --backend <name>      Backend: ollama, anthropic (default: auto-detect)
  -s, --system <text>       System prompt
  -t, --temperature <num>   Sampling temperature 0.0-1.0
  -f, --format <type>       Output format (json, ollama only)
  --no-stream               Disable streaming
  -h, --help                Show this help

BACKENDS:
  ollama                    Local models (free, private, offline)
  anthropic                 Claude API (best reasoning, requires ANTHROPIC_API_KEY)

EXAMPLES:
  # Quick generation with default backend (ollama)
  bun run Run.ts "Explain closures"

  # Use specific Ollama model (positional)
  bun run Run.ts "Review this code" qwen3:4b

  # Use Claude API (auto-detects from model name)
  bun run Run.ts "Design a system" claude-sonnet-4.5

  # Explicit backend selection
  bun run Run.ts "Analyze this" --backend anthropic --model claude-opus-4.5

  # With system prompt
  bun run Run.ts "Review code" qwen3:4b --system "You are a security expert"

  # Adjust creativity
  bun run Run.ts "Write a story" --temperature 0.9 --backend anthropic

POPULAR MODELS:
  Ollama (local):
    qwen3:4b                Fast code model (2.5GB)
    deepseek-r1:7b          Reasoning model (4.7GB)
    glm4:latest             Balanced model (5.5GB)

  Anthropic (API):
    claude-sonnet-4.5       Best balance (default)
    claude-opus-4.5         Maximum capability
    claude-haiku-4          Fastest responses

ENVIRONMENT VARIABLES:
  # General
  INFERENCE_DEFAULT_BACKEND Default backend (ollama or anthropic)

  # Ollama
  OLLAMA_BASE_URL           Ollama server URL
  OLLAMA_DEFAULT_MODEL      Default model

  # Anthropic
  ANTHROPIC_API_KEY         Required for Claude API
  ANTHROPIC_DEFAULT_MODEL   Default Claude model

NOTES:
  - Model names auto-detect backend (claude-* → anthropic, others → ollama)
  - For Ollama: ensure ollama serve is running
  - For Anthropic: set ANTHROPIC_API_KEY in your environment
`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  try {
    // Load environment variables
    await loadEnv();

    // Parse arguments
    const args = parseArguments();

    // Show help if requested
    if (args.help) {
      showHelp();
      process.exit(0);
    }

    // Validate required arguments
    if (!args.prompt) {
      throw new CLIError('Error: prompt is required\n\nUsage: bun run Run.ts "prompt" [model]\n\nUse --help for more information', 1);
    }

    // Initialize backend registry
    const registry = new BackendRegistry();

    // Register available backends
    try {
      const ollama = new OllamaBackend();
      registry.register({
        name: 'ollama',
        backend: ollama,
        modelPrefixes: ['llama', 'qwen', 'mistral', 'deepseek', 'codellama', 'phi', 'gemma', 'glm'],
      });
    } catch (error) {
      // Ollama not available, skip
    }

    try {
      const anthropic = new AnthropicBackend();
      registry.register({
        name: 'anthropic',
        backend: anthropic,
        modelPrefixes: ['claude-'],
      });
    } catch (error) {
      // Anthropic not available (no API key), skip
    }

    // Select backend
    const backend = registry.selectBackend({
      explicitBackend: args.backend,
      model: args.model,
    });

    // Get model name
    let model = args.model;
    if (!model) {
      model = backend.getDefaultModel();
      if (!model) {
        throw new CLIError('No model specified and no default model configured', 1);
      }
    }

    // Parse model name to remove backend prefix if present
    const parsed = registry.parseModelName(model);
    model = parsed.model;

    // Show model info
    console.error(`[${backend.name}:${model}]`);

    // Build unified inference request
    const request = {
      model,
      prompt: args.prompt,
      stream: !args.noStream,
      system: args.system,
      format: args.format,
      temperature: args.temperature,
    };

    // Generate response
    const response = await backend.generate(request);

    // Output (already streamed if streaming enabled)
    if (args.noStream) {
      console.log(response.content);
    }

    // Print performance stats if available
    if (response.usage || response.metadata) {
      const stats: string[] = [];

      if (response.usage?.completionTokens) {
        stats.push(`${response.usage.completionTokens} tokens`);
      }

      if (response.metadata?.duration) {
        stats.push(`${(response.metadata.duration / 1000).toFixed(2)}s`);
      }

      if (response.metadata?.tokensPerSecond) {
        stats.push(`${response.metadata.tokensPerSecond.toFixed(2)} tok/s`);
      }

      if (stats.length > 0) {
        console.error(`[${stats.join(' - ')}]`);
      }
    }

  } catch (error) {
    if (error instanceof CLIError) {
      console.error(error.message);
      process.exit(error.exitCode);
    }
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
