// Single source of truth for Pulse's page manifest.
// AppHeader renders the nav from these arrays; the command palette derives its
// page commands from them. Adding a page here updates both surfaces.
import {
  Activity,
  BarChart3,
  Boxes,
  Bot,
  BookOpen,
  Brain,
  Briefcase,
  Clapperboard,
  Compass,
  Container,
  DollarSign,
  FolderKanban,
  Gauge,
  Home,
  Library,
  MapPin,
  Radar,
  ScrollText,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TreePine,
  TrendingUp,
  UsersRound,
  Waypoints,
  Webhook,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Palette-only match aliases; the nav bar ignores this field. */
  keywords?: string[];
  /**
   * PULSE.toml [modules] key backing this page. When that module is switched
   * off its tab disappears from the nav and the palette instead of opening a
   * page with no data behind it. Entries with no key are always shown — either
   * they are infrastructure, or Pulse cannot serve the dashboard without them.
   * ported from public PR #1749, @elhoim
   */
  module?: string;
}

// ── Tier 1 — the persistent global nav (Life sections + System home).
// This is the ONLY always-visible menu. Everything else is contextual.
export const tier1Nav: NavItem[] = [
  // /life and /books shipped as pages with no route into them from anywhere —
  // not in the nav, not in the palette, reachable only by typing the URL.
  // public issue #1708, @schmetti-dev
  { href: "/life", label: "LIFE", icon: Compass, keywords: ["overview", "today", "snapshot", "dashboard", "rings"] },
  { href: "/telos", label: "TELOS", icon: Target, keywords: ["goals", "mission", "problems"], module: "telos" },
  { href: "/work", label: "WORK", icon: FolderKanban, keywords: ["kanban", "sessions", "tasks", "projects", "repos", "sites"], module: "work" },
  { href: "/content", label: "CONTENT", icon: Clapperboard, keywords: ["videos", "pipeline", "conveyor"], module: "content" },
  { href: "/health", label: "HEALTH", icon: Activity, keywords: ["sleep", "fitness"], module: "health" },
  { href: "/finances", label: "FINANCES", icon: DollarSign, keywords: ["money", "burn", "expenses", "revenue"], module: "finances" },
  { href: "/business", label: "BUSINESS", icon: Briefcase, keywords: ["company", "newsletter"], module: "business" },
  { href: "/growth", label: "GROWTH", icon: TrendingUp, keywords: ["metrics", "subscribers", "audience"], module: "growth" },
  { href: "/local", label: "LOCAL", icon: MapPin, keywords: ["civic", "crime", "city"], module: "local" },
  { href: "/gear", label: "GEAR", icon: Boxes, keywords: ["assets", "inventory", "own", "stuff"], module: "gear" },
  { href: "/books", label: "BOOKS", icon: Library, keywords: ["reading", "library", "favorites", "authors"], module: "books" }, // public issue #1708, @schmetti-dev
  { href: "/atlas", label: "ATLAS", icon: Waypoints, keywords: ["graph", "assets", "estate", "infrastructure", "blast radius", "domains", "workers", "current state"], module: "atlas" },
  { href: "/memory", label: "CORTEX", icon: Brain, keywords: ["memory", "knowledge", "wiki", "notes", "archive", "graph"], module: "memory" },
  { href: "/synapse", label: "SYNAPSE", icon: Share2, keywords: ["ideas", "capture", "router", "amber"], module: "synapse" },
];

// ── Meta — pinned in the header's right cluster on EVERY page, outside both
// tiers. Agents is the view of the system working on itself, so it never
// scrolls away and never depends on which plane you're in.
export const metaNav: NavItem[] = [
  { href: "/agents", label: "AGENTS", icon: UsersRound, keywords: ["system", "vitals", "runs", "meta"] },
];

// Where the pinned SYSTEM mode-switch lands (Agents moved out to metaNav).
export const systemHome = "/assistant";

// ── Tier 2 — contextual. These machine pages render as a second row ONLY when
// you are inside System. They used to be a permanent second global menu.
export const systemNav: NavItem[] = [
  { href: "/assistant", label: "Assistant", icon: Bot, keywords: ["chat", "ask"], module: "da" },
  { href: "/bunker", label: "Bunker", icon: Container, keywords: ["apps", "chassis"], module: "bunker" },
  { href: "/algorithm", label: "Algorithm", icon: Workflow, keywords: ["thinking", "doctrine", "rules", "loop"], module: "algorithm" },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/hooks", label: "Hooks", icon: Webhook },
  { href: "/conduit", label: "Conduit", icon: Radar, keywords: ["sensors"], module: "conduit" },
  { href: "/upgrades", label: "Upgrades", icon: Sparkles, keywords: ["hypotheses", "recommendations", "improvements", "directives", "proposals"], module: "upgrades" },
  { href: "/arbol", label: "Arbol", icon: TreePine, keywords: ["workers", "pipeline"] },
  { href: "/security", label: "Security", icon: ShieldCheck, keywords: ["monitoring"] },
  { href: "/ledger", label: "Ledger", icon: ScrollText, keywords: ["versions", "updates", "deploys", "drift", "integrity", "registry", "changelog"], module: "ledger" },
  { href: "/performance", label: "Perf", icon: BarChart3, keywords: ["performance", "latency"], module: "performance" },
  { href: "/usage", label: "Usage", icon: Gauge, keywords: ["tokens", "cost"], module: "usage" },
  { href: "/docs", label: "Docs", icon: BookOpen, keywords: ["documentation", "wiki"], module: "docs" },
];

const homeEntry: NavItem = { href: "/", label: "Home", icon: Home, keywords: ["dashboard", "pulse"] };

/** Every page the palette can jump to, in display order. */
export const paletteEntries: NavItem[] = [homeEntry, ...tier1Nav, ...metaNav, ...systemNav];
