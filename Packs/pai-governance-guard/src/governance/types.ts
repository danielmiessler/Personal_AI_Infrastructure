// ============================================================================
// pai-governance-guard — Type Definitions
// PROPOSE / DECIDE / PROMOTE pipeline types
// ============================================================================

// -- Action Classification --

export type ActionType =
  | "read"
  | "write"
  | "execute"
  | "network"
  | "destructive"
  | "credential"
  | "unknown";

// -- PROPOSE output --

export interface ActionIntent {
  tool_name: string;
  action_type: ActionType;
  target: string;
  raw_input: unknown;
  content_hash: string;
  timestamp: string;
  session_id: string;
}

// -- Internal Verdict (adapted from verdict_logic) --

export type VerdictStatus = "Definite" | "Obstructed";
export type ObstructionSeverity = "info" | "warn" | "error" | "fatal";

export interface Obstruction {
  kind: string;
  source?: string;
  detail?: string;
  retryable?: boolean;
  severity?: ObstructionSeverity;
}

export interface Justification {
  kind: string;
  source?: string;
  note?: string;
  ref?: string;
  confidence?: number;
}

export interface Verdict {
  status: VerdictStatus;
  value?: boolean;
  obstructions: Obstruction[];
  justifications: Justification[];
}

// -- DECIDE output (user-facing) --

export type PolicyDecision = "approve" | "deny" | "escalate";

export interface PolicyVerdict {
  decision: PolicyDecision;
  intent: ActionIntent;
  verdict: Verdict;
  matched_rule?: string;
  reasons: string[];
}

// -- PROMOTE output --

export interface WitnessRecord {
  sequence: number;
  timestamp: string;
  session_id: string;
  intent_hash: string;
  verdict_hash: string;
  decision: PolicyDecision;
  tool_name: string;
  action_type: ActionType;
  target: string;
  reasons: string[];
  prev_hash: string;
  record_hash: string;
}

// -- Policy Configuration --

export interface PolicyRule {
  id: string;
  tool_name?: string;
  action_type?: ActionType | ActionType[];
  target?: string;
  decision: PolicyDecision;
  reason: string;
}

export interface BoxPolicy {
  requireDefiniteTrue?: boolean;
  requireNoObstructions?: boolean;
  maxSeverity?: ObstructionSeverity;
}

export interface DiamondPolicy {
  allowIfDefiniteFalse?: boolean;
  maxSeverity?: ObstructionSeverity;
}

export interface PolicyConfig {
  version: string;
  name: string;
  description: string;
  default_decision: PolicyDecision;
  rules: PolicyRule[];
  box_policy?: BoxPolicy;
  diamond_policy?: DiamondPolicy;
}

// -- Claude Code Hook I/O --

export interface HookInput {
  session_id: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  transcript_path?: string;
  permission_mode?: string;
  tool_use_id?: string;
}

export interface HookOutput {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow" | "deny" | "ask";
    permissionDecisionReason?: string;
  };
}
