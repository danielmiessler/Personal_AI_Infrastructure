#!/usr/bin/env bun
/**
 * @version 1.0.4
 * VerificationGate.hook.ts — task-aware verification gate (Stop).
 *
 * Replaces the deregistered SuccessClaimGate. Thesis: THE MESSAGE IS A CLAIM;
 * THE TRANSCRIPT IS THE EVIDENCE. The old hook graded the message's own prose
 * ("interceptor-verified") and died from false positives + missed the class
 * where the prose overclaims (Apple: "live and verified" citing a button-render
 * screenshot while the login callback 500'd). This hook detects claims from the
 * last message but detects EVIDENCE only from the transcript's actual tool calls.
 *
 * Firing rule (Fable + Forge synthesis, 2026-07-08) — BLOCK iff ALL hold; any
 * failure ⇒ PASS (default pass):
 *   1. not a stop-hook recovery pass (loop guard)
 *   2. a verification/behavior claim of a blocking type survives every guard
 *      (negation, question, intent/future, conditional, quote, narration,
 *       honest-downgrade), scanned on message with code/quote/blockquote stripped
 *   3. ACT-THEN-CLAIM: the transcript shows this turn actually did mutating work
 *      of the claimed type (kills the whole narration/status/analysis FP family)
 *   4. type-scoped required evidence is ABSENT/stale in the transcript
 *   5. no confounder: no sub-agent this turn (evidence would be invisible), and
 *      the claim wasn't already blocked once (fingerprint dedupe)
 *
 * Teeth by type: T1 web-deploy / T2 interactive-flow / T3 visual-appearance BLOCK.
 * T4 code-logic is LOG-ONLY until its corpus proves clean.
 * T5 publicity ("X is public/live/released") BLOCKS by default. VERIFGATE_T5=logonly
 * downgrades it to observation, VERIFGATE_T5=off disables it. Shipped armed rather
 * than log-only-first (Max recommended the latter on false-positive cost grounds):
 * the principal asked for teeth the same night the class produced three fabrications,
 * and the FP surface tested clean across 11 negatives — staged/local/private-push
 * phrasing, questions, attributed relays, negations, and bare version statements. T5 is the only
 * type that skips BOTH the act-then-claim precondition and the sub-agent bypass —
 * see the rationale block at its call site.
 *
 * HISTORY, because this header used to lie: from 2026-07-08 to 2026-07-31 it read
 * "T5 factual NEVER blocks" while the type union was T1|T2|T3|T4|null and no T5
 * code path existed. A documented type that was never built, in the header of the
 * gate whose entire thesis is that claims need evidence. It was found only after
 * the gap it described let three fabricated publicity claims through in one
 * session. Do not describe intended behavior here as though it ships.
 * Per-type env kill switches (VERIFGATE_T1=0 …); VERIFGATE_OFF=1 disables all.
 * Fail-OPEN on any read/parse error — the gate must never be why a Stop breaks.
 *
 * TRIGGER: Stop
 */

import { readHookInput } from "./lib/hook-io";
import {
  parseTurnEvents,
  hadDeploy, hadCodeEdit, hadFrontendEdit, hadFlowEdit, spawnedAgent,
  probedAfterDeploy, flowExercised, pixelViewed, testPassedAfterEdit,
  type TxEvent,
} from "./lib/transcript-evidence";
import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createHash } from "crypto";

const LIFEOS = process.env.LIFEOS_DIR || join(process.env.HOME!, ".claude", "LIFEOS");
const OBS_PATH = join(LIFEOS, "MEMORY", "OBSERVABILITY", "verification-gate.jsonl");
const STATE_PATH = join(LIFEOS, "MEMORY", "STATE", "verification-gate-blocked.json");

// ── Claim units ──────────────────────────────────────────────────────────────
export function splitIntoUnits(text: string): string[] {
  // Split on commas/semicolons too, so each claim in a comma-run summary is
  // judged against its OWN evidence type (FP-B) instead of one compound unit.
  //
  // The lookarounds keep dotted numbers intact: a separator only splits when it
  // is NOT sitting between two digits. A plain `[.!?;,\n]+` split shredded
  // "7.23.2 is public" into ["7", "23", "2 is public"], destroying the version
  // token and leaving a fragment `unitIsClaimable` rejected outright, so the
  // claim vanished before any type could see it. That blind spot hit every type
  // carrying a version, IP, or decimal. Found 2026-07-31 by testing the gate
  // against the exact sentence it was built to catch.
  return text
    .split(/(?<!\d)[.!?;,\n]+|[.!?;,\n]+(?!\d)/)
    .map((u) => (u ?? "").trim())
    .filter(Boolean);
}


