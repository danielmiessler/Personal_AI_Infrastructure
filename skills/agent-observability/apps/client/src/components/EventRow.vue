<template>
  <div>
    <!-- HITL Question Section (NEW) -->
    <div
      v-if="event.humanInTheLoop && (event.humanInTheLoopStatus?.status === 'pending' || hasSubmittedResponse)"
      class="mb-4 p-4 rounded-lg border-2 shadow-lg"
      :class="hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded' ? 'border-green-500 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20' : 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 animate-pulse-slow'"
      @click.stop
    >
      <!-- Question Header -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <component :is="hitlTypeIcon" :size="24" :stroke-width="2.5" :class="hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'" />
            <h3 class="text-lg font-bold" :class="hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded' ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100'">
              {{ hitlTypeLabel }}
            </h3>
            <span v-if="permissionType" class="text-xs font-mono font-semibold px-2 py-1 rounded border-2 bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-900 dark:text-blue-100">
              {{ permissionType }}
            </span>
          </div>
          <span v-if="!hasSubmittedResponse && event.humanInTheLoopStatus?.status !== 'responded'" class="flex items-center gap-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
            <Clock :size="14" :stroke-width="2.5" />
            Waiting for response...
          </span>
        </div>
        <div class="flex items-center space-x-2 ml-9">
          <div
            class="text-xs font-bold px-2 py-0.5 rounded-full border-2 shadow-lg flex items-center gap-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)]"
            :style="{
              borderColor: appHexColor,
              backgroundColor: appHexColor + '33'
            }"
          >
            <span class="font-mono text-xs">{{ agentId }}</span>
          </div>
          <span class="text-xs text-[var(--theme-text-tertiary)] font-medium">
            {{ formatTime(event.timestamp) }}
          </span>
        </div>
      </div>

      <!-- Question Text -->
      <div class="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border" :class="hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded' ? 'border-green-300' : 'border-yellow-300'">
        <p class="text-base font-medium text-gray-900 dark:text-gray-100">
          {{ event.humanInTheLoop.question }}
        </p>
      </div>

      <!-- Inline Response Display (Optimistic UI) -->
      <div v-if="localResponse || (event.humanInTheLoopStatus?.status === 'responded' && event.humanInTheLoopStatus.response)" class="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-400">
        <div class="flex items-center gap-2 mb-2">
          <CheckCircle :size="18" :stroke-width="2.5" class="text-green-600" />
          <strong class="text-green-900 dark:text-green-100">Your Response:</strong>
        </div>
        <div v-if="(localResponse?.response || event.humanInTheLoopStatus?.response?.response)" class="text-gray-900 dark:text-gray-100 ml-7">
          {{ localResponse?.response || event.humanInTheLoopStatus?.response?.response }}
        </div>
        <div v-if="(localResponse?.permission !== undefined || event.humanInTheLoopStatus?.response?.permission !== undefined)" class="flex items-center gap-1.5 text-gray-900 dark:text-gray-100 ml-7">
          <component :is="(localResponse?.permission ?? event.humanInTheLoopStatus?.response?.permission) ? CheckCircle : X" :size="16" :stroke-width="2.5" :class="(localResponse?.permission ?? event.humanInTheLoopStatus?.response?.permission) ? 'text-green-600' : 'text-red-600'" />
          {{ (localResponse?.permission ?? event.humanInTheLoopStatus?.response?.permission) ? 'Approved' : 'Denied' }}
        </div>
        <div v-if="(localResponse?.choice || event.humanInTheLoopStatus?.response?.choice)" class="text-gray-900 dark:text-gray-100 ml-7">
          {{ localResponse?.choice || event.humanInTheLoopStatus?.response?.choice }}
        </div>
      </div>

      <!-- Response UI -->
      <div v-if="event.humanInTheLoop.type === 'question'">
        <!-- Text Input for Questions -->
        <textarea
          v-model="responseText"
          class="w-full p-3 border-2 border-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
          rows="3"
          placeholder="Type your response here..."
          @click.stop
        ></textarea>
        <div class="flex justify-end space-x-2 mt-2">
          <button
            @click.stop="submitResponse"
            :disabled="!responseText.trim() || isSubmitting || hasSubmittedResponse"
            class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
          >
            <component :is="isSubmitting ? Loader2 : CheckCircle" :size="16" :stroke-width="2.5" :class="isSubmitting ? 'animate-spin' : ''" />
            {{ isSubmitting ? 'Sending...' : 'Submit Response' }}
          </button>
        </div>
      </div>

      <div v-else-if="event.humanInTheLoop.type === 'permission'">
        <!-- Yes/No Buttons for Permissions -->
        <div class="flex justify-end items-center space-x-3">
          <div v-if="hasSubmittedResponse || event.humanInTheLoopStatus?.status === 'responded'" class="flex items-center px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-500">
            <span class="text-sm font-bold text-green-900 dark:text-green-100">Responded</span>
          </div>
          <button
            @click.stop="submitPermission(false)"
            :disabled="isSubmitting || hasSubmittedResponse"
            class="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            :class="hasSubmittedResponse ? 'opacity-40 cursor-not-allowed' : ''"
          >
            <component :is="isSubmitting ? Loader2 : X" :size="16" :stroke-width="2.5" :class="isSubmitting ? 'animate-spin' : ''" />
            Deny
          </button>
          <button
            @click.stop="submitPermission(true)"
            :disabled="isSubmitting || hasSubmittedResponse"
            class="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            :class="hasSubmittedResponse ? 'opacity-40 cursor-not-allowed' : ''"
          >
            <component :is="isSubmitting ? Loader2 : CheckCircle" :size="16" :stroke-width="2.5" :class="isSubmitting ? 'animate-spin' : ''" />
            Approve
          </button>
        </div>
      </div>

      <div v-else-if="event.humanInTheLoop.type === 'choice'">
        <!-- Multiple Choice Buttons -->
        <div class="flex flex-wrap gap-2 justify-end">
          <button
            v-for="choice in event.humanInTheLoop.choices"
            :key="choice"
            @click.stop="submitChoice(choice)"
            :disabled="isSubmitting || hasSubmittedResponse"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
          >
            <Loader2 v-if="isSubmitting" :size="16" :stroke-width="2.5" class="animate-spin" />
            {{ choice }}
          </button>
        </div>
      </div>
    </div>

    <!-- Original Event Row Content (skip if HITL with humanInTheLoop) -->
    <div
      v-if="!event.humanInTheLoop"
      class="group relative p-2 mobile:p-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-[var(--theme-border-primary)] hover:border-[var(--theme-primary)] bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)]"
      :class="{ 'ring-2 ring-[var(--theme-primary)] border-[var(--theme-primary)] shadow-xl': isExpanded }"
      @click="toggleExpanded"
    >
    <div class="ml-2">
      <!-- Single Row Layout - All Platforms -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 flex-1">
          <div
            class="text-xs font-bold px-2 py-1 rounded-full border-2 flex items-center gap-1 text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)]"
            :style="{
              borderColor: appHexColor,
              backgroundColor: appHexColor + '33'
            }"
          >
            <span class="font-mono text-xs">{{ agentId }}</span>
          </div>
          <span
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border"
            :style="{
              backgroundColor: eventTypeColor + '15',
              borderColor: eventTypeColor + '80',
              color: 'var(--theme-text-primary)'
            }"
          >
            <component :is="hookIcon" :size="14" :stroke-width="2.5" :style="{ color: eventTypeColor }" />
            {{ event.hook_event_type }}
          </span>
          <span v-if="event.model_name" class="inline-flex items-center gap-1.5 text-xs text-[var(--theme-text-secondary)] px-2 py-1 rounded-full border-2 bg-[var(--theme-bg-tertiary)]/50" :title="`Model: ${event.model_name}`">
            <Brain :size="12" :stroke-width="2.5" />
            {{ formatModelName(event.model_name) }}
          </span>

          <!-- Tool info - Inline on same row -->
          <span v-if="toolInfo" class="text-xs text-[var(--theme-text-secondary)] font-medium">
            <span
              class="font-medium px-2 py-1 rounded border"
              :style="{
                backgroundColor: toolTypeColor + '08',
                borderColor: toolTypeColor + '40',
                color: 'var(--theme-text-primary)'
              }"
            >{{ toolInfo.tool }}</span>
            <span v-if="toolInfo.detail" class="ml-1 text-[var(--theme-text-secondary)]" :class="{ 'italic': event.hook_event_type === 'UserPromptSubmit' }">{{ toolInfo.detail }}</span>
          </span>

          <!-- Summary - Inline on same row -->
          <span v-if="event.summary" class="inline-flex items-center gap-1.5 text-xs text-[var(--theme-text-primary)] font-medium px-2 py-1 bg-[var(--theme-primary)]/10 border-2 border-[var(--theme-primary)]/30 rounded">
            <FileText :size="12" :stroke-width="2.5" style="color: var(--theme-primary)" />
            {{ event.summary }}
          </span>
        </div>
        <span class="text-xs text-[var(--theme-text-secondary)] font-semibold whitespace-nowrap">
          {{ formatTime(event.timestamp) }}
        </span>
      </div>
      
      <!-- Expanded content -->
      <div v-if="isExpanded" class="mt-2 pt-2 border-t-2 border-[var(--theme-primary)] bg-gradient-to-r from-[var(--theme-bg-primary)] to-[var(--theme-bg-secondary)] rounded-b-lg p-3 space-y-3">
        <!-- Payload -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-base mobile:text-sm font-bold text-[var(--theme-primary)] drop-shadow-sm flex items-center gap-1.5">
              <Package :size="18" :stroke-width="2.5" />
              Payload
            </h4>
            <button
              @click.stop="copyPayload"
              class="px-3 py-1 mobile:px-2 mobile:py-0.5 text-sm mobile:text-xs font-bold rounded-lg bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-white transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-1.5"
            >
              <Copy :size="14" :stroke-width="2.5" />
              <span>{{ copyButtonText }}</span>
            </button>
          </div>
          <pre class="text-sm mobile:text-xs text-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] p-3 mobile:p-2 rounded-lg overflow-x-auto max-h-64 overflow-y-auto font-mono border border-[var(--theme-primary)]/30 shadow-md hover:shadow-lg transition-shadow duration-200">{{ formattedPayload }}</pre>
        </div>
        
        <!-- Chat transcript button -->
        <div v-if="event.chat && event.chat.length > 0" class="flex justify-end">
          <button
            @click.stop="!isMobile && (showChatModal = true)"
            :class="[
              'px-4 py-2 mobile:px-3 mobile:py-1.5 font-bold rounded-lg transition-all duration-200 flex items-center space-x-1.5 shadow-md hover:shadow-lg',
              isMobile 
                ? 'bg-[var(--theme-bg-quaternary)] cursor-not-allowed opacity-50 text-[var(--theme-text-quaternary)] border border-[var(--theme-border-tertiary)]' 
                : 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-light)] hover:from-[var(--theme-primary-dark)] hover:to-[var(--theme-primary)] text-white border border-[var(--theme-primary-dark)] transform hover:scale-105'
            ]"
            :disabled="isMobile"
          >
            <MessageSquare :size="16" :stroke-width="2.5" />
            <span class="text-sm mobile:text-xs font-bold drop-shadow-sm">
              {{ isMobile ? 'Not available in mobile' : `View Chat Transcript (${event.chat.length} messages)` }}
            </span>
          </button>
        </div>
      </div>
    </div>
    </div>
    <!-- Chat Modal -->
    <ChatTranscriptModal
      v-if="event.chat && event.chat.length > 0"
      :is-open="showChatModal"
      :chat="event.chat"
      @close="showChatModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookEvent, HumanInTheLoopResponse } from '../types';
