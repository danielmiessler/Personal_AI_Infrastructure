import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/main.css';

// Route components
import ChatView from './components/chat/ChatView.vue';
import FilesView from './components/files/FilesView.vue';
import KnowledgeView from './components/knowledge/KnowledgeView.vue';
import TodoView from './components/todo/TodoView.vue';
import ObservabilityView from './components/observability/ObservabilityView.vue';
import TerminalView from './components/terminal/TerminalView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    { path: '/chat', name: 'chat', component: ChatView },
    { path: '/files', name: 'files', component: FilesView },
    { path: '/files/:path(.*)*', name: 'files-path', component: FilesView },
    { path: '/knowledge', name: 'knowledge', component: KnowledgeView },
    { path: '/knowledge/:path(.*)*', name: 'knowledge-path', component: KnowledgeView },
    { path: '/todo', name: 'todo', component: TodoView },
    { path: '/observability', name: 'observability', component: ObservabilityView },
    { path: '/terminal', name: 'terminal', component: TerminalView },
  ],
});

const pinia = createPinia();

const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount('#app');

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service worker registered:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New content available');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('[PWA] Service worker registration failed:', error);
      });
  });
}
