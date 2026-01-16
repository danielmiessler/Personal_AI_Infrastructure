import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { HookEvent, ObservabilityStats, AgentActivity } from '@/types/observability';

// Use proxied endpoint through mobile app server for Tailscale compatibility
const OBSERVABILITY_WS_URL = `ws://${window.location.host}/observability/stream`;
const MAX_EVENTS = 200;
const RECONNECT_INTERVAL = 3000;

// Agent colors for visualization
const AGENT_COLORS: Record<string, string> = {
  kai: '#3B82F6',
  designer: '#EC4899',
  engineer: '#10B981',
  pentester: '#EF4444',
  architect: '#8B5CF6',
  writer: '#F59E0B',
  researcher: '#06B6D4',
  default: '#6B7280',
};

export function useObservability() {
  const events = ref<HookEvent[]>([]);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  const stats = computed<ObservabilityStats>(() => {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const recentEvents = events.value.filter(e => e.timestamp > fiveMinAgo);

    const uniqueAgents = new Set(recentEvents.map(e => e.source_app));
    const uniqueSessions = new Set(recentEvents.map(e => e.session_id));
    const toolCalls = recentEvents.filter(
      e => e.hook_event_type === 'PreToolUse' || e.hook_event_type === 'PostToolUse'
    ).length;

    return {
      activeAgents: uniqueAgents.size,
      totalEvents: recentEvents.length,
      toolCalls: Math.floor(toolCalls / 2), // PreToolUse + PostToolUse = 1 call
      sessions: uniqueSessions.size,
    };
  });

  const agentActivity = computed<AgentActivity[]>(() => {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const recentEvents = events.value.filter(e => e.timestamp > fiveMinAgo);

    const activityMap = new Map<string, { count: number; lastSeen: number }>();

    for (const event of recentEvents) {
      const current = activityMap.get(event.source_app) || { count: 0, lastSeen: 0 };
      activityMap.set(event.source_app, {
        count: current.count + 1,
        lastSeen: Math.max(current.lastSeen, event.timestamp),
      });
    }

    return Array.from(activityMap.entries())
      .map(([name, data]) => ({
        name,
        eventCount: data.count,
        lastSeen: data.lastSeen,
        color: AGENT_COLORS[name] || AGENT_COLORS.default,
      }))
      .sort((a, b) => b.lastSeen - a.lastSeen);
  });

  const recentEvents = computed(() => {
    return events.value.slice(0, 50);
  });

  function connect() {
    if (ws?.readyState === WebSocket.OPEN || isConnecting.value) return;

    isConnecting.value = true;
    error.value = null;

    try {
      ws = new WebSocket(OBSERVABILITY_WS_URL);

      ws.onopen = () => {
        isConnected.value = true;
        isConnecting.value = false;
        error.value = null;
      };

      ws.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data);

          // Server sends { type: 'initial', data: events[] } or { type: 'event', data: event }
          if (message.type === 'initial' && message.data) {
            events.value = (message.data as HookEvent[]).slice(-MAX_EVENTS);
          } else if (message.type === 'event' && message.data) {
            events.value = [message.data as HookEvent, ...events.value].slice(0, MAX_EVENTS);
          }
        } catch (err) {
          console.error('[Observability] Parse error:', err);
        }
      };

      ws.onclose = () => {
        isConnected.value = false;
        isConnecting.value = false;
        scheduleReconnect();
      };

      ws.onerror = () => {
        error.value = 'Connection failed';
        isConnected.value = false;
        isConnecting.value = false;
      };
    } catch (err) {
      error.value = 'Failed to connect';
      isConnecting.value = false;
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    isConnected.value = false;
    isConnecting.value = false;
  }

  function scheduleReconnect() {
    if (reconnectTimeout) return;
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, RECONNECT_INTERVAL);
  }

  function getEventTypeColor(type: string): string {
    switch (type) {
      case 'SessionStart': return 'text-green-400';
      case 'SessionEnd': return 'text-red-400';
      case 'UserPromptSubmit': return 'text-blue-400';
      case 'PreToolUse': return 'text-yellow-400';
      case 'PostToolUse': return 'text-yellow-300';
      case 'SubagentStop': return 'text-purple-400';
      case 'Stop': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  }

  function getEventTypeIcon(type: string): string {
    switch (type) {
      case 'SessionStart': return 'play';
      case 'SessionEnd': return 'stop';
      case 'UserPromptSubmit': return 'chat';
      case 'PreToolUse': return 'tool';
      case 'PostToolUse': return 'check';
      case 'SubagentStop': return 'agent';
      case 'Stop': return 'flag';
      default: return 'dot';
    }
  }

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return 'just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    events,
    recentEvents,
    isConnected,
    isConnecting,
    error,
    stats,
    agentActivity,

    // Actions
    connect,
    disconnect,

    // Helpers
    getEventTypeColor,
    getEventTypeIcon,
    formatTimestamp,
    getRelativeTime,
  };
}