import { useMediaQuery } from '../composables/useMediaQuery';
import { useEventColors } from '../composables/useEventColors';
import {
  Wrench,
  CheckCircle,
  Bell,
  StopCircle,
  Users,
  Package,
  MessageSquare,
  Rocket,
  Flag,
  Brain,
  FileText,
  Copy,
  HelpCircle,
  Lock,
  Target,
  Clock,
  Loader2,
  X,
  UserCheck,
  type LucideIcon
} from 'lucide-vue-next';
import ChatTranscriptModal from './ChatTranscriptModal.vue';

const props = defineProps<{
  event: HookEvent;
  gradientClass: string;
  colorClass: string;
  appGradientClass: string;
  appColorClass: string;
  appHexColor: string;
}>();

// Get color functions
const { getEventTypeColor, getToolTypeColor } = useEventColors();

const emit = defineEmits<{
  (e: 'response-submitted', response: HumanInTheLoopResponse): void;
}>();

// Existing refs
const isExpanded = ref(false);
const showChatModal = ref(false);
const copyButtonText = ref('Copy');

// New refs for HITL
const responseText = ref('');
const isSubmitting = ref(false);
const hasSubmittedResponse = ref(false);
const localResponse = ref<HumanInTheLoopResponse | null>(null); // Optimistic UI

