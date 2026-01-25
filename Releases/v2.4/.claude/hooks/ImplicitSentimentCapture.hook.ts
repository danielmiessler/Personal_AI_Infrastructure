#!/usr/bin/env bun
/**
 * ImplicitSentimentCapture.hook.ts - Implicit Sentiment Detection (UserPromptSubmit)
 *
 * PURPOSE:
 * Detects emotional signals in user messages to infer satisfaction/dissatisfaction
 * when no explicit rating is given. Uses AI inference to understand nuanced sentiment
 * like frustration, excitement, or disappointment from natural language.
 *
 * TRIGGER: UserPromptSubmit
 *
 * INPUT:
 * - prompt: User's message text
 * - session_id: Current session identifier
 * - transcript_path: Path to conversation transcript (for context)
 *
 * OUTPUT:
 * - stdout: None (no context injection)
 * - exit(0): Normal completion
 *
 * SIDE EFFECTS:
 * - Writes to: MEMORY/LEARNING/SIGNALS/ratings.jsonl (source: "implicit")
 * - Writes to: MEMORY/LEARNING/<category>/<YYYY-MM>/*.md (for low ratings)
 * - Triggers: TrendingAnalysis.ts update (fire-and-forget)
 * - API call: Haiku inference for sentiment analysis (fast/cheap)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: ExplicitRatingCapture (must defer if explicit rating detected)
 * - COORDINATES WITH: ExplicitRatingCapture (shares ratings.jsonl)
 * - MUST RUN BEFORE: None
 * - MUST RUN AFTER: ExplicitRatingCapture (implicit is secondary)
 *
 * COORDINATION PROTOCOL:
 * Checks isExplicitRating(prompt) FIRST - if true, exits immediately.
 * This ensures explicit ratings like "8 - great work" are handled by
 * ExplicitRatingCapture, not double-captured as implicit sentiment.
 *
 * ERROR HANDLING:
 * - Explicit rating detected: Exits immediately (defers to ExplicitRatingCapture)
 * - Inference timeout: Exits gracefully after 25s
 * - Low confidence (<0.5): Not logged
 * - Neutral sentiment: Logged as rating 5 (baseline for feature requests)
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (runs async)
 * - Typical execution: 0.5-1.5s (Haiku inference)
 * - Timeout: 25s max
 *
 * SENTIMENT EXAMPLES:
 * - "What the fuck, why did you break it?" → rating 1-2 (frustration)
 * - "Oh my god, this is amazing!" → rating 9-10 (excitement)
 * - "Hmm, that's not quite right" → rating 4 (mild dissatisfaction)
 * - "Check the logs" → 5 (neutral, logged as baseline)
 *
 * RATING SCALE:
 * - 1-2: Strong frustration, anger, disappointment
 * - 3-4: Mild frustration, dissatisfaction
 * - 5: Neutral (logged as baseline for feature requests)
 * - 6-7: Satisfaction, approval
 * - 8-9: Strong approval, impressed
 * - 10: Extraordinary enthusiasm
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { inference } from '../skills/CORE/Tools/Inference';
import { getIdentity, getPrincipal } from './lib/identity';
import { getLearningCategory } from './lib/learning-utils';
import { getISOTimestamp, getPSTComponents } from './lib/time';
import { captureFailure } from '../skills/CORE/Tools/FailureCapture';

const PRINCIPAL_NAME = getPrincipal().name;
const ASSISTANT_NAME = getIdentity().name;

interface HookInput {
  session_id: string;
  prompt?: string;        // Actual field name from Claude Code
  user_prompt?: string;   // Legacy field name
  transcript_path: string;
  hook_event_name: string;
}

interface SentimentResult {
  rating: number | null;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  summary: string;
  detailed_context: string;
}

interface ImplicitRatingEntry {
  timestamp: string;
  rating: number;
  session_id: string;
  source: 'implicit';
  sentiment_summary: string;
  confidence?: number;
}

const SENTIMENT_SYSTEM_PROMPT = `Analyze ${PRINCIPAL_NAME}'s message for emotional sentiment toward ${ASSISTANT_NAME} (the AI assistant).

CONTEXT: This is a personal AI system. ${PRINCIPAL_NAME} is the ONLY user. Never say "users" - always "${PRINCIPAL_NAME}."

OUTPUT FORMAT (JSON only):
{
  "rating": <1-10 or null>,
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": <0.0-1.0>,
  "summary": "<brief explanation, 10 words max>",
  "detailed_context": "<comprehensive analysis for learning, 100-256 words>"
}

DETAILED_CONTEXT REQUIREMENTS (critical for learning system):
Write 100-256 words covering:
1. What ${PRINCIPAL_NAME} was trying to accomplish
2. What ${ASSISTANT_NAME} did (or failed to do)
3. Why ${PRINCIPAL_NAME} is frustrated/satisfied (the root cause)
4. What specific behavior triggered this reaction
5. What ${ASSISTANT_NAME} should have done differently (for negative) or what worked well (for positive)
6. Any patterns this reveals about ${PRINCIPAL_NAME}'s expectations

This context will be used retroactively to improve ${ASSISTANT_NAME}, so include enough detail that someone reading it months later can understand exactly what went wrong or right.

RATING SCALE:
- 1-2: Strong frustration, anger, disappointment with ${ASSISTANT_NAME}
- 3-4: Mild frustration, dissatisfaction
- 5: Neutral (no strong sentiment)
- 6-7: Satisfaction, approval
- 8-9: Strong approval, impressed
- 10: Extraordinary enthusiasm, blown away

CRITICAL DISTINCTIONS:
- Profanity can indicate EITHER frustration OR excitement
  - "What the fuck?!" + complaint about work = LOW (1-3)
  - "Holy shit, this is amazing!" = HIGH (9-10)
- Context is KEY: Is the emotion directed AT ${ASSISTANT_NAME}'s work?
- Sarcasm: "Oh great, another error" = negative despite "great"

WHEN TO RETURN null FOR RATING:
- Neutral technical questions ("Can you check the logs?")
- Simple commands ("Do it", "Yes", "Continue")
- No emotional indicators present
- Emotion unrelated to ${ASSISTANT_NAME}'s work

EXAMPLES:
${PRINCIPAL_NAME}: "What the fuck, why did you delete my file?"
→ {"rating": 1, "sentiment": "negative", "confidence": 0.95, "summary": "Angry about deleted file", "detailed_context": "..."}

${PRINCIPAL_NAME}: "Oh my god, this is fucking incredible, you nailed it!"
→ {"rating": 10, "sentiment": "positive", "confidence": 0.95, "summary": "Extremely impressed with result", "detailed_context": "..."}

${PRINCIPAL_NAME}: "Fix the auth bug"
→ {"rating": null, "sentiment": "neutral", "confidence": 0.9, "summary": "Neutral command, no sentiment", "detailed_context": ""}

${PRINCIPAL_NAME}: "Hmm, that's not quite right"
→ {"rating": 4, "sentiment": "negative", "confidence": 0.6, "summary": "Mild dissatisfaction", "detailed_context": "..."}

${PRINCIPAL_NAME}: "Perfect, exactly what I needed"
→ {"rating": 8, "sentiment": "positive", "confidence": 0.85, "summary": "Satisfied with result", "detailed_context": "..."}`;

const MIN_PROMPT_LENGTH = 3;
const MIN_CONFIDENCE = 0.5;
const ANALYSIS_TIMEOUT = 25000;

/**
 * Check if prompt is an explicit rating (defer to ExplicitRatingCapture)
 */
