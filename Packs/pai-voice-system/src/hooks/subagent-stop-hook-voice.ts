#!/usr/bin/env bun
// $PAI_DIR/hooks/subagent-stop-hook-voice.ts
// Subagent voice notification with personality-specific delivery

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { readdirSync, statSync } from 'fs';
import { enhanceProsody, cleanForSpeech, getVoiceId } from './lib/prosody-enhancer';

interface NotificationPayload {
  title: string;
  message: string;
  voice_enabled: boolean;
  voice_id: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findTaskResult(transcriptPath: string, maxAttempts: number = 2): Promise<{
  result: string | null;
  agentType: string | null;
  description: string | null;
}> {
  let actualTranscriptPath = transcriptPath;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await delay(200);
    }

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

      if (!existsSync(actualTranscriptPath)) {
        continue;
      }
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

                        const agentType = toolInput?.subagent_type || 'default';
                        return { result: taskOutput, agentType, description };
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          // Skip invalid lines
        }
      }
    } catch (e) {
      // Will retry
    }
  }

  return { result: null, agentType: null, description: null };
}

function extractCompletionMessage(taskOutput: string): { message: string | null; agentType: string | null } {
  // Look for COMPLETED section with agent tag
  const agentPatterns = [
    /🎯\s*COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /🎯.*COMPLETED.*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
  ];

  for (const pattern of agentPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1] && match[2]) {
      const agentType = match[1].toLowerCase();
      let message = match[2].trim();

      // Clean for speech
      message = cleanForSpeech(message);

      // Enhance with prosody
      message = enhanceProsody(message, agentType);

      // Format: "AgentName completed [message]"
      const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);

      // Don't prepend "completed" for greetings or questions
      const isGreeting = /^(hey|hello|hi|greetings)/i.test(message);
      const isQuestion = message.includes('?');

      const fullMessage = (isGreeting || isQuestion)
        ? message
        : `${agentName} completed ${message}`;

      return { message: fullMessage, agentType };
    }
  }

  // Fallback patterns
  const genericPatterns = [
    /🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/i,
    /COMPLETED:\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of genericPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1]) {
      let message = match[1].trim();
      message = cleanForSpeech(message);

      if (message.length > 5) {
        return { message, agentType: null };
      }
    }
  }

  return { message: null, agentType: null };
}

async function sendNotification(payload: NotificationPayload): Promise<void> {
  const serverUrl = process.env.PAI_VOICE_SERVER || 'http://localhost:8888/notify';

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Voice server error:', response.statusText);
    }
  } catch (error) {
    // Fail silently
  }
}

async function main() {
  let input = '';
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);
  } catch (e) {
    process.exit(0);
  }

  if (!input) {
    process.exit(0);
  }

  let transcriptPath: string;
  try {
    const parsed = JSON.parse(input);
    transcriptPath = parsed.transcript_path;
  } catch (e) {
    process.exit(0);
  }

  if (!transcriptPath) {
    process.exit(0);
  }

  // Find task result
  const { result: taskOutput, agentType } = await findTaskResult(transcriptPath);

  if (!taskOutput) {
    process.exit(0);
  }

  // Extract completion message
  const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);

  if (!completionMessage) {
    process.exit(0);
  }

  // Determine agent type
  const finalAgentType = extractedAgentType || agentType || 'default';

  // Get voice ID for this agent type
  const voiceId = getVoiceId(finalAgentType);

  // Send voice notification
  const agentName = finalAgentType.charAt(0).toUpperCase() + finalAgentType.slice(1);

  await sendNotification({
    title: agentName,
    message: completionMessage,
    voice_enabled: true,
    voice_id: voiceId
  });

  process.exit(0);
}

main().catch(console.error);
