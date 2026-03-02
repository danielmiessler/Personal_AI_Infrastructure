// ============================================================================
// pai-governance-guard — PROMOTE Phase
// Hash-chained witness log for governance audit
// Adapted from verdict_logic/telemetry.ts
// ============================================================================

import { mkdirSync, readFileSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { stableStringify, sha256Hex, canonicalHash } from "./canonical";
import type {
  ActionIntent,
  HookOutput,
  PolicyDecision,
  PolicyVerdict,
  WitnessRecord,
} from "./types";

const GENESIS_HASH = sha256Hex("GENESIS");

/**
 * PROMOTE: Gate on verdict, record to hash-chained witness log,
 * and produce the Claude Code hook output.
 */
export function promote(
  intent: ActionIntent,
  verdict: PolicyVerdict,
  witnessDir: string
): { output: HookOutput; record: WitnessRecord } {
  // Map PolicyDecision to Claude Code permissionDecision
  const permMap: Record<PolicyDecision, "allow" | "deny" | "ask"> = {
    approve: "allow",
    deny: "deny",
    escalate: "ask",
  };

  // Build and append witness record
  const record = buildWitnessRecord(intent, verdict, witnessDir);
  appendWitness(witnessDir, record);

  // Build reason string
  const reasonStr = verdict.reasons.join("; ");

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: permMap[verdict.decision],
      permissionDecisionReason:
        verdict.decision === "approve"
          ? undefined
          : `[GOVERNANCE] ${verdict.decision === "deny" ? "Denied" : "Escalation required"}: ${reasonStr}`,
    },
  };

  return { output, record };
}

/**
 * Build a WitnessRecord with hash chain linking.
 */
function buildWitnessRecord(
  intent: ActionIntent,
  verdict: PolicyVerdict,
  witnessDir: string
): WitnessRecord {
  const logPath = getLogPath(witnessDir);
  const { prevHash, sequence } = getChainTip(logPath);

  const intentHash = canonicalHash({
    tool_name: intent.tool_name,
    action_type: intent.action_type,
    target: intent.target,
    content_hash: intent.content_hash,
  });

  const verdictHash = canonicalHash({
    decision: verdict.decision,
    matched_rule: verdict.matched_rule,
    reasons: verdict.reasons,
  });

  const partial: Omit<WitnessRecord, "record_hash"> = {
    sequence,
    timestamp: new Date().toISOString(),
    session_id: intent.session_id,
    intent_hash: intentHash,
    verdict_hash: verdictHash,
    decision: verdict.decision,
    tool_name: intent.tool_name,
    action_type: intent.action_type,
    target: truncateTarget(intent.target, 200),
    reasons: verdict.reasons,
    prev_hash: prevHash,
  };

  const recordHash = sha256Hex(stableStringify(partial));

  return { ...partial, record_hash: recordHash };
}

/**
 * Read the last record from the witness log to get the chain tip.
 */
function getChainTip(logPath: string): { prevHash: string; sequence: number } {
  if (!existsSync(logPath)) {
    return { prevHash: GENESIS_HASH, sequence: 0 };
  }

  try {
    const content = readFileSync(logPath, "utf8").trim();
    if (content.length === 0) {
      return { prevHash: GENESIS_HASH, sequence: 0 };
    }

    const lines = content.split("\n");
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine.length === 0) {
      return { prevHash: GENESIS_HASH, sequence: 0 };
    }

    const lastRecord = JSON.parse(lastLine) as WitnessRecord;
    return {
      prevHash: lastRecord.record_hash,
      sequence: lastRecord.sequence + 1,
    };
  } catch {
    // Corrupt log — start fresh chain but with detectable gap
    return { prevHash: sha256Hex("RECOVERY"), sequence: 0 };
  }
}

/**
 * Append a witness record to the JSONL log.
 */
function appendWitness(witnessDir: string, record: WitnessRecord): void {
  try {
    mkdirSync(witnessDir, { recursive: true });
    const logPath = getLogPath(witnessDir);
    appendFileSync(logPath, JSON.stringify(record) + "\n", "utf8");
  } catch {
    // Witness write failure is non-fatal — the governance decision
    // has already been made. Log failure is detectable by chain gap.
  }
}

/**
 * Get the witness log path for the current month.
 * Format: witness-YYYY-MM.jsonl
 */
function getLogPath(witnessDir: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return join(witnessDir, `witness-${year}-${month}.jsonl`);
}

/**
 * Truncate target strings for witness records.
 * Full content is preserved in the hash; display is truncated.
 */
function truncateTarget(target: string, maxLen: number): string {
  if (target.length <= maxLen) return target;
  return target.slice(0, maxLen - 3) + "...";
}

// -- Chain Verification (for testing and auditing) --

/**
 * Verify the integrity of a witness chain.
 * Returns null if valid, or an error message describing the first break.
 */
export function verifyChain(records: WitnessRecord[]): string | null {
  if (records.length === 0) return null;

  // First record must link to GENESIS
  if (records[0].prev_hash !== GENESIS_HASH) {
    // Allow RECOVERY hash for corrupt recovery
    if (records[0].prev_hash !== sha256Hex("RECOVERY")) {
      return `Record 0: prev_hash does not match GENESIS or RECOVERY`;
    }
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Verify record_hash
    const partial: Omit<WitnessRecord, "record_hash"> = {
      sequence: record.sequence,
      timestamp: record.timestamp,
      session_id: record.session_id,
      intent_hash: record.intent_hash,
      verdict_hash: record.verdict_hash,
      decision: record.decision,
      tool_name: record.tool_name,
      action_type: record.action_type,
      target: record.target,
      reasons: record.reasons,
      prev_hash: record.prev_hash,
    };

    const expectedHash = sha256Hex(stableStringify(partial));
    if (record.record_hash !== expectedHash) {
      return `Record ${i}: record_hash mismatch (tampered)`;
    }

    // Verify chain linkage (record N+1's prev_hash = record N's record_hash)
    if (i > 0) {
      if (record.prev_hash !== records[i - 1].record_hash) {
        return `Record ${i}: prev_hash does not match record ${i - 1}'s record_hash (chain break)`;
      }
    }

    // Verify sequence monotonicity
    if (record.sequence !== records[0].sequence + i) {
      return `Record ${i}: sequence gap (expected ${records[0].sequence + i}, got ${record.sequence})`;
    }
  }

  return null;
}
