// ============================================================================
// pai-governance-guard — DECIDE Phase
// Deterministic policy evaluation with modal gates
// Adapted from verdict_logic/authorize.ts + modal.ts
// ============================================================================

import { readFileSync, statSync } from "node:fs";
import { parseYaml } from "./yaml-parse";
import { stableStringify, sha256Hex } from "./canonical";
import type {
  ActionIntent,
  ActionType,
  BoxPolicy,
  DiamondPolicy,
  Justification,
  Obstruction,
  ObstructionSeverity,
  PolicyConfig,
  PolicyDecision,
  PolicyRule,
  PolicyVerdict,
  Verdict,
} from "./types";

// -- Verdict DSL (from verdict_logic/verdict.ts) --

function definite(
  value: boolean,
  obstructions: Obstruction[] = [],
  justifications: Justification[] = []
): Verdict {
  return { status: "Definite", value, obstructions, justifications };
}

function obstructed(
  obstructions: Obstruction[],
  justifications: Justification[] = []
): Verdict {
  return { status: "Obstructed", obstructions, justifications };
}

// -- Modal Gates (from verdict_logic/modal.ts) --

const SEV_RANK: Record<string, number> = { info: 0, warn: 1, error: 2, fatal: 3 };

function maxObstructionSeverity(v: Verdict): number {
  let m = -1;
  for (const o of v.obstructions) {
    const r = SEV_RANK[o.severity ?? "error"] ?? 2;
    if (r > m) m = r;
  }
  return m;
}

/**
 * Box gate: necessarily true. All conditions must be met.
 * Adapted from verdict_logic/modal.ts boxGate()
 */
function boxGate(policy: BoxPolicy, v: Verdict): boolean {
  if (policy.requireDefiniteTrue !== false) {
    if (v.status !== "Definite" || v.value !== true) return false;
  }
  if (policy.requireNoObstructions) {
    if (v.obstructions.length > 0) return false;
  }
  if (policy.maxSeverity) {
    const limit = SEV_RANK[policy.maxSeverity];
    if (maxObstructionSeverity(v) > limit) return false;
  }
  return true;
}

/**
 * Diamond gate: possibly true. At least one path allows.
 * Adapted from verdict_logic/modal.ts diamondGate()
 */
function diamondGate(policy: DiamondPolicy, v: Verdict): boolean {
  if (v.status === "Definite") {
    if (v.value === true) return true;
    return !!policy.allowIfDefiniteFalse;
  }
  const limit = SEV_RANK[policy.maxSeverity ?? "warn"];
  return maxObstructionSeverity(v) <= limit;
}

// -- Policy Loading with Hot Reload --

let cachedPolicy: PolicyConfig | null = null;
let cachedPath: string | null = null;
let cachedMtime: number = 0;

/**
 * Load and validate a YAML policy file.
 * Caches by mtime for hot-reload without re-parsing unchanged files.
 */
export function loadPolicy(policyPath: string): PolicyConfig {
  try {
    const stat = statSync(policyPath);

    if (cachedPolicy && cachedPath === policyPath && stat.mtimeMs === cachedMtime) {
      return cachedPolicy;
    }

    const raw = readFileSync(policyPath, "utf8");
    const parsed = parseYaml(raw);
    const config = validatePolicyConfig(parsed);

    cachedPolicy = config;
    cachedPath = policyPath;
    cachedMtime = stat.mtimeMs;

    return config;
  } catch (err) {
    // Fail-closed: corrupt/missing policy → deny-all config
    return DENY_ALL_POLICY;
  }
}

/** Reset the policy cache (for testing). */
export function resetPolicyCache(): void {
  cachedPolicy = null;
  cachedPath = null;
  cachedMtime = 0;
}

const DENY_ALL_POLICY: PolicyConfig = {
  version: "0.0.0",
  name: "fail-closed",
  description: "Default deny-all policy (policy file missing or corrupt)",
  default_decision: "deny",
  rules: [],
};

function validatePolicyConfig(parsed: unknown): PolicyConfig {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Policy must be a YAML mapping");
  }

  const p = parsed as Record<string, unknown>;

  const config: PolicyConfig = {
    version: String(p.version ?? "1.0"),
    name: String(p.name ?? "unnamed"),
    description: String(p.description ?? ""),
    default_decision: validateDecision(p.default_decision) ?? "deny",
    rules: [],
  };

  if (Array.isArray(p.rules)) {
    config.rules = p.rules.map(validateRule).filter((r): r is PolicyRule => r !== null);
  }

  if (p.box_policy && typeof p.box_policy === "object") {
    const bp = p.box_policy as Record<string, unknown>;
    config.box_policy = {
      requireDefiniteTrue: bp.requireDefiniteTrue as boolean | undefined,
      requireNoObstructions: bp.requireNoObstructions as boolean | undefined,
      maxSeverity: bp.maxSeverity as ObstructionSeverity | undefined,
    };
  }

  if (p.diamond_policy && typeof p.diamond_policy === "object") {
    const dp = p.diamond_policy as Record<string, unknown>;
    config.diamond_policy = {
      allowIfDefiniteFalse: dp.allowIfDefiniteFalse as boolean | undefined,
      maxSeverity: dp.maxSeverity as ObstructionSeverity | undefined,
    };
  }

  return config;
}

