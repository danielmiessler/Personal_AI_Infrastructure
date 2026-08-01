"use client";

import { useMemo } from "react";
import type { AlgorithmState, ClimbPoint } from "@/types/algorithm";
import { LIFECYCLE_META } from "@/lib/lifecycle";

// ─── ClimbChart — the ascent of a run ───
//
// Two truths on one time axis (2026-07-22 redesign):
//   HILL PROFILE — total ISCs is the mountain's silhouette; closed ISCs the
//     filled ascent. Adding claims visibly raises the hill (+n markers);
//     closing them gains altitude. Y is claim COUNT, not ratio, so the hill
//     growing and the climb are separate, visible motions.
//   ACTIVITY RIBBON — per-minute tool calls colored by derived class
//     (exploring/building/verifying/delegating), from tool-activity.jsonl via
//     the server. A run with zero ISC movement still shows a living pulse.
// Every point comes from a work-events.jsonl transition; nothing here depends
// on declared phases.

interface ClimbChartProps {
  state: AlgorithmState;
  /** compact sparkline (row) vs full chart (expanded) */
  variant: "mini" | "full";
}

interface XY {
  x: number;
  y: number;
  point?: ClimbPoint;
  added?: number;
}

const RIBBON_COLORS: Record<string, string> = {
  e: "#7dcfff", // exploring
  b: "#e0af68", // building
  v: "#34d399", // verifying
  d: "#bb9af7", // delegating
  o: "#565f89", // other
};

