/**
 * AnthropicBackend - Claude API backend implementation
 *
 * Provides access to Anthropic's Claude models via their API.
 *
 * Features:
 * - Uses @anthropic-ai/sdk
 * - SSE streaming protocol
 * - Best-in-class reasoning models
 * - Long context support (200K+ tokens)
 * - Tool use capabilities (future enhancement)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsBase, Message, MessageStreamEvent } from '@anthropic-ai/sdk/resources/messages.js';
import {
  BaseBackend,
  InferenceRequest,
  InferenceResponse,
  ModelInfo,
  HealthCheck,
  BackendConfig,
} from './BaseBackend.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULTS = {
  model: 'claude-sonnet-4.5',
  timeout: 60000,            // 60s timeout (Claude can be slower than local)
  maxTokens: 4096,           // Default max output tokens
};

// ============================================================================
// Available Models
// ============================================================================

const CLAUDE_MODELS: ModelInfo[] = [
  {
    name: 'claude-opus-4.5',
    backend: 'anthropic',
    description: 'Most capable model. Best for complex reasoning, analysis, and creative tasks.',
    parameterCount: 'Unknown',
    contextLength: 200000,
  },
  {
    name: 'claude-sonnet-4.5',
    backend: 'anthropic',
    description: 'Balanced model. Great performance and speed for most tasks.',
    parameterCount: 'Unknown',
    contextLength: 200000,
  },
  {
    name: 'claude-haiku-4',
    backend: 'anthropic',
    description: 'Fastest model. Best for quick responses and high-volume tasks.',
    parameterCount: 'Unknown',
    contextLength: 200000,
  },
  {
    name: 'claude-opus-4',
    backend: 'anthropic',
    description: 'Previous generation Opus. Still very capable.',
    parameterCount: 'Unknown',
    contextLength: 200000,
  },
  {
    name: 'claude-sonnet-4',
    backend: 'anthropic',
    description: 'Previous generation Sonnet.',
    parameterCount: 'Unknown',
    contextLength: 200000,
  },
];

// ============================================================================
// Anthropic Backend Implementation
// ============================================================================

export class AnthropicBackend extends BaseBackend {
  readonly name = 'anthropic';

  private client: Anthropic;
  private timeout: number;

  constructor(config: BackendConfig = {}) {
    super(config);

    // Get API key from config or environment
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw this.buildError(
        'ANTHROPIC_API_KEY not found. Please set it in your environment or config.'
      );
    }

    this.timeout = config.timeout ||
                   (process.env.ANTHROPIC_TIMEOUT ? parseInt(process.env.ANTHROPIC_TIMEOUT) : DEFAULTS.timeout);

    // Initialize Anthropic SDK client
    this.client = new Anthropic({
      apiKey,
      timeout: this.timeout,
    });
  }

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  async generate(request: InferenceRequest): Promise<InferenceResponse> {
    // Generate is essentially chat with a single user message
    const chatRequest: InferenceRequest = {
      ...request,
      messages: [
        {
          role: 'user',
          content: request.prompt || '',
        },
      ],
    };

    return await this.chat(chatRequest);
  }

  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    try {
      const params = this.mapToAnthropicParams(request);

      // Handle streaming vs non-streaming
      if (request.stream) {
        return await this.handleStreamingResponse(params);
      } else {
        const response = await this.client.messages.create(params);
        return this.mapFromAnthropicResponse(response);
      }
    } catch (error: any) {
      // Map Anthropic SDK errors to our format
      if (error.status === 401) {
        throw this.buildError('Invalid API key. Check ANTHROPIC_API_KEY.', error);
      }
      if (error.status === 429) {
        throw this.buildError('Rate limit exceeded. Please try again later.', error);
      }
      if (error.status === 500) {
        throw this.buildError('Anthropic API error. Please try again.', error);
      }
      throw this.buildError(`API request failed: ${error.message}`, error);
    }
  }

  async embed(text: string, model: string): Promise<number[]> {
    // Anthropic doesn't provide embeddings via their main API
    // Would need to use Voyage AI or similar
    throw this.buildError(
      'Embeddings not supported by Anthropic API. Use Ollama backend with nomic-embed-text or similar.'
    );
  }

  async listModels(): Promise<ModelInfo[]> {
    // Anthropic doesn't have a list models endpoint
    // Return our static list of known models
    return CLAUDE_MODELS;
  }

  async checkHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Make a minimal API call to check if credentials are valid
      // Using a very short max_tokens to minimize cost
      await this.client.messages.create({
        model: 'claude-haiku-4',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        backend: this.name,
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        backend: this.name,
        latency: Date.now() - startTime,
        error: error.status === 401
          ? 'Invalid API key'
          : error.message || 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // Capability Flags
  // ==========================================================================

  supportsStreaming(): boolean {
    return true;
  }

  supportsEmbeddings(): boolean {
    return false;
  }

  supportsJsonMode(): boolean {
    // Anthropic supports JSON mode but not as a simple flag
    // It requires specific prompting or tool use
    return false;
  }

  supportsSystemPrompt(): boolean {
    return true;
  }

  getDefaultModel(): string {
    return process.env.ANTHROPIC_DEFAULT_MODEL || DEFAULTS.model;
  }

  // ==========================================================================
  // Request/Response Mapping
  // ==========================================================================

  private mapToAnthropicParams(request: InferenceRequest): MessageCreateParamsBase {
    // Build base params
    const params: MessageCreateParamsBase = {
      model: request.model,
      max_tokens: request.maxTokens || DEFAULTS.maxTokens,
      messages: request.messages || [],
      stream: request.stream ?? false,
    };

    // Add system prompt if provided
    if (request.system) {
      params.system = request.system;
    }

    // Add temperature if provided
    if (request.temperature !== undefined) {
      params.temperature = request.temperature;
    }

    // Add top_p if provided
    if (request.topP !== undefined) {
      params.top_p = request.topP;
    }

    // Add top_k if provided
    if (request.topK !== undefined) {
      params.top_k = request.topK;
    }

    // Add stop sequences if provided
    if (request.stop !== undefined) {
      params.stop_sequences = request.stop;
    }

    return params;
  }

  private mapFromAnthropicResponse(response: Message): InferenceResponse {
    // Extract text content from response
    let content = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      }
    }

    const result: InferenceResponse = {
      content,
      model: response.model,
    };

    // Add usage information
    if (response.usage) {
      result.usage = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };
    }

    // Add metadata
    result.metadata = {
      stopReason: response.stop_reason || undefined,
    };

    return result;
  }

  // ==========================================================================
  // Streaming Handler (SSE Protocol)
  // ==========================================================================

  private async handleStreamingResponse(params: MessageCreateParamsBase): Promise<InferenceResponse> {
    let fullContent = '';
    let finalResponse: Message | null = null;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      // Create streaming request
      const stream = await this.client.messages.stream(params);

      // Process stream events
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const text = event.delta.text;
            process.stdout.write(text);
            fullContent += text;
          }
        } else if (event.type === 'message_start') {
          if (event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        } else if (event.type === 'message_delta') {
          if (event.usage) {
            outputTokens = event.usage.output_tokens;
          }
        }
      }

      process.stdout.write('\n');

      // Get final message
      finalResponse = await stream.finalMessage();

      // Build response
      const result: InferenceResponse = {
        content: fullContent,
        model: finalResponse.model,
      };

      // Add usage information
      if (inputTokens || outputTokens) {
        result.usage = {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        };
      }

      // Add metadata
      result.metadata = {
        stopReason: finalResponse.stop_reason || undefined,
      };

      return result;
    } catch (error: any) {
      // Clean up on error
      process.stdout.write('\n');
      throw this.buildError(`Streaming failed: ${error.message}`, error);
    }
  }
}
