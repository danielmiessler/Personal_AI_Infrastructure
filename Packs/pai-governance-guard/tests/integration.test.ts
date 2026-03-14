import { describe, it, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { propose } from "../src/governance/intent";
import { decide, loadPolicy, resetPolicyCache } from "../src/governance/policy-engine";
import { promote, verifyChain } from "../src/governance/witness";
import type { HookInput, HookOutput, WitnessRecord } from "../src/governance/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..", ".test-integration");
const POLICIES_DIR = join(__dirname, "..", "policies");

function makeHookInput(toolName: string, toolInput: Record<string, unknown>): HookInput {
  return {
    session_id: "integration-test",
    cwd: "/test/project",
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
  };
}

function runPipeline(
  input: HookInput,
  policyPath: string,
  witnessDir: string
): { output: HookOutput; record: WitnessRecord } {
  const intent = propose(input);
  const policy = loadPolicy(policyPath);
  const verdict = decide(intent, policy);
  return promote(intent, verdict, witnessDir);
}

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  resetPolicyCache();
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("end-to-end — minimal policy", () => {
  const policyPath = join(POLICIES_DIR, "minimal.yaml");

  it("allows read operations", () => {
    const { output } = runPipeline(makeHookInput("Read", { file_path: "/src/main.ts" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "allow");
  });

  it("denies destructive operations", () => {
    const { output } = runPipeline(makeHookInput("Bash", { command: "rm -rf /tmp/important" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  });

  it("escalates network operations", () => {
    const { output } = runPipeline(makeHookInput("Bash", { command: "curl https://api.example.com" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "ask");
  });

  it("denies credential access", () => {
    const { output } = runPipeline(makeHookInput("Read", { file_path: "/project/.env" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  });

  it("allows write operations", () => {
    const { output } = runPipeline(makeHookInput("Write", { file_path: "/src/app.ts", content: "code" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "allow");
  });

  it("allows execute operations", () => {
    const { output } = runPipeline(makeHookInput("Bash", { command: "npm test" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "allow");
  });
});

describe("end-to-end — strict policy", () => {
  const policyPath = join(POLICIES_DIR, "strict.yaml");

  it("allows reads", () => {
    const { output } = runPipeline(makeHookInput("Read", { file_path: "/src/main.ts" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "allow");
  });

  it("denies writes", () => {
    const { output } = runPipeline(makeHookInput("Write", { file_path: "/src/app.ts", content: "code" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  });

  it("denies execution", () => {
    const { output } = runPipeline(makeHookInput("Bash", { command: "npm test" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  });

  it("denies network", () => {
    const { output } = runPipeline(makeHookInput("WebFetch", { url: "https://example.com", prompt: "test" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  });
});

describe("end-to-end — witness chain integrity", () => {
  const policyPath = join(POLICIES_DIR, "minimal.yaml");

  it("builds valid chain across multiple calls", () => {
    const inputs = [
      makeHookInput("Read", { file_path: "/src/a.ts" }),
      makeHookInput("Write", { file_path: "/src/b.ts", content: "x" }),
      makeHookInput("Bash", { command: "rm -rf /tmp" }),
      makeHookInput("Bash", { command: "curl https://example.com" }),
      makeHookInput("Bash", { command: "npm test" }),
    ];

    const records: WitnessRecord[] = [];
    for (const input of inputs) {
      const { record } = runPipeline(input, policyPath, TEST_DIR);
      records.push(record);
    }

    assert.equal(records.length, 5);
    assert.equal(verifyChain(records), null);

    assert.equal(records[0].decision, "approve"); // read
    assert.equal(records[1].decision, "approve"); // write (minimal allows)
    assert.equal(records[2].decision, "deny");    // destructive
    assert.equal(records[3].decision, "escalate"); // network
    assert.equal(records[4].decision, "approve"); // execute
  });

  it("witness log file contains all records", () => {
    for (let i = 0; i < 3; i++) {
      runPipeline(makeHookInput("Read", { file_path: `/src/file${i}.ts` }), policyPath, TEST_DIR);
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const logPath = join(TEST_DIR, `witness-${year}-${month}.jsonl`);

    assert.ok(existsSync(logPath));
    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    assert.equal(lines.length, 3);

    const records = lines.map((l) => JSON.parse(l) as WitnessRecord);
    assert.equal(verifyChain(records), null);
  });
});

describe("end-to-end — hook output format", () => {
  const policyPath = join(POLICIES_DIR, "minimal.yaml");

  it("produces valid hookSpecificOutput for allow", () => {
    const { output } = runPipeline(makeHookInput("Read", { file_path: "/src/a.ts" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.hookEventName, "PreToolUse");
    assert.equal(output.hookSpecificOutput.permissionDecision, "allow");
  });

  it("produces valid hookSpecificOutput for deny", () => {
    const { output } = runPipeline(makeHookInput("Bash", { command: "rm -rf /" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.hookEventName, "PreToolUse");
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
    assert.ok(output.hookSpecificOutput.permissionDecisionReason!.startsWith("[GOVERNANCE]"));
  });

  it("produces valid hookSpecificOutput for ask", () => {
    const { output } = runPipeline(makeHookInput("Bash", { command: "curl https://example.com" }), policyPath, TEST_DIR);
    assert.equal(output.hookSpecificOutput.hookEventName, "PreToolUse");
    assert.equal(output.hookSpecificOutput.permissionDecision, "ask");
  });
});

describe("end-to-end — fail-closed", () => {
  it("denies when policy file missing", () => {
    const { output } = runPipeline(makeHookInput("Bash", { command: "echo hello" }), "/nonexistent/policy.yaml", TEST_DIR);
    assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  });
});
