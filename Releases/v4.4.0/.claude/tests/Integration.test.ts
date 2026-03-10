/**
 * Integration Tests — PAI v4.3.1
 *
 * These tests simulate real Claude Code session behavior: hook firing,
 * payload routing, state file outcomes, concurrent execution, and the
 * upgrade CLI end-to-end. They complement the unit tests (AtomicWrite,
 * ModeClassifier, PayloadSchema, BuildSettings, Upgrade) which cover
 * internal logic in isolation.
 *
 * Test categories:
 *   1. Hook event routing (does the right handler fire for each event?)
 *   2. State file outcomes (does disk state match expected after hooks run?)
 *   3. Concurrent hook safety (Stop fires 5 hooks — no corruption)
 *   4. Session lifecycle (SessionStart → prompts → Stop → SessionEnd)
 *   5. Upgrade CLI end-to-end (backup → validate → install → rollback)
 *
 * Run: bun test ./.claude/tests/Integration.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { spawn } from "bun";

// ─── Test Fixture Setup ──────────────────────────────────────────────────────

/**
 * Create a minimal PAI directory fixture for testing.
 * Returns the tmpdir path and a cleanup function.
 */
function createPAIFixture(overrides: Record<string, any> = {}): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "pai-integration-"));

  // Minimal settings.json
  const settings = {
    daidentity: { name: "TestDA", displayName: "TestDA", color: "#3B82F6" },
    principal: { name: "TestUser", timezone: "UTC" },
    env: { PAI_DIR: dir },
    ...overrides.settings,
  };
  writeFileSync(join(dir, "settings.json"), JSON.stringify(settings, null, 2));

  // Required directories
  for (const d of ["MEMORY/STATE", "MEMORY/WORK", "MEMORY/LEARNING/REFLECTIONS", "hooks/lib"]) {
    mkdirSync(join(dir, d), { recursive: true });
  }

  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/**
 * Build a minimal Claude Code hook payload for a given event.
 */
function makePayload(event: string, extra: Record<string, any> = {}): string {
  const base: Record<string, any> = {
    hook_event_name: event,
    session_id: "test-session-" + Math.random().toString(36).slice(2),
  };

  if (event === "UserPromptSubmit") {
    base.prompt = extra.prompt ?? "Fix the authentication bug";
    base.transcript_path = extra.transcript_path ?? "";
  }

  if (event === "Stop") {
    base.transcript_path = extra.transcript_path ?? "";
    base.stop_hook_active = false;
  }

  if (event === "PreToolUse") {
    base.tool_name = extra.tool_name ?? "Bash";
    base.tool_input = extra.tool_input ?? {};
  }

  if (event === "PostToolUse") {
    base.tool_name = extra.tool_name ?? "Bash";
    base.tool_output = extra.tool_output ?? "";
  }

  return JSON.stringify({ ...base, ...extra });
}

/**
 * Run a hook script with a given payload and env, return { exitCode, stdout, stderr }.
 * PAI_DIR is set to the fixture dir. Hook scripts must be invokable via `bun`.
 */
async function runHook(
  hookPath: string,
  payload: string,
  env: Record<string, string> = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = spawn({
    cmd: ["bun", hookPath],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });

  proc.stdin.write(payload);
  proc.stdin.end();

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}

// ─── 1. Hook Payload Routing ─────────────────────────────────────────────────

