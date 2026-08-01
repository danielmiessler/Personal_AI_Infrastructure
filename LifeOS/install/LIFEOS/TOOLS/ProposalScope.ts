#!/usr/bin/env bun
/**
 * @version 1.0.0
 * ProposalScope — the one deterministic answer to "who needs this rule loaded?"
 *
 * The memory reviewer classifies a proposal by KIND (what it is about: an
 * operational rule, an identity fact, a style correction). Kind decides which
 * curated file a proposal belongs to. It says nothing about SCOPE — whether the
 * rule is global doctrine or scoped to one skill, one project, or one hook.
 *
 * Without a scope axis every rule-shaped signal lands in OPERATIONAL_RULES.md,
 * which is @-imported on EVERY turn. Audit 2026-07-31: of the 10 entries in that
 * file's proposals tail, 7 were skill- or project-scoped (FTC disclosure →
 * _SOCIALPOST, Discussions triage → _LIFEOS, portal onboarding → Vector) and 2
 * were already absorbed into the body. One was genuinely global. The always-on
 * context was paying ~4.9KB per turn to carry rules almost none of it needed.
 *
 * Scope is decided by NAME MATCH against what actually exists on disk — a real
 * skill directory, a real hook file, a real project row. That makes it precise
 * and unable to drift: a renamed skill stops matching rather than matching wrong.
 * There is no inference, no model call, no keyword heuristic for "feels scoped."
 *
 * Consumed by MemorySystem.add() as a WRITE-time gate (the primary defense) and
 * by ProposalGC --route as a post-hoc advisory (the backstop for what predates
 * the gate). Both import from here so the two answers can never disagree.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const CLAUDE_DIR = join(dirname(new URL(import.meta.url).pathname), "..", "..");

export type ProposalScope = "global" | "skill" | "project" | "hook";

export interface ScopeVerdict {
  scope: ProposalScope;
  /** The named skill dir / hook basename / project name. Empty for global. */
  dest: string;
  /** Why this verdict — carried into logs and Upgrades records. */
  reason: string;
}

/**
 * A hook name alone is not enough. An entry that merely mentions a hook in a
 * design record ("...surfaced by SystemChangeSurface") is still global doctrine;
 * only an entry CLAIMING the hook enforces the rule can have its prose deleted.
 * Same test ProposalGC has used since its routing leg shipped.
 */
const ENFORCES = /\b(enforc|block[s|ed]?|reject|gate[sd]?|rewrite|hard[- ]?stop|refus)/i;

/** Hook basenames present under hooks/ (e.g. "VerificationGate"). */
export function listHooks(): string[] {
  try {
    return readdirSync(join(CLAUDE_DIR, "hooks"))
      .filter((f) => f.endsWith(".hook.ts"))
      .map((f) => f.replace(/\.hook\.ts$/, ""));
  } catch { return []; }
}

