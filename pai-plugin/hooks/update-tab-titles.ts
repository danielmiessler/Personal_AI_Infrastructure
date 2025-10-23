#!/usr/bin/env bun
/**
 * Tab Title Update Hook
 * Updates tab title based on user prompt
 *
 * Note: All context loading handled by PAI skill system (core identity in skill description, full context in SKILL.md)
 */

import { execSync } from 'child_process';

interface HookInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
  hook_event_name: string;
}

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => {
      reject(new Error('Timeout reading from stdin'));
    }, timeout);

    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
    });

    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });

    process.stdin.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  try {
    // Read the hook input from stdin
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);

    const prompt = data.prompt || '';

    // UPDATE TAB TITLE
    // Generate quick fallback tab title
    let tabTitle = 'Processing request...';
    if (prompt) {
      const words = prompt.replace(/[^\w\s]/g, ' ').trim().split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'but', 'for', 'are', 'with', 'you', 'can'].includes(w.toLowerCase()))
        .slice(0, 3);

      if (words.length > 0) {
        tabTitle = words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        if (words.length > 1) {
          tabTitle += ' ' + words.slice(1).map(w => w.toLowerCase()).join(' ');
        }
        tabTitle += '...';
      }
    }

    // Set initial tab title with recycle emoji
    try {
      const titleWithEmoji = '♻️ ' + tabTitle;
      const escapedTitle = titleWithEmoji.replace(/'/g, "'\\''");
      execSync(`printf '\\033]0;${escapedTitle}\\007' >&2`);
      execSync(`printf '\\033]2;${escapedTitle}\\007' >&2`);
      execSync(`printf '\\033]30;${escapedTitle}\\007' >&2`);
    } catch (e) {
      // Silently fail
    }

    // Launch background process for better Haiku summary
    try {
      if (prompt && prompt.length > 3) {
        const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
        if (pluginRoot) {
          Bun.spawn(['bun', `${pluginRoot}/hooks/update-tab-title.ts`, prompt], {
            stdout: 'ignore',
            stderr: 'ignore',
            stdin: 'ignore'
          });
        }
      }
    } catch (e) {
      // Silently fail
    }

    process.exit(0);
  } catch (error) {
    // Silently fail to not interrupt Claude's flow
    console.error('Tab title update error:', error);
    process.exit(0);
  }
}

main();
