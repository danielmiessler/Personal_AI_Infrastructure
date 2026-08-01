/**
 * system-surfaces.ts — which files ARE "the system", and how a turn's changes
 * to them render as one line.
 *
 * Pure and dependency-free so it can be unit-tested without a hook harness.
 * The hook (SystemChangeSurface) owns I/O and turn state; this owns the rules.
 *
 * Doctrine: the ⚙️ SYSTEM line answers "did we change ourselves this turn, and
 * where" at a glance — the same job 🧠 MEMORY does for the autonomic memory
 * loop. Like that line, the STRING IS COMPUTED HERE and echoed verbatim by the
 * model; a model-computed status line failed compliance repeatedly in the
 * 2026-05-28 memory experiment and must never be reintroduced.
 *
 * Deliberately NOT surfaced: anything under LIFEOS/MEMORY/ that the autonomic
 * loop writes on its own. That is 🧠's territory, and duplicating it would turn
 * both lines into noise.
 */

export type SurfaceTier = "doctrine" | "identity" | "machinery" | "isa";

export interface Surface {
  tier: SurfaceTier;
  /** Short human label as it appears in the line. */
  label: string;
}

export interface ChangeEntry {
  tier: SurfaceTier;
  label: string;
  /** Optional trailing detail, e.g. an ISA claim delta. */
  detail?: string;
}

/** Path tails that identify identity/doctrine surfaces regardless of symlinks.
 *  LIFEOS/USER is a symlink into ~/.config/LIFEOS/USER, so a write may arrive
 *  under either spelling; matching the TAIL makes both resolve. */
const TAIL_SURFACES: Array<{ tail: string; tier: SurfaceTier; label: string }> = [
  { tail: "USER/PRINCIPAL/PRINCIPAL_IDENTITY.md", tier: "identity", label: "PRINCIPAL_IDENTITY" },
  { tail: "USER/PRINCIPAL/PRINCIPAL_MEMORY.md", tier: "identity", label: "PRINCIPAL_MEMORY" },
  { tail: "USER/PRINCIPAL/RESUME.md", tier: "identity", label: "RESUME" },
  { tail: "USER/PRINCIPAL/WRITINGSTYLE.md", tier: "identity", label: "WRITINGSTYLE" },
  { tail: "USER/DIGITAL_ASSISTANT/DA_IDENTITY.md", tier: "identity", label: "DA_IDENTITY" },
  { tail: "USER/DIGITAL_ASSISTANT/DA_MEMORY.md", tier: "identity", label: "DA_MEMORY" },
  { tail: "USER/CONFIG/OPERATIONAL_RULES.md", tier: "identity", label: "OPERATIONAL_RULES" },
  { tail: "USER/TELOS/TELOS.md", tier: "identity", label: "TELOS" },
  { tail: "USER/PROJECTS.md", tier: "identity", label: "PROJECTS" },
  { tail: "USER/CONTACTS.md", tier: "identity", label: "CONTACTS" },
  { tail: "USER/GEAR.md", tier: "identity", label: "GEAR" },
  { tail: "LIFEOS/LIFEOS_SYSTEM_PROMPT.md", tier: "doctrine", label: "SYSTEM_PROMPT" },
];

const basename = (p: string): string => p.split("/").pop() ?? p;

/**
 * Classify an absolute path. Returns null when the file is not a system
 * surface — ordinary project code, scratch files, and the memory tree all
 * return null.
 */
export function classifySurface(absPath: string, claudeRoot: string): Surface | null {
  if (!absPath) return null;
  const p = absPath.replace(/\/+$/, "");
  const base = basename(p);

  // ISA files are the state-of-record wherever they live — including project
  // repos outside ~/.claude, which is the case that matters most.
  if (base === "ISA.md" || base.endsWith(".isa.md")) {
    const parts = p.split("/");
    const parent = parts[parts.length - 2] ?? "isa";
    // A repo-root ISA takes the repo name; a nested one takes its folder.
    return { tier: "isa", label: parent };
  }

  for (const s of TAIL_SURFACES) {
    if (p.endsWith("/" + s.tail)) return { tier: s.tier, label: s.label };
  }

  // Everything below is scoped to the installation root.
  const root = claudeRoot.replace(/\/+$/, "");
  if (!p.startsWith(root + "/")) return null;
  const rel = p.slice(root.length + 1);

  // The autonomic memory tree belongs to the 🧠 line, not this one.
  if (rel.startsWith("LIFEOS/MEMORY/")) return null;

  if (rel === "CLAUDE.md") return { tier: "doctrine", label: "CLAUDE.md" };
  if (rel === "settings.json") return { tier: "machinery", label: "settings.json" };

  const algo = /^LIFEOS\/ALGORITHM\/(v[\d.]+)\.md$/.exec(rel);
  if (algo) return { tier: "doctrine", label: `ALGORITHM ${algo[1]}` };

  if (/^hooks\/[^/]+\.hook\.ts$/.test(rel)) {
    return { tier: "machinery", label: `hooks/${base.replace(/\.hook\.ts$/, "")}` };
  }
  if (/^hooks\/lib\/[^/]+\.ts$/.test(rel)) {
    return { tier: "machinery", label: `hooks/lib/${base.replace(/\.ts$/, "")}` };
  }

  const skill = /^skills\/([^/]+)\/SKILL\.md$/.exec(rel);
  if (skill) return { tier: "machinery", label: `skill:${skill[1]}` };

  if (/^LIFEOS\/TOOLS\/[^/]+\.ts$/.test(rel)) {
    return { tier: "machinery", label: `TOOLS/${base.replace(/\.ts$/, "")}` };
  }

  return null;
}

/** Count ISA claim checkboxes. Used to render a real progress delta. */
export function countClaims(body: string): { closed: number; open: number } {
  const closed = (body.match(/^- \[x\] /gm) ?? []).length;
  const open = (body.match(/^- \[ \] /gm) ?? []).length;
  return { closed, open };
}

const TIER_ORDER: SurfaceTier[] = ["isa", "doctrine", "identity", "machinery"];
const MAX_ITEMS = 6;

/**
 * Render the verbatim line. Returns null when nothing system-facing changed,
 * which is the common case and must stay silent.
 */
export function renderSystemLine(entries: ChangeEntry[]): string | null {
  if (entries.length === 0) return null;

  // Deduplicate by label, keeping the richest detail seen for it.
  const byLabel = new Map<string, ChangeEntry>();
  for (const e of entries) {
    const prior = byLabel.get(e.label);
    if (!prior || (!prior.detail && e.detail)) byLabel.set(e.label, e);
  }

  const sorted = [...byLabel.values()].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.label.localeCompare(b.label),
  );

  const shown = sorted.slice(0, MAX_ITEMS).map((e) => {
    const name = e.tier === "isa" ? `ISA ${e.label}` : e.label;
    return e.detail ? `${name} ${e.detail}` : name;
  });
  const overflow = sorted.length - shown.length;
  if (overflow > 0) shown.push(`+${overflow} more`);

  return `⚙️ SYSTEM: ${shown.join(" · ")}`;
}
