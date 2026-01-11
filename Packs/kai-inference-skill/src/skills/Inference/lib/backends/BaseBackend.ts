/**
 * BaseBackend - Abstract base class for all inference backends
 *
 * Defines the unified interface that all LLM backends must implement.
 * This abstraction allows tools to work with Ollama, Anthropic, OpenAI,
 * and future backends without backend-specific code.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Tool function definition
 */
export interface ToolFunction {
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

/**
 * Tool definition
 */
export interface Tool {
  type: 'function';
  function: ToolFunction;
}

/**
 * Tool call made by the model
 */
export interface ToolCall {
  id?: string;
  type: 'function';
  function: {
    name: string;
    arguments: string | Record<string, any>;
  };
}

/**
 * Standard message format (user/assistant/system/tool roles)
 * Compatible with all major LLM APIs
 */
export interface InferenceMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * Unified request format for inference operations
 * Maps to backend-specific request formats internally
 */
export interface InferenceRequest {
  // Either prompt (for simple generate) or messages (for chat)
  prompt?: string;
  messages?: InferenceMessage[];

  // Model specification (backend-specific format)
  model: string;

  // Generation parameters
  system?: string;           // System prompt
  temperature?: number;      // 0.0-1.0 creativity level
  maxTokens?: number;        // Maximum tokens to generate
  topP?: number;             // Nucleus sampling parameter
  topK?: number;             // Top-k sampling parameter
  format?: 'json';           // Request JSON output
  stream?: boolean;          // Enable streaming

  // Tool calling
  tools?: Tool[];            // Available tools for the model to call

  // Advanced options (not all backends support all)
  stop?: string[];           // Stop sequences
  frequencyPenalty?: number; // Repetition penalty (OpenAI)
  presencePenalty?: number;  // Presence penalty (OpenAI)
}

/**
 * Unified response format from inference operations
 */
export interface InferenceResponse {
  content: string;           // Generated text
  model: string;             // Model that generated response

  // Tool calling
  tool_calls?: ToolCall[];   // Tools the model wants to call

  // Token usage information
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  // Performance metadata
  metadata?: {
    duration?: number;         // Total duration in ms
    tokensPerSecond?: number;  // Generation speed
    stopReason?: string;       // Why generation stopped
  };
}

/**
 * Model information from listModels()
 */
export interface ModelInfo {
  name: string;              // Model identifier
  backend: string;           // Backend name (ollama, anthropic, openai)
  description?: string;      // Human-readable description
  size?: number;             // Model size in bytes (if available)
  parameterCount?: string;   // Parameter count (e.g., "7B", "13B")
  contextLength?: number;    // Maximum context window
  modifiedAt?: string;       // Last modified timestamp
}

/**
 * Health check result
 */
export interface HealthCheck {
  healthy: boolean;
  backend: string;
  latency?: number;          // Response time in ms
  error?: string;            // Error message if unhealthy
}

// ============================================================================
// Streaming Interface
// ============================================================================

/**
 * Handler for streaming responses
 * Allows callers to process tokens as they arrive
 */
export interface StreamHandler {
  onChunk: (text: string) => void;
  onComplete: (response: InferenceResponse) => void;
  onError: (error: Error) => void;
}

// ============================================================================
// Backend Configuration
// ============================================================================

/**
 * Configuration for backend initialization
 */
export interface BackendConfig {
  baseUrl?: string;          // API base URL (for API backends)
  apiKey?: string;           // API key (for API backends)
  timeout?: number;          // Request timeout in ms

  // Backend-specific options
  [key: string]: any;
}

// ============================================================================
// Abstract Base Class
// ============================================================================

/**
 * Abstract base class that all backends must extend
 *
 * Provides:
 * - Unified interface for all LLM operations
 * - Common error handling patterns
 * - Streaming support
 * - Health checking
 *
 * Each backend implements:
 * - Request format mapping (InferenceRequest → backend-specific)
 * - Response format mapping (backend-specific → InferenceResponse)
 * - Streaming protocol handling (NDJSON, SSE, etc.)
 * - Backend-specific error handling
 */
export abstract class BaseBackend {
  /**
   * Backend identifier (e.g., "ollama", "anthropic", "openai")
   */
  abstract readonly name: string;

  /**
   * Configuration for this backend instance
   */
  protected config: BackendConfig;

  constructor(config: BackendConfig = {}) {
    this.config = config;
  }

  // ==========================================================================
  // Core Operations (must be implemented by subclasses)
  // ==========================================================================

  /**
   * Generate text from a prompt
   *
   * @param request - Unified inference request
   * @returns Generated text with metadata
   */
  abstract generate(request: InferenceRequest): Promise<InferenceResponse>;

  /**
   * Multi-turn chat conversation
   *
   * @param request - Unified inference request with message history
   * @returns Assistant response with metadata
   */
  abstract chat(request: InferenceRequest): Promise<InferenceResponse>;

  /**
   * Generate embeddings for semantic operations
   *
   * @param text - Text to embed
   * @param model - Model to use for embeddings
   * @returns Vector representation
   */
  abstract embed(text: string, model: string): Promise<number[]>;

  /**
   * List available models for this backend
   *
   * @returns Array of model information
   */
  abstract listModels(): Promise<ModelInfo[]>;

  /**
   * Check if backend is available and healthy
   *
   * @returns Health check result
   */
  abstract checkHealth(): Promise<HealthCheck>;

  // ==========================================================================
  // Optional Features (default implementations)
  // ==========================================================================

  /**
   * Whether this backend supports streaming responses
   * Override if backend doesn't support streaming
   */
  supportsStreaming(): boolean {
    return true;
  }

  /**
   * Whether this backend supports embeddings
   * Override if backend doesn't support embeddings
   */
  supportsEmbeddings(): boolean {
    return false;
  }

  /**
   * Whether this backend supports JSON mode
   * Override if backend doesn't support JSON output
   */
  supportsJsonMode(): boolean {
    return false;
  }

  /**
   * Whether this backend supports system prompts
   * Override if backend doesn't support system messages
   */
  supportsSystemPrompt(): boolean {
    return true;
  }

  /**
   * Get the default model for this backend
   * Override to provide backend-specific default
   */
  getDefaultModel(): string | undefined {
    return undefined;
  }

  // ==========================================================================
  // Utility Methods (for subclass use)
  // ==========================================================================

  /**
   * Build error message with backend context
   */
  protected buildError(message: string, cause?: Error): Error {
    const error = new Error(`[${this.name}] ${message}`);
    if (cause) {
      error.cause = cause;
    }
    return error;
  }

  /**
   * Validate that required config values are present
   */
  protected validateConfig(required: string[]): void {
    for (const key of required) {
      if (!this.config[key]) {
        throw this.buildError(`Missing required configuration: ${key}`);
      }
    }
  }

  /**
   * Create timeout controller for requests
   */
  protected createTimeout(timeoutMs: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller;
  }
}

// ============================================================================
// Export All Types
// ============================================================================

export type {
  InferenceMessage,
  InferenceRequest,
  InferenceResponse,
  ModelInfo,
  HealthCheck,
  StreamHandler,
  BackendConfig,
};
