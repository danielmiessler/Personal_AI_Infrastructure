<template>
  <div class="bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] px-3 py-4 mobile:py-2 shadow-lg">
    <div class="flex items-center justify-between mb-3 mobile:mb-2">
      <div class="flex items-center gap-3 mobile:gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <div
            class="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-[var(--theme-primary)]/10 to-[var(--theme-primary-light)]/10 rounded-lg border border-[var(--theme-primary)]/30 shadow-sm"
            :title="`${uniqueAgentCount} active agent${uniqueAgentCount !== 1 ? 's' : ''}`"
          >
            <Users :size="16" :stroke-width="2.5" class="text-[var(--theme-primary)]" />
            <span class="text-sm mobile:text-xs font-bold text-[var(--theme-primary)]">{{ uniqueAgentCount }}</span>
            <span class="text-xs mobile:text-[11px] text-[var(--theme-text-tertiary)] font-semibold mobile:hidden">agents</span>
          </div>
          <div
            class="flex items-center gap-1.5 px-2 py-1 bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-primary)] shadow-sm"
            :title="`Total events in the last ${timeRange === '1m' ? '1 minute' : timeRange === '3m' ? '3 minutes' : timeRange === '5m' ? '5 minutes' : '10 minutes'}`"
          >
            <Zap :size="16" :stroke-width="2.5" class="text-[var(--theme-text-primary)]" />
            <span class="text-sm mobile:text-xs font-bold text-[var(--theme-text-primary)]">{{ totalEventCount }}</span>
            <span class="text-xs mobile:text-[11px] text-[var(--theme-text-tertiary)] font-semibold mobile:hidden">events</span>
          </div>
          <div
            class="flex items-center gap-1.5 px-2 py-1 bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-primary)] shadow-sm"
            :title="`Total tool calls in the last ${timeRange === '1m' ? '1 minute' : timeRange === '3m' ? '3 minutes' : timeRange === '5m' ? '5 minutes' : '10 minutes'}`"
          >
            <Wrench :size="16" :stroke-width="2.5" class="text-[var(--theme-text-primary)]" />
            <span class="text-sm mobile:text-xs font-bold text-[var(--theme-text-primary)]">{{ toolCallCount }}</span>
            <span class="text-xs mobile:text-[11px] text-[var(--theme-text-tertiary)] font-semibold mobile:hidden">tools</span>
          </div>
          <div
            class="flex items-center gap-1.5 px-2 py-1 bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-primary)] shadow-sm"
            :title="`Average time between events in the last ${timeRange === '1m' ? '1 minute' : timeRange === '3m' ? '3 minutes' : timeRange === '5m' ? '5 minutes' : '10 minutes'}`"
          >
            <Clock :size="16" :stroke-width="2.5" class="text-[var(--theme-text-primary)]" />
            <span class="text-sm mobile:text-xs font-bold text-[var(--theme-text-primary)]">{{ formatGap(eventTimingMetrics.avgGap) }}</span>
            <span class="text-xs mobile:text-[11px] text-[var(--theme-text-tertiary)] font-semibold mobile:hidden">avg gap</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 mobile:gap-1">
        <!-- Connection Status + Event Count -->
        <div class="flex items-center gap-1.5 px-2 py-1 bg-[var(--theme-bg-tertiary)] rounded-lg border border-[var(--theme-border-primary)] shadow-sm">
          <span v-if="isConnected" class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span v-else class="relative flex h-2 w-2">
            <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span class="text-xs font-bold text-[var(--theme-text-primary)]">{{ totalEvents }}</span>
        </div>

        <!-- Action Buttons -->
        <button
          @click="$emit('clearEvents')"
          class="p-1.5 mobile:p-1 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] transition-all duration-200 border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] shadow-md hover:shadow-lg"
          title="Clear events"
        >
          <Trash2 :size="14" class="text-[var(--theme-text-primary)]" />
        </button>

        <button
          @click="$emit('toggleFilters')"
          class="p-1.5 mobile:p-1 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] transition-all duration-200 border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] shadow-md hover:shadow-lg"
          title="Toggle filters"
        >
          <BarChart3 :size="14" class="text-[var(--theme-text-primary)]" />
        </button>

        <button
          @click="$emit('openThemeManager')"
          class="p-1.5 mobile:p-1 rounded-lg bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] transition-all duration-200 border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] shadow-md hover:shadow-lg"
          title="Theme manager"
        >
          <Palette :size="14" class="text-[var(--theme-text-primary)]" />
        </button>

        <!-- Time Range Tabs -->
        <div class="flex gap-1 ml-2" role="tablist" aria-label="Time range selector">
          <button
            v-for="(range, index) in timeRanges"
            :key="range"
            @click="setTimeRange(range)"
            @keydown="handleTimeRangeKeyDown($event, index)"
            :class="[
              'px-2.5 py-1.5 mobile:px-2 mobile:py-1 text-xs font-bold rounded-lg transition-all duration-200 min-w-[28px] min-h-[28px] flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105 border',
              timeRange === range
                ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-light)] text-white border-[var(--theme-primary-dark)] drop-shadow-md'
                : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] border-[var(--theme-border-primary)] hover:bg-[var(--theme-bg-quaternary)] hover:border-[var(--theme-primary)]'
            ]"
            role="tab"
            :aria-selected="timeRange === range"
            :aria-label="`Show ${range === '1m' ? '1 minute' : range === '3m' ? '3 minutes' : range === '5m' ? '5 minutes' : '10 minutes'} of activity`"
            :tabindex="timeRange === range ? 0 : -1"
          >
            {{ range }}
          </button>
        </div>
      </div>
    </div>
    <div ref="chartContainer" class="relative">
      <canvas
        ref="canvas"
        class="w-full cursor-crosshair"
        :style="{ height: chartHeight + 'px' }"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
        role="img"
        :aria-label="chartAriaLabel"
      ></canvas>
      <div
        v-if="tooltip.visible"
        class="absolute bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)] text-white px-2 py-1.5 mobile:px-3 mobile:py-2 rounded-lg text-xs mobile:text-sm pointer-events-none z-10 shadow-lg border border-[var(--theme-primary-light)] font-bold drop-shadow-md"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        {{ tooltip.text }}
      </div>
      <div
        v-if="!hasData"
        class="absolute inset-0 flex items-center justify-center"
      >
        <p class="flex items-center gap-2 text-[var(--theme-text-tertiary)] mobile:text-sm text-base font-semibold">
          <Loader2 :size="16" :stroke-width="2.5" class="animate-spin" />
          Waiting for events...
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import type { HookEvent, TimeRange, ChartConfig } from '../types';
import { useChartData } from '../composables/useChartData';
import { createChartRenderer, type ChartDimensions } from '../utils/chartRenderer';
import { useEventEmojis } from '../composables/useEventEmojis';
import { useEventColors } from '../composables/useEventColors';
import { Trash2, BarChart3, Palette, Users, Zap, Wrench, Clock, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  events: HookEvent[];
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
  };
  isConnected: boolean;
  totalEvents: number;
}>();

