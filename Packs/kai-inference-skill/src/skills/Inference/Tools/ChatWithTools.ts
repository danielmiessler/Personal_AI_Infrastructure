#!/usr/bin/env bun

/**
 * ChatWithTools - Ollama Chat with Tool Calling Support
 *
 * Enables models to call functions and tools during conversation.
 * Zoe can now use tools to accomplish tasks!
 *
 * Usage:
 *   bun run ChatWithTools.ts --message "What's the weather in Paris?" --tools ./tools.json
 *   bun run ChatWithTools.ts --message "Calculate 15 * 23" --tools ./math-tools.json
 */

import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BackendRegistry } from "../lib/BackendRegistry.js";
import { OllamaBackend } from "../lib/backends/OllamaBackend.js";
import { InferenceMessage, Tool, ToolCall } from "../lib/backends/BaseBackend.js";

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
  message: string;
  model?: string;
  tools?: string;
  maxTurns?: number;
  help?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  model: 'qwen3:4b',
  maxTurns: 5,
};

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Execute a tool call
 * In a real implementation, this would dispatch to actual tool implementations
 */
async function executeTool(toolCall: ToolCall): Promise<string> {
  const { name, arguments: args } = toolCall.function;

  // Parse arguments if they're a string
  let parsedArgs: Record<string, any>;
  try {
    parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  } catch {
    return JSON.stringify({ error: 'Invalid arguments format' });
  }

  console.error(`\n🔧 Executing tool: ${name}`);
  console.error(`   Arguments: ${JSON.stringify(parsedArgs, null, 2)}`);

  // Built-in tool implementations
  switch (name) {
    case 'get_weather':
      return JSON.stringify({
        location: parsedArgs.location,
        temperature: 18,
        condition: 'partly cloudy',
        humidity: 65,
      });

    case 'calculate':
      try {
        const { operation, a, b } = parsedArgs;
        let result: number;
        switch (operation) {
          case 'add': result = a + b; break;
          case 'subtract': result = a - b; break;
          case 'multiply': result = a * b; break;
          case 'divide': result = a / b; break;
          default:
            return JSON.stringify({ error: `Unknown operation: ${operation}` });
        }
        return JSON.stringify({ result });
      } catch (error) {
        return JSON.stringify({ error: String(error) });
      }

    case 'get_time':
      const timezone = parsedArgs.timezone;
      const format = parsedArgs.format || '24h';
      const now = new Date();

      let timeString: string;
      if (format === 'iso') {
        timeString = now.toISOString();
      } else if (format === '12h') {
        timeString = now.toLocaleTimeString('en-US', {
          hour12: true,
          timeZone: timezone
        });
      } else {
        timeString = now.toLocaleTimeString('en-US', {
          hour12: false,
          timeZone: timezone
        });
      }

      return JSON.stringify({
        time: timeString,
        date: now.toLocaleDateString(),
        timestamp: now.getTime(),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

    case 'execute_command':
      try {
        const { command, working_directory } = parsedArgs;
        const { execSync } = require('child_process');

        const options: any = {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024, // 10MB
        };

        if (working_directory) {
          options.cwd = working_directory;
        }

        const output = execSync(command, options);

        return JSON.stringify({
          success: true,
          output: output.toString().trim(),
          command,
          working_directory: working_directory || process.cwd(),
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
          stderr: error.stderr?.toString(),
          stdout: error.stdout?.toString(),
        });
      }

    case 'get_environment_variable':
      try {
        const { name: varName } = parsedArgs;
        const value = process.env[varName];

        return JSON.stringify({
          name: varName,
          value: value !== undefined ? value : null,
          exists: value !== undefined,
        });
      } catch (error) {
        return JSON.stringify({ error: String(error) });
      }

    case 'generate_uuid':
      try {
        const { randomUUID } = require('crypto');
        const uuid = randomUUID();

        return JSON.stringify({
          uuid,
          version: parsedArgs.version || 4,
        });
      } catch (error) {
        return JSON.stringify({ error: String(error) });
      }

    case 'write_file':
      try {
        const fs = require('fs');
        const path = require('path');
        const { path: filePath, content, append } = parsedArgs;

        // Resolve relative paths
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(process.cwd(), filePath);

        // Ensure directory exists
        const directory = path.dirname(absolutePath);
        fs.mkdirSync(directory, { recursive: true });

        // Write or append to file
        if (append) {
          fs.appendFileSync(absolutePath, content, 'utf-8');
        } else {
          fs.writeFileSync(absolutePath, content, 'utf-8');
        }

        const stats = fs.statSync(absolutePath);

        return JSON.stringify({
          success: true,
          path: absolutePath,
          size: stats.size,
          mode: append ? 'append' : 'write',
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }

    case 'read_file':
      try {
        const fs = require('fs');
        const path = require('path');
        const { path: filePath, encoding } = parsedArgs;

        // Resolve relative paths
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(process.cwd(), filePath);

        // Read file with specified encoding
        const content = fs.readFileSync(absolutePath, encoding || 'utf-8');
        const stats = fs.statSync(absolutePath);

        return JSON.stringify({
          success: true,
          path: absolutePath,
          content,
          size: stats.size,
          encoding: encoding || 'utf-8',
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }

    case 'list_directory':
      try {
        const fs = require('fs');
        const path = require('path');
        const { path: dirPath, recursive, filter } = parsedArgs;

        // Resolve relative paths
        const absolutePath = path.isAbsolute(dirPath)
          ? dirPath
          : path.resolve(process.cwd(), dirPath);

        let files: string[] = [];

        // Helper function to list files recursively
        function listFiles(dir: string): void {
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(absolutePath, fullPath);

            // Apply filter if provided
            if (filter) {
              const pattern = filter.replace(/\*/g, '.*').replace(/\?/g, '.');
              const regex = new RegExp(`^${pattern}$`);
              if (!regex.test(entry.name)) {
                continue;
              }
            }

            if (entry.isDirectory()) {
              if (recursive) {
                listFiles(fullPath);
              }
            } else {
              files.push(relativePath);
            }
          }
        }

        listFiles(absolutePath);

        return JSON.stringify({
          success: true,
          path: absolutePath,
          files,
          count: files.length,
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }

    case 'get_file_info':
      try {
        const fs = require('fs');
        const path = require('path');
        const { path: filePath } = parsedArgs;

        // Resolve relative paths
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(process.cwd(), filePath);

        const stats = fs.statSync(absolutePath);

        return JSON.stringify({
          success: true,
          path: absolutePath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          accessed: stats.atime.toISOString(),
          permissions: stats.mode.toString(8).slice(-3),
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message,
        });
      }

    default:
      return JSON.stringify({
        error: `Tool '${name}' not implemented`,
        message: 'This is a placeholder. Implement actual tool logic here.'
      });
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    options: {
      message: { type: 'string', short: 'm' },
      model: { type: 'string' },
      tools: { type: 'string', short: 't' },
      maxTurns: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  return {
    message: values.message as string,
    model: values.model as string | undefined,
    tools: values.tools as string | undefined,
    maxTurns: values.maxTurns ? parseInt(values.maxTurns) : undefined,
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Ollama Chat with Tool Calling

USAGE:
  bun run ChatWithTools.ts --message "Your message" [OPTIONS]

OPTIONS:
  -m, --message <text>      Message to send (required)
  --model <name>            Model to use (default: ${DEFAULTS.model})
  -t, --tools <file>        JSON file with tool definitions
  --maxTurns <num>          Maximum conversation turns (default: ${DEFAULTS.maxTurns})
  -h, --help                Show this help message

EXAMPLES:
  # Simple question (no tools)
  bun run ChatWithTools.ts --message "Hello, who are you?"

  # With weather tool
  bun run ChatWithTools.ts --message "What's the weather in Paris?" --tools ./examples/weather-tools.json

  # With calculator
  bun run ChatWithTools.ts --message "Calculate 15 * 23" --model qwen3:4b

  # Different model
  bun run ChatWithTools.ts --message "What's 2+2?" --model qwen3:8b

BUILT-IN TOOLS:
  - get_weather(location)
  - calculate(operation, a, b)
  - get_time()

  You can provide custom tools via --tools flag with JSON format:
  [{
    "type": "function",
    "function": {
      "name": "tool_name",
      "description": "What the tool does",
      "parameters": {
        "type": "object",
        "properties": { ... },
        "required": [...]
      }
    }
  }]
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
    if (!args.message) {
      console.error('Error: --message is required\n');
      showHelp();
      process.exit(1);
    }

    // Initialize backend (disable PAI identity to reduce prompt size for small models)
    const backend = new OllamaBackend({ usePaiIdentity: false });
    const model = args.model || DEFAULTS.model;
    const maxTurns = args.maxTurns || DEFAULTS.maxTurns;

    // Load tools if provided
    let tools: Tool[] | undefined;
    if (args.tools) {
      try {
        const toolsContent = await readFile(resolve(args.tools), 'utf-8');
        tools = JSON.parse(toolsContent);
        console.error(`✅ Loaded ${tools?.length || 0} tools from ${args.tools}\n`);
      } catch (error) {
        console.error(`⚠️  Could not load tools from ${args.tools}: ${error}`);
        console.error(`   Continuing with built-in tools...\n`);
      }
    }

    // Default built-in tools if none provided
    if (!tools) {
      tools = [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get the current weather for a location',
            parameters: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'City name',
                },
              },
              required: ['location'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'calculate',
            description: 'Perform mathematical calculations',
            parameters: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'The operation to perform',
                  enum: ['add', 'subtract', 'multiply', 'divide'],
                },
                a: {
                  type: 'number',
                  description: 'First number',
                },
                b: {
                  type: 'number',
                  description: 'Second number',
                },
              },
              required: ['operation', 'a', 'b'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_time',
            description: 'Get the current time and date',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        },
      ];
    }

    // Initialize conversation
    const messages: InferenceMessage[] = [
      { role: 'user', content: args.message },
    ];

    console.log(`\n💬 User: ${args.message}\n`);

    // Tool calling loop
    for (let turn = 0; turn < maxTurns; turn++) {
      // Call model
      const response = await backend.chat({
        model,
        messages,
        tools,
        stream: false,
      });

      // Add assistant response to conversation
      const assistantMessage: InferenceMessage = {
        role: 'assistant',
        content: response.content || '',
      };

      if (response.tool_calls && response.tool_calls.length > 0) {
        assistantMessage.tool_calls = response.tool_calls;
      }

      messages.push(assistantMessage);

      // If no tool calls, we're done
      if (!response.tool_calls || response.tool_calls.length === 0) {
        console.log(`\n🤖 Zoe: ${response.content}\n`);

        // Print stats
        if (response.usage || response.metadata) {
          const stats: string[] = [];
          if (response.usage?.completionTokens) {
            stats.push(`${response.usage.completionTokens} tokens`);
          }
          if (response.metadata?.duration) {
            stats.push(`${(response.metadata.duration / 1000).toFixed(2)}s`);
          }
          if (stats.length > 0) {
            console.error(`[${model}] ${stats.join(' ')}\n`);
          }
        }

        break;
      }

      // Execute tool calls
      console.log(`\n🤖 Zoe wants to use tools:\n`);

      for (const toolCall of response.tool_calls) {
        const result = await executeTool(toolCall);

        console.error(`   Result: ${result}`);

        // Add tool result to conversation
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      console.log();

      // Check if we've reached max turns
      if (turn === maxTurns - 1) {
        console.error(`⚠️  Reached maximum turns (${maxTurns}). Use --maxTurns to increase.`);
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
