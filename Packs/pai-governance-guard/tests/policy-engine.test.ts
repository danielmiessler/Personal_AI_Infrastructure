import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decide, loadPolicy, resetPolicyCache } from "../src/governance/policy-engine";
import type { ActionIntent, PolicyConfig } from "../src/governance/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const DENY_DEFAULT: PolicyConfig = {
  version: "1.0",
  name: "test-deny",
  description: "Test policy with deny default",
  default_decision: "deny",
  rules: [],
};

const APPROVE_DEFAULT: PolicyConfig = {
  version: "1.0",
  name: "test-approve",
  description: "Test policy with approve default",
  default_decision: "approve",
  rules: [],
};

describe("decide — default decision", () => {
  it("returns deny when no rules match and default is deny", () => {
    const result = decide(makeIntent(), DENY_DEFAULT);
    assert.equal(result.decision, "deny");
  });

  it("returns approve when no rules match and default is approve", () => {
    const result = decide(makeIntent(), APPROVE_DEFAULT);
    assert.equal(result.decision, "approve");
  });
});

describe("decide — rule matching", () => {
  it("matches by action_type", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "allow-read", action_type: "read", decision: "approve", reason: "Read OK" }],
    };
    const result = decide(makeIntent({ action_type: "read" }), policy);
    assert.equal(result.decision, "approve");
    assert.equal(result.matched_rule, "allow-read");
  });

  it("matches by tool_name regex", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "allow-bash", tool_name: "^Bash$", decision: "approve", reason: "Bash OK" }],
    };
    const result = decide(makeIntent({ tool_name: "Bash" }), policy);
    assert.equal(result.decision, "approve");
  });

  it("does not match mismatched tool_name regex", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "allow-read-tool", tool_name: "^Read$", decision: "approve", reason: "Read OK" }],
    };
    const result = decide(makeIntent({ tool_name: "Bash" }), policy);
    assert.equal(result.decision, "deny");
  });

  it("matches by target glob", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "allow-src", action_type: "write", target: "**/src/**", decision: "approve", reason: "Src OK" }],
    };
    const result = decide(makeIntent({ action_type: "write", target: "/project/src/app.ts" }), policy);
    assert.equal(result.decision, "approve");
  });

  it("does not match non-matching glob", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "allow-src", action_type: "write", target: "**/src/**", decision: "approve", reason: "Src OK" }],
    };
    const result = decide(makeIntent({ action_type: "write", target: "/project/config/db.yaml" }), policy);
    assert.equal(result.decision, "deny");
  });

  it("matches by action_type array", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "allow-io", action_type: ["read", "write"] as any, decision: "approve", reason: "IO OK" }],
    };
    const result = decide(makeIntent({ action_type: "write" }), policy);
    assert.equal(result.decision, "approve");
  });

  it("requires all conditions to match", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{
        id: "bash-test",
        tool_name: "^Bash$",
        action_type: "execute",
        target: "npm test*",
        decision: "approve",
        reason: "Test OK",
      }],
    };

    assert.equal(decide(makeIntent({ tool_name: "Bash", action_type: "execute", target: "npm test --verbose" }), policy).decision, "approve");
    assert.equal(decide(makeIntent({ tool_name: "Read", action_type: "execute", target: "npm test" }), policy).decision, "deny");
    assert.equal(decide(makeIntent({ tool_name: "Bash", action_type: "read", target: "npm test" }), policy).decision, "deny");
  });
});

describe("decide — first-match semantics", () => {
  it("uses first matching rule", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [
        { id: "deny-execute", action_type: "execute", decision: "deny", reason: "Deny first" },
        { id: "approve-execute", action_type: "execute", decision: "approve", reason: "Approve second" },
      ],
    };
    const result = decide(makeIntent({ action_type: "execute" }), policy);
    assert.equal(result.decision, "deny");
    assert.equal(result.matched_rule, "deny-execute");
  });
});

