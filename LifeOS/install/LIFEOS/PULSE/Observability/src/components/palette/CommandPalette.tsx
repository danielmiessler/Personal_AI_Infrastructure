"use client";

// Pulse command palette (⌘K). Two lanes in P1:
//   local  — pages from nav-manifest + frecency recents (no network)
//   wiki   — /api/wiki/search (MiniSearch), debounced
// Design: LIFEOS/MEMORY/WORK/20260710-pulse-cmdk-command-palette/DESIGN.md

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  FileText,
  FlaskConical,
  GraduationCap,
  Users,
  Building2,
  Lightbulb,
  BookOpen,
  Newspaper,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { wikiPageUrl } from "@/lib/wiki-links";
import { paletteEntries, type NavItem } from "@/lib/palette/nav-manifest";
import { fuzzyScore } from "@/lib/palette/fuzzy";
import { recordSelection, frecencyBoost, topRecents, loadStore } from "@/lib/palette/frecency";
import { PALETTE_OPEN_EVENT, type PaletteScope } from "@/lib/palette/events";

interface WikiResult {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  score: number;
  author?: string;
}

type Row =
  | { kind: "page"; entry: NavItem; recent?: boolean }
  | { kind: "wiki"; result: WikiResult };

const WIKI_ICONS: Record<string, LucideIcon> = {
  "system-doc": BookOpen,
  person: Users,
  company: Building2,
  idea: Lightbulb,
  blog: Newspaper,
  book: BookOpen,
  research: FlaskConical,
  isa: Workflow,
  lesson: GraduationCap,
  wisdom: Sparkles,
};

// Routes where ⌘K used to open the scoped WikiSearch — opening there pre-sets
// the WIKI scope chip so the old muscle memory keeps working.
const WIKI_SCOPED_PREFIXES = ["/docs", "/memory/knowledge", "/system"];

