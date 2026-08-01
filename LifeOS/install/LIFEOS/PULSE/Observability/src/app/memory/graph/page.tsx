"use client";

// Memory Graph — the whole memory corpus, organized by HUMAN vocabulary:
// color = object type (legend, toggleable), clusters = tag themes, and any
// focused node walks its connections and opens as a note. The previous
// design surfaced discovered communities named by one member's title — an
// engineering artifact that read as noise (principal, 2026-07-19).
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import KnowledgeGraph from "@/components/wiki/KnowledgeGraph";
import { wikiPageUrl } from "@/lib/wiki-links";
import { Network, Search, ArrowLeft, CornerDownRight, ExternalLink, Tag, X } from "lucide-react";

interface MemNode { id: string; title: string; category: string; backlinkCount: number; silo: string; type: string; tags: string[]; pagerank: number }
interface MemEdge { source: string; target: string; kind: string }
interface Theme { tag: string; count: number }
interface MemGraph { nodes: MemNode[]; edges: MemEdge[]; themes: Theme[]; built: string | null; nodeCount?: number; edgeCount?: number }

// Every silo's nodes are wiki-indexed, so a focused node can open as a note.
function noteUrl(node: MemNode): string | null {
  if (node.silo === "work") return wikiPageUrl("isa", node.id.replace(/^work:/, ""));
  if (node.silo === "wisdom") return wikiPageUrl("wisdom", node.id);
  if (node.silo === "lesson" || node.silo === "synthesis") return wikiPageUrl("lesson", node.id);
  if (node.silo === "knowledge" && node.type) return wikiPageUrl(node.type, node.id);
  return null;
}

// Stable type identity: same hue everywhere, every time. Overview slots keep
// knowledge visible next to the much larger work corpus.
const TYPES: Array<{ key: string; label: string; color: string; slots: number }> = [
  { key: "person", label: "People", color: "#38bdf8", slots: 16 },
  { key: "company", label: "Companies", color: "#fbbf24", slots: 14 },
  { key: "idea", label: "Ideas", color: "#a78bfa", slots: 20 },
  { key: "blog", label: "Blogs", color: "#94a3b8", slots: 10 },
  { key: "book", label: "Books", color: "#f87171", slots: 5 },
  { key: "research", label: "Research", color: "#22d3ee", slots: 12 },
  { key: "isa", label: "ISAs", color: "#34d399", slots: 16 },
  { key: "lesson", label: "Lessons", color: "#a3e635", slots: 8 },
  { key: "wisdom", label: "Wisdom", color: "#e879f9", slots: 8 },
];
const TYPE_COLOR: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.key, t.color]));
const KIND_ORDER = ["related", "wikilink", "inferred", "tag"];
const KIND_LABEL: Record<string, string> = { related: "Declared (typed)", wikilink: "Wikilinks", inferred: "Inferred (similar)", tag: "Shared tags" };
const NEIGHBOR_CAP = 36;
const THEME_NODE_CAP = 140;

const font = { fontFamily: "'concourse-t3', sans-serif" } as const;
const heading = { fontFamily: "'advocate-c14', sans-serif" } as const;

