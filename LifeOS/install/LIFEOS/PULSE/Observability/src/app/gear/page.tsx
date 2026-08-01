"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Car,
  Coffee,
  Cpu,
  Code2,
  Heart,
  Home,
  Lamp,
  Mic,
  Network,
  Radio,
  Search,
  Sofa,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageShell, PageHeader, Panel, Pill, EmptyState } from "@/components/ui/chrome";

/**
 * Gear tab — everything the user owns, rendered live from USER/GEAR.md with its
 * real structure preserved (categories → subgroups → items, prose notes, TODO
 * stubs), plus named network devices from the topology snapshot. ZERO data in
 * this component; it fetches /api/assets and renders it. Edit GEAR.md → the
 * page changes with no rebuild.
 */

interface GearItem {
  name: string;
  detail: string;
  use: string;
  subgroup?: string;
}
interface GearSection {
  category: string;
  items: GearItem[];
  notes: string[];
  todos: string[];
}
interface Asset {
  name: string;
  category: string;
  detail: string;
  use: string;
  source: string;
  ip?: string;
}
interface AssetsData {
  count: number;
  sources: string[];
  generatedAt: string;
  categories: string[];
  networkEndpoints: number;
  assets: Asset[];
  gear: { sections: GearSection[]; updated: string | null };
  error?: string;
}

/** Generic category → icon heuristic; matches meaning, never a specific inventory. */
function categoryIcon(category: string): LucideIcon {
  const c = category.toLowerCase();
  if (/computer|display|laptop/.test(c)) return Cpu;
  if (/audio|studio chain|music/.test(c)) return Mic;
  if (/light/.test(c)) return Lamp;
  if (/office|furniture|desk/.test(c)) return Sofa;
  if (/network/.test(c)) return Network;
  if (/smart home|camera|sensor/.test(c)) return Radio;
  if (/house|home|appliance/.test(c)) return Home;
  if (/health|sleep|fitness/.test(c)) return Heart;
  if (/carry|edc|wallet/.test(c)) return Wallet;
  if (/coffee|kitchen/.test(c)) return Coffee;
  if (/car|vehicle/.test(c)) return Car;
  if (/software|stack|tech/.test(c)) return Code2;
  return Boxes;
}

const matches = (needle: string, ...fields: (string | undefined)[]) =>
  fields.some((f) => f?.toLowerCase().includes(needle));

