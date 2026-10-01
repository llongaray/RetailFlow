import { reactive } from 'vue';
import type { Component } from 'vue';

export type SidebarItem = { id: string; to: string; label: string; permission?: string; icon?: Component; addon?: string };
export type SlotItem = { id: string; component?: Component; label?: string };

export const panelExtensions = reactive({
  sidebar: [] as SidebarItem[],
  slots: {} as Record<string, SlotItem[]>,
  routes: [] as { path: string; component: Component; permission?: string }[],
});
