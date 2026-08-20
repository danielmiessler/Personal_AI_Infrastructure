"use client";

import Link from "next/link";
import { wikiPageUrl } from "@/lib/wiki-links";
import {
  ArrowLeft,
  Clock,
  FileText,
  Star,
  Tag,
  BookOpen,
  Copy,
  User,
  Link as LinkIcon,
  Calendar,
} from "lucide-react";

interface Backlink {
  slug: string;
  title: string;
  category: string;
}

interface WikiMetaProps {
  title: string;
  category: string;
  tags?: string[];
  quality?: number;
  lastModified?: string;
  wordCount?: number;
  backlinks?: Backlink[];
  filePath?: string;
  author?: string;
  source?: string;
  sourceUrl?: string;
  postDate?: string;
  related?: Backlink[];
}

const CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "system-doc": { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  person: { text: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  company: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  idea: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  blog: { text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
};

function qualityColor(q: number): string {
  if (q >= 7) return "text-ok";
  if (q >= 4) return "text-warn";
  return "text-err";
}

function readingTime(words: number): string {
  const mins = Math.ceil(words / 200);
  return `${mins} min read`;
}

const categoryLink = wikiPageUrl;

export default function WikiMeta({
  title: _title,
  category,
  tags,
  quality,
  lastModified,
  wordCount,
  backlinks,
  filePath,
  author,
  source,
  sourceUrl,
  postDate,
  related,
}: WikiMetaProps) {
  void _title;
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS["system-doc"];

  return (
    <aside className="w-56 shrink-0 border-l border-line-1 bg-surface-1 overflow-y-auto h-[calc(100vh_-_var(--app-header-h,calc(3.5rem_+_1px)))] p-4 space-y-5">
      {/* Category badge */}
      <div>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-[13px] rounded-full ${colors.text} ${colors.bg} border ${colors.border}`}
          style={{ fontFamily: "'concourse-t3', sans-serif" }}
        >
          <BookOpen className="w-3 h-3" />
          {category.replace("-", " ").toUpperCase()}
        </span>
      </div>

      {/* Author */}
      {author && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Author
          </div>
          <div className="flex items-center gap-2 text-sm text-ink-1" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            <User className="w-3.5 h-3.5 shrink-0 text-ink-3" />
            <span>{author}</span>
          </div>
        </div>
      )}

      {/* Source */}
      {(source || sourceUrl) && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Source
          </div>
          {source && (
            <div className="flex items-center gap-2 text-sm text-ink-1 mb-1" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
              <BookOpen className="w-3.5 h-3.5 shrink-0 text-ink-3" />
              <span>{source}</span>
            </div>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 hover:underline break-all"
              style={{ fontFamily: "'concourse-t3', sans-serif" }}
            >
              <LinkIcon className="w-3 h-3 shrink-0" />
              <span className="truncate">{sourceUrl.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>
      )}

      {/* Post date (original publication) */}
      {postDate && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Published
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-2" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            <Calendar className="w-3 h-3" />
            <span>
              {(() => {
                // Parse YYYY-MM-DD as local date, not UTC, to avoid timezone shift.
                const m = postDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
                const d = m
                  ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
                  : new Date(postDate);
                return d.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Quality (knowledge notes only) */}
      {quality !== undefined && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Quality
          </div>
          <div className="flex items-center gap-2">
            <Star className={`w-3.5 h-3.5 ${qualityColor(quality)}`} />
            <span className={`text-sm font-semibold ${qualityColor(quality)}`} style={{ fontFamily: "'concourse-t3', sans-serif" }}>
              {quality}/10
            </span>
          </div>
        </div>
      )}

      {/* Word count & reading time */}
      {wordCount !== undefined && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Length
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-2" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            <FileText className="w-3 h-3" />
            <span>{wordCount.toLocaleString()} words</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-3 mt-1" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            <Clock className="w-3 h-3" />
            <span>{readingTime(wordCount)}</span>
          </div>
        </div>
      )}

      {/* Last modified */}
      {lastModified && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Updated
          </div>
          <div className="text-xs text-ink-2" style={{ fontFamily: "'concourse-t3', sans-serif" }}>
            {new Date(lastModified).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[13px] rounded bg-surface-3 text-ink-2 border border-line-2"
                style={{ fontFamily: "'concourse-t3', sans-serif" }}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related (frontmatter cross-links) */}
      {related && related.length > 0 && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            Related ({related.length})
          </div>
          <div className="space-y-1">
            {related.map((rel) => {
              const relColors = CATEGORY_COLORS[rel.category] || CATEGORY_COLORS["system-doc"];
              return (
                <Link
                  key={rel.slug}
                  href={categoryLink(rel.category, rel.slug)}
                  className={`block px-2 py-1.5 text-[14px] rounded transition-colors ${relColors.text} hover:${relColors.bg}`}
                  style={{ fontFamily: "'concourse-t3', sans-serif" }}
                >
                  {rel.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Backlinks */}
      {backlinks && backlinks.length > 0 && (
        <div>
          <div className="text-[13px] text-ink-3 uppercase tracking-wider mb-1.5" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            <ArrowLeft className="w-3 h-3 inline mr-1" />
            Linked from ({backlinks.length})
          </div>
          <div className="space-y-1">
            {backlinks.map((bl) => {
              const blColors = CATEGORY_COLORS[bl.category] || CATEGORY_COLORS["system-doc"];
              return (
                <Link
                  key={bl.slug}
                  href={categoryLink(bl.category, bl.slug)}
                  className={`block px-2 py-1.5 text-[14px] rounded transition-colors ${blColors.text} hover:${blColors.bg}`}
                  style={{ fontFamily: "'concourse-t3', sans-serif" }}
                >
                  {bl.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* File path (copy to clipboard) */}
      {filePath && (
        <div>
          <button
            onClick={() => navigator.clipboard.writeText(filePath)}
            className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink-2 transition-colors"
            style={{ fontFamily: "'concourse-t3', sans-serif" }}
            title="Copy file path"
          >
            <Copy className="w-3 h-3" />
            <span className="truncate max-w-[180px]">Copy path</span>
          </button>
        </div>
      )}
    </aside>
  );
}