/** Skill dir names present under skills/ (e.g. "_VIDEO", "Research"). */
export function listSkills(): string[] {
  try {
    return readdirSync(join(CLAUDE_DIR, "skills"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch { return []; }
}

/**
 * Project names from the PROJECTS.md routing table's bolded first column.
 * Read from the file rather than hardcoded so a new project is scopeable the
 * moment it has a row — the table is already the registry, so this adds no
 * second place to update.
 */
export function listProjects(): string[] {
  const path = join(CLAUDE_DIR, "LIFEOS/USER/PROJECTS.md");
  if (!existsSync(path)) return [];
  try {
    const names = new Set<string>();
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.startsWith("|")) continue;
      const m = line.match(/^\|\s*\*\*([^*|]{2,40})\*\*/);
      if (m) names.add(m[1].trim());
    }
    return [...names];
  } catch { return []; }
}

export interface ScopeTables {
  hooks: string[];
  skills: string[];
  projects: string[];
}

/** Read the on-disk tables once, for callers classifying many entries. */
export function loadScopeTables(): ScopeTables {
  return { hooks: listHooks(), skills: listSkills(), projects: listProjects() };
}

/**
 * A universal rule over a generic class is global doctrine, whatever names it
 * cites. "Any production app (e.g. Surface) failing to update must alert" is a
 * rule about production apps; Surface is the example that motivated it. Reading
 * that as Surface-scoped would file global doctrine under one project and lose
 * it for every other app.
 *
 * This encodes the system's own constitutional line — universal claims beat
 * example claims — as the FIRST test, because proposal prose written by the
 * reviewer almost always carries its motivating incident along with the rule.
 */
const UNIVERSAL = /\b(any|every|all|each)\s+(?:[a-z-]+\s+){0,3}(app|apps|site|sites|project|projects|repo|repos|post|posts|subsystem|subsystems|deploy|deploys|worker|workers|page|pages|skill|skills|run|runs|claim|claims|file|files|service|services|command|commands|rule|rules|change|changes|state|states|status|content)\b/i;

/**
 * Markers that demote a following name from "the scope" to "an example".
 * Matched immediately before the name, so only a genuinely exemplifying mention
 * is suppressed.
 */
const EXAMPLE_MARKERS = /(?:e\.?g\.?|i\.?e\.?|such as|including|starting with|like|for example|for instance|the same way|similar to)[\s:,]*$/i;

/** True when every occurrence of `name` in `text` is preceded by an example marker. */
function onlyExemplified(text: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${esc}\\b`, "g");
  let m: RegExpExecArray | null;
  let seen = false;
  while ((m = re.exec(text)) !== null) {
    seen = true;
    // Look back a short window — enough for "(e.g. " or "such as ", not a clause.
    const before = text.slice(Math.max(0, m.index - 24), m.index).replace(/[("'\[]\s*$/, "");
    if (!EXAMPLE_MARKERS.test(before)) return false; // a real, scoping mention
  }
  return seen;
}

/**
 * True when `name` is the grammatical subject of an obligation — the entry
 * naming its own owner. Matches "<Name> ... must/should/never/always ..." within
 * a short window, and the possessive form ("Vector's portal invites are never
 * sent"), which is how the reviewer phrases project-owned rules.
 *
 * The window is deliberately short: a long gap means the obligation belongs to
 * some other subject and the name is incidental.
 */
function isObligationSubject(text: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Project and skill names are PROPER NOUNS — matched case-sensitively, always.
  // Case-insensitive matching read "any status that appears in more than one UI
  // surface must…" as the Surface project owning the rule, which is how a
  // universal doctrine line nearly got filed under one app.
  const nameRe = new RegExp(`\\b${esc}(?:'s)?\\b`, "g");
  const OBLIGATION = /^[^.;]{0,60}?\s(?:must|should|needs? to|is required to|are required to|is never|are never|is always|are always|never|always)\b/i;
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(text)) !== null) {
    if (OBLIGATION.test(text.slice(m.index + m[0].length))) return true;
  }
  return false;
}

/**
 * True when `name` appears only inside an enumeration of three or more names —
 * "(Bunker, Arbol, Pulse, Memory, Hooks, Algorithm)". An enumeration is a list
 * of instances the rule ranges over, which makes the rule global, not owned by
 * whichever name happens to be first.
 */
function inEnumeration(text: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A comma/slash-separated run of 3+ capitalized-or-underscored tokens containing `name`.
  const listRe = /(?:[A-Z_][A-Za-z0-9_]*)(?:\s*[,/]\s*(?:[A-Z_][A-Za-z0-9_]*)){2,}/g;
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(text)) !== null) {
    if (new RegExp(`\\b${esc}\\b`).test(m[0])) return true;
  }
  return false;
}

function matchesSkill(text: string, skill: string): boolean {
  // `_ALLCAPS` skills are unambiguous tokens; plain-named ones (Research, Art)
  // are common English words, so they only count with the word "skill" attached.
  return skill.startsWith("_")
    ? new RegExp(`\\b${skill}\\b`).test(text)
    : new RegExp(`\\b${skill}\\s+(skill|workflow)\\b`, "i").test(text);
}