export default function ClimbChart({ state, variant }: ClimbChartProps) {
  const W = variant === "mini" ? 128 : 720;
  const H = variant === "mini" ? 30 : 150;
  const PAD = variant === "mini" ? 2 : 14;
  const RIBBON_H = 26;

  const { donePath, doneArea, totalPath, dots, addMarkers, climbComplete, pct, maxTotal, start, end } =
    useMemo(() => {
      const raw: ClimbPoint[] = state.climb?.length
        ? state.climb
        : state.progress?.total
          ? [{ ts: state.phaseStartedAt || Date.now(), done: state.progress.done, total: state.progress.total }]
          : [];

      const start = Math.min(state.algorithmStartedAt || Date.now(), raw[0]?.ts ?? Date.now());
      const end = state.active ? Date.now() : Math.max(raw[raw.length - 1]?.ts ?? start, state.completedAt ?? start);
      const span = Math.max(end - start, 1);
      const maxTotal = Math.max(1, ...raw.map((p) => p.total));

      const xOf = (ts: number) => PAD + ((ts - start) / span) * (W - PAD * 2);
      const yOf = (count: number) => H - PAD - (count / maxTotal) * (H - PAD * 2);

      // Done series (the ascent) + total series (the hill silhouette), both as
      // step paths — claims move in discrete steps, not slopes.
      const donePts: XY[] = [{ x: xOf(start), y: yOf(0) }];
      const totalPts: XY[] = [{ x: xOf(start), y: yOf(raw.length ? 0 : 0) }];
      const addMarkers: { x: number; y: number; n: number }[] = [];
      let prevTotal = 0;
      for (const p of raw) {
        donePts.push({ x: xOf(p.ts), y: yOf(p.done), point: p });
        totalPts.push({ x: xOf(p.ts), y: yOf(p.total) });
        if (p.total > prevTotal) {
          addMarkers.push({ x: xOf(p.ts), y: yOf(p.total), n: p.total - prevTotal });
        }
        prevTotal = p.total;
      }
      const last = raw[raw.length - 1];
      donePts.push({ x: xOf(end), y: yOf(last?.done ?? 0) });
      totalPts.push({ x: xOf(end), y: yOf(last?.total ?? 0) });

      const stepPath = (pts: XY[]) => {
        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < pts.length; i++) d += ` H ${pts[i].x.toFixed(1)} V ${pts[i].y.toFixed(1)}`;
        return d;
      };

      const donePath = stepPath(donePts);
      const doneArea = `${donePath} V ${(H - PAD).toFixed(1)} H ${donePts[0].x.toFixed(1)} Z`;
      const totalPath = stepPath(totalPts);

      const lastDone = last?.done ?? 0;
      const lastTotal = last?.total ?? 0;

      return {
        donePath,
        doneArea,
        totalPath,
        dots: donePts.filter((p) => p.point),
        addMarkers,
        climbComplete: lastTotal > 0 && lastDone >= lastTotal,
        pct: lastTotal > 0 ? Math.round((lastDone / lastTotal) * 100) : 0,
        maxTotal,
        start,
        end,
      };
    }, [state, W, H, PAD]);

  // Ribbon buckets clipped to the chart's time domain.
  const ribbon = useMemo(() => {
    const buckets = state.activity?.ribbon ?? [];
    if (variant === "mini" || buckets.length === 0) return [];
    const span = Math.max(end - start, 1);
    const minuteW = Math.max(2, (60_000 / span) * (W - PAD * 2));
    const maxCalls = Math.max(...buckets.map((r) => r.e + r.b + r.v + r.d + r.o), 1);
    return buckets
      .filter((r) => r.t + 60_000 >= start && r.t <= end)
      .map((r) => ({
        x: PAD + ((Math.max(r.t, start) - start) / span) * (W - PAD * 2),
        w: Math.min(minuteW, W - PAD),
        segs: (["e", "b", "v", "d", "o"] as const)
          .map((k) => ({ k, n: r[k] as number }))
          .filter((s) => s.n > 0),
        total: r.e + r.b + r.v + r.d + r.o,
        maxCalls,
      }));
  }, [state.activity, variant, start, end, W, PAD]);

  const lineColor = climbComplete ? LIFECYCLE_META.cairn.color : state.active ? "#7dcfff" : "#565f89";

  if (variant === "mini") {
    return (
      <svg width={W} height={H} className="shrink-0" aria-label={`Climb ${pct}%`}>
        <path d={doneArea} fill={lineColor} opacity={0.08} />
        <path d={totalPath} fill="none" stroke="#565f89" strokeWidth={1} opacity={0.6} strokeDasharray="2 2" />
        <path d={donePath} fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.9} />
        {dots.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.8}
            fill={p.point && p.point.done === p.point.total ? LIFECYCLE_META.cairn.color : lineColor}
          />
        ))}
      </svg>
    );
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }} aria-label={`Climb chart ${pct}%`}>
        {/* claim-count gridlines */}
        {Array.from({ length: Math.min(maxTotal, 4) }, (_, i) => {
          const count = Math.round(((i + 1) / Math.min(maxTotal, 4)) * maxTotal);
          const y = H - PAD - (count / maxTotal) * (H - PAD * 2);
          return (
            <g key={i}>
              <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={W - PAD + 2} y={y + 3} fontSize={8} fill="rgba(255,255,255,0.25)" fontFamily="monospace">
                {count}
              </text>
            </g>
          );
        })}
        {/* hill silhouette — total claims */}
        <path d={totalPath} fill="none" stroke="#565f89" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.8} />
        {/* the ascent — closed claims */}
        <path d={doneArea} fill={lineColor} opacity={0.07} />
        <path d={donePath} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" />
        {/* +n markers where the hill grew */}
        {addMarkers.map((m, i) => (
          <text
            key={i}
            x={Math.min(m.x + 3, W - PAD - 14)}
            y={Math.max(m.y - 4, PAD + 8)}
            fontSize={9}
            fill="#e0af68"
            fontFamily="monospace"
          >
            +{m.n}
          </text>
        ))}
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={p.point && p.point.done === p.point.total ? LIFECYCLE_META.cairn.color : lineColor}>
            <title>
              {p.point ? `${p.point.done}/${p.point.total} at ${new Date(p.point.ts).toLocaleTimeString()}` : ""}
            </title>
          </circle>
        ))}
        {/* completion marker — resolved from the ascent table, same as the Kitty tab */}
        {climbComplete && (
          <text x={W - PAD - 4} y={PAD + 8} fontSize={10} textAnchor="end" fill={LIFECYCLE_META.cairn.color}>
            {LIFECYCLE_META.cairn.icon} {LIFECYCLE_META.cairn.label.toLowerCase()}
          </text>
        )}
      </svg>

      {/* activity ribbon — tool calls per minute, colored by derived class */}
      {ribbon.length > 0 && (
        <svg
          viewBox={`0 0 ${W} ${RIBBON_H}`}
          className="w-full mt-0.5"
          style={{ maxHeight: RIBBON_H }}
          aria-label="Tool activity per minute"
        >
          {ribbon.map((col, i) => {
            const colH = Math.max(2, (Math.min(col.total, col.maxCalls) / col.maxCalls) * (RIBBON_H - 4));
            let yCursor = RIBBON_H - 2;
            return (
              <g key={i}>
                <title>{`${col.total} tool calls`}</title>
                {col.segs.map((s) => {
                  const segH = (s.n / col.total) * colH;
                  yCursor -= segH;
                  return (
                    <rect
                      key={s.k}
                      x={col.x}
                      y={yCursor}
                      width={Math.max(col.w - 1, 1.5)}
                      height={segH}
                      fill={RIBBON_COLORS[s.k]}
                      opacity={0.85}
                      rx={0.5}
                    />
                  );
                })}
              </g>
            );
          })}
          <text x={PAD} y={8} fontSize={7} fill="rgba(255,255,255,0.3)" fontFamily="monospace">
            activity
          </text>
        </svg>
      )}
    </div>
  );
}
