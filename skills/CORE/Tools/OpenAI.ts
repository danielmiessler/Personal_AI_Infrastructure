#!/usr/bin/env bun
/**
 * OpenAI.ts - OpenAI API client with streaming support
 * Does ONE thing: Queries OpenAI's chat completion API
 *
 * Usage:
 *   bun run OpenAI.ts --prompt "hello" --model gpt-4o
 *   echo "hello" | bun run OpenAI.ts --system "You are helpful"
 *   bun run OpenAI.ts --prompt "story" --model gpt-4o --stream
 */

import { getApiKey, formatError, logAPICall } from './lib/llm-common';

interface OpenAIOptions {
  prompt?: string;
  model: string;
  system?: string;
  temperature: number;
  maxTokens?: number;
  stream: boolean;
}

const AVAILABLE_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4.5',
  'o3-mini',
] as const;

function parseArgs(): OpenAIOptions {
  const args = process.argv.slice(2);
  const opts: OpenAIOptions = {
    model: 'gpt-4o',
    temperature: 0.7,
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
      console.log(`Usage: bun run OpenAI.ts [options]

Options:
  --prompt TEXT         Prompt text (default: stdin)
  --model MODEL         Model name (default: gpt-4o)
  --system TEXT         System prompt
  --temperature NUM     Temperature 0.0-2.0 (default: 0.7)
  --max-tokens NUM      Max tokens to generate
  --stream              Enable streaming output
  --help                Show this help

Available Models:
  ${AVAILABLE_MODELS.join(', ')}

Environment:
  OPENAI_API_KEY       Required API key

Examples:
  bun run OpenAI.ts --prompt "What is 2+2?"
  echo "Write a haiku" | bun run OpenAI.ts --model gpt-4o-mini
  bun run OpenAI.ts --prompt "Tell a story" --stream --system "Be creative"
`);
      process.exit(0);
    }
  }

  return opts;
}

async function queryOpenAI(opts: OpenAIOptions): Promise<void> {
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
      provider: 'openai',
    });
    process.exit(1);
  }

  // Get API key
  const apiKey = getApiKey('OPENAI_API_KEY');
  if (!apiKey) {
    formatError({
      code: 'MISSING_API_KEY',
      message: 'OPENAI_API_KEY not found in environment or $PAI_DIR/.env',
      provider: 'openai',
    });
    process.exit(1);
  }

  console.error(`🤖 Querying OpenAI (${opts.model})...`);

  // Build messages array
  const messages: any[] = [];
  if (opts.system) {
    messages.push({ role: 'system', content: opts.system });
  }
  messages.push({ role: 'user', content: prompt });

  // Build request body
  const requestBody: any = {
    model: opts.model,
    messages,
    temperature: opts.temperature,
    stream: opts.stream,
  };

  if (opts.maxTokens) {
    requestBody.max_tokens = opts.maxTokens;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      formatError({
        code: errorData.error?.code || `HTTP_${response.status}`,
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
  opts: OpenAIOptions,
  startTime: number
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              process.stdout.write(content);
              fullText += content;
            }

            // Capture usage if present (OpenAI sends this in final chunk)
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens || 0;
              completionTokens = parsed.usage.completion_tokens || 0;
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
    console.error(`📊 Tokens: ${promptTokens} prompt + ${completionTokens} completion = ${promptTokens + completionTokens} total`);

    // Log to JSONL
    logAPICall({
      provider: 'openai',
      model: opts.model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
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
  opts: OpenAIOptions,
  startTime: number
): Promise<void> {
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  if (!text) {
    throw new Error('Empty response from API');
  }

  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;
  const totalTokens = data.usage?.total_tokens || 0;
  const durationMs = Date.now() - startTime;

  // Output to stdout
  console.log(text);

  // Metadata to stderr
  console.error(`\n✅ Complete (${durationMs}ms)`);
  console.error(`📊 Tokens: ${promptTokens} prompt + ${completionTokens} completion = ${totalTokens} total`);

  // Log to JSONL
  logAPICall({
    provider: 'openai',
    model: opts.model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
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
queryOpenAI(opts).catch((err) => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