// Media query for responsive design
const { isMobile } = useMediaQuery();

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const sessionIdShort = computed(() => {
  return props.event.session_id.slice(0, 8);
});

const agentId = computed(() => {
  return `${props.event.source_app}:${sessionIdShort.value}`;
});

const hookIcon = computed<LucideIcon>(() => {
  const iconMap: Record<string, LucideIcon> = {
    'PreToolUse': Wrench,
    'PostToolUse': CheckCircle,
    'Notification': Bell,
    'Stop': StopCircle,
    'SubagentStop': UserCheck,
    'PreCompact': Package,
    'UserPromptSubmit': MessageSquare,
    'SessionStart': Rocket,
    'SessionEnd': Flag
  };
  return iconMap[props.event.hook_event_type] || MessageSquare;
});

// Color for the event type badge
const eventTypeColor = computed(() => {
  return getEventTypeColor(props.event.hook_event_type);
});

// Color for the tool name badge
const toolTypeColor = computed(() => {
  if (toolInfo.value?.tool) {
    return getToolTypeColor(toolInfo.value.tool);
  }
  return '#7aa2f7'; // Default Tokyo Night blue
});

const formattedPayload = computed(() => {
  return JSON.stringify(props.event.payload, null, 2);
});

const toolInfo = computed(() => {
  const payload = props.event.payload;
  
  // Handle UserPromptSubmit events
  if (props.event.hook_event_type === 'UserPromptSubmit' && payload.prompt) {
    return {
      tool: 'Prompt:',
      detail: `"${payload.prompt.slice(0, 100)}${payload.prompt.length > 100 ? '...' : ''}"`
    };
  }
  
  // Handle PreCompact events
  if (props.event.hook_event_type === 'PreCompact') {
    const trigger = payload.trigger || 'unknown';
    return {
      tool: 'Compaction:',
      detail: trigger === 'manual' ? 'Manual compaction' : 'Auto-compaction (full context)'
    };
  }
  
  // Handle SessionStart events
  if (props.event.hook_event_type === 'SessionStart') {
    const source = payload.source || 'unknown';
    const sourceLabels: Record<string, string> = {
      'startup': 'New session',
      'resume': 'Resuming session',
      'clear': 'Fresh session'
    };
    return {
      tool: 'Session:',
      detail: sourceLabels[source] || source
    };
  }
  
  // Handle tool-based events
  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: payload.tool_name };
    
    if (payload.tool_input) {
      if (payload.tool_input.command) {
        info.detail = payload.tool_input.command.slice(0, 50) + (payload.tool_input.command.length > 50 ? '...' : '');
      } else if (payload.tool_input.file_path) {
        info.detail = payload.tool_input.file_path.split('/').pop();
      } else if (payload.tool_input.pattern) {
        info.detail = payload.tool_input.pattern;
      }
    }
    
    return info;
  }
  
  return null;
});

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// Format model name for display (e.g., "claude-haiku-4-5-20251001" -> "haiku-4-5")
const formatModelName = (name: string | null | undefined): string => {
  if (!name) return '';

  // Extract model family and version
  // "claude-haiku-4-5-20251001" -> "haiku-4-5"
  // "claude-sonnet-4-5-20250929" -> "sonnet-4-5"
  const parts = name.split('-');
  if (parts.length >= 4) {
    return `${parts[1]}-${parts[2]}-${parts[3]}`;
  }
  return name;
};

