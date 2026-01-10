#!/usr/bin/env bun

/**
 * embed - Ollama Embeddings CLI
 *
 * Generate embeddings for text using local Ollama models.
 * Useful for semantic search, RAG, and similarity comparisons.
 *
 * Usage:
 *   bun run Embed.ts --text "Your text here"
 *   bun run Embed.ts --text "..." --model nomic-embed-text
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

interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

interface CLIArgs {
  text: string;
  model?: string;
  output?: 'json' | 'array' | 'length';
  help?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  model: 'nomic-embed-text:latest',
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
// Ollama Embeddings Client
// ============================================================================

class OllamaEmbedClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULTS.baseUrl;
  }

  async embed(text: string, model: string): Promise<number[]> {
    const url = `${this.baseUrl}/api/embeddings`;

    const request: OllamaEmbedRequest = {
      model,
      prompt: text,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new CLIError(
          `Ollama API error (${response.status}): ${errorText}`,
          1
        );
      }

      const data: OllamaEmbedResponse = await response.json();
      return data.embedding;
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

  /**
   * Calculate cosine similarity between two embedding vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    options: {
      text: { type: 'string', short: 't' },
      model: { type: 'string', short: 'm' },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  return {
    text: values.text as string,
    model: values.model as string | undefined,
    output: (values.output as 'json' | 'array' | 'length') || 'json',
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Ollama Embeddings CLI

USAGE:
  bun run Embed.ts --text "Your text here" [OPTIONS]

OPTIONS:
  -t, --text <text>         Text to generate embeddings for (required)
  -m, --model <name>        Model to use (default: ${DEFAULTS.model})
  -o, --output <format>     Output format: json, array, length (default: json)
  -h, --help                Show this help message

OUTPUT FORMATS:
  json      Full JSON with metadata
  array     Just the embedding array
  length    Just the vector length

EXAMPLES:
  # Basic embedding
  bun run Embed.ts --text "Semantic search example"

  # Use specific model
  bun run Embed.ts --text "..." --model nomic-embed-text

  # Output array only
  bun run Embed.ts --text "..." --output array

  # Get vector dimensions
  bun run Embed.ts --text "..." --output length

ENVIRONMENT VARIABLES:
  OLLAMA_BASE_URL           Ollama server URL (default: ${DEFAULTS.baseUrl})
  OLLAMA_EMBED_MODEL        Default embedding model name
  OLLAMA_DEFAULT_MODEL      Fallback default model

POPULAR EMBEDDING MODELS:
  nomic-embed-text:latest   768-dimensional embeddings (recommended)
  mxbai-embed-large:latest  1024-dimensional embeddings
  all-minilm:latest         384-dimensional embeddings (fast)

NOTES:
  - Ensure Ollama is running: ollama serve
  - Pull embedding models: ollama pull nomic-embed-text
  - Use embeddings for semantic search, RAG, clustering
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
    if (!args.text) {
      throw new CLIError('Error: --text is required\n\nUse --help for usage information', 1);
    }

    // Get configuration
    const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULTS.baseUrl;
    const model = args.model ||
                  process.env.OLLAMA_EMBED_MODEL ||
                  process.env.OLLAMA_DEFAULT_MODEL ||
                  DEFAULTS.model;

    // Create client and generate embeddings
    const client = new OllamaEmbedClient(baseUrl);
    const embedding = await client.embed(args.text, model);

    // Output based on format
    switch (args.output) {
      case 'array':
        console.log(JSON.stringify(embedding));
        break;
      case 'length':
        console.log(embedding.length);
        break;
      case 'json':
      default:
        console.log(JSON.stringify({
          model,
          text: args.text,
          embedding,
          dimensions: embedding.length,
        }, null, 2));
        break;
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

export { OllamaEmbedClient };
