"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * Reads the resolved PULSE.toml [modules] map from the daemon and returns a
 * predicate for filtering nav entries.
 *
 * Fails open on purpose. Until the fetch lands — and permanently if it errors,
 * or if the daemon predates /api/config/modules — every entry stays visible.
 * A dashboard briefly showing a tab it will hide a moment later is a much
 * smaller problem than a nav that empties itself because one request failed.
 *
 * ported from public PR #1749, @elhoim
 */
export function useEnabledModules(): (item: { module?: string }) => boolean {
  const [modules, setModules] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config/modules")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.modules) setModules(data.modules);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Stable identity while `modules` is unchanged, so callers can memoise the
  // filtered list on this predicate instead of rebuilding it every render.
  return useCallback(
    (item: { module?: string }) => {
      if (!modules || !item.module) return true;
      return modules[item.module] !== false;
    },
    [modules],
  );
}