function matchesProject(text: string, project: string): boolean {
  // Project names are title-case phrases; require a word-boundary match on the
  // full name so "Vector" hits but "vectorize" does not.
  const esc = project.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${esc}\\b`).test(text);
}

/**
 * Classify one proposal's text. Precedence is deliberate:
 *   hook  — the rule is already machine-enforced; prose is redundant
 *   skill — one capability owns it
 *   project — one repo owns it
 *   global — nothing on disk claims it, so it stays doctrine
 *
 * Hook wins over skill because enforcement beats relocation: if a gate already
 * blocks the behavior, moving the sentence to a SKILL.md just relocates dead
 * weight. Global is the FALLTHROUGH, never a positive match — the burden is on
 * scoping, so an unrecognized rule keeps its current home and nothing silently
 * disappears from always-on context.
 */
export function classifyScope(text: string, tables?: ScopeTables): ScopeVerdict {
  const t = tables ?? loadScopeTables();

  // A hook that ENFORCES the rule makes the prose redundant regardless of scope.
  const hook = t.hooks.find((h) => new RegExp(`\\b${h}\\b`).test(text));
  if (hook && ENFORCES.test(text)) {
    return { scope: "hook", dest: hook, reason: `names ${hook} as the enforcer — the hook is the rule` };
  }

  // STRONG signal: the name is the subject of an obligation ("the _SOCIALPOST
  // workflow must enforce…", "Vector's portal invites are never sent…"). That is
  // the entry naming its own owner, and it outranks the universal test — a rule
  // can be universal over posts and still be owned by the posting skill.
  // An exemplified mention can sit close enough to a "must" to look like a
  // subject ("any production app (e.g. Surface) failing … must alert"), so the
  // example test gates the strong signal too.
  const owned =
    t.skills.find((s) => isObligationSubject(text, s) && matchesSkill(text, s) && !onlyExemplified(text, s)) ??
    t.projects.find((p) => isObligationSubject(text, p) && !onlyExemplified(text, p));
  if (owned) {
    const kind = t.skills.includes(owned) ? "skill" : "project";
    return {
      scope: kind as ProposalScope,
      dest: owned,
      reason: `${owned} is the subject of the obligation — it owns this rule`,
    };
  }

  // A universal rule over a generic class is doctrine; any names left in it are
  // examples or mechanisms, not owners.
  if (UNIVERSAL.test(text)) {
    return { scope: "global", dest: "", reason: "states a universal rule over a generic class — names in it are examples" };
  }

  // WEAKER signal: the name simply dominates the entry. Require a non-exemplified
  // mention AND that it is not one item in an enumeration, because routing a
  // global rule into a project file LOSES it, while leaving a scoped rule in
  // doctrine only costs context. Precision over recall, deliberately.
  const skill = t.skills.find((s) => matchesSkill(text, s) && !onlyExemplified(text, s) && !inEnumeration(text, s));
  if (skill) {
    return { scope: "skill", dest: skill, reason: `scoped to the ${skill} skill — belongs in its SKILL.md` };
  }

  const project = t.projects.find((p) => matchesProject(text, p) && !onlyExemplified(text, p) && !inEnumeration(text, p));
  if (project) {
    return { scope: "project", dest: project, reason: `scoped to ${project} — belongs in its ISA or repo CLAUDE.md` };
  }

  return { scope: "global", dest: "", reason: "no skill, project, or enforcing hook named — genuinely global" };
}

/** True when a proposal may be written into an always-loaded context file. */
export function isAlwaysLoadedEligible(text: string, tables?: ScopeTables): boolean {
  return classifyScope(text, tables).scope === "global";
}

// ── CLI ────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const text = args.filter((a) => !a.startsWith("--")).join(" ");
  if (!text) {
    console.log("usage: bun ProposalScope.ts \"<proposal text>\" [--json]");
    process.exit(2);
  }
  const v = classifyScope(text);
  if (json) console.log(JSON.stringify(v, null, 2));
  else console.log(`${v.scope}${v.dest ? ` → ${v.dest}` : ""}  (${v.reason})`);
}
