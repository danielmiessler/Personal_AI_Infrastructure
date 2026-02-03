#!/usr/bin/env bun
/**
 * AgentOutputCapture.hook.ts - Capture Subagent Results (SubagentStop)
 *
 * PURPOSE:
 * Captures output from completed subagents (Task tool invocations) and persists
 * them to MEMORY/RESEARCH/ for future reference. Also sends push notifications
 * for background agents and observability events.
 *
 * TRIGGER: SubagentStop (fires when a Task tool subagent completes)
 *
 * INPUT:
 * - session_id: Parent session identifier
 * - transcript_path: Path to the transcript JSONL file
 *
 * OUTPUT:
 * - stdout: None (no context injection)
 * - exit(0): Normal completion
 *
 * SIDE EFFECTS:
 * - Writes to: MEMORY/RESEARCH/<YYYY-MM>/AGENT-<type>_*.md
 * - Writes to: hooks/subagent-stop-debug.log (debug mode)
 * - Sends: Observability event to dashboard server
 * - Sends: Push notification via ntfy for background agents
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None
 * - COORDINATES WITH: Observability dashboard (if running)
 * - MUST RUN BEFORE: None
 * - MUST RUN AFTER: Task tool completion
 *
 * ERROR HANDLING:
 * - Missing transcript: Exits gracefully (exit 0)
 * - Parse errors: Logged to debug file, exits gracefully
 * - External service failures: Silently ignored (fire-and-forget)
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <500ms
 * - Retry logic: 2 attempts with 200ms delay for transcript availability
 *
 * AGENT OUTPUT FORMAT:
 * Searches for completion messages in two formats:
 * - NEW: 🗣️ AgentName: [completion message]
 * - LEGACY: 🎯 COMPLETED: [AGENT:type] [message]
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { paiPath } from './lib/paths';
import { sendEventToObservability, getCurrentTimestamp, getSourceApp } from './lib/observability';
import { extractAgentInstanceId } from './lib/metadata-extraction';
import { notifyBackgroundAgent } from './lib/notifications';

/**
 * Get current timestamp in PST timezone
 * Format: YYYY-MM-DD HH:MM:SS PST
 */
