import type { Component } from 'vue';
import type { Router } from 'vue-router';
import { panelExtensions } from './registry';

type AddonModule = {
  register?: (host: {
    route(route: { path: string; component: Component; permission?: string }): void;
    extend(slot: string, item: { id: string; label?: string; to?: string; permission?: string; icon?: Component; component?: Component }): void;
  }) => void;
};

export function loadAddonFrontends(router: Router) {
  const modules = import.meta.glob('../../../../addons/*/frontend/index.ts', { eager: true }) as Record<string, AddonModule>;
  for (const [file, mod] of Object.entries(modules)) {
    const addon = file.match(/addons\/([^/]+)\//)?.[1];
    const host = {
      route(route: { path: string; component: Component; permission?: string }) {
        panelExtensions.routes.push(route);
        router.addRoute({ path: route.path, component: route.component, meta: { permission: route.permission } });
      },
      extend(slot: string, item: { id: string; label?: string; to?: string; permission?: string; icon?: Component; component?: Component }) {
        if (slot === 'sidebar.items' && item.to && item.label) {
          panelExtensions.sidebar.push({ id: item.id, to: item.to, label: item.label, permission: item.permission, icon: item.icon, addon });
          return;
        }
        const list = panelExtensions.slots[slot] ?? [];
        list.push({ id: item.id, component: item.component, label: item.label });
        panelExtensions.slots[slot] = list;
      },
    };
    mod.register?.(host);
  }
}