function isExplicitRating(prompt: string): boolean {
  const trimmed = prompt.trim();
  const ratingPattern = /^(10|[1-9])(?:\s*[-:]\s*|\s+)?(.*)$/;
  const match = trimmed.match(ratingPattern);

  if (!match) return false;

  const comment = match[2]?.trim();
  if (comment) {
    const sentenceStarters = /^(items?|things?|steps?|files?|lines?|bugs?|issues?|errors?|times?|minutes?|hours?|days?|seconds?|percent|%|th\b|st\b|nd\b|rd\b|of\b|in\b|at\b|to\b|the\b|a\b|an\b)/i;
    if (sentenceStarters.test(comment)) {
      return false;
    }
  }

  return true;
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
 * Get recent conversation context from transcript
 */
function getRecentContext(transcriptPath: string, maxTurns: number = 3): string {
  try {
    if (!transcriptPath || !existsSync(transcriptPath)) return '';

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    const turns: { role: string; text: string }[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);

        if (entry.type === 'user' && entry.message?.content) {
          let text = '';
          if (typeof entry.message.content === 'string') {
            text = entry.message.content;
          } else if (Array.isArray(entry.message.content)) {
            text = entry.message.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ');
          }
          if (text.trim()) {
            turns.push({ role: 'User', text: text.slice(0, 200) });
          }
        }

        if (entry.type === 'assistant' && entry.message?.content) {
          const text = typeof entry.message.content === 'string'
            ? entry.message.content
            : Array.isArray(entry.message.content)
              ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
              : '';
          if (text) {
            const summaryMatch = text.match(/SUMMARY:\s*([^\n]+)/i);
            const shortText = summaryMatch ? summaryMatch[1] : text.slice(0, 150);
            turns.push({ role: 'Assistant', text: shortText });
          }
        }
      } catch {}
    }

    const recentTurns = turns.slice(-maxTurns);
    if (recentTurns.length === 0) return '';

    return recentTurns.map(t => `${t.role}: ${t.text}`).join('\n');
  } catch {
    return '';
  }
}

