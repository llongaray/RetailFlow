import { createRouter, createWebHistory } from 'vue-router';
import AdminView from './views/AdminView.vue';
import LoginView from './views/LoginView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/', component: AdminView },
  ],
});

router.beforeEach((to) => {
  const token = sessionStorage.getItem('rf_admin_token');
  if (!token && to.path !== '/login') return '/login';
  if (token && to.path === '/login') return '/';
  return true;
});
