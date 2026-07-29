/**
 * TELOS section manifest — slugs and labels, and deliberately NO React.
 *
 * This file must stay free of "use client": the mobile route's
 * `generateStaticParams` runs on the server at build time, and a client
 * module's exports arrive there as opaque client references, not values.
 * (Build failure that proved it: `TELOS_SECTIONS.map is not a function`.)
 *
 * `section-registry.tsx` attaches a renderer to each entry for the client
 * side. Labels and order live here, once, for everyone.
 */

export interface TelosSectionMeta {
  /** URL segment under /m/telos/ — stable, never renamed casually. */
  slug: string;
  /** Menu label. Matches the section's own heading. */
  label: string;
  /** One line of what's inside, for the mobile index cards. */
  blurb: string;
}

export const TELOS_SECTION_META: readonly TelosSectionMeta[] = [
  {
    slug: "current",
    label: "Current & Ideal",
    blurb: "Where each dimension of life sits now against where it should be.",
  },
  {
    slug: "problems",
    label: "Problems",
    blurb: "The systemic issues above Mission — why the Mission exists at all.",
  },
  {
    slug: "mission",
    label: "Mission & Goals",
    blurb: "The chosen purpose and the outcomes in its service.",
  },
  {
    slug: "metrics",
    label: "Metrics",
    blurb: "First-class measurements, each linked up to a Goal and down to the Work.",
  },
  {
    slug: "challenges",
    label: "Challenges & Strategies",
    blurb: "Personal blockers, and the plays that answer them.",
  },
  {
    slug: "projects",
    label: "Projects & Work",
    blurb: "What's actually being built, and the state of each piece.",
  },
  {
    slug: "team",
    label: "Team",
    blurb: "Humans and agents doing the Work.",
  },
  {
    slug: "budget",
    label: "Budget",
    blurb: "What's being spent, and on what — money, time, attention.",
  },
  {
    slug: "recommendations",
    label: "Recommendations",
    blurb: "The next two or three moves, with the trace that makes the case.",
  },
  {
    slug: "stranded",
    label: "Stranded",
    blurb: "Work, goals, and strategies that lost their link to the graph.",
  },
  {
    slug: "corners",
    label: "The Corners of Life",
    blurb: "The quieter dimensions, on their own tabs.",
  },
  {
    slug: "preferences",
    label: "Preferences",
    blurb: "How the TELOS view itself is configured.",
  },
];

export function telosSectionMeta(slug: string): TelosSectionMeta | undefined {
  return TELOS_SECTION_META.find((s) => s.slug === slug);
}