export default function GearPage() {
  const [data, setData] = useState<AssetsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  useEffect(() => {
    fetch("/api/assets", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  // Sections worth showing: anything with items or open TODOs (pure prose
  // sections like maintenance instructions stay in the file, off the page).
  const sections = useMemo(() => {
    const all = (data?.gear?.sections ?? []).filter((s) => s.items.length > 0 || s.todos.length > 0);
    const needle = q.trim().toLowerCase();
    return all
      .filter((s) => cat === "All" || s.category === cat)
      .map((s) =>
        needle
          ? { ...s, items: s.items.filter((i) => matches(needle, i.name, i.detail, i.use, i.subgroup, s.category)) }
          : s,
      )
      .filter((s) => s.items.length > 0 || (!needle && s.todos.length > 0));
  }, [data, q, cat]);

  const networkDevices = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.assets ?? []).filter(
      (a) =>
        a.source === "topology-snapshot" &&
        (cat === "All" || cat === "Network & Smart Home (live)") &&
        (!needle || matches(needle, a.name, a.detail, a.category, a.ip)),
    );
  }, [data, q, cat]);

  const allCategories = useMemo(() => {
    const cats = (data?.gear?.sections ?? [])
      .filter((s) => s.items.length > 0 || s.todos.length > 0)
      .map((s) => s.category);
    if (data?.assets?.some((a) => a.source === "topology-snapshot")) cats.push("Network & Smart Home (live)");
    return ["All", ...cats];
  }, [data]);

  const itemCount = useMemo(
    () => (data?.gear?.sections ?? []).reduce((n, s) => n + s.items.length, 0),
    [data],
  );

  return (
    <PageShell>
      <PageHeader
        title="Gear"
        icon={Boxes}
        subtitle={
          <>
            Everything you own, by category — rendered live from{" "}
            <code className="text-ink-2">USER/GEAR.md</code>.
            {itemCount ? ` ${itemCount} items.` : ""}
            {data?.networkEndpoints ? ` ${data.networkEndpoints} endpoints seen on the LAN.` : ""}
            {data?.gear?.updated ? ` Inventory updated ${data.gear.updated}.` : ""}
          </>
        }
      />

      {data && itemCount > 0 && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by name, model, category…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-1 border border-line-2 text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-line-3"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className="text-[12px] px-2.5 py-1 rounded-md border transition-colors"
                style={
                  cat === c
                    ? { background: "var(--surface-3)", borderColor: "var(--line-3)", color: "var(--ink-1)" }
                    : { background: "var(--surface-1)", borderColor: "var(--line-2)", color: "var(--ink-2)" }
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="text-warn text-sm">Couldn&apos;t reach Gear API: {error}</div>}
      {!data && !error && <div className="text-ink-3 text-sm">Loading…</div>}
      {data && itemCount === 0 && !error && (
        <EmptyState
          icon={Boxes}
          title={data.error ? "Couldn't read GEAR.md" : "No gear yet"}
          hint={data.error ?? "Add categories and items to LIFEOS/USER/GEAR.md and they'll appear here."}
        />
      )}

      {sections.map((s) => (
        <GearSectionBlock key={s.category} section={s} />
      ))}

      {networkDevices.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-dim-health" />
            <h2 className="text-sm font-semibold text-ink-2 tracking-wide uppercase">
              Network &amp; Smart Home (live)
            </h2>
            <span className="text-[11px] text-ink-3">{networkDevices.length}</span>
            <Pill dim="health" className="text-[10px]">
              topology snapshot
            </Pill>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {networkDevices.map((a, i) => (
              <Panel key={`${a.name}-${i}`} hover className="p-4 flex flex-col gap-1.5">
                <div className="text-ink-1 font-medium leading-snug">{a.name}</div>
                {a.detail && <div className="text-ink-2 text-sm leading-snug">{a.detail}</div>}
                {a.ip && (
                  <code className="text-[12px] text-ink-3 mt-0.5" data-sensitive title={a.ip}>
                    {a.ip}
                  </code>
                )}
              </Panel>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function GearSectionBlock({ section }: { section: GearSection }) {
  const Icon = categoryIcon(section.category);
  // Preserve subgroup order as it appears in the file; ungrouped items first.
  const subgroups = useMemo(() => {
    const order: (string | undefined)[] = [];
    for (const i of section.items) if (!order.includes(i.subgroup)) order.push(i.subgroup);
    return order.map((sg) => ({ label: sg, items: section.items.filter((i) => i.subgroup === sg) }));
  }, [section]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-dim-freedom" />
        <h2 className="text-sm font-semibold text-ink-2 tracking-wide uppercase">{section.category}</h2>
        <span className="text-[11px] text-ink-3">{section.items.length}</span>
      </div>

      {section.notes.length > 0 && (
        <div className="mb-3 flex flex-col gap-1">
          {section.notes.map((n, i) => (
            <p key={i} className="text-[13px] text-ink-3 leading-snug max-w-3xl">
              {n}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {subgroups.map(({ label, items }) => (
          <div key={label ?? "_"}>
            {label && (
              <div className="text-[11px] font-semibold tracking-wider uppercase text-ink-3 mb-2">{label}</div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((it, i) => (
                <Panel key={`${it.name}-${i}`} hover className="p-4 flex flex-col gap-1.5">
                  <div className="text-ink-1 font-medium leading-snug">{it.name}</div>
                  {it.detail && <div className="text-ink-2 text-sm leading-snug">{it.detail}</div>}
                  {it.use && <div className="text-ink-3 text-[13px] leading-snug">{it.use}</div>}
                </Panel>
              ))}
            </div>
          </div>
        ))}
      </div>

      {section.todos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {section.todos.map((t, i) => (
            <Pill key={i} dim="warn" className="text-[10px]" title={t}>
              TODO: {t.length > 60 ? `${t.slice(0, 60)}…` : t}
            </Pill>
          ))}
        </div>
      )}
    </section>
  );
}
