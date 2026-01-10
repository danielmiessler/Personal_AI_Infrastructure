#!/usr/bin/env bun
/**
 * Gemini.ts - Google Gemini API client with streaming support
 * Does ONE thing: Queries Google's Gemini API
 *
 * Usage:
 *   bun run Gemini.ts --prompt "hello" --model gemini-2.5-flash
 *   echo "hello" | bun run Gemini.ts --system "You are helpful"
 *   bun run Gemini.ts --prompt "story" --stream
 */

import { getApiKey, formatError, logAPICall } from './lib/llm-common';

interface GeminiOptions {
  prompt?: string;
  model: string;
  system?: string;
  temperature: number;
  maxTokens?: number;
  stream: boolean;
}

const AVAILABLE_MODELS = [
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

function parseArgs(): GeminiOptions {
  const args = process.argv.slice(2);
  const opts: GeminiOptions = {
    model: 'gemini-2.5-flash',
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
      console.log(`Usage: bun run Gemini.ts [options]

Options:
  --prompt TEXT         Prompt text (default: stdin)
  --model MODEL         Model name (default: gemini-2.5-flash)
  --system TEXT         System prompt
  --temperature NUM     Temperature 0.0-2.0 (default: 0.7)
  --max-tokens NUM      Max tokens to generate
  --stream              Enable streaming output
  --help                Show this help

Available Models:
  ${AVAILABLE_MODELS.join(', ')}

Environment:
  GEMINI_API_KEY       Required API key (also accepts GOOGLE_API_KEY)

Examples:
  bun run Gemini.ts --prompt "What is 2+2?"
  echo "Write a haiku" | bun run Gemini.ts --model gemini-2.5-pro
  bun run Gemini.ts --prompt "Tell a story" --stream --system "Be creative"
`);
      process.exit(0);
    }
  }

  return opts;
}

async function queryGemini(opts: GeminiOptions): Promise<void> {
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
      provider: 'gemini',
    });
    process.exit(1);
  }

  // Get API key (try both GEMINI_API_KEY and GOOGLE_API_KEY)
  let apiKey = getApiKey('GEMINI_API_KEY');
  if (!apiKey) {
    apiKey = getApiKey('GOOGLE_API_KEY');
  }

  if (!apiKey) {
    formatError({
      code: 'MISSING_API_KEY',
      message: 'GEMINI_API_KEY or GOOGLE_API_KEY not found in environment or $PAI_DIR/.env',
      provider: 'gemini',
    });
    process.exit(1);
  }

  console.error(`🤖 Querying Gemini (${opts.model})...`);

  // Build request body
  const contents: any[] = [];

  // Add user message
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: opts.temperature,
    },
  };

  // Add system instruction if provided
  if (opts.system) {
    requestBody.systemInstruction = {
      parts: [{ text: opts.system }]
    };
  }

  if (opts.maxTokens) {
    requestBody.generationConfig.maxOutputTokens = opts.maxTokens;
  }

  try {
    const endpoint = opts.stream
      ? `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:streamGenerateContent?key=${apiKey}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      formatError({
        code: errorData.error?.code || `HTTP_${response.status}`,
        message: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        provider: 'gemini',
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
      provider: 'gemini',
    });
    process.exit(1);
  }
}

async function handleStreamingResponse(
  response: Response,
  opts: GeminiOptions,
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

      // Gemini returns newline-delimited JSON
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);

          // Extract text from candidates
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            process.stdout.write(text);
            fullText += text;
          }

          // Capture usage metadata
          if (parsed.usageMetadata) {
            promptTokens = parsed.usageMetadata.promptTokenCount || 0;
            completionTokens = parsed.usageMetadata.candidatesTokenCount || 0;
          }
        } catch (parseError) {
          // Skip malformed JSON
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const totalTokens = promptTokens + completionTokens;

    // Write final summary to stderr
    console.error(`\n\n✅ Complete (${durationMs}ms)`);
    console.error(`📊 Tokens: ${promptTokens} prompt + ${completionTokens} completion = ${totalTokens} total`);

    // Log to JSONL
    logAPICall({
      provider: 'gemini',
      model: opts.model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
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
  opts: GeminiOptions,
  startTime: number
): Promise<void> {
  const data = await response.json();

  // Extract text from response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!text) {
    throw new Error('Empty response from API');
  }

  const promptTokens = data.usageMetadata?.promptTokenCount || 0;
  const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
  const totalTokens = data.usageMetadata?.totalTokenCount || 0;
  const durationMs = Date.now() - startTime;

  // Output to stdout
  console.log(text);

  // Metadata to stderr
  console.error(`\n✅ Complete (${durationMs}ms)`);
  console.error(`📊 Tokens: ${promptTokens} prompt + ${completionTokens} completion = ${totalTokens} total`);

  // Log to JSONL
  logAPICall({
    provider: 'gemini',
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
queryGemini(opts).catch((err) => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
