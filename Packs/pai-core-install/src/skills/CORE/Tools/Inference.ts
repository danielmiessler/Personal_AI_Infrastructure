/**
 * Inference.ts - Lightweight LLM inference wrapper for hooks
 *
 * PURPOSE:
 * Provides a simple, dependency-free interface for making LLM calls from hooks.
 * Uses native fetch to call the Anthropic Messages API directly.
 *
 * USAGE:
 * ```typescript
 * import { inference } from '../skills/CORE/Tools/Inference';
 *
 * const result = await inference({
 *   systemPrompt: 'You are a classifier.',
 *   userPrompt: 'Classify this text',
 *   expectJson: true,
 *   level: 'fast',
 * });
 *
 * if (result.success) {
 *   console.log(result.parsed);  // For JSON
 *   console.log(result.output);  // For text
 * }
 * ```
 *
 * LEVELS:
 * - fast: claude-3-5-haiku-latest (cheap, fast, good for classification)
 * - standard: claude-sonnet-4-20250514 (balanced, good for most tasks)
 * - complex: claude-opus-4-5-20251101 (expensive, for complex reasoning)
 */

export interface InferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  expectJson?: boolean;
  timeout?: number;
  level?: 'fast' | 'standard' | 'complex';
}

export interface InferenceResult {
  success: boolean;
  output?: string;
  parsed?: any;
  error?: string;
}

// Model mapping by level
const MODELS: Record<string, string> = {
  fast: 'claude-3-5-haiku-latest',
  standard: 'claude-sonnet-4-20250514',
  complex: 'claude-opus-4-5-20251101',
};

const DEFAULT_TIMEOUT = 30000;
const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Make an LLM inference call to the Anthropic Messages API.
 */
export async function inference(options: InferenceOptions): Promise<InferenceResult> {
  const {
    systemPrompt,
    userPrompt,
    expectJson = false,
    timeout = DEFAULT_TIMEOUT,
    level = 'fast',
  } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'ANTHROPIC_API_KEY environment variable not set',
    };
  }

  const model = MODELS[level] || MODELS.fast;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();

    // Extract text from response
    const textBlock = data.content?.find((block: any) => block.type === 'text');
    const output = textBlock?.text || '';

    if (!output) {
      return {
        success: false,
        error: 'No text content in response',
      };
    }

    // Parse JSON if expected
    if (expectJson) {
      try {
        // Try to extract JSON from the response (handles markdown code blocks)
        let jsonStr = output;

        // Remove markdown code blocks if present
        const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);
        return {
          success: true,
          output,
          parsed,
        };
      } catch (parseError) {
        return {
          success: false,
          output,
          error: `JSON parse error: ${parseError}`,
        };
      }
    }

    return {
      success: true,
      output,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return {
        success: false,
        error: `Request timed out after ${timeout}ms`,
      };
    }

    return {
      success: false,
      error: `Request failed: ${err.message}`,
    };
  }
}
