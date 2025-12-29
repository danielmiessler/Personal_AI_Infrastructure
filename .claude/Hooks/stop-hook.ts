#!/usr/bin/env bun

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Generate 4-word tab title summarizing what was done
 */
function generateTabTitle(prompt: string, completedLine?: string): string {
  // If we have a completed line, try to use it for a better summary
  if (completedLine) {
    const cleanCompleted = completedLine
      .replace(/\*+/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/🎯\s*COMPLETED:\s*/gi, '')
      .trim();

    // Extract meaningful words from the completed line
    const completedWords = cleanCompleted.split(/\s+/)
      .filter(word => word.length > 2 &&
        !['the', 'and', 'but', 'for', 'are', 'with', 'his', 'her', 'this', 'that', 'you', 'can', 'will', 'have', 'been', 'your', 'from', 'they', 'were', 'said', 'what', 'them', 'just', 'told', 'how', 'does', 'into', 'about', 'completed'].includes(word.toLowerCase()))
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

    if (completedWords.length >= 2) {
      // Build a 4-word summary from completed line
      const summary = completedWords.slice(0, 4);
      while (summary.length < 4) {
        summary.push('Done');
      }
      return summary.slice(0, 4).join(' ');
    }
  }

  // Fall back to parsing the prompt
  const cleanPrompt = prompt.replace(/[^\w\s]/g, ' ').trim();
  const words = cleanPrompt.split(/\s+/).filter(word =>
    word.length > 2 &&
    !['the', 'and', 'but', 'for', 'are', 'with', 'his', 'her', 'this', 'that', 'you', 'can', 'will', 'have', 'been', 'your', 'from', 'they', 'were', 'said', 'what', 'them', 'just', 'told', 'how', 'does', 'into', 'about'].includes(word.toLowerCase())
  );

  const lowerPrompt = prompt.toLowerCase();

  // Find action verb if present
  const actionVerbs = ['test', 'rename', 'fix', 'debug', 'research', 'write', 'create', 'make', 'build', 'implement', 'analyze', 'review', 'update', 'modify', 'generate', 'develop', 'design', 'deploy', 'configure', 'setup', 'install', 'remove', 'delete', 'add', 'check', 'verify', 'validate', 'optimize', 'refactor', 'enhance', 'improve', 'send', 'email', 'help', 'updated', 'fixed', 'created', 'built', 'added'];

  let titleWords = [];

  // Check for action verb
  for (const verb of actionVerbs) {
    if (lowerPrompt.includes(verb)) {
      // Convert to past tense for summary
      let pastTense = verb;
      if (verb === 'write') pastTense = 'Wrote';
      else if (verb === 'make') pastTense = 'Made';
      else if (verb === 'send') pastTense = 'Sent';
      else if (verb.endsWith('e')) pastTense = verb.charAt(0).toUpperCase() + verb.slice(1, -1) + 'ed';
      else pastTense = verb.charAt(0).toUpperCase() + verb.slice(1) + 'ed';

      titleWords.push(pastTense);
      break;
    }
  }

  // Add most meaningful remaining words
  const remainingWords = words
    .filter(word => !actionVerbs.includes(word.toLowerCase()))
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  // Fill up to 4 words total
  for (const word of remainingWords) {
    if (titleWords.length < 4) {
      titleWords.push(word);
    } else {
      break;
    }
  }

  // If we don't have enough words, add generic ones
  if (titleWords.length === 0) {
    titleWords.push('Completed');
  }
  if (titleWords.length === 1) {
    titleWords.push('Task');
  }
  if (titleWords.length === 2) {
    titleWords.push('Successfully');
  }
  if (titleWords.length === 3) {
    titleWords.push('Done');
  }

  return titleWords.slice(0, 4).join(' ');
}

/**
 * Set terminal tab title (works with Kitty, Ghostty, iTerm2, etc.)
 */
