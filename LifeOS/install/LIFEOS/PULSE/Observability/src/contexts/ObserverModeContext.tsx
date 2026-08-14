"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export const OBSERVER_STORAGE_KEY = "pulse-observer-mode";

interface ObserverModeContextValue {
  observerMode: boolean;
  toggleObserverMode: () => void;
}

const ObserverModeContext = createContext<ObserverModeContextValue>({
  observerMode: false,
  toggleObserverMode: () => {},
});

export function ObserverModeProvider({ children }: { children: ReactNode }) {
  const [observerMode, setObserverMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Initial state comes from localStorage after mount; the pre-paint script in
  // layout.tsx already applied the html class, so there is no visible flash while
  // React catches up.
  useEffect(() => {
    setObserverMode(localStorage.getItem(OBSERVER_STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("observer-active", observerMode);
    localStorage.setItem(OBSERVER_STORAGE_KEY, observerMode ? "1" : "0");
  }, [observerMode, hydrated]);

  const toggleObserverMode = () => setObserverMode((prev) => !prev);

  return (
    <ObserverModeContext.Provider value={{ observerMode, toggleObserverMode }}>
      {children}
    </ObserverModeContext.Provider>
  );
}

export function useObserverMode() {
  return useContext(ObserverModeContext);
}
