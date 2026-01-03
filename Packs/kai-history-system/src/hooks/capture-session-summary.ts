#!/usr/bin/env bun
// $PAI_DIR/hooks/capture-session-summary.ts
// Creates session summary when Claude Code session ends

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface SessionData {
  session_id: string;
  timestamp: string;
  [key: string]: any;
}

function getLocalTimestamp(): string {
  const date = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function determineSessionFocus(filesChanged: string[], commandsExecuted: string[]): string {
  const filePatterns = filesChanged.map(f => f.toLowerCase());

  if (filePatterns.some(f => f.includes('/blog/') || f.includes('/posts/'))) return 'blog-work';
  if (filePatterns.some(f => f.includes('/hooks/'))) return 'hook-development';
  if (filePatterns.some(f => f.includes('/skills/'))) return 'skill-updates';
  if (filePatterns.some(f => f.includes('/agents/'))) return 'agent-work';
  if (commandsExecuted.some(cmd => cmd.includes('test'))) return 'testing-session';
  if (commandsExecuted.some(cmd => cmd.includes('git commit'))) return 'git-operations';
  if (commandsExecuted.some(cmd => cmd.includes('deploy'))) return 'deployment';

  if (filesChanged.length > 0) {
    const mainFile = filesChanged[0].split('/').pop()?.replace(/\.(md|ts|js)$/, '');
    if (mainFile) return `${mainFile}-work`;
  }

  return 'development-session';
}

async function analyzeSession(conversationId: string, yearMonth: string): Promise<any> {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const rawOutputsDir = join(paiDir, 'history', 'raw-outputs', yearMonth);

  let filesChanged: string[] = [];
  let commandsExecuted: string[] = [];
  let toolsUsed: Set<string> = new Set();

  try {
    if (existsSync(rawOutputsDir)) {
      const files = readdirSync(rawOutputsDir).filter(f => f.endsWith('.jsonl'));

      for (const file of files) {
        const content = readFileSync(join(rawOutputsDir, file), 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.payload?.tool_name) {
              toolsUsed.add(entry.payload.tool_name);
            }
            if (entry.payload?.tool_name === 'Edit' || entry.payload?.tool_name === 'Write') {
              if (entry.payload?.tool_input?.file_path) {
                filesChanged.push(entry.payload.tool_input.file_path);
              }
            }
            if (entry.payload?.tool_name === 'Bash' && entry.payload?.tool_input?.command) {
              commandsExecuted.push(entry.payload.tool_input.command);
            }
          } catch (e) {}
        }
      }
    }
  } catch (error) {}

  return {
    focus: determineSessionFocus([...new Set(filesChanged)], commandsExecuted),
    filesChanged: [...new Set(filesChanged)].slice(0, 10),
    commandsExecuted: commandsExecuted.slice(0, 10),
    toolsUsed: Array.from(toolsUsed)
  };
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    if (!input.trim()) process.exit(0);

    const data: SessionData = JSON.parse(input);
    const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
    const historyDir = join(paiDir, 'history');

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const sessionInfo = await analyzeSession(data.session_id, yearMonth);
    const filename = `${timestamp}_SESSION_${sessionInfo.focus}.md`;

    const sessionDir = join(historyDir, 'sessions', yearMonth);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    const sessionDoc = `---
capture_type: SESSION
timestamp: ${getLocalTimestamp()}
session_id: ${data.session_id}
executor: main
---

# Session: ${sessionInfo.focus}

**Session ID:** ${data.session_id}
**Ended:** ${getLocalTimestamp()}

---

## Tools Used

${sessionInfo.toolsUsed.length > 0 ? sessionInfo.toolsUsed.map((t: string) => `- ${t}`).join('\n') : '- None recorded'}

---

## Files Modified

${sessionInfo.filesChanged.length > 0 ? sessionInfo.filesChanged.map((f: string) => `- \`${f}\``).join('\n') : '- None recorded'}

---

## Commands Executed

${sessionInfo.commandsExecuted.length > 0 ? '```bash\n' + sessionInfo.commandsExecuted.join('\n') + '\n```' : 'None recorded'}

---

*Session summary captured by PAI History System*
`;

    writeFileSync(join(sessionDir, filename), sessionDoc);
    console.log(`📝 Session summary saved to sessions/${yearMonth}/${filename}`);

  } catch (error) {
    console.error('Session summary error:', error);
  }

  process.exit(0);
}

main();
