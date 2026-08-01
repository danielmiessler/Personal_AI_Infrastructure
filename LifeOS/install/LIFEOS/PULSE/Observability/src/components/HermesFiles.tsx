"use client";

/**
 * Hermes core files — read and edit the sidecar's brain from Pulse.
 *
 * The three planes are rendered as three panels because they are governed
 * differently, and a flat file list would hide that: `source` is the principal's
 * content and the real lever, `runtime` is the mounted install (mostly generated,
 * therefore read-only here), `code` ships publicly and refuses writes that carry
 * a home path or a credential.
 *
 * Generated files are shown, never edited. A hand edit to SOUL.md survives until
 * the next mount, so offering the edit would be offering an undo the operator
 * doesn't know is coming — the row links to its sources instead.
 *
 * Server contract: `LIFEOS/PULSE/modules/hermes.ts`.
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApiCall } from "@/lib/local-api";
import { Panel, PanelHeader, Pill } from "@/components/ui/chrome";
import {
  FileText, Lock, RefreshCw, Save, X, ChevronRight, ChevronDown,
  Cpu, User, Boxes, AlertTriangle, Check,
} from "lucide-react";

// ── Types (mirror modules/hermes.ts) ──

type Plane = "runtime" | "source" | "code";

export interface HermesFileEntry {
  id: string;
  label: string;
  plane: Plane;
  language: string;
  role: string;
  displayPath: string;
  exists: boolean;
  sealed: boolean;
  editable: boolean;
  generatedBy: string | null;
  sourceIds: string[];
  bytes: number | null;
  lines: number | null;
  modified: string | null;
}

interface HermesOverview {
  health: {
    status: "absent" | "down" | "flapping" | "degraded" | "up";
    summary: string;
    installed: boolean;
  } | null;
  hermesHome: string;
  mount: { stale: boolean; detail: string; probed: boolean };
  files: HermesFileEntry[];
  planes: Record<Plane, string>;
}

const PLANE_META: Record<Plane, { title: string; icon: typeof Cpu }> = {
  source: { title: "Source · what the soul is rendered from", icon: User },
  runtime: { title: "Runtime · the mounted install", icon: Boxes },
  code: { title: "Code · install-generic, ships publicly", icon: Cpu },
};

const PLANE_ORDER: Plane[] = ["source", "runtime", "code"];

function formatBytes(n: number | null): string {
  if (n === null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 48) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

// ── One file row, expand-to-edit ──

function FileRow({
  file,
  open,
  onToggle,
  byId,
  onJump,
}: {
  file: HermesFileEntry;
  open: boolean;
  onToggle: () => void;
  byId: Map<string, HermesFileEntry>;
  onJump: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery<{ content: string; meta: HermesFileEntry }>({
    queryKey: ["hermes-file", file.id],
    queryFn: () => localApiCall(`/api/hermes/file/${encodeURIComponent(file.id)}`),
    enabled: open && !file.sealed && file.exists,
    refetchOnWindowFocus: false,
  });

  // The draft is seeded once per open, from whatever the server last returned.
  // Re-seeding on every render would fight the operator's cursor.
  useEffect(() => {
    if (open && data && draft === null) setDraft(data.content);
    if (!open) {
      setDraft(null);
      setError(null);
      setSaved(false);
    }
  }, [open, data, draft]);

  const save = useMutation({
    mutationFn: (content: string) =>
      localApiCall(`/api/hermes/file/${encodeURIComponent(file.id)}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setError(null);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["hermes-file", file.id] });
      queryClient.invalidateQueries({ queryKey: ["hermes-overview"] });
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: Error) => setError(err.message || "Save failed"),
  });

  const dirty = draft !== null && data !== undefined && draft !== data.content;
  const statusColor = !file.exists ? "var(--ink-3)" : file.sealed ? "var(--warn)" : file.editable ? "var(--ok)" : "var(--ink-2)";

  return (
    <div className="border-b border-line-2 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-2.5 px-1 text-left hover:bg-surface-3 rounded transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-ink-3 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-3 shrink-0" />}
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusColor }} />
        <span className="text-[13px] mono text-ink-1 shrink-0">{file.label}</span>
        {file.sealed && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.06em] text-ink-3 shrink-0">
            <Lock className="w-3 h-3" /> sealed
          </span>
        )}
        {file.generatedBy && !file.sealed && (
          <span className="text-[10px] uppercase tracking-[0.06em] text-ink-3 shrink-0">generated</span>
        )}
        <span className="text-[12px] text-ink-3 flex-1 truncate">{file.role}</span>
        <span className="text-[11px] mono text-ink-3 shrink-0 whitespace-nowrap w-14 text-right">
          {file.lines !== null ? `${file.lines} ln` : formatBytes(file.bytes)}
        </span>
        <span className="text-[11px] mono text-ink-3 shrink-0 whitespace-nowrap w-16 text-right">{formatWhen(file.modified)}</span>
      </button>

      {open && (
        <div className="pb-4 pl-7 pr-1 space-y-2">
          <div className="text-[11px] mono text-ink-3">{file.displayPath}</div>

          {!file.exists && <div className="text-[12px] text-ink-3">Not present on disk.</div>}

          {file.sealed && (
            <div className="text-[12px] text-ink-2 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--warn)" }} />
              <span>
                Credential material. Listed here so you know it exists, never read into the dashboard.
                Edit it in a terminal.
              </span>
            </div>
          )}

          {file.generatedBy && !file.sealed && (
            <div className="text-[12px] text-ink-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--warn)" }} />
              <span>
                Written by <code className="mono">{file.generatedBy}</code>. A hand edit here lasts until the next mount.
                {file.sourceIds.length > 0 && (
                  <>
                    {" "}Edit its sources:{" "}
                    {file.sourceIds.map((sid, i) => {
                      const src = byId.get(sid);
                      if (!src) return null;
                      return (
                        <span key={sid}>
                          {i > 0 && ", "}
                          <button
                            type="button"
                            onClick={() => onJump(sid)}
                            className="mono underline decoration-dotted hover:text-ink-1"
                          >
                            {src.label}
                          </button>
                        </span>
                      );
                    })}
                  </>
                )}
              </span>
            </div>
          )}

          {file.plane === "code" && file.editable && (
            <div className="text-[12px] text-ink-3">
              Ships publicly — a save carrying a home path or a credential is refused.
            </div>
          )}

          {!file.sealed && file.exists && (
            <>
              {isLoading && <div className="text-[12px] text-ink-3">Loading…</div>}
              {draft !== null && (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  readOnly={!file.editable}
                  spellCheck={false}
                  className="w-full mono text-[12px] leading-[1.55] p-3 rounded-md bg-surface-1 border border-line-2 text-ink-1 focus:outline-none focus:border-line-3"
                  style={{ minHeight: "22rem", resize: "vertical" }}
                />
              )}
              {error && (
                <div className="text-[12px]" style={{ color: "var(--err)" }}>
                  {error}
                </div>
              )}
              {file.editable && draft !== null && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!dirty || save.isPending}
                    onClick={() => save.mutate(draft)}
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-line-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5" /> {save.isPending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={!dirty}
                    onClick={() => data && setDraft(data.content)}
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-line-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X className="w-3.5 h-3.5" /> Revert
                  </button>
                  {dirty && <span className="text-[11px] text-ink-3">unsaved</span>}
                  {saved && (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--ok)" }}>
                      <Check className="w-3.5 h-3.5" /> saved · backup kept
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── The tab ──

export default function HermesFiles() {
  const queryClient = useQueryClient();
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [remountResult, setRemountResult] = useState<string | null>(null);

  const { data, isLoading } = useQuery<HermesOverview>({
    queryKey: ["hermes-overview"],
    queryFn: () => localApiCall("/api/hermes"),
    refetchInterval: 60_000,
  });

  const remount = useMutation({
    mutationFn: () => localApiCall<{ ok: boolean; output: string; error: string | null }>("/api/hermes/remount", { method: "POST" }),
    onSuccess: (r) => {
      setRemountResult(r.ok ? r.output : (r.error ?? "mount failed"));
      queryClient.invalidateQueries({ queryKey: ["hermes-overview"] });
      queryClient.invalidateQueries({ queryKey: ["hermes-file"] });
    },
    onError: (err: Error) => setRemountResult(err.message || "mount failed"),
  });

  if (isLoading) return <div className="text-[13px] text-ink-3">Loading Hermes core files…</div>;
  if (!data) return <div className="text-[13px] text-ink-3">Hermes file surface unavailable.</div>;

  const byId = new Map(data.files.map((f) => [f.id, f]));

  function jump(id: string) {
    setOpenFile(id);
    // The panels are ordered source → runtime → code, so a jump from a generated
    // runtime file scrolls up. Without this the row opens off-screen.
    requestAnimationFrame(() => {
      document.getElementById(`hermes-file-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div className="space-y-6">
      {/* Mount state — the one thing that makes every other row trustworthy. */}
      <Panel>
        <PanelHeader
          title="Mount"
          icon={RefreshCw}
          meta={data.hermesHome}
          actions={
            <button
              type="button"
              disabled={remount.isPending || !data.health?.installed}
              onClick={() => remount.mutate()}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-line-2 hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${remount.isPending ? "animate-spin" : ""}`} />
              {remount.isPending ? "Mounting…" : "Re-mount"}
            </button>
          }
        />
        <div className="flex items-center gap-3 flex-wrap">
          <Pill dim={data.mount.stale ? "warn" : data.mount.probed ? "ok" : "neutral"}>
            {data.mount.stale ? "stale" : data.mount.probed ? "current" : "unprobed"}
          </Pill>
          <span className="text-[12px] text-ink-2">
            {data.mount.stale
              ? "SOUL.md or config.yaml has drifted from its sources — re-mount to regenerate."
              : "Generated files match their sources."}
          </span>
        </div>
        {data.mount.detail && (
          <pre className="mt-3 text-[11px] mono text-ink-3 whitespace-pre-wrap">{data.mount.detail}</pre>
        )}
        {remountResult && (
          <pre className="mt-3 text-[11px] mono text-ink-2 whitespace-pre-wrap p-3 rounded-md bg-surface-1 border border-line-2">
            {remountResult}
          </pre>
        )}
      </Panel>

      {PLANE_ORDER.map((plane) => {
        const files = data.files.filter((f) => f.plane === plane);
        if (files.length === 0) return null;
        const { title, icon } = PLANE_META[plane];
        return (
          <Panel key={plane}>
            <PanelHeader title={title} icon={icon} meta={<span className="whitespace-nowrap">{files.length} files</span>} />
            <div className="text-[12px] text-ink-3 mb-3">{data.planes[plane]}</div>
            <div>
              {files.map((f) => (
                <div key={f.id} id={`hermes-file-${f.id}`}>
                  <FileRow
                    file={f}
                    open={openFile === f.id}
                    onToggle={() => setOpenFile(openFile === f.id ? null : f.id)}
                    byId={byId}
                    onJump={jump}
                  />
                </div>
              ))}
            </div>
          </Panel>
        );
      })}

      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <FileText className="w-3.5 h-3.5" />
        Every save keeps the previous bytes under <code className="mono">LIFEOS/MEMORY/STATE/hermes-edits/</code>.
      </div>
    </div>
  );
}
