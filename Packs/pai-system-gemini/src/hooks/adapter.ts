import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function getPaiDir(): string {
  return process.env.PAI_DIR || path.join(os.homedir(), '.claude');
}

function getRawOutputsDir(): string {
  return path.join(getPaiDir(), 'history', 'raw-outputs');
}

function getSkillsDir(): string {
  return path.join(getPaiDir(), 'skills');
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

export function getLogPath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Format: history/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl
  const monthDir = path.join(getRawOutputsDir(), `${year}-${month}`);
  if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir, { recursive: true });

  return path.join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

export function logToPAI(event: string, data: any) {
  const timestamp = new Date().toISOString();
  const logFile = getLogPath();

  // Structure matches Observability expectations
  const entry = JSON.stringify({
    timestamp,
    session_id: 'gemini-session-' + new Date().toISOString().split('T')[0],
    source_app: 'gemini',
    agent_name: 'Gemini',
    hook_event_type: event,
    payload: data,
    summary: typeof data === 'string' ? data : JSON.stringify(data).slice(0, 100),
  });

  try {
    fs.appendFileSync(logFile, entry + '\n');
  } catch (err) {}
}

export function getCoreContext(): string {
  let context = '';

  // 1. Load Identity (Primary Source of Truth for Persona)
  const identityPath = path.join(getSkillsDir(), 'CORE', 'USER', 'DAIDENTITY.md');
  if (fs.existsSync(identityPath)) {
    context += '=== 🆔 IDENTITY ===\n' + fs.readFileSync(identityPath, 'utf-8') + '\n\n';
  } else {
    // Fallback search
    const legacyPath = path.join(getSkillsDir(), 'CORE', 'USER', 'identity.md');
    if (fs.existsSync(legacyPath)) {
      context += '=== 🆔 IDENTITY ===\n' + fs.readFileSync(legacyPath, 'utf-8') + '\n\n';
    }
  }

  // 2. Load Core Skill (Operational Principles)
  const corePath = path.join(getSkillsDir(), 'CORE', 'SKILL.md');
  if (fs.existsSync(corePath)) {
    context += '=== 🧠 CORE SKILL ===\n' + fs.readFileSync(corePath, 'utf-8');
  } else {
    context += 'PAI Core Skill definition not found.';
  }

  return context;
}

export function getExtendedContext(): string {
  const userDir = path.join(getSkillsDir(), 'CORE', 'USER');
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
  const skills: SkillSummary[] = [];
  if (!fs.existsSync(getSkillsDir())) return skills;

  const dirs = fs.readdirSync(getSkillsDir());
  for (const dir of dirs) {
    if (dir === 'CORE' || dir.startsWith('.')) continue;

    const skillPath = path.join(getSkillsDir(), dir, 'SKILL.md');
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

    // Mode 2: Gemini Hook (JSON via Stdin)
    const input = fs.readFileSync(0, 'utf-8');
    if (!input) return;

    const event = JSON.parse(input);
    const response: any = {};

    if (event.hook === 'SessionStart') {
      const systemPrompt = generateSystemPrompt();
      response.hookSpecificOutput = {
        systemInstruction: systemPrompt,
      };
      logToPAI('SessionStart', { mode: 'Interactive', contextInjected: true });
    }

    // Map Gemini events to PAI Observability events
    let hookType = event.hook;
    if (event.hook === 'BeforeTool') hookType = 'PreToolUse';
    if (event.hook === 'AfterTool') hookType = 'PostToolUse';
    if (event.hook === 'BeforeAgent') hookType = 'AgentInvoke';

    logToPAI(hookType, event.payload);
    console.log(JSON.stringify(response));
  } catch (error) {
    console.log('{}');
  }
}

if (require.main === module) {
  main();
}