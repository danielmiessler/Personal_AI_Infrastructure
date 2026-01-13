<script setup lang="ts">
import { computed, ref } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import type { NoteDetail } from '@/types/knowledge';

const props = defineProps<{
  note: NoteDetail;
  canGoBack: boolean;
}>();

const emit = defineEmits<{
  back: [];
  navigate: [path: string];
  resolveLink: [link: string];
}>();

const showBacklinks = ref(false);

// Configure markdown-it with syntax highlighting
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch {}
    }
    return '';
  },
});

// Custom renderer for wiki-links
md.renderer.rules.text = (tokens, idx) => {
  const content = tokens[idx].content;

  // Replace [[wiki-links]] with clickable spans
  const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
  const replaced = content.replace(wikiLinkPattern, (_, linkContent) => {
    let display = linkContent;
    let target = linkContent;

    // Handle alias: [[target|alias]]
    const pipeIndex = linkContent.indexOf('|');
    if (pipeIndex !== -1) {
      target = linkContent.slice(0, pipeIndex);
      display = linkContent.slice(pipeIndex + 1);
    }

    // Handle heading: [[target#heading]]
    const hashIndex = target.indexOf('#');
    if (hashIndex !== -1) {
      if (pipeIndex === -1) {
        display = target; // Show full link if no alias
      }
    }

    return `<a href="#" class="wiki-link" data-link="${target.trim()}">${display}</a>`;
  });

  return replaced;
};

const renderedContent = computed(() => {
  return md.render(props.note.content);
});

const noteName = computed(() => {
  const parts = props.note.path.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace('.md', '');
});

const handleClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;

  // Handle wiki-link clicks
  if (target.classList.contains('wiki-link')) {
    e.preventDefault();
    const link = target.getAttribute('data-link');
    if (link) {
      emit('resolveLink', link);
    }
  }

  // Handle regular links (external)
  if (target.tagName === 'A' && !target.classList.contains('wiki-link')) {
    const href = target.getAttribute('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      e.preventDefault();
      window.open(href, '_blank');
    }
  }
};
</script>

<template>
  <div class="h-full flex flex-col bg-gray-900">
    <!-- Header -->
    <div class="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
      <button
        @click="emit('back')"
        class="p-1.5 rounded hover:bg-gray-700 touch-feedback"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 class="font-medium truncate flex-1">{{ noteName }}</h2>

      <!-- Backlinks toggle -->
      <button
        v-if="note.backlinks.length > 0"
        @click="showBacklinks = !showBacklinks"
        class="flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-gray-700 touch-feedback"
        :class="{ 'bg-primary-600/20 text-primary-400': showBacklinks }"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span>{{ note.backlinks.length }}</span>
      </button>
    </div>

    <!-- Backlinks panel -->
    <div
      v-if="showBacklinks && note.backlinks.length > 0"
      class="flex-shrink-0 bg-gray-800/50 border-b border-gray-700 max-h-48 overflow-y-auto"
    >
      <div class="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">Backlinks</div>
      <div
        v-for="backlink in note.backlinks"
        :key="backlink.path"
        @click="emit('navigate', backlink.path)"
        class="px-4 py-2 hover:bg-gray-700/50 cursor-pointer touch-feedback"
      >
        <div class="font-medium text-primary-400">{{ backlink.name }}</div>
        <div v-if="backlink.context" class="text-sm text-gray-500 truncate mt-0.5">
          {{ backlink.context }}
        </div>
      </div>
    </div>

    <!-- Frontmatter -->
    <div
      v-if="Object.keys(note.frontmatter).length > 0"
      class="flex-shrink-0 px-4 py-2 bg-gray-800/30 border-b border-gray-700 text-sm"
    >
      <div
        v-for="(value, key) in note.frontmatter"
        :key="key"
        class="flex gap-2"
      >
        <span class="text-gray-500">{{ key }}:</span>
        <span class="text-gray-300">{{ value }}</span>
      </div>
    </div>

    <!-- Content -->
    <div
      class="flex-1 overflow-y-auto px-4 py-4 prose prose-invert prose-sm max-w-none"
      @click="handleClick"
      v-html="renderedContent"
    ></div>
  </div>
</template>

<style>
/* Wiki-link styling */
.wiki-link {
  color: #60a5fa;
  text-decoration: none;
  background: rgba(96, 165, 250, 0.1);
  padding: 0 0.25rem;
  border-radius: 0.25rem;
}

.wiki-link:hover {
  background: rgba(96, 165, 250, 0.2);
  text-decoration: underline;
}

/* Code block styling */
.prose pre {
  background: #1f2937;
  border-radius: 0.5rem;
  overflow-x: auto;
}

.prose code {
  background: #374151;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.prose pre code {
  background: transparent;
  padding: 0;
}

/* Heading styling */
.prose h1, .prose h2, .prose h3 {
  color: #f3f4f6;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.prose h1 { font-size: 1.5em; }
.prose h2 { font-size: 1.25em; }
.prose h3 { font-size: 1.1em; }

/* List styling */
.prose ul, .prose ol {
  padding-left: 1.5em;
}

.prose li {
  margin: 0.25em 0;
}

/* Blockquote */
.prose blockquote {
  border-left: 3px solid #4b5563;
  padding-left: 1em;
  color: #9ca3af;
  font-style: italic;
}

/* Table styling */
.prose table {
  width: 100%;
  border-collapse: collapse;
}

.prose th, .prose td {
  border: 1px solid #374151;
  padding: 0.5em;
}

.prose th {
  background: #1f2937;
}

/* Checkbox styling for task lists */
.prose input[type="checkbox"] {
  margin-right: 0.5em;
}
</style>