function setTerminalTabTitle(title: string): void {
  // Get terminal type
  const term = process.env.TERM || '';

  // Send to stderr to bypass potential output filtering

  if (term.includes('ghostty')) {
    // Ghostty-specific sequences
    // Ghostty uses standard xterm sequences but may need different approach
    process.stderr.write(`\x1b]2;${title}\x07`);  // Window title
    process.stderr.write(`\x1b]0;${title}\x07`);  // Icon and window title

    // Try OSC 7 for Ghostty tab titles (some terminals use this)
    process.stderr.write(`\x1b]7;${title}\x07`);

    // Also try the standard xterm way with ST terminator
    process.stderr.write(`\x1b]2;${title}\x1b\\`);
  } else if (term.includes('kitty')) {
    // Kitty-specific sequences
    process.stderr.write(`\x1b]0;${title}\x07`);
    process.stderr.write(`\x1b]2;${title}\x07`);
    process.stderr.write(`\x1b]30;${title}\x07`);  // Kitty-specific
  } else {
    // Generic sequences for other terminals
    process.stderr.write(`\x1b]0;${title}\x07`);  // Icon and window
    process.stderr.write(`\x1b]2;${title}\x07`);  // Window title
  }

  // Flush stderr to ensure immediate output
  if (process.stderr.isTTY) {
    process.stderr.write('');
  }
}

// Settings configuration interface
interface SettingsConfig {
  env?: {
    DA?: string;
    DA_VOICE_ID?: string;
    PAI_DIR?: string;
  };
}

// Load voice configuration from voices.json
interface VoiceConfig {
  voice_name: string;
  rate_wpm: number;
  rate_multiplier: number;
  description: string;
  type: string;
}

interface VoicesConfig {
  default_rate: number;
  voices: Record<string, VoiceConfig>;
}

// Helper to safely turn Claude content (string or array of blocks) into plain text
function contentToText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c?.text) return c.text;
        if (c?.content) return String(c.content);
        return '';
      })
      .join(' ')
      .trim();
  }
  return '';
}

// Load settings.json to get DA name and voice ID
let daName = 'PAI';
let daVoiceId: string | null = null;
let paiDir = join(homedir(), '.claude');

try {
  const settingsPath = join(paiDir, 'settings.json');
  const settings: SettingsConfig = JSON.parse(readFileSync(settingsPath, 'utf-8'));

  // Get DA name from settings (e.g., "PAI", "Kai", "Nova")
  if (settings.env?.DA) {
    daName = settings.env.DA;
  }

  // Get DA voice ID from settings
  if (settings.env?.DA_VOICE_ID) {
    daVoiceId = settings.env.DA_VOICE_ID;
  }

  // Get PAI_DIR if set
  if (settings.env?.PAI_DIR) {
    paiDir = settings.env.PAI_DIR.replace('__HOME__', homedir());
  }
} catch (e) {
  // Fallback to default values if settings.json is unavailable
  console.error('⚠️ Could not load settings.json, using default values');
}

// Load voices configuration from PAI_DIR/voice-server/voices.json
let VOICE_CONFIG: VoicesConfig;
try {
  const voicesPath = join(paiDir, 'voice-server', 'voices.json');
  VOICE_CONFIG = JSON.parse(readFileSync(voicesPath, 'utf-8'));
} catch (e) {
  // Fallback to hardcoded config if file doesn't exist
  console.error('⚠️ Could not load voices.json, using fallback config');
  VOICE_CONFIG = {
    default_rate: 175,
    voices: {
      main: { voice_name: "Jamie (Premium)", rate_wpm: 263, rate_multiplier: 1.5, description: "UK Male", type: "Premium" },
      researcher: { voice_name: "Ava (Premium)", rate_wpm: 236, rate_multiplier: 1.35, description: "US Female", type: "Premium" },
      engineer: { voice_name: "Tom (Enhanced)", rate_wpm: 236, rate_multiplier: 1.35, description: "US Male", type: "Enhanced" },
      architect: { voice_name: "Serena (Premium)", rate_wpm: 236, rate_multiplier: 1.35, description: "UK Female", type: "Premium" },
      designer: { voice_name: "Isha (Premium)", rate_wpm: 236, rate_multiplier: 1.35, description: "Indian Female", type: "Premium" },
      pentester: { voice_name: "Oliver (Enhanced)", rate_wpm: 236, rate_multiplier: 1.35, description: "UK Male", type: "Enhanced" },
      writer: { voice_name: "Samantha (Enhanced)", rate_wpm: 236, rate_multiplier: 1.35, description: "US Female", type: "Enhanced" }
    }
  };
}

