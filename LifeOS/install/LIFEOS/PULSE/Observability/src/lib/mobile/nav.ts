/**
 * Mobile navigation — derived entirely from the shared nav manifest.
 *
 * Nothing here restates a page list. Add a page to nav-manifest.ts and it
 * appears in the mobile "More" sheet with no edit in this file; reorder the
 * manifest and the thumb bar reorders with it.
 */

import { tier1Nav, metaNav, systemNav, paletteEntries, type NavItem } from "@/lib/palette/nav-manifest";
// The manifest, not the registry — nav needs labels, not React.
import { TELOS_SECTION_META, telosSectionMeta } from "@/app/telos/_v7/section-manifest";
import { MOBILE_PREFIX, toMobilePath } from "./config";

/** The manifest's own home entry — never a second declaration of it. */
export const homeItem: NavItem = paletteEntries[0];

/**
 * The thumb bar. Four destinations plus "More" is the most a 390px row holds
 * with a legible label, so it carries home, the two leading life sections, and
 * the meta view — all read off the manifest.
 */
export function thumbBarItems(): NavItem[] {
  return [homeItem, ...tier1Nav.slice(0, 2), ...metaNav.slice(0, 1)];
}

/** A menu entry with its destination already resolved to a mobile URL. */
export interface MobileNavItem {
  to: string;
  label: string;
  icon?: NavItem["icon"];
  /** Desktop path this entry corresponds to, for active-state matching. */
  match: string;
}

export interface NavGroup {
  title: string;
  items: MobileNavItem[];
  /** Two-up cards vs a single readable column (long labels). */
  layout?: "grid" | "list";
}

const fromManifest = (items: readonly NavItem[]): MobileNavItem[] =>
  items.map((i) => ({ to: toMobilePath(i.href), label: i.label, icon: i.icon, match: i.href }));

/**
 * Everything the burger menu offers, grouped.
 *
 * The TELOS group is the one that isn't a manifest mirror: those pages exist
 * only on mobile, because the desktop renders all twelve sections as one
 * scroll. They come off the same registry the desktop stack renders from, so
 * this menu lists exactly the sections that exist.
 */
export function moreGroups(): NavGroup[] {
  return [
    {
      title: "TELOS",
      layout: "list",
      items: TELOS_SECTION_META.map((s) => ({
        to: `${MOBILE_PREFIX}/telos/${s.slug}`,
        label: s.label,
        match: `/telos/${s.slug}`,
      })),
    },
    { title: "Sections", items: fromManifest(tier1Nav) },
    { title: "Meta", items: fromManifest(metaNav) },
    { title: "System", items: fromManifest(systemNav) },
  ];
}

/**
 * Titles for the route pages the nav manifest doesn't name. These pages exist
 * and are linked from within other pages, so a phone must be able to land on
 * them — but they are deliberately not in the manifest's nav, so their labels
 * have nowhere else to live.
 */
const UNLISTED_TITLES: Record<string, string> = {
  air: "Air",
  books: "Books",
  life: "Life",
  system: "System",
  "system/graph": "System Graph",
};

/** What the top bar calls the current page. Manifest first, always. */
export function pageTitle(desktopPath: string): string {
  // A TELOS section page names itself, not its parent.
  const telosMatch = desktopPath.match(/^\/telos\/([^/]+)$/);
  if (telosMatch) {
    const section = telosSectionMeta(telosMatch[1]);
    if (section) return section.label;
  }

  const exact = paletteEntries.find((e) => e.href === desktopPath);
  if (exact) return exact.label;

  const key = desktopPath.replace(/^\//, "");
  if (UNLISTED_TITLES[key]) return UNLISTED_TITLES[key];

  // Nested route (e.g. /telos/item) — fall back to its section's label.
  const section = paletteEntries
    .filter((e) => e.href !== "/" && desktopPath.startsWith(e.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return section ? section.label : "Pulse";
}
