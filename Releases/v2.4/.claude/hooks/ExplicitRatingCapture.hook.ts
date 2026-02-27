#!/usr/bin/env bun
/**
 * ExplicitRatingCapture.hook.ts - Capture Explicit User Ratings (UserPromptSubmit)
 *
 * PURPOSE:
 * Detects when the user explicitly rates a response with a number 1-10.
 * This is the primary feedback mechanism for the rating/sentiment system.
 * Low ratings trigger automatic learning capture for improvement analysis.
 *
 * TRIGGER: UserPromptSubmit
 *
 * INPUT:
 * - prompt: User's message text
 * - session_id: Current session identifier
 * - transcript_path: Path to conversation transcript
 *
 * OUTPUT:
 * - stdout: None (no context injection)
 * - exit(0): Normal completion
 *
 * SIDE EFFECTS:
 * - Writes to: MEMORY/LEARNING/SIGNALS/ratings.jsonl
 * - Writes to: MEMORY/LEARNING/<category>/<YYYY-MM>/*.md (for low ratings)
 * - Triggers: TrendingAnalysis.ts update (fire-and-forget)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None
 * - COORDINATES WITH: ImplicitSentimentCapture (shares ratings.jsonl)
 * - MUST RUN BEFORE: ImplicitSentimentCapture (explicit takes priority)
 * - MUST RUN AFTER: None
 *
 * COORDINATION PROTOCOL:
 * Both ExplicitRatingCapture and ImplicitSentimentCapture write to ratings.jsonl.
 * ImplicitSentimentCapture checks isExplicitRating() first and defers if true.
 * This hook runs FIRST to capture explicit "8 - great work" style ratings.
 *
 * ERROR HANDLING:
 * - Invalid input: Exits gracefully
 * - Write failures: Logged to stderr, exits gracefully
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <50ms
 * - No external API calls
 *
 * RATING PATTERNS:
 * - "7" → rating 7, no comment
 * - "8 - good work" → rating 8, comment "good work"
 * - "6: needs improvement" → rating 6, comment "needs improvement"
 * - "9 excellent" → rating 9, comment "excellent"
 * - "10!" → rating 10, no comment
 *
 * NON-RATING PATTERNS (ignored):
 * - "3 items" → Not a rating (followed by unit)
 * - "5 things to fix" → Not a rating (sentence continuation)
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getLearningCategory } from './lib/learning-utils';
import { getPrincipalName } from './lib/identity';
import { getISOTimestamp, getPSTComponents } from './lib/time';
import { captureFailure } from '../skills/CORE/Tools/FailureCapture';

interface HookInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
  hook_event_name: string;
}

interface RatingEntry {
  timestamp: string;
  rating: number;
  comment?: string;
  session_id: string;
}

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * CRITICAL: Precise rating detection
 *
 * Must match:
 * - "7" (single number)
 * - "8 - good work" (number + dash + comment)
 * - "6: needs work" (number + colon + comment)
 * - "9 excellent" (number + space + comment)
 *
 * Must NOT match:
 * - "I have 7 items" (number in sentence)
 * - "do step 7" (contextual number)
 * - "7th thing" (ordinal)
 */
function parseRating(prompt: string): { rating: number; comment?: string } | null {
  const trimmed = prompt.trim();

  // Pattern: Start with single digit (1-10), optionally followed by separator and comment
  const ratingPattern = /^(10|[1-9])(?:\s*[-:]\s*|\s+)?(.*)$/;

  const match = trimmed.match(ratingPattern);
  if (!match) return null;

  const rating = parseInt(match[1], 10);
  const comment = match[2]?.trim() || undefined;

  if (rating < 1 || rating > 10) return null;

  // Reject if comment starts with common words that indicate a sentence
  if (comment) {
    const sentenceStarters = /^(items?|things?|steps?|files?|lines?|bugs?|issues?|errors?|times?|minutes?|hours?|days?|seconds?|percent|%|th\b|st\b|nd\b|rd\b|of\b|in\b|at\b|to\b|the\b|a\b|an\b)/i;
    if (sentenceStarters.test(comment)) {
      return null;
    }
  }

  return { rating, comment };
}

/**
 * Write rating to ratings.jsonl
 * NOTE: Ratings are now stored in LEARNING/SIGNALS/ (consolidated from separate SIGNALS/)
 */
function writeRating(entry: RatingEntry): void {
  const baseDir = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
  const signalsDir = join(baseDir, 'MEMORY', 'LEARNING', 'SIGNALS');
  const ratingsFile = join(signalsDir, 'ratings.jsonl');

  if (!existsSync(signalsDir)) {
    mkdirSync(signalsDir, { recursive: true });
  }

  const jsonLine = JSON.stringify(entry) + '\n';
  appendFileSync(ratingsFile, jsonLine, 'utf-8');

  console.error(`[ExplicitRatingCapture] Wrote rating ${entry.rating} to ${ratingsFile}`);
}