const font = { fontFamily: "'concourse-t3', sans-serif" };
const mono = { fontFamily: "'triplicate-a-code', monospace" };

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<PaletteScope>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [wikiResults, setWikiResults] = useState<WikiResult[]>([]);
  const [wikiLoading, setWikiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  const pathnameRef = useRef("/");
  const router = useRouter();
  const pathname = usePathname();

  openRef.current = open;
  pathnameRef.current = pathname ?? "/";

  const openPalette = useCallback((initialScope: PaletteScope) => {
    setQuery("");
    setWikiResults([]);
    setSelectedIndex(0);
    setScope(initialScope);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Global ⌘K (capture phase so it wins over page handlers and the browser).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        // Rich-text editors own ⌘K (insert link) — don't hijack there.
        const t = e.target;
        if (t instanceof HTMLElement && t.isContentEditable) return;
        e.preventDefault();
        e.stopPropagation();
        if (openRef.current) {
          setOpen(false);
        } else {
          const scoped = WIKI_SCOPED_PREFIXES.some((p) => pathnameRef.current.startsWith(p));
          openPalette(scoped ? "wiki" : null);
        }
      } else if (e.key === "Escape" && openRef.current) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [openPalette]);

  // Programmatic open (WikiSidebar search button, future callers).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { scope?: PaletteScope } | undefined;
      openPalette(detail?.scope ?? null);
    };
    window.addEventListener(PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PALETTE_OPEN_EVENT, onOpen);
  }, [openPalette]);

  // Focus on open.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Wiki lane: debounced 150ms, only when it can matter.
  useEffect(() => {
    if (!open || scope === "pages" || query.trim().length < 2) {
      setWikiResults([]);
      setWikiLoading(false);
      return;
    }
    setWikiLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setWikiResults(data.results ?? []);
        }
        setWikiLoading(false);
      } catch {
        // aborted (query moved on) or network hiccup — local lane still works
        if (!controller.signal.aborted) setWikiLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort(); // kill in-flight fetch so a stale response can't land
    };
  }, [open, query, scope]);

  // Local lane + merge.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const q = query.trim();
    if (scope !== "wiki") {
      if (!q) {
        const recents = topRecents(6)
          .map((id) => paletteEntries.find((e) => e.href === id))
          .filter((e): e is NavItem => Boolean(e));
        recents.forEach((entry) => out.push({ kind: "page", entry, recent: true }));
        paletteEntries
          .filter((e) => !recents.includes(e))
          .forEach((entry) => out.push({ kind: "page", entry }));
      } else {
        const store = loadStore();
        paletteEntries
          .map((entry) => ({
            entry,
            score: fuzzyScore(q, entry.label, entry.keywords) + frecencyBoost(entry.href, store),
          }))
          .filter((s) => s.score - frecencyBoost(s.entry.href, store) > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 9)
          .forEach(({ entry }) => out.push({ kind: "page", entry }));
      }
    }
    if (scope !== "pages") {
      wikiResults.forEach((result) => out.push({ kind: "wiki", result }));
    }
    return out;
  }, [query, scope, wikiResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, scope]);

  const clampedIndex = Math.min(selectedIndex, Math.max(0, rows.length - 1));

  const activate = useCallback(
    (row: Row, newTab: boolean) => {
      const href =
        row.kind === "page" ? row.entry.href : wikiPageUrl(row.result.category, row.result.slug);
      if (row.kind === "page") recordSelection(row.entry.href);
      if (newTab) {
        window.open(href, "_blank");
      } else {
        router.push(href);
      }
      setOpen(false);
    },
    [router]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
        e.preventDefault();
        setSelectedIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
      } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
        e.preventDefault();
        setSelectedIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
      } else if (e.key === "Enter" && rows[clampedIndex]) {
        e.preventDefault();
        activate(rows[clampedIndex], e.metaKey);
      } else if (e.key === "Tab") {
        e.preventDefault();
        setScope((s) => (s === null ? "pages" : s === "pages" ? "wiki" : null));
      } else if (e.key === "Backspace" && !query && scope !== null) {
        e.preventDefault();
        setScope(null);
      } else if (e.key === "Escape") {
        close();
      }
    },
    [rows, clampedIndex, activate, query, scope, close]
  );

  if (!open) return null;

  const pageRows = rows.filter((r) => r.kind === "page");
  const wikiRows = rows.filter((r) => r.kind === "wiki");
  const recentCount = pageRows.filter((r) => r.kind === "page" && r.recent).length;

  const renderRow = (row: Row, idx: number) => {
    const isSelected = idx === clampedIndex;
    const base = `w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-l-2 ${
      isSelected ? "bg-[#3b82f6]/10 border-[#3b82f6]" : "border-transparent hover:bg-surface-3"
    }`;
    if (row.kind === "page") {
      const Icon = row.entry.icon;
      return (
        <button key={`page-${row.entry.href}`} onClick={() => activate(row, false)} className={base}>
          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#3b82f6]" : "text-ink-3"}`} />
          <span
            className={`flex-1 truncate text-sm ${isSelected ? "text-ink-1" : "text-ink-2"}`}
            style={font}
          >
            {row.entry.label}
          </span>
          <span className="shrink-0 text-[12px] text-ink-3" style={mono}>
            {row.entry.href}
          </span>
          {isSelected && (
            <kbd className="shrink-0 text-[12px] px-1.5 py-0.5 rounded bg-surface-3 border border-line-2 text-ink-3" style={mono}>
              ⏎
            </kbd>
          )}
        </button>
      );
    }
    const Icon = WIKI_ICONS[row.result.category] ?? FileText;
    return (
      <button key={`wiki-${row.result.category}-${row.result.slug}`} onClick={() => activate(row, false)} className={base}>
        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#a855f7]" : "text-ink-3"}`} />
        <span className="flex-1 min-w-0 flex flex-col">
          <span className={`truncate text-sm ${isSelected ? "text-ink-1" : "text-ink-2"}`} style={font}>
            {row.result.title}
          </span>
          {row.result.excerpt && (
            <span className="truncate text-[13px] text-ink-3" style={font}>
              {row.result.excerpt}
            </span>
          )}
        </span>
        <span className="shrink-0 text-[11px] uppercase tracking-wider text-ink-3" style={font}>
          {row.result.category}
        </span>
      </button>
    );
  };

  let rowIndex = 0;

  return (
    <div
      data-palette-root
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[16vh]"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-[rgba(15,26,51,0.97)] backdrop-blur-xl border border-line-2 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line-1">
          <Search className="w-4 h-4 text-ink-3 shrink-0" />
          {scope && (
            <span
              className="shrink-0 text-[11px] uppercase tracking-widest px-2 py-0.5 rounded bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/30"
              style={mono}
            >
              {scope}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={scope === "wiki" ? "Search docs and knowledge..." : "Jump to anything..."}
            className="flex-1 bg-transparent text-[15px] text-ink-1 placeholder:text-ink-3 outline-none caret-[#3b82f6]"
            style={font}
          />
          <kbd className="text-[12px] px-1.5 py-0.5 rounded bg-surface-3 border border-line-2 text-ink-3" style={mono}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[52vh] overflow-y-auto">
          {rows.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-ink-3" style={font}>
              {wikiLoading ? "Searching..." : query ? `No results for "${query}"` : "Nothing here yet"}
            </div>
          )}

          {recentCount > 0 && (
            <div className="px-4 py-2 text-[11px] text-ink-3 uppercase tracking-widest border-b border-line-1" style={font}>
              Recent
            </div>
          )}
          {pageRows.slice(0, recentCount).map((row) => renderRow(row, rowIndex++))}
          {pageRows.length > recentCount && (recentCount > 0 || wikiRows.length > 0) && (
            <div className="px-4 py-2 text-[11px] text-ink-3 uppercase tracking-widest border-b border-line-1" style={font}>
              Pages
            </div>
          )}
          {pageRows.slice(recentCount).map((row) => renderRow(row, rowIndex++))}

          {wikiRows.length > 0 && (
            <>
              <div className="px-4 py-2 text-[11px] text-ink-3 uppercase tracking-widest border-y border-line-1" style={font}>
                Wiki
              </div>
              {wikiRows.map((row) => renderRow(row, rowIndex++))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-line-1 text-[12px] text-ink-3" style={font}>
          <span>↑↓ navigate</span>
          <span>⏎ open</span>
          <span>⌘⏎ new tab</span>
          <span>tab scope</span>
          {scope && <span>⌫ clear scope</span>}
        </div>
      </div>
    </div>
  );
}