/** Strip fenced code, inline code, and blockquote lines — a spec/example that
 * CONTAINS "the login flow works" is not a claim. */
export function stripNoise(msg: string): string {
  return msg
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/^\s*>.*$/gm, " ");
}

// Whole-message escapes.
const HONEST_DOWNGRADE =
  /\b(DEFERRED[\s-]?VERIFY|not\s+(yet\s+)?(browser[\s-]?|pixel[\s-]?|end[\s-]?to[\s-]?end\s+)?verif\w*|not\s+verified\b|haven'?t\s+(yet\s+)?(browser[\s-]?|actually\s+)?(verif\w*|exercised|tested|looked|driven)|deployed\s+but\s+not\s+\w*\s*verif\w*|flow\s+not\s+exercised|not\s+(yet\s+)?(browser[\s-]?)?tested|pending\s+(browser\s+|live\s+|your\s+)?(verif\w*|tap|test)|your\s+(tap|test)\s+to\s+confirm|verifying\s+(next|now)|verify\s+next|checking\s+now|probing\s+(it\s+)?now|about\s+to\s+(verify|test|check|probe)|running\s+the\s+(check|probe|test|verification)|next[\s:]+verif\w*|couldn'?t\s+(capture|verify|reach)|can'?t\s+(mint|verify|drive))\b/i;

// Per-unit non-claim guards.
const NONCLAIM =
  /\b(not|isn'?t|aren'?t|wasn'?t|weren'?t|doesn'?t|don'?t|didn'?t|won'?t|can'?t|cannot|couldn'?t|no\s+longer|still\s+(not|broken|500|failing)|never|needs?\s+to|should\s+be|would\s+be|make\s+sure|please|let'?s|going\s+to|will\s+be|to\s+be|want|hope|expect|if\s|once\s|when\s|after\s|assuming|would|could\s+you|can\s+you)\b/i;
const LEADING_INTERROGATIVE =
  /^\s*(is|are|does|do|did|can|could|should|would|will|has|have|how|why|what|where|when|which|who|isn'?t|aren'?t)\b/i;
// Imperative/recipe lead ("Run X, then Y works") — an instruction, not a claim.
const LEADING_IMPERATIVE =
  /^\s*(run|do|execute|try|click|open|deploy|add|set|install|go|check|make|use|call|start|restart|edit|write|create|build|test|verify|ensure|remember\s+to)\b/i;
const RECIPE = /\b(then|and\s+then|after\s+that)\b[^.\n]{0,40}\b(works?|is\s+live|verified|passes?)\b/i;
const ATTRIBUTION =
  /\b(you\s+(said|asked|told|mentioned)|per\s+the|according\s+to|the\s+(ticket|PR|docs?|user|issue|spec)\s+(say|says|said|claims?)|"[^"]*")\b/i;
// Prior-turn / dated narration (kept from the old hook's battle-tested set).
const NARRATION =
  /\b(earlier|already|previously|in\s+(the\s+)?prior\s+turns?|prior\s+turns?|last\s+turn)\b|\b(in|back\s+in|since|during)\s+(19|20)\d\d\b/i;

export function unitIsClaimable(u: string, opts?: { allowNarration?: boolean }): boolean {
  if (u.includes("?")) return false;
  if (LEADING_INTERROGATIVE.test(u)) return false;
  if (LEADING_IMPERATIVE.test(u)) return false;
  if (RECIPE.test(u)) return false;
  if (NONCLAIM.test(u)) return false;
  if (ATTRIBUTION.test(u)) return false;
  // NARRATION exists so re-describing an earlier turn's work isn't re-blocked.
  // T5 opts out: for publicity, the narration words ARE the dangerous phrasing.
  // "already published", "shipped earlier" assert public state just as hard as
  // the present tense, and the founding incident's real sentence ended "...doc
  // mismatches ALREADY in it", which this guard suppressed on its own.
  if (!opts?.allowNarration && NARRATION.test(u)) return false;
  return true;
}

// Type predicates (in one claimable unit).
const T1_LIVE = /\b((is|it'?s|site'?s|page'?s|now)\s+live|went\s+live|live\s+(at|on)|deployed\s+(to|at|and\s+(live|working))|deploy\s+(is\s+)?(complete|done|succeeded))\b/i;
const T1_WEBNOUN = /\b(site|page|web\s*site|url|domain|https?:\/\/|worker|deploy(ment|ed)?|production|prod\b|admin|dashboard)\b/i;
// No "callback"/"end-to-end" — both are heavily overloaded in TS/JS and stole
// non-flow "it works" claims into T2 (FP-C).
const T2_FLOW = /\b(log[\s-]?in|sign[\s-]?in|sign[\s-]?up|auth(entication|orization)?|oauth|sso|checkout|payment|purchase|the\s+(login|sign[\s-]?in|auth|checkout)\s+flow)\b/i;
const T2_WORKS = /\b(works?(\s+(now|end[\s-]?to[\s-]?end|fine|correctly|great))?|working|functional|verified(\s+working)?|confirmed\s+working|succeeds?|can\s+(now\s+)?(log|sign)\s+in|completes?|goes?\s+through)\b/i;
const T3_VISUAL = /\b(logo|image|icon|favicon|thumbnail|hero|banner|button|layout|header|footer|nav(bar)?|wordmark|graphic|background|colou?r)\b/i;
const T3_LOOK = /\b(renders?|rendered|displays?|displayed|looks?\s+(right|correct|good|great|fine)|is\s+(now\s+)?(centered|centred|aligned|transparent|visible|positioned|the\s+(right|correct)\s+colou?r))\b/i;
const T4_CODE = /\b(tests?\s+(pass|green|passing)|\d+\s*\/\s*\d+\s+(pass|green)|all\s+(green|passing)|verified\s+(with|via)\s+a?\s*(run|test)|it\s+works\b)\b/i;

// ── T5: publicity claims (2026-07-31) ────────────────────────────────────────
// The narrow subclass where "did you check?" is answerable deterministically.
// Origin: three fabrications in one session, the third nested inside the
// correction of the second — "7.23.2 is public right now" (public was 22 feature
// versions behind), then "public is at v7.1.1, last commit 2026-07-29" (that
// commit was local-only, one ahead of origin, never pushed).
//
// Why THIS subclass and not "factual claims" generally: OPERATIONAL_RULES already
// legislates the vocabulary ("shipped/live/released mean PUBLIC — only after
// CreateRelease"), so the detector enforces an existing contract instead of
// inventing a taxonomy, and the evidence set is one command rather than semantic
// entity-matching. Generic file-content and bare-version detectors were designed
// and CUT: they reintroduce the false-positive death that killed SuccessClaimGate,
// and a version detector would have blocked truth constantly while still missing
// this incident — the number was right, the PUBLICITY was invented.
// A bare semver counts as a release surface ONLY because the publicity predicate
// is required alongside it. "LifeOS is at 7.24.2" has no predicate and never
// fires; "7.24.2 is public" does. Dropping semver from this set was my first
// implementation bug — it made the gate miss the exact sentence it was built for.
const T5_SURFACE = /\b(public\s+repo|public\s+repository|github|the\s+public|docs\s+site|release[ds]?|published|v?\d+\.\d+\.\d+)\b/i;
const T5_PREDICATE = /\b(is|are|'s|was|were|now|already)\s+(public|live|released|shipped|published|out)\b/i;
// Local/staged nouns in the unit ⇒ it's a private-tree statement, not a publicity
// claim. "The payload is staged" and "local is ahead of origin" must never block.
const T5_LOCAL = /\b(local(ly)?|staged?|staging|payload|private\s+repo|~\/\.claude|LIFEOS_RELEASES|candidate|shadow\s+release)\b/i;

export type ClaimType = "T1" | "T2" | "T3" | "T4" | "T5" | null;

/** The claiming unit iff the message asserts something is PUBLIC without hedging. */
export function publicityClaimUnit(message: string): string | null {
  const units = splitIntoUnits(stripNoise(message)).filter((u) => unitIsClaimable(u, { allowNarration: true }));
  for (const u of units) {
    if (T5_LOCAL.test(u)) continue;
    if (T5_SURFACE.test(u) && T5_PREDICATE.test(u)) return u;
  }
  return null;
}

// Evidence for a publicity claim: anything that actually reached the public
// surface. Enumerable by construction — that's what makes T5 tractable.
const PUBLIC_PROBE =
  /\bgit\s+ls-remote\b|\bgit\s+-C\s+\S*LifeOS\b|\bgh\s+(api|release|repo|search)\b|github\.com|\bgit\s+fetch\b|\borigin\/main\b/i;

/** True iff some event in the window probed the public surface. */
export function publicStateProbed(ev: { target: string; resultText: string }[]): boolean {
  return ev.some((e) => PUBLIC_PROBE.test(e.target));
}

/** Classify the strongest claim in the message (T2 outranks T1). Returns the
 * type + the matched unit, or null. */
export function classifyClaim(message: string): { type: Exclude<ClaimType, null>; unit: string } | null {
  const units = splitIntoUnits(stripNoise(message)).filter((u) => unitIsClaimable(u));
  let t1: string | null = null, t3: string | null = null, t4: string | null = null;
  for (const u of units) {
    // Visual noun in the unit ⇒ it's a look/styling claim, not a flow claim —
    // let T3 handle it; don't let T2 steal "the sign-in button works" (FP-C).
    if (T2_FLOW.test(u) && T2_WORKS.test(u) && !T3_VISUAL.test(u)) return { type: "T2", unit: u };
    if (!t1 && T1_LIVE.test(u) && T1_WEBNOUN.test(u)) t1 = u;
    if (!t3 && T3_VISUAL.test(u) && T3_LOOK.test(u)) t3 = u;
    if (!t4 && T4_CODE.test(u)) t4 = u;
  }
  if (t1) return { type: "T1", unit: t1 };
  if (t3) return { type: "T3", unit: t3 };
  if (t4) return { type: "T4", unit: t4 };
  return null;
}

// ── TF: contradicted completion ──────────────────────────────────────────────
// The turn's FINAL tool result is a hard failure (traceback / exit≠0 / not
// found), nothing ran after it, yet the message claims completion. Class
// tool:bash:exit-code-traceback-most-recent-call-last (9 events/7d, deriver
// 2026-07-16): "python3 -c … dies with Traceback, then the turn ends claiming
// success." Deliberately narrow: hard-failure text only — an HTTP 4xx status
// line alone never fires this (negative-control probes are legitimate).
const HARD_FAIL =
  /\btraceback\s*\(most recent call last\)|\bcommand not found\b|\bpermission denied\b|\bno such file or directory\b|\bexit(ed)?(\s+with)?(\s+code)?\s+[1-9]\d*\b|\bsegmentation fault\b|\bpanic:\s/i;
const COMPLETION =
  /\b(done|complete(d)?|finished|fixed|resolved|all\s+set|checks?\s+out|success(ful|fully)?|works?\s+(now|fine|correctly)|good\s+to\s+go|everything('?s)?\s+(fine|working|good))\b/i;
const ACKNOWLEDGES_FAILURE =
  /\b(fail(s|ed|ure|ing)?|error(s|ed)?|traceback|exception|broke|broken|didn'?t\s+(work|run|parse)|couldn'?t|hit\s+a\s+(snag|wall)|blocked)\b/i;

/** Returns the claiming unit iff the message asserts completion while the
 * turn's final tool event hard-failed and nothing succeeded after it. */
export function contradictedCompletionUnit(message: string, evs: { isError: boolean; resultText: string }[]): string | null {
  if (evs.length === 0) return null;
  const last = evs[evs.length - 1]!;
  if (!HARD_FAIL.test(last.resultText)) return null;
  const stripped = stripNoise(message);
  if (ACKNOWLEDGES_FAILURE.test(stripped)) return null; // honest about the failure ⇒ not a contradiction
  for (const u of splitIntoUnits(stripped).filter((u) => unitIsClaimable(u))) {
    if (COMPLETION.test(u)) return u;
  }
  return null;
}

// A terse liveness/works assertion with no flow noun in the unit ("both apps
// live and verified"). Narrow on purpose — it must NOT match an ordinary
// "✅ VERIFY: read the file" description, only an overclaim-shaped assertion.
const GENERIC_FLOW =
  /\b(live\s+and\s+verified|it\s+works\b|works\s+now|works\s+end[\s-]?to[\s-]?end|confirmed\s+working|fully\s+working|sign[\s-]?in\s+works|login\s+works|working\s+(now|end[\s-]?to[\s-]?end)|both\s+(apps\s+)?(live|working|verified))\b/i;
export function genericFlowClaimUnit(message: string): string | null {
  for (const u of splitIntoUnits(stripNoise(message)).filter((u) => unitIsClaimable(u))) {
    if (GENERIC_FLOW.test(u)) return u;
  }
  return null;
}

// ── State + telemetry ────────────────────────────────────────────────────────
function fingerprint(session: string, type: string, unit: string): string {
  return createHash("sha256").update(`${session}|${type}|${unit.toLowerCase().replace(/\s+/g, " ").trim()}`).digest("hex").slice(0, 16);
}
function alreadyBlocked(fp: string): boolean {
  try {
    if (!existsSync(STATE_PATH)) return false;
    const arr = JSON.parse(readFileSync(STATE_PATH, "utf-8")) as string[];
    return arr.includes(fp);
  } catch { return false; }
}
function recordBlocked(fp: string): void {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    let arr: string[] = [];
    if (existsSync(STATE_PATH)) { try { arr = JSON.parse(readFileSync(STATE_PATH, "utf-8")); } catch {} }
    arr.push(fp);
    if (arr.length > 400) arr = arr.slice(-400);
    writeFileSync(STATE_PATH, JSON.stringify(arr));
  } catch {}
}
function obs(rec: Record<string, unknown>): void {
  try { mkdirSync(dirname(OBS_PATH), { recursive: true }); appendFileSync(OBS_PATH, JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n"); } catch {}
}

const BLOCK_MSGS: Record<string, (unit: string, ev: string) => string> = {
  T1: (u, ev) => `WEB-DEPLOY VERIFICATION GAP [VerificationGate/T1]. You claimed: "${u}". The transcript shows the deployed thing was never probed after the deploy — ${ev}. Deployed ≠ live. Do ONE, then restate: (a) probe the deployed origin — an Interceptor navigate/screenshot of the live URL, or a curl returning 2xx/3xx — after the deploy; or (b) downgrade honestly ("deployed, not verified live"). This gate reads the transcript's real tool calls, not your wording — rewording won't pass it; verifying or downgrading will.`,
  T2: (u, ev) => `FLOW VERIFICATION GAP [VerificationGate/T2]. You claimed: "${u}". The transcript shows the flow was never exercised — ${ev}. A render/screenshot proves a page painted; it does NOT prove the flow works (this exact gap shipped a 500ing Apple login). Do ONE, then restate: (a) drive the real flow — navigate + interact (submit/consent) + read the post-action state, or hit the endpoint and show the 2xx/3xx + Set-Cookie/redirect; or (b) downgrade honestly ("deployed, flow NOT exercised", ISC [DEFERRED-VERIFY]). This gate reads the transcript, not your wording — only verifying or downgrading passes it.`,
  T3: (u, ev) => `APPEARANCE VERIFICATION GAP [VerificationGate/T3]. You claimed: "${u}". The transcript shows no pixel image was captured AND read after the last frontend edit — ${ev}. A DOM read proves an element exists; only a viewed pixel proves it LOOKS right (this shipped the wrong logo 3×). Capture a non-blank image, Read it, then restate — or downgrade ("placed, not pixel-viewed").`,
};

/** Type-scoped evidence evaluation. Extracted so the sub-agent bypass can compute
 * the same verdict it is about to skip and log the counterfactual (2026-07-31) —
 * previously the branch returned before any evaluation, so the size of the hole
 * was unmeasurable. Pure: reads events, touches no state. */
function evaluateClaim(
  claim: { type: Exclude<ClaimType, null>; unit: string },
  ev: TxEvent[],
): { acted: boolean; verified: boolean; evSummary: string } {
  if (claim.type === "T1") {
    return {
      acted: hadDeploy(ev),
      verified: probedAfterDeploy(ev),
      evSummary: `${ev.filter((e) => e.kind === "deploy").length} deploy(s), 0 post-deploy probe of the origin`,
    };
  }
  if (claim.type === "T2") {
    const caps = ev.filter((e) => e.kind === "interceptor-capture").length;
    const inter = ev.filter((e) => e.kind === "interceptor-interact").length;
    return {
      acted: hadCodeEdit(ev) || hadDeploy(ev),
      verified: flowExercised(ev),
      evSummary: `${caps} render capture(s), ${inter} interaction(s), 0 successful endpoint round-trip after the last change`,
    };
  }
  if (claim.type === "T3") {
    return {
      acted: hadFrontendEdit(ev),
      verified: pixelViewed(ev),
      evSummary: "no capture+Read of a pixel image after the last frontend edit",
    };
  }
  // T4 — log-only. T5 never reaches here; it resolves before the bypass.
  return { acted: hadCodeEdit(ev), verified: testPassedAfterEdit(ev), evSummary: "" };
}

/** Returns a decision object to emit, or null. Pure — no exit, no stdout. */
export async function run(input: NonNullable<Awaited<ReturnType<typeof readHookInput>>>): Promise<object | null> {
  if (process.env.VERIFGATE_OFF === "1") return null;
  if (input.stop_hook_active === true) { obs({ decision: "skip-recovery" }); return { continue: true }; }

  const message = input.last_assistant_message ?? "";
  if (!message.trim()) return null;
  const session = input.session_id ?? "unknown";

  // Whole-message honest-downgrade escape.
  if (HONEST_DOWNGRADE.test(stripNoise(message))) { obs({ decision: "pass-honest-downgrade" }); return null; }

  let ev: TxEvent[] = [];
  try { ev = parseTurnEvents(input.transcript_path); } catch { obs({ decision: "pass-transcript-error" }); return null; }

  // TF — contradicted completion (final tool event hard-failed, message says done).
  // Checked before type classification: the contradiction is more specific than
  // any T1-T4 typing of the same prose. Subagent confounder applies (the agent
  // may hold the recovery evidence); VERIFGATE_TF=0 kills it.
  if (process.env.VERIFGATE_TF !== "0" && !spawnedAgent(ev)) {
    const tfUnit = contradictedCompletionUnit(message, ev);
    if (tfUnit) {
      const fp = fingerprint(session, "TF", tfUnit);
      if (!alreadyBlocked(fp)) {
        recordBlocked(fp);
        obs({ decision: "block", type: "TF", unit: tfUnit });
        return {
          decision: "block",
          reason: `CONTRADICTED COMPLETION [VerificationGate/TF]. You claimed: "${tfUnit}" — but the turn's FINAL tool result is a hard failure (traceback / non-zero exit / not-found) with nothing succeeding after it. Either fix and re-run the failed step and show it passing, or state the failure honestly instead of claiming completion. This gate reads the transcript's real tool results — rewording won't pass it.`,
        };
      }
      obs({ decision: "pass-dedupe", type: "TF" });
    }
  }

  // T5 — publicity. Checked BEFORE the subagent bypass and WITHOUT act-then-claim,
  // both deliberately (2026-07-31):
  //   * No subagent bypass: there is no "the agent holds the evidence" story here.
  //     The cure is one git command the parent runs in five seconds. The incident
  //     that motivated T5 had TWO audit subagents running, neither of which had
  //     probed the repo either.
  //   * No act-then-claim: the other types require mutation before scrutiny, which
  //     is what killed their false positives. A publicity claim's failure mode is
  //     asserting WITHOUT acting — the failing turn deployed nothing and edited
  //     nothing, so an acted-gate would have passed it even with the bypass closed.
  // The FP surface that act-then-claim would have covered is bought back two ways:
  // session-window evidence (a probe earlier in the session counts), and log-only
  // until the corpus proves clean — arm with VERIFGATE_T5=1.
  if (process.env.VERIFGATE_T5 !== "off") {
    const pubUnit = publicityClaimUnit(message);
    if (pubUnit) {
      let sessionEv: TxEvent[] = [];
      try { sessionEv = parseTurnEvents(input.transcript_path, { sessionWindow: true }); } catch { sessionEv = ev; }
      if (publicStateProbed(sessionEv)) {
        obs({ decision: "pass-verified", type: "T5", unit: pubUnit });
      } else {
        const fp = fingerprint(session, "T5", pubUnit);
        if (alreadyBlocked(fp)) {
          obs({ decision: "pass-dedupe", type: "T5" });
        } else if (process.env.VERIFGATE_T5 === "logonly") {
          obs({ decision: "would-block-logonly", type: "T5", unit: pubUnit });
        } else {
          recordBlocked(fp);
          obs({ decision: "block", type: "T5", unit: pubUnit });
          return {
            decision: "block",
            reason: `UNPROBED PUBLICITY CLAIM [VerificationGate/T5]. You asserted: "${pubUnit}" — but nothing in this session probed the public surface (no git ls-remote, no gh api/release/repo, no github.com fetch). Public state is not knowable from a local checkout: a local clone can sit ahead of origin with commits that were never pushed, which is exactly how this gate's founding incident happened. Run the probe and cite it, or downgrade the claim ("staged", "pushed private", "local") or attribute it ("Max reports X"). This gate reads the transcript's real tool calls — rewording won't pass it.`,
          };
        }
      }
    }
  }

  let claim = classifyClaim(message);
  // Type a terse "live and verified" from what the session actually TOUCHED:
  // auth/flow edits ⇒ it's a flow claim. This is the Apple-miss catch.
  if (!claim || claim.type === "T1") {
    const gu = genericFlowClaimUnit(message);
    if (gu && hadFlowEdit(ev)) claim = { type: "T2", unit: gu };
  }
  if (!claim) { obs({ decision: "no-claim" }); return null; }

  // Per-type teeth switches: T4 log-only by default; T1-T3 block unless disabled.
  const blockingType = claim.type !== "T4" && process.env[`VERIFGATE_${claim.type}`] !== "0";

  // Confounder: a sub-agent this turn may hold the evidence in its own context.
  // Still passes for T1-T4 — a delegate that ran the deploy genuinely holds the
  // 200, and forcing a parent re-probe would tax delegation itself. But it now
  // logs the counterfactual first: `spawnedAgent` counts ANY Agent/Task event, so
  // one trivial Explore dispatch immunizes every claim in the turn, and telemetry
  // showed 29 pass-subagent events against 14 blocks ever. Whether to tighten this
  // (evidenceViaAgent in transcript-evidence.ts is the middle path, exported and
  // currently uncalled) is a decision to make on the corpus, not on instinct.
  if (spawnedAgent(ev)) {
    const cf = evaluateClaim(claim, ev);
    obs({
      decision: "pass-subagent", type: claim.type, unit: claim.unit,
      // The counterfactual: would this have blocked if no agent had run? Without
      // it the bypass is unmeasurable and the tighten/leave decision is instinct.
      wouldBlock: cf.acted && !cf.verified,
    });
    return null;
  }

  const { acted, verified, evSummary } = evaluateClaim(claim, ev);

  if (!acted) { obs({ decision: "pass-no-activity", type: claim.type }); return null; }
  if (verified) { obs({ decision: "pass-verified", type: claim.type }); return null; }

  // Evidence absent + acted this turn ⇒ candidate block.
  const fp = fingerprint(session, claim.type, claim.unit);
  if (alreadyBlocked(fp)) { obs({ decision: "pass-dedupe", type: claim.type }); return null; }

  if (!blockingType) { obs({ decision: "would-block-logonly", type: claim.type, unit: claim.unit }); return null; }

  recordBlocked(fp);
  obs({ decision: "block", type: claim.type, unit: claim.unit, evSummary });
  return { decision: "block", reason: BLOCK_MSGS[claim.type]!(claim.unit, evSummary) };
}

if (import.meta.main) {
  (async () => {
    const input = await readHookInput();
    if (input) {
      const d = await run(input);
      if (d) console.log(JSON.stringify(d));
    }
    process.exit(0);
  })().catch((err) => { console.error("[VerificationGate] fatal:", err); process.exit(0); });
}
