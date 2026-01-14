#!/usr/bin/env bun

/**
 * chat - Ollama Interactive Chat CLI
 *
 * Interactive chat sessions with local Ollama models.
 * Maintains conversation context across multiple turns.
 *
 * Usage:
 *   bun run Chat.ts
 *   bun run Chat.ts --model codellama:7b
 *   bun run Chat.ts --system "You are a helpful coding assistant"
 */

import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as readline from "node:readline/promises";
import { BackendRegistry } from "../lib/BackendRegistry.js";
import { OllamaBackend } from "../lib/backends/OllamaBackend.js";
import { AnthropicBackend } from "../lib/backends/AnthropicBackend.js";
import type { BaseBackend, InferenceMessage } from "../lib/backends/BaseBackend.js";

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

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  options?: {
    temperature?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: Message;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface CLIArgs {
  model?: string;
  backend?: string;
  system?: string;
  temperature?: number;
  help?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen3:4b',
  temperature: 0.7,
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
// Chat Session Manager
// ============================================================================

class ChatSession {
  private backend: BaseBackend;
  private model: string;
  private messages: InferenceMessage[] = [];
  private temperature?: number;

  constructor(backend: BaseBackend, model: string, systemPrompt?: string, temperature?: number) {
    this.backend = backend;
    this.model = model;
    this.temperature = temperature;

    if (systemPrompt) {
      this.messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
  }

  async chat(userMessage: string): Promise<string> {
    // Add user message
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      // Call backend with full message history
      const response = await this.backend.chat({
        model: this.model,
        messages: this.messages,
        temperature: this.temperature,
        stream: true,
      });

      // Add assistant response to history
      this.messages.push({
        role: 'assistant',
        content: response.content,
      });

      return response.content;
    } catch (error: any) {
      throw new CLIError(`Chat error: ${error.message}`, 1);
    }
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  clearHistory(): void {
    const systemMessages = this.messages.filter(m => m.role === 'system');
    this.messages = systemMessages;
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    options: {
      model: { type: 'string', short: 'm' },
      backend: { type: 'string', short: 'b' },
      system: { type: 'string', short: 's' },
      temperature: { type: 'string', short: 't' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  return {
    model: values.model as string | undefined,
    backend: values.backend as string | undefined,
    system: values.system as string | undefined,
    temperature: values.temperature ? parseFloat(values.temperature) : undefined,
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Multi-Backend Interactive Chat CLI

USAGE:
  bun run Chat.ts [OPTIONS]

OPTIONS:
  -m, --model <name>        Model to use (auto-detects backend from model name)
  -b, --backend <name>      Backend to use: ollama, anthropic (default: auto-detect)
  -s, --system <text>       System prompt to set context
  -t, --temperature <num>   Sampling temperature 0.0-1.0 (default: ${DEFAULTS.temperature})
  -h, --help                Show this help message

COMMANDS (during chat):
  /exit, /quit              Exit the chat session
  /clear                    Clear conversation history
  /help                     Show available commands

BACKENDS:
  ollama                    Local models (free, private, offline)
  anthropic                 Claude API (best reasoning, requires ANTHROPIC_API_KEY)

EXAMPLES:
  # Start chat with default backend (ollama)
  bun run Chat.ts

  # Use specific Ollama model
  bun run Chat.ts --model qwen3:4b

  # Use Claude API (auto-detects from model name)
  bun run Chat.ts --model claude-sonnet-4.5

  # Explicit backend selection
  bun run Chat.ts --backend anthropic --model claude-opus-4.5

  # Set system prompt
  bun run Chat.ts --system "You are a helpful coding assistant"

ENVIRONMENT VARIABLES:
  # Ollama Configuration
  OLLAMA_BASE_URL           Ollama server URL (default: ${DEFAULTS.baseUrl})
  OLLAMA_CHAT_MODEL         Default chat model name
  OLLAMA_DEFAULT_MODEL      Fallback default model

  # Anthropic Configuration
  ANTHROPIC_API_KEY         Required for Claude API access
  ANTHROPIC_DEFAULT_MODEL   Default Claude model (default: claude-sonnet-4.5)

  # General Configuration
  INFERENCE_DEFAULT_BACKEND Default backend (ollama or anthropic)

NOTES:
  - Model names auto-detect backend (claude-* → anthropic, others → ollama)
  - For Ollama: ensure ollama serve is running
  - For Anthropic: set ANTHROPIC_API_KEY in your environment
  - Conversation context is maintained across turns
`);
}

// ============================================================================
// Interactive Chat Loop
// ============================================================================

async function runChatLoop(session: ChatSession): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n💬 Chat started. Type /exit to quit, /clear to reset, /help for commands.\n');

  try {
    while (true) {
      const userInput = await rl.question('You: ');
      const trimmed = userInput.trim();

      if (!trimmed) continue;

      // Handle commands
      if (trimmed === '/exit' || trimmed === '/quit') {
        console.log('\n👋 Goodbye!');
        break;
      }

      if (trimmed === '/clear') {
        session.clearHistory();
        console.log('✨ Conversation history cleared.\n');
        continue;
      }

      if (trimmed === '/help') {
        console.log(`
Available commands:
  /exit, /quit    Exit the chat session
  /clear          Clear conversation history
  /help           Show this help message
`);
        continue;
      }

      // Send message and get response
      process.stdout.write('\nAssistant: ');
      await session.chat(trimmed);
      console.log();
    }
  } finally {
    rl.close();
  }
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
        modelPrefixes: ['llama', 'qwen', 'mistral', 'deepseek', 'codellama', 'phi', 'gemma'],
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

    const temperature = args.temperature || DEFAULTS.temperature;

    console.log(`\n🤖 Using ${backend.name}:${model}`);
    if (args.system) {
      console.log(`📋 System prompt: ${args.system}`);
    }

    // Create chat session
    const session = new ChatSession(backend, model, args.system, temperature);

    // Run interactive loop
    await runChatLoop(session);

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

export { ChatSession };
