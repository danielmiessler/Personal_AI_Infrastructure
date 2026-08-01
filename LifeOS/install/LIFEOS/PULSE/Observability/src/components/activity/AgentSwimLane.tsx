"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import type { HookEvent } from "@/hooks/useAgentEvents";
import { useChartData, type TimeRange } from "@/hooks/useChartData";
import { createChartRenderer, type ChartDimensions, type ChartConfig } from "./ChartRenderer";
import { Brain, Wrench, Clock, X, Zap, Loader2 } from "lucide-react";

// ─── Agent Color Map ───

const AGENT_HEX: Record<string, string> = {
  pentester: "#EF4444",
  engineer: "#3B82F6",
  designer: "#A855F7",
  architect: "#A855F7",
  intern: "#06B6D4",
  artist: "#06B6D4",
  "perplexity-researcher": "#EAB308",
  "claude-researcher": "#EAB308",
  "gemini-researcher": "#EAB308",
  main: "#3B82F6",
  da: "#3B82F6",
  pai: "#3B82F6",
  "claude-code": "#3B82F6",
};

function getHexColor(name: string) {
  return AGENT_HEX[name.split(":")[0].toLowerCase()] || "#7aa2f7";
}

function formatGap(ms: number): string {
  if (ms === 0) return "\u2014";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatModelName(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.split("-");
  return parts.length >= 4 ? `${parts[1]}-${parts[2]}-${parts[3]}` : name;
}

// ─── Props ───

interface AgentSwimLaneProps {
  agentName: string; // "agent:session"
  events: HookEvent[];
  timeRange: TimeRange;
  onClose: () => void;
}

// ─── Component ───

export default function AgentSwimLane({ agentName, events, timeRange, onClose }: AgentSwimLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ReturnType<typeof createChartRenderer> | null>(null);
  const processedIdsRef = useRef(new Set<string>());
  const renderLoopRef = useRef<number | null>(null);
  const chartHeight = 80;

  const appName = useMemo(() => agentName.split(":")[0], [agentName]);
  const [targetAgent, targetSession] = useMemo(() => agentName.split(":"), [agentName]);

  const { dataPoints, addEvent, getChartData, setTimeRange, currentConfig } = useChartData(agentName);

  // Sync time range from parent
  useEffect(() => {
    setTimeRange(timeRange);
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalEventCount = useMemo(() => dataPoints.reduce((sum, dp) => sum + dp.count, 0), [dataPoints]);
  const toolCallCount = useMemo(
    () => dataPoints.reduce((sum, dp) => sum + (dp.eventTypes?.PreToolUse || 0), 0),
    [dataPoints]
  );

  // Average gap between events
  const avgGap = useMemo(() => {
    const now = Date.now();
    const cutoff = now - currentConfig.duration;
    const windowEvents = events
      .filter((e) => {
        const agent = e.agent_name || e.source_app;
        return agent === targetAgent && e.session_id.slice(0, 8) === targetSession && e.timestamp && e.timestamp >= cutoff;
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (windowEvents.length < 2) return 0;
    const gaps: number[] = [];
    for (let i = 1; i < windowEvents.length; i++) {
      const gap = (windowEvents[i].timestamp || 0) - (windowEvents[i - 1].timestamp || 0);
      if (gap > 0) gaps.push(gap);
    }
    if (gaps.length === 0) return 0;
    return gaps.reduce((a, b) => a + b, 0) / gaps.length;
  }, [events, targetAgent, targetSession, currentConfig.duration]);

  // Model name from most recent event
  const modelName = useMemo(() => {
    const agentEvents = events.filter((e) => {
      const agent = e.agent_name || e.source_app;
      return agent === targetAgent && e.session_id.slice(0, 8) === targetSession && e.model_name;
    });
    return agentEvents.length > 0 ? agentEvents[agentEvents.length - 1].model_name : null;
  }, [events, targetAgent, targetSession]);

  const hasData = dataPoints.some((dp) => dp.count > 0);
  const agentColor = getHexColor(appName);

  const getDimensions = useCallback(
    (): ChartDimensions => ({
      width: containerRef.current?.offsetWidth || 800,
      height: chartHeight,
      padding: { top: 7, right: 7, bottom: 15, left: 7 },
    }),
    [chartHeight]
  );

  const render = useCallback(() => {
    if (!rendererRef.current) return;
    const data = getChartData();
    const maxVal = Math.max(...data.map((d) => d.count), 1);
    rendererRef.current.clear();
    rendererRef.current.drawBackground();
    rendererRef.current.drawAxes();
    rendererRef.current.drawTimeLabels(timeRange);
    rendererRef.current.drawBars(data, maxVal);
  }, [getChartData, timeRange]);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    rendererRef.current = createChartRenderer(canvasRef.current, getDimensions(), {
      maxDataPoints: 60,
      animationDuration: 300,
      barWidth: 3,
      barGap: 1,
      colors: { primary: "#3B82F6", glow: "#60A5FA", axis: "#333", text: "#565f89" },
    });

    const resizeObs = new ResizeObserver(() => {
      if (rendererRef.current) {
        rendererRef.current.resize(getDimensions());
        render();
      }
    });
    resizeObs.observe(containerRef.current);

    let lastRender = 0;
    const frameInterval = 1000 / 30;
    const loop = (t: number) => {
      if (t - lastRender >= frameInterval) {
        render();
        lastRender = t - ((t - lastRender) % frameInterval);
      }
      renderLoopRef.current = requestAnimationFrame(loop);
    };
    renderLoopRef.current = requestAnimationFrame(loop);

    return () => {
      resizeObs.disconnect();
      if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
      rendererRef.current?.stopAnimation();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Process events (filter by agent)
  useEffect(() => {
    events.forEach((event) => {
      const key = `${event.id}-${event.timestamp}`;
      if (processedIdsRef.current.has(key)) return;
      processedIdsRef.current.add(key);

      if (event.hook_event_type === "refresh" || event.hook_event_type === "initial") return;
      const agent = event.agent_name || event.source_app;
      if (agent === targetAgent && event.session_id.slice(0, 8) === targetSession) {
        addEvent(event);
      }
    });

    const currentIds = new Set(events.map((e) => `${e.id}-${e.timestamp}`));
    processedIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) processedIdsRef.current.delete(id);
    });
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full flex flex-col gap-1 mb-3">
      {/* Header */}
      <div className="flex justify-between items-center text-xs font-semibold px-2 gap-2">
        <div className="flex items-center gap-1.5">
          {/* Agent label */}
          <span
            className="px-2 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide text-white inline-flex items-center min-h-[28px]"
            style={{ backgroundColor: agentColor, borderColor: agentColor }}
          >
            <span className="font-mono text-xs">{appName}</span>
          </span>

          {/* Model badge */}
          {modelName && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-1 rounded-lg border border-[var(--line-2)] min-h-[28px]">
              <Brain size={14} strokeWidth={2.5} />
              <span className="text-xs font-bold">{formatModelName(modelName)}</span>
            </div>
          )}

          {/* Event count */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-1 rounded-lg border border-[var(--line-2)] min-h-[28px]">
            <Zap size={14} strokeWidth={2.5} className="shrink-0" />
            <span className="text-xs font-bold">{totalEventCount}</span>
          </div>

          {/* Tool call count */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-1 rounded-lg border border-[var(--line-2)] min-h-[28px]">
            <Wrench size={14} strokeWidth={2.5} className="shrink-0" />
            <span className="text-xs font-bold">{toolCallCount}</span>
          </div>

          {/* Avg gap */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-1 rounded-lg border border-[var(--line-2)] min-h-[28px]">
            <Clock size={16} strokeWidth={2.5} className="shrink-0" />
            <span className="text-sm font-bold">{formatGap(avgGap)}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-[var(--ink-3)] hover:text-white transition-colors p-0.5 rounded hover:bg-white/[0.05]"
          title="Remove this swim lane"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative w-full border border-[var(--line-2)] rounded-md overflow-hidden bg-surface-1">
        <canvas ref={canvasRef} className="w-full cursor-crosshair" style={{ height: chartHeight + "px" }} />
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="flex items-center gap-2 text-[var(--ink-3)] text-sm font-semibold">
              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
              Waiting for events...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
