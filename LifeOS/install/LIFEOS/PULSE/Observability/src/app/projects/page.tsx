"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderGit2, ExternalLink, Rocket, Layers, Radio } from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  Pill,
} from "@/components/ui/chrome";

interface Project {
  name: string;
  rawName: string;
  path: string;
  url: string;
  href: string;
  deploy: string;
  stack: string;
  badges: string[];
  openSession: boolean;
}

interface ProjectsSnapshot {
  count: number;
  source: string;
  generatedAt: string;
  projects: Project[];
}

function ProjectRow({ p }: { p: Project }) {
  return (
    <div className="py-3 border-b border-line-1 last:border-b-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-ink-1">{p.name}</span>
        {p.openSession && <Pill dim="ok">open session</Pill>}
        {p.badges?.map((b, i) => (
          <Pill key={i}>{b}</Pill>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
        {p.path && (
          <span className="mono truncate" title={p.path}>
            {p.path}
          </span>
        )}
        {p.stack && (
          <span className="inline-flex items-center gap-1">
            <Layers size={12} /> {p.stack}
          </span>
        )}
        {p.deploy && (
          <span className="inline-flex items-center gap-1 mono" title={p.deploy}>
            <Rocket size={12} /> {p.deploy}
          </span>
        )}
        {p.href && (
          <a
            href={p.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-ink-2 hover:text-ink-1"
          >
            <ExternalLink size={12} /> {p.url}
          </a>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [data, setData] = useState<ProjectsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        setData(await res.json());
        setError(null);
      } else {
        setError(`/api/projects → ${res.status}`);
      }
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data && !error) {
    return (
      <PageShell>
        <PageHeader icon={FolderGit2} title="Projects" subtitle="Loading projects…" />
      </PageShell>
    );
  }

  const openCount = data ? data.projects.filter((p) => p.openSession).length : 0;

  return (
    <PageShell>
      <PageHeader
        icon={FolderGit2}
        title="Projects"
        subtitle="Your tracked projects, read from USER/PROJECTS.md — path, stack, deploy command, and live URL."
      />

      {error && (
        <Panel>
          <span className="text-sm" style={{ color: "var(--err)" }}>
            {error}
          </span>
        </Panel>
      )}

      {data && (
        <>
          {data.count === 0 && (
            <EmptyStateGuide
              section="Projects"
              description="Your active projects, routed from USER/PROJECTS.md."
              hideInterview
              daPromptExample="add my project to PROJECTS.md"
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatTile icon={FolderGit2} dim="blue" label="Projects" value={data.count} sub={data.source} />
            <StatTile icon={Radio} dim="ok" label="Open sessions" value={openCount} sub="resumable now" />
          </div>

          {data.count > 0 && (
            <Panel>
              <PanelHeader icon={FolderGit2} title="Tracked projects" />
              <div>
                {data.projects.map((p, i) => (
                  <ProjectRow key={i} p={p} />
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </PageShell>
  );
}
