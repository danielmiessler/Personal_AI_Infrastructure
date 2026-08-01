"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import WikiMeta from "@/components/wiki/WikiMeta";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import { Users, Building2, Lightbulb, Clock, Search, X, FileText, BookOpen, Newspaper, FlaskConical, GraduationCap, Sparkles, Workflow } from "lucide-react";
import Link from "next/link";
import { wikiPageUrl } from "@/lib/wiki-links";
import { PageShell, PageHeader, Panel, PanelHeader, StatTile, Pill, type Dim } from "@/components/ui/chrome";

interface WikiPage {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  quality?: number;
  lastModified: string;
  wordCount: number;
  author?: string;
  source?: string;
  sourceUrl?: string;
  postDate?: string;
}

interface WikiIndex {
  tree: unknown[];
  recentChanges: WikiPage[];
  stats: {
    totalPages: number;
    totalPeople: number;
    totalCompanies: number;
    totalIdeas: number;
    totalBlogs: number;
    totalBooks: number;
    totalResearch?: number;
    totalIsas?: number;
    totalLessons?: number;
    totalWisdom?: number;
  };
}

interface PageDetail {
  slug: string;
  title: string;
  category: string;
  content: string;
  wordCount: number;
  lastModified: string;
  backlinks: Array<{ slug: string; title: string; category: string }>;
  related?: Array<{ slug: string; title: string; category: string }>;
  wikilinks: string[];
  tags?: string[];
  quality?: number;
  filePath?: string;
  author?: string;
  source?: string;
  sourceUrl?: string;
  postDate?: string;
}