// Intelligent response generator - prioritizes custom COMPLETED messages
function generateIntelligentResponse(userQuery: string, assistantResponse: string, completedLine: string): string {
  // Clean the completed line
  const cleanCompleted = completedLine
    .replace(/\*+/g, '')
    .replace(/\[AGENT:\w+\]\s*/i, '')
    .trim();

  // If the completed line has meaningful custom content (not generic), use it
  const genericPhrases = [
    'completed successfully',
    'task completed',
    'done successfully',
    'finished successfully',
    'completed the task',
    'completed your request'
  ];

  const isGenericCompleted = genericPhrases.some(phrase =>
    cleanCompleted.toLowerCase() === phrase ||
    cleanCompleted.toLowerCase() === `${phrase}.`
  );

  // If we have a custom, non-generic completed message, prefer it
  if (!isGenericCompleted && cleanCompleted.length > 10) {
    return cleanCompleted;
  }

  // Extract key information from the full response
  const responseLC = assistantResponse.toLowerCase();
  const queryLC = userQuery.toLowerCase();

  // Only apply shortcuts for very specific simple cases

  // Simple thanks acknowledgment - high priority
  if (queryLC.match(/^(thank|thanks|awesome|great|good job|well done)[\s!?.]*$/i)) {
    return "You're welcome!";
  }

  // Simple math calculations - ONLY if it's just a calculation
  if (queryLC.match(/^\s*\d+\s*[\+\-\*\/]\s*\d+\s*\??$/)) {
    const resultMatch = assistantResponse.match(/=\s*(-?\d+(?:\.\d+)?)|(?:equals?|is)\s+(-?\d+(?:\.\d+)?)/i);
    if (resultMatch) {
      return resultMatch[1] || resultMatch[2];
    }
  }

  // Very simple yes/no - ONLY if the query is extremely simple
  if (queryLC.match(/^(is|are|was|were)\s+\w+\s+\w+\??$/i)) {
    if (cleanCompleted.toLowerCase() === 'yes' || cleanCompleted.toLowerCase() === 'no') {
      return cleanCompleted;
    }
  }

  // Simple time query - ONLY if asking for just the time
  if (queryLC.match(/^what\s+time\s+is\s+it\??$/i)) {
    const timeMatch = assistantResponse.match(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?/i);
    if (timeMatch) {
      return timeMatch[0];
    }
  }

  // For all other cases, use the actual completed message
  // This ensures custom messages are preserved
  return cleanCompleted;
}

