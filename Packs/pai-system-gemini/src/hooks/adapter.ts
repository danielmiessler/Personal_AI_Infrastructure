import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

function getPaiDir(): string {
  return process.env.PAI_DIR || path.join(os.homedir(), '.claude');
}

function getSettingsPath(): string {
  return path.join(getPaiDir(), 'settings.json');
}

/**
 * Execute registered PAI hooks for a given event type
 */
function runPaiHooks(paiEvent: string, payload: any): void {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) return;

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    const eventHooks = settings.hooks?.[paiEvent];

    if (!eventHooks || !Array.isArray(eventHooks)) return;

    for (const hookGroup of eventHooks) {
      if (!hookGroup.hooks || !Array.isArray(hookGroup.hooks)) continue;

      for (const hookConfig of hookGroup.hooks) {
        if (hookConfig.type === 'command' && hookConfig.command) {
          // Resolve environment variables in command
          const command = hookConfig.command.replace(/\$PAI_DIR/g, getPaiDir());
          
          // Split command and args
          const [cmd, ...args] = command.split(' ');
          
          // Execute hook, passing payload via stdin
          const result = spawnSync(cmd, args, {
            input: JSON.stringify({
              ...payload,
              hook_event_name: paiEvent,
              session_id: 'gemini-session-' + new Date().toISOString().split('T')[0]
            }),
            encoding: 'utf-8',
            shell: true
          });

          // If hook returns exit code 2 (BLOCK), we should ideally communicate this back to Gemini
          // For now, PAI hooks mostly use stdout for messaging.
          if (result.status === 2) {
             console.error(`[PAI Hook Blocked]: ${result.stdout || result.stderr}`);
          }
        }
      }
    }
  } catch (e) {
    console.error(`[Gemini Adapter] Error executing PAI hooks for ${paiEvent}:`, e);
  }
}

interface SkillSummary {
  name: string;
  description: string;
  path: string;
}

export function getLocalTimestamp(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: process.env.TIME_ZONE || 'America/New_York',
  });
}

export function getCoreContext(): string {
  const skillsDir = path.join(getPaiDir(), 'skills');
  let context = '';

  // 1. Load Identity (Primary Source of Truth for Persona)
  const identityPath = path.join(skillsDir, 'CORE', 'USER', 'DAIDENTITY.md');
  if (fs.existsSync(identityPath)) {
    context += '=== 🆔 IDENTITY ===\n' + fs.readFileSync(identityPath, 'utf-8') + '\n\n';
  } else {
    // Fallback search
    const legacyPath = path.join(skillsDir, 'CORE', 'USER', 'identity.md');
    if (fs.existsSync(legacyPath)) {
      context += '=== 🆔 IDENTITY ===\n' + fs.readFileSync(legacyPath, 'utf-8') + '\n\n';
    }
  }

  // 2. Load Core Skill (Operational Principles)
  const corePath = path.join(skillsDir, 'CORE', 'SKILL.md');
  if (fs.existsSync(corePath)) {
    context += '=== 🧠 CORE SKILL ===\n' + fs.readFileSync(corePath, 'utf-8');
  } else {
    context += 'PAI Core Skill definition not found.';
  }

  return context;
}

export function getExtendedContext(): string {
  const userDir = path.join(getPaiDir(), 'skills', 'CORE', 'USER');
  const filesToLoad = [
    { name: 'BASIC INFO', file: 'BASICINFO.md' },
    { name: 'CONTACTS', file: 'CONTACTS.md' },
    { name: 'TECH STACK', file: 'TECHSTACKPREFERENCES.md' },
    { name: 'TELOS (GOALS)', file: 'TELOS.md' },
  ];

  let output = '';
  for (const item of filesToLoad) {
    const filePath = path.join(userDir, item.file);
    if (fs.existsSync(filePath)) {
      output += `\n=== ${item.name} ===\n${fs.readFileSync(filePath, 'utf-8')}\n`;
    }
  }
  return output;
}

