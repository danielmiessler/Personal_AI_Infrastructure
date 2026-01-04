#!/usr/bin/env bun
// $PAI_DIR/hooks/stop-hook.ts
// Captures main agent work summaries and learnings

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface StopPayload {
  stop_hook_active: boolean;
  transcript_path?: string;
  response?: string;
  session_id?: string;
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

function hasLearningIndicators(text: string): boolean {
  const indicators = [
    'problem', 'solved', 'discovered', 'fixed', 'learned', 'realized',
    'figured out', 'root cause', 'debugging', 'issue was', 'turned out',
    'mistake', 'error', 'bug', 'solution'
  ];
  const lowerText = text.toLowerCase();
  const matches = indicators.filter(i => lowerText.includes(i));
  return matches.length >= 2;
}

function extractSummary(response: string): string {
  // Look for COMPLETED section
  const completedMatch = response.match(/🎯\s*COMPLETED[:\s]*(.+?)(?:\n|$)/i);
  if (completedMatch) {
    return completedMatch[1].trim().slice(0, 100);
  }

  // Look for SUMMARY section
  const summaryMatch = response.match(/📋\s*SUMMARY[:\s]*(.+?)(?:\n|$)/i);
  if (summaryMatch) {
    return summaryMatch[1].trim().slice(0, 100);
  }

  // Fallback: first meaningful line
  const lines = response.split('\n').filter(l => l.trim().length > 10);
  if (lines.length > 0) {
    return lines[0].trim().slice(0, 100);
  }

  return 'work-session';
}

function generateFilename(type: string, description: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
  const kebab = description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${timestamp}_${type}_${kebab}.md`;
}

/**
 * Extract the last assistant response from a transcript file.
 * Claude Code sends transcript_path but not response in Stop events.
 */
function extractResponseFromTranscript(transcriptPath: string): string | null {
  try {
    if (!existsSync(transcriptPath)) {
      return null;
    }

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      return null;
    }

    // Find the last assistant message by iterating backwards
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'assistant' && entry.message?.content) {
          // Extract text from content array
          const contentArray = Array.isArray(entry.message.content)
            ? entry.message.content
            : [entry.message.content];

          const response = contentArray
            .map((c: any) => {
              if (typeof c === 'string') return c;
              if (c?.text) return c.text;
              if (c?.content) return String(c.content);
              return '';
            })
            .join('\n')
            .trim();

          if (response && response.length > 50) {
            return response;
          }
        }
      } catch {
        continue; // Skip malformed lines
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  try {
    const stdinData = await Bun.stdin.text();
    if (!stdinData.trim()) {
      process.exit(0);
    }

    const payload: StopPayload = JSON.parse(stdinData);

    // Try to get response from payload first, then from transcript
    let response = payload.response;
    if (!response && payload.transcript_path) {
      response = extractResponseFromTranscript(payload.transcript_path) || undefined;
    }

    if (!response) {
      process.exit(0);
    }

    const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
    const historyDir = join(paiDir, 'history');

    const isLearning = hasLearningIndicators(response);
    const type = isLearning ? 'LEARNING' : 'SESSION';
    const subdir = isLearning ? 'learnings' : 'sessions';

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const outputDir = join(historyDir, subdir, yearMonth);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const summary = extractSummary(response);
    const filename = generateFilename(type, summary);
    const filepath = join(outputDir, filename);

    // Limit response size to prevent huge files
    const truncatedResponse = response.slice(0, 5000);

    const content = `---
capture_type: ${type}
timestamp: ${getLocalTimestamp()}
session_id: ${payload.session_id || 'unknown'}
executor: main
---

# ${type}: ${summary}

${truncatedResponse}

---

*Captured by PAI History System stop-hook*
`;

    writeFileSync(filepath, content);
    console.log(`📝 Captured ${type} to ${subdir}/${yearMonth}/${filename}`);

  } catch (error) {
    console.error('Stop hook error:', error);
  }

  process.exit(0);
}

main();