function validateDecision(v: unknown): PolicyDecision | null {
  if (v === "approve" || v === "deny" || v === "escalate") return v;
  return null;
}

function validateRule(raw: unknown): PolicyRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const decision = validateDecision(r.decision);
  if (!decision) return null;

  const rule: PolicyRule = {
    id: String(r.id ?? "unnamed"),
    decision,
    reason: String(r.reason ?? ""),
  };

  if (r.tool_name !== undefined && r.tool_name !== null) {
    rule.tool_name = String(r.tool_name);
  }

  if (r.action_type !== undefined && r.action_type !== null) {
    if (Array.isArray(r.action_type)) {
      rule.action_type = r.action_type.map(String) as ActionType[];
    } else {
      rule.action_type = String(r.action_type) as ActionType;
    }
  }

  if (r.target !== undefined && r.target !== null) {
    rule.target = String(r.target);
  }

  return rule;
}

// -- DECIDE: Intent x Policy → PolicyVerdict --

/**
 * DECIDE: Evaluate an ActionIntent against a PolicyConfig.
 * Pure function. No LLM. No side effects.
 *
 * 1. Match intent against rules (first match wins)
 * 2. Build internal Verdict from matched rule
 * 3. Apply box/diamond modal gates for final decision
 */
export function decide(intent: ActionIntent, policy: PolicyConfig): PolicyVerdict {
  // Find first matching rule
  const matched = findMatchingRule(intent, policy.rules);

  // Build verdict from matched rule (or default)
  const ruleDecision = matched?.decision ?? policy.default_decision;
  const ruleId = matched?.id ?? "default";
  const ruleReason = matched?.reason ?? `Default policy: ${policy.default_decision}`;

  const verdict = buildVerdict(ruleDecision, ruleId, ruleReason);
  const reasons: string[] = [ruleReason];

  // Apply modal gates if configured
  let finalDecision: PolicyDecision;

  if (policy.box_policy || policy.diamond_policy) {
    const bPolicy = policy.box_policy ?? { requireDefiniteTrue: true };
    const dPolicy = policy.diamond_policy ?? {};

    const boxPasses = boxGate(bPolicy, verdict);
    const diamondPasses = diamondGate(dPolicy, verdict);

    if (boxPasses) {
      finalDecision = "approve";
    } else if (diamondPasses) {
      finalDecision = "escalate";
      if (!reasons.includes("Escalated by diamond gate")) {
        reasons.push("Escalated by diamond gate");
      }
    } else {
      finalDecision = "deny";
      if (!reasons.includes("Denied by modal gates")) {
        reasons.push("Denied by modal gates");
      }
    }
  } else {
    finalDecision = ruleDecision;
  }

  return {
    decision: finalDecision,
    intent,
    verdict,
    matched_rule: ruleId,
    reasons,
  };
}

function findMatchingRule(
  intent: ActionIntent,
  rules: PolicyRule[]
): PolicyRule | null {
  for (const rule of rules) {
    if (ruleMatches(intent, rule)) return rule;
  }
  return null;
}

function ruleMatches(intent: ActionIntent, rule: PolicyRule): boolean {
  // Check tool_name (regex)
  if (rule.tool_name !== undefined) {
    try {
      const re = new RegExp(rule.tool_name);
      if (!re.test(intent.tool_name)) return false;
    } catch {
      // Invalid regex → rule doesn't match
      return false;
    }
  }

  // Check action_type
  if (rule.action_type !== undefined) {
    if (Array.isArray(rule.action_type)) {
      if (!rule.action_type.includes(intent.action_type)) return false;
    } else {
      if (rule.action_type !== intent.action_type) return false;
    }
  }

  // Check target (glob)
  if (rule.target !== undefined) {
    if (!globMatch(rule.target, intent.target)) return false;
  }

  return true;
}

/**
 * Minimal glob matcher for policy target patterns.
 * Supports: * (non-separator), ** (any including separator)
 */
function globMatch(pattern: string, text: string): boolean {
  // Convert glob to regex
  let re = "^";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      re += ".*";
      i += 2;
      if (pattern[i] === "/") i++; // skip trailing slash after **
    } else if (ch === "*") {
      re += "[^/]*";
      i++;
    } else if (ch === "?") {
      re += "[^/]";
      i++;
    } else if (".+^${}()|[]\\".includes(ch)) {
      re += "\\" + ch;
      i++;
    } else {
      re += ch;
      i++;
    }
  }
  re += "$";

  try {
    return new RegExp(re).test(text);
  } catch {
    return false;
  }
}

function buildVerdict(
  decision: PolicyDecision,
  ruleId: string,
  reason: string
): Verdict {
  switch (decision) {
    case "approve":
      return definite(true, [], [
        { kind: "policy_rule", source: ruleId, note: reason },
      ]);
    case "deny":
      return definite(false, [
        { kind: "policy_deny", source: ruleId, detail: reason, severity: "error" },
      ]);
    case "escalate":
      return obstructed(
        [{ kind: "escalation_required", source: ruleId, detail: reason, severity: "warn" }],
        [{ kind: "policy_escalate", source: ruleId, note: reason }]
      );
  }
}