export function scanSkills(): SkillSummary[] {
  const skillsDir = path.join(getPaiDir(), 'skills');
  const skills: SkillSummary[] = [];
  if (!fs.existsSync(skillsDir)) return skills;

  const dirs = fs.readdirSync(skillsDir);
  for (const dir of dirs) {
    if (dir === 'CORE' || dir.startsWith('.')) continue;

    const skillPath = path.join(skillsDir, dir, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      try {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const nameMatch = content.match(/name:\s*(.+)/);
        const descMatch = content.match(/description:\s*(.+)/);

        if (nameMatch && descMatch) {
          skills.push({
            name: nameMatch[1].trim(),
            description: descMatch[1].trim(),
            path: skillPath,
          });
        }
      } catch (e) {}
    }
  }
  return skills;
}

export function generateSystemPrompt(): string {
  const timestamp = getLocalTimestamp();
  const coreContext = getCoreContext();
  const extendedContext = getExtendedContext();
  const skills = scanSkills();

  // --- New Context additions ---
  let memoryState = '';
  try {
    const memPath = path.join(getPaiDir(), 'MEMORY', 'State', 'active-work.json');
    if (fs.existsSync(memPath)) {
      memoryState = '\n=== 💾 ACTIVE WORK STATE ===\n' + fs.readFileSync(memPath, 'utf-8') + '\n';
    }
  } catch (e) {}

  let projectContext = '';
  try {
    const cwd = process.cwd();
    const files = fs
      .readdirSync(cwd)
      .filter((f) => !f.startsWith('.'))
      .slice(0, 50); // Limit to 50
    projectContext =
      '\n=== 📂 PROJECT CONTEXT (' + cwd + ') ===\nFiles:\n' + files.join('\n') + '\n';
  } catch (e) {}
  // -----------------------------

  let skillSection =
    '## 🛠️ AVAILABLE SKILLS\n\nYou have access to the following PAI Skills. \n' +
    "IF a user request matches a skill's intent, you MUST first read the skill file using `read_file` to understand how to use it.\n\n";

  for (const skill of skills) {
    skillSection += `- **${skill.name}**: ${skill.description}\n  *Definition File:* \`${skill.path}\`\n`;
  }

  return `
<system-reminder>
PAI GEMINI BRIDGE ACTIVE
📅 ${timestamp}

${coreContext}

${extendedContext}

${memoryState}

${projectContext}

${skillSection}

**OPERATIONAL INSTRUCTION:**
You are running as the PAI (Personal AI Infrastructure). 
1. Adhere strictly to the CORE context above.
2. Use the "read_file" tool to load Skill definitions when triggered.
3. Log all significant actions using your memory tools if available.
</system-reminder>
`;
}

export async function main() {
  try {
    // Mode 1: Context Generation (CLI)
    if (process.argv.includes('--context')) {
      const systemPrompt = generateSystemPrompt();
      console.log(systemPrompt);
      return;
    }

    // Mode 3: Manual Hook Trigger (CLI)
    const hookIndex = process.argv.indexOf('--hook');
    if (hookIndex !== -1 && hookIndex + 1 < process.argv.length) {
      const hookName = process.argv[hookIndex + 1];
      let payload = {};
      const payloadIndex = process.argv.indexOf('--payload');
      if (payloadIndex !== -1 && payloadIndex + 1 < process.argv.length) {
        try {
          payload = JSON.parse(process.argv[payloadIndex + 1]);
        } catch (e) {}
      }
      
      runPaiHooks(hookName, payload);
      return;
    }

    // Mode 2: Gemini Hook (JSON via Stdin)
    const input = fs.readFileSync(0, 'utf-8');
    if (!input) return;

    const event = JSON.parse(input);
    const response: any = {};

    // Map Gemini events to PAI events
    let paiEvent = event.hook;
    if (event.hook === 'BeforeTool') paiEvent = 'PreToolUse';
    if (event.hook === 'AfterTool') paiEvent = 'PostToolUse';
    if (event.hook === 'BeforeAgent') paiEvent = 'AgentInvoke';

    // 1. Injected Logic for SessionStart
    if (event.hook === 'SessionStart') {
      response.hookSpecificOutput = {
        systemInstruction: generateSystemPrompt(),
      };
    }

    // 2. Execute PAI Hooks Orchestration
    runPaiHooks(paiEvent, event.payload);

    console.log(JSON.stringify(response));
  } catch (error) {
    console.log('{}');
  }
}

if (require.main === module) {
  main();
}