async function main() {
  // Log that hook was triggered
  const timestamp = new Date().toISOString();
  console.error(`\n🎬 STOP-HOOK TRIGGERED AT ${timestamp}`);

  // Get input
  let input = '';
  const decoder = new TextDecoder();
  const reader = Bun.stdin.stream().getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      input += decoder.decode(value, { stream: true });
    }
  } catch (e) {
    console.error(`❌ Error reading input: ${e}`);
    process.exit(0);
  }

  if (!input) {
    console.error('❌ No input received');
    process.exit(0);
  }

  let transcriptPath;
  try {
    const parsed = JSON.parse(input);
    transcriptPath = parsed.transcript_path;
    console.error(`📁 Transcript path: ${transcriptPath}`);
  } catch (e) {
    console.error(`❌ Error parsing input JSON: ${e}`);
    process.exit(0);
  }

  if (!transcriptPath) {
    console.error('❌ No transcript_path in input');
    process.exit(0);
  }

  // Read the transcript
  let transcript;
  try {
    transcript = readFileSync(transcriptPath, 'utf-8');
    console.error(`📜 Transcript loaded: ${transcript.split('\n').length} lines`);
  } catch (e) {
    console.error(`❌ Error reading transcript: ${e}`);
    process.exit(0);
  }

  // Parse the JSON lines to find what happened in this session
  const lines = transcript.trim().split('\n');

  // Get the last user query for context
  let lastUserQuery = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);
      if (entry.type === 'user' && entry.message?.content) {
        // Extract text from user message
        const content = entry.message.content;
        if (typeof content === 'string') {
          lastUserQuery = content;
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'text' && item.text) {
              lastUserQuery = item.text;
              break;
            }
          }
        }
        if (lastUserQuery) break;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // First, check if the LAST assistant message contains a Task tool or a COMPLETED line
  let isAgentTask = false;
  let taskResult = '';
  let agentType = '';

  // Find the last assistant message
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);

      if (entry.type === 'assistant' && entry.message?.content) {
        // Check if this assistant message contains a Task tool_use
        let foundTask = false;
        const contentArray = Array.isArray(entry.message.content) ? entry.message.content : [entry.message.content];
        for (const content of contentArray) {
          if (content?.type === 'tool_use' && content.name === 'Task') {
            // This is an agent task - find its result
            foundTask = true;
            agentType = content.input?.subagent_type || '';

            // Find the corresponding tool_result
            for (let j = i + 1; j < lines.length; j++) {
              const resultEntry = JSON.parse(lines[j]);
              if (resultEntry.type === 'user' && resultEntry.message?.content) {
                const resultContentArray = Array.isArray(resultEntry.message.content)
                  ? resultEntry.message.content
                  : [resultEntry.message.content];
                for (const resultContent of resultContentArray) {
                  if (resultContent?.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                    taskResult = contentToText(resultContent.content);
                    isAgentTask = true;
                    break;
                  }
                }
              }
              if (taskResult) break;
            }
            break;
          }
        }

        // We found the last assistant message, stop looking
        break;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // Generate the announcement
  let message = '';
  let voiceConfig = VOICE_CONFIG.voices.main; // Default to main voice config
  let kaiHasCustomCompleted = false;

  // ALWAYS check Kai's response FIRST (even when agents are used)
  const lastResponse = lines[lines.length - 1];
  try {
    const entry = JSON.parse(lastResponse);
    if (entry.type === 'assistant' && entry.message?.content) {
      const content = contentToText(entry.message.content);

      // First, look for CUSTOM COMPLETED line (voice-optimized)
      const customCompletedMatch = content.match(/🗣️\s*CUSTOM\s+COMPLETED:\s*(.+?)(?:\n|$)/im);

      if (customCompletedMatch) {
        // Get the custom voice response
        let customText = customCompletedMatch[1].trim()
          .replace(/\[.*?\]/g, '') // Remove bracketed text like [Optional: ...]
          .replace(/\*+/g, '') // Remove asterisks
          .trim();

        // Use custom completed if it's under 8 words
        const wordCount = customText.split(/\s+/).length;
        if (customText && wordCount <= 8) {
          message = customText;
          kaiHasCustomCompleted = true;
          console.error(`🗣️ MAIN CUSTOM VOICE: ${message}`);
        } else {
          // Custom completed too long, fall back to regular COMPLETED
          const completedMatch = content.match(/🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/im);
          if (completedMatch) {
            let completedText = completedMatch[1].trim();
            message = generateIntelligentResponse(lastUserQuery, content, completedText);
            console.error(`🎯 MAIN FALLBACK (custom too long): ${message}`);
          }
        }
      } else if (!isAgentTask) {
        // No CUSTOM COMPLETED and no agent - look for regular COMPLETED line
        const completedMatch = content.match(/🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/im);

        if (completedMatch) {
          // Get the raw text after the colon
          let completedText = completedMatch[1].trim();

          // Generate intelligent response
          message = generateIntelligentResponse(lastUserQuery, content, completedText);

          console.error(`🎯 MAIN INTELLIGENT: ${message}`);
        } else {
          // No COMPLETED line found - don't send anything
          console.error('⚠️ No COMPLETED line found');
        }
      }
    }
  } catch (e) {
    console.error('⚠️ Error parsing assistant response:', e);
  }

  // If Kai didn't provide a CUSTOM COMPLETED and an agent was used, check agent's response
  if (!message && isAgentTask && taskResult) {
    // First, try to find CUSTOM COMPLETED line in agent response
    const customCompletedMatch = taskResult.match(/🗣️\s*CUSTOM\s+COMPLETED:\s*(.+?)(?:\n|$)/im);

    if (customCompletedMatch) {
      // Get the custom voice response
      let customText = customCompletedMatch[1].trim()
        .replace(/\[.*?\]/g, '') // Remove bracketed text
        .replace(/\*+/g, '') // Remove asterisks
        .replace(/\[AGENT:\w+\]\s*/i, '') // Remove agent tags
        .trim();

      // Use custom completed if it's under 8 words
      const wordCount = customText.split(/\s+/).length;
      if (customText && wordCount <= 8) {
        message = customText;
        voiceConfig = VOICE_CONFIG.voices[agentType.toLowerCase()] || VOICE_CONFIG.voices.main;
        console.error(`🗣️ AGENT CUSTOM VOICE (fallback): ${message}`);
      } else {
        // Custom completed too long, fall back to regular COMPLETED
        const completedMatch = taskResult.match(/🎯\s*COMPLETED:\s*(.+?)$/im);
        if (completedMatch) {
          let completedText = completedMatch[1].trim()
            .replace(/\*+/g, '')
            .replace(/\[AGENT:\w+\]\s*/i, '')
            .trim();
          message = generateIntelligentResponse(lastUserQuery, taskResult, completedText);
          voiceConfig = VOICE_CONFIG.voices[agentType.toLowerCase()] || VOICE_CONFIG.voices.main;
          console.error(`🎯 AGENT FALLBACK (custom too long): ${message}`);
        }
      }
    } else {
      // No CUSTOM COMPLETED, look for regular COMPLETED line
      const completedMatch = taskResult.match(/🎯\s*COMPLETED:\s*(.+?)$/im);

      if (completedMatch) {
        // Get exactly what the agent said after COMPLETED:
        let completedText = completedMatch[1].trim();

        // Remove markdown formatting
        completedText = completedText
          .replace(/\*+/g, '')  // Remove asterisks
          .replace(/\[AGENT:\w+\]\s*/i, '') // Remove agent tags
          .trim();

        // Generate intelligent response for agent tasks
        message = generateIntelligentResponse(lastUserQuery, taskResult, completedText);
        voiceConfig = VOICE_CONFIG.voices[agentType.toLowerCase()] || VOICE_CONFIG.voices.main;

        console.error(`🎯 AGENT INTELLIGENT (fallback): ${message}`);
      }
    }
  }

  // Get voice server port from settings.json
  let voiceServerPort = 8888; // Default
  try {
    const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
    const settingsPath = join(paiDir, 'settings.json');
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.env?.VOICE_SERVER_PORT) {
        voiceServerPort = parseInt(settings.env.VOICE_SERVER_PORT);
      }
    }
  } catch {}

  // FIRST: Send voice notification if we have a message
  if (message) {
    // Use DA_VOICE_ID from settings.json (loaded at startup)
    const voiceId = daVoiceId || 'cgSgspJ2msm6clMCkdW9'; // Fallback to default Jessica voice
    const priority = 'low';
    // Send to voice server
    await fetch(`http://localhost:${voiceServerPort}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${daName} Completion`,
        message,
        voice_enabled: true,
        priority,
        voice_id: voiceId,
        // keep legacy fields for compatibility with voice server configs that use names/rates
        voice_name: voiceConfig.voice_name,
        rate: voiceConfig.rate_wpm
      })
    }).catch(() => {});
    console.error(`🔊 Voice notification sent: "${message}" with voice ID: ${voiceId}`);
  }

  // ALWAYS set tab title to override any previous titles (like "dynamic requirements")
  // Generate a meaningful title even if we don't have a voice message
  let tabTitle = message || '';

  // If we don't have a message, generate a title from the last user query or completed task
  if (!tabTitle && lastUserQuery) {
    // Try to extract a completed line from the last assistant response
    try {
      const lastResponse = lines[lines.length - 1];
      const entry = JSON.parse(lastResponse);
      if (entry.type === 'assistant' && entry.message?.content) {
        const content = contentToText(entry.message.content);
        const completedMatch = content.match(/🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/im);
        if (completedMatch) {
          tabTitle = completedMatch[1].trim()
            .replace(/\*+/g, '')
            .replace(/\[.*?\]/g, '')
            .trim();
        }
      }
    } catch (e) {}

    // Fall back to generating a title from the user query
    if (!tabTitle) {
      tabTitle = generateTabTitle(lastUserQuery, '');
    }
  }

  // Set tab title to override "dynamic requirements" or any other previous title
  if (tabTitle) {
    try {
      // Escape single quotes in the message to prevent shell injection
      const escapedTitle = tabTitle.replace(/'/g, "'\\''");

      // Use printf command to set the tab title - this works in Kitty
      const { execSync } = await import('child_process');
      execSync(`printf '\\033]0;${escapedTitle}\\007' >&2`);
      execSync(`printf '\\033]2;${escapedTitle}\\007' >&2`);
      execSync(`printf '\\033]30;${escapedTitle}\\007' >&2`);

      console.error(`\n🏷️ Tab title set to: "${tabTitle}"`);
    } catch (e) {
      console.error(`❌ Failed to set tab title: ${e}`);
    }
  }

  console.error(`📝 User query: ${lastUserQuery || 'No query found'}`);
  console.error(`✅ Message: ${message || 'No completion message'}`)

  // Final tab title override as the very last action - use the actual completion message
  if (message) {
    // Use the actual completion message as the tab title
    const finalTabTitle = message.slice(0, 50); // Limit to 50 chars for tab title
    process.stderr.write(`\033]2;${finalTabTitle}\007`);
  }

  console.error(`🎬 STOP-HOOK COMPLETED SUCCESSFULLY at ${new Date().toISOString()}\n`);
}

main().catch(() => {});
