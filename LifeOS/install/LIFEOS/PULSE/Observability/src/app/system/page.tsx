"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import WikiMeta from "@/components/wiki/WikiMeta";
import { BookOpen, Clock, FileText, Users, Building2, Lightbulb, Bookmark, ExternalLink } from "lucide-react";
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
}

interface WikiIndex {
  tree: unknown[];
  recentChanges: WikiPage[];
  stats: {
    totalPages: number;
    totalSystem: number;
    totalPeople: number;
    totalCompanies: number;
    totalIdeas: number;
    totalBooks: number;
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
  wikilinks: string[];
  tags?: string[];
  quality?: number;
  filePath?: string;
}

interface BookmarkDetail {
  slug: string;
  id: string;
  title: string;
  category: "bookmark";
  url: string;
  excerpt: string;
  note: string;
  folder: string;
  tags: string[];
  created: string;
  cover: string;
  favorite: boolean;
  wordCount: number;
  lastModified: string;
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  "system-doc": BookOpen,
  person: Users,
  company: Building2,
  idea: Lightbulb,
  book: BookOpen,
};

// Doc-category color scale — mirrors the knowledge-graph node color scale so the
// wiki landing and the graph legend read as one coded set. Values are design tokens.
const CATEGORY_COLOR_VAR: Record<string, string> = {
  "system-doc": "var(--accent-blue)",
  person: "var(--freedom)",
  company: "var(--money)",
  idea: "var(--relationships)",
  book: "var(--creative)",
};

const pageLink = wikiPageUrl;

// Landing page — shown when no doc/knowledge is selected
function WikiLanding({ data }: { data: WikiIndex }) {
  const tiles: Array<{ icon: typeof FileText; label: string; count: number; dim?: Dim }> = [
    { icon: FileText, label: "Total", count: data.stats.totalPages },
    { icon: BookOpen, label: "System", count: data.stats.totalSystem, dim: "blue" },
    { icon: Users, label: "People", count: data.stats.totalPeople, dim: "freedom" },
    { icon: Building2, label: "Companies", count: data.stats.totalCompanies, dim: "money" },
    { icon: Lightbulb, label: "Ideas", count: data.stats.totalIdeas, dim: "relationships" },
    { icon: BookOpen, label: "Books", count: data.stats.totalBooks, dim: "creative" },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={BookOpen}
        title="System"
        subtitle="System documentation & knowledge archive"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <StatTile key={t.label} icon={t.icon} label={t.label} value={t.count} dim={t.dim} />
        ))}
      </div>

      {/* Recent changes */}
      <Panel>
        <PanelHeader title="Recent Changes" icon={Clock} />
        <div className="space-y-1">
          {data.recentChanges.slice(0, 20).map((page) => {
            const Icon = CATEGORY_ICONS[page.category] || FileText;
            const color = CATEGORY_COLOR_VAR[page.category] || "var(--ink-3)";
            return (
              <Link
                key={page.slug + page.category}
                href={pageLink(page.category, page.slug)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 transition-colors group"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                {/* Knowledge-archive entries (people, companies, ideas…) are personal;
                    system docs stay readable in Observer mode. */}
                <span
                  className="text-[13px] text-ink-2 group-hover:text-ink-1 transition-colors truncate"
                  style={{ fontFamily: "'concourse-t3', sans-serif" }}
                  data-sensitive={page.category !== "system-doc" ? "" : undefined}
                >
                  {page.title}
                </span>
                <span className="ml-auto text-[13px] text-ink-3 shrink-0 tabular-nums" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
                  {new Date(page.lastModified).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {page.quality !== undefined && (
                  <span className={`text-[13px] shrink-0 ${page.quality >= 7 ? "text-ok" : page.quality >= 4 ? "text-warn" : "text-err"}`}>
                    Q{page.quality}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </Panel>
    </PageShell>
  );
}

// Document viewer — shown when a doc or knowledge note is selected
function DocViewer({ detail }: { detail: PageDetail }) {
  return (
    <div className="flex h-full">
      {/* inline flex: `flex-1` here loses its grow to an unlayered CSS rule and collapses the body to width 0 — inline restores it */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl" style={{ flex: "1 1 auto", minWidth: 0 }}>
        <MarkdownRenderer content={detail.content} />
      </div>
      <WikiMeta
        title={detail.title}
        category={detail.category}
        tags={detail.tags}
        quality={detail.quality}
        lastModified={detail.lastModified}
        wordCount={detail.wordCount}
        backlinks={detail.backlinks}
        filePath={detail.filePath}
      />
    </div>
  );
}

// Bookmark viewer — shown when a bookmark is selected
function BookmarkViewer({ detail }: { detail: BookmarkDetail }) {
  return (
    <PageShell className="max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bookmark className="w-4 h-4 shrink-0" style={{ color: "var(--creative)" }} />
          <span className="text-[13px] uppercase tracking-wider" style={{ fontFamily: "'advocate-c14', sans-serif", color: "var(--creative)" }}>
            Bookmark
          </span>
          {detail.favorite && (
            <span className="text-[13px] text-warn ml-2">Favorite</span>
          )}
        </div>
        <h1
          className="text-xl font-bold text-ink-1 leading-tight"
          style={{ fontFamily: "'concourse-t3', sans-serif" }}
        >
          {detail.title}
        </h1>
      </div>

      {/* URL */}
      {detail.url && (
        <a
          href={detail.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity break-all"
          style={{ fontFamily: "'concourse-t3', sans-serif", color: "var(--accent-blue)" }}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {detail.url.length > 80 ? detail.url.slice(0, 77) + "..." : detail.url}
        </a>
      )}

      {/* Cover image */}
      {detail.cover && (
        <div className="rounded-lg overflow-hidden border border-line-2 bg-surface-2">
          <img
            src={detail.cover}
            alt={detail.title}
            className="w-full max-h-64 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {/* Excerpt */}
      {detail.excerpt && (
        <Panel className="p-4">
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-2" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Excerpt
          </div>
          <p className="text-sm text-ink-2 leading-relaxed" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            {detail.excerpt}
          </p>
        </Panel>
      )}

      {/* Note */}
      {detail.note && (
        <Panel className="p-4">
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-2" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Note
          </div>
          <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            {detail.note}
          </p>
        </Panel>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-[13px]">
        {detail.folder && (
          <div>
            <span className="text-ink-3">Folder</span>
            <p className="text-ink-2 mt-0.5" style={{ fontFamily: "'concourse-t3', sans-serif" }}>{detail.folder}</p>
          </div>
        )}
        {detail.created && (
          <div>
            <span className="text-ink-3">Saved</span>
            <p className="text-ink-2 mt-0.5" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
              {new Date(detail.created).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        )}
        {detail.tags.length > 0 && (
          <div className="col-span-2">
            <span className="text-ink-3">Tags</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {detail.tags.map((tag) => (
                <Pill key={tag} dim="neutral">{tag}</Pill>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function LifeosPageInner() {
  const searchParams = useSearchParams();
  const docSlug = searchParams.get("doc");
  const knowledgeCategory = searchParams.get("knowledge");
  const knowledgeSlug = searchParams.get("slug");
  const bookmarkSlug = searchParams.get("bookmark");

  const isViewingDoc = !!docSlug;
  const isViewingKnowledge = !!knowledgeCategory && !!knowledgeSlug;
  const isViewingBookmark = !!bookmarkSlug;
  const isViewing = isViewingDoc || isViewingKnowledge || isViewingBookmark;

  // Fetch wiki index (for landing page)
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

  // Fetch individual doc
  const { data: docDetail, isError: docError, error: docErr } = useQuery<PageDetail>({
    queryKey: ["wiki-doc", docSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/doc/${docSlug}`);
      if (!res.ok) throw new Error(`Failed to fetch doc: ${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: isViewingDoc,
    retry: false,
  });

  // Fetch individual knowledge note
  const { data: knowledgeDetail, isError: knowledgeError, error: knowledgeErr } = useQuery<PageDetail>({
    queryKey: ["wiki-knowledge", knowledgeCategory, knowledgeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/knowledge/${knowledgeCategory}/${knowledgeSlug}`);
      if (!res.ok) throw new Error(`Failed to fetch knowledge note: ${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: isViewingKnowledge,
    retry: false,
  });

  // Fetch individual bookmark
  const { data: bookmarkDetail, isError: bookmarkError, error: bookmarkErr } = useQuery<BookmarkDetail>({
    queryKey: ["wiki-bookmark", bookmarkSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/bookmark/${bookmarkSlug}`);
      if (!res.ok) throw new Error(`Failed to fetch bookmark: ${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: isViewingBookmark,
    retry: false,
  });

  const detail = docDetail || knowledgeDetail;
  const fetchError = docError || knowledgeError || bookmarkError;
  const errorMessage =
    (docErr as Error | null)?.message ||
    (knowledgeErr as Error | null)?.message ||
    (bookmarkErr as Error | null)?.message ||
    "Unknown error";

  if (isViewingBookmark && bookmarkDetail) {
    // Bookmarks carry the principal's own notes — Observer mode blurs them.
    return (
      <div data-sensitive>
        <BookmarkViewer detail={bookmarkDetail} />
      </div>
    );
  }

  if (isViewing && detail) {
    return <DocViewer detail={detail} />;
  }

  if (!isViewing && indexData) {
    return <WikiLanding data={indexData} />;
  }

  // Error state — fetch failed (e.g. 404 for an unknown slug)
  if (isViewing && fetchError) {
    const requestedSlug = docSlug || knowledgeSlug || bookmarkSlug || "";
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 max-w-md mx-auto text-center">
        <div className="text-sm text-err mb-2" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
          Page not found
        </div>
        <div className="text-[13px] text-ink-2 mb-4 break-all" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
          {requestedSlug}
        </div>
        <div className="text-[13px] text-ink-3 mb-4" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
          {errorMessage}
        </div>
        <Link
          href="/system"
          className="text-[13px] underline underline-offset-2 hover:opacity-80"
          style={{ fontFamily: "'concourse-t3', sans-serif", color: "var(--accent-blue)" }}
        >
          Back to wiki index
        </Link>
      </div>
    );
  }

  // Loading state
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[13px] text-ink-2" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
        Loading...
      </div>
    </div>
  );
}

export default function LifeosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-[13px] text-ink-2" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            Loading...
          </div>
        </div>
      }
    >
      <LifeosPageInner />
    </Suspense>
  );
}