/**
 * Extract last response summary from transcript for learning context
 */
function getLastResponseSummary(transcriptPath: string): string {
  try {
    if (!transcriptPath || !existsSync(transcriptPath)) return '';

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let lastAssistant = '';
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'assistant' && entry.message?.content) {
          const text = typeof entry.message.content === 'string'
            ? entry.message.content
            : Array.isArray(entry.message.content)
              ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
              : '';
          if (text) lastAssistant = text;
        }
      } catch { /* skip invalid lines */ }
    }

    const summaryMatch = lastAssistant.match(/SUMMARY:\s*([^\n]+)/i);
    return summaryMatch ? summaryMatch[1].trim() : lastAssistant.slice(0, 500);
  } catch {
    return '';
  }
}

/**
 * Capture low rating as learning opportunity
 */
function captureLowRatingLearning(rating: number, comment: string | undefined, responseContext: string): void {
  if (rating >= 6) return;

  const baseDir = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
  const { year, month, day, hours, minutes, seconds } = getPSTComponents();

  const yearMonth = `${year}-${month}`;
  const category = getLearningCategory(responseContext, comment);
  const learningsDir = join(baseDir, 'MEMORY', 'LEARNING', category, yearMonth);

  if (!existsSync(learningsDir)) {
    mkdirSync(learningsDir, { recursive: true });
  }

  const filename = `${year}-${month}-${day}-${hours}${minutes}${seconds}_LEARNING_low-rating-${rating}.md`;
  const filepath = join(learningsDir, filename);

  const content = `---
capture_type: LEARNING
timestamp: ${year}-${month}-${day} ${hours}:${minutes}:${seconds} PST
rating: ${rating}
auto_captured: true
tags: [low-rating, improvement-opportunity]
---

# Low Rating Captured: ${rating}/10

**Date:** ${year}-${month}-${day}
**Rating:** ${rating}/10
${comment ? `**Feedback:** ${comment}` : ''}

---

## Response Context

${responseContext || 'No response context available'}

---

## Improvement Notes

This response was rated ${rating}/10 by ${getPrincipalName()}. Use this as an improvement opportunity.

${comment ? `**${getPrincipalName()}'s feedback:** ${comment}` : ''}

---
`;

  writeFileSync(filepath, content, 'utf-8');
  console.error(`[ExplicitRatingCapture] Captured low rating learning to ${filepath}`);
}

async function main() {
  try {
    console.error('[ExplicitRatingCapture] Hook started');
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);
    const prompt = data.prompt || '';

    const result = parseRating(prompt);

    if (!result) {
      console.error('[ExplicitRatingCapture] Not a rating, exiting');
      process.exit(0);
    }

    console.error(`[ExplicitRatingCapture] Detected rating: ${result.rating}${result.comment ? ` - ${result.comment}` : ''}`);

    const entry: RatingEntry = {
      timestamp: getISOTimestamp(),
      rating: result.rating,
      session_id: data.session_id,
    };
    if (result.comment) {
      entry.comment = result.comment;
    }

    writeRating(entry);

    // Update trending analysis cache (fire-and-forget, don't block)
    const baseDir = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
    const trendingScript = join(baseDir, 'tools', 'TrendingAnalysis.ts');
    if (existsSync(trendingScript)) {
      Bun.spawn(['bun', trendingScript, '--force'], {
        stdout: 'ignore',
        stderr: 'ignore'
      });
      console.error('[ExplicitRatingCapture] Triggered TrendingAnalysis update');
    }

    if (result.rating < 6) {
      const responseContext = getLastResponseSummary(data.transcript_path);
      captureLowRatingLearning(result.rating, result.comment, responseContext);

      // For ratings 1-3, also create full failure capture
      if (result.rating <= 3) {
        try {
          await captureFailure({
            transcriptPath: data.transcript_path,
            rating: result.rating,
            sentimentSummary: result.comment || `Explicit low rating: ${result.rating}/10`,
            detailedContext: responseContext,
            sessionId: data.session_id,
          });
          console.error(`[ExplicitRatingCapture] Created full failure capture for rating ${result.rating}`);
        } catch (err) {
          console.error(`[ExplicitRatingCapture] Error creating failure capture: ${err}`);
        }
      }
    }

    console.error('[ExplicitRatingCapture] Done');
    process.exit(0);
  } catch (err) {
    console.error(`[ExplicitRatingCapture] Error: ${err}`);
    process.exit(0);
  }
}

main();