function getPSTTimestamp(): string {
  const date = new Date();
  const pstDate = new Date(date.toLocaleString('en-US', { timeZone: process.env.TIME_ZONE || 'America/Los_Angeles' }));

  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');
  const hours = String(pstDate.getHours()).padStart(2, '0');
  const minutes = String(pstDate.getMinutes()).padStart(2, '0');
  const seconds = String(pstDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} PST`;
}

function getPSTDate(): string {
  const date = new Date();
  const pstDate = new Date(date.toLocaleString('en-US', { timeZone: process.env.TIME_ZONE || 'America/Los_Angeles' }));

  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findTaskResult(transcriptPath: string, maxAttempts: number = 2): Promise<{ result: string | null, agentType: string | null, description: string | null, toolInput: any | null }> {
  // Looking for Task result in transcript

  // If the provided transcript path doesn't exist, try to find the most recent agent transcript
  let actualTranscriptPath = transcriptPath;

  // PERFORMANCE FIX: Reduced from 6 attempts (10+ seconds) to 2 attempts (~500ms)
  // The transcript should already exist when SubagentStop fires
  // If it doesn't exist after a quick check, don't block - just exit gracefully
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Single short retry - 200ms is enough for filesystem sync
      await delay(200);
    }

    if (!existsSync(actualTranscriptPath)) {
      // Transcript file doesn't exist yet

      // Try to find agent transcript in the same directory
      const dir = require('path').dirname(transcriptPath);
      if (existsSync(dir)) {
        const { readdirSync, statSync } = require('fs');
        const files = readdirSync(dir)
          .filter((f: string) => f.startsWith('agent-') && f.endsWith('.jsonl'))
          .map((f: string) => ({ name: f, mtime: statSync(join(dir, f)).mtime }))
          .sort((a: any, b: any) => b.mtime - a.mtime);

        if (files.length > 0) {
          actualTranscriptPath = join(dir, files[0].name);
          // Found recent agent transcript
        }
      }

      if (!existsSync(actualTranscriptPath)) {
        continue;
      }
    }

    try {
      const transcript = readFileSync(actualTranscriptPath, 'utf-8');
      const lines = transcript.trim().split('\n');

      // Search from the end of the transcript backwards
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);

          // Look for assistant messages that contain Task tool_use
          if (entry.type === 'assistant' && entry.message?.content) {
            for (const content of entry.message.content) {
              if (content.type === 'tool_use' && content.name === 'Task') {
                const toolInput = content.input;
                const description = toolInput?.description || null;
                // Found Task invocation
                // Found a Task invocation, now look for its result
                // The result should be in a subsequent user message
                for (let j = i + 1; j < lines.length; j++) {
                  const resultEntry = JSON.parse(lines[j]);
                  if (resultEntry.type === 'user' && resultEntry.message?.content) {
                    for (const resultContent of resultEntry.message.content) {
                      if (resultContent.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                        // Found the matching Task result
                        // Content can be either a string or an array of objects with text
                        let taskOutput: string;
                        if (typeof resultContent.content === 'string') {
                          taskOutput = resultContent.content;
                        } else if (Array.isArray(resultContent.content)) {
                          // Extract text from array of content objects
                          taskOutput = resultContent.content
                            .filter((item: any) => item.type === 'text')
                            .map((item: any) => item.text)
                            .join('\n');
                        } else {
                          // Unexpected tool_result content type
                          continue;
                        }

                        // Extract agent type from the output
                        let agentType = 'default';
                        const agentMatch = taskOutput.match(/Sub-agent\s+(\w+)\s+completed/i);
                        if (agentMatch) {
                          agentType = agentMatch[1].toLowerCase();
                        }

                        return { result: taskOutput, agentType, description, toolInput };
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          // Invalid JSON line, skip
        }
      }
    } catch (e) {
      // Error reading file, will retry
    }
  }

  return { result: null, agentType: null, description: null, toolInput: null };
}

function extractCompletionMessage(taskOutput: string): { message: string | null, agentType: string | null } {
  // Debug extraction from task output

  // Look for the COMPLETED section in the agent's output
  // Priority: 1) New 🗣️ format, 2) Legacy [AGENT:type] format
  const agentPatterns = [
    // NEW FORMAT: 🗣️ AgentName: [text] (primary)
    // Captures agent name dynamically from the line
    /🗣️\s*\*{0,2}([\w-]+):?\*{0,2}\s*(.+?)(?:\n|$)/is,

    // LEGACY FORMAT: 🎯 COMPLETED: [AGENT:type] [text] (backward compatibility)
    // Handle markdown formatting with asterisks - same line
    /\*+🎯\s*COMPLETED:\*+\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /\*+🎯\s+COMPLETED:\*+\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    // Non-markdown patterns - same line
    /🎯\s*COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,

    // Multi-line patterns (emoji/COMPLETED on one line, AGENT tag on next)
    /🎯\s*COMPLETED[\s\n]+\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /##\s*🎯\s*COMPLETED[\s\n]+\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /\*+🎯\s*COMPLETED\*+[\s\n]+\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,

    // Generic pattern for current format
    /🎯.*COMPLETED.*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,

    // OLD: Handle legacy "I completed" format (for backward compatibility)
    /\*+🎯\s*COMPLETED:\*+\s*\[AGENT:(\w+[-\w]*)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /\*+🎯\s+COMPLETED:\*+\s*\[AGENT:(\w+[-\w]*)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /🎯\s*COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /\[AGENT:(\w+[-\w]*)\]\s*I\s+completed\s+(.+?)(?:\.|!|\n|$)/is,
    /🎯.*COMPLETED.*\[AGENT:(\w+[-\w]*)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is
  ];

  // First try to match agent-specific patterns
  for (const pattern of agentPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1] && match[2]) {
      const agentType = match[1].toLowerCase();
      let message = match[2].trim();

      // Prepend agent name for spoken message
      const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);

      // Intelligent "completed" detection
      // Don't say "completed" for greetings, questions, or status updates
      const isGreeting = /^(hey|hello|hi|greetings|good morning|good afternoon|good evening)/i.test(message);
      const isQuestion = message.includes('?');
      const isStatusUpdate = /(ready to help|online|here|available|standing by|doing (great|well|fine))/i.test(message);

      const fullMessage = (isGreeting || isQuestion || isStatusUpdate)
        ? message  // Just the message for greetings/questions/status
        : `${agentName} completed ${message}`;  // Prepend "completed" for tasks

      // Found agent match

      // Return agent type and message
      return { message: fullMessage, agentType };
    }
  }

  // Fall back to generic patterns but try to extract agent type
  const genericPatterns = [
    // NEW FORMAT: 🗣️ [text] (without specific name - fallback)
    /🗣️\s*(.+?)(?:\n|$)/i,
    // LEGACY FORMAT (backward compatibility)
    // Handle markdown formatting
    /\*+🎯\s*COMPLETED:\*+\s*(.+?)(?:\n|$)/i,
    /\*+COMPLETED:\*+\s*(.+?)(?:\n|$)/i,
    // Non-markdown patterns
    /🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/i,
    /COMPLETED:\s*(.+?)(?:\n|$)/i,
    /Sub-agent\s+\w+\s+completed\s+(.+?)(?:\.|!|\n|$)/i,
    /Agent\s+completed\s+(.+?)(?:\.|!|\n|$)/i
  ];

  for (const pattern of genericPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1]) {
      let message = match[1].trim();

      // Basic cleanup
      message = message.replace(/^(the\s+)?requested\s+task$/i, '');

      // Only return if it's not a generic message
      if (message &&
          !message.match(/^(the\s+)?requested\s+task$/i) &&
          !message.match(/^task$/i) &&
          message.length > 5) {

        // Try to detect agent type from context
        let agentType = null;
        const agentMatch = taskOutput.match(/Sub-agent\s+(\w+)\s+completed/i);
        if (agentMatch) {
          agentType = agentMatch[1].toLowerCase();
        }

        return { message, agentType };
      }
    }
  }

  return { message: null, agentType: null };
}

async function main() {
  const { appendFileSync } = require('fs');
  const { join } = require('path');
  const { homedir } = require('os');
  const debugLog = paiPath('hooks', 'subagent-stop-debug.log');

  function debug(msg: string) {
    const timestamp = new Date().toISOString();
    appendFileSync(debugLog, `[${timestamp}] ${msg}\n`);
    // No stderr output - write to debug log file only
  }

  debug('🔍 SubagentStop hook started');
  // Read input from stdin with timeout
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
    debug(`Failed to read input: ${e}`);
    process.exit(0);
  }
  
  if (!input) {
    debug('No input received');
    process.exit(0);
  }

  debug(`Input received: ${input.substring(0, 100)}...`);

  let transcriptPath: string;
  try {
    const parsed = JSON.parse(input);
    transcriptPath = parsed.transcript_path;
    debug(`Transcript path: ${transcriptPath}`);
  } catch (e) {
    debug(`Invalid input JSON: ${e}`);
    process.exit(0);
  }

  if (!transcriptPath) {
    debug('No transcript path provided');
    process.exit(0);
  }

  // Wait for and find the Task result
  debug('Starting findTaskResult...');
  const { result: taskOutput, agentType, description, toolInput } = await findTaskResult(transcriptPath);

  if (!taskOutput) {
    debug('No Task result found in transcript after waiting');
    process.exit(0);
  }

  debug(`Task output found, length: ${taskOutput.length}`);
  debug(`Task output preview: ${taskOutput.substring(Math.max(0, taskOutput.length - 300))}`);

  // Extract agent instance metadata from Task tool input
  const instanceMetadata = extractAgentInstanceId(toolInput, description);
  debug(`Instance metadata: ${JSON.stringify(instanceMetadata)}`);

  // Extract the completion message and agent type
  const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);

  if (!completionMessage) {
    debug('No specific completion message found in Task output');
    debug(`Full task output for debugging: ${taskOutput}`);
    process.exit(0);
  }

  debug(`Completion message: ${completionMessage}`);

  // Use extracted agent type if available, otherwise use the one from task analysis
  const finalAgentType = extractedAgentType || agentType || instanceMetadata.agent_type || 'default';
  debug(`Final agent type: ${finalAgentType}`);

  // NOTE: Voice notifications are now handled by agents themselves
  // The hook only logs completion messages and captures to history
  const agentName = finalAgentType.charAt(0).toUpperCase() + finalAgentType.slice(1);
  debug(`📝 Agent completed: [${agentName}] ${completionMessage}`);

  // Capture agent output to RESEARCH directory
  try {
    await captureAgentOutput(finalAgentType, completionMessage, taskOutput, transcriptPath);
  } catch (e) {
    // Failed to capture agent output - non-critical
  }

  // Send push notification for background agents
  // Check if this was a background agent (run_in_background: true)
  const isBackground = toolInput?.run_in_background === true;
  if (isBackground) {
    debug(`📱 Sending push notification for background agent: ${finalAgentType}`);
    notifyBackgroundAgent(finalAgentType, completionMessage).catch(() => {
      // Fire and forget
    });
  }

  // Send event to observability dashboard with instance metadata
  try {
    const parsed = JSON.parse(input);
    const event: any = {
      source_app: getSourceApp(),
      session_id: parsed.session_id,
      hook_event_type: 'SubagentStop',
      timestamp: getCurrentTimestamp(),
      transcript_path: transcriptPath,
      agent_type: finalAgentType,
      summary: completionMessage,
    };

    // Add instance metadata if available
    if (instanceMetadata.agent_instance_id) {
      event.agent_instance_id = instanceMetadata.agent_instance_id;
    }
    if (instanceMetadata.instance_number !== undefined) {
      event.instance_number = instanceMetadata.instance_number;
    }
    if (instanceMetadata.parent_session_id) {
      event.parent_session_id = instanceMetadata.parent_session_id;
    }
    if (instanceMetadata.parent_task_id) {
      event.parent_task_id = instanceMetadata.parent_task_id;
    }

    await sendEventToObservability(event);
  } catch (e) {
    // Silently fail - dashboard may not be running
  }
}

// UOCS: Capture agent output to history directory
async function captureAgentOutput(
  agentType: string,
  completionMessage: string,
  taskOutput: string,
  transcriptPath: string
) {
  const { writeFileSync, mkdirSync, existsSync } = require('fs');
  const { join } = require('path');
  const { homedir } = require('os');

  const MEMORY_DIR = paiPath('MEMORY');

  // Generate timestamp for filename (PST)
  const pstTimestamp = getPSTTimestamp();
  const timestamp = pstTimestamp
    .replace(/ PST$/, '')
    .replace(/:/g, '')
    .replace(/ /, '-'); // YYYY-MM-DD-HHMMSS

  const yearMonth = timestamp.substring(0, 7); // YYYY-MM

  // Infer capture type from agent type
  // All agent outputs go to RESEARCH for simplicity (consolidated structure)
  let captureType = 'RESEARCH';
  const category = 'RESEARCH';

  if (agentType === 'researcher' || agentType.includes('researcher')) {
    captureType = 'RESEARCH';
  } else if (agentType === 'architect') {
    captureType = 'DECISION';
  } else if (agentType === 'engineer') {
    captureType = 'IMPLEMENTATION';
  } else if (agentType === 'designer') {
    captureType = 'DESIGN';
  } else if (agentType === 'pentester') {
    captureType = 'SECURITY';
  } else if (agentType === 'intern') {
    captureType = 'RESEARCH';
  }

  // Generate description from completion message (kebab-case, max 60 chars)
  const description = completionMessage
    .toLowerCase()
    .replace(/^(architect|engineer|designer|researcher|pentester|intern)\s+completed\s+/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);

  // Generate filename
  const filename = `${timestamp}_AGENT-${agentType}_${captureType}_${description}.md`;

  // Ensure directory exists
  const outputDir = join(MEMORY_DIR, category, yearMonth);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Format document
  const fullTimestamp = getPSTTimestamp();
  const document = `---
capture_type: ${captureType}
timestamp: ${fullTimestamp}
executor: ${agentType}
agent_completion: ${completionMessage}
---

# ${captureType}: ${completionMessage}

**Agent:** ${agentType}
**Completed:** ${timestamp.replace(/-/g, ':').substring(0, 19)}

---

## Agent Output

${taskOutput}

---

## Metadata

**Transcript:** \`${transcriptPath}\`
**Captured:** ${fullTimestamp}

---

*This output was automatically captured by UOCS SubagentStop hook.*
`;

  // Write file
  const filePath = join(outputDir, filename);
  writeFileSync(filePath, document);

  console.log(`📝 UOCS: Captured agent output to ${category}/${yearMonth}/${filename}`);
}

main().catch(() => { /* silent fail */ });