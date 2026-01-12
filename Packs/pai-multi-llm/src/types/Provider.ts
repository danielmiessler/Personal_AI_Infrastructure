/**
 * Provider Types for pai-multi-llm
 *
 * Defines the structure for LLM provider configurations,
 * session management, and team composition.
 */

export interface SessionConfig {
  supported: boolean;
  storage_path?: string;

  // CLI command templates
  start: string;              // Initial call: 'claude -p "{prompt}"'
  continue_last?: string;     // Continue most recent session
  resume_by_id?: string;      // Resume specific: 'claude -r {session_id} -p "{prompt}"'

  // How to extract session ID from output
  session_id_extraction?: {
    method: 'json_field' | 'regex' | 'file_based' | 'none';
    pattern?: string;         // JSON field name or regex pattern
  };

  // Notes for manual session management (e.g., Ollama)
  note?: string;
}

export interface ProviderConfig {
  name: string;
  cli: string;
  available: boolean;
  version?: string;
  models?: string[];          // For providers with multiple models (Ollama)

  // Session management
  session: SessionConfig;

  // User-defined role and purpose
  role: string;
  use_for: string[];
}

export interface DetectedProvider {
  name: string;
  cli_command: string;
  available: boolean;
  version?: string;
  models?: string[];
  detection_method: string;
}

export interface DetectionResult {
  timestamp: string;
  providers: DetectedProvider[];
  summary: {
    total_detected: number;
    ready_to_use: boolean;
    providers_found: string[];
    providers_missing: string[];
  };
}

export interface ActiveSession {
  provider: string;
  session_id: string;
  created_at: string;
  last_used: string;
  message_count: number;
}

export interface TeamConfig {
  version: string;
  generated_at?: string;
  auto_detected?: boolean;

  providers: ProviderConfig[];
}

export interface QueryOptions {
  provider?: string;          // Specific provider to use
  role?: string;              // Query by role
  session_id?: string;        // Resume specific session
  continue_session?: boolean; // Continue last session with this provider
  timeout?: number;           // Timeout in ms
  output_format?: 'text' | 'json';
}

export interface QueryResult {
  provider: string;
  session_id?: string;
  response: string;
  duration_ms: number;
}
