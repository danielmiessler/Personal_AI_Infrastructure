import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { propose } from "../src/governance/intent";
import { decide, loadPolicy, resetPolicyCache } from "../src/governance/policy-engine";
import { promote, verifyChain } from "../src/governance/witness";
import type { HookInput, WitnessRecord } from "../src/governance/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..", ".test-adversarial");
const POLICIES_DIR = join(__dirname, "..", "policies");

function makeHookInput(toolName: string, toolInput: Record<string, unknown>): HookInput {
  return {
    session_id: "adversarial-test",
    cwd: "/test",
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
  };
}

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  resetPolicyCache();
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("adversarial — spoofed content hash", () => {
  it("computes its own hash regardless of input", () => {
    const input = makeHookInput("Bash", { command: "npm test" });
    const intent1 = propose(input);
    const intent2 = propose(input);
    assert.equal(intent1.content_hash, intent2.content_hash);
    assert.equal(intent1.content_hash.length, 64);
  });
});

describe("adversarial — witness tamper detection", () => {
  it("detects modified decision in witness record", () => {
    const policyPath = join(POLICIES_DIR, "minimal.yaml");
    const intent = propose(makeHookInput("Bash", { command: "rm -rf /" }));
    const policy = loadPolicy(policyPath);
    const verdict = decide(intent, policy);
    const { record } = promote(intent, verdict, TEST_DIR);
    assert.equal(record.decision, "deny");

    const tampered = { ...record, decision: "approve" as const };
    const error = verifyChain([tampered]);
    assert.ok(error);
    assert.ok(error.includes("tampered"));
  });

  it("detects modified target in witness record", () => {
    const policyPath = join(POLICIES_DIR, "minimal.yaml");
    const intent = propose(makeHookInput("Read", { file_path: "/src/a.ts" }));
    const policy = loadPolicy(policyPath);
    const verdict = decide(intent, policy);
    const { record } = promote(intent, verdict, TEST_DIR);

    const tampered = { ...record, target: "/etc/shadow" };
    const error = verifyChain([tampered]);
    assert.ok(error);
  });

  it("detects deleted record in chain", () => {
    const policyPath = join(POLICIES_DIR, "minimal.yaml");
    const records: WitnessRecord[] = [];

    for (let i = 0; i < 5; i++) {
      const intent = propose(makeHookInput("Read", { file_path: `/src/f${i}.ts` }));
      const policy = loadPolicy(policyPath);
      const verdict = decide(intent, policy);
      const { record } = promote(intent, verdict, TEST_DIR);
      records.push(record);
    }

    const withGap = [records[0], records[1], records[3], records[4]];
    const error = verifyChain(withGap);
    assert.ok(error);
  });
});

describe("adversarial — path traversal", () => {
  it("classifies .env access via Write as credential", () => {
    const intent = propose(makeHookInput("Write", { file_path: "../../../.env" }));
    assert.equal(intent.action_type, "credential");
  });

  it("classifies Write to ~/.ssh/id_rsa as credential", () => {
    const intent = propose(makeHookInput("Write", { file_path: "/home/user/.ssh/id_rsa" }));
    assert.equal(intent.action_type, "credential");
  });
});

describe("adversarial — malformed YAML policy", () => {
  it("fail-closed on invalid YAML", () => {
    const badPolicyPath = join(TEST_DIR, "bad-policy.yaml");
    writeFileSync(badPolicyPath, "{{{{not yaml at all}}}}");
    resetPolicyCache();
    const policy = loadPolicy(badPolicyPath);
    assert.equal(policy.default_decision, "deny");
    assert.equal(policy.rules.length, 0);
  });

  it("fail-closed on empty YAML", () => {
    const emptyPolicyPath = join(TEST_DIR, "empty-policy.yaml");
    writeFileSync(emptyPolicyPath, "");
    resetPolicyCache();
    const policy = loadPolicy(emptyPolicyPath);
    assert.equal(policy.default_decision, "deny");
  });

  it("fail-closed on YAML with wrong structure", () => {
    const wrongPolicyPath = join(TEST_DIR, "wrong-policy.yaml");
    writeFileSync(wrongPolicyPath, "- just\n- a\n- list");
    resetPolicyCache();
    const policy = loadPolicy(wrongPolicyPath);
    assert.equal(policy.default_decision, "deny");
  });
});

describe("adversarial — JSON injection", () => {
  it("handles command with embedded JSON", () => {
    const input = makeHookInput("Bash", { command: 'echo \'{"malicious": true}\' > /tmp/test' });
    const intent = propose(input);
    assert.ok(intent.content_hash.length === 64);
    assert.equal(intent.action_type, "write");
  });
});

describe("adversarial — extremely long inputs", () => {
  it("handles very long command (>10KB)", () => {
    const longCommand = "echo " + "A".repeat(20000);
    const input = makeHookInput("Bash", { command: longCommand });
    const intent = propose(input);
    assert.ok(intent.content_hash.length === 64);
  });

  it("truncates long targets in witness record", () => {
    const longCommand = "echo " + "A".repeat(1000);
    const input = makeHookInput("Bash", { command: longCommand });
    const intent = propose(input);
    const policy = loadPolicy(join(POLICIES_DIR, "minimal.yaml"));
    const verdict = decide(intent, policy);
    const { record } = promote(intent, verdict, TEST_DIR);
    assert.ok(record.target.length <= 203);
  });
});

describe("adversarial — replay detection", () => {
  it("sequential records have unique sequence numbers", () => {
    const policyPath = join(POLICIES_DIR, "minimal.yaml");
    const records: WitnessRecord[] = [];

    for (let i = 0; i < 5; i++) {
      const intent = propose(makeHookInput("Bash", { command: "npm test" }));
      const policy = loadPolicy(policyPath);
      const verdict = decide(intent, policy);
      const { record } = promote(intent, verdict, TEST_DIR);
      records.push(record);
    }

    const sequences = records.map((r) => r.sequence);
    const unique = new Set(sequences);
    assert.equal(unique.size, 5);
  });

  it("duplicate record insertion breaks chain verification", () => {
    const policyPath = join(POLICIES_DIR, "minimal.yaml");
    const intent = propose(makeHookInput("Bash", { command: "npm test" }));
    const policy = loadPolicy(policyPath);
    const verdict = decide(intent, policy);

    const r1 = promote(intent, verdict, TEST_DIR).record;
    const r2 = promote(intent, verdict, TEST_DIR).record;

    const replayed = [r1, r1, r2];
    const error = verifyChain(replayed);
    assert.ok(error);
  });
});