export default function MemoryGraphPage() {
  const [focus, setFocus] = useState<string | null>(null);
  const [trail, setTrail] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState<string | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  // The viewer owns everything from below the header to the bottom of the
  // viewport. Measured, not guessed — the header wraps to a second row at
  // some widths, so any fixed calc() offset cuts the canvas short.
  const outerRef = useRef<HTMLDivElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  // The canvas wrap is what the canvas actually sizes from, and it shrinks
  // when the toolbar rows grow (font load) even while the outer div's pinned
  // height never changes — so the observer must watch the wrap too.
  const wrapRef = (el: HTMLDivElement | null) => { if (el) roRef.current?.observe(el); };
  const [fillHeight, setFillHeight] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      if (!outerRef.current) return;
      const top = outerRef.current.getBoundingClientRect().top + window.scrollY;
      setFillHeight(Math.max(480, window.innerHeight - top));
    };
    measure();
    // Adobe web fonts land after first paint and re-wrap the header, shifting
    // this container's top — fonts.ready resolves too early for them, so
    // re-measure on a short schedule until layout settles.
    const timers = [400, 1200, 3000].map((ms) => setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    // The canvas component sizes itself from its container ONCE per draw and
    // re-measures only on window resize — so when this container changes size
    // for any other reason (measured height landing, data arriving, nav
    // wrapping), nudge it with a synthetic resize or the canvas stays stuck
    // at its mount-time height (the cut-off-halfway bug, 2026-07-19).
    const ro = new ResizeObserver(() => window.dispatchEvent(new Event("resize")));
    if (outerRef.current) ro.observe(outerRef.current);
    const wrap = outerRef.current?.querySelector("[data-canvas-wrap]");
    if (wrap) ro.observe(wrap);
    roRef.current = ro;
    return () => { window.removeEventListener("resize", measure); ro.disconnect(); roRef.current = null; timers.forEach(clearTimeout); };
  }, []);

  const { data, isLoading } = useQuery<MemGraph>({
    queryKey: ["memory-graph"],
    queryFn: async () => {
      const res = await fetch("/api/memory/graph");
      if (!res.ok) throw new Error("Failed to fetch memory graph");
      return res.json();
    },
    staleTime: 60_000,
  });

  const nodeById = useMemo(() => new Map((data?.nodes ?? []).map((n) => [n.id, n])), [data]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of data?.nodes ?? []) m[n.type] = (m[n.type] || 0) + 1;
    return m;
  }, [data]);

  // adjacency: id -> [{id, kind}]
  const adj = useMemo(() => {
    const m = new Map<string, { id: string; kind: string }[]>();
    for (const e of data?.edges ?? []) {
      (m.get(e.source) ?? m.set(e.source, []).get(e.source)!).push({ id: e.target, kind: e.kind });
      (m.get(e.target) ?? m.set(e.target, []).get(e.target)!).push({ id: e.source, kind: e.kind });
    }
    return m;
  }, [data]);

  const visible = (n: MemNode) => !hiddenTypes.has(n.type);
  const capR = (n: MemNode) => ({ ...n, backlinkCount: Math.min(n.backlinkCount, 30) });

  // Overview: the most-connected members of EVERY type, labeled — a map of the
  // memory's shape, not an anonymous constellation of pagerank hubs.
  const overview = useMemo(() => {
    if (!data) return { nodes: [] as MemNode[], edges: [] as MemEdge[] };
    const picked = new Set<string>();
    for (const t of TYPES) {
      if (hiddenTypes.has(t.key)) continue;
      const members = data.nodes
        .filter((n) => n.type === t.key)
        .sort((a, b) => b.backlinkCount - a.backlinkCount)
        .slice(0, t.slots);
      for (const n of members) picked.add(n.id);
    }
    return {
      nodes: [...picked].map((id) => nodeById.get(id)!).filter(Boolean).map(capR),
      edges: data.edges.filter((e) => picked.has(e.source) && picked.has(e.target)),
    };
  }, [data, nodeById, hiddenTypes]);

  // Theme view: every member of the tag, connected — a cluster you can name.
  const themeView = useMemo(() => {
    if (!data || !theme) return null;
    const members = data.nodes
      .filter((n) => visible(n) && n.tags.some((t) => t.toLowerCase() === theme))
      .sort((a, b) => b.backlinkCount - a.backlinkCount);
    const shown = members.slice(0, THEME_NODE_CAP);
    const ids = new Set(shown.map((n) => n.id));
    return {
      total: members.length,
      nodes: shown.map(capR),
      edges: data.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme, hiddenTypes]);

  const go = (id: string) => { if (focus) setTrail((t) => [...t, focus]); setFocus(id); setQ(""); };
  const back = () => { setTrail((t) => { const n = [...t]; const prev = n.pop(); setFocus(prev ?? null); return n; }); };
  const toggleType = (key: string) => setHiddenTypes((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  if (isLoading || !data) {
    // Same measured outer div as the loaded tree — the ref must exist from
    // first mount or the one-shot measure runs against nothing.
    return (
      <div ref={outerRef} className="flex items-center justify-center" style={{ height: fillHeight ?? "calc(100vh - 160px)" }}>
        <div className="text-xs text-ink-3" style={font}>Loading memory graph…</div>
      </div>
    );
  }

  const results = q.trim().length >= 2
    ? data.nodes.filter((n) => n.title.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.pagerank - a.pagerank).slice(0, 14)
    : [];

  // Neighborhood subgraph for the focused node
  const focusNode = focus ? nodeById.get(focus) : null;
  const neighbors = focus ? (adj.get(focus) ?? []) : [];
  const seen = new Map<string, string>();
  for (const nb of neighbors) if (!seen.has(nb.id)) seen.set(nb.id, nb.kind);
  const neighborIds = [...seen.keys()].sort((a, b) => (nodeById.get(b)?.pagerank ?? 0) - (nodeById.get(a)?.pagerank ?? 0)).slice(0, NEIGHBOR_CAP);
  const subIds = new Set<string>([...(focus ? [focus] : []), ...neighborIds]);
  const subNodes = [...subIds].map((id) => nodeById.get(id)!).filter(Boolean).map(capR);
  const subEdges = data.edges.filter((e) => subIds.has(e.source) && subIds.has(e.target));

  const grouped: Record<string, { id: string; title: string; type: string }[]> = {};
  for (const id of neighborIds) {
    const k = seen.get(id)!; const n = nodeById.get(id); if (!n) continue;
    (grouped[k] ??= []).push({ id, title: n.title, type: n.type });
  }

  const canvas = focusNode
    ? { nodes: subNodes, edges: subEdges }
    : themeView ?? overview;

  return (
    <div ref={outerRef} className="flex flex-col" style={{ height: fillHeight ?? "calc(100vh - 160px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line-2 bg-surface-1 shrink-0">
        <Network className="w-4 h-4 text-dim-relationships" />
        <h1 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3 shrink-0 whitespace-nowrap" style={{ fontFamily: "'concourse-c3', 'concourse-t3', sans-serif" }}>Memory Graph</h1>
        {theme && !focusNode && (
          <button onClick={() => setTheme(null)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-3 border border-line-2 text-[11px] text-ink-1 hover:border-line-3" style={font}>
            <Tag className="w-3 h-3 text-dim-relationships" />{theme}
            <X className="w-3 h-3 text-ink-3" />
          </button>
        )}
        <div className="relative ml-4 flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any memory item…"
            className="w-full bg-surface-2 border border-line-2 rounded pl-7 pr-2 py-1 text-[12px] text-ink-1 outline-none focus:border-line-3"
            style={font}
          />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-surface-2 border border-line-2 rounded shadow-xl">
              {results.map((r) => (
                <button key={r.id} onClick={() => go(r.id)} className="flex items-center gap-2 w-full text-left px-2 py-1 text-[12px] text-ink-2 hover:bg-surface-3 hover:text-ink-1" style={font}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLOR[r.type] ?? "#64748b" }} />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-[11px] text-ink-3 shrink-0 whitespace-nowrap ml-auto" style={font}>{data.nodes.length.toLocaleString()} items · {data.edges.length.toLocaleString()} links</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Side panel */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-line-2 bg-surface-1 p-3">
          {!focusNode ? (
            <div>
              {/* Type legend — the color key IS the filter */}
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2" style={heading}>Types</div>
              <div className="space-y-0.5 mb-4">
                {TYPES.filter((t) => (typeCounts[t.key] ?? 0) > 0).map((t) => {
                  const off = hiddenTypes.has(t.key);
                  return (
                    <button key={t.key} onClick={() => toggleType(t.key)}
                      className={"flex items-center gap-2.5 w-full text-left px-2 py-1 rounded-md hover:bg-surface-3 transition-colors " + (off ? "opacity-35" : "")}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-inset ring-white/10" style={{ background: t.color }} />
                      <span className="flex-1 text-[12px] text-ink-2" style={font}>{t.label}</span>
                      <span className="text-[10px] tabular-nums text-ink-3" style={font}>{(typeCounts[t.key] ?? 0).toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>

              {/* Themes — human-named clusters from curated tags */}
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2" style={heading}>Themes</div>
              <div className="text-[11px] leading-relaxed text-ink-3 mb-2" style={font}>
                A theme is a tag running through your notes. Click one to see its members and how they connect.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.themes.map((t) => (
                  <button key={t.tag} onClick={() => { setTheme(theme === t.tag ? null : t.tag); setFocus(null); setTrail([]); }}
                    className={"px-2 py-0.5 rounded-full border text-[11px] transition-colors " + (theme === t.tag ? "border-sky-500/50 bg-sky-500/10 text-sky-300" : "border-line-2 bg-surface-2 text-ink-2 hover:border-line-3 hover:text-ink-1")}
                    style={font}>
                    {t.tag} <span className="text-ink-3 tabular-nums">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                {trail.length > 0 && <button onClick={back} className="text-ink-2 hover:text-ink-1"><ArrowLeft className="w-3.5 h-3.5" /></button>}
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: TYPE_COLOR[focusNode.type] ?? "#64748b" }} />
                <span className="text-[10px] uppercase text-ink-3" style={font}>{TYPES.find((t) => t.key === focusNode.type)?.label ?? focusNode.type}</span>
              </div>
              <div className="text-[14px] text-ink-1 font-medium mb-1 leading-snug" style={heading}>{focusNode.title}</div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] text-ink-3" style={font}>{neighborIds.length} connections</span>
                {noteUrl(focusNode) && (
                  <Link href={noteUrl(focusNode)!} className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors" style={font}>
                    <ExternalLink className="w-3 h-3" />
                    Open note
                  </Link>
                )}
              </div>
              {focusNode.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {focusNode.tags.map((t) => (
                    <button key={t} onClick={() => { setTheme(t.toLowerCase()); setFocus(null); setTrail([]); }}
                      className="px-1.5 py-0.5 rounded-full border border-line-2 bg-surface-2 text-[10px] text-ink-3 hover:text-ink-1 hover:border-line-3" style={font}>
                      {t.toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
              {KIND_ORDER.filter((k) => grouped[k]?.length).map((k) => (
                <div key={k} className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-3 mb-1" style={heading}>{KIND_LABEL[k]} ({grouped[k].length})</div>
                  <div className="space-y-1.5">
                    {grouped[k].map((n) => (
                      <button key={n.id} onClick={() => go(n.id)} className="flex items-start gap-1.5 w-full text-left group">
                        <CornerDownRight className="w-3 h-3 text-ink-3 mt-[3px] shrink-0 group-hover:text-dim-relationships" />
                        <span className="flex-1 min-w-0 text-[12px] text-ink-2 group-hover:text-ink-1" style={{ ...font, lineHeight: 1.35 }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: TYPE_COLOR[n.type] ?? "#64748b" }} />
                          {n.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas: typed overview → theme cluster → focused neighborhood */}
        <div ref={wrapRef} data-canvas-wrap className="flex-1 min-w-0 relative overflow-hidden">
          <KnowledgeGraph nodes={canvas.nodes} edges={canvas.edges} colorMap={TYPE_COLOR} onNodeClick={(slug) => go(slug)} />
          {!focusNode && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-1 border border-line-2 text-[10px] tracking-[0.1em] uppercase text-ink-3 pointer-events-none" style={font}>
              {themeView
                ? `${theme} — ${themeView.nodes.length}${themeView.total > themeView.nodes.length ? ` of ${themeView.total}` : ""} items`
                : `Most-connected of each type — ${canvas.nodes.length} of ${data.nodes.length.toLocaleString()}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
