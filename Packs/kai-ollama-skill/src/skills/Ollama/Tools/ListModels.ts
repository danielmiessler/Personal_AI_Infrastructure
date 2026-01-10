#!/usr/bin/env bun

/**
 * list-models - Ollama Model Management CLI
 *
 * List all locally available Ollama models with metadata.
 *
 * Usage:
 *   bun run ListModels.ts
 *   bun run ListModels.ts --format json
 */

import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

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

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaListResponse {
  models: OllamaModel[];
}

interface CLIArgs {
  format?: 'table' | 'json';
  help?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
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

// ============================================================================
// Ollama Models Client
// ============================================================================

class OllamaModelsClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULTS.baseUrl;
  }

  async listModels(): Promise<OllamaModel[]> {
    const url = `${this.baseUrl}/api/tags`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new CLIError(
          `Ollama API error (${response.status}): ${errorText}`,
          1
        );
      }

      const data: OllamaListResponse = await response.json();
      return data.models || [];
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new CLIError(
          '❌ Cannot connect to Ollama. Ensure Ollama is running:\n' +
          '   ollama serve\n' +
          `   Base URL: ${this.baseUrl}`,
          1
        );
      }
      throw error;
    }
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function formatTable(models: OllamaModel[]): void {
  if (models.length === 0) {
    console.log('No models found. Pull a model with: ollama pull llama3.2');
    return;
  }

  // Calculate column widths
  const nameWidth = Math.max(
    20,
    ...models.map(m => m.name.length)
  );
  const sizeWidth = 12;
  const paramWidth = 10;
  const modifiedWidth = 15;

  // Header
  console.log(
    'NAME'.padEnd(nameWidth) + '  ' +
    'SIZE'.padEnd(sizeWidth) + '  ' +
    'PARAMS'.padEnd(paramWidth) + '  ' +
    'MODIFIED'
  );
  console.log('-'.repeat(nameWidth + sizeWidth + paramWidth + modifiedWidth + 6));

  // Rows
  for (const model of models) {
    const name = model.name.padEnd(nameWidth);
    const size = formatSize(model.size).padEnd(sizeWidth);
    const params = (model.details?.parameter_size || 'N/A').padEnd(paramWidth);
    const modified = formatDate(model.modified_at);

    console.log(`${name}  ${size}  ${params}  ${modified}`);
  }

  console.log(`\nTotal: ${models.length} model${models.length === 1 ? '' : 's'}`);
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    options: {
      format: { type: 'string', short: 'f' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  return {
    format: (values.format as 'table' | 'json') || 'table',
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Ollama Model Management CLI

USAGE:
  bun run ListModels.ts [OPTIONS]

OPTIONS:
  -f, --format <format>     Output format: table, json (default: table)
  -h, --help                Show this help message

EXAMPLES:
  # List models as table
  bun run ListModels.ts

  # List models as JSON
  bun run ListModels.ts --format json

ENVIRONMENT VARIABLES:
  OLLAMA_BASE_URL           Ollama server URL (default: ${DEFAULTS.baseUrl})

RELATED COMMANDS:
  ollama pull llama3.2      Download a model
  ollama rm llama3.2        Remove a model
  ollama show llama3.2      Show model details

NOTES:
  - Ensure Ollama is running: ollama serve
  - Browse models: https://ollama.com/library
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

    // Get configuration
    const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULTS.baseUrl;

    // Create client and list models
    const client = new OllamaModelsClient(baseUrl);
    const models = await client.listModels();

    // Output based on format
    if (args.format === 'json') {
      console.log(JSON.stringify(models, null, 2));
    } else {
      formatTable(models);
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

export { OllamaModelsClient };
