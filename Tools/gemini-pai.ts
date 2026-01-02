#!/usr/bin/env bun
/**
 * PAI Gemini Adapter
 * 
 * A wrapper for the Gemini CLI that integrates it with the 
 * Personal AI Infrastructure (PAI) hook and history systems. 
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";

export function getPAIDir() {
  return process.env.PAI_DIR || join(homedir(), ".config", 'pai');
}

export function loadEnv(paiDir: string) {
  const envPath = join(paiDir, ".env");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const equalsIndex = trimmed.indexOf("=");
        const key = trimmed.slice(0, equalsIndex).trim();
        const value = trimmed.slice(equalsIndex + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

export function getPAIContext(paiDir: string): string {
  try {
    const coreSkillPath = join(paiDir, "skills", "CORE", "SKILL.md");
    if (existsSync(coreSkillPath)) {
      const coreSkill = readFileSync(coreSkillPath, "utf-8");
      const indexPath = join(paiDir, "skills", "skill-index.json");
      let skillsSummary = "";
      if (existsSync(indexPath)) {
        const index = JSON.parse(readFileSync(indexPath, "utf-8"));
        skillsSummary = Object.values(index.skills)
          .filter((s: any) => s.name !== "CORE")
          .map((s: any) => `- ${s.name}: ${s.fullDescription}`)
          .join("\n");
      }

      const cleanCore = coreSkill.replace(/\0/g, "").trim();
      const cleanSkills = skillsSummary.replace(/\0/g, "").trim();

      return `[ PAI SYSTEM INITIALIZATION ]
${cleanCore}

AVAILABLE SKILLS INDEX:
${cleanSkills}

[ STATUS: Infrastructure Loaded ]
[ IDENTITY: ${process.env.DA || 'PAI'} ]
[ SOURCE: ${process.env.PAI_SOURCE_APP || 'Gemini'} ]

[ END SYSTEM CONTEXT ]`;
    }
  } catch (e) {}
  return "";
}

export async function runHook(paiDir: string, name: string, payload: any, debug: boolean = false) {
  const hookPath = join(paiDir, "hooks", name);
  if (existsSync(hookPath)) {
    try {
      const proc = Bun.spawn(["bun", hookPath], {
        stdin: "pipe",
        stdout: "ignore",
        stderr: "inherit",
        env: process.env
      });
      proc.stdin.write(JSON.stringify(payload));
      proc.stdin.end();
      await proc.exited;
    } catch (e) {}
  }
}

async function main() {
  const PAI_DIR = getPAIDir();
  loadEnv(PAI_DIR);

  const SESSION_ID = crypto.randomUUID();
  const CWD = process.cwd();
  process.env.PAI_SOURCE_APP = "GeminiCLI";
  const DEBUG = process.env.PAI_DEBUG === "true";

  await runHook(PAI_DIR, "initialize-session.ts", { session_id: SESSION_ID, cwd: CWD }, DEBUG);

  try {
    const userArgs = process.argv.slice(2);
    const finalArgs: string[] = ["gemini"];

    const geminiCommands = ["mcp", "extensions", "extension"];
    const isCommand = userArgs.length > 0 && geminiCommands.includes(userArgs[0]);
    const isHelp = userArgs.includes("-h") || userArgs.includes("--help") || userArgs.includes("-v") || userArgs.includes("--version");
    
    const shouldInject = !isCommand && !isHelp;

    if (shouldInject) {
      const context = getPAIContext(PAI_DIR);
      let userPrompt = "";
      let promptFlagIndex = -1;
      const promptFlags = ["-i", "--prompt-interactive", "-p", "--prompt"];
      
      for (let i = 0; i < userArgs.length; i++) {
        if (promptFlags.includes(userArgs[i])) {
          promptFlagIndex = i;
          userPrompt = userArgs[i + 1] || "";
          break;
        }
      }

      if (promptFlagIndex === -1 && userArgs.length > 0 && !userArgs[0].startsWith("-")) {
        userPrompt = userArgs[0];
        promptFlagIndex = 0;
      }

      const finalUserPrompt = userPrompt || "PAI Active. Initialization complete. Please wait for my instruction.";
      const combinedPrompt = context ? `${context}\n\nUSER INSTRUCTION:\n${finalUserPrompt}` : finalUserPrompt;

      finalArgs.push("-i", combinedPrompt);

      for (let i = 0; i < userArgs.length; i++) {
        if (i === promptFlagIndex || (promptFlagIndex !== -1 && promptFlags.includes(userArgs[promptFlagIndex]) && i === promptFlagIndex + 1)) continue;
        finalArgs.push(userArgs[i]);
      }
    } else {
      finalArgs.push(...userArgs);
    }

    if (shouldInject && process.env.GEMINI_MODEL && !finalArgs.includes("-m") && !finalArgs.includes("--model")) {
      finalArgs.push("--model", process.env.GEMINI_MODEL);
    }

    const proc = Bun.spawn(finalArgs, {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, PAI_SESSION_ID: SESSION_ID }
    });

    const exitCode = await proc.exited;

    if (shouldInject) {
      await runHook(PAI_DIR, "stop-hook.ts", { stop_hook_active: true, session_id: SESSION_ID, response: "Gemini session completed." }, DEBUG);
    }

    process.exit(exitCode);
  } catch (e) {
    const proc = Bun.spawn(["gemini", ...process.argv.slice(2)], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
    process.exit(await proc.exited);
  }
}

if (import.meta.main) main();
