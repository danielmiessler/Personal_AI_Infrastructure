<template>
  <div class="flex-1 mobile:h-[50vh] overflow-hidden flex flex-col">
    <!-- Fixed Header -->
    <div class="px-3 py-4 mobile:py-2 bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] relative z-10" style="box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.3), 0 8px 25px -5px rgba(0, 0, 0, 0.2);">
      <!-- Agent/App Tags Row - Smart Grid Layout -->
      <div v-if="displayedAgentIds.length > 0" class="grid grid-cols-[repeat(auto-fit,minmax(180px,auto))] mobile:grid-cols-[repeat(auto-fit,minmax(140px,auto))] gap-2 mobile:gap-1.5 auto-rows-auto mb-4 mobile:mb-3">
        <button
          v-for="agentId in displayedAgentIds"
          :key="agentId"
          @click="emit('selectAgent', agentId)"
          :class="[
            'text-sm mobile:text-xs font-bold px-2.5 mobile:px-2 py-1 mobile:py-0.5 rounded-full border-2 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer flex items-center gap-1.5 justify-start',
            isAgentActive(agentId)
              ? 'text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)]'
              : 'text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] opacity-60 hover:opacity-80'
          ]"
          :style="{
            borderColor: getHexColorForApp(getAppNameFromAgentId(agentId)),
            backgroundColor: getHexColorForApp(getAppNameFromAgentId(agentId)) + (isAgentActive(agentId) ? '33' : '1a')
          }"
          :title="`${isAgentActive(agentId) ? 'Active: Click to add' : 'Sleeping: No recent events. Click to add'} ${agentId} to comparison lanes`"
        >
          <Sparkles v-if="isAgentActive(agentId)" :size="14" class="flex-shrink-0" />
          <Moon v-else :size="14" class="flex-shrink-0" />
          <span class="font-mono text-xs truncate">{{ agentId }}</span>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="mt-3 mobile:mt-2 w-full">
        <div class="flex items-center gap-2 mobile:gap-1">
          <div class="relative flex-1">
            <input
              type="text"
              :value="searchPattern"
              @input="updateSearchPattern(($event.target as HTMLInputElement).value)"
              placeholder="Search events (regex enabled)... e.g., 'tool.*error' or '^GET'"
              :class="[
                'w-full px-3 mobile:px-2 py-2 mobile:py-1.5 rounded-lg text-sm mobile:text-xs font-mono border-2 transition-all duration-200 leading-relaxed',
                'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-secondary)]',
                'border-[var(--theme-border-primary)] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20',
                searchError ? 'border-[var(--theme-accent-error)]' : ''
              ]"
              aria-label="Search events with regex pattern"
            />
            <button
              v-if="searchPattern"
              @click="clearSearch"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] transition-colors duration-200"
              title="Clear search"
              aria-label="Clear search"
            >
              <X :size="18" />
            </button>
          </div>
        </div>
        <div
          v-if="searchError"
          class="mt-1.5 mobile:mt-1 px-2.5 py-1.5 mobile:py-1 bg-[var(--theme-accent-error)]/10 border border-[var(--theme-accent-error)] rounded-lg text-xs mobile:text-[11px] text-[var(--theme-accent-error)] font-semibold"
          role="alert"
        >
          <span class="inline-block mr-1">⚠️</span> {{ searchError }}
        </div>
      </div>
    </div>
    
    <!-- Scrollable Event List -->
    <div 
      ref="scrollContainer"
      class="flex-1 overflow-y-auto px-3 py-3 mobile:px-2 mobile:py-1.5 relative"
      @scroll="handleScroll"
    >
      <TransitionGroup
        name="event"
        tag="div"
        class="space-y-3 mobile:space-y-2"
      >
        <EventRow
          v-for="event in filteredEvents"
          :key="`${event.id}-${event.timestamp}`"
          :event="event"
          :gradient-class="getGradientForSession(event.session_id)"
          :color-class="getColorForSession(event.session_id)"
          :app-gradient-class="getGradientForApp(event.source_app)"
          :app-color-class="getColorForApp(event.source_app)"
          :app-hex-color="getHexColorForApp(event.source_app)"
        />
      </TransitionGroup>
      
      <div v-if="filteredEvents.length === 0" class="text-center py-8 mobile:py-6 text-[var(--theme-text-tertiary)]">
        <Box :size="48" class="mx-auto mb-3 text-[var(--theme-text-quaternary)]" />
        <p class="text-lg mobile:text-base font-semibold text-[var(--theme-primary)] mb-1.5">No events to display</p>
        <p class="text-base mobile:text-sm">Events will appear here as they are received</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { HookEvent } from '../types';
import { Sparkles, Moon, Box, X } from 'lucide-vue-next';
import EventRow from './EventRow.vue';
import { useEventColors } from '../composables/useEventColors';
import { useEventSearch } from '../composables/useEventSearch';

const props = defineProps<{
  events: HookEvent[];
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
  };
  stickToBottom: boolean;
  uniqueAppNames?: string[]; // Agent IDs (app:session) active in current time window
  allAppNames?: string[]; // All agent IDs (app:session) ever seen in session
}>();

const emit = defineEmits<{
  'update:stickToBottom': [value: boolean];
  selectAgent: [agentName: string];
}>();

const scrollContainer = ref<HTMLElement>();
const { getGradientForSession, getColorForSession, getGradientForApp, getColorForApp, getHexColorForApp } = useEventColors();
const { searchPattern, searchError, searchEvents, updateSearchPattern, clearSearch } = useEventSearch();

// Use all agent IDs, preferring allAppNames if available (all ever seen), fallback to uniqueAppNames (active in time window)
const displayedAgentIds = computed(() => {
  return props.allAppNames?.length ? props.allAppNames : (props.uniqueAppNames || []);
});

// Extract app name from agent ID (format: "app:session")
const getAppNameFromAgentId = (agentId: string): string => {
  return agentId.split(':')[0];
};

// Check if an agent is currently active (has events in the current time window)
const isAgentActive = (agentId: string): boolean => {
  return (props.uniqueAppNames || []).includes(agentId);
};

const filteredEvents = computed(() => {
  let filtered = props.events.filter(event => {
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
  });

  // Apply regex search filter
  if (searchPattern.value) {
    filtered = searchEvents(filtered, searchPattern.value);
  }

  // Reverse array so newest events appear at top
  return filtered.slice().reverse();
});

const scrollToTop = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0;
  }
};

const handleScroll = () => {
  if (!scrollContainer.value) return;

  const { scrollTop } = scrollContainer.value;
  const isAtTop = scrollTop < 50;

  if (isAtTop !== props.stickToBottom) {
    emit('update:stickToBottom', isAtTop);
  }
};

watch(() => props.events.length, async () => {
  if (props.stickToBottom) {
    await nextTick();
    scrollToTop();
  }
});

watch(() => props.stickToBottom, (shouldStick) => {
  if (shouldStick) {
    scrollToTop();
  }
});
</script>

<style scoped>
.event-enter-active {
  transition: all 0.3s ease;
}

.event-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.event-leave-active {
  transition: all 0.3s ease;
}

.event-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>