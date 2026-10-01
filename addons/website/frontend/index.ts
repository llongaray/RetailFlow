import { Globe } from '@retailflow/icons';
import type { Component } from 'vue';
import WebsiteAdmin from './WebsiteAdmin.vue';

export type PanelHost = {
  route(route: { path: string; component: Component; permission?: string }): void;
  extend(slot: string, item: { id: string; label?: string; to?: string; permission?: string; icon?: Component; component?: Component }): void;
};

export function register(host: PanelHost) {
  host.route({ path: '/admin/website', component: WebsiteAdmin, permission: 'website.read' });
  host.extend('sidebar.items', { id: 'website', label: 'Website', to: '/admin/website', permission: 'website.read', icon: Globe });
}