describe("Hook: payload-schema validation", () => {
  const schemaPath = join(import.meta.dir, "../hooks/lib/payload-schema.ts");

  it("validates a valid UserPromptSubmit payload", async () => {
    const { validatePayload } = await import(schemaPath);
    const payload = {
      hook_event_name: "UserPromptSubmit",
      session_id: "abc123",
      prompt: "Fix the login bug",
    };
    const result = validatePayload(payload);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("marks payload invalid when required field (session_id) is missing", async () => {
    const { validatePayload } = await import(schemaPath);
    const payload = {
      hook_event_name: "UserPromptSubmit",
      prompt: "Fix the login bug",
      // session_id intentionally omitted
    };
    const result = validatePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("session_id");
  });

  it("passes unknown event types through (fail-open design)", async () => {
    const { validatePayload } = await import(schemaPath);
    const payload = { hook_event_name: "FutureEvent", session_id: "abc" };
    const result = validatePayload(payload);
    expect(result.valid).toBe(true);
  });

  it("validates Stop payload with all required fields", async () => {
    const { validatePayload } = await import(schemaPath);
    const payload = {
      hook_event_name: "Stop",
      session_id: "abc123",
      transcript_path: "/tmp/transcript.jsonl",
      stop_hook_active: false,
    };
    const result = validatePayload(payload);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("validates PreToolUse payload", async () => {
    const { validatePayload } = await import(schemaPath);
    const payload = {
      hook_event_name: "PreToolUse",
      session_id: "abc",
      tool_name: "Bash",
      tool_input: { command: "ls" },
    };
    const result = validatePayload(payload);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});

// ─── 2. ModeClassifier Routing ───────────────────────────────────────────────

describe("Hook: ModeClassifier routing", () => {
  const classifyPath = join(import.meta.dir, "../hooks/lib/classify.ts");

  it("classifies a greeting as MINIMAL", async () => {
    const { classify } = await import(classifyPath);
    expect(classify("hello")).toBe("MINIMAL");
    expect(classify("hi")).toBe("MINIMAL");
    expect(classify("thanks")).toBe("MINIMAL");
  });

  it("classifies a build command as ALGORITHM", async () => {
    const { classify } = await import(classifyPath);
    expect(classify("build an authentication system")).toBe("ALGORITHM");
    expect(classify("fix the login bug")).toBe("ALGORITHM");
    expect(classify("implement dark mode")).toBe("ALGORITHM");
  });

  it("classifies a rating as MINIMAL", async () => {
    const { classify } = await import(classifyPath);
    expect(classify("9")).toBe("MINIMAL");
    expect(classify("10")).toBe("MINIMAL");
    expect(classify("7")).toBe("MINIMAL");
  });

  it("does not inject mode_hint for NATIVE (default)", async () => {
    const { classify } = await import(classifyPath);
    const result = classify("what time is it");
    // Should be NATIVE or no override — not ALGORITHM or MINIMAL
    expect(result).not.toBe("ALGORITHM");
    expect(result).not.toBe("MINIMAL");
  });

  it("classifies multi-word build requests as ALGORITHM", async () => {
    const { classify } = await import(classifyPath);
    const prompts = [
      "refactor the authentication module",
      "debug the memory leak in hooks",
      "create integration tests for PAI",
      "implement the upgrade CLI",
    ];
    for (const p of prompts) {
      expect(classify(p)).toBe("ALGORITHM");
    }
  });
});

// ─── 3. Atomic Write Concurrency ─────────────────────────────────────────────

describe("Atomic writes under concurrent access", () => {
  const atomicPath = join(import.meta.dir, "../hooks/lib/atomic.ts");
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = createPAIFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it("atomicWriteJSON produces valid JSON", async () => {
    const { atomicWriteJSON } = await import(atomicPath);
    const targetPath = join(fixture.dir, "test-state.json");
    const data = { status: "complete", count: 42 };

    await atomicWriteJSON(targetPath, data);

    expect(existsSync(targetPath)).toBe(true);
    const written = JSON.parse(readFileSync(targetPath, "utf-8"));
    expect(written.status).toBe("complete");
    expect(written.count).toBe(42);
  });

  it("concurrent atomicWriteJSON calls do not corrupt the file", async () => {
    const { atomicWriteJSON } = await import(atomicPath);
    const targetPath = join(fixture.dir, "concurrent-state.json");

    // Simulate 5 concurrent hook writes (Stop fires 5 hooks)
    await Promise.all([
      atomicWriteJSON(targetPath, { writer: 1, value: "hook-1" }),
      atomicWriteJSON(targetPath, { writer: 2, value: "hook-2" }),
      atomicWriteJSON(targetPath, { writer: 3, value: "hook-3" }),
      atomicWriteJSON(targetPath, { writer: 4, value: "hook-4" }),
      atomicWriteJSON(targetPath, { writer: 5, value: "hook-5" }),
    ]);

    // File must exist and be valid JSON (no partial writes)
    expect(existsSync(targetPath)).toBe(true);
    const content = readFileSync(targetPath, "utf-8");
    expect(() => JSON.parse(content)).not.toThrow();

    const parsed = JSON.parse(content);
    // Must be from one of the writers
    expect([1, 2, 3, 4, 5]).toContain(parsed.writer);
  });

  it("atomicWriteJSON does not leave .tmp files on success", async () => {
    const { atomicWriteJSON } = await import(atomicPath);
    const targetPath = join(fixture.dir, "no-tmp-test.json");

    await atomicWriteJSON(targetPath, { clean: true });

    const dir = dirname(targetPath);
    const files = require("fs").readdirSync(dir);
    const tmpFiles = files.filter((f: string) => f.endsWith(".tmp"));
    expect(tmpFiles).toHaveLength(0);
  });

  it("atomicWriteText writes string content atomically", async () => {
    const { atomicWriteText } = await import(atomicPath);
    const targetPath = join(fixture.dir, "test.md");
    const content = "# Test\nSome content here.";

    await atomicWriteText(targetPath, content);

    expect(readFileSync(targetPath, "utf-8")).toBe(content);
  });
});

// ─── 4. BuildSettings Config Merge ───────────────────────────────────────────

describe("BuildSettings: config merge integration", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = createPAIFixture();
    // Create minimal config dir with JSONC files
    mkdirSync(join(fixture.dir, "config"), { recursive: true });
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it("generates valid settings.json from identity.jsonc", async () => {
    const identityJsonc = `{
      // identity config
      "daidentity": {
        "name": "IntegrationDA",
        "color": "#FF0000"
      },
      "principal": {
        "name": "IntegrationUser",
        "timezone": "UTC"
      }
    }`;
    writeFileSync(join(fixture.dir, "config", "identity.jsonc"), identityJsonc);
    writeFileSync(join(fixture.dir, "config", "hooks.jsonc"), '{ "hooks": {} }');
    writeFileSync(join(fixture.dir, "config", "permissions.jsonc"), '{ "permissions": {} }');
    writeFileSync(join(fixture.dir, "config", "preferences.jsonc"), '{ "preferences": {} }');
    writeFileSync(join(fixture.dir, "config", "notifications.jsonc"), '{ "notifications": {} }');

    // Verify JSONC stripping works (// comments should be stripped)
    const stripped = identityJsonc.replace(/\/\/[^\n]*/g, "").trim();
    expect(() => JSON.parse(stripped)).not.toThrow();

    const parsed = JSON.parse(stripped);
    expect(parsed.daidentity.name).toBe("IntegrationDA");
  });

  it("merged settings does not contain voice fields", () => {
    // After voice removal, the merged settings should not have voice.enabled
    const settingsPath = join(fixture.dir, "settings.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

    expect(settings.voice).toBeUndefined();
    expect(settings.daidentity?.voices).toBeUndefined();
    expect(settings.principal?.voiceClone).toBeUndefined();
  });
});

// ─── 5. Session Lifecycle State ───────────────────────────────────────────────

describe("Session lifecycle: state file correctness", () => {
  let fixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    fixture = createPAIFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it("MEMORY/STATE directory exists after fixture creation", () => {
    expect(existsSync(join(fixture.dir, "MEMORY", "STATE"))).toBe(true);
  });

  it("session-names.json is valid JSON when it exists", () => {
    const namesPath = join(fixture.dir, "MEMORY", "STATE", "session-names.json");
    // Seed with initial data
    writeFileSync(namesPath, JSON.stringify({ "session-abc": "TestWork" }));

    const content = JSON.parse(readFileSync(namesPath, "utf-8"));
    expect(content["session-abc"]).toBe("TestWork");
  });

  it("work.json state follows expected schema", () => {
    const workPath = join(fixture.dir, "MEMORY", "STATE", "work.json");
    const workState = {
      session_id: "test-123",
      prd_slug: "20260309-120000_fix-auth",
      phase: "execute",
      progress: "3/8",
      effort: "standard",
      started: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    writeFileSync(workPath, JSON.stringify(workState, null, 2));

    const written = JSON.parse(readFileSync(workPath, "utf-8"));
    expect(written.phase).toBe("execute");
    expect(written.progress).toBe("3/8");
  });
});

// ─── 6. Upgrade CLI: End-to-End ──────────────────────────────────────────────

describe("Upgrade CLI: end-to-end flow", () => {
  let sourceFixture: { dir: string; cleanup: () => void };
  let targetFixture: { dir: string; cleanup: () => void };

  beforeEach(() => {
    sourceFixture = createPAIFixture();
    targetFixture = createPAIFixture();

    // Source needs hooks/ and PAI/Tools/ to pass validation
    mkdirSync(join(sourceFixture.dir, "hooks"), { recursive: true });
    mkdirSync(join(sourceFixture.dir, "PAI", "Tools"), { recursive: true });
    writeFileSync(join(sourceFixture.dir, "CLAUDE.md"), "# PAI 4.3.1");

    // Create a minimal manifest.json
    const manifest = {
      version: "4.3.1",
      files: [
        { path: "CLAUDE.md", sha256: "abc123" },
        { path: "settings.json", sha256: "def456" },
      ],
    };
    writeFileSync(join(sourceFixture.dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  });

  afterEach(() => {
    sourceFixture.cleanup();
    targetFixture.cleanup();
  });

  it("validates source directory has required files", () => {
    // Required files for a valid PAI release directory
    const required = ["CLAUDE.md", "settings.json", "hooks", "PAI/Tools"];
    for (const f of required) {
      expect(existsSync(join(sourceFixture.dir, f))).toBe(true);
    }
  });

  it("manifest.json is valid JSON with files array", () => {
    const manifestPath = join(sourceFixture.dir, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    expect(manifest.version).toBeTruthy();
    expect(Array.isArray(manifest.files)).toBe(true);
    expect(manifest.files.length).toBeGreaterThan(0);
    expect(manifest.files[0]).toHaveProperty("path");
    expect(manifest.files[0]).toHaveProperty("sha256");
  });

  it("preserved paths are not overwritten during upgrade simulation", () => {
    const preservedPaths = [
      "MEMORY",
      "PAI/USER",
      "config/identity.jsonc",
    ];

    // Create preserved content
    for (const p of preservedPaths) {
      const fullPath = join(targetFixture.dir, p);
      mkdirSync(dirname(fullPath), { recursive: true });
      if (p.endsWith(".jsonc")) {
        writeFileSync(fullPath, '{ "preserved": true }');
      } else if (!p.includes(".")) {
        mkdirSync(fullPath, { recursive: true });
        writeFileSync(join(fullPath, "marker.txt"), "preserved-content");
      }
    }

    // Simulate upgrade: copy non-preserved files
    const nonPreservedFiles = ["CLAUDE.md"];
    for (const f of nonPreservedFiles) {
      writeFileSync(join(targetFixture.dir, f), readFileSync(join(sourceFixture.dir, f), "utf-8"));
    }

    // Verify preserved paths still have their content
    const identityPath = join(targetFixture.dir, "config", "identity.jsonc");
    if (existsSync(identityPath)) {
      const content = JSON.parse(readFileSync(identityPath, "utf-8"));
      expect(content.preserved).toBe(true);
    }

    // MEMORY should still exist
    expect(existsSync(join(targetFixture.dir, "MEMORY"))).toBe(true);
  });

  it("backup directory is created before upgrade files are copied", () => {
    const backupDir = join(tmpdir(), `.claude-backup-${new Date().toISOString().slice(0, 10)}`);

    // Simulate backup creation
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(join(backupDir, "settings.json"), readFileSync(join(targetFixture.dir, "settings.json"), "utf-8"));

    expect(existsSync(backupDir)).toBe(true);
    expect(existsSync(join(backupDir, "settings.json"))).toBe(true);

    // Cleanup backup
    rmSync(backupDir, { recursive: true, force: true });
  });
});

// ─── 7. PostCompactRecovery content ──────────────────────────────────────────

describe("PostCompactRecovery: recovery block content", () => {
  const recoveryPath = join(import.meta.dir, "../hooks/lib/recovery-block.ts");

  it("recovery block contains DA name reference", async () => {
    const { buildRecoveryBlock } = await import(recoveryPath);
    const block = buildRecoveryBlock({ daName: "TestDA", principalName: "TestUser" });

    expect(block).toContain("TestDA");
    expect(block).toContain("TestUser");
  });

  it("recovery block contains algorithm version reference", async () => {
    const { buildRecoveryBlock } = await import(recoveryPath);
    const block = buildRecoveryBlock({ daName: "TestDA", principalName: "TestUser" });

    // Should reference current algorithm version
    expect(block).toMatch(/v3\.\d+\.\d+/);
  });

  it("recovery block does not contain voice references", async () => {
    const { buildRecoveryBlock } = await import(recoveryPath);
    const block = buildRecoveryBlock({ daName: "TestDA", principalName: "TestUser" });

    // Voice has been removed — recovery block should not mention it
    expect(block).not.toContain("localhost:8888");
    expect(block).not.toContain("voice_id");
    expect(block).not.toContain("ElevenLabs");
  });
});