/**
 * Analyze sentiment using Sonnet
 */
async function analyzeSentiment(prompt: string, context: string): Promise<SentimentResult | null> {
  const userPrompt = context
    ? `CONTEXT:\n${context}\n\nCURRENT MESSAGE:\n${prompt}`
    : prompt;

  const result = await inference({
    systemPrompt: SENTIMENT_SYSTEM_PROMPT,
    userPrompt,
    expectJson: true,
    timeout: 20000,
    level: 'fast',  // fast = haiku (quick/cheap)
  });

  if (!result.success || !result.parsed) {
    console.error(`[ImplicitSentimentCapture] Inference failed: ${result.error}`);
    return null;
  }

  return result.parsed as SentimentResult;
}

/**
 * Write implicit rating to ratings.jsonl
 * NOTE: Ratings are now stored in LEARNING/SIGNALS/ (consolidated from separate SIGNALS/)
 */
function writeImplicitRating(entry: ImplicitRatingEntry): void {
  const baseDir = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
  const signalsDir = join(baseDir, 'MEMORY', 'LEARNING', 'SIGNALS');
  const ratingsFile = join(signalsDir, 'ratings.jsonl');

  if (!existsSync(signalsDir)) {
    mkdirSync(signalsDir, { recursive: true });
  }

  appendFileSync(ratingsFile, JSON.stringify(entry) + '\n', 'utf-8');
  console.error(`[ImplicitSentimentCapture] Wrote implicit rating ${entry.rating} to ${ratingsFile}`);
}

/**
 * Capture low rating as learning opportunity
 */
function captureLowRatingLearning(
  rating: number,
  sentimentSummary: string,
  detailedContext: string,
  transcriptPath: string
): void {
  if (rating >= 6) return;

  const baseDir = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
  const { year, month, day, hours, minutes, seconds } = getPSTComponents();

  const yearMonth = `${year}-${month}`;
  const category = getLearningCategory(detailedContext, sentimentSummary);
  const learningsDir = join(baseDir, 'MEMORY', 'LEARNING', category, yearMonth);

  if (!existsSync(learningsDir)) {
    mkdirSync(learningsDir, { recursive: true });
  }

  // Get response context
  let responseContext = '';
  try {
    if (transcriptPath && existsSync(transcriptPath)) {
      const content = readFileSync(transcriptPath, 'utf-8');
      const lines = content.trim().split('\n');
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'assistant' && entry.message?.content) {
            const text = typeof entry.message.content === 'string'
              ? entry.message.content
              : Array.isArray(entry.message.content)
                ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
                : '';
            if (text) responseContext = text;
          }
        } catch {}
      }
      responseContext = responseContext.slice(0, 500);
    }
  } catch {}

  const filename = `${year}-${month}-${day}-${hours}${minutes}${seconds}_LEARNING_sentiment-rating-${rating}.md`;
  const filepath = join(learningsDir, filename);

  const content = `---
capture_type: LEARNING
timestamp: ${year}-${month}-${day} ${hours}:${minutes}:${seconds} PST
rating: ${rating}
source: implicit-sentiment
auto_captured: true
tags: [sentiment-detected, implicit-rating, improvement-opportunity]
---

# Implicit Low Rating Detected: ${rating}/10

**Date:** ${year}-${month}-${day}
**Rating:** ${rating}/10
**Detection Method:** Sentiment Analysis
**Sentiment Summary:** ${sentimentSummary}

---

## Detailed Analysis (for Learning System)

${detailedContext || 'No detailed analysis available'}

---

## Assistant Response Context

${responseContext || 'No response context available'}

---

## Improvement Notes

This response triggered a ${rating}/10 implicit rating based on detected user sentiment.

**Quick Summary:** ${sentimentSummary}

**Root Cause Analysis:** Review the detailed analysis above to understand what went wrong and how to prevent similar issues.

**Action Items:**
- Review the assistant response context to identify specific failure points
- Consider whether this represents a pattern that needs systemic correction
- Update relevant skills, workflows, or constitutional principles if needed

---
`;

  writeFileSync(filepath, content, 'utf-8');
  console.error(`[ImplicitSentimentCapture] Captured low rating learning to ${filepath}`);
}

