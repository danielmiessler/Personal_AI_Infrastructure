/**
 * BackendRegistry - Central registry for managing multiple LLM backends
 *
 * Provides:
 * - Backend registration and lookup
 * - Smart backend selection based on model name, explicit flags, and env vars
 * - Model name auto-detection (claude-* → anthropic, gpt-* → openai, etc.)
 * - Availability checking (only return backends with valid configuration)
 * - Default fallback logic
 */

import { BaseBackend, BackendConfig } from './backends/BaseBackend.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Backend configuration for registration
 */
export interface BackendRegistration {
  name: string;                    // Backend identifier (ollama, anthropic, openai)
  backend: BaseBackend;            // Backend instance
  modelPrefixes?: string[];        // Model name prefixes for auto-detection
  modelPatterns?: RegExp[];        // Model name patterns for auto-detection
}

/**
 * Backend selection request
 */
export interface BackendSelectionRequest {
  explicitBackend?: string;        // From --backend flag (highest priority)
  model?: string;                  // From --model flag (for auto-detection)
  taskType?: string;               // From routing analysis (future use)
}

// ============================================================================
// Backend Registry Implementation
// ============================================================================

export class BackendRegistry {
  private backends: Map<string, BackendRegistration> = new Map();

  // ==========================================================================
  // Registration
  // ==========================================================================

  /**
   * Register a backend instance with auto-detection rules
   */
  register(registration: BackendRegistration): void {
    this.backends.set(registration.name, registration);
  }

  /**
   * Unregister a backend
   */
  unregister(name: string): void {
    this.backends.delete(name);
  }

  /**
   * Check if a backend is registered
   */
  has(name: string): boolean {
    return this.backends.has(name);
  }

  // ==========================================================================
  // Lookup
  // ==========================================================================

  /**
   * Get a specific backend by name
   */
  get(name: string): BaseBackend | undefined {
    return this.backends.get(name)?.backend;
  }

  /**
   * List all registered backend names
   */
  listRegistered(): string[] {
    return Array.from(this.backends.keys());
  }

  /**
   * List backends that are currently available (healthy)
   *
   * This checks health of all backends and returns only those that respond
   */
  async listAvailable(): Promise<string[]> {
    const available: string[] = [];

    for (const [name, registration] of this.backends.entries()) {
      try {
        const health = await registration.backend.checkHealth();
        if (health.healthy) {
          available.push(name);
        }
      } catch {
        // Backend unavailable, skip
      }
    }

    return available;
  }

  // ==========================================================================
  // Smart Selection
  // ==========================================================================

  /**
   * Select the appropriate backend based on multiple factors
   *
   * Selection priority:
   * 1. Explicit --backend flag
   * 2. Model name prefix (backend:model format)
   * 3. Model name pattern matching (claude-*, gpt-*, etc.)
   * 4. INFERENCE_DEFAULT_BACKEND environment variable
   * 5. OLLAMA_DEFAULT_MODEL environment variable (backward compatibility)
   * 6. First registered backend
   */
  selectBackend(request: BackendSelectionRequest): BaseBackend {
    // 1. Explicit backend flag (highest priority)
    if (request.explicitBackend) {
      const backend = this.get(request.explicitBackend);
      if (!backend) {
        throw new Error(
          `Backend '${request.explicitBackend}' not found. ` +
          `Available backends: ${this.listRegistered().join(', ')}`
        );
      }
      return backend;
    }

    // 2. Model name with prefix (e.g., "anthropic:claude-opus-4.5")
    if (request.model?.includes(':')) {
      const [backendName, modelName] = request.model.split(':', 2);

      const backend = this.get(backendName);
      if (backend) {
        return backend;
      }

      // If backend not found, try to match the full string as a model name
      // (e.g., "llama3.2:latest" should match Ollama, not fail)
    }

    // 3. Model name pattern matching
    if (request.model) {
      const backend = this.detectBackendFromModel(request.model);
      if (backend) {
        return backend;
      }
    }

    // 4. INFERENCE_DEFAULT_BACKEND environment variable
    const defaultBackendName = process.env.INFERENCE_DEFAULT_BACKEND;
    if (defaultBackendName) {
      const backend = this.get(defaultBackendName);
      if (backend) {
        return backend;
      }
    }

    // 5. OLLAMA_DEFAULT_MODEL (backward compatibility)
    // If the model name matches Ollama patterns, use Ollama
    if (process.env.OLLAMA_DEFAULT_MODEL) {
      const ollama = this.get('ollama');
      if (ollama) {
        return ollama;
      }
    }

    // 6. First registered backend (fallback)
    const firstBackend = this.backends.values().next().value;
    if (firstBackend) {
      return firstBackend.backend;
    }

    throw new Error('No backends registered');
  }

