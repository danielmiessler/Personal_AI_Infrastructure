"use client";

/**
 * MobileShell — the phone chrome wrapped around an unmodified desktop page.
 *
 * Compact top bar, thumb-reachable bottom tab bar, a full "More" sheet built
 * from the nav manifest, and the density provider that retunes the shared
 * chrome primitives. The page inside is the same component the desktop route
 * renders; everything phone-specific lives here or in mobile.css.
 *
 * The "Desktop" control is load-bearing, not decoration: it pins the classic
 * UI for this browser and leaves. A mobile interface you can't get out of is
 * worse than none.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Eye, EyeOff, LayoutGrid, Monitor, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useObserverMode } from "@/contexts/ObserverModeContext";
import { DensityProvider } from "@/contexts/DensityContext";
import { moreGroups, thumbBarItems, pageTitle } from "@/lib/mobile/nav";
import {
  MOBILE_PREFIX,
  MOBILE_UI_ENABLED,
  toDesktopPath,
  toMobilePath,
  writeUiPref,
} from "@/lib/mobile/config";

const CAPS = { fontFamily: "'concourse-t3', sans-serif" } as const;

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { observerMode, toggleObserverMode } = useObserverMode();
  const scrollRef = useRef<HTMLDivElement>(null);

  const desktopPath = toDesktopPath(pathname);
  const title = pageTitle(desktopPath);

  // Kill switch: with the mobile layer disabled, /m is not a place you can be.
  // Anyone holding a bookmark lands on the desktop route instead.
  useEffect(() => {
    if (!MOBILE_UI_ENABLED) window.location.replace(desktopPath);
  }, [desktopPath]);

  useEffect(() => {
    setSheetOpen(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Browser-tab naming, matching the desktop header's convention.
  useEffect(() => {
    document.title = `Pulse | ${title}`;
  }, [title]);

  // Lock the page behind the sheet so the sheet scrolls, not the page under it.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  const goDesktop = () => {
    writeUiPref("desktop");
    // Full navigation, not a client push: the desktop tree has its own layout
    // chrome and we want it mounted clean.
    window.location.href = desktopPath;
  };

  const isActive = (href: string) =>
    href === "/" ? desktopPath === "/" : desktopPath.startsWith(href);

  const tabs = thumbBarItems();

  return (
    <DensityProvider value="compact">
      <div className="pulse-mobile">
        {/* ── Top bar ── */}
        <header className="pm-topbar">
          <Link href={MOBILE_PREFIX} className="flex items-center gap-2 shrink-0">
            <Image src="/lifeos-logo.png" alt="LifeOS" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
          </Link>
          <span className="pm-title" style={{ fontFamily: "'advocate-c14', sans-serif" }}>
            {title}
          </span>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleObserverMode}
              aria-label={observerMode ? "Observer mode on" : "Observer mode off"}
              className={cn("pm-iconbtn", observerMode && "pm-iconbtn-warn")}
            >
              {observerMode ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
            <button type="button" onClick={goDesktop} className="pm-iconbtn" aria-label="Switch to desktop site">
              <Monitor className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

        {/* ── The desktop page, unmodified, at compact density ── */}
        <div ref={scrollRef} className="pm-content">{children}</div>

        {/* ── Thumb bar ── */}
        <nav className="pm-tabbar" aria-label="Primary">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={toMobilePath(item.href)}
                className={cn("pm-tab", active && "pm-tab-active")}
                style={CAPS}
              >
                <Icon className="w-[19px] h-[19px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn("pm-tab", sheetOpen && "pm-tab-active")}
            style={CAPS}
            aria-expanded={sheetOpen}
          >
            <LayoutGrid className="w-[19px] h-[19px]" />
            <span>MORE</span>
          </button>
        </nav>

        {/* ── More sheet — the full manifest ── */}
        {sheetOpen && (
          <div className="pm-sheet-backdrop" onClick={() => setSheetOpen(false)}>
            <div className="pm-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="pm-sheet-grip" />
              <div className="pm-sheet-head">
                <span style={{ fontFamily: "'advocate-c14', sans-serif" }}>ALL PAGES</span>
                <button type="button" onClick={() => setSheetOpen(false)} className="pm-iconbtn ml-auto" aria-label="Close">
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
              <div className="pm-sheet-body">
                {moreGroups().map((group) => (
                  <section key={group.title}>
                    <div className="pm-group-title" style={CAPS}>{group.title}</div>
                    <div className={group.layout === "list" ? "pm-group-list" : "pm-group-grid"}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.match);
                        return (
                          <Link
                            key={item.to}
                            href={item.to}
                            className={cn("pm-sheet-item", active && "pm-sheet-item-active")}
                            style={CAPS}
                          >
                            {Icon && <Icon className="w-[18px] h-[18px] shrink-0" />}
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
                <button type="button" onClick={goDesktop} className="pm-desktop-link" style={CAPS}>
                  <Monitor className="w-4 h-4" /> Switch to desktop site
                </button>
                <p className="pm-sheet-foot">
                  The desktop interface stays available at any time — switching pins it for this browser
                  until you come back to <span className="mono">/m</span>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DensityProvider>
  );
}