async function main() {
  try {
    console.error('[ImplicitSentimentCapture] Hook started');
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);
    // The payload uses 'prompt' (Claude Code) - user_prompt is legacy
    const prompt = data.prompt || data.user_prompt || '';

    // Skip if explicit rating (let ExplicitRatingCapture handle)
    if (isExplicitRating(prompt)) {
      console.error('[ImplicitSentimentCapture] Explicit rating detected, deferring to ExplicitRatingCapture');
      process.exit(0);
    }

    if (prompt.length < MIN_PROMPT_LENGTH) {
      console.error('[ImplicitSentimentCapture] Prompt too short, exiting');
      process.exit(0);
    }

    const context = getRecentContext(data.transcript_path);

    const analysisPromise = analyzeSentiment(prompt, context);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), ANALYSIS_TIMEOUT)
    );

    const sentiment = await Promise.race([analysisPromise, timeoutPromise]);

    if (!sentiment) {
      console.error('[ImplicitSentimentCapture] Analysis failed or timed out');
      process.exit(0);
    }

    // Neutral sentiment gets rating 5 (baseline for feature requests)
    if (sentiment.rating === null) {
      sentiment.rating = 5;
      console.error('[ImplicitSentimentCapture] Neutral sentiment, assigning baseline rating 5');
    }

    if (sentiment.confidence < MIN_CONFIDENCE) {
      console.error(`[ImplicitSentimentCapture] Low confidence (${sentiment.confidence}), not logging`);
      process.exit(0);
    }

    console.error(`[ImplicitSentimentCapture] Detected: ${sentiment.rating}/10 - ${sentiment.summary}`);

    const entry: ImplicitRatingEntry = {
      timestamp: getISOTimestamp(),
      rating: sentiment.rating,
      session_id: data.session_id,
      source: 'implicit',
      sentiment_summary: sentiment.summary,
      confidence: sentiment.confidence,
    };

    writeImplicitRating(entry);

    // Update trending analysis cache (fire-and-forget, don't block)
    const baseDir = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
    const trendingScript = join(baseDir, 'tools', 'TrendingAnalysis.ts');
    if (existsSync(trendingScript)) {
      Bun.spawn(['bun', trendingScript, '--force'], {
        stdout: 'ignore',
        stderr: 'ignore'
      });
      console.error('[ImplicitSentimentCapture] Triggered TrendingAnalysis update');
    }

    if (sentiment.rating < 6) {
      captureLowRatingLearning(
        sentiment.rating,
        sentiment.summary,
        sentiment.detailed_context || '',
        data.transcript_path
      );

      // For ratings 1-3, also create full failure capture
      if (sentiment.rating <= 3) {
        try {
          await captureFailure({
            transcriptPath: data.transcript_path,
            rating: sentiment.rating,
            sentimentSummary: sentiment.summary,
            detailedContext: sentiment.detailed_context || '',
            sessionId: data.session_id,
          });
          console.error(`[ImplicitSentimentCapture] Created full failure capture for rating ${sentiment.rating}`);
        } catch (err) {
          console.error(`[ImplicitSentimentCapture] Error creating failure capture: ${err}`);
        }
      }
    }

    console.error('[ImplicitSentimentCapture] Done');
    process.exit(0);
  } catch (err) {
    console.error(`[ImplicitSentimentCapture] Error: ${err}`);
    process.exit(0);
  }
}

main();
