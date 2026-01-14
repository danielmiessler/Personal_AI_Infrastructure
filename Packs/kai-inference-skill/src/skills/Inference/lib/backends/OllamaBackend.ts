/**
 * OllamaBackend - Ollama local LLM backend implementation
 *
 * Provides access to locally-running Ollama models.
 * Extracted from Generate.ts and adapted to BaseBackend interface.
 *
 * Features:
 * - Dependency-free (uses native fetch)
 * - NDJSON streaming protocol
 * - Full embeddings support
 * - No API key required
 */

import {
  BaseBackend,
  InferenceRequest,
  InferenceResponse,
  ModelInfo,
  HealthCheck,
  BackendConfig,
} from './BaseBackend.js';
import { getPaiSystemPrompt } from '../PaiIdentity.js';

// ============================================================================
// Ollama-Specific Types
// ============================================================================

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

interface OllamaTool {
  type: 'function';
  function: OllamaToolFunction;
}

interface OllamaToolCall {
  id?: string;
  type: 'function';
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}

interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  tools?: OllamaTool[];
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

interface OllamaEmbedResponse {
  embedding: number[];
}

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

interface OllamaTagsResponse {
  models: OllamaModel[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen3:4b',
  healthCheckInterval: 60000,  // Check backend health every 5 seconds during streaming
  timeout: 600000,  // 10 minutes default timeout for generation requests (tool calling can be slow)
};

// ============================================================================
// Ollama Backend Implementation
// ============================================================================

export class OllamaBackend extends BaseBackend {
  readonly name = 'ollama';

  private baseUrl: string;
  private healthCheckInterval: number;
  private timeout: number;
  private paiSystemPrompt: string | null = null;
  private usePaiIdentity: boolean;
  private paiMode: 'full' | 'lite';

  constructor(config: BackendConfig = {}) {
    super(config);

    // Load from env vars with fallbacks
    this.baseUrl = config.baseUrl ||
                   process.env.OLLAMA_BASE_URL ||
                   DEFAULTS.baseUrl;

    this.healthCheckInterval = config.healthCheckInterval ||
                               (process.env.OLLAMA_HEALTH_CHECK_INTERVAL ? parseInt(process.env.OLLAMA_HEALTH_CHECK_INTERVAL) : DEFAULTS.healthCheckInterval);

    this.timeout = config.timeout ||
                   (process.env.OLLAMA_TIMEOUT ? parseInt(process.env.OLLAMA_TIMEOUT) : DEFAULTS.timeout);

    // Check if PAI identity should be used (default: true)
    this.usePaiIdentity = config.usePaiIdentity ??
                          (process.env.OLLAMA_USE_PAI_IDENTITY !== 'false');

    // Check PAI mode (default: 'lite' for better performance with small models)
    const envMode = process.env.OLLAMA_PAI_MODE?.toLowerCase();
    this.paiMode = (envMode === 'full' || envMode === 'lite') ? envMode as 'full' | 'lite' : 'lite';

    // Load PAI identity asynchronously (will be available after first call)
    if (this.usePaiIdentity) {
      this.loadPaiIdentity();
    }
  }

  /**
   * Load PAI identity system prompt
   */
  private async loadPaiIdentity(): Promise<void> {
    try {
      this.paiSystemPrompt = await getPaiSystemPrompt(this.paiMode);
    } catch (error) {
      // Graceful degradation - identity not required
      this.paiSystemPrompt = null;
    }
  }

  // ==========================================================================
  // Core Operations
  // ==========================================================================

  async generate(request: InferenceRequest): Promise<InferenceResponse> {
    // Ensure PAI identity is loaded
    if (this.usePaiIdentity && this.paiSystemPrompt === null) {
      await this.loadPaiIdentity();
    }

    const ollamaRequest = this.mapToOllamaGenerate(request);
    const url = `${this.baseUrl}/api/generate`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaRequest),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw this.buildError(`API error (${response.status}): ${errorText}`);
      }