const emit = defineEmits<{
  updateUniqueApps: [appNames: string[]];
  updateAllApps: [appNames: string[]];
  updateTimeRange: [timeRange: TimeRange];
  clearEvents: [];
  toggleFilters: [];
  openThemeManager: [];
}>();

const canvas = ref<HTMLCanvasElement>();
const chartContainer = ref<HTMLDivElement>();
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 600);
const chartHeight = computed(() => windowHeight.value <= 400 ? 210 : 140);

const timeRanges: TimeRange[] = ['1m', '3m', '5m', '10m'];

const {
  timeRange,
  dataPoints,
  addEvent,
  getChartData,
  setTimeRange,
  cleanup: cleanupChartData,
  clearData,
  uniqueAgentCount,
  uniqueAgentIdsInWindow,
  allUniqueAgentIds,
  toolCallCount,
  eventTimingMetrics
} = useChartData();

// Format gap time in ms to readable string (e.g., "125ms" or "1.2s")
const formatGap = (gapMs: number): string => {
  if (gapMs === 0) return '—';
  if (gapMs < 1000) {
    return `${Math.round(gapMs)}ms`;
  }
  return `${(gapMs / 1000).toFixed(1)}s`;
};

// Watch uniqueAgentIdsInWindow and emit updates (for active agents in time window)
watch(uniqueAgentIdsInWindow, (agentIds) => {
  emit('updateUniqueApps', agentIds);
}, { immediate: true });

