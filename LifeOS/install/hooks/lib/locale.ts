/**
 * locale.ts — Generic locale-bundle lookup, generalized out of work-strings.ts's
 * Work-System-specific design contract (LifeOS#1695) so any surface can adopt
 * per-key translation without inventing its own loader.
 *
 * Two lookup shapes, because prose and vocabulary need opposite fallback
 * semantics:
 *
 *   - `t()` is OVERRIDE. A locale bundle replaces the caller's default string
 *     for a key it translates; the caller supplies the default (there is no
 *     baked-in EN dictionary here — that's owned per-surface, same as
 *     work-strings.ts owns its own `EN` for Work System issue bodies).
 *   - `tList()` is UNION. A locale bundle's array values are ADDED to the
 *     caller's own list, never replacing it — a Japanese locale should still
 *     recognize "perfect" as praise, not lose English vocabulary by opting
 *     into `ja`. This is what makes "locale unset → byte-identical output"
 *     provable by construction: with no bundle, `tList()` returns `[]` and
 *     the caller's own English list is untouched.
 *
 * `resolveLang()` priority: explicit arg > LIFEOS_CONFIG.toml [principal].language
 * > WORK.ISSUE_LANGUAGE (USER/WORK/config.yaml — the Work System's existing
 * locale switch, read independently here so a principal who already set it
 * for issue bodies gets it for free elsewhere) > "en". Every step is
 * try/catch-guarded; a missing or malformed config file falls through to the
 * next step rather than throwing — same fail-open contract work-strings.ts
 * uses for locale bundles themselves.
 *
 * Locale files live at `<userDir>/CONFIG/locales/<lang>.json` (same file
 * work-strings.ts reads), resolved via `paiUserDir()` — never a literal
 * `LIFEOS/USER/...` string (LIFEOS/DOCUMENTATION/SystemUserBoundary.md §
 * INTERFACE).
 */

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { loadLifeosConfig, paiUserDir } from "../../LIFEOS/TOOLS/LifeosConfig";

const LIFEOS_DIR = process.env.LIFEOS_DIR || join(process.env.HOME || homedir(), ".claude", "LIFEOS");
const WORK_CONFIG_YAML_PATH = join(LIFEOS_DIR, "USER", "WORK", "config.yaml");

/**
 * Reads `WORK.ISSUE_LANGUAGE` directly from config.yaml. Deliberately not
 * shared with hooks/lib/work-config.ts's `loadIssueLanguage()` (which parses
 * the same key) — that loader is scoped to the Work System's own config
 * object and isn't exported; duplicating one regex here keeps this module
 * standalone rather than reaching into Work System internals for one value.
 */
function loadWorkIssueLanguage(): string | null {
  if (!existsSync(WORK_CONFIG_YAML_PATH)) return null;
  try {
    const yaml = readFileSync(WORK_CONFIG_YAML_PATH, "utf-8");
    const m = yaml.match(/^\s*ISSUE_LANGUAGE:\s*(.+?)\s*$/m);
    if (!m) return null;
    const val = m[1].replace(/^["']|["']$/g, "").trim();
    return val || null;
  } catch {
    return null;
  }
}

export function resolveLang(explicit?: string): string {
  if (explicit) return explicit;
  try {
    const cfgLang = loadLifeosConfig().principal.language;
    if (cfgLang) return cfgLang;
  } catch {
    // Missing/invalid LIFEOS_CONFIG.toml — fall through to WORK.ISSUE_LANGUAGE / en.
  }
  return loadWorkIssueLanguage() ?? "en";
}

// One-entry-per-lang cache for the current process (hooks are short-lived,
// so this only saves repeat lookups within a single invocation).
const bundleCache = new Map<string, Record<string, unknown> | null>();

function loadLocaleBundle(lang: string): Record<string, unknown> | null {
  if (!lang || lang === "en") return null;
  if (bundleCache.has(lang)) return bundleCache.get(lang)!;
  let bundle: Record<string, unknown> | null = null;
  try {
    const path = join(paiUserDir(), "CONFIG", "locales", `${lang}.json`);
    if (existsSync(path)) {
      const raw = JSON.parse(readFileSync(path, "utf-8"));
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        bundle = raw as Record<string, unknown>;
      }
    }
  } catch {
    bundle = null;
  }
  bundleCache.set(lang, bundle);
  return bundle;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name) => {
    const v = vars[name];
    return v === undefined ? whole : String(v);
  });
}

/**
 * Resolves `key` for `lang`, falling back to `fallback` for missing locales,
 * missing files, malformed JSON, a non-string value, or a lang of "en".
 * Never throws.
 */
export function t(
  lang: string,
  key: string,
  fallback: string,
  vars: Record<string, string | number> = {},
): string {
  const bundle = loadLocaleBundle(lang);
  const raw = bundle && typeof bundle[key] === "string" ? (bundle[key] as string) : fallback;
  return interpolate(raw, vars);
}

/**
 * Returns the locale bundle's array value for `key`, or `[]` if the locale,
 * file, key, or value shape doesn't resolve. The caller unions this with its
 * own default list — see the module doc comment for why union (not
 * override) is the correct semantics for vocabulary lists. Never throws.
 */
export function tList(lang: string, key: string): string[] {
  const bundle = loadLocaleBundle(lang);
  const v = bundle?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

// ── CLI smoke ────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const [lang, key, fallback] = process.argv.slice(2);
  if (!lang || !key) {
    console.log("usage: bun locale.ts <lang> <key> [fallback] | bun locale.ts <lang> --list <key>");
    process.exit(1);
  }
  if (key === "--list") {
    console.log(JSON.stringify(tList(lang, fallback)));
  } else {
    console.log(t(lang, key, fallback ?? key));
  }
}
