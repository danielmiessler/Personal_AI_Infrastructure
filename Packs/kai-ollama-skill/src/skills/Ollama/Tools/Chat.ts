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
  system?: string;
  temperature?: number;
  help?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2:latest',
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
// Ollama Chat Client
// ============================================================================

class OllamaChatClient {
  private baseUrl: string;
  private model: string;
  private messages: Message[] = [];

  constructor(baseUrl: string, model: string, systemPrompt?: string) {
    this.baseUrl = baseUrl;
    this.model = model;

    if (systemPrompt) {
      this.messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
  }

  async chat(userMessage: string, temperature?: number): Promise<string> {
    // Add user message
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    const request: OllamaChatRequest = {
      model: this.model,
      messages: this.messages,
      stream: true,
    };

    if (temperature !== undefined) {
      request.options = { temperature };
    }

    const url = `${this.baseUrl}/api/chat`;

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
        throw new CLIError(`Ollama API error (${response.status}): ${errorText}`, 1);
      }

      // Handle streaming response
      const assistantMessage = await this.handleStreamingResponse(response);

      // Add assistant message to history
      this.messages.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new CLIError(
          '❌ Cannot connect to Ollama. Ensure Ollama is running: ollama serve',
          1
        );
      }
      throw error;
    }
  }

  private async handleStreamingResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new CLIError('No response body available', 1);
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaChatResponse;

            if (data.message?.content) {
              process.stdout.write(data.message.content);
              fullResponse += data.message.content;
            }
          } catch (parseError) {
            continue;
          }
        }
      }

      process.stdout.write('\n');
      return fullResponse;
    } finally {
      reader.releaseLock();
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
      system: { type: 'string', short: 's' },
      temperature: { type: 'string', short: 't' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  return {
    model: values.model as string | undefined,
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
Ollama Interactive Chat CLI

USAGE:
  bun run Chat.ts [OPTIONS]

OPTIONS:
  -m, --model <name>        Model to use (default: ${DEFAULTS.model})
  -s, --system <text>       System prompt to set context
  -t, --temperature <num>   Sampling temperature 0.0-1.0 (default: ${DEFAULTS.temperature})
  -h, --help                Show this help message

COMMANDS (during chat):
  /exit, /quit              Exit the chat session
  /clear                    Clear conversation history
  /help                     Show available commands

EXAMPLES:
  # Start basic chat
  bun run Chat.ts

  # Use specific model
  bun run Chat.ts --model codellama:7b

  # Set system prompt
  bun run Chat.ts --system "You are a helpful coding assistant"

ENVIRONMENT VARIABLES:
  OLLAMA_BASE_URL           Ollama server URL (default: ${DEFAULTS.baseUrl})
  OLLAMA_CHAT_MODEL         Default chat model name
  OLLAMA_DEFAULT_MODEL      Fallback default model

NOTES:
  - Ensure Ollama is running: ollama serve
  - List available models: ollama list
  - Conversation context is maintained across turns
`);
}

// ============================================================================
// Interactive Chat Loop
// ============================================================================

async function runChatLoop(client: OllamaChatClient, temperature?: number): Promise<void> {
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
        client.clearHistory();
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
      await client.chat(trimmed, temperature);
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

    // Get configuration
    const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULTS.baseUrl;
    const model = args.model ||
                  process.env.OLLAMA_CHAT_MODEL ||
                  process.env.OLLAMA_DEFAULT_MODEL ||
                  DEFAULTS.model;
    const temperature = args.temperature || DEFAULTS.temperature;

    console.log(`\n🤖 Using model: ${model}`);
    if (args.system) {
      console.log(`📋 System prompt: ${args.system}`);
    }

    // Create chat client
    const client = new OllamaChatClient(baseUrl, model, args.system);

    // Run interactive loop
    await runChatLoop(client, temperature);

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

export { OllamaChatClient };
