import { defineStore } from 'pinia';
import { api } from '../services/http';
import type { SessionUser } from '../types';

type Toast = { id: number; tone: 'ok' | 'error'; text: string };

export const useSession = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('rf_token') ?? '',
    user: JSON.parse(sessionStorage.getItem('rf_user') ?? 'null') as SessionUser | null,
    toasts: [] as Toast[],
  }),
  getters: {
    authenticated: (state) => Boolean(state.token && state.user),
  },
  actions: {
    can(permission: string) {
      return this.user?.permissions.includes(permission) ?? false;
    },
    notify(text: string, tone: Toast['tone'] = 'ok') {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      this.toasts.push({ id, tone, text });
      setTimeout(() => {
        this.toasts = this.toasts.filter((toast) => toast.id !== id);
      }, 4200);
    },
    async login(email: string, password: string) {
      const result = await api<{ accessToken: string; user: SessionUser }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.token = result.accessToken;
      this.user = result.user;
      sessionStorage.setItem('rf_token', result.accessToken);
      sessionStorage.setItem('rf_user', JSON.stringify(result.user));
    },
    logout() {
      this.token = '';
      this.user = null;
      sessionStorage.removeItem('rf_token');
      sessionStorage.removeItem('rf_user');
    },
  },
});
