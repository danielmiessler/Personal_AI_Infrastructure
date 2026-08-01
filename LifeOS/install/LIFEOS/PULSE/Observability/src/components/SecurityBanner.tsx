"use client";

import { useEffect, useState } from "react";

// Global critical/high security banner. Reads the user's security system via
// /api/bunker/critical. It renders ONLY when that system exists AND reports a
// critical or high finding. A user with no security system configured
// (`configured: false`) never sees it — the banner is generic system code that
// stays dark unless a real security source lights it up.

interface CritItem { target: string; check: string; severity: string; evidence: string }
interface CritData {
  configured: boolean;
  reachable?: boolean;
  count: number;
  critical?: number;
  high?: number;
  items?: CritItem[];
}

export default function SecurityBanner() {
  const [d, setD] = useState<CritData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/bunker/critical", { cache: "no-store" });
        if (!r.ok) return;
        setD(await r.json());
      } catch { /* leave hidden on any error */ }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  // Hidden unless a configured security system reports at least one crit/high.
  if (!d || !d.configured || d.count === 0) return null;

  const hasCrit = (d.critical ?? 0) > 0;
  const label = [
    d.critical ? `${d.critical} CRITICAL` : "",
    d.high ? `${d.high} HIGH` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div
      style={{
        background: hasCrit ? "linear-gradient(90deg,#7f1d1d,#b91c1c)" : "linear-gradient(90deg,#78350f,#b45309)",
        color: "#fff",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <div className="max-w-[1920px] mx-auto" style={{ padding: "8px 16px" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", width: "100%", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}
        >
          <span style={{ fontSize: 15 }}>{hasCrit ? "🔴" : "🟠"}</span>
          <span>Security: {label} finding{d.count === 1 ? "" : "s"} on your infrastructure</span>
          <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>{open ? "hide ▲" : "details ▼"}</span>
        </button>
        {open && d.items && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {d.items.map((it, i) => (
              <div key={it.target + it.check + i} style={{ fontSize: 12, display: "flex", gap: 10, opacity: 0.95 }}>
                <span style={{ fontWeight: 700, flex: "none", width: 64 }}>[{it.severity.toUpperCase().slice(0, 4)}]</span>
                <span style={{ flex: "none", minWidth: 180 }}>{it.target}</span>
                <span style={{ opacity: 0.85 }}>{it.check} — {it.evidence}</span>
              </div>
            ))}
            <a href="/bunker" style={{ color: "#fff", fontSize: 12, marginTop: 4, textDecoration: "underline", opacity: 0.9 }}>Open Bunker →</a>
          </div>
        )}
      </div>
    </div>
  );
}
