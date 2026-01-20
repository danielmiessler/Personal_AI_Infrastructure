#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

// Configuration
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const CWD = process.cwd();

// --- Helper Functions ---

function getIdentity(): string {
  const userDir = join(PAI_DIR, 'skills', 'CORE', 'USER');
  const possibleFiles = ['DAIDENTITY.md', 'identity.md', 'Identity.md'];

  for (const file of possibleFiles) {
    const path = join(userDir, file);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }
  return 'Identity file not found.';
}

function getCoreSkill(): string {
  const path = join(PAI_DIR, 'skills', 'CORE', 'SKILL.md');
  if (existsSync(path)) {
    return readFileSync(path, 'utf-8');
  }
  return 'Core Skill not found.';
}

function getExtendedContext(): string {
  const userDir = join(PAI_DIR, 'skills', 'CORE', 'USER');
  const filesToLoad = [
    { name: 'BASIC INFO', file: 'BASICINFO.md' },
    { name: 'CONTACTS', file: 'CONTACTS.md' },
    { name: 'TECH STACK', file: 'TECHSTACKPREFERENCES.md' },
    { name: 'TELOS (GOALS)', file: 'TELOS.md' },
  ];

  let output = '';
  for (const item of filesToLoad) {
    const path = join(userDir, item.file);
    if (existsSync(path)) {
      output += `\n=== ${item.name} ===\n${readFileSync(path, 'utf-8')}\n`;
    }
  }
  return output;
}

function getMemoryState(): string {
  const activeWorkPath = join(PAI_DIR, 'MEMORY', 'State', 'active-work.json');
  if (existsSync(activeWorkPath)) {
    try {
      const content = readFileSync(activeWorkPath, 'utf-8');
      return `\nACTIVE WORK STATE:\n${content}`;
    } catch (e) {
      return '';
    }
  }
  return '';
}

function getProjectContext(): string {
  try {
    const files = readdirSync(CWD).filter((f) => !f.startsWith('.')); // Ignore hidden files basic check

    // Simple tree-like view (top level only for now to save tokens)
    const fileList = files
      .map((f) => {
        try {
          const stats = statSync(join(CWD, f));
          return stats.isDirectory() ? `${f}/` : f;
        } catch {
          return f;
        }
      })
      .join('\n');

    return `\nCURRENT PROJECT (${CWD}):\nFiles:\n${fileList}`;
  } catch (e) {
    return `\nCURRENT PROJECT: Unable to list files in ${CWD}`;
  }
}

function getTimestamp(): string {
  return new Date().toLocaleString();
}

// --- Main ---

function main() {
  const identity = getIdentity();
  const coreSkill = getCoreSkill();
  const extendedContext = getExtendedContext();
  const memory = getMemoryState();
  const project = getProjectContext();
  const timestamp = getTimestamp();

  const context = `
SYSTEM INSTRUCTION:

You are an advanced AI assistant integrated into the Personal AI Infrastructure (PAI).

📅 CURRENT DATE/TIME: ${timestamp}

=== 🆔 IDENTITY ===
${identity}

=== 🧠 CORE SKILLS & CONTEXT ===
${coreSkill}

${extendedContext}

=== 💾 MEMORY & STATE ===
${memory}

=== 📂 PROJECT CONTEXT ===
${project}

INSTRUCTIONS:
1. Adopt the persona defined in IDENTITY.
2. Use the MEMORY context to recall active tasks.
3. You are working in the PROJECT directory listed above.
4. If the user provides a prompt, address it. If this is the start of a session, acknowledge the context and await instructions.
`;

  console.log(context);
}

main();
