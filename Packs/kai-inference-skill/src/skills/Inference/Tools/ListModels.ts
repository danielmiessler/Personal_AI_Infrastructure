#!/usr/bin/env bun

/**
 * list-models - List Available Models from All Backends
 *
 * Lists models from Ollama (local) and Anthropic (API) backends.
 *
 * Usage:
 *   bun run ListModels.ts
 *   bun run ListModels.ts --backend ollama
 *   bun run ListModels.ts --format json
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

interface CLIArgs {
  backend?: string;
  format?: 'table' | 'json';
  help?: boolean;
}

class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = 'CLIError';
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    options: {
      backend: { type: 'string', short: 'b' },
      format: { type: 'string', short: 'f' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  return {
    backend: values.backend as string | undefined,
    format: (values.format as 'table' | 'json' | undefined) || 'table',
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Multi-Backend Model Listing

USAGE:
  bun run ListModels.ts [OPTIONS]

OPTIONS:
  -b, --backend <name>      Show models from specific backend (ollama, anthropic)
  -f, --format <type>       Output format: table, json (default: table)
  -h, --help                Show this help message

EXAMPLES:
  # List all models from all backends
  bun run ListModels.ts

  # List only Ollama models
  bun run ListModels.ts --backend ollama

  # List only Claude models
  bun run ListModels.ts --backend anthropic

  # JSON output
  bun run ListModels.ts --format json

NOTES:
  - Ollama models require Ollama server running
  - Anthropic models are always available (static list)
  - Models marked as unavailable won't show up by default
`);
}

// ============================================================================
// Formatting Functions
// ============================================================================

function formatTable(modelsByBackend: Array<{ backend: string; models: any[] }>): void {
  for (const { backend, models } of modelsByBackend) {
    if (models.length === 0) continue;

    console.log(`\n${backend.toUpperCase()} MODELS:`);
    console.log('─'.repeat(80));

    // Calculate column widths
    const nameWidth = Math.max(20, ...models.map(m => m.name.length));
    const descWidth = 40;

    // Header
    console.log(
      'NAME'.padEnd(nameWidth) + '  ' +
      'DESCRIPTION'.padEnd(descWidth) + '  ' +
      'SIZE'
    );
    console.log('─'.repeat(80));

    // Models
    for (const model of models) {
      const name = model.name.padEnd(nameWidth);
      const desc = (model.description || '').slice(0, descWidth).padEnd(descWidth);
      const size = formatSize(model.size);

      console.log(`${name}  ${desc}  ${size}`);
    }
  }
  console.log();
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';

  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)}GB`;
  }

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

function formatJSON(modelsByBackend: Array<{ backend: string; models: any[] }>): void {
  console.log(JSON.stringify(modelsByBackend, null, 2));
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

    // Initialize backend registry
    const registry = new BackendRegistry();

    // Register available backends
    try {
      const ollama = new OllamaBackend();
      registry.register({
        name: 'ollama',
        backend: ollama,
      });
    } catch (error) {
      // Ollama not available, skip
    }

    try {
      const anthropic = new AnthropicBackend();
      registry.register({
        name: 'anthropic',
        backend: anthropic,
      });
    } catch (error) {
      // Anthropic not available (no API key), skip
    }

    // Get models from all backends or specific backend
    let modelsByBackend;
    if (args.backend) {
      const backend = registry.get(args.backend);
      if (!backend) {
        throw new CLIError(
          `Backend '${args.backend}' not found. Available: ${registry.listRegistered().join(', ')}`,
          1
        );
      }
      const models = await backend.listModels();
      modelsByBackend = [{ backend: args.backend, models }];
    } else {
      modelsByBackend = await registry.listAllModels();
    }

    // Format output
    if (args.format === 'json') {
      formatJSON(modelsByBackend);
    } else {
      formatTable(modelsByBackend);
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
