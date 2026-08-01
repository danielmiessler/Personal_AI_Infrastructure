// containment-zones.ts — release-pipeline zone inventory.
//
// A zone is a named set of path patterns whose contents are allowed to contain
// personal identity, credentials, or infrastructure IDs. Anything outside every
// zone must stay clean per LIFEOS/DOCUMENTATION/Tools/Containment.md.
//
// Consumed by two enforcement points:
//   1. Release pipeline gates in the release tooling (build-time).
//   2. hooks/SystemFileGuard.hook.ts (runtime PreToolUse Write/Edit/MultiEdit
//      gate, restored 2026-05-21 in Phase E of the system/user separation
//      rebuild). The hook reads CONTAINMENT_ZONES via isContained() to decide
//      whether a target path is USER (allowed to hold identity) or SYSTEM
//      (must be deny-list clean).
// The 2026-05-06 "ContainmentGuard removed" note no longer applies — the
// guard came back as SystemFileGuard with a tighter scope (writes only,
// fail-safe-open, USER-zone no-op).
//
// Path patterns are matched relative to CLAUDE_ROOT (the .claude directory
// root, resolved from HOME). `**` means "anywhere under this prefix". A bare
// path means "this exact file or directory (and anything inside it)".

export interface ContainmentZone {
  name: string;
  patterns: readonly string[];
  description: string;
}

export const CONTAINMENT_ZONES: readonly ContainmentZone[] = [
  {
    name: "user-data",
    patterns: ["LIFEOS/USER/**"],
    description: "Principal identity, TELOS, credentials, personal infrastructure, contacts, finances, health, business",
  },
  {
    name: "config-secrets",
    patterns: [
      "settings.json",
      "settings.local.json",
      ".vscode/settings.json",
      ".env",
      ".env.*",
      "LIFEOS/.env",
      "LIFEOS/.env.*",
    ],
    description: "Shell env with API keys, allowed command lists, MCP auth",
  },
  {
    name: "runtime-memory",
    patterns: ["LIFEOS/MEMORY/**"],
    description: "Work sessions, learnings, observability logs, research, raw data, bookmarks, relationship notes",
  },
  {
    name: "private-skills",
    patterns: ["skills/_*/**"],
    description: "Skills with underscore-prefixed names — personal and proprietary",
  },
  {
    name: "install-state",
    patterns: [
      "history.jsonl",
      "Plugins/**",
      "Plugins/installed_plugins.json",
      "Plugins/known_marketplaces.json",
      "debug/**",
      "debug",
    ],
    description: "Claude Code runtime install state written by the harness — plugin registry, history, and debug/ session transcripts (the debug/latest symlink and per-session .txt dumps; runtime output, never ships)",
  },
  {
    name: "private-infra",
    patterns: [
      "LIFEOS/ARBOL/**",
      "LIFEOS/PULSE/Assistant/state/**",
      "LIFEOS/PULSE/Plans/**",
      "LIFEOS/PULSE/logs/**",
      "LIFEOS/PULSE/state/**",
      "LIFEOS/PULSE/Observability/out/**",
      "LIFEOS/PULSE/.playwright-cli/**",
      "LIFEOS/PULSE/Bunker/**",
      "LIFEOS/ScheduledTasks/**",
    ],
    description: "Top-level private infrastructure dirs: cloud worker code, Assistant runtime state (diary jsonl), planning docs, runtime logs/state, rendered HTML, Bunker app-harness code (personal probe targets + alert email; concept ships via DOCUMENTATION, impl stays private)",
  },
  {
    name: "pre-sanitization-backups",
    patterns: [
      "LIFEOS/Backups/**",
    ],
    description: "Pre-sanitization snapshots of SYSTEM files (e.g. LIFEOS_SYSTEM_PROMPT pre-restructure copies). Legitimately retain identity literals from before sanitization; never ship publicly. Already excluded from staging by RSYNC_EXCLUDES — this zone makes DenyListCheck classify them as private-zone rather than real-leak.",
  },
  {
    name: "skill-runtime-data",
    patterns: [
      "skills/*/profile-data/**",
      "skills/*/state/**",
      "skills/*/cache/**",
      "skills/*/.playwright-cli/**",
      "skills/*/.cache/**",
      "skills/*/node_modules/**",
    ],
    description: "Runtime data accumulated under public-named skills — Chrome profiles (Interceptor), per-skill caches, state JSONLs, build artifacts. These directories collect secrets and machine-bound state during normal use and must never ship publicly even though their parent skill is TitleCase (public).",
  },
  {
    name: "security-sdk-runtime",
    patterns: [
      "security/**",
    ],
    description: "Agent-SDK runtime/bootstrap state for security skills — python venv (agent-sdk-venv), .sdk_bootstrap_spawned marker, warning-state JSON, lock files, log.txt. Untracked machine-bound build artifacts; never ship. (Zoned 2026-05-31 after a shadow release surfaced the unzoned venv tripping G4/G13.)",
  },
];