const copyPayload = async () => {
  try {
    await navigator.clipboard.writeText(formattedPayload.value);
    copyButtonText.value = 'Copied!';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    copyButtonText.value = 'Failed';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  }
};

// New computed properties for HITL
const hitlTypeIcon = computed<LucideIcon>(() => {
  if (!props.event.humanInTheLoop) return HelpCircle;
  const iconMap: Record<string, LucideIcon> = {
    question: HelpCircle,
    permission: Lock,
    choice: Target
  };
  return iconMap[props.event.humanInTheLoop.type] || HelpCircle;
});

const hitlTypeLabel = computed(() => {
  if (!props.event.humanInTheLoop) return '';
  const labelMap = {
    question: 'Agent Question',
    permission: 'Permission Request',
    choice: 'Choice Required'
  };
  return labelMap[props.event.humanInTheLoop.type] || 'Question';
});

const permissionType = computed(() => {
  return props.event.payload?.permission_type || null;
});

// Methods for HITL responses
const submitResponse = async () => {
  if (!responseText.value.trim() || !props.event.id) return;

  const response: HumanInTheLoopResponse = {
    response: responseText.value.trim(),
    hookEvent: props.event,
    respondedAt: Date.now()
  };

  // Optimistic UI: Show response immediately
  localResponse.value = response;
  hasSubmittedResponse.value = true;
  const savedText = responseText.value;
  responseText.value = '';
  isSubmitting.value = true;

  try {
    const res = await fetch(`http://localhost:4000/events/${props.event.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    });

    if (!res.ok) throw new Error('Failed to submit response');

    emit('response-submitted', response);
  } catch (error) {
    console.error('Error submitting response:', error);
    // Rollback optimistic update
    localResponse.value = null;
    hasSubmittedResponse.value = false;
    responseText.value = savedText;
    alert('Failed to submit response. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};

const submitPermission = async (approved: boolean) => {
  if (!props.event.id) return;

  const response: HumanInTheLoopResponse = {
    permission: approved,
    hookEvent: props.event,
    respondedAt: Date.now()
  };

  // Optimistic UI: Show response immediately
  localResponse.value = response;
  hasSubmittedResponse.value = true;
  isSubmitting.value = true;

  try {
    const res = await fetch(`http://localhost:4000/events/${props.event.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    });

    if (!res.ok) throw new Error('Failed to submit permission');

    emit('response-submitted', response);
  } catch (error) {
    console.error('Error submitting permission:', error);
    // Rollback optimistic update
    localResponse.value = null;
    hasSubmittedResponse.value = false;
    alert('Failed to submit permission. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};

const submitChoice = async (choice: string) => {
  if (!props.event.id) return;

  const response: HumanInTheLoopResponse = {
    choice,
    hookEvent: props.event,
    respondedAt: Date.now()
  };

  // Optimistic UI: Show response immediately
  localResponse.value = response;
  hasSubmittedResponse.value = true;
  isSubmitting.value = true;

  try {
    const res = await fetch(`http://localhost:4000/events/${props.event.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    });

    if (!res.ok) throw new Error('Failed to submit choice');

    emit('response-submitted', response);
  } catch (error) {
    console.error('Error submitting choice:', error);
    // Rollback optimistic update
    localResponse.value = null;
    hasSubmittedResponse.value = false;
    alert('Failed to submit choice. Please try again.');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.95;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>