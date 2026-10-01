import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { loadSite } from './load';
import '../../../packages/ui/src/tokens.css';

const router = createRouter({ history: createWebHistory(), routes: [] });
loadSite(router);
createApp(App).use(router).mount('#app');
