"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApiCall } from "@/lib/local-api";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import HermesFiles from "@/components/HermesFiles";
import {
  PageShell, PageHeader, Panel, PanelHeader, Pill, TabBar, StatTile, dimStyle,
  type TabSpec,
} from "@/components/ui/chrome";
import {
  Zap, Terminal, Clock, Plus, X, Trash2, Activity,
  Heart, Brain, Shield, Pencil, Check, ChevronDown, ChevronRight, Repeat,
  Cloud, MessageSquare,
} from "lucide-react";

// ── Types ──

interface Identity {
  name: string;
  full_name: string;
  display_name: string;
  color: string;
  role: string;
  origin_story: string;
  has_avatar: boolean;
  principal: string;
  uptime_ms: number;
}

interface Personality {
  base_description: string;
  traits: Record<string, number>;
  anchors: Array<{ name: string; description: string }>;
  preferences: {
    what_i_love: string[];
    what_i_dislike: string[];
    working_style: string[];
    intellectual_interests: string[];
  };
  companion: { name: string; species: string; personality: string } | null;
  relationship: { dynamic: string; interaction_style: string };
  autonomy: { can_initiate: string[]; must_ask: string[] };
  writing: { style: string; avoid: string[]; prefer: string[] };
  voice: { provider: string } | null;
}

interface UnifiedTask {
  name: string;
  schedule: string;
  status: string;
  source: "da" | "pulse" | "claude-code" | "launchd" | "arbol" | "hermes";
  details?: Record<string, unknown>;
}

/** Mirrors `checkHermesHealth()` in LIFEOS/HERMES/Health.ts. */
interface HermesHealth {
  status: "absent" | "down" | "flapping" | "degraded" | "up";
  summary: string;
  installed: boolean;
  pid: number | null;
  pidAlive: boolean;
  uptimeSeconds: number | null;
  activeAgents: number | null;
  platforms: { name: string; state: string; errorCode: string | null; errorMessage: string | null }[];
  recentStarts: number;
  problems: string[];
}

interface TasksResponse {
  tasks: UnifiedTask[];
  count: number;
  by_source: { da: number; pulse: number; "claude-code": number; launchd: number; arbol?: number; hermes?: number };
  /** The sidecar process itself — null when the probe failed. */
  hermes?: HermesHealth | null;
}

const HERMES_STATUS_COLOR: Record<HermesHealth["status"], string> = {
  up: "var(--ok)",
  degraded: "var(--warn)",
  flapping: "var(--warn)",
  down: "var(--err)",
  absent: "var(--ink-3)",
};

function formatUptimeSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)}m`;
  if (seconds < 172800) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

interface CronJob {
  name: string;
  schedule: string;
  type: "script" | "claude";
  command: string | null;
  prompt: string | null;
  model: string | null;
  output: string | string[];
  enabled: boolean;
  source: "system" | "user";
}

interface CronListResponse {
  jobs: CronJob[];
  user_file_path: string;
  counts: { total: number; enabled: number; system: number; user: number };
}

interface DiaryEntry {
  date: string;
  interaction_count: number;
  topics: string[];
  mood: "positive" | "neutral" | "frustrated";
  avg_rating: number;
  notable_moments: string[];
  learning: string | null;
}

interface Health {
  status: string;
  primary_da: string;
  identity_loaded: boolean;
  scheduled_tasks: number;
  last_heartbeat: string | null;
  diary_entries_today: number;
  opinions_count: number;
}

// ── Helpers ──

type Dimension = "health" | "money" | "freedom" | "creative" | "relationships" | "rhythms";

const dimColors: Record<Dimension, string> = {
  health: "var(--health)",
  money: "var(--money)",
  freedom: "var(--freedom)",
  creative: "var(--creative)",
  relationships: "var(--relationships)",
  rhythms: "var(--rhythms)",
};

const traitDimensions: Dimension[] = ["creative", "relationships", "freedom", "rhythms", "money", "health"];

const statusClass: Record<string, "green-up" | "flat-muted" | "coral-down"> = {
  active: "green-up",
  disabled: "flat-muted",
  completed: "flat-muted",
  cancelled: "coral-down",
};

// Small uppercase-tag flavor of Pill used for source/type/kind badges.
const TAG_CLS = "text-[10px] uppercase tracking-[0.06em]";

function formatUptime(ms: number): string {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Section({
  title,
  icon: Icon,
  action,
  children,
  dimension = "creative",
}: {
  title: string;
  icon?: typeof Brain;
  action?: React.ReactNode;
  children: React.ReactNode;
  dimension?: Dimension;
}) {
  // dimension prop kept for call-site compatibility; the header renders in the
  // standard kit style (PanelHeader) so this page reads like every other page.
  void dimension;
  return (
    <Panel>
      <PanelHeader title={title} icon={Icon} actions={action} />
      <div data-sensitive>{children}</div>
    </Panel>
  );
}

function TraitBar({ name, value, color, onEdit }: { name: string; value: number; color: string; onEdit?: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  return (
    <div className="flex items-center gap-4 group">
      <span className="w-32 truncate capitalize text-sm text-ink-1" data-sensitive>
        {name.replace(/_/g, " ")}
      </span>
      <div className="progress-bar flex-1" style={{ height: 6, margin: 0 }}>
        <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={editValue}
            onChange={(e) => setEditValue(Number(e.target.value))}
            className="w-14 text-sm rounded px-2 py-1 bg-surface-1 border border-line-1 text-ink-1"
          />
          <button onClick={() => { onEdit?.(editValue); setEditing(false); }} className="green-up">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(false)} className="text-ink-3">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <span className="w-10 text-right text-sm mono flat-muted">{value}</span>
          {onEdit && (
            <button
              onClick={() => { setEditValue(value); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tasks" | "personality" | "hermes" | "diary">("tasks");
  // Which scheduler the Scheduled Tasks tab is showing. Pulse cron is the default
  // because it is the one Pulse actually owns and the one that gets edited.
  const [scheduleTab, setScheduleTab] = useState<"pulse" | "launchd" | "claude-code" | "arbol" | "hermes">("pulse");

  const { data: identity } = useQuery<Identity>({ queryKey: ["assistant-identity"], queryFn: () => localApiCall("/assistant/identity"), refetchInterval: 30_000 });
  const { data: health } = useQuery<Health>({ queryKey: ["assistant-health"], queryFn: () => localApiCall("/assistant/health"), refetchInterval: 10_000 });
  const { data: personality } = useQuery<Personality>({ queryKey: ["assistant-personality"], queryFn: () => localApiCall("/assistant/personality"), refetchInterval: 60_000 });
  const { data: tasksData } = useQuery<TasksResponse>({ queryKey: ["assistant-tasks"], queryFn: () => localApiCall("/assistant/tasks"), refetchInterval: 15_000 });
  const { data: diaryData } = useQuery<{ entries: DiaryEntry[] }>({ queryKey: ["assistant-diary"], queryFn: () => localApiCall("/assistant/diary"), refetchInterval: 60_000 });
  const { data: opinionsData } = useQuery<{ raw: string }>({ queryKey: ["assistant-opinions"], queryFn: () => localApiCall("/assistant/opinions"), refetchInterval: 60_000 });

  // Cron CRUD — full source-of-truth list (system + user merged), plus
  // patch/delete/post mutations. Refresh via "assistant-cron" key.
  const { data: cronData } = useQuery<CronListResponse>({
    queryKey: ["assistant-cron"],
    queryFn: () => localApiCall("/assistant/cron"),
    refetchInterval: 15_000,
  });

  const toggleCron = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      localApiCall(`/assistant/cron/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-cron"] }),
  });

  const deleteCron = useMutation({
    mutationFn: (name: string) =>
      localApiCall(`/assistant/cron/${encodeURIComponent(name)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-cron"] }),
  });

  const [showAddCron, setShowAddCron] = useState(false);
  const [newCronName, setNewCronName] = useState("");
  const [newCronSchedule, setNewCronSchedule] = useState("");
  const [newCronCommand, setNewCronCommand] = useState("");

  // Expand-to-edit state. One row open at a time keeps the UI calm.
  const [expandedCron, setExpandedCron] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Partial<CronJob>>({});
  const [editError, setEditError] = useState<string | null>(null);

  // Pagination for the (often 25+) cron list.
  const CRON_PAGE_SIZE = 10;
  const [cronPage, setCronPage] = useState(0);

  const patchCron = useMutation({
    mutationFn: ({ name, patch }: { name: string; patch: Partial<CronJob> }) =>
      localApiCall(`/assistant/cron/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-cron"] });
      setEditError(null);
      setEditBuffer({});
    },
    onError: (err: Error) => setEditError(err.message ?? "Update failed"),
  });

  function openExpand(job: CronJob) {
    setExpandedCron(job.name);
    setEditBuffer({
      schedule: job.schedule,
      command: job.command,
      prompt: job.prompt,
      model: job.model,
      output: job.output,
      type: job.type,
    });
    setEditError(null);
  }

  function closeExpand() {
    setExpandedCron(null);
    setEditBuffer({});
    setEditError(null);
  }

  // Heuristic: is a Claude Code trigger actually a loop?
  // Triggers populated by `claude triggers list` may include /loop sessions —
  // surface those distinctly so {{PRINCIPAL_NAME}} can tell them apart from one-shot crons.
  function detectLoop(task: UnifiedTask): boolean {
    const name = (task.name ?? "").toLowerCase();
    const sched = (task.schedule ?? "").toLowerCase();
    return name.includes("loop") || sched.includes("loop") || name.startsWith("/loop") || (task.details?.kind as string) === "loop";
  }

  const createCron = useMutation({
    mutationFn: (job: { name: string; schedule: string; type: "script"; command: string; output: string; enabled: boolean }) =>
      localApiCall("/assistant/cron", { method: "POST", body: JSON.stringify(job) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-cron"] });
      setShowAddCron(false);
      setNewCronName("");
      setNewCronSchedule("");
      setNewCronCommand("");
    },
  });

  const updateTrait = useMutation({
    mutationFn: (update: Record<string, number>) =>
      localApiCall("/assistant/personality/traits", { method: "PATCH", body: JSON.stringify(update) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assistant-personality"] }),
  });

  // Scheduled Tasks is five independent schedulers, not one list — each with its
  // own owner, its own file, and its own rules about what Pulse may change. They
  // used to stack into one page you had to scroll past to reach the cron table
  // you actually wanted; sub-tabs put each scheduler one click away instead.
  const scheduleTabs: TabSpec<typeof scheduleTab>[] = [
    { id: "pulse", label: "Pulse Cron", dim: "rhythms", hint: cronData ? `${cronData.counts.enabled}/${cronData.counts.total}` : undefined },
    { id: "launchd", label: "launchd", dim: "freedom", hint: tasksData?.by_source.launchd || undefined },
    { id: "claude-code", label: "Claude Code", dim: "freedom", hint: tasksData?.by_source["claude-code"] || undefined },
    { id: "arbol", label: "Arbol", dim: "creative", hint: tasksData?.by_source.arbol || undefined },
    { id: "hermes", label: "Hermes", dim: "relationships", hint: tasksData?.by_source.hermes || undefined },
  ];

  const tabs: TabSpec<typeof activeTab>[] = [
    { id: "tasks", label: "Scheduled Tasks", dim: "creative" },
    { id: "personality", label: "Personality", dim: "relationships" },
    { id: "hermes", label: "Hermes", dim: "freedom" },
    { id: "diary", label: "Diary", dim: "rhythms" },
  ];

  const isFreshInstall = health ? !health.identity_loaded : !identity;

  return (
    <PageShell fullBleed className="overflow-auto">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">

        <PageHeader
          title="Assistant"
          subtitle="Your DA's identity, schedule, personality, and work diary."
        />

        {isFreshInstall && (
          <EmptyStateGuide
            section="DA Identity"
            description="Your DA's name, voice, personality, and the diary they keep about your work together."
            userDir="DA"
            daPromptExample="set up my DA's identity and personality"
          />
        )}

        {/* Stats */}
        {health && (
          <div className="grid grid-cols-4 gap-3">
            <StatTile
              label="Status"
              icon={Activity}
              value={health.status === "ok" ? "Online" : health.status}
              dim={health.status === "ok" ? "ok" : "err"}
            />
            <StatTile label="CC Scheduled" icon={Terminal} value={String(tasksData?.by_source["claude-code"] ?? 0)} />
            <StatTile label="Cron Jobs" icon={Zap} value={String(tasksData?.by_source.pulse ?? 0)} />
            <StatTile label="launchd" icon={Activity} value={String(tasksData?.by_source.launchd ?? 0)} />
            <StatTile label="Arbol" icon={Cloud} value={String(tasksData?.by_source.arbol ?? 0)} />
            <StatTile label="Hermes" icon={MessageSquare} value={String(tasksData?.by_source.hermes ?? 0)} />
          </div>
        )}

        {/* Tab Bar */}
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} className="pb-3" />

        {/* SCHEDULED TASKS TAB — one sub-tab per scheduler */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            <TabBar tabs={scheduleTabs} active={scheduleTab} onChange={setScheduleTab} />

            {scheduleTab === "launchd" && (
            <Section title="Background Services · launchd" icon={Activity} dimension="freedom">
              <div className="text-xs mono mb-1 text-ink-2">
                ~/Library/LaunchAgents/com.lifeos.*.plist <span className="text-ink-3">(read-only — manage via LIFEOS/TOOLS/Services.ts)</span>
              </div>
              <div className="text-xs mb-3 text-ink-3">
                macOS launchd agents installed by LifeOS — deterministic background jobs (inbox sweep, Conduit, backups) that run outside Pulse and survive Pulse restarts.
              </div>
              {(() => {
                const svcTasks = tasksData?.tasks.filter((t) => t.source === "launchd") ?? [];
                if (svcTasks.length === 0) {
                  return <div className="text-[13px] text-ink-3">No com.lifeos launchd agents found.</div>;
                }
                return (
                  <div className="space-y-1">
                    {svcTasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-2.5 rounded-md">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: task.status === "active" ? "var(--ok)" : "var(--ink-3)" }}
                        />
                        <span className="text-[13px] mono text-ink-1 flex-1 truncate">{task.name}</span>
                        <span className="text-xs mono text-ink-2 shrink-0">{task.schedule}</span>
                        <span className="text-xs mono shrink-0" style={{ color: task.status === "active" ? "var(--ok)" : "var(--ink-3)" }}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Section>
            )}

            {scheduleTab === "arbol" && (
            <Section title="Scheduled Tasks · Arbol (Cloudflare)" icon={Cloud} dimension="freedom">
              <div className="text-xs mono mb-1 text-ink-2">
                ARBOL/Workers/*/wrangler.jsonc <span className="text-ink-3">(cron triggers, read from each worker&apos;s deploy config)</span>
              </div>
              <div className="text-xs mb-3 text-ink-3">
                Cloud-side scheduled work on Cloudflare Workers. A cron here is scheduled by definition — whether its last run <em>succeeded</em> is a separate question this view does not answer.
              </div>
              {(() => {
                const arbolTasks = tasksData?.tasks.filter((t) => t.source === "arbol") ?? [];
                if (arbolTasks.length === 0) {
                  return <div className="text-[13px] text-ink-3">No Arbol workers with cron triggers found.</div>;
                }
                return (
                  <div className="space-y-1">
                    {arbolTasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-2.5 rounded-md">
                        <Cloud className="w-4 h-4 shrink-0" style={{ color: "var(--freedom)" }} />
                        <span className="text-[13px] mono text-ink-1 flex-1 truncate">{task.name}</span>
                        <span className="text-xs mono text-ink-2 shrink-0">{task.schedule}</span>
                        <span className="text-xs mono shrink-0" style={{ color: "var(--ok)" }}>{task.status}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Section>
            )}

            {scheduleTab === "hermes" && (
            <Section title="Hermes (sidecar)" icon={MessageSquare} dimension="rhythms">
              {/* The gateway process, above its jobs. Job rows say nothing about
                  whether the sidecar serving them is alive, and a crash loop
                  reads as running at any instant you happen to look. */}
              {(() => {
                const h = tasksData?.hermes;
                if (!h) {
                  return <div className="text-[13px] text-ink-3 mb-4">Sidecar health unavailable.</div>;
                }
                if (!h.installed) {
                  return <div className="text-[13px] text-ink-3 mb-4">Hermes sidecar not installed on this machine.</div>;
                }
                const color = HERMES_STATUS_COLOR[h.status];
                return (
                  <div className="mb-5">
                    <div className="flex items-center gap-4 px-4 py-2.5 rounded-md" style={{ background: "var(--surface-2)" }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[13px] mono shrink-0" style={{ color }}>{h.status}</span>
                      <span className="text-[13px] text-ink-1 flex-1 truncate">{h.summary}</span>
                      <span className="text-xs mono text-ink-2 shrink-0">up {formatUptimeSeconds(h.uptimeSeconds)}</span>
                      <span className="text-xs mono text-ink-3 shrink-0">{h.pid ? `pid ${h.pid}` : "no pid"}</span>
                    </div>
                    {h.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 px-4">
                        {h.platforms.map((p) => (
                          <span
                            key={p.name}
                            title={p.errorMessage ?? p.state}
                            className="text-xs mono px-2 py-0.5 rounded"
                            style={{
                              color: p.state === "connected" ? "var(--ok)" : p.state === "fatal" ? "var(--err)" : "var(--ink-3)",
                              border: "1px solid var(--line-2)",
                            }}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {h.problems.length > 0 && (
                      <ul className="mt-2 px-4 space-y-1">
                        {h.problems.map((problem, i) => (
                          <li key={i} className="text-xs text-ink-2">
                            <span style={{ color: "var(--warn)" }}>!</span> {problem}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
              <div className="text-xs mono mb-1 text-ink-2">
                $HERMES_HOME/cron/jobs.json <span className="text-ink-3">(manage via <code className="mono">hermes cron</code>)</span>
              </div>
              <div className="text-xs mb-3 text-ink-3">
                Scheduled <em>agent turns</em> delivered to a channel — the one thing launchd can&apos;t do (&ldquo;text me the morning brief at 7&rdquo;).
              </div>
              {(() => {
                const hermesTasks = tasksData?.tasks.filter((t) => t.source === "hermes") ?? [];
                if (hermesTasks.length === 0) {
                  return (
                    <div className="text-[13px] text-ink-3">
                      No Hermes cron jobs. <span className="muted">Create one with <code className="mono">hermes cron create</code>.</span>
                    </div>
                  );
                }
                return (
                  <div className="space-y-1">
                    {hermesTasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-2.5 rounded-md">
                        <MessageSquare className="w-4 h-4 shrink-0" style={{ color: "var(--rhythms)" }} />
                        <span className="text-[13px] text-ink-1 flex-1 truncate">{task.name}</span>
                        <span className="text-xs mono text-ink-2 shrink-0">{task.schedule}</span>
                        <span
                          className="text-xs mono shrink-0"
                          style={{ color: task.status === "active" ? "var(--ok)" : "var(--ink-3)" }}
                        >
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Section>
            )}

            {scheduleTab === "claude-code" && (
            <Section title="Scheduled Tasks · Claude Code" icon={Terminal} dimension="freedom">
              <div className="text-xs mono mb-1 text-ink-2">
                Claude Code harness · <code className="mono">claude triggers list</code> (not under ~/.claude/LIFEOS/)
              </div>
              <div className="text-xs mb-3 text-ink-3">
                Built into Claude Code — triggers and active <code className="mono bg-surface-1 px-1.5 py-px rounded">/loop</code> sessions managed by the harness, not by Pulse. Pulse polls every 60s.
              </div>
              {(() => {
                const ccTasks = tasksData?.tasks.filter((t) => t.source === "claude-code") ?? [];
                if (ccTasks.length === 0) {
                  return (
                    <div className="text-[13px] text-ink-3">
                      No Claude Code triggers or loops detected. <span className="muted">(Pulse polls <code className="mono">claude triggers list</code> every 60s.)</span>
                    </div>
                  );
                }
                return (
                  <div className="space-y-1">
                    {ccTasks.map((task, i) => {
                      const isLoop = detectLoop(task);
                      return (
                        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-md">
                          {isLoop ? (
                            <Repeat className="w-5 h-5 shrink-0" style={{ color: "var(--freedom)" }} />
                          ) : (
                            <Terminal className="w-5 h-5 shrink-0" style={{ color: "var(--freedom)" }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate text-ink-1">{task.name}</span>
                              <Pill dim="freedom" className={TAG_CLS} title="Source: Claude Code harness">Claude Code</Pill>
                              {isLoop && (
                                <Pill dim="creative" className={TAG_CLS} title="Active /loop session">Loop</Pill>
                              )}
                            </div>
                            <div className="text-xs mono muted">{task.schedule}</div>
                          </div>
                          <span
                            className={`text-[13px] font-medium tracking-wider uppercase ${statusClass[task.status] ?? "flat-muted"}`}
                          >
                            {task.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Section>
            )}

            {scheduleTab === "pulse" && (
            <Section
              title="Pulse Cron Jobs · LifeOS"
              icon={Zap}
              dimension="rhythms"
              action={
                <div className="flex items-center gap-3">
                  {cronData && (
                    <span className="text-xs mono muted">
                      {cronData.counts.enabled}/{cronData.counts.total} enabled
                      {" · "}
                      {cronData.counts.system} sys / {cronData.counts.user} user
                    </span>
                  )}
                  <button
                    onClick={() => setShowAddCron(!showAddCron)}
                    className="flex items-center gap-1.5 text-sm"
                    style={{ color: "var(--rhythms)" }}
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              }
            >
              <div className="text-xs mono mb-1 space-y-0.5 text-ink-2">
                <div>~/.claude/LIFEOS/PULSE/PULSE.toml <span className="text-ink-3">(system · ships with LifeOS, never written by this UI)</span></div>
                <div>~/.claude/LIFEOS/USER/CONFIG/PULSE.user.toml <span style={{ color: "var(--creative)" }}>(user · all edits/deletes from this UI write here)</span></div>
              </div>
              <div className="text-xs mb-3 text-ink-3">
                LifeOS&apos;s scheduling system — runs inside Pulse on this machine. Click any row to see full detail and edit interval / command / output.
              </div>
              {showAddCron && (
                <div className="mb-5 p-4 rounded-md space-y-3 bg-surface-1 border border-line-1">
                  <input
                    placeholder='name (e.g. "my-monitor")'
                    value={newCronName}
                    onChange={(e) => setNewCronName(e.target.value)}
                    className="w-full text-sm rounded px-4 py-2 mono bg-ground border border-line-1 text-ink-1"
                  />
                  <input
                    placeholder="cron schedule (5 fields, e.g. */5 * * * *)"
                    value={newCronSchedule}
                    onChange={(e) => setNewCronSchedule(e.target.value)}
                    className="w-full text-sm rounded px-4 py-2 mono bg-ground border border-line-1 text-ink-1"
                  />
                  <input
                    placeholder='shell command (e.g. "bun run checks/foo.ts")'
                    value={newCronCommand}
                    onChange={(e) => setNewCronCommand(e.target.value)}
                    className="w-full text-sm rounded px-4 py-2 mono bg-ground border border-line-1 text-ink-1"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowAddCron(false)}
                      className="text-sm px-4 py-2 rounded bg-transparent text-ink-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!newCronName.trim() || !newCronSchedule.trim() || !newCronCommand.trim()) return;
                        createCron.mutate({
                          name: newCronName.trim(),
                          schedule: newCronSchedule.trim(),
                          type: "script",
                          command: newCronCommand.trim(),
                          output: "log",
                          enabled: true,
                        });
                      }}
                      className="text-sm px-3.5 py-1.5 rounded-full font-medium cursor-pointer"
                      style={dimStyle("rhythms", true)}
                    >
                      Create
                    </button>
                  </div>
                  {createCron.isError && (
                    <div className="text-xs text-err">
                      {(createCron.error as Error)?.message ?? "Create failed"}
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const jobs = [...(cronData?.jobs ?? [])].sort((a, b) =>
                  a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1
                );
                if (jobs.length === 0) return <div className="text-sm text-ink-3">No cron jobs defined</div>;
                const pageCount = Math.max(1, Math.ceil(jobs.length / CRON_PAGE_SIZE));
                const safePage = Math.min(cronPage, pageCount - 1);
                const start = safePage * CRON_PAGE_SIZE;
                const pageJobs = jobs.slice(start, start + CRON_PAGE_SIZE);
                return (
                  <div className="space-y-1">
                    {pageJobs.map((job) => {
                      const isOpen = expandedCron === job.name;
                      const buf = isOpen ? editBuffer : {};
                      const bufType = (buf.type ?? job.type) as "script" | "claude";
                      const bufOutputs: string[] = Array.isArray(buf.output ?? job.output)
                        ? (buf.output ?? job.output) as string[]
                        : [(buf.output ?? job.output) as string];
                      return (
                        <div
                          key={job.name}
                          className={`rounded-md group border ${isOpen ? "bg-surface-1 border-line-1" : "border-transparent"}`}
                          style={{ transition: "background 180ms" }}
                        >
                          <div
                            className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-md transition-colors hover:bg-surface-1"
                            onClick={() => (isOpen ? closeExpand() : openExpand(job))}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCron.mutate({ name: job.name, enabled: !job.enabled }); }}
                              title={job.enabled ? "Click to disable" : "Click to enable"}
                              className="shrink-0"
                              style={{
                                width: 36, height: 18, borderRadius: 9,
                                background: job.enabled ? "var(--rhythms)" : "var(--line-1)",
                                border: "1px solid",
                                borderColor: job.enabled ? "var(--rhythms)" : "var(--line-3)",
                                position: "relative", cursor: "pointer", transition: "background 180ms",
                              }}
                            >
                              <span style={{ position: "absolute", top: 1, left: job.enabled ? 19 : 1, width: 14, height: 14, borderRadius: "50%", background: "var(--ink-1)", transition: "left 180ms" }} />
                            </button>
                            <Zap className="w-4 h-4 shrink-0" style={{ color: job.enabled ? "var(--rhythms)" : "var(--ink-3)" }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm truncate ${job.enabled ? "text-ink-1" : "text-ink-3"}`}>{job.name}</span>
                                <Pill dim={job.source === "user" ? "creative" : "neutral"} className={TAG_CLS}>{job.source}</Pill>
                                <Pill dim="rhythms" className={TAG_CLS} title={job.type === "claude" ? "Runs as claude subprocess" : "Shell command"}>{job.type}</Pill>
                              </div>
                              <div className="text-xs mono muted truncate" style={{ marginTop: 2 }}>
                                {job.schedule}
                                {job.command && <span style={{ marginLeft: 8, opacity: 0.7 }}>· {job.command}</span>}
                                {!job.command && job.prompt && <span style={{ marginLeft: 8, opacity: 0.7 }}>· {job.prompt.slice(0, 80)}{job.prompt.length > 80 ? "…" : ""}</span>}
                              </div>
                            </div>
                            <span className="text-xs mono shrink-0 text-ink-3" title="output target">
                              {Array.isArray(job.output) ? job.output.join(",") : job.output}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = job.source === "system"
                                  ? `Disable system job "${job.name}"? (writes user-file override; system file untouched)`
                                  : `Delete user job "${job.name}"?`;
                                if (confirm(msg)) deleteCron.mutate(job.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-all shrink-0 text-ink-3 hover:text-err"
                              title={job.source === "system" ? "Disable via override" : "Delete from user file"}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <span className="shrink-0 text-ink-3">
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                          </div>

                          {isOpen && (
                            <div className="px-12 pb-4 pt-1 space-y-3" style={{ borderTop: "1px solid var(--line-1)" }}>
                              <div className="grid grid-cols-[120px_1fr] gap-3 items-center pt-3">
                                <label className="text-[13px] uppercase tracking-wider text-ink-3">Schedule</label>
                                <input
                                  value={(buf.schedule as string) ?? job.schedule}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, schedule: e.target.value }))}
                                  placeholder="* * * * *"
                                  className="text-sm rounded px-3 py-1.5 mono w-full bg-ground border border-line-1 text-ink-1"
                                />

                                {bufType === "script" ? (
                                  <>
                                    <label className="text-[13px] uppercase tracking-wider text-ink-3">Command</label>
                                    <input
                                      value={(buf.command as string) ?? job.command ?? ""}
                                      onChange={(e) => setEditBuffer((b) => ({ ...b, command: e.target.value }))}
                                      className="text-sm rounded px-3 py-1.5 mono w-full bg-ground border border-line-1 text-ink-1"
                                    />
                                  </>
                                ) : (
                                  <>
                                    <label className="text-xs uppercase tracking-wider self-start pt-1 text-ink-3">Prompt</label>
                                    <textarea
                                      value={(buf.prompt as string) ?? job.prompt ?? ""}
                                      onChange={(e) => setEditBuffer((b) => ({ ...b, prompt: e.target.value }))}
                                      rows={4}
                                      className="text-sm rounded px-3 py-1.5 mono w-full bg-ground border border-line-1 text-ink-1"
                                      style={{ resize: "vertical" }}
                                    />
                                    <label className="text-[13px] uppercase tracking-wider text-ink-3">Model</label>
                                    <select
                                      value={(buf.model as string) ?? job.model ?? ""}
                                      onChange={(e) => setEditBuffer((b) => ({ ...b, model: e.target.value || null }))}
                                      className="text-sm rounded px-3 py-1.5 mono w-full bg-ground border border-line-1 text-ink-1"
                                    >
                                      <option value="">(default)</option>
                                      <option value="haiku">haiku</option>
                                      <option value="sonnet">sonnet</option>
                                      <option value="opus">opus</option>
                                    </select>
                                  </>
                                )}

                                <label className="text-xs uppercase tracking-wider self-start pt-1 text-ink-3">Output</label>
                                <div className="flex flex-wrap gap-2">
                                  {(["log", "voice", "ntfy", "email"] as const).map((opt) => {
                                    const active = bufOutputs.includes(opt);
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => {
                                          setEditBuffer((b) => {
                                            const cur = Array.isArray(b.output ?? job.output)
                                              ? ((b.output ?? job.output) as string[]).slice()
                                              : [(b.output ?? job.output) as string];
                                            const i = cur.indexOf(opt);
                                            if (i >= 0) cur.splice(i, 1); else cur.push(opt);
                                            const next = cur.length === 1 ? cur[0] : cur;
                                            return { ...b, output: next as string | string[] };
                                          });
                                        }}
                                        className={`text-xs mono px-2.5 py-1 rounded uppercase tracking-wider ${active ? "" : "bg-surface-1 text-ink-2 border border-line-1"}`}
                                        style={active ? dimStyle("rhythms", true) : undefined}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {editError && <div className="text-xs text-err">{editError}</div>}

                              <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--line-1)" }}>
                                <div className="text-xs mono text-ink-3">
                                  source: <span style={{ color: job.source === "user" ? "var(--creative)" : "var(--ink-2)" }}>{job.source}</span>
                                  {" · "}type: <span className="text-ink-1">{job.type}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={closeExpand}
                                    className="text-sm px-3 py-1 rounded bg-transparent text-ink-2 border border-line-1"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      const patch: Partial<CronJob> = {};
                                      if (buf.schedule !== undefined && buf.schedule !== job.schedule) patch.schedule = buf.schedule;
                                      if (bufType === "script") {
                                        if (buf.command !== undefined && buf.command !== job.command) patch.command = buf.command;
                                      } else {
                                        if (buf.prompt !== undefined && buf.prompt !== job.prompt) patch.prompt = buf.prompt;
                                        if (buf.model !== undefined && buf.model !== job.model) patch.model = buf.model;
                                      }
                                      if (buf.output !== undefined && JSON.stringify(buf.output) !== JSON.stringify(job.output)) patch.output = buf.output;
                                      if (Object.keys(patch).length === 0) { closeExpand(); return; }
                                      patchCron.mutate({ name: job.name, patch }, { onSuccess: () => closeExpand() });
                                    }}
                                    className="text-sm px-3.5 py-1 rounded-full font-medium cursor-pointer"
                                    style={dimStyle("rhythms", true)}
                                    disabled={patchCron.isPending}
                                  >
                                    {patchCron.isPending ? "Saving…" : "Save"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {cronData && cronData.jobs.length > CRON_PAGE_SIZE && (() => {
                const pageCount = Math.max(1, Math.ceil(cronData.jobs.length / CRON_PAGE_SIZE));
                const safePage = Math.min(cronPage, pageCount - 1);
                const start = safePage * CRON_PAGE_SIZE;
                const end = Math.min(start + CRON_PAGE_SIZE, cronData.jobs.length);
                return (
                  <div className="mt-3 flex items-center justify-between text-xs pt-2" style={{ borderTop: "1px solid var(--line-1)" }}>
                    <span className="mono muted">
                      Showing <span className="text-ink-1">{start + 1}–{end}</span> of <span className="text-ink-1">{cronData.jobs.length}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { closeExpand(); setCronPage((p) => Math.max(0, p - 1)); }}
                        disabled={safePage === 0}
                        className="text-xs px-3 py-1 rounded mono border border-line-1"
                        style={safePage === 0
                          ? { background: "transparent", color: "var(--ink-3)", cursor: "not-allowed" }
                          : { background: "var(--surface-1)", color: "var(--rhythms)", cursor: "pointer" }}
                      >
                        ← Prev
                      </button>
                      <span className="mono muted">
                        Page <span className="text-ink-1">{safePage + 1}</span> / {pageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => { closeExpand(); setCronPage((p) => Math.min(pageCount - 1, p + 1)); }}
                        disabled={safePage >= pageCount - 1}
                        className="text-xs px-3 py-1 rounded mono border border-line-1"
                        style={safePage >= pageCount - 1
                          ? { background: "transparent", color: "var(--ink-3)", cursor: "not-allowed" }
                          : { background: "var(--surface-1)", color: "var(--rhythms)", cursor: "pointer" }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                );
              })()}

            </Section>
            )}
          </div>
        )}

        {/* PERSONALITY TAB */}
        {activeTab === "personality" && personality && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Personality Traits" icon={Brain} dimension="creative">
              {personality.base_description && (
                <p className="mb-5 leading-relaxed text-sm text-ink-1">
                  {personality.base_description}
                </p>
              )}
              <div className="space-y-3">
                {Object.entries(personality.traits).map(([name, value], index) => (
                  <TraitBar
                    key={name}
                    name={name}
                    value={value as number}
                    color={dimColors[traitDimensions[index % traitDimensions.length]]}
                    onEdit={(v) => updateTrait.mutate({ [name]: v })}
                  />
                ))}
              </div>
            </Section>

            <div className="space-y-6">
              <Section title="What I Love" icon={Heart} dimension="money">
                <ul className="space-y-2">
                  {personality.preferences.what_i_love.map((item, i) => (
                    <li key={i} className="leading-relaxed flex gap-2 text-sm text-ink-1">
                      <span className="shrink-0 mt-0.5 green-up">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="What I Dislike" dimension="money">
                <ul className="space-y-2">
                  {personality.preferences.what_i_dislike.map((item, i) => (
                    <li key={i} className="leading-relaxed flex gap-2 text-sm text-ink-1">
                      <span className="shrink-0 mt-0.5 coral-down">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>

            {personality.anchors.length > 0 && (
              <Section title="Key Moments" dimension="relationships">
                <div className="space-y-4">
                  {personality.anchors.map((anchor, i) => (
                    <div key={i}>
                      <div className="text-sm font-medium" style={{ color: "var(--relationships)" }}>{anchor.name}</div>
                      <div className="text-sm mt-1 text-ink-2">{anchor.description}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {personality.companion && (
              <Section title="Companion" dimension="relationships">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">🐱</div>
                  <div>
                    <div className="text-base font-medium text-ink-1">{personality.companion.name}</div>
                    <div className="text-sm text-ink-2">
                      {personality.companion.species} — {personality.companion.personality}
                    </div>
                  </div>
                </div>
              </Section>
            )}

            <Section title="Autonomy" icon={Shield} dimension="freedom">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs tracking-wider uppercase mb-2 green-up">Can Initiate</div>
                  {personality.autonomy.can_initiate.map((item, i) => (
                    <div key={i} className="py-1 text-sm text-ink-1">{item.replace(/_/g, " ")}</div>
                  ))}
                </div>
                <div>
                  <div className="text-xs tracking-wider uppercase mb-2" style={{ color: "var(--money)" }}>Must Ask</div>
                  {personality.autonomy.must_ask.map((item, i) => (
                    <div key={i} className="py-1 text-sm text-ink-1">{item.replace(/_/g, " ")}</div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Formed Opinions" dimension="creative">
              {!opinionsData?.raw ? (
                <div className="text-sm text-ink-3">No opinions yet</div>
              ) : (
                <div className="space-y-3">
                  {opinionsData.raw.split(/^\s*- topic:/m).slice(1).slice(0, 10).map((block, i) => {
                    const topic = block.match(/^\s*"?([^"\n]+)"?\s*$/m)?.[1]?.trim() ?? "";
                    const position = block.match(/position:\s*"?([^"\n]+)"?/)?.[1]?.trim() ?? "";
                    const confidence = parseFloat(block.match(/confidence:\s*([\d.]+)/)?.[1] ?? "0");
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-2 shrink-0"
                          style={{ backgroundColor: `rgba(248, 123, 123, ${Math.max(0.2, confidence)})` }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-ink-1">{topic}</div>
                          <div className="text-sm text-ink-2">{position}</div>
                        </div>
                        <span className="text-xs shrink-0 mono text-ink-3">
                          {(confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* HERMES TAB — the sidecar's core files: soul, config, guard, and the
            code that generates them. Same assistant, second front door. */}
        {activeTab === "hermes" && <HermesFiles />}

        {/* DIARY TAB */}
        {activeTab === "diary" && (
          <Section title="Diary Entries" dimension="rhythms">
            {!diaryData || diaryData.entries.length === 0 ? (
              <div className="text-sm text-ink-3">No diary entries</div>
            ) : (
              <div className="space-y-4">
                {diaryData.entries.slice().reverse().map((entry) => (
                  <div
                    key={entry.date}
                    className="p-4 rounded-md space-y-3 bg-surface-1 border border-line-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="mono text-ink-1" style={{ fontSize: 15 }}>{entry.date}</span>
                      <div className="flex items-center gap-4 text-sm text-ink-2">
                        <span>{entry.interaction_count} sessions</span>
                        <span className={entry.mood === "positive" ? "green-up" : entry.mood === "frustrated" ? "coral-down" : "flat-muted"}>
                          {entry.mood}
                        </span>
                        <span>{entry.avg_rating}/10</span>
                      </div>
                    </div>
                    {entry.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {entry.topics.map((topic, i) => (
                          <Pill key={i} dim="rhythms">{topic}</Pill>
                        ))}
                      </div>
                    )}
                    {entry.notable_moments.map((moment, i) => (
                      <div key={i} className="text-sm text-ink-1">{moment}</div>
                    ))}
                    {entry.learning && (
                      <div
                        className="text-sm italic pl-3 text-ink-2"
                        style={{ borderLeft: "2px solid rgba(45,212,191,0.4)" }}
                      >
                        {entry.learning}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Identity Card — schedules lead the page; identity lives down here */}
        {identity && (
          <Panel className="flex flex-row items-center gap-6">
            {identity.has_avatar ? (
              <img
                src="/assistant/avatar"
                alt={identity.display_name}
                className="w-20 h-20 rounded-full object-cover"
                style={{ border: "2px solid var(--creative)" }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
                style={{ backgroundColor: "rgba(248,123,123,0.14)", color: "var(--creative)" }}
              >
                {identity.display_name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0" data-sensitive>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-ink-1 font-medium" style={{ fontSize: 20 }}>{identity.full_name}</h2>
                <Pill dim="creative" className="tracking-wide font-semibold">{identity.display_name}</Pill>
              </div>
              <p className="mt-1 text-sm text-ink-1">{identity.role}</p>
              {identity.origin_story && (
                <p className="mt-1.5 leading-relaxed text-[13px] text-ink-2">{identity.origin_story}</p>
              )}
            </div>
            <div className="text-right text-sm space-y-1.5 shrink-0 text-ink-2">
              <div className="flex items-center gap-2 justify-end">
                <Clock className="w-4 h-4" style={{ color: "var(--creative)" }} />
                <span>Up {formatUptime(identity.uptime_ms)}</span>
              </div>
              <div>Principal: <span className="text-ink-1">{identity.principal}</span></div>
              <div>{health?.opinions_count ?? 0} opinions formed</div>
            </div>
          </Panel>
        )}
      </div>
    </PageShell>
  );
}
