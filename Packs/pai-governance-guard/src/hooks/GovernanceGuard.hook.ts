#!/usr/bin/env bun
// ============================================================================
// pai-governance-guard — PreToolUse Hook
// Deterministic authorization: PROPOSE → DECIDE → PROMOTE
//
// Registered as PreToolUse hook with "*" matcher (evaluates all tool calls).
// Complements SecurityValidator — does not replace it.
//
// Exit 0 + JSON stdout: structured decision (allow/deny/ask)
// All errors → fail-closed (deny)
// ============================================================================

import { propose } from "../governance/intent";
import { decide, loadPolicy } from "../governance/policy-engine";
import { promote } from "../governance/witness";
import type { HookInput, HookOutput } from "../governance/types";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

// -- Path Resolution --

function getPaiDir(): string {
  if (process.env.PAI_DIR) return process.env.PAI_DIR;

  // PAI default location
  const home = homedir();
  const paiDir = join(home, ".pai");
  if (existsSync(paiDir)) return paiDir;

  // Fallback: look in current directory
  const localPai = join(process.cwd(), ".pai");
  if (existsSync(localPai)) return localPai;

  return join(home, ".pai");
}

function resolvePolicy(): string {
  // 1. Explicit env var
  if (process.env.GOVERNANCE_POLICY) return resolve(process.env.GOVERNANCE_POLICY);

  const paiDir = getPaiDir();

  // 2. Project-level policy
  const projectPolicy = join(process.cwd(), ".claude", "governance-policy.yaml");
  if (existsSync(projectPolicy)) return projectPolicy;

  // 3. PAI MEMORY governance policy
  const paiPolicy = join(paiDir, "MEMORY", "GOVERNANCE", "governance-policy.yaml");
  if (existsSync(paiPolicy)) return paiPolicy;

  // 4. User-level policy
  const userPolicy = join(homedir(), ".claude", "governance-policy.yaml");
  if (existsSync(userPolicy)) return userPolicy;

  // 5. Bundled standard policy (fallback)
  const bundledPolicy = join(__dirname, "..", "..", "policies", "standard.yaml");
  if (existsSync(bundledPolicy)) return bundledPolicy;

  // No policy found — fail-closed will trigger in loadPolicy
  return join(paiDir, "MEMORY", "GOVERNANCE", "governance-policy.yaml");
}

function getWitnessDir(): string {
  const paiDir = getPaiDir();
  return join(paiDir, "MEMORY", "GOVERNANCE");
}

// -- Fail-Closed Output --

function denyOutput(reason: string): HookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `[GOVERNANCE] ${reason}`,
    },
  };
}

// -- Main --

async function main(): Promise<void> {
  let input: HookInput;

  try {
    // Read JSON from stdin (same pattern as SecurityValidator.hook.ts)
    const chunks: Buffer[] = [];
    const reader = Bun.stdin.stream().getReader();

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("stdin timeout")), 500)
    );

    const readAll = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks).toString("utf8");
    })();

    const raw = await Promise.race([readAll, timeout]);
    input = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify(denyOutput("Failed to parse hook input — fail-closed")));
    return;
  }

  try {
    // 1. PROPOSE — serialize intent
    const intent = propose(input);

    // 2. DECIDE — evaluate against policy
    const policyPath = resolvePolicy();
    const policy = loadPolicy(policyPath);
    const verdict = decide(intent, policy);

    // 3. PROMOTE — gate and record
    const witnessDir = getWitnessDir();
    const { output } = promote(intent, verdict, witnessDir);

    console.log(JSON.stringify(output));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(JSON.stringify(denyOutput(`Pipeline error — fail-closed: ${msg}`)));
  }
}

main().catch(() => {
  console.log(
    JSON.stringify(denyOutput("Unhandled error — fail-closed"))
  );
});
