#!/usr/bin/env bun

import { readFileSync, existsSync } from 'fs';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findTaskResult(transcriptPath: string, maxAttempts: number = 10): Promise<{ result: string | null, agentType: string | null }> {
  console.error(`📂 Looking for Task result in transcript: ${transcriptPath}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Wait progressively longer between attempts
      await delay(100 * attempt);
    }

    if (!existsSync(transcriptPath)) {
      console.error(`❌ Transcript file doesn't exist yet (attempt ${attempt + 1}/${maxAttempts})`);
      continue;
    }

    try {
      const transcript = readFileSync(transcriptPath, 'utf-8');
      const lines = transcript.trim().split('\n');
      
      // Search from the end of the transcript backwards
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          
          // Look for assistant messages that contain Task tool_use
          if (entry.type === 'assistant' && entry.message?.content) {
            for (const content of entry.message.content) {
              if (content.type === 'tool_use' && content.name === 'Task') {
                console.error(`✅ Found Task invocation with subagent: ${content.input?.subagent_type}`);
                // Found a Task invocation, now look for its result
                // The result should be in a subsequent user message
                for (let j = i + 1; j < lines.length; j++) {
                  const resultEntry = JSON.parse(lines[j]);
                  if (resultEntry.type === 'user' && resultEntry.message?.content) {
                    for (const resultContent of resultEntry.message.content) {
                      if (resultContent.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                        // Found the matching Task result
                        const taskOutput = resultContent.content;
                        
                        // Extract agent type from the output
                        let agentType = 'default';
                        const agentMatch = taskOutput.match(/Sub-agent\s+(\w+)\s+completed/i);
                        if (agentMatch) {
                          agentType = agentMatch[1].toLowerCase();
                        }
                        
                        return { result: taskOutput, agentType };
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
  
  return { result: null, agentType: null };
}

function extractCompletionMessage(taskOutput: string): { message: string | null, agentType: string | null } {
  console.error('🔍 DEBUG - Extracting from task output, length:', taskOutput.length);
  console.error('🔍 DEBUG - First 200 chars:', taskOutput.substring(0, 200));
  console.error('🔍 DEBUG - Last 200 chars:', taskOutput.substring(taskOutput.length - 200));

  // First, check for CUSTOM COMPLETED line (voice-optimized) - with or without emoji
  const customCompletedMatch = taskOutput.match(/(?:🗣️\s*)?(?:\*+)?CUSTOM\s+COMPLETED:\s*(?:\*+)?\s*(.+?)(?:\n|$)/im);

  if (customCompletedMatch) {
    // Get the custom voice response
    let customText = customCompletedMatch[1].trim()
      .replace(/\[.*?\]/g, '') // Remove bracketed text like [Optional: ...]
      .replace(/\*+/g, '') // Remove asterisks
      .trim();

    // Use custom completed if it's under 8 words
    const wordCount = customText.split(/\s+/).length;
    if (customText && wordCount <= 8) {
      // Try to extract agent type from the full output
      let agentType = null;

      // Look for agent type in various formats
      const agentTypePatterns = [
        /\[AGENT:(\w+)\]/i,
        /Sub-agent\s+(\w+)\s+completed/i,
        /(\w+)\s+Agent\s+completed/i,
        /🎯\s*COMPLETED:\s*\[AGENT:(\w+)\]/i
      ];

      for (const pattern of agentTypePatterns) {
        const match = taskOutput.match(pattern);
        if (match) {
          agentType = match[1].toLowerCase();
          break;
        }
      }

      console.error(`🗣️ FOUND CUSTOM COMPLETED: ${customText} [Agent: ${agentType || 'unknown'}]`);

      // Don't prepend agent name if custom text already sounds complete
      return { message: customText, agentType };
    }
  }

  // Look for the COMPLETED section in the agent's output
  // Priority is given to [AGENT:type] format
  const agentPatterns = [
    // Handle markdown formatting with asterisks
    /\*+🎯\s*COMPLETED:\*+\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /\*+🎯\s+COMPLETED:\*+\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    // Non-markdown patterns
    /🎯\s*COMPLETED:\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /COMPLETED:\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\.|!|\n|$)/is,
    // Generic pattern for current format
    /🎯.*COMPLETED.*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is
  ];

  // First try to match agent-specific patterns
  for (const pattern of agentPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1] && match[2]) {
      const agentType = match[1].toLowerCase();
      let message = match[2].trim();

      // Clean up the message
      message = message.replace(/\*+/g, '');
      message = message.replace(/\s+/g, ' ');

      // Prepend agent name for spoken message
      const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);
      const fullMessage = `${agentName} completed ${message}`;

      console.error(`✅ FOUND AGENT MATCH: [${agentType}] ${fullMessage}`);

      // Return agent type and message
      return { message: fullMessage, agentType };
    }
  }

  // Fall back to generic patterns but try to extract agent type
  const genericPatterns = [
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

      // Clean up the message
      message = message.replace(/^(the\s+)?requested\s+task$/i, '');
      message = message.replace(/\*+/g, '');
      message = message.replace(/\s+/g, ' ');

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
  console.error('🔍 SubagentStop hook started');
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
    console.error('Failed to read input:', e);
    process.exit(0);
  }
  
  if (!input) {
    console.log('No input received');
    process.exit(0);
  }
  
  let transcriptPath: string;
  try {
    const parsed = JSON.parse(input);
    transcriptPath = parsed.transcript_path;
  } catch (e) {
    console.error('Invalid input JSON:', e);
    process.exit(0);
  }
  
  if (!transcriptPath) {
    console.log('No transcript path provided');
    process.exit(0);
  }
  
  // Wait for and find the Task result
  const { result: taskOutput, agentType } = await findTaskResult(transcriptPath);
  
  if (!taskOutput) {
    console.log('No Task result found in transcript after waiting');
    process.exit(0);
  }
  
  // Extract the completion message and agent type
  const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);
  
  if (!completionMessage) {
    console.log('No specific completion message found in Task output');
    process.exit(0);
  }
  
  // Use extracted agent type if available, otherwise use the one from task analysis
  const finalAgentType = extractedAgentType || agentType || 'default';
  
  // Prepare the notification
  const fullMessage = completionMessage; // Message is already prepared with agent name
  const agentName = finalAgentType.charAt(0).toUpperCase() + finalAgentType.slice(1);
  
  // Send to notification server
  try {
    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${agentName} Agent`,
        message: fullMessage,
        voice_enabled: true,
        agent: finalAgentType
      })
    });

    console.log(`✅ Sent: [${agentName}] ${fullMessage}`);
  } catch (e) {
    console.error('Failed to send notification:', e);
  }
}

main().catch(console.error);