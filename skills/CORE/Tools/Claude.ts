#!/usr/bin/env bun
/**
 * Claude.ts - Anthropic Claude API client with streaming support
 * Does ONE thing: Queries Anthropic's Messages API
 *
 * Usage:
 *   bun run Claude.ts --prompt "hello" --model claude-sonnet-4.5
 *   echo "hello" | bun run Claude.ts --system "You are helpful"
 *   bun run Claude.ts --prompt "story" --stream
 */

import { getApiKey, formatError, logAPICall } from './lib/llm-common';

interface ClaudeOptions {
  prompt?: string;
  model: string;
  system?: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

const AVAILABLE_MODELS = [
  'claude-opus-4.5',
  'claude-sonnet-4.5',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
] as const;

function parseArgs(): ClaudeOptions {
  const args = process.argv.slice(2);
  const opts: ClaudeOptions = {
    model: 'claude-sonnet-4.5',
    temperature: 0.7,
    maxTokens: 4096,
    stream: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) {
      opts.prompt = args[i + 1];
      i++;
    } else if (args[i] === '--model' && args[i + 1]) {
      opts.model = args[i + 1];
      i++;
    } else if (args[i] === '--system' && args[i + 1]) {
      opts.system = args[i + 1];
      i++;
    } else if (args[i] === '--temperature' && args[i + 1]) {
      opts.temperature = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--max-tokens' && args[i + 1]) {
      opts.maxTokens = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--stream') {
      opts.stream = true;
    } else if (args[i] === '--help') {
      console.log(`Usage: bun run Claude.ts [options]

Options:
  --prompt TEXT         Prompt text (default: stdin)
  --model MODEL         Model name (default: claude-sonnet-4.5)
  --system TEXT         System prompt
  --temperature NUM     Temperature 0.0-1.0 (default: 0.7)
  --max-tokens NUM      Max tokens to generate (default: 4096)
  --stream              Enable streaming output
  --help                Show this help

Available Models:
  ${AVAILABLE_MODELS.join(', ')}

Environment:
  ANTHROPIC_API_KEY    Required API key

Examples:
  bun run Claude.ts --prompt "What is 2+2?"
  echo "Write a haiku" | bun run Claude.ts --model claude-3-5-haiku-20241022
  bun run Claude.ts --prompt "Tell a story" --stream --system "Be creative"
`);
      process.exit(0);
    }
  }

  return opts;
}

async function queryClaude(opts: ClaudeOptions): Promise<void> {
  const startTime = Date.now();

  // Get prompt from stdin if not provided
  let prompt = opts.prompt;
  if (!prompt) {
    prompt = await Bun.stdin.text();
    prompt = prompt.trim();
  }

  if (!prompt) {
    formatError({
      code: 'MISSING_PROMPT',
      message: 'No prompt provided',
      provider: 'openai', // Using 'openai' for compatibility with logging
    });
    process.exit(1);
  }

  // Get API key
  const apiKey = getApiKey('ANTHROPIC_API_KEY');
  if (!apiKey) {
    formatError({
      code: 'MISSING_API_KEY',
      message: 'ANTHROPIC_API_KEY not found in environment or $PAI_DIR/.env',
      provider: 'openai',
    });
    process.exit(1);
  }

  console.error(`🤖 Querying Claude (${opts.model})...`);

  // Build messages array
  const messages = [
    {
      role: 'user',
      content: prompt,
    }
  ];

  // Build request body
  const requestBody: any = {
    model: opts.model,
    messages,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    stream: opts.stream,
  };

  // Add system prompt if provided
  if (opts.system) {
    requestBody.system = opts.system;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      formatError({
        code: errorData.error?.type || `HTTP_${response.status}`,
        message: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        provider: 'openai',
      });
      process.exit(1);
    }

    if (opts.stream) {
      await handleStreamingResponse(response, opts, startTime);
    } else {
      await handleNonStreamingResponse(response, opts, startTime);
    }

  } catch (error) {
    formatError({
      code: 'NETWORK_ERROR',
      message: `Network error: ${(error as Error).message}`,
      provider: 'openai',
    });
    process.exit(1);
  }
}

async function handleStreamingResponse(
  response: Response,
  opts: ClaudeOptions,
  startTime: number
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);

            // Handle different event types
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text;
              if (text) {
                process.stdout.write(text);
                fullText += text;
              }
            } else if (parsed.type === 'message_start') {
              // Capture usage from message start
              if (parsed.message?.usage) {
                inputTokens = parsed.message.usage.input_tokens || 0;
              }
            } else if (parsed.type === 'message_delta') {
              // Capture output tokens from delta
              if (parsed.usage) {
                outputTokens = parsed.usage.output_tokens || 0;
              }
            }
          } catch (parseError) {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // Write final summary to stderr
    console.error(`\n\n✅ Complete (${durationMs}ms)`);
    console.error(`📊 Tokens: ${inputTokens} prompt + ${outputTokens} completion = ${inputTokens + outputTokens} total`);

    // Log to JSONL
    logAPICall({
      provider: 'openai', // Using 'openai' for compatibility
      model: opts.model,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      duration_ms: durationMs,
      success: true,
      streaming: true,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    });

  } catch (error) {
    throw new Error(`Streaming error: ${(error as Error).message}`);
  }
}

async function handleNonStreamingResponse(
  response: Response,
  opts: ClaudeOptions,
  startTime: number
): Promise<void> {
  const data = await response.json();

  // Extract text from response
  const text = data.content?.[0]?.text || '';

  if (!text) {
    throw new Error('Empty response from API');
  }

  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const totalTokens = inputTokens + outputTokens;
  const durationMs = Date.now() - startTime;

  // Output to stdout
  console.log(text);

  // Metadata to stderr
  console.error(`\n✅ Complete (${durationMs}ms)`);
  console.error(`📊 Tokens: ${inputTokens} prompt + ${outputTokens} completion = ${totalTokens} total`);

  // Log to JSONL
  logAPICall({
    provider: 'openai', // Using 'openai' for compatibility
    model: opts.model,
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
    total_tokens: totalTokens,
    duration_ms: durationMs,
    success: true,
    streaming: false,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  });
}

// Main
const opts = parseArgs();
queryClaude(opts).catch((err) => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
