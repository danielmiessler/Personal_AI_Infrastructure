import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promote, verifyChain } from "../src/governance/witness";
import { sha256Hex } from "../src/governance/canonical";
import type { ActionIntent, PolicyVerdict, WitnessRecord } from "../src/governance/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..", ".test-witness");

function makeIntent(overrides: Partial<ActionIntent> = {}): ActionIntent {
  return {
    tool_name: "Bash",
    action_type: "execute",
    target: "npm test",
    raw_input: { command: "npm test" },
    content_hash: "abc123",
    timestamp: new Date().toISOString(),
    session_id: "test-session",
    ...overrides,
  };
}

function makeVerdict(decision: "approve" | "deny" | "escalate" = "approve"): PolicyVerdict {
  return {
    decision,
    intent: makeIntent(),
    verdict: {
      status: "Definite",
      value: decision === "approve",
      obstructions: decision === "deny" ? [{ kind: "policy_deny", detail: "test" }] : [],
      justifications: decision === "approve" ? [{ kind: "policy_rule" }] : [],
    },
    matched_rule: "test-rule",
    reasons: [`Test ${decision}`],
  };
}

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("promote — hook output", () => {
  it("returns allow for approved verdict", () => {
    const { output } = promote(makeIntent(), makeVerdict("approve"), TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "allow");
  });

  it("returns deny for denied verdict", () => {
    const { output } = promote(makeIntent(), makeVerdict("deny"), TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
    assert.ok(output.hookSpecificOutput.permissionDecisionReason?.includes("Denied"));
  });

  it("returns ask for escalated verdict", () => {
    const { output } = promote(makeIntent(), makeVerdict("escalate"), TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "ask");
    assert.ok(output.hookSpecificOutput.permissionDecisionReason?.includes("Escalation"));
  });
});

describe("promote — witness record", () => {
  it("produces a valid WitnessRecord", () => {
    const { record } = promote(makeIntent(), makeVerdict(), TEST_DIR);
    assert.equal(record.sequence, 0);
    assert.equal(record.session_id, "test-session");
    assert.equal(record.tool_name, "Bash");
    assert.equal(record.action_type, "execute");
    assert.equal(record.decision, "approve");
    assert.ok(record.intent_hash.length === 64);
    assert.ok(record.verdict_hash.length === 64);
    assert.ok(record.record_hash.length === 64);
    assert.ok(record.prev_hash.length === 64);
  });

  it("links to GENESIS on first record", () => {
    const { record } = promote(makeIntent(), makeVerdict(), TEST_DIR);
    const genesisHash = sha256Hex("GENESIS");
    assert.equal(record.prev_hash, genesisHash);
  });

  it("writes JSONL to witness directory", () => {
    promote(makeIntent(), makeVerdict(), TEST_DIR);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const logPath = join(TEST_DIR, `witness-${year}-${month}.jsonl`);
    assert.ok(existsSync(logPath));
    const content = readFileSync(logPath, "utf8").trim();
    const record = JSON.parse(content) as WitnessRecord;
    assert.equal(record.sequence, 0);
  });
});

describe("promote — hash chain", () => {
  it("builds a valid chain across multiple records", () => {
    const r1 = promote(makeIntent(), makeVerdict(), TEST_DIR).record;
    const r2 = promote(makeIntent(), makeVerdict("deny"), TEST_DIR).record;
    const r3 = promote(makeIntent(), makeVerdict("escalate"), TEST_DIR).record;

    assert.equal(r1.sequence, 0);
    assert.equal(r2.sequence, 1);
    assert.equal(r3.sequence, 2);
    assert.equal(r2.prev_hash, r1.record_hash);
    assert.equal(r3.prev_hash, r2.record_hash);
  });
});

describe("verifyChain", () => {
  it("validates an empty chain", () => {
    assert.equal(verifyChain([]), null);
  });

  it("validates a single-record chain", () => {
    const { record } = promote(makeIntent(), makeVerdict(), TEST_DIR);
    assert.equal(verifyChain([record]), null);
  });

  it("validates a multi-record chain", () => {
    const r1 = promote(makeIntent(), makeVerdict(), TEST_DIR).record;
    const r2 = promote(makeIntent(), makeVerdict("deny"), TEST_DIR).record;
    const r3 = promote(makeIntent(), makeVerdict("escalate"), TEST_DIR).record;
    assert.equal(verifyChain([r1, r2, r3]), null);
  });

  it("detects tampered record_hash", () => {
    const r1 = promote(makeIntent(), makeVerdict(), TEST_DIR).record;
    const tampered = { ...r1, record_hash: "0".repeat(64) };
    const error = verifyChain([tampered]);
    assert.ok(error);
    assert.ok(error.includes("tampered"));
  });

  it("detects broken chain link", () => {
    const r1 = promote(makeIntent(), makeVerdict(), TEST_DIR).record;
    const r2 = promote(makeIntent(), makeVerdict("deny"), TEST_DIR).record;
    const broken = { ...r2, prev_hash: "0".repeat(64) };
    const error = verifyChain([r1, broken]);
    assert.ok(error);
  });

  it("detects sequence gap", () => {
    const r1 = promote(makeIntent(), makeVerdict(), TEST_DIR).record;
    const r2 = promote(makeIntent(), makeVerdict("deny"), TEST_DIR).record;
    const gapped = { ...r2, sequence: 5 };
    const error = verifyChain([r1, gapped]);
    assert.ok(error);
  });
});

describe("promote — target truncation", () => {
  it("truncates long targets", () => {
    const intent = makeIntent({ target: "x".repeat(500) });
    const { record } = promote(intent, makeVerdict(), TEST_DIR);
    assert.ok(record.target.length <= 203);
  });

  it("preserves short targets", () => {
    const { record } = promote(makeIntent({ target: "npm test" }), makeVerdict(), TEST_DIR);
    assert.equal(record.target, "npm test");
  });
});
