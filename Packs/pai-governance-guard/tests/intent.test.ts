import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { propose, classifyAction, extractTarget } from "../src/governance/intent";
import type { HookInput } from "../src/governance/types";

function makeInput(toolName: string, toolInput: Record<string, unknown>): HookInput {
  return {
    session_id: "test-session",
    cwd: "/test",
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
  };
}

describe("classifyAction — Bash commands", () => {
  it("classifies rm -rf as destructive", () => {
    assert.equal(classifyAction("Bash", { command: "rm -rf /tmp/foo" }), "destructive");
  });

  it("classifies rm -r as destructive", () => {
    assert.equal(classifyAction("Bash", { command: "rm -r ./build" }), "destructive");
  });

  it("classifies git reset --hard as destructive", () => {
    assert.equal(classifyAction("Bash", { command: "git reset --hard HEAD~1" }), "destructive");
  });

  it("classifies git push --force as destructive", () => {
    assert.equal(classifyAction("Bash", { command: "git push --force origin main" }), "destructive");
  });

  it("classifies git clean -f as destructive", () => {
    assert.equal(classifyAction("Bash", { command: "git clean -fd" }), "destructive");
  });

  it("classifies drop table as destructive", () => {
    assert.equal(classifyAction("Bash", { command: 'psql -c "DROP TABLE users"' }), "destructive");
  });

  it("classifies curl as network", () => {
    assert.equal(classifyAction("Bash", { command: "curl https://api.example.com" }), "network");
  });

  it("classifies wget as network", () => {
    assert.equal(classifyAction("Bash", { command: "wget https://example.com/file.zip" }), "network");
  });

  it("classifies ssh as network", () => {
    assert.equal(classifyAction("Bash", { command: "ssh user@host" }), "network");
  });

  it("classifies cat .env as credential", () => {
    assert.equal(classifyAction("Bash", { command: "cat .env" }), "credential");
  });

  it("classifies reading ~/.ssh as credential", () => {
    assert.equal(classifyAction("Bash", { command: "cat ~/.ssh/id_rsa" }), "credential");
  });

  it("classifies cat README as read", () => {
    assert.equal(classifyAction("Bash", { command: "cat README.md" }), "read");
  });

  it("classifies ls as read", () => {
    assert.equal(classifyAction("Bash", { command: "ls -la" }), "read");
  });

  it("classifies git status as read", () => {
    assert.equal(classifyAction("Bash", { command: "git status" }), "read");
  });

  it("classifies git log as read", () => {
    assert.equal(classifyAction("Bash", { command: "git log --oneline" }), "read");
  });

  it("classifies npm test as execute", () => {
    assert.equal(classifyAction("Bash", { command: "npm test" }), "execute");
  });

  it("classifies npm install as execute", () => {
    assert.equal(classifyAction("Bash", { command: "npm install express" }), "execute");
  });

  it("classifies cargo build as execute", () => {
    assert.equal(classifyAction("Bash", { command: "cargo build --release" }), "execute");
  });

  it("classifies command with redirect as write", () => {
    assert.equal(classifyAction("Bash", { command: "echo hello > output.txt" }), "write");
  });
});

describe("classifyAction — File tools", () => {
  it("classifies Read as read", () => {
    assert.equal(classifyAction("Read", { file_path: "/src/main.ts" }), "read");
  });

  it("classifies Glob as read", () => {
    assert.equal(classifyAction("Glob", { pattern: "**/*.ts" }), "read");
  });

  it("classifies Grep as read", () => {
    assert.equal(classifyAction("Grep", { pattern: "TODO" }), "read");
  });

  it("classifies Write as write", () => {
    assert.equal(classifyAction("Write", { file_path: "/src/app.ts" }), "write");
  });

  it("classifies Edit as write", () => {
    assert.equal(classifyAction("Edit", { file_path: "/src/app.ts" }), "write");
  });

  it("classifies Write to .env as credential", () => {
    assert.equal(classifyAction("Write", { file_path: "/project/.env" }), "credential");
  });

  it("classifies Read of .env as credential", () => {
    assert.equal(classifyAction("Read", { file_path: "/project/.env" }), "credential");
  });

  it("classifies Write to credentials file as credential", () => {
    assert.equal(classifyAction("Write", { file_path: "/config/credentials.json" }), "credential");
  });
});

describe("classifyAction — Web tools", () => {
  it("classifies WebFetch as network", () => {
    assert.equal(classifyAction("WebFetch", { url: "https://example.com" }), "network");
  });

  it("classifies WebSearch as network", () => {
    assert.equal(classifyAction("WebSearch", { query: "test" }), "network");
  });
});

describe("classifyAction — Other tools", () => {
  it("classifies MCP tools as unknown", () => {
    assert.equal(classifyAction("mcp__server__action", {}), "unknown");
  });

  it("classifies Task as read", () => {
    assert.equal(classifyAction("Task", {}), "read");
  });

  it("classifies unrecognized tools as unknown", () => {
    assert.equal(classifyAction("SomeNewTool", {}), "unknown");
  });
});

describe("extractTarget", () => {
  it("extracts command from Bash", () => {
    assert.equal(extractTarget("Bash", { command: "npm test" }), "npm test");
  });

  it("extracts file_path from Read", () => {
    assert.equal(extractTarget("Read", { file_path: "/src/app.ts" }), "/src/app.ts");
  });

  it("extracts file_path from Write", () => {
    assert.equal(extractTarget("Write", { file_path: "/src/app.ts" }), "/src/app.ts");
  });

  it("extracts url from WebFetch", () => {
    assert.equal(extractTarget("WebFetch", { url: "https://example.com" }), "https://example.com");
  });

  it("extracts query from WebSearch", () => {
    assert.equal(extractTarget("WebSearch", { query: "test query" }), "test query");
  });

  it("extracts pattern from Glob", () => {
    assert.equal(extractTarget("Glob", { pattern: "**/*.ts" }), "**/*.ts");
  });
});

describe("propose — full pipeline", () => {
  it("produces a valid ActionIntent", () => {
    const input = makeInput("Bash", { command: "npm test" });
    const intent = propose(input);

    assert.equal(intent.tool_name, "Bash");
    assert.equal(intent.action_type, "execute");
    assert.equal(intent.target, "npm test");
    assert.equal(intent.session_id, "test-session");
    assert.ok(intent.content_hash.length === 64);
    assert.ok(intent.timestamp.includes("T"));
  });

  it("produces deterministic content hash", () => {
    const input = makeInput("Bash", { command: "npm test" });
    const intent1 = propose(input);
    const intent2 = propose(input);
    assert.equal(intent1.content_hash, intent2.content_hash);
  });

  it("produces different hash for different input", () => {
    const intent1 = propose(makeInput("Bash", { command: "npm test" }));
    const intent2 = propose(makeInput("Bash", { command: "npm build" }));
    assert.notEqual(intent1.content_hash, intent2.content_hash);
  });

  it("handles empty command gracefully", () => {
    const input = makeInput("Bash", { command: "" });
    const intent = propose(input);
    assert.equal(intent.action_type, "execute");
    assert.equal(intent.target, "");
  });

  it("handles missing fields gracefully", () => {
    const input = makeInput("Bash", {});
    const intent = propose(input);
    assert.ok(intent.action_type);
    assert.ok(intent.content_hash.length === 64);
  });
});
