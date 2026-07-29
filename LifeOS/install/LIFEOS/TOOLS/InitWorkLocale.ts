#!/usr/bin/env bun
/**
 * InitWorkLocale.ts — Scaffold / audit a Work System issue-text locale file.
 *
 * The Work System (WorkSweep.ts, ReminderRouter.hook.ts) routes every string it
 * writes into a GitHub issue body through `hooks/lib/work-strings.ts`'s `t()`.
 * That module ships one built-in bundle (English) and falls back to it key-by-key
 * for any locale file that doesn't cover every key. This CLI generates and
 * maintains those locale files so nobody hand-writes JSON against a key set
 * they have to keep in sync with the code by memory.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/InitWorkLocale.ts <lang>            # scaffold
 *   bun ~/.claude/LIFEOS/TOOLS/InitWorkLocale.ts <lang> --force    # overwrite
 *   bun ~/.claude/LIFEOS/TOOLS/InitWorkLocale.ts <lang> --check    # report drift only
 *   bun ~/.claude/LIFEOS/TOOLS/InitWorkLocale.ts --list            # enumerate + coverage
 *
 * <lang> is a BCP-47-ish code (e.g. "ja", "de", "pt-BR", "zh-Hant") — validated
 * before it ever touches a path, since the argument becomes a filename.
 *
 * This tool never edits `WORK.ISSUE_LANGUAGE` in config.yaml — that's the
 * principal's call, made after reviewing the translation, not this script's.
 *
 * Zero LLM calls — pure deterministic file generation, same as BootstrapLabels.ts
 * and WorkSweep.ts (gh + fs, nothing else). Always exits non-zero on a real
 * problem; this is an interactive setup tool, not a fire-and-forget hook, so
 * unlike WorkSweep/ReminderRouter it's fine — expected — for it to fail loudly.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, resolve, sep } from "path";
import { EN } from "../../hooks/lib/work-strings";
import { paiUserDir } from "./LifeosConfig";

// Locale codes become filenames — reject anything that isn't a plain BCP-47-ish
// tag before it ever reaches a path. No `/`, `.`, or whitespace can survive this,
// which rules out path traversal (`../../evil`) structurally, not just by convention.
const LANG_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function localesDir(): string {
  return join(paiUserDir(), "CONFIG", "locales");
}

// Defense in depth on top of LANG_RE: confirm the resolved path is still inside
// the locales directory before any write. Belt-and-suspenders against a future
// regex loosening bug, not because LANG_RE alone is expected to fail.
function localePath(lang: string): string {
  const resolvedDir = resolve(localesDir());
  const target = resolve(join(resolvedDir, `${lang}.json`));
  if (target !== join(resolvedDir, `${lang}.json`) || !target.startsWith(resolvedDir + sep)) {
    console.error(`InitWorkLocale: refusing unsafe path for lang "${lang}"`);
    process.exit(1);
  }
  return target;
}

function loadLocaleFile(path: string): Record<string, string> | null {
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, string>;
    return null;
  } catch {
    return null;
  }
}

function scaffold(lang: string, force: boolean): void {
  const path = localePath(lang);
  if (existsSync(path) && !force) {
    console.error(`InitWorkLocale: ${path} already exists — pass --force to overwrite (this will not lose keys you haven't touched; re-run --check first if unsure)`);
    process.exit(1);
  }
  mkdirSync(localesDir(), { recursive: true });
  // Full copy of EN, not an empty stub — every key is valid the moment it's
  // written (identical output to "en" until a key is hand-translated), and
  // translators have the source string right next to the key they're editing.
  const payload = JSON.stringify(EN, Object.keys(EN).sort(), 2) + "\n";
  writeFileSync(path, payload);
  console.log(`InitWorkLocale: wrote ${path} (${Object.keys(EN).length} keys, all English placeholders)`);
  console.log(`Next: translate the values you want in ${path}, then set WORK.ISSUE_LANGUAGE: ${lang} in USER/WORK/config.yaml`);
}

function check(lang: string): void {
  const path = localePath(lang);
  const bundle = loadLocaleFile(path);
  if (!bundle) {
    console.error(`InitWorkLocale: ${path} does not exist or is not valid JSON — nothing to check`);
    process.exit(1);
  }
  const enKeys = new Set(Object.keys(EN));
  const bundleKeys = new Set(Object.keys(bundle));
  const missing = [...enKeys].filter((k) => !bundleKeys.has(k)).sort();
  const extra = [...bundleKeys].filter((k) => !enKeys.has(k)).sort();
  const translated = [...bundleKeys].filter((k) => enKeys.has(k) && bundle[k] !== EN[k]).length;

  console.log(`${path}`);
  console.log(`  keys: ${bundleKeys.size} in file, ${enKeys.size} in code`);
  console.log(`  translated: ${translated}/${enKeys.size} (differ from English default)`);
  if (missing.length > 0) {
    console.log(`  missing (falls back to English): ${missing.join(", ")}`);
  } else {
    console.log(`  missing: none`);
  }
  if (extra.length > 0) {
    console.log(`  extra (unused by current code, safe to remove): ${extra.join(", ")}`);
  } else {
    console.log(`  extra: none`);
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log(`  in sync with hooks/lib/work-strings.ts EN bundle`);
  }
}

function list(): void {
  const dir = localesDir();
  if (!existsSync(dir)) {
    console.log(`No locale files yet — ${dir} does not exist.`);
    console.log(`Run: bun ~/.claude/LIFEOS/TOOLS/InitWorkLocale.ts <lang>`);
    return;
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    console.log(`No locale files in ${dir} yet.`);
    return;
  }
  const enKeys = new Set(Object.keys(EN));
  for (const f of files) {
    const lang = f.replace(/\.json$/, "");
    const bundle = loadLocaleFile(join(dir, f));
    if (!bundle) {
      console.log(`${lang}: unreadable/invalid JSON — falls back entirely to English`);
      continue;
    }
    const translated = Object.keys(bundle).filter((k) => enKeys.has(k) && bundle[k] !== EN[k]).length;
    console.log(`${lang}: ${translated}/${enKeys.size} keys translated (${Math.round((translated / enKeys.size) * 100)}%)`);
  }
}

function usage(): never {
  console.error([
    "usage:",
    "  bun InitWorkLocale.ts <lang>            scaffold USER/CONFIG/locales/<lang>.json",
    "  bun InitWorkLocale.ts <lang> --force     overwrite an existing locale file",
    "  bun InitWorkLocale.ts <lang> --check     report missing/extra keys, don't write",
    "  bun InitWorkLocale.ts --list             enumerate installed locales + coverage",
  ].join("\n"));
  process.exit(1);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--list")) {
    list();
    return;
  }
  const lang = argv[0];
  if (!lang || lang.startsWith("--")) usage();
  if (!LANG_RE.test(lang)) {
    console.error(`InitWorkLocale: "${lang}" doesn't look like a locale code (expected e.g. "ja", "de", "pt-BR")`);
    process.exit(1);
  }
  if (argv.includes("--check")) {
    check(lang);
    return;
  }
  scaffold(lang, argv.includes("--force"));
}

if (import.meta.main) {
  main();
}
