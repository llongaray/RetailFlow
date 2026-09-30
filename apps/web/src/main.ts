import { MotionPlugin } from '@vueuse/motion';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import 'dragula/dist/dragula.css';
import './styles.css';

createApp(App).use(createPinia()).use(router).use(MotionPlugin).mount('#app');
