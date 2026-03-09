/**
 * payload-schema.ts — Structural validation for Claude Code hook payloads
 *
 * No external dependencies — lightweight structural validation only.
 * Fail-open by design: hooks must always complete quickly, so validation
 * never throws. Missing optional fields warn; missing required fields
 * mark the payload invalid so callers can bail out early.
 */

export type HookEventName =
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreToolUse'
  | 'PostToolUse';

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

type FieldType = 'string' | 'object' | 'boolean' | 'number';
interface FieldSpec { field: string; type: FieldType; required: boolean }

const BASE: FieldSpec[] = [
  { field: 'session_id', type: 'string', required: true },
  { field: 'hook_event_name', type: 'string', required: true },
];

export const PAYLOAD_SCHEMAS: Record<HookEventName, FieldSpec[]> = {
  UserPromptSubmit: [
    ...BASE,
    { field: 'prompt', type: 'string', required: true },
    { field: 'cwd', type: 'string', required: false },
  ],
  Stop: [
    ...BASE,
    { field: 'transcript_path', type: 'string', required: true },
    { field: 'stop_hook_active', type: 'boolean', required: false },
    { field: 'last_assistant_message', type: 'string', required: false },
  ],
  SessionStart: [
    ...BASE,
  ],
  SessionEnd: [
    ...BASE,
    { field: 'transcript_path', type: 'string', required: true },
  ],
  PreToolUse: [
    ...BASE,
    { field: 'tool_name', type: 'string', required: true },
    { field: 'tool_input', type: 'object', required: true },
  ],
  PostToolUse: [
    ...BASE,
    { field: 'tool_name', type: 'string', required: true },
    { field: 'tool_input', type: 'object', required: true },
    { field: 'tool_response', type: 'object', required: false },
  ],
};

/**
 * Validate a raw hook payload against the schema for its event type.
 *
 * Resolution:
 * 1. Payload must be a non-null object
 * 2. hook_event_name must be present — used to select the schema
 * 3. Unknown events pass (fail-open for forward compatibility)
 * 4. Each required field must be present; type mismatches are warnings only
 */
export function validatePayload(payload: unknown): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (typeof payload !== 'object' || payload === null) {
    return { valid: false, missing: ['(payload)'], warnings: ['Payload is not an object'] };
  }

  const obj = payload as Record<string, unknown>;
  const eventName = obj['hook_event_name'];

  if (typeof eventName !== 'string' || !eventName) {
    missing.push('hook_event_name');
    return { valid: false, missing, warnings };
  }

  const schema = PAYLOAD_SCHEMAS[eventName as HookEventName];
  if (!schema) {
    warnings.push(`Unknown hook event: "${eventName}" — skipping field validation`);
    return { valid: true, missing, warnings };
  }

  for (const spec of schema) {
    const value = obj[spec.field];
    if (value === undefined || value === null) {
      if (spec.required) missing.push(spec.field);
      continue;
    }
    const actualType = typeof value;
    if (spec.type !== 'object' && actualType !== spec.type) {
      warnings.push(`Field "${spec.field}": expected ${spec.type}, got ${actualType}`);
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}
