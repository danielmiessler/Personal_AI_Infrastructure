import { basename, extname } from "node:path";

export interface SectionAnchorFile {
  path: string;
  content: string;
}

export interface MissingSectionAnchor {
  file: string;
  line: number;
  ref: string;
  target: string;
  targetPaths: string[];
  section: string;
  reason: "missing_section" | "missing_target" | "ambiguous_target";
}

export interface SectionAnchorScan {
  findings: MissingSectionAnchor[];
  scannedReferences: number;
}

interface Heading { level: number; title: string }
interface TargetDocument { path: string; headings: Heading[] }

// Bare section symbols are also used for laws, protocol grammar, and local prose
// links. A named file/stem is the minimum shape ReferenceCheck can resolve without
// guessing what document the author meant.
const PATH_CODE_ANCHOR = /`((?:~\/\.claude\/)?[A-Za-z][A-Za-z0-9_./-]*?)(?:\.(md))?`\s*§\s*["“]?([^`"”\)\]\n*,:;.\(—]{2,160}?)(?=\s*(?:[,:;.\(—*`"”\)\]]|\r?\n|$))/g;
// Inline code is the exact-address form for headings that contain prose
// punctuation. Fenced examples are removed before matching; an inline
// `File.md § Section` is therefore intentionally a live reference.
const CODE_ANCHOR = /`((?:~\/\.claude\/)?[A-Za-z][A-Za-z0-9_./-]*?)(?:\.(md))?\s*§\s*([^`\n]{2,160})`/g;
const PROSE_ANCHOR = /(?<![`A-Za-z0-9_./-])([A-Za-z][A-Za-z0-9_./-]*?)(?:\.(md))?\s*§\s*["“]?([^`"”\)\]\n*,:;.\(—]{2,160}?)(?=\s*(?:[,:;.\(—*`"”\)\]]|\r?\n|$))/g;

interface AnchorMatch { index: number; end: number; match: RegExpMatchArray }
function anchorMatches(content: string): AnchorMatch[] {
  const matches: AnchorMatch[] = [];
  const codeRanges: Array<[number, number]> = [];
  for (const pattern of [PATH_CODE_ANCHOR, CODE_ANCHOR]) {
    for (const match of content.matchAll(pattern)) {
      const index = match.index ?? 0;
      const end = index + match[0].length;
      if (codeRanges.some(([start, stop]) => index < stop && end > start)) continue;
      codeRanges.push([index, end]);
      matches.push({ index, end, match });
    }
  }
  for (const match of content.matchAll(PROSE_ANCHOR)) {
    const index = match.index ?? 0;
    const end = index + match[0].length;
    if (codeRanges.some(([start, stop]) => index < stop && end > start)) continue;
    matches.push({ index, end, match });
  }
  return matches.sort((a, b) => a.index - b.index);
}

function normalized(value: string): string {
  return value.replace(/[`*_~]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

function looksLikeDocumentStem(value: string): boolean {
  return value.includes("_") || /[a-z][A-Z]/.test(value);
}

function isCanonicalTargetAddress(value: string): boolean {
  return /^(?:lifeos\/)?(?:documentation|rules|algorithm)\//i.test(value) ||
    /^(?:lifeos\/)?user\/(?:config|principal)\//i.test(value);
}

function baseHeading(value: string): string {
  return normalized(value)
    .replace(/\s+\([^)]*\)$/, "")
    .replace(/\s+—.*$/, "")
    .trim();
}

interface Fence { char: "`" | "~"; length: number }
function fenceAt(line: string): Fence | null {
  const match = line.match(/^\s*(`{3,}|~{3,})/);
  return match ? { char: match[1][0] as "`" | "~", length: match[1].length } : null;
}

function headings(markdown: string): Heading[] {
  const out: Heading[] = [];
  let fence: Fence | null = null;
  for (const line of markdown.split("\n")) {
    const marker = fenceAt(line);
    if (marker && !fence) { fence = marker; continue; }
    if (marker && fence && marker.char === fence.char && marker.length >= fence.length) { fence = null; continue; }
    if (fence) continue;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match) {
      const title = match[2].replace(/\s+#+\s*$/, "");
      out.push({ level: match[1].length, title: normalized(title) });
    }
  }
  return out;
}

function titleMatches(heading: string, cited: string): boolean {
  const citation = normalized(cited);
  if (heading === citation) return true;
  // A target may carry a version or explanatory suffix that callers omit.
  // When the caller supplies a qualifier, however, it is part of the address
  // and must match exactly rather than being normalized away.
  if (baseHeading(citation) !== citation) return false;
  return baseHeading(heading) === citation;
}

function resolutionCount(target: Heading[], section: string): number {
  const parts = section.split(/\s+§\s+/).map(normalized).filter(Boolean);
  function countFrom(partIndex: number, start: number, end: number): number {
    const part = parts[partIndex];
    let count = 0;
    for (let i = start; i < end; i++) {
      if (!titleMatches(target[i].title, part)) continue;
      if (partIndex === parts.length - 1) { count++; continue; }
      const parentLevel = target[i].level;
      let subtreeEnd = end;
      for (let j = i + 1; j < end; j++) {
        if (target[j].level <= parentLevel) { subtreeEnd = j; break; }
      }
      count += countFrom(partIndex + 1, i + 1, subtreeEnd);
    }
    return count;
  }
  return parts.length > 0 ? countFrom(0, 0, target.length) : 0;
}

function withoutFences(content: string): string {
  let fence: Fence | null = null;
  return content.split("\n").map((line) => {
    const marker = fenceAt(line);
    if (marker && !fence) { fence = marker; return ""; }
    if (marker && fence && marker.char === fence.char && marker.length >= fence.length) { fence = null; return ""; }
    return fence ? "" : line;
  }).join("\n");
}

function isRetiredDocument(path: string, content: string): boolean {
  if (!path.endsWith(".md")) return false;
  const lines = content.split("\n");
  let index = 0;
  if (lines[0]?.trim() === "---") {
    index = 1;
    let retiredStatus = false;
    for (; index < lines.length; index++) {
      if (/^status:\s*retired\s*$/i.test(lines[index].trim())) retiredStatus = true;
      if (lines[index].trim() === "---") { index++; break; }
    }
    if (retiredStatus) return true;
  }
  while (index < lines.length && !lines[index].trim()) index++;
  return /^(?:>\s*)?\*\*RETIRED\b/i.test(lines[index]?.trim() ?? "");
}

export function scanSectionAnchors(files: SectionAnchorFile[]): SectionAnchorScan {
  const targets = new Map<string, TargetDocument[]>();
  const pathTargets: TargetDocument[] = [];
  for (const file of files) {
    if (extname(file.path) !== ".md") continue;
    const portable = file.path.replaceAll("\\", "/");
    if (portable.includes("/.LifeOS.previous-") || portable.includes("/skills/LifeOS/install/") ||
        portable.includes("/Reference/Corpus/")) continue;
    const indexed = headings(file.content);
    pathTargets.push({ path: file.path, headings: indexed });
    // Bare stems bind only canonical LifeOS documentation contracts and the
    // two USER doctrine trees. Explicit paths may resolve any indexed Markdown
    // contract without letting a same-named corpus note hijack a bare address.
    const canonicalTarget = /\/LIFEOS\/(?:DOCUMENTATION|RULES|ALGORITHM)\//.test(portable) ||
      portable.endsWith("/LIFEOS/LIFEOS_SYSTEM_PROMPT.md") ||
      /\/USER\/(?:CONFIG|PRINCIPAL)\//.test(portable);
    if (!canonicalTarget) continue;
    const stem = basename(file.path, ".md").toLocaleLowerCase("en-US");
    targets.set(stem, [...(targets.get(stem) ?? []), { path: file.path, headings: indexed }]);
  }

  const findings: MissingSectionAnchor[] = [];
  const seen = new Set<string>();
  let scannedReferences = 0;
  for (const file of files) {
    if (!/\.(md|ts|tsx)$/.test(file.path) || basename(file.path) === "section-anchors.ts") continue;
    const portable = file.path.replaceAll("\\", "/");
    if (portable.includes("/.LifeOS.previous-") || portable.includes("/skills/LifeOS/install/") ||
        portable.includes("/Reference/Corpus/") || portable.includes("/CUSTOMIZATIONS/TOOLS/") ||
        portable.includes("/test/") || portable.includes("/.agents/") || portable.includes("/archive/")) continue;
    if (!portable.includes("/LIFEOS/") && !portable.includes("/hooks/")) continue;
    if (isRetiredDocument(file.path, file.content)) continue;
    const content = withoutFences(file.content);
    for (const { index, match } of anchorMatches(content)) {
      const citedTarget = `${match[1]}${match[2] ? "." + match[2] : ""}`.replace(/^~\/\.claude\//, "");
      const citedExtension = extname(citedTarget);
      if (citedExtension && citedExtension !== ".md") continue;
      const normalizedTarget = citedTarget.toLocaleLowerCase("en-US");
      const stem = basename(normalizedTarget, ".md");
      const stemCandidates = targets.get(stem);
      const candidates = normalizedTarget.includes("/")
        ? pathTargets.filter((candidate) => {
            const path = candidate.path.replaceAll("\\", "/").toLocaleLowerCase("en-US");
            const suffix = normalizedTarget.endsWith(".md") ? normalizedTarget : `${normalizedTarget}.md`;
            const suffixes = suffix.startsWith("lifeos/user/") ? [suffix, suffix.slice("lifeos/".length)] : [suffix];
            return suffixes.some((item) => path.endsWith(`/${item}`));
          })
        : stemCandidates;
      const section = match[3].trim().replace(/[.;]$/, "").trim();
      if (/^\d/.test(section)) continue; // numbered standards and legal/protocol sections
      const ref = `${match[1]}${match[2] ? "." + match[2] : ""} § ${section}`;
      if (!candidates?.length) {
        // A CamelCase or CONSTANT_CASE stem is file-shaped even without .md,
        // while ordinary words remain indistinguishable from Algorithm §Spend,
        // standards, laws, and protocol grammar.
        if (normalizedTarget.includes("/") && !isCanonicalTargetAddress(normalizedTarget)) continue;
        if (!match[2] && !normalizedTarget.includes("/") && !looksLikeDocumentStem(citedTarget)) continue;
        scannedReferences++;
        const line = content.slice(0, index).split("\n").length;
        const key = `${file.path}\0${line}\0${ref}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          file: file.path,
          line,
          ref,
          target: citedTarget,
          targetPaths: [],
          section,
          reason: "missing_target",
        });
        continue;
      }
      scannedReferences++;
      const matching = candidates
        .map((candidate) => ({ candidate, count: resolutionCount(candidate.headings, section) }))
        .filter(({ count }) => count > 0);
      const totalMatches = matching.reduce((sum, item) => sum + item.count, 0);
      if (totalMatches === 1) continue;
      const reportedTargets = totalMatches > 1 ? matching.map(({ candidate }) => candidate) : candidates;
      const line = content.slice(0, index).split("\n").length;
      const key = `${file.path}\0${line}\0${ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        file: file.path,
        line,
        ref,
        target: reportedTargets[0].path,
        targetPaths: reportedTargets.map((candidate) => candidate.path),
        section,
        reason: totalMatches > 1 ? "ambiguous_target" : "missing_section",
      });
    }
  }
  return { findings, scannedReferences };
}

export function findMissingSectionAnchors(files: SectionAnchorFile[]): MissingSectionAnchor[] {
  return scanSectionAnchors(files).findings;
}

if (import.meta.main) {
  const fixture: SectionAnchorFile[] = [
    { path: "/LIFEOS/DOCUMENTATION/BunkerSystem.md", content: "# Bunker\n## The registration rule\n" },
    { path: "/LIFEOS/DOCUMENTATION/ISAFormat.md", content: "# ISA\n### Dependency edges and the frontier (v2.21.0)\n" },
    { path: "/LIFEOS/DOCUMENTATION/MemorySystem.md", content: "# Memory\n## Directory Inventory (authoritative)\n### Status\n## Other\n### Foreign status\n" },
    { path: "/LIFEOS/DOCUMENTATION/Fenced.md", content: "# Fenced\n~~~md\n## Example only\n~~~\n## Real\n" },
    { path: "/LIFEOS/DOCUMENTATION/Empty.md", content: "prose without a heading\n" },
    { path: "/LIFEOS/DOCUMENTATION/Punctuation.md", content: "# Punctuation\n## Phase 1: Setup\n## Owner's checklist\n## Why, exactly\n" },
    { path: "/LIFEOS/DOCUMENTATION/one/Shared.md", content: "# Shared\n## Same\n" },
    { path: "/LIFEOS/DOCUMENTATION/two/Shared.md", content: "# Shared\n## Same\n## Unique\n" },
    { path: "/LIFEOS/ALGORITHM/v1.md", content: "# Algorithm\n## The Loop\n" },
    { path: "/LIFEOS/DOCUMENTATION/Source.md", content: "# Source\n- Algorithm: `~/.claude/LIFEOS/ALGORITHM/v1.md` § The Loop\n" },
    { path: "/LIFEOS/DOCUMENTATION/Atx.md", content: "# ATX\n## Security Protocol ##\n" },
    { path: "/LIFEOS/DOCUMENTATION/Duplicate.md", content: "# Duplicate\n## API\n### Other\n## API\n### Authentication\n" },
    { path: "/LIFEOS/DOCUMENTATION/Repeated.md", content: "# Repeated\n## API (old)\n## API (new)\n" },
    { path: "/LIFEOS/DOCUMENTATION/Active.md", content: "# Active\nRETIRED appears here as ordinary history.\nBunkerSystem § Missing active section\n" },
    { path: "/LIFEOS/DOCUMENTATION/Retired.md", content: "> **RETIRED 2026-01-01.**\nBunkerSystem § Missing retired section\n" },
    { path: "/LIFEOS/src/ok.ts", content: "// BunkerSystem.md § The registration rule\n// `ISAFormat.md § Dependency edges and the frontier`\n// `MemorySystem § Directory Inventory (authoritative) § Status`\n// `Punctuation § Phase 1: Setup`\n// Punctuation § Owner's checklist\n// `Punctuation § Why, exactly`\n// **BunkerSystem.md § The registration rule**\n// Atx § Security Protocol\n// Duplicate § API § Authentication\n// Shared § Unique\n// legal § Host\n" },
    { path: "/LIFEOS/src/bad.ts", content: "// BunkerSystem § Missing section\n// BunkerSystem § The registration rule extra\n// MemorySystem § Directory Inventory § Foreign status\n// `MemorySystem § Directory Inventory (obsolete)`\n// `ISAFormat § Dependency edges and the frontier (v0)`\n// Fenced § Example only\n// Empty § Missing heading\n// Shared § Same\n// Repeated § API\n// Missing.md § Whatever\n// LIFEOS/DOCUMENTATION/Missing § Whatever\n// BunkerSystm § Whatever\n// LIFEOS/TOOLS/models.ts § CARRIER REALITY\nconst diagnostic = `BunkerSystem § The registration rule`;\nconst example = `\n~~~md\nBunkerSystem § Missing fenced runtime\n~~~\n`;\n" },
  ];
  const got = findMissingSectionAnchors(fixture);
  const scan = scanSectionAnchors(fixture);
  if (got.length !== 13 || scan.scannedReferences !== 25 ||
      !got.some((f) => f.ref === "BunkerSystem § Missing section") ||
      !got.some((f) => f.ref === "BunkerSystem § The registration rule extra") ||
      !got.some((f) => f.ref === "MemorySystem § Directory Inventory § Foreign status") ||
      !got.some((f) => f.ref === "MemorySystem § Directory Inventory (obsolete)") ||
      !got.some((f) => f.ref === "ISAFormat § Dependency edges and the frontier (v0)") ||
      !got.some((f) => f.ref === "BunkerSystem § Missing active section") ||
      !got.some((f) => f.ref === "Missing.md § Whatever" && f.reason === "missing_target") ||
      !got.some((f) => f.ref === "LIFEOS/DOCUMENTATION/Missing § Whatever" && f.reason === "missing_target") ||
      !got.some((f) => f.ref === "BunkerSystm § Whatever" && f.reason === "missing_target") ||
      !got.some((f) => f.ref === "Repeated § API" && f.reason === "ambiguous_target") ||
      got.some((f) => f.ref.includes("models.ts")) ||
      got.some((f) => f.ref === "BunkerSystem § Missing retired section") ||
      !got.some((f) => f.ref === "Fenced § Example only") ||
      !got.some((f) => f.ref === "Empty § Missing heading") ||
      !got.some((f) => f.ref === "Shared § Same" && f.reason === "ambiguous_target")) {
    console.error(JSON.stringify(got, null, 2));
    process.exit(1);
  }
  console.log("section-anchors self-test: 30/30 pass");
}