// Files outside containment that must still be allowed to embed patterns
// (pattern inspectors, policy docs that describe the patterns, etc.). Keep
// minimal — these are tracked in the living appendix of CONTAINMENT_POLICY.md.
export const PATTERN_ALLOWLIST_FILES: readonly string[] = [
  "hooks/lib/containment-zones.ts",
  "skills/_LIFEOS/Tools/ShadowRelease.ts",
  "LIFEOS/DOCUMENTATION/Tools/Containment.md",
  // skills/Daemon/Docs/SecurityClassification.md REMOVED 2026-05-04 — the doc
  // was rewritten to use categorical descriptions only (no literal names /
  // projects / paths) so it no longer needs to embed identity strings. G2 +
  // the sanitizer now cover it like any other public file. If identity tokens
  // ever land here again, the gate trips — by design.
  "skills/Daemon/Tools/SecurityFilter.ts",
  "skills/CreateSkill/Workflows/ValidateSkill.md",
  "LIFEOS/TOOLS/SessionHarvester.ts",
  "LIFEOS/TOOLS/gmail.ts",
  // SystemFileGuard test file legitimately embeds deny-list pattern literals
  // as test fixtures — the whole point is verifying the gate catches them.
  "hooks/SystemFileGuard.test.ts",
  // 2026-07-20 — the public install flow embeds the public install URL
  // (curl -fsSL https://ourlifeos.ai/install.sh) BY DESIGN: ourlifeos.ai is
  // the public marketing/install domain, and these files are the shipped
  // install path + brand-asset doc. Reviewed hit-by-hit before allowlisting;
  // only the ourlifeos.ai pattern fires in them.
  "skills/LifeOS/SKILL.md",
  "skills/LifeOS/INSTALL.md",
  "skills/LifeOS/install/install.sh",
  // The public repo README (template overlay lands at staging root README.md).
  // Author attribution — blog/social links, contributor credits — is BY DESIGN
  // here and already public on github.com/danielmiessler/LifeOS; the star-history
  // README refresh (2026-07-17) made G2 fire on it. Allowlisting also skips the
  // token sanitizer so the links ship intact. (Principal approved 2026-07-21.)
  "README.md",
  "LIFEOS/DOCUMENTATION/BrandAssets.md",
  // Fabric quiz/answer patterns that legitimately use "unsupervised learning"
  // as ML terminology (not as a brand name). Allowed past G2.
  "skills/Fabric/Patterns/create_quiz/README.md",
  "skills/Fabric/Patterns/analyze_answers/README.md",
  // Phase G.5 (added 2026-05-25 after Forge iter-4) — files that legitimately
  // embed pattern literals as functional or doctrine content:
  //   - DocsPublicAudit.ts defines the patterns it audits
  //   - CLAUDE.md (live) gets overlaid by RELEASE_TEMPLATES/CLAUDE.public.md
  //     at build time — the live form ships only to the principal; the public
  //     ship is the template overlay. Verified: staged CLAUDE.md is clean.
  // NOTE (Phase G.6, 2026-05-25 after Forge iter-5): `LIFEOS/TOOLS/LifeosUpgrade.ts`
  // and `LIFEOS/PULSE/Tools/ReleaseAudit.ts` were REMOVED from this allowlist.
  // LifeosUpgrade.ts now uses a generic marker comment instead of the previous
  // principal-bound repo-name literal; ReleaseAudit.ts now loads its prohibited
  // strings from a USER-zone config file at runtime (never ships publicly).
  // Allowlist became an escape hatch hiding real bare-token leaks — fixed at
  // the source instead.
  "LIFEOS/TOOLS/DocsPublicAudit.ts",
  "CLAUDE.md",
];

// Component-wise glob match. Handles `*` within a single path segment and
// `**` as a terminal wildcard meaning "any remaining components, including zero".
function componentMatch(component: string, glob: string): boolean {
  if (glob === "*") return true;
  if (!glob.includes("*")) return component === glob;
  const parts = glob.split("*");
  if (!component.startsWith(parts[0])) return false;
  let cursor = parts[0].length;
  for (let i = 1; i < parts.length - 1; i += 1) {
    const idx = component.indexOf(parts[i], cursor);
    if (idx < 0) return false;
    cursor = idx + parts[i].length;
  }
  const tail = parts[parts.length - 1];
  if (tail === "") return true;
  return component.endsWith(tail) && component.length >= cursor + tail.length;
}

function matchesPattern(relPath: string, pattern: string): boolean {
  const patternParts = pattern.split("/");
  const pathParts = relPath === "" ? [] : relPath.split("/");
  let pi = 0;
  let i = 0;
  while (pi < patternParts.length) {
    const pp = patternParts[pi];
    if (pp === "**") return true;
    if (i >= pathParts.length) return false;
    if (!componentMatch(pathParts[i], pp)) return false;
    pi += 1;
    i += 1;
  }
  return i === pathParts.length;
}

// Normalize an absolute path to the path relative to CLAUDE_ROOT. Returns
// the input unchanged if it does not live under CLAUDE_ROOT.
export function relativeToClaudeRoot(absolutePath: string, claudeRoot: string): string {
  if (absolutePath === claudeRoot) return "";
  const prefix = claudeRoot.endsWith("/") ? claudeRoot : claudeRoot + "/";
  return absolutePath.startsWith(prefix) ? absolutePath.slice(prefix.length) : absolutePath;
}

// Predicate: is this path inside any configured containment zone?
export function isContained(absolutePath: string, claudeRoot: string): boolean {
  const rel = relativeToClaudeRoot(absolutePath, claudeRoot);
  for (const zone of CONTAINMENT_ZONES) {
    for (const pattern of zone.patterns) {
      if (matchesPattern(rel, pattern)) return true;
    }
  }
  return false;
}

// Predicate: is this relative path in the pattern-embedding allowlist?
export function isPatternAllowlisted(relativePath: string): boolean {
  return PATTERN_ALLOWLIST_FILES.includes(relativePath);
}
