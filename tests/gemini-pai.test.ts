import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getPAIDir, loadEnv, getPAIContext } from "../Tools/gemini-pai";

describe("gemini-pai adapter", () => {
  const tempPaiDir = join(tmpdir(), `pai-test-${Math.random().toString(36).slice(2)}`);

  beforeEach(() => {
    mkdirSync(tempPaiDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempPaiDir, { recursive: true, force: true });
  });

  test("getPAIDir should respect PAI_DIR env var", () => {
    const originalPaiDir = process.env.PAI_DIR;
    process.env.PAI_DIR = "/custom/pai/path";
    expect(getPAIDir()).toBe("/custom/pai/path");
    process.env.PAI_DIR = originalPaiDir;
  });

  test("loadEnv should load variables from .env file", () => {
    writeFileSync(join(tempPaiDir, ".env"), "TEST_VAR=hello\n# COMMENT=ignore\nANOTHER_VAR=world");
    loadEnv(tempPaiDir);
    expect(process.env.TEST_VAR).toBe("hello");
    expect(process.env.ANOTHER_VAR).toBe("world");
    
    delete process.env.TEST_VAR;
    delete process.env.ANOTHER_VAR;
  });

  test("getPAIContext should generate context from SKILL.md and index", () => {
    const skillsDir = join(tempPaiDir, "skills");
    const coreDir = join(skillsDir, "CORE");
    mkdirSync(coreDir, { recursive: true });
    
    writeFileSync(join(coreDir, "SKILL.md"), "CORE SKILL CONTENT");
    
    const skillIndex = {
      skills: {
        "art": { name: "Art", fullDescription: "Generate art" },
        "core": { name: "CORE", fullDescription: "Foundation" }
      }
    };
    writeFileSync(join(skillsDir, "skill-index.json"), JSON.stringify(skillIndex));

    const context = getPAIContext(tempPaiDir);
    
    expect(context).toContain("[ PAI SYSTEM INITIALIZATION ]");
    expect(context).toContain("CORE SKILL CONTENT");
    expect(context).toContain("- Art: Generate art");
    expect(context).not.toContain("- CORE: Foundation");
    expect(context).toContain("[ END SYSTEM CONTEXT ]");
  });

  test("getPAIContext should return empty string if CORE/SKILL.md is missing", () => {
    expect(getPAIContext(tempPaiDir)).toBe("");
  });
});
