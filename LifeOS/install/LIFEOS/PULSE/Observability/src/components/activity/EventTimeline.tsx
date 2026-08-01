"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import type { HookEvent } from "@/hooks/useAgentEvents";
import type { TimeRange } from "@/hooks/useChartData";
import EventRow from "./EventRow";
import IntensityBar from "./IntensityBar";
import { Box, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";

interface EventTimelineProps {
  events: HookEvent[];
  heatLevel?: { intensity: number; color: string; label: string };
  eventsPerMinute?: number;
  timeRange: TimeRange;
  timeRanges: TimeRange[];
  onSetTimeRange: (range: TimeRange) => void;
}

export default function EventTimeline({
  events,
  heatLevel,
  eventsPerMinute,
  timeRange,
  timeRanges,
  onSetTimeRange,
}: EventTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // "desc" = most recent first (the default when Actions opens); "asc" = oldest
  // first. Sorting is explicit on timestamp rather than a blind reverse(), so
  // order holds regardless of the incoming array. public PR #1628, @elhoim
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const sortedEvents = useMemo(() => {
    const arr = events.slice().sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    return sortOrder === "desc" ? arr.reverse() : arr;
  }, [events, sortOrder]);

  // Auto-scroll to top on new events — only meaningful when newest is at the top.
  useEffect(() => {
    if (sortOrder === "desc" && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, sortOrder]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Intensity Bar */}
      {heatLevel && (
        <IntensityBar
          intensity={heatLevel.intensity}
          color={heatLevel.color}
          label={heatLevel.label}
          eventsPerMinute={eventsPerMinute ?? 0}
          timeRange={timeRange}
          timeRanges={timeRanges}
          onSetTimeRange={onSetTimeRange}
        />
      )}

      {/* Column Headers */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-20">Agent</span>
          <span className="w-24">Hook</span>
          <span className="w-20">Tool</span>
          <span className="flex-1">Details</span>
        </div>
        <div className="w-24 flex items-center justify-end gap-1">
          <span>Time</span>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            title={
              sortOrder === "desc"
                ? "Most recent first — click for oldest first"
                : "Oldest first — click for most recent first"
            }
            aria-label="Toggle sort order"
            className="p-0.5 rounded hover:bg-white/[0.06] text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
          >
            {sortOrder === "desc" ? (
              <ArrowDownWideNarrow size={13} />
            ) : (
              <ArrowUpWideNarrow size={13} />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Event List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-2">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-white/[0.03] p-6 rounded-2xl mb-4">
              <Box size={40} className="text-[var(--line-2)]" />
            </div>
            <p className="text-base font-medium text-[var(--ink-2)] mb-1">No events yet</p>
            <p className="text-sm text-[var(--line-2)]">Events will appear here as they stream in</p>
          </div>
        ) : (
          <div className="space-y-1.5 divide-y divide-[rgba(107,128,171,0.1)]">
            {sortedEvents.map((event) => (
              <EventRow key={`${event.id}-${event.timestamp}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
