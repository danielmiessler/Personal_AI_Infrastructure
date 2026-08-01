"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AlgorithmState, AlgorithmApiResponse, RatingPulse } from "@/types/algorithm";
import { localOnlyApiCall } from "@/lib/local-api";

// 2026-05-24 (realtime-phase-tracking): SSE-first with polling fallback.
//
//   - When the SSE channel (/api/algorithm/stream) is connected, state updates
//     arrive within ~100ms of work.json being written. Polling drops to the
//     STALE_POLL_INTERVAL safety net (30s).
//   - When SSE is unavailable (server returns 503 with LIFEOS_NO_SSE=1, or the
//     connection fails repeatedly), the hook falls back to the legacy 2s
//     polling cadence. Behavior is identical to pre-realtime-tracking.
//
// Single source of truth for parsed AlgorithmState — the SSE payload shape
// is byte-for-byte identical to `GET /api/algorithm` (extracted from the
// same `buildAlgorithmStatePayload()`).
const FAST_POLL_INTERVAL = 2000;      // fallback when SSE is unavailable
const STALE_POLL_INTERVAL = 30_000;   // safety net when SSE is connected
const SSE_RECONNECT_RETRIES = 3;      // give up SSE after N consecutive failures

/** Normalize API response to ensure new fields have defaults */
function normalizeState(state: AlgorithmState): AlgorithmState {
  return {
    ...state,
    tracked: state.tracked ?? (state.criteria?.length > 0),
    climb: state.climb ?? [],
    ratings: state.ratings ?? [],
  };
}

function applyPayload(
  data: AlgorithmApiResponse,
  setAlgorithmStates: (s: AlgorithmState[]) => void,
  setPulseStrip: (p: RatingPulse[]) => void,
): void {
  if (data.algorithms && Array.isArray(data.algorithms)) {
    setAlgorithmStates(data.algorithms.map(normalizeState));
  } else if (data.active !== false && (data as unknown as AlgorithmState).sessionId) {
    setAlgorithmStates([normalizeState(data as unknown as AlgorithmState)]);
  } else {
    setAlgorithmStates([]);
  }
  setPulseStrip(data.pulseStrip ?? []);
}

export function useAlgorithmState() {
  const [algorithmStates, setAlgorithmStates] = useState<AlgorithmState[]>([]);
  const [pulseStrip, setPulseStrip] = useState<RatingPulse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const sseConnectedRef = useRef(false);
  const sseFailureCountRef = useRef(0);

  const fetchState = useCallback(async () => {
    try {
      const data = await localOnlyApiCall<AlgorithmApiResponse>("/api/algorithm");
      applyPayload(data, setAlgorithmStates, setPulseStrip);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch algorithm state");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Encapsulate poll-cadence management so SSE-connected vs SSE-down both
  // use the same restart path.
  const restartPolling = useCallback((intervalMs: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchState, intervalMs);
  }, [fetchState]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // SSE wiring — try once; on persistent failure, fall back to polling.
  const connectSSE = useCallback(() => {
    if (typeof window === "undefined") return;
    if (typeof EventSource === "undefined") return;
    if (sseRef.current) return;

    try {
      const es = new EventSource("/api/algorithm/stream");
      sseRef.current = es;

      es.addEventListener("algorithm", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data) as AlgorithmApiResponse;
          applyPayload(data, setAlgorithmStates, setPulseStrip);
          setError(null);
          setIsLoading(false);
          if (!sseConnectedRef.current) {
            sseConnectedRef.current = true;
            sseFailureCountRef.current = 0;
            // Once SSE is confirmed, polling drops to the slow safety net.
            restartPolling(STALE_POLL_INTERVAL);
          }
        } catch {
          // bad frame; ignore
        }
      });

      es.onerror = () => {
        // EventSource auto-reconnects on transient errors. Only give up after
        // SSE_RECONNECT_RETRIES consecutive non-open events.
        sseFailureCountRef.current += 1;
        if (sseFailureCountRef.current >= SSE_RECONNECT_RETRIES) {
          try { es.close(); } catch {}
          sseRef.current = null;
          sseConnectedRef.current = false;
          restartPolling(FAST_POLL_INTERVAL);
        }
      };
    } catch {
      // EventSource construction failed; stay on polling
      sseRef.current = null;
    }
  }, [restartPolling]);

  const disconnectSSE = useCallback(() => {
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }
    sseConnectedRef.current = false;
    sseFailureCountRef.current = 0;
  }, []);

  useEffect(() => {
    // Boot: one immediate fetch (so we have data before SSE handshake completes),
    // start fast polling, kick off SSE attempt. SSE success will reduce polling
    // to the stale safety net.
    fetchState();
    restartPolling(FAST_POLL_INTERVAL);
    connectSSE();

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
        disconnectSSE();
      } else {
        fetchState();
        restartPolling(sseConnectedRef.current ? STALE_POLL_INTERVAL : FAST_POLL_INTERVAL);
        connectSSE();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      disconnectSSE();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchState, restartPolling, stopPolling, connectSSE, disconnectSSE]);

  // Backward-compatible: also expose first state as algorithmState
  const algorithmState = algorithmStates.length > 0 ? algorithmStates[0] : null;

  return { algorithmState, algorithmStates, pulseStrip, isLoading, error };
}
