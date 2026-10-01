import type { Component } from 'vue';
import type { Router } from 'vue-router';

type SiteModule = { registerSite?: (host: { route(path: string, component: Component): void }) => void };

export function loadSite(router: Router) {
  const modules = import.meta.glob('../../../addons/*/site/index.ts', { eager: true }) as Record<string, SiteModule>;
  const host = { route: (path: string, component: Component) => router.addRoute({ path, component }) };
  for (const mod of Object.values(modules)) mod.registerSite?.(host);
}