const CATEGORY_ICONS: Record<string, typeof Users> = {
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

const CATEGORY_DIMENSIONS: Record<string, Dim> = {
  identity: "creative",
  voice: "creative",
  mind: "freedom",
  taste: "relationships",
  shape: "rhythms",
  ops: "money",
  domain: "health",
  person: "relationships",
  company: "money",
  idea: "freedom",
  blog: "creative",
  book: "creative",
  research: "freedom",
  isa: "rhythms",
  lesson: "health",
  wisdom: "freedom",
};

interface SearchHit {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  score: number;
  author?: string;
  source?: string;
  sourceUrl?: string;
  postDate?: string;
}

const SEARCH_CATEGORY_ICONS: Record<string, typeof FileText> = {
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

const SEARCH_CATEGORY_LABELS: Record<string, string> = {
  "system-doc": "System",
  person: "People",
  company: "Companies",
  idea: "Ideas",
  blog: "Blogs",
  book: "Books",
  research: "Research",
  isa: "ISAs",
  lesson: "Lessons",
  wisdom: "Wisdom",
};

function KnowledgeHeroSearch({ totalPages }: { totalPages: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(query)}&limit=40`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const grouped = results.reduce<Record<string, SearchHit[]>>((acc, r) => {
    const cat = r.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <Panel className="p-0">
        <div className="flex items-center gap-3 px-5 py-4">
          <Search className="w-5 h-5 shrink-0 text-dim-freedom" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                inputRef.current?.blur();
              } else if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                router.push(wikiPageUrl(results[0].category, results[0].slug));
              }
            }}
            placeholder={`Search ${totalPages.toLocaleString()} entries — people, companies, ideas, blogs, books…`}
            className="flex-1 bg-transparent outline-none text-ink-1 placeholder:text-ink-3"
            style={{ fontSize: 18, fontFamily: "'concourse-t3', sans-serif" }}
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-ink-3 hover:text-ink-1 shrink-0 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </Panel>

      {query.trim() && (
        <Panel className="p-0 overflow-hidden">
          {loading && results.length === 0 && (
            <div className="px-5 py-6 text-sm text-ink-3">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-5 py-6 text-sm text-ink-3">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {results.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto">
              {Object.entries(grouped).map(([cat, items]) => {
                const Icon = SEARCH_CATEGORY_ICONS[cat] || FileText;
                const label = SEARCH_CATEGORY_LABELS[cat] || cat;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 px-5 py-2 text-[13px] uppercase tracking-wider border-b border-line-1 text-ink-3">
                      <Icon className="w-3 h-3" />
                      {label}
                      <span className="ml-auto text-ink-3">{items.length}</span>
                    </div>
                    {items.map((r) => (
                      <Link
                        key={r.slug + r.category}
                        href={wikiPageUrl(r.category, r.slug)}
                        className="flex flex-col gap-1.5 px-5 py-2.5 hover:bg-surface-3 transition-colors border-b border-line-1"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="flex-1 truncate text-ink-1" style={{ fontSize: 14 }}>
                            {r.title}
                          </span>
                          {r.author && (
                            <span className="shrink-0 truncate max-w-[200px] text-ink-2" style={{ fontSize: 13 }}>
                              {r.author}
                            </span>
                          )}
                        </div>
                        {r.excerpt && (
                          <span className="line-clamp-1 text-ink-3" style={{ fontSize: 13 }}>
                            {r.excerpt}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

const MEMORY_CATEGORIES = new Set([
  "person", "company", "idea", "blog", "book", "research", "isa", "lesson", "wisdom",
]);

function KnowledgeLanding({ data }: { data: WikiIndex }) {
  const knowledgeEntries = data.recentChanges.filter((p) => MEMORY_CATEGORIES.has(p.category));

  const isFreshInstall = data.stats.totalPages === 0;

  return (
    <div className="h-full overflow-y-auto">
      <PageShell>
        {isFreshInstall && (
          <EmptyStateGuide
            section="Cortex"
            description="Everything the system knows — people, companies, ideas, research, work sessions (ISAs), lessons, and wisdom. Notes live under ~/.claude/LIFEOS/MEMORY/."
            daPromptExample="help me start my memory archive"
          />
        )}

        <PageHeader
          title="Cortex"
          subtitle="The memory system — everything we know, searchable, browsable, one graph"
        />

        <KnowledgeHeroSearch totalPages={data.stats.totalPages} />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: Users, label: "People", count: data.stats.totalPeople, dim: "relationships" as const },
            { icon: Building2, label: "Companies", count: data.stats.totalCompanies, dim: "money" as const },
            { icon: Lightbulb, label: "Ideas", count: data.stats.totalIdeas, dim: "freedom" as const },
            { icon: Newspaper, label: "Blogs", count: data.stats.totalBlogs ?? 0, dim: "creative" as const },
            { icon: BookOpen, label: "Books", count: data.stats.totalBooks ?? 0, dim: "creative" as const },
            { icon: FlaskConical, label: "Research", count: data.stats.totalResearch ?? 0, dim: "freedom" as const },
            { icon: Workflow, label: "ISAs", count: data.stats.totalIsas ?? 0, dim: "rhythms" as const },
            { icon: GraduationCap, label: "Lessons", count: data.stats.totalLessons ?? 0, dim: "health" as const },
            { icon: Sparkles, label: "Wisdom", count: data.stats.totalWisdom ?? 0, dim: "freedom" as const },
          ].map(({ icon: Icon, label, count, dim }) => (
            <StatTile key={label} icon={Icon} label={label} value={count} dim={dim} />
          ))}
        </div>

        {/* Recent changes */}
        <Panel className="p-0">
          <PanelHeader title="Recent Changes" icon={Clock} className="px-5 pt-5 mb-0" />
          <div className="divide-y divide-line-1">
            {knowledgeEntries.slice(0, 20).map((page) => {
              const Icon = CATEGORY_ICONS[page.category] || Lightbulb;
              const dim = CATEGORY_DIMENSIONS[page.category] || "freedom";
              return (
                <Link
                  key={page.slug + page.category}
                  href={wikiPageUrl(page.category, page.slug)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-3 transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0 text-ink-3" />
                  <Pill dim={dim}>{page.category}</Pill>
                  <span className="truncate min-w-0 flex-1 text-ink-1" style={{ fontSize: 14 }}>
                    {page.title}
                  </span>
                  {page.author && (
                    <span className="shrink-0 truncate max-w-[180px] text-ink-2" style={{ fontSize: 13 }}>
                      {page.author}
                    </span>
                  )}
                  <span className="shrink-0 tabular-nums mono text-ink-3" style={{ fontSize: 12 }}>
                    {new Date(page.lastModified).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Link>
              );
            })}
          </div>
        </Panel>
      </PageShell>
    </div>
  );
}

function KnowledgePageInner() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const slug = searchParams.get("slug");
  const isViewingKnowledge = !!category && !!slug;
  const isViewing = isViewingKnowledge;

  const { data: indexData } = useQuery<WikiIndex>({
    queryKey: ["wiki-index"],
    queryFn: async () => {
      const res = await fetch("/api/wiki");
      if (!res.ok) throw new Error("Failed to fetch wiki index");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: knowledgeDetail } = useQuery<PageDetail>({
    queryKey: ["wiki-knowledge", category, slug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/knowledge/${category}/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch knowledge note");
      return res.json();
    },
    enabled: isViewingKnowledge,
  });

  if (isViewingKnowledge && knowledgeDetail) {
    return (
      <div className="flex h-full">
        {/* inline flex: `flex-1` here loses its grow to an unlayered CSS rule and collapses the body to width 0 — inline restores it */}
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl" style={{ flex: "1 1 auto", minWidth: 0 }}>
          <MarkdownRenderer content={knowledgeDetail.content} />
        </div>
        <WikiMeta
          title={knowledgeDetail.title}
          category={knowledgeDetail.category}
          tags={knowledgeDetail.tags}
          quality={knowledgeDetail.quality}
          lastModified={knowledgeDetail.lastModified}
          wordCount={knowledgeDetail.wordCount}
          backlinks={knowledgeDetail.backlinks}
          filePath={knowledgeDetail.filePath}
          author={knowledgeDetail.author}
          source={knowledgeDetail.source}
          sourceUrl={knowledgeDetail.sourceUrl}
          postDate={knowledgeDetail.postDate}
          related={knowledgeDetail.related}
        />
      </div>
    );
  }

  if (!isViewing && indexData) {
    return <KnowledgeLanding data={indexData} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm text-ink-3">Loading...</div>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-ink-3">Loading...</div>
        </div>
      }
    >
      <KnowledgePageInner />
    </Suspense>
  );
}
