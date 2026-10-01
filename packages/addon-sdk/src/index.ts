export const UI_SLOTS = [
  'dashboard.widgets',
  'customer.details.tabs',
  'sale.details.actions',
  'sidebar.items',
  'settings.sections',
  'page.header.actions',
] as const;

export type UiSlot = (typeof UI_SLOTS)[number];

export type AddonRequest = {
  body: unknown;
  query: Record<string, string | undefined>;
  host: string;
  userId: string | null;
  role: string | null;
  ip: string | null;
};

export type AddonContext = {
  addon: { name: string; version: string; path: string; capabilities: string[] };
  database: { execute(statement: string, params?: readonly unknown[]): Promise<unknown> };
  http: {
    route(method: string, path: string, permission: string, handler: AddonHandler): void;
    publicRoute(method: string, path: string, handler: AddonHandler): void;
  };
  permissions: { register(permissions: string[]): void };
  menu: { register(item: { to: string; label: string; permission?: string }): void };
  events: {
    on(name: string, listener: (payload: unknown) => void): void;
    emit(name: string, payload?: unknown): void;
  };
  audit: { log(entry: { action: string; entity: string; entityId: string; newValue?: unknown }): Promise<void> };
  tenant: { id: string; current(): string };
  config: { get(key: string): string | undefined };
  logger: { info(message: string): void; warn(message: string): void; error(message: string): void };
  ui: { extend(slot: UiSlot, item: { id: string; label?: string }): void };
};

export type AddonHandler = (context: AddonContext, request: AddonRequest) => Promise<unknown> | unknown;

export function defineAddon(setup: (context: AddonContext) => void) {
  return { setup };
}