// Watch allUniqueAgentIds and emit updates (for all agents ever seen)
watch(allUniqueAgentIds, (agentIds) => {
  emit('updateAllApps', agentIds);
}, { immediate: true });

// Watch timeRange and emit updates
watch(timeRange, (range) => {
  emit('updateTimeRange', range);
}, { immediate: true });

let renderer: ReturnType<typeof createChartRenderer> | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationFrame: number | null = null;
const processedEventIds = new Set<string>();

const { formatEventTypeLabel } = useEventEmojis();
const { getHexColorForSession } = useEventColors();

const hasData = computed(() => dataPoints.value.some(dp => dp.count > 0));

const totalEventCount = computed(() => {
  return dataPoints.value.reduce((sum, dp) => sum + dp.count, 0);
});

const chartAriaLabel = computed(() => {
  const rangeText = timeRange.value === '1m' ? '1 minute' : timeRange.value === '3m' ? '3 minutes' : timeRange.value === '5m' ? '5 minutes' : '10 minutes';
  return `Activity chart showing ${totalEventCount.value} events over the last ${rangeText}`;
});

const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  text: ''
});

const getThemeColor = (property: string): string => {
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue(`--theme-${property}`).trim();
  return color || '#3B82F6'; // fallback
};

const getActiveConfig = (): ChartConfig => {
  return {
    maxDataPoints: 60,
    animationDuration: 300,
    barWidth: 3,
    barGap: 1,
    colors: {
      primary: getThemeColor('primary'),
      glow: getThemeColor('primary-light'),
      axis: getThemeColor('border-primary'),
      text: getThemeColor('text-tertiary')
    }
  };
};

const getDimensions = (): ChartDimensions => {
  const width = chartContainer.value?.offsetWidth || 800;
  return {
    width,
    height: chartHeight.value,
    padding: {
      top: 15,
      right: 7,
      bottom: 35,
      left: 7
    }
  };
};

const render = () => {
  if (!renderer || !canvas.value) return;

  const data = getChartData();
  const maxValue = Math.max(...data.map(d => d.count), 1);
  
  renderer.clear();
  renderer.drawBackground();
  renderer.drawAxes();
  renderer.drawTimeLabels(timeRange.value);
  renderer.drawBars(data, maxValue, 1, formatEventTypeLabel, getHexColorForSession);
};

const animateNewEvent = (x: number, y: number) => {
  let radius = 0;
  let opacity = 0.8;
  
  const animate = () => {
    if (!renderer) return;
    
    render();
    renderer.drawPulseEffect(x, y, radius, opacity);
    
    radius += 2;
    opacity -= 0.02;
    
    if (opacity > 0) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      animationFrame = null;
    }
  };
  
  animate();
};

const handleWindowResize = () => {
  windowHeight.value = window.innerHeight;
};

const handleResize = () => {
  if (!renderer || !canvas.value) return;

  const dimensions = getDimensions();
  renderer.resize(dimensions);
  render();
};

const isEventFiltered = (event: HookEvent): boolean => {
  if (props.filters.sourceApp && event.source_app !== props.filters.sourceApp) {
    return false;
  }
  if (props.filters.sessionId && event.session_id !== props.filters.sessionId) {
    return false;
  }
  if (props.filters.eventType && event.hook_event_type !== props.filters.eventType) {
    return false;
  }
  return true;
};

const processNewEvents = () => {
  const currentEvents = props.events;
  const newEventsToProcess: HookEvent[] = [];
  
  // Find events that haven't been processed yet
  currentEvents.forEach(event => {
    const eventKey = `${event.id}-${event.timestamp}`;
    if (!processedEventIds.has(eventKey)) {
      processedEventIds.add(eventKey);
      newEventsToProcess.push(event);
    }
  });
  
  // Process new events
  newEventsToProcess.forEach(event => {
    if (event.hook_event_type !== 'refresh' && event.hook_event_type !== 'initial' && isEventFiltered(event)) {
      addEvent(event);
      
      // Trigger pulse animation for new event
      if (renderer && canvas.value) {
        const chartArea = getDimensions();
        const x = chartArea.width - chartArea.padding.right - 10;
        const y = chartArea.height / 2;
        animateNewEvent(x, y);
      }
    }
  });
  
  // Clean up old event IDs to prevent memory leak
  // Keep only IDs from current events
  const currentEventIds = new Set(currentEvents.map(e => `${e.id}-${e.timestamp}`));
  processedEventIds.forEach(id => {
    if (!currentEventIds.has(id)) {
      processedEventIds.delete(id);
    }
  });
  
  render();
};

