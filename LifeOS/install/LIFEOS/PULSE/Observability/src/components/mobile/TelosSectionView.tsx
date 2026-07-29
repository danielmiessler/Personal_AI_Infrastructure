"use client";

/**
 * One TELOS section, on its own page.
 *
 * The desktop TELOS view stacks twelve sections into a single scroll. That is
 * a lot of page on a phone, so mobile renders exactly one — but renders it via
 * the shared registry, with the same context object app.tsx builds, so the
 * section on the phone is the section on the desktop.
 *
 * Data comes from `useTelosData`, the same hook app.tsx uses. Nothing here
 * fetches or derives anything of its own.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutList } from "lucide-react";
import { TELOS_SECTIONS, telosSection, type TelosSectionCtx } from "@/app/telos/_v7/section-registry";
import { useTelosData } from "@/app/telos/_v7/use-telos-data";
import { useTweaks } from "@/app/telos/_v7/tweaks";
import { FileEditor } from "@/app/telos/_v7/file-editor";
import SectionErrorBoundary from "./SectionErrorBoundary";

export default function TelosSectionView({ slug }: { slug: string }) {
  const { telos, refetch, isPersonalized, error } = useTelosData();
  const tweaks = useTweaks();
  const router = useRouter();
  const [mission, setMission] = useState("M0");
  const [editingFile, setEditingFile] = useState<string | null>(null);

  const section = telosSection(slug);
  const index = TELOS_SECTIONS.findIndex((s) => s.slug === slug);
  const prev = index > 0 ? TELOS_SECTIONS[index - 1] : null;
  const next = index >= 0 && index < TELOS_SECTIONS.length - 1 ? TELOS_SECTIONS[index + 1] : null;

  if (!section) {
    return (
      <div className="pm-telos-msg">
        Unknown TELOS section “{slug}”.{" "}
        <Link href="/m/telos">Back to the section list</Link>
      </div>
    );
  }

  if (!telos) {
    return (
      <div className="pm-telos-msg">
        {error ? (
          <>
            Can’t load TELOS from the Pulse daemon ({error}).{" "}
            <button type="button" onClick={refetch}>Retry</button>
          </>
        ) : (
          "Loading…"
        )}
      </div>
    );
  }

  const openItem = (id: string) => {
    if (id) router.push(`/m/telos/item?id=${encodeURIComponent(id)}`);
  };

  const ctx: TelosSectionCtx = {
    telos,
    showIds: false,
    tone: tweaks.vals.narrativeTone,
    isPersonalized,
    missionId: mission,
    onMission: setMission,
    onTrace: (id) => { if (id) openItem(id); },
    onOpenGoal: (g) => openItem(g.id),
    onOpenItem: openItem,
    openFile: (name) => setEditingFile(name),
  };

  return (
    <>
      <main className="frame pm-telos-section" data-tone={tweaks.vals.narrativeTone} data-view="columns">
        <SectionErrorBoundary label={section.label}>{section.render(ctx)}</SectionErrorBoundary>

        <nav className="pm-telos-pager" aria-label="TELOS sections">
          {prev ? (
            <Link href={`/m/telos/${prev.slug}`} className="pm-pager-btn">
              <ChevronLeft className="w-4 h-4" />
              <span className="truncate">{prev.label}</span>
            </Link>
          ) : <span />}
          <Link href="/m/telos" className="pm-pager-all" aria-label="All TELOS sections">
            <LayoutList className="w-4 h-4" />
          </Link>
          {next ? (
            <Link href={`/m/telos/${next.slug}`} className="pm-pager-btn pm-pager-next">
              <span className="truncate">{next.label}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : <span />}
        </nav>
      </main>

      <FileEditor
        open={!!editingFile}
        filename={editingFile}
        onClose={() => setEditingFile(null)}
        onSaved={() => { setEditingFile(null); refetch(); }}
      />
    </>
  );
}
