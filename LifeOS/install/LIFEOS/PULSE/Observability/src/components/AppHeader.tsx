"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, Cpu, Eye, EyeOff } from "lucide-react";
import { useObserverMode } from "@/contexts/ObserverModeContext";
import { TabFreshnessPill } from "@/components/TabFreshnessPill";
// Nav manifest is shared with the command palette — single source of truth.
// AGENTS (metaNav) is pinned in the right cluster on EVERY page — it's the
// meta view of the system working on itself, never part of the scrolling row.
// SYSTEM is the mode-switch into the machine plane (lands on systemHome).
import { tier1Nav, systemNav, metaNav, systemHome } from "@/lib/palette/nav-manifest";

const systemPaths = [...systemNav.map((i) => i.href), "/system"];

export default function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { observerMode, toggleObserverMode } = useObserverMode();

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  // Browser-tab naming: every page reads "Pulse | <Page>" keyed off the first path segment.
  // Next's streamed metadata commit can land AFTER this effect on initial load and reset the
  // title to the layout default, so re-assert via a short-lived observer until it settles.
  useEffect(() => {
    const seg = pathname.split("/")[1] ?? "";
    const page = seg === "" ? "Home" : seg === "telos" ? "TELOS" : seg.charAt(0).toUpperCase() + seg.slice(1);
    const want = `Pulse | ${page}`;
    const assert = () => { if (document.title !== want) document.title = want; };
    assert();
    const obs = new MutationObserver(assert);
    obs.observe(document.head, { childList: true, characterData: true, subtree: true });
    const settle = setTimeout(() => obs.disconnect(), 3000);
    return () => { obs.disconnect(); clearTimeout(settle); };
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [mobileMenuOpen]);

  // Are we anywhere inside the System plane? Then Tier 2 (the machine row) shows.
  // Agents is meta, not System — it never triggers the Tier-2 row.
  const inSystem = systemPaths.some((p) => pathname.startsWith(p));
  const inAgents = pathname.startsWith("/agents");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const fontStyle = { fontFamily: "'concourse-t3', sans-serif" };
  const agentsItem = metaNav[0];
  const AgentsIcon = agentsItem.icon;

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{ background: "rgba(6, 11, 26, 0.85)" }}
    >
      {/* ── Tier 1 — persistent global nav (the only always-on menu) ── */}
      <div className="border-b border-line-1">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6">
          <div className="flex items-center min-h-14 py-1.5 gap-4 lg:gap-6">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image src="/lifeos-logo.png" alt="LifeOS" width={28} height={28} className="h-7 w-7 object-contain" />
              <span className="text-lg tracking-[0.25em] text-ink-1" style={{ fontFamily: "'advocate-c14', sans-serif", fontWeight: 600 }}>
                PULSE
              </span>
            </Link>

            {/* Wraps to additional lines when items overflow — same pattern as the
                Tier-2 System row. Never clips items behind a hidden scrollbar. */}
            <nav
              className="hidden md:flex flex-wrap flex-1 items-center justify-start xl:justify-center gap-1 gap-y-1 min-w-0"
            >
              {tier1Nav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 lg:px-3 xl:px-3.5 py-2 text-[13px] lg:text-[14px] xl:text-[15px] tracking-[0.1em] xl:tracking-[0.12em] rounded-md transition-all duration-200 shrink-0",
                      active ? "bg-white/15 text-ink-1 font-semibold" : "font-medium text-ink-3 hover:text-ink-1 hover:bg-white/5"
                    )}
                    style={fontStyle}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* ── Right cluster: AGENTS (meta, pinned) · SYSTEM (mode-switch, pinned) · Observer ── */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <Link
                href={agentsItem.href}
                className={cn(
                  "hidden md:flex items-center gap-1.5 px-3 py-2 text-[13px] xl:text-[14px] tracking-[0.12em] rounded-md transition-all duration-200 shrink-0",
                  inAgents
                    ? "text-ink-1 font-semibold"
                    : "font-medium text-ink-2 hover:text-ink-1"
                )}
                style={{
                  ...fontStyle,
                  background: inAgents ? "rgba(59,130,246,0.15)" : "transparent",
                  border: inAgents ? "1px solid rgba(154,203,255,0.3)" : "1px solid var(--line-2)",
                }}
              >
                <AgentsIcon className="w-4 h-4 shrink-0" />
                {agentsItem.label}
              </Link>

              <Link
                href={systemHome}
                className={cn(
                  "hidden md:flex items-center gap-1.5 px-3 py-2 text-[13px] xl:text-[14px] tracking-[0.12em] rounded-md transition-all duration-200 shrink-0",
                  inSystem
                    ? "bg-white/15 text-ink-1 font-semibold"
                    : "font-medium text-ink-3 hover:text-ink-1 hover:bg-white/5 border border-line-2"
                )}
                style={fontStyle}
              >
                <Cpu className="w-4 h-4 shrink-0" />
                SYSTEM
              </Link>

              <button
                onClick={toggleObserverMode}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] tracking-[0.1em] transition-all duration-200",
                  observerMode
                    ? "text-warn"
                    : "text-ink-3 hover:text-ink-2 hover:bg-white/5"
                )}
                style={observerMode ? { background: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.3)" } : undefined}
                title={observerMode ? "Observer mode ON — sensitive data hidden" : "Toggle observer mode"}
              >
                {observerMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline" style={fontStyle}>OBSERVER</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="flex md:hidden items-center justify-center w-10 h-10 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-white/5 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tier 2 — contextual. Renders ONLY inside System, so it reads as
          "the section you're in", never as a second permanent global menu.
          Its lighter ground + "SYSTEM" rail make it visually distinct from Tier 1. ── */}
      {inSystem && (
        <div className="border-b border-line-1" style={{ background: "rgba(15, 26, 51, 0.6)" }}>
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6">
            <div className="hidden md:flex items-start min-h-11 py-1.5 gap-3">
              <span
                className="text-[10px] tracking-[0.18em] text-ink-3 uppercase shrink-0 pr-3 pt-2 border-r border-line-1"
                style={fontStyle}
              >
                System
              </span>
              <nav className="flex flex-wrap flex-1 items-center justify-start gap-1 gap-y-1.5 min-w-0">
                {systemNav.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] tracking-[0.08em] rounded transition-colors shrink-0",
                        active ? "bg-white/10 text-ink-1" : "text-ink-3 hover:text-ink-2 hover:bg-white/5"
                      )}
                      style={fontStyle}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <TabFreshnessPill className="shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden border-b border-line-1 backdrop-blur-md" style={{ background: "rgba(6, 11, 26, 0.95)" }}>
          <nav className="flex flex-col px-4 py-3 gap-1">
            <div className="text-xs uppercase tracking-wider text-ink-3 px-3 py-1">Sections</div>
            {tier1Nav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href}
                  className={cn("flex items-center gap-2.5 px-3 py-2.5 text-[15px] tracking-[0.12em] rounded-lg transition-colors",
                    active ? "bg-white/15 text-ink-1 font-semibold" : "font-medium text-ink-2 hover:text-ink-1 hover:bg-white/5"
                  )} style={fontStyle}>
                  <Icon className="w-4 h-4" />{item.label}
                </Link>
              );
            })}
            <div className="text-xs uppercase tracking-wider text-ink-3 px-3 py-1 mt-2">Meta</div>
            {metaNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={cn("flex items-center gap-2.5 px-3 py-2.5 text-[15px] tracking-[0.12em] rounded-lg transition-colors",
                    active ? "bg-white/15 text-ink-1 font-semibold" : "font-medium text-ink-2 hover:text-ink-1 hover:bg-white/5"
                  )} style={fontStyle}>
                  <Icon className="w-4 h-4" />{item.label}
                </Link>
              );
            })}
            <div className="text-xs uppercase tracking-wider text-ink-3 px-3 py-1 mt-2">System</div>
            {systemNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={cn("flex items-center gap-2.5 px-3 py-2 text-[13px] tracking-[0.08em] rounded-lg transition-colors",
                    active ? "bg-white/10 text-ink-1" : "text-ink-3 hover:text-ink-2 hover:bg-white/5"
                  )} style={fontStyle}>
                  <Icon className="w-3.5 h-3.5" />{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
