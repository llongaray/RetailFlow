import type { Component } from 'vue';
import HomePage from './HomePage.vue';

export function registerSite(host: { route(path: string, component: Component): void }) {
  host.route('/', HomePage);
  host.route('/sobre', HomePage);
  host.route('/contato', HomePage);
}