      // Handle streaming vs non-streaming
      if (request.stream) {
        return await this.handleStreamingGenerate(response);
      } else {
        const data = await response.json() as OllamaGenerateResponse;
        return this.mapFromOllamaGenerate(data);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw this.buildError(
          `Cannot connect to Ollama at ${this.baseUrl}. Ensure Ollama is running: ollama serve`
        );
      }
      throw error;
    }
  }

  async chat(request: InferenceRequest): Promise<InferenceResponse> {
    // Ensure PAI identity is loaded
    if (this.usePaiIdentity && this.paiSystemPrompt === null) {
      await this.loadPaiIdentity();
    }

    const ollamaRequest = this.mapToOllamaChat(request);
    const url = `${this.baseUrl}/api/chat`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaRequest),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw this.buildError(`API error (${response.status}): ${errorText}`);
      }

      // Handle streaming vs non-streaming
      if (request.stream) {
        return await this.handleStreamingChat(response);
      } else {
        const data = await response.json() as OllamaChatResponse;
        return this.mapFromOllamaChat(data);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw this.buildError(
          `Cannot connect to Ollama at ${this.baseUrl}. Ensure Ollama is running: ollama serve`
        );
      }
      throw error;
    }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw this.buildError(`Embeddings API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as OllamaEmbedResponse;
      return data.embedding;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw this.buildError(
          `Cannot connect to Ollama at ${this.baseUrl}. Ensure Ollama is running: ollama serve`
        );
      }
      throw error;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const url = `${this.baseUrl}/api/tags`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw this.buildError(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json() as OllamaTagsResponse;

      return data.models.map(model => ({
        name: model.name,
        backend: this.name,
        description: `${model.details?.family || 'Unknown'} ${model.details?.parameter_size || ''}`.trim(),
        size: model.size,
        parameterCount: model.details?.parameter_size,
        modifiedAt: model.modified_at,
      }));
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw this.buildError(
          `Cannot connect to Ollama at ${this.baseUrl}. Ensure Ollama is running: ollama serve`
        );
      }
      throw error;
    }
  }

  async checkHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000), // Quick 3s timeout for health check
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        return {
          healthy: false,
          backend: this.name,
          latency,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

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
        error: error.code === 'ECONNREFUSED'
          ? `Cannot connect to ${this.baseUrl}`
          : error.message,
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
    return true;
  }

  supportsJsonMode(): boolean {
    return true;
  }

  supportsSystemPrompt(): boolean {
    return true;
  }

  getDefaultModel(): string {
    return process.env.OLLAMA_DEFAULT_MODEL || DEFAULTS.model;
  }

  // ==========================================================================
  // Request/Response Mapping
  // ==========================================================================

  private mapToOllamaGenerate(request: InferenceRequest): OllamaGenerateRequest {
    const ollamaRequest: OllamaGenerateRequest = {
      model: request.model,
      prompt: request.prompt || '',
      stream: request.stream ?? true,
    };

    // Merge PAI identity with request-specific system prompt
    const systemPrompts: string[] = [];
    if (this.paiSystemPrompt) {
      systemPrompts.push(this.paiSystemPrompt);
    }
    if (request.system) {
      systemPrompts.push(request.system);
    }

    if (systemPrompts.length > 0) {
      ollamaRequest.system = systemPrompts.join('\n\n---\n\n');
    }

    if (request.format) {
      ollamaRequest.format = request.format;
    }

    // Map sampling parameters
    if (request.temperature !== undefined ||
        request.topP !== undefined ||
        request.topK !== undefined ||
        request.maxTokens !== undefined ||
        request.stop !== undefined) {
      ollamaRequest.options = {};

      if (request.temperature !== undefined) ollamaRequest.options.temperature = request.temperature;
      if (request.topP !== undefined) ollamaRequest.options.top_p = request.topP;
      if (request.topK !== undefined) ollamaRequest.options.top_k = request.topK;
      if (request.maxTokens !== undefined) ollamaRequest.options.num_predict = request.maxTokens;
      if (request.stop !== undefined) ollamaRequest.options.stop = request.stop;
    }

    return ollamaRequest;
  }

  private mapToOllamaChat(request: InferenceRequest): OllamaChatRequest {
    // Merge PAI identity with request messages
    let messages = request.messages || [];

    // Add PAI identity as system message if available
    if (this.paiSystemPrompt) {
      // Check if there's already a system message
      const hasSystemMessage = messages.some(m => m.role === 'system');

      if (hasSystemMessage) {
        // Merge with existing system message
        messages = messages.map(m => {
          if (m.role === 'system') {
            return {
              role: 'system',
              content: `${this.paiSystemPrompt}\n\n---\n\n${m.content}`,
            };
          }
          return m;
        });
      } else {
        // Add PAI identity as first system message
        messages = [
          { role: 'system', content: this.paiSystemPrompt },
          ...messages,
        ];
      }
    }

    // Transform messages for Ollama format
    // If a message has tool_calls with string arguments, parse them to objects
    const ollamaMessages = messages.map(msg => {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        return {
          ...msg,
          tool_calls: msg.tool_calls.map(tc => ({
            ...tc,
            function: {
              ...tc.function,
              arguments: typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments,
            },
          })),
        };
      }
      return msg;
    });

    const ollamaRequest: OllamaChatRequest = {
      model: request.model,
      messages: ollamaMessages,
      stream: request.stream ?? true,
    };

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      ollamaRequest.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      }));
    }

    if (request.format) {
      ollamaRequest.format = request.format;
    }

    // Map sampling parameters
    if (request.temperature !== undefined ||
        request.topP !== undefined ||
        request.topK !== undefined ||
        request.maxTokens !== undefined ||
        request.stop !== undefined) {
      ollamaRequest.options = {};

      if (request.temperature !== undefined) ollamaRequest.options.temperature = request.temperature;
      if (request.topP !== undefined) ollamaRequest.options.top_p = request.topP;
      if (request.topK !== undefined) ollamaRequest.options.top_k = request.topK;
      if (request.maxTokens !== undefined) ollamaRequest.options.num_predict = request.maxTokens;
      if (request.stop !== undefined) ollamaRequest.options.stop = request.stop;
    }

    return ollamaRequest;
  }

  private mapFromOllamaGenerate(response: OllamaGenerateResponse): InferenceResponse {
    const result: InferenceResponse = {
      content: response.response,
      model: response.model,
    };

    // Add usage information if available
    if (response.prompt_eval_count || response.eval_count) {
      result.usage = {
        promptTokens: response.prompt_eval_count,
        completionTokens: response.eval_count,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      };
    }

    // Add performance metadata
    if (response.total_duration || response.eval_duration || response.eval_count) {
      result.metadata = {};

      if (response.total_duration) {
        result.metadata.duration = response.total_duration / 1e6; // Convert ns to ms
      }

      if (response.eval_count && response.eval_duration) {
        result.metadata.tokensPerSecond = response.eval_count / (response.eval_duration / 1e9);
      }

      if (response.done) {
        result.metadata.stopReason = 'stop';
      }
    }

    return result;
  }

  private mapFromOllamaChat(response: OllamaChatResponse): InferenceResponse {
    const result: InferenceResponse = {
      content: response.message.content,
      model: response.model,
    };

    // Add tool calls if present
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      result.tool_calls = response.message.tool_calls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: typeof tc.function.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
        },
      }));
    }

    // Add usage information if available
    if (response.eval_count) {
      result.usage = {
        completionTokens: response.eval_count,
        totalTokens: response.eval_count,
      };
    }

    // Add performance metadata
    if (response.total_duration || response.eval_duration || response.eval_count) {
      result.metadata = {};

      if (response.total_duration) {
        result.metadata.duration = response.total_duration / 1e6; // Convert ns to ms
      }

      if (response.eval_count && response.eval_duration) {
        result.metadata.tokensPerSecond = response.eval_count / (response.eval_duration / 1e9);
      }

      if (response.done) {
        result.metadata.stopReason = 'stop';
      }
    }

    return result;
  }

  // ==========================================================================
  // Health Monitoring During Streaming
  // ==========================================================================

  /**
   * Starts periodic health checks during streaming
   * Returns a cleanup function that should be called when streaming completes
   */
  private startHealthMonitoring(): () => void {
    const intervalMs = this.healthCheckInterval;
    let isMonitoring = true;

    const monitor = async () => {
      while (isMonitoring) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));

        if (!isMonitoring) break;

        try {
          const health = await this.checkHealth();
          if (!health.healthy) {
            console.error(`\n[Health Check Failed] Backend unhealthy: ${health.error}`);
            // Don't throw here, just log - the stream will fail naturally if backend is down
          }
        } catch (error) {
          // Health check failed, but continue monitoring
          console.error(`\n[Health Check Failed] ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    // Start monitoring in background
    monitor();

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
  }

  // ==========================================================================
  // Streaming Handlers (NDJSON Protocol)
  // ==========================================================================

  private async handleStreamingGenerate(response: Response): Promise<InferenceResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw this.buildError('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let finalData: OllamaGenerateResponse | null = null;

    // Start health monitoring
    const stopHealthMonitoring = this.startHealthMonitoring();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaGenerateResponse;

            // Print response token by token
            if (data.response) {
              process.stdout.write(data.response);
              fullResponse += data.response;
            }

            if (data.done) {
              finalData = data;
              finalData.response = fullResponse;
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }

      process.stdout.write('\n');

      if (!finalData) {
        throw this.buildError('Incomplete streaming response');
      }

      return this.mapFromOllamaGenerate(finalData);
    } finally {
      stopHealthMonitoring();
      reader.releaseLock();
    }
  }

  private async handleStreamingChat(response: Response): Promise<InferenceResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw this.buildError('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let finalData: OllamaChatResponse | null = null;

    // Start health monitoring
    const stopHealthMonitoring = this.startHealthMonitoring();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaChatResponse;

            // Print response token by token
            if (data.message?.content) {
              process.stdout.write(data.message.content);
              fullResponse += data.message.content;
            }

            if (data.done) {
              finalData = data;
              finalData.message.content = fullResponse;
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }

      process.stdout.write('\n');

      if (!finalData) {
        throw this.buildError('Incomplete streaming response');
      }

      return this.mapFromOllamaChat(finalData);
    } finally {
      stopHealthMonitoring();
      reader.releaseLock();
    }
  }
}