// Watch for new events
watch(() => props.events, (newEvents) => {
  // If events array is empty, clear all internal state
  if (newEvents.length === 0) {
    clearData();
    processedEventIds.clear();
    render();
    return;
  }
  processNewEvents();
}, { deep: true });

// Watch for filter changes
watch(() => props.filters, () => {
  // Reset and reprocess all events with new filters
  dataPoints.value = [];
  processedEventIds.clear();
  processNewEvents();
}, { deep: true });

// Watch for time range changes
watch(timeRange, () => {
  // Need to re-process all events when time range changes
  // because bucket sizes are different
  render();
});

// Watch for chart height changes
watch(chartHeight, () => {
  handleResize();
});

const handleMouseMove = (event: MouseEvent) => {
  if (!canvas.value || !chartContainer.value) return;
  
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const data = getChartData();
  const dimensions = getDimensions();
  const chartArea = {
    x: dimensions.padding.left,
    y: dimensions.padding.top,
    width: dimensions.width - dimensions.padding.left - dimensions.padding.right,
    height: dimensions.height - dimensions.padding.top - dimensions.padding.bottom
  };
  
  const barWidth = chartArea.width / data.length;
  const barIndex = Math.floor((x - chartArea.x) / barWidth);
  
  if (barIndex >= 0 && barIndex < data.length && y >= chartArea.y && y <= chartArea.y + chartArea.height) {
    const point = data[barIndex];
    if (point.count > 0) {
      const eventTypesText = Object.entries(point.eventTypes || {})
        .map(([type, count]) => `${type}: ${count}`)
        .join(', ');
      
      tooltip.value = {
        visible: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top - 30,
        text: `${point.count} events${eventTypesText ? ` (${eventTypesText})` : ''}`
      };
      return;
    }
  }
  
  tooltip.value.visible = false;
};

const handleMouseLeave = () => {
  tooltip.value.visible = false;
};

const handleTimeRangeKeyDown = (event: KeyboardEvent, currentIndex: number) => {
  let newIndex = currentIndex;
  
  switch (event.key) {
    case 'ArrowLeft':
      newIndex = Math.max(0, currentIndex - 1);
      break;
    case 'ArrowRight':
      newIndex = Math.min(timeRanges.length - 1, currentIndex + 1);
      break;
    case 'Home':
      newIndex = 0;
      break;
    case 'End':
      newIndex = timeRanges.length - 1;
      break;
    default:
      return;
  }
  
  if (newIndex !== currentIndex) {
    event.preventDefault();
    setTimeRange(timeRanges[newIndex]);
    // Focus the new button
    const buttons = (event.currentTarget as HTMLElement)?.parentElement?.querySelectorAll('button');
    if (buttons && buttons[newIndex]) {
      (buttons[newIndex] as HTMLButtonElement).focus();
    }
  }
};

// Watch for theme changes
const themeObserver = new MutationObserver(() => {
  if (renderer) {
    render();
  }
});

onMounted(() => {
  if (!canvas.value || !chartContainer.value) return;

  const dimensions = getDimensions();
  const config = getActiveConfig();

  renderer = createChartRenderer(canvas.value, dimensions, config);

  // Set up resize observer
  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(chartContainer.value);

  // Observe theme changes
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  // Listen for window height changes
  window.addEventListener('resize', handleWindowResize);
  
  // Initial render
  render();
  
  // Start optimized render loop with FPS limiting
  let lastRenderTime = 0;
  const targetFPS = 30;
  const frameInterval = 1000 / targetFPS;
  
  const renderLoop = (currentTime: number) => {
    const deltaTime = currentTime - lastRenderTime;
    
    if (deltaTime >= frameInterval) {
      render();
      lastRenderTime = currentTime - (deltaTime % frameInterval);
    }
    
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);
});

onUnmounted(() => {
  cleanupChartData();

  if (renderer) {
    renderer.stopAnimation();
  }

  if (resizeObserver && chartContainer.value) {
    resizeObserver.disconnect();
  }

  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }

  themeObserver.disconnect();

  // Remove window resize listener
  window.removeEventListener('resize', handleWindowResize);
});
</script>