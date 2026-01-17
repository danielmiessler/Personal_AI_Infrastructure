/**
 * Second Brain Types
 *
 * Type definitions for complexity assessment, delegation routing,
 * and debate orchestration.
 */

export type ComplexityLevel = "simple" | "medium" | "complex";

export interface ComplexityAssessment {
  level: ComplexityLevel;
  confidence: number;           // 0-1
  minimum_agents: number;
  reasoning: string;
  detected_patterns: string[];
  suggested_perspectives?: string[];
}

export interface DelegationRule {
  pattern: string | RegExp;
  complexity: ComplexityLevel;
  weight: number;
  category: string;
}

export interface DelegationConfig {
  rules: DelegationRule[];
  thresholds: {
    simple: { max_score: number; agents: number };
    medium: { max_score: number; agents: number };
    complex: { max_score: number; agents: number };
  };
}

export interface Perspective {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  stance?: string;              // e.g., "advocate", "critic", "synthesizer"
}

export interface DebateConfig {
  perspectives: Perspective[];
  max_rounds: number;
  synthesis_required: boolean;
  friction_minimum: number;     // Minimum disagreement needed
}

export interface DebateRound {
  round_number: number;
  perspective_id: string;
  prompt: string;
  response?: string;
  provider?: string;
  session_id?: string;
}

export interface DebateResult {
  topic: string;
  rounds: DebateRound[];
  synthesis?: string;
  friction_points: string[];
  agreement_points: string[];
  recommendation?: string;
}

export interface AgentTask {
  id: string;
  perspective: Perspective;
  prompt: string;
  provider?: string;            // Specific LLM provider to use
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  duration_ms?: number;
}

export interface MultiLLMIntegration {
  available: boolean;
  providers: string[];
  query_function?: (provider: string, prompt: string) => Promise<string>;
}
