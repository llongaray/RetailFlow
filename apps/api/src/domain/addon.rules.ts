export const ADDON_STATES = ['INSTALLED', 'ACTIVE', 'INACTIVE', 'ERROR', 'INCOMPATIBLE'] as const;
export type AddonState = (typeof ADDON_STATES)[number];

export const ADDON_CAPABILITIES = ['backend', 'panel', 'public-site', 'migrations', 'ui-extensions'] as const;

export type AddonManifest = {
  schemaVersion: 1;
  name: string;
  displayName: string;
  description: string;
  version: string;
  retailflowVersion: string;
  license: string;
  author: { name: string; url: string };
  entrypoints: { backend: string; frontend?: string; site?: string };
  dependencies: Record<string, string>;
  permissions: string[];
  capabilities: string[];
};

const NAME = /^[a-z][a-z0-9-]*$/;
const PERMISSION = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

export function readManifest(value: unknown): { manifest: AddonManifest } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Manifesto inválido.' };
  const raw = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(raw, 'enabled')) return { error: 'enabled não pertence ao manifesto.' };
  if (raw.schemaVersion !== 1) return { error: 'schemaVersion deve ser 1.' };
  if (typeof raw.name !== 'string' || !NAME.test(raw.name)) return { error: 'Nome do addon inválido.' };
  if (typeof raw.displayName !== 'string' || !raw.displayName.trim()) return { error: 'displayName é obrigatório.' };
  if (typeof raw.description !== 'string') return { error: 'description é obrigatória.' };
  if (typeof raw.version !== 'string' || !VERSION.test(raw.version)) return { error: 'version deve ser semver.' };
  if (typeof raw.retailflowVersion !== 'string' || !raw.retailflowVersion.trim()) return { error: 'retailflowVersion é obrigatória.' };
  if (typeof raw.license !== 'string' || !raw.license.trim()) return { error: 'license é obrigatória.' };
  const author = raw.author;
  if (!author || typeof author !== 'object' || Array.isArray(author)) return { error: 'author é obrigatório.' };
  const authorRecord = author as Record<string, unknown>;
  if (typeof authorRecord.name !== 'string' || typeof authorRecord.url !== 'string') return { error: 'author precisa de name e url.' };
  const entrypoints = raw.entrypoints;
  if (!entrypoints || typeof entrypoints !== 'object' || Array.isArray(entrypoints)) return { error: 'entrypoints é obrigatório.' };
  const entry = entrypoints as Record<string, unknown>;
  if (typeof entry.backend !== 'string' || !entry.backend.trim()) return { error: 'entrypoints.backend é obrigatório.' };
  if (entry.frontend !== undefined && typeof entry.frontend !== 'string') return { error: 'entrypoints.frontend inválido.' };
  if (entry.site !== undefined && typeof entry.site !== 'string') return { error: 'entrypoints.site inválido.' };
  if (!raw.dependencies || typeof raw.dependencies !== 'object' || Array.isArray(raw.dependencies)) return { error: 'dependencies deve ser um objeto.' };
  const dependencies: Record<string, string> = {};
  for (const [key, range] of Object.entries(raw.dependencies as Record<string, unknown>)) {
    if (!NAME.test(key) || typeof range !== 'string') return { error: 'Dependência inválida.' };
    dependencies[key] = range;
  }
  if (!Array.isArray(raw.permissions) || raw.permissions.some((item) => typeof item !== 'string' || !PERMISSION.test(item))) {
    return { error: 'Permissão inválida.' };
  }
  if (!Array.isArray(raw.capabilities) || raw.capabilities.some((item) => typeof item !== 'string' || !ADDON_CAPABILITIES.includes(item as (typeof ADDON_CAPABILITIES)[number]))) {
    return { error: 'Capability inválida.' };
  }
  return {
    manifest: {
      schemaVersion: 1,
      name: raw.name,
      displayName: raw.displayName,
      description: raw.description,
      version: raw.version,
      retailflowVersion: raw.retailflowVersion,
      license: raw.license,
      author: { name: authorRecord.name, url: authorRecord.url },
      entrypoints: {
        backend: entry.backend,
        frontend: typeof entry.frontend === 'string' ? entry.frontend : undefined,
        site: typeof entry.site === 'string' ? entry.site : undefined,
      },
      dependencies,
      permissions: raw.permissions as string[],
      capabilities: raw.capabilities as string[],
    },
  };
}

function parts(version: string): [number, number, number] | null {
  const match = VERSION.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(left: [number, number, number], right: [number, number, number]) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function versionSatisfies(current: string, range: string): boolean {
  const mine = parts(current);
  if (!mine) return false;
  const tokens = range.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  for (const token of tokens) {
    const match = /^(>=|<=|>|<|=)(\d+\.\d+\.\d+)$/.exec(token);
    if (!match) return false;
    const other = parts(match[2]);
    if (!other) return false;
    const delta = compare(mine, other);
    if (match[1] === '>=' && delta < 0) return false;
    if (match[1] === '<=' && delta > 0) return false;
    if (match[1] === '>' && delta <= 0) return false;
    if (match[1] === '<' && delta >= 0) return false;
    if (match[1] === '=' && delta !== 0) return false;
  }
  return true;
}

export type MigrationPlan = { run: string[]; skip: string[]; mismatch: string | null };

export function planMigrations(
  applied: { migrationName: string; checksum: string }[],
  incoming: { migrationName: string; checksum: string }[],
): MigrationPlan {
  const known = new Map(applied.map((item) => [item.migrationName, item.checksum]));
  const run: string[] = [];
  const skip: string[] = [];
  for (const file of incoming) {
    const previous = known.get(file.migrationName);
    if (!previous) {
      run.push(file.migrationName);
      continue;
    }
    if (previous !== file.checksum) return { run: [], skip, mismatch: file.migrationName };
    skip.push(file.migrationName);
  }
  return { run, skip, mismatch: null };
}

export function findPermissionConflict(existing: string[], incoming: string[]): string | null {
  const taken = new Set(existing);
  for (const permission of incoming) {
    if (taken.has(permission)) return permission;
  }
  return null;
}

export function findRouteConflict(existing: string[], incoming: string[]): string | null {
  const taken = new Set(existing);
  for (const route of incoming) {
    if (taken.has(route)) return route;
  }
  return null;
}

export function missingDependency(dependencies: Record<string, string>, active: ReadonlySet<string>): string | null {
  for (const name of Object.keys(dependencies)) {
    if (!active.has(name)) return name;
  }
  return null;
}

export function resolveTenantHost(hostHeader: string, configured = 'localhost'): string | null {
  const host = hostHeader.split(':')[0].trim().toLowerCase();
  if (!host) return null;
  if (host === configured.toLowerCase() || host === 'localhost' || host === '127.0.0.1') return 'company';
  return null;
}

export function captureAddonFailure(load: () => void): string | null {
  try {
    load();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Falha ao carregar o addon.';
  }
}
