"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Terminal, FolderClosed, RotateCw, FolderGit2 } from "lucide-react";
import { Panel, Pill, EmptyState } from "@/components/ui/chrome";
import type { Dim } from "@/components/ui/chrome";

/**
 * ProjectsBoard — renders one project group (a tab's worth) from /api/projects.
 * Pure view: the parent owns the fetch and passes the group in. Zero data in this
 * component; every card is derived from the USER source files at request time
 * (code/content separation — nothing about any specific project is hardcoded).
 */

type Badge = "system-of-record" | "sensitive" | "in-design" | "decommissioned" | "concept";

export interface Project {
  name: string;
  rawName: string;
  path: string;
  url: string;
  href: string | null;
  deploy: string;
  stack: string;
  badges: Badge[];
  openSession: boolean;
}

export interface ProjectGroup {
  key: string;
  label: string;
  source: string;
  count: number;
  projects: Project[];
  error?: string;
}

const BADGE_META: Record<Badge, { label: string; dim: Dim }> = {
  "system-of-record": { label: "System of Record", dim: "money" },
  sensitive: { label: "Sensitive", dim: "err" },
  "in-design": { label: "In Design", dim: "blue" },
  decommissioned: { label: "Decommissioned", dim: "neutral" },
  concept: { label: "Concept", dim: "relationships" },
};

export default function ProjectsBoard({ group }: { group: ProjectGroup }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return group.projects;
    return group.projects.filter((p) =>
      [p.name, p.stack, p.path, p.url].some((f) => f?.toLowerCase().includes(needle)),
    );
  }, [group, q]);

  if (group.projects.length === 0) {
    return (
      <EmptyState
        icon={FolderGit2}
        title={group.error ? `Couldn't read ${group.source}` : "No projects yet"}
        hint={group.error ?? `No projects in ${group.source} yet.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-ink-3 text-sm">
          <code className="text-ink-2">{group.source}</code> · {group.count}
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, stack, path…"
          className="w-full sm:w-64 px-3 py-1.5 rounded-lg bg-surface-1 border border-line-2 text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-line-3"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p, i) => (
          <Panel key={`${p.name}-${i}`} hover className="p-4 flex flex-col gap-2">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-ink-1 font-medium">{p.name}</div>
                {p.href ? (
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent-blue)] hover:text-ink-1 text-sm mt-0.5 truncate max-w-full"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p.url}</span>
                  </a>
                ) : (
                  p.url && p.url !== "—" && <div className="text-ink-3 text-sm mt-0.5 truncate">{p.url}</div>
                )}
              </div>
              {p.openSession && (
                <Pill dim="ok" className="shrink-0">
                  <RotateCw className="w-3 h-3" />
                  Resume
                </Pill>
              )}
            </div>

            {/* Badges */}
            {p.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.badges.map((b) => (
                  <Pill key={b} dim={BADGE_META[b].dim}>
                    {BADGE_META[b].label}
                  </Pill>
                ))}
              </div>
            )}

            {/* Stack / description */}
            {p.stack && <div className="text-ink-2 text-sm leading-snug line-clamp-3">{p.stack}</div>}

            {/* Path + deploy — sensitive (local paths, deploy commands may carry
                secrets); marked data-sensitive so Observer mode blurs them. */}
            {(p.path || (p.deploy && p.deploy !== "—")) && (
              <div className="flex flex-col gap-1 mt-auto pt-1 text-[12px]">
                {p.path && (
                  <div className="flex items-center gap-1.5 text-ink-3 min-w-0">
                    <FolderClosed className="w-3 h-3 shrink-0" />
                    <code className="truncate" data-sensitive title={p.path}>
                      {p.path}
                    </code>
                  </div>
                )}
                {p.deploy && p.deploy !== "—" && (
                  <div className="flex items-center gap-1.5 text-ink-3 min-w-0">
                    <Terminal className="w-3 h-3 shrink-0" />
                    <code className="truncate" data-sensitive title={p.deploy}>
                      {p.deploy}
                    </code>
                  </div>
                )}
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}
