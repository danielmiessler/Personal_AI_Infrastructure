"use client";

/**
 * TELOS section registry — what each section in `section-manifest.ts` renders.
 *
 * The desktop columns view maps over this to stack every section on one page.
 * The mobile interface maps over the same array to build its menu and to
 * render exactly one section per route. Neither side declares its own list, so
 * a section added to the manifest and given a renderer here appears in both
 * places, with the same label, wired to the same props.
 *
 * `render` takes the whole context rather than each section taking its own
 * props: the prop wiring lived inline in app.tsx, and copying it into the
 * mobile host is precisely the duplication that goes stale the first time a
 * section gains a prop.
 */

import { Fragment, type ReactNode } from "react";
import type { Telos, Goal } from "./data";
import { TELOS_SECTION_META, type TelosSectionMeta } from "./section-manifest";
import { Hero } from "./hero";
import {
  Problems,
  MissionGoals,
  Metrics,
  ChallengeStrategy,
  Team,
  Budget,
  Recommendations,
  Preferences,
} from "./sections";
import { What } from "./what";
import { Stranded } from "./stranded";
import { SubTabs } from "./subtabs";

export interface TelosSectionCtx {
  telos: Telos;
  showIds: boolean;
  tone: string;
  isPersonalized: boolean;
  missionId: string;
  onMission: (id: string) => void;
  onTrace: (id: string | null) => void;
  onOpenGoal: (g: Goal) => void;
  onOpenItem: (id: string) => void;
  openFile: (name: string) => void;
}

export type TelosSectionRenderer = (c: TelosSectionCtx) => ReactNode;

export interface TelosSection extends TelosSectionMeta {
  render: TelosSectionRenderer;
}

/** Keyed by manifest slug. `section-registry.test.ts` asserts full coverage. */
export const TELOS_RENDERERS: Record<string, TelosSectionRenderer> = {
  current: (c) => (
    <Hero
      telos={c.telos}
      tone={c.tone}
      showIds={c.showIds}
      onTrace={c.onTrace}
      openFile={c.openFile}
      isPersonalized={c.isPersonalized}
    />
  ),
  problems: (c) => <Problems telos={c.telos} onTrace={c.onTrace} showIds={c.showIds} openFile={c.openFile} />,
  mission: (c) => (
    <MissionGoals
      telos={c.telos}
      onTrace={c.onTrace}
      showIds={c.showIds}
      openFile={c.openFile}
      missionId={c.missionId}
      onMission={c.onMission}
      onOpenGoal={c.onOpenGoal}
    />
  ),
  metrics: (c) => <Metrics telos={c.telos} onTrace={c.onTrace} showIds={c.showIds} openFile={c.openFile} />,
  challenges: (c) => (
    <ChallengeStrategy
      telos={c.telos}
      onTrace={c.onTrace}
      showIds={c.showIds}
      openFile={c.openFile}
      onOpenGoal={c.onOpenGoal}
    />
  ),
  projects: (c) => <What telos={c.telos} showIds={c.showIds} onOpenItem={c.onOpenItem} />,
  team: (c) => <Team telos={c.telos} onTrace={c.onTrace} showIds={c.showIds} openFile={c.openFile} />,
  budget: (c) => <Budget telos={c.telos} onTrace={c.onTrace} showIds={c.showIds} openFile={c.openFile} />,
  recommendations: (c) => (
    <Recommendations telos={c.telos} onTrace={c.onTrace} showIds={c.showIds} openFile={c.openFile} />
  ),
  stranded: (c) => <Stranded telos={c.telos} showIds={c.showIds} openFile={c.openFile} />,
  corners: (c) => <SubTabs telos={c.telos} openFile={c.openFile} />,
  preferences: (c) => <Preferences telos={c.telos} openFile={c.openFile} />,
};

export const TELOS_SECTIONS: readonly TelosSection[] = TELOS_SECTION_META.filter(
  (m) => TELOS_RENDERERS[m.slug]
).map((m) => ({ ...m, render: TELOS_RENDERERS[m.slug] }));

export function telosSection(slug: string): TelosSection | undefined {
  return TELOS_SECTIONS.find((s) => s.slug === slug);
}

/** The whole stack, in order — what the desktop columns view renders. */
export function TelosSectionStack({ ctx }: { ctx: TelosSectionCtx }) {
  return (
    <>
      {TELOS_SECTIONS.map((s) => (
        <Fragment key={s.slug}>{s.render(ctx)}</Fragment>
      ))}
    </>
  );
}
