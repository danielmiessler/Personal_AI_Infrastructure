/**
 * Observer-mode route classification — the ONE map deciding what observer mode
 * does on each page.
 *
 *   full — the page is personal data throughout: blur the entire main content.
 *   fine — mixed page: structure stays visible, elements marked [data-sensitive]
 *          blur individually.
 *   open — system/infra page safe to show: no blur at all.
 *
 * Unlisted routes FAIL CLOSED to "full": a new page someone forgets to classify
 * errs private, never public. Matching is by longest route prefix on path
 * segments, so /memory/graph can differ from /memory.
 */

export type ObserverScope = "full" | "fine" | "open";

const SCOPES: Record<string, ObserverScope> = {
  // ── Mixed pages with [data-sensitive] markers — structure visible ──────────
  "/": "fine", // TELOS home — all content sections marked in _v7/app.tsx
  "/telos": "fine",
  "/finances": "fine", // deliberately instrumented (22 markers)
  "/health": "fine",
  "/work": "fine", // titles/paths marked in page + ProjectsBoard + WorkBoard
  "/agents": "fine", // run titles, prompts, event payloads marked
  "/skills": "fine", // private-skill list + detail marked
  "/system": "fine", // system wiki open; bookmark viewer marked

  // ── Wholly or heavily personal — full-page blur ────────────────────────────
  "/telos/item": "full", // raw TELOS item bodies
  "/life": "full", // mood, sleep, meals, location
  "/business": "full", // revenue, deals
  "/growth": "full", // audience/business numbers
  "/gear": "full", // possessions + home network IPs
  "/books": "full",
  "/local": "full", // home city/zip
  "/air": "full", // home rooms/occupancy
  "/conduit": "full", // minute-level personal activity
  "/memory": "full",
  "/memory/graph": "full", // named people/companies, private notes
  "/memory/knowledge": "full",
  "/knowledge": "full",
  "/knowledge/graph": "full",
  "/assistant": "full", // DA diary, opinions, cron commands
  "/content": "full", // unpublished draft titles
  "/security": "full", // attack surface, findings, risk register
  "/atlas": "full", // estate inventory, DNS
  "/assets": "full", // redirect → /gear
  "/bunker": "full", // per-app paths + failing security checks
  "/usage": "full", // spend
  "/performance": "full", // spend, session ids, paths
  "/synapse": "full", // private reading/bookmark titles
  "/system/graph": "full", // named entities from knowledge archive
  "/projects": "full", // redirect → /work
  "/hypotheses": "full", // redirect → /upgrades

  // ── System surface — stays readable, that's the demo ───────────────────────
  "/algorithm": "open",
  "/hooks": "open",
  "/arbol": "open",
  "/ledger": "open",
  "/upgrades": "open",
  "/docs": "open",
};

export function observerScopeFor(pathname: string): ObserverScope {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (SCOPES[clean]) return SCOPES[clean];
  // longest matching prefix on segment boundaries
  const segments = clean.split("/").filter(Boolean);
  for (let i = segments.length - 1; i > 0; i--) {
    const prefix = "/" + segments.slice(0, i).join("/");
    if (SCOPES[prefix]) return SCOPES[prefix];
  }
  return "full"; // fail closed
}

/** Serialized for the pre-paint inline script in layout.tsx. */
export function observerScopeScript(): string {
  return `(function(){try{
var on=localStorage.getItem("pulse-observer-mode")==="1";
var m=${JSON.stringify(SCOPES)};
var p=location.pathname.replace(/\\/+$/,"")||"/";
var s=m[p];
if(!s){var seg=p.split("/").filter(Boolean);for(var i=seg.length-1;i>0;i--){var pre="/"+seg.slice(0,i).join("/");if(m[pre]){s=m[pre];break;}}}
if(!s)s="full";
var d=document.documentElement;
if(on)d.classList.add("observer-active");
d.setAttribute("data-observer-scope",s);
}catch(e){}})()`;
}