  /**
   * Detect backend from model name using patterns
   *
   * Auto-detection rules:
   * - claude-* → anthropic
   * - gpt-*, chatgpt-* → openai
   * - llama*, qwen*, mistral*, deepseek*, *:* → ollama
   */
  private detectBackendFromModel(model: string): BaseBackend | undefined {
    const lowerModel = model.toLowerCase();

    // Check registered pattern matchers first
    for (const [name, registration] of this.backends.entries()) {
      // Check prefixes
      if (registration.modelPrefixes) {
        for (const prefix of registration.modelPrefixes) {
          if (lowerModel.startsWith(prefix.toLowerCase())) {
            return registration.backend;
          }
        }
      }

      // Check regex patterns
      if (registration.modelPatterns) {
        for (const pattern of registration.modelPatterns) {
          if (pattern.test(lowerModel)) {
            return registration.backend;
          }
        }
      }
    }

    // Default heuristics (if not explicitly registered)
    if (lowerModel.startsWith('claude-')) {
      return this.get('anthropic');
    }

    if (lowerModel.startsWith('gpt-') || lowerModel.startsWith('chatgpt-')) {
      return this.get('openai');
    }

    // Ollama models often have : in name or match common patterns
    if (lowerModel.includes(':') ||
        lowerModel.startsWith('llama') ||
        lowerModel.startsWith('qwen') ||
        lowerModel.startsWith('mistral') ||
        lowerModel.startsWith('deepseek') ||
        lowerModel.startsWith('codellama') ||
        lowerModel.startsWith('phi') ||
        lowerModel.startsWith('gemma')) {
      return this.get('ollama');
    }

    return undefined;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Parse model name that may include backend prefix
   *
   * Examples:
   * - "anthropic:claude-opus-4.5" → { backend: "anthropic", model: "claude-opus-4.5" }
   * - "claude-opus-4.5" → { backend: undefined, model: "claude-opus-4.5" }
   * - "ollama:llama3.2:latest" → { backend: "ollama", model: "llama3.2:latest" }
   */
  parseModelName(modelName: string): { backend?: string; model: string } {
    // Check if model name has backend prefix
    if (modelName.includes(':')) {
      // Need to be careful: "llama3.2:latest" is an Ollama model, not a prefix
      // Only treat first part as backend if it's a registered backend name
      const firstColon = modelName.indexOf(':');
      const potentialBackend = modelName.slice(0, firstColon);

      if (this.has(potentialBackend)) {
        return {
          backend: potentialBackend,
          model: modelName.slice(firstColon + 1),
        };
      }
    }

    // No backend prefix found
    return { model: modelName };
  }

  /**
   * Build full model name with backend prefix
   *
   * Examples:
   * - ("anthropic", "claude-opus-4.5") → "anthropic:claude-opus-4.5"
   * - ("ollama", "llama3.2:latest") → "ollama:llama3.2:latest"
   */
  buildFullModelName(backend: string, model: string): string {
    return `${backend}:${model}`;
  }

  /**
   * Get default model for a backend
   *
   * Checks backend's getDefaultModel() and falls back to environment variables
   */
  getDefaultModel(backendName: string): string | undefined {
    const backend = this.get(backendName);
    if (!backend) {
      return undefined;
    }

    // Try backend's own default
    const backendDefault = backend.getDefaultModel();
    if (backendDefault) {
      return backendDefault;
    }

    // Try environment variables
    const envVar = `${backendName.toUpperCase()}_DEFAULT_MODEL`;
    const envValue = process.env[envVar];
    if (envValue) {
      return envValue;
    }

    return undefined;
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Check health of all backends
   *
   * Returns map of backend name → health check result
   */
  async checkAllHealth(): Promise<Map<string, { healthy: boolean; latency?: number; error?: string }>> {
    const results = new Map();

    for (const [name, registration] of this.backends.entries()) {
      try {
        const health = await registration.backend.checkHealth();
        results.set(name, {
          healthy: health.healthy,
          latency: health.latency,
          error: health.error,
        });
      } catch (error: any) {
        results.set(name, {
          healthy: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * List models from all backends
   *
   * Returns combined list with backend information
   */
  async listAllModels(): Promise<Array<{ backend: string; models: any[] }>> {
    const results: Array<{ backend: string; models: any[] }> = [];

    for (const [name, registration] of this.backends.entries()) {
      try {
        const models = await registration.backend.listModels();
        results.push({
          backend: name,
          models,
        });
      } catch (error) {
        // Skip backends that fail to list models
        results.push({
          backend: name,
          models: [],
        });
      }
    }

    return results;
  }
}

// ==========================================================================
// Convenience Factory
// ==========================================================================

/**
 * Create a registry with standard backend registrations
 *
 * This is a helper to set up the most common configuration.
 * Backends will only be registered if they can be initialized.
 */
export async function createStandardRegistry(): Promise<BackendRegistry> {
  const registry = new BackendRegistry();

  // Dynamic imports to avoid dependency errors if SDKs not installed
  try {
    const { OllamaBackend } = await import('./backends/OllamaBackend.js');
    const ollama = new OllamaBackend();

    registry.register({
      name: 'ollama',
      backend: ollama,
      modelPrefixes: ['llama', 'qwen', 'mistral', 'deepseek', 'codellama', 'phi', 'gemma'],
      modelPatterns: [/:/, /^llama/, /^qwen/, /^mistral/, /^deepseek/],
    });
  } catch (error) {
    // Ollama backend not available
  }

  try {
    const { AnthropicBackend } = await import('./backends/AnthropicBackend.js');
    const anthropic = new AnthropicBackend();

    registry.register({
      name: 'anthropic',
      backend: anthropic,
      modelPrefixes: ['claude-'],
      modelPatterns: [/^claude-/],
    });
  } catch (error) {
    // Anthropic backend not available (SDK not installed or no API key)
  }

  return registry;
}