describe("decide — modal gates", () => {
  it("approve verdict passes box gate", () => {
    const policy: PolicyConfig = {
      ...APPROVE_DEFAULT,
      rules: [{ id: "allow-all", decision: "approve", reason: "OK" }],
      box_policy: { requireDefiniteTrue: true, requireNoObstructions: true },
      diamond_policy: { maxSeverity: "warn" },
    };
    const result = decide(makeIntent(), policy);
    assert.equal(result.decision, "approve");
  });

  it("deny verdict fails both gates", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "deny-all", decision: "deny", reason: "Nope" }],
      box_policy: { requireDefiniteTrue: true },
      diamond_policy: { allowIfDefiniteFalse: false, maxSeverity: "info" },
    };
    const result = decide(makeIntent(), policy);
    assert.equal(result.decision, "deny");
  });

  it("escalate verdict passes diamond gate but not box gate", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "esc", decision: "escalate", reason: "Need confirm" }],
      box_policy: { requireDefiniteTrue: true },
      diamond_policy: { maxSeverity: "warn" },
    };
    const result = decide(makeIntent(), policy);
    assert.equal(result.decision, "escalate");
  });
});

describe("decide — PolicyVerdict structure", () => {
  it("includes intent in verdict", () => {
    const result = decide(makeIntent(), APPROVE_DEFAULT);
    assert.equal(result.intent.tool_name, "Bash");
  });

  it("includes matched_rule", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "my-rule", action_type: "execute", decision: "deny", reason: "blocked" }],
    };
    assert.equal(decide(makeIntent(), policy).matched_rule, "my-rule");
  });

  it("includes reasons", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "r1", action_type: "execute", decision: "deny", reason: "blocked" }],
    };
    const result = decide(makeIntent(), policy);
    assert.ok(result.reasons.includes("blocked"));
  });

  it("includes internal verdict with obstructions for deny", () => {
    const policy: PolicyConfig = {
      ...DENY_DEFAULT,
      rules: [{ id: "r1", action_type: "execute", decision: "deny", reason: "nope" }],
    };
    const result = decide(makeIntent(), policy);
    assert.equal(result.verdict.status, "Definite");
    assert.equal(result.verdict.value, false);
    assert.ok(result.verdict.obstructions.length > 0);
    assert.equal(result.verdict.obstructions[0].kind, "policy_deny");
  });
});

describe("loadPolicy", () => {
  it("loads minimal.yaml", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "minimal.yaml"));
    assert.equal(policy.name, "minimal");
    assert.equal(policy.default_decision, "approve");
    assert.ok(policy.rules.length >= 3);
  });

  it("loads standard.yaml", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "standard.yaml"));
    assert.equal(policy.name, "standard");
    assert.equal(policy.default_decision, "deny");
    assert.ok(policy.box_policy);
  });

  it("loads strict.yaml", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "strict.yaml"));
    assert.equal(policy.name, "strict");
    assert.equal(policy.default_decision, "deny");
  });

  it("returns deny-all for missing file", () => {
    resetPolicyCache();
    const policy = loadPolicy("/nonexistent/path.yaml");
    assert.equal(policy.default_decision, "deny");
    assert.equal(policy.rules.length, 0);
  });
});

describe("decide — end-to-end with loaded policy", () => {
  it("minimal allows reads", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "minimal.yaml"));
    assert.equal(decide(makeIntent({ action_type: "read" }), policy).decision, "approve");
  });

  it("minimal denies destructive", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "minimal.yaml"));
    assert.equal(decide(makeIntent({ action_type: "destructive" }), policy).decision, "deny");
  });

  it("minimal escalates network", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "minimal.yaml"));
    assert.equal(decide(makeIntent({ action_type: "network" }), policy).decision, "escalate");
  });

  it("strict denies writes", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "strict.yaml"));
    assert.equal(decide(makeIntent({ action_type: "write" }), policy).decision, "deny");
  });

  it("strict allows reads", () => {
    resetPolicyCache();
    const policy = loadPolicy(join(__dirname, "..", "policies", "strict.yaml"));
    assert.equal(decide(makeIntent({ action_type: "read" }), policy).decision, "approve");
  });
});
