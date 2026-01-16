#!/usr/bin/env bun
// $PAI_DIR/hooks/subagent-stop-hook.ts
// Routes subagent outputs to appropriate history directories

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { extractAgentInstanceId } from './lib/metadata-extraction';

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

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findTaskResult(transcriptPath: string, maxAttempts: number = 2): Promise<{ result: string | null, agentType: string | null, description: string | null, toolInput: any | null }> {
  let actualTranscriptPath = transcriptPath;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await delay(200);

    if (!existsSync(actualTranscriptPath)) {
      const dir = dirname(transcriptPath);
      if (existsSync(dir)) {
        const files = readdirSync(dir)
          .filter(f => f.startsWith('agent-') && f.endsWith('.jsonl'))
          .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtime }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        if (files.length > 0) {
          actualTranscriptPath = join(dir, files[0].name);
        }
      }
      if (!existsSync(actualTranscriptPath)) continue;
    }

    try {
      const transcript = readFileSync(actualTranscriptPath, 'utf-8');
      const lines = transcript.trim().split('\n');

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.type === 'assistant' && entry.message?.content) {
            for (const content of entry.message.content) {
              if (content.type === 'tool_use' && content.name === 'Task') {
                const toolInput = content.input;
                const description = toolInput?.description || null;

                for (let j = i + 1; j < lines.length; j++) {
                  const resultEntry = JSON.parse(lines[j]);
                  if (resultEntry.type === 'user' && resultEntry.message?.content) {
                    for (const resultContent of resultEntry.message.content) {
                      if (resultContent.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                        let taskOutput: string;
                        if (typeof resultContent.content === 'string') {
                          taskOutput = resultContent.content;
                        } else if (Array.isArray(resultContent.content)) {
                          taskOutput = resultContent.content
                            .filter((item: any) => item.type === 'text')
                            .map((item: any) => item.text)
                            .join('\n');
                        } else {
                          continue;
                        }

                        let agentType = toolInput?.subagent_type || 'default';
                        return { result: taskOutput, agentType, description, toolInput };
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return { result: null, agentType: null, description: null, toolInput: null };
}

function extractCompletionMessage(taskOutput: string): { message: string | null, agentType: string | null } {
  // Look for COMPLETED section
  const patterns = [
    /🎯\s*COMPLETED[:\s]*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /🎯\s*COMPLETED[:\s]*(.+?)(?:\n|$)/i,
    /COMPLETED[:\s]*(.+?)(?:\n|$)/i
  ];

  for (const pattern of patterns) {
    const match = taskOutput.match(pattern);
    if (match) {
      if (match[2]) {
        return { message: match[2].trim(), agentType: match[1].toLowerCase() };
      }
      return { message: match[1].trim(), agentType: null };
    }
  }

  return { message: null, agentType: null };
}

async function captureAgentOutput(
  agentType: string,
  completionMessage: string,
  taskOutput: string,
  transcriptPath: string
) {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const historyDir = join(paiDir, 'MEMORY');

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Route by agent type
  let captureType = 'RESEARCH';
  let category = 'research';

  if (agentType.includes('researcher') || agentType === 'intern') {
    captureType = 'RESEARCH';
    category = 'research';
  } else if (agentType === 'architect') {
    captureType = 'DECISION';
    category = 'decisions';
  } else if (agentType === 'engineer' || agentType === 'designer') {
    captureType = 'FEATURE';
    category = 'execution/features';
  }

  const description = completionMessage
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const filename = `${timestamp}_AGENT-${agentType}_${captureType}_${description}.md`;
  const outputDir = join(historyDir, category, yearMonth);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const document = `---
capture_type: ${captureType}
timestamp: ${getLocalTimestamp()}
executor: ${agentType}
agent_completion: ${completionMessage}
---

# ${captureType}: ${completionMessage}

**Agent:** ${agentType}
**Completed:** ${timestamp}

---

## Agent Output

${taskOutput}

---

## Metadata

**Transcript:** \`${transcriptPath}\`
**Captured:** ${getLocalTimestamp()}

---

*Captured by PAI History System subagent-stop-hook*
`;

  writeFileSync(join(outputDir, filename), document);
  console.log(`📝 Captured ${agentType} output to ${category}/${yearMonth}/${filename}`);
}

async function main() {
  try {
    let input = '';
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();

    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 500));
    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (!input) process.exit(0);

    const parsed = JSON.parse(input);
    const transcriptPath = parsed.transcript_path;
    if (!transcriptPath) process.exit(0);

    const { result: taskOutput, agentType, description, toolInput } = await findTaskResult(transcriptPath);
    if (!taskOutput) process.exit(0);

    const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);
    if (!completionMessage) process.exit(0);

    const finalAgentType = extractedAgentType || agentType || 'default';

    await captureAgentOutput(finalAgentType, completionMessage, taskOutput, transcriptPath);

  } catch (error) {
    console.error('Subagent stop hook error:', error);
  }

  process.exit(0);
}

main();
