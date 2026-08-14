#!/usr/bin/env bun
/**
 * CommitmentDetect.ts — Haiku-backed detector for outbound commitments.
 *
 * Reads a message (from stdin or --text), returns JSON:
 *   {
 *     detected: boolean,
 *     subject?: string,       // what was promised
 *     beneficiary?: string,   // who it was promised to
 *     due?: string,           // ISO date if a deadline was named
 *     confidence?: number,    // 0..1
 *     reasoning?: string
 *   }
 *
 *   bun ~/.claude/LIFEOS/TOOLS/CommitmentDetect.ts --text "I'll send Alex the brief by Friday"
 *   echo "thanks" | bun ~/.claude/LIFEOS/TOOLS/CommitmentDetect.ts --stdin
 *
 * Routes through Inference.ts level: low (haiku-tier, 15s timeout, subscription billing).
 * Returns {detected: false} on parse failure or timeout — never throws.
 */

import { inference } from "./Inference";
import { getPrincipalName } from "../../hooks/lib/identity";

// Principal name resolved at runtime, never a literal: a hardcoded name ships
// as an unsubstituted {{PRINCIPAL_FULL_NAME}} placeholder in the public
// payload's live code (public issue #1770 §6 class, @bnkath2o; G23 gate).
const SYSTEM_PROMPT = `You analyze outbound messages from ${getPrincipalName()} to detect commitments — promises to do something, send something, deliver something, or follow up by a specific time.

A commitment has:
- A subject (what is promised — concrete action or artifact)
- A beneficiary (who it is promised to — name or pronoun)
- Optionally a due date or relative deadline ("by Friday", "tomorrow", "next week", "EOD")

NOT commitments:
- Past-tense statements ("I sent you the brief")
- Hypotheticals ("we could do X")
- General intentions without a recipient ("I should write that post")
- Acknowledgments ("thanks", "sounds good", "got it")
- Questions

Today's date is provided in the user message. If a relative deadline is named, convert to absolute ISO date (YYYY-MM-DD).

Return STRICT JSON only — no prose, no markdown:
{
  "detected": true | false,
  "subject": "string or null",
  "beneficiary": "string or null",
  "due": "YYYY-MM-DD or null",
  "confidence": 0..1,
  "reasoning": "one short sentence"
}

If detected is false, set subject/beneficiary/due to null and confidence to 0.`;

async function run(text: string): Promise<void> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const userPrompt = `Today is ${todayIso}.\n\nMessage:\n"""${text}"""\n\nDetect commitment. Return JSON only.`;

  const result = await inference({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    level: "low",
    expectJson: true,
    timeout: 15000,
  });

  if (!result.success || !result.parsed) {
    process.stdout.write(
      JSON.stringify({
        detected: false,
        confidence: 0,
        reasoning: result.error ? `detect_failed: ${result.error}` : "detect_failed: unparseable response",
      }) + "\n",
    );
    process.exit(0);
  }

  const parsed = result.parsed as Record<string, unknown>;
  const out = {
    detected: Boolean(parsed.detected),
    subject: parsed.subject ?? null,
    beneficiary: parsed.beneficiary ?? null,
    due: parsed.due ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    reasoning: parsed.reasoning ?? null,
    latency_ms: result.latencyMs,
  };
  process.stdout.write(JSON.stringify(out) + "\n");
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function main() {
  const args = process.argv.slice(2);
  let text = "";
  const useStdin = args.includes("--stdin");
  const textIdx = args.indexOf("--text");
  if (textIdx >= 0 && args[textIdx + 1]) {
    text = args[textIdx + 1];
  } else if (useStdin) {
    text = await readStdin();
  } else {
    console.error("usage: CommitmentDetect.ts --text <message> | --stdin");
    process.exit(1);
  }
  if (!text) {
    console.error("CommitmentDetect: empty input");
    process.exit(1);
  }
  await run(text);
}

if (import.meta.main) {
  main().catch((err) => {
    process.stdout.write(
      JSON.stringify({ detected: false, confidence: 0, reasoning: `fatal: ${String(err)}` }) + "\n",
    );
    process.exit(0);
  });
}
