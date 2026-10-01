import { createHash, randomUUID } from 'crypto';
import { createRequire } from 'module';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolve } from 'path';
import type { AddonContext, AddonHandler, AddonRequest, UiSlot } from '@retailflow/addon-sdk';
import {
  findPermissionConflict,
  findRouteConflict,
  missingDependency,
  planMigrations,
  readManifest,
  resolveTenantHost,
  versionSatisfies,
  type AddonManifest,
} from '../../domain/addon.rules';
import { parseSimpleYaml } from '../../infrastructure/config/layered-config';
import { PERMISSIONS } from '../../domain/permissions';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { setAddonGrants } from './addon.grants';
import { compileAddon } from './compile-addon';

const load = createRequire(__filename);
const CORE_VERSION = '6.0.0';

type LoadedAddon = { manifest: AddonManifest; directory: string; error: string | null };

type RouteEntry = { addon: string; method: string; path: string; permission: string | null; handler: AddonHandler };

function repoRoot() {
  const candidates = [resolve(process.cwd(), 'addons'), resolve(process.cwd(), '../../addons'), resolve(__dirname, '../../../../../addons')];
  for (const dir of candidates) {
    if (existsSync(dir)) return resolve(dir, '..');
  }
  return resolve(process.cwd(), '../..');
}

function bind(statement: string, params: readonly unknown[]) {
  const parts = statement.split(/@P\d+/);
  const template = parts as unknown as TemplateStringsArray;
  Object.defineProperty(template, 'raw', { value: parts });
  const values = [...statement.matchAll(/@P(\d+)/g)].map((match) => params[Number(match[1]) - 1]);
  return Prisma.sql(template, ...values);
}

@Injectable()
export class AddonEngine implements OnModuleInit {
  private readonly logger = new Logger(AddonEngine.name);
  private readonly addons = new Map<string, LoadedAddon>();
  private readonly routes: RouteEntry[] = [];
  private readonly listeners = new Map<string, ((payload: unknown) => void)[]>();
  private readonly menuItems: { addon: string; to: string; label: string; permission?: string }[] = [];
  private readonly registeredPermissions = new Map<string, string[]>();
  private root = repoRoot();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.root = repoRoot();
    const dir = resolve(this.root, 'addons');
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
      try {
        await this.prepare(name);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao preparar o addon.';
        this.logger.error(`${name}: ${message}`);
        await this.remember(name, '1.0.0', 'ERROR', message);
      }
    }
    await this.refreshGrants();
  }

  list() {
    return [...this.addons.values()].map((addon) => ({
      name: addon.manifest.name,
      displayName: addon.manifest.displayName,
      availableVersion: addon.manifest.version,
      capabilities: addon.manifest.capabilities,
      error: addon.error,
    }));
  }

  async installations(tenantId: string) {
    const rows = await this.prisma.addonInstallation.findMany({ where: { tenantId } });
    return this.list().map((addon) => {
      const row = rows.find((item) => item.addonName === addon.name);
      return {
        ...addon,
        installedVersion: row?.installedVersion ?? null,
        state: row?.state ?? (addon.error ? 'ERROR' : 'INSTALLED'),
        error: row?.error ?? addon.error,
      };
    });
  }

  async activate(tenantId: string, name: string) {
    const addon = this.addons.get(name);
    if (!addon) throw new NotFoundException('Addon não encontrado.');
    if (addon.error && addon.manifest.retailflowVersion && !versionSatisfies(CORE_VERSION, addon.manifest.retailflowVersion)) {
      await this.remember(name, addon.manifest.version, 'INCOMPATIBLE', addon.error, tenantId);
      return this.installations(tenantId);
    }
    const active = await this.activeNames(tenantId);
    const missing = missingDependency(addon.manifest.dependencies, active);
    if (missing) {
      await this.remember(name, addon.manifest.version, 'ERROR', `Depende de ${missing}.`, tenantId);
      return this.installations(tenantId);
    }
    const migrationError = await this.applyMigrations(addon);
    if (migrationError) {
      await this.remember(name, addon.manifest.version, 'ERROR', migrationError, tenantId);
      return this.installations(tenantId);
    }
    await this.remember(name, addon.manifest.version, 'ACTIVE', null, tenantId, new Date());
    await this.refreshGrants();
    return this.installations(tenantId);
  }

  async deactivate(tenantId: string, name: string) {
    const addon = this.addons.get(name);
    if (!addon) throw new NotFoundException('Addon não encontrado.');
    await this.remember(name, addon.manifest.version, 'INACTIVE', null, tenantId);
    await this.refreshGrants();
    return this.installations(tenantId);
  }

  async dispatch(method: string, path: string, request: AddonRequest) {
    const route = this.routes.find((item) => item.method === method && item.path === path);
    if (!route) throw new NotFoundException('Rota não encontrada.');
    const tenantId = route.permission ? 'company' : resolveTenantHost(request.host, process.env.SITE_HOST ?? 'localhost');
    if (!tenantId) throw new NotFoundException('Empresa não encontrada para este endereço.');
    const installation = await this.prisma.addonInstallation.findUnique({ where: { tenantId_addonName: { tenantId, addonName: route.addon } } });
    if (installation?.state !== 'ACTIVE') throw new NotFoundException('Addon inativo.');
    if (route.permission && request.role !== 'ADMIN') throw new ForbiddenException('Permissão insuficiente para esta operação.');
    try {
      return await route.handler(this.context(this.addons.get(route.addon)!, tenantId), request);
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') throw new NotFoundException('Página não publicada.');
      if (error instanceof Error && error.message === 'IMAGE') throw new BadRequestException('Imagem acima do limite.');
      throw error;
    }
  }

  routeTable() {
    return this.routes.map((route) => ({ method: route.method, path: route.path, permission: route.permission, addon: route.addon }));
  }

  private async prepare(name: string) {
    const directory = resolve(this.root, 'addons', name);
    const manifestFile = resolve(directory, 'manifest.json');
    if (!existsSync(manifestFile)) return;
    const parsed = readManifest(JSON.parse(readFileSync(manifestFile, 'utf8')));
    if ('error' in parsed) {
      this.logger.warn(`${name}: ${parsed.error}`);
      await this.failClosed(name, directory, parsed.error, 'ERROR');
      return;
    }
    const manifest = parsed.manifest;
    this.addons.set(manifest.name, { manifest, directory, error: null });
    if (!versionSatisfies(CORE_VERSION, manifest.retailflowVersion)) {
      const message = `Incompatível com o RetailFlow ${CORE_VERSION}.`;
      this.addons.set(manifest.name, { manifest, directory, error: message });
      await this.remember(manifest.name, manifest.version, 'INCOMPATIBLE', message);
      return;
    }
    try {
      const outfile = await compileAddon(this.root, directory);
      const loaded = load(outfile) as { setup?: (context: AddonContext) => void; default?: { setup: (context: AddonContext) => void } };
      const setup = loaded.default?.setup ?? loaded.setup;
      if (!setup) throw new Error('Entrypoint sem defineAddon.');
      const keys = this.routes.map((route) => `${route.method} ${route.path}`);
      const before = this.routes.length;
      try {
        setup(this.context({ manifest, directory, error: null }, 'company'));
        const added = this.routes.slice(before).map((route) => `${route.method} ${route.path}`);
        const clash = findRouteConflict(keys, added);
        if (clash) {
          this.routes.splice(before);
          throw new Error(`Rota já registrada: ${clash}`);
        }
        const incomingPermissions = [...new Set([...manifest.permissions, ...(this.registeredPermissions.get(manifest.name) ?? [])])];
        const taken = [
          ...PERMISSIONS,
          ...[...this.addons.values()]
            .filter((item) => item.manifest.name !== manifest.name && !item.error)
            .flatMap((item) => [...item.manifest.permissions, ...(this.registeredPermissions.get(item.manifest.name) ?? [])]),
        ];
        const permissionClash = findPermissionConflict(taken, incomingPermissions);
        if (permissionClash) {
          this.routes.splice(before);
          this.registeredPermissions.delete(manifest.name);
          throw new Error(`Permissão já registrada: ${permissionClash}`);
        }
      } catch (error) {
        this.routes.splice(before);
        this.registeredPermissions.delete(manifest.name);
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar o backend.';
      this.addons.set(manifest.name, { manifest, directory, error: message });
      await this.remember(manifest.name, manifest.version, 'ERROR', message);
      return;
    }
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    for (const company of companies) {
      const current = await this.prisma.addonInstallation.findUnique({ where: { tenantId_addonName: { tenantId: company.id, addonName: manifest.name } } });
      if (!current) await this.activate(company.id, manifest.name);
      else if (current.state === 'ACTIVE') {
        const migrationError = await this.applyMigrations(this.addons.get(manifest.name)!);
        if (migrationError) await this.remember(manifest.name, manifest.version, 'ERROR', migrationError, company.id);
      }
    }
  }

  private async failClosed(name: string, directory: string, message: string, state: 'ERROR' | 'INCOMPATIBLE') {
    const manifest: AddonManifest = {
      schemaVersion: 1,
      name,
      displayName: name,
      description: message,
      version: '0.0.0',
      retailflowVersion: '>=6.0.0 <7.0.0',
      license: 'unknown',
      author: { name: 'desconhecido', url: 'https://localhost' },
      entrypoints: { backend: './dist/backend/index.js' },
      dependencies: {},
      permissions: [],
      capabilities: [],
    };
    this.addons.set(name, { manifest, directory, error: message });
    await this.remember(name, '0.0.0', state, message);
  }

  private async applyMigrations(addon: LoadedAddon) {
    if (!addon.manifest.capabilities.includes('migrations')) return null;
    const dir = resolve(addon.directory, 'migrations');
    if (!existsSync(dir)) return null;
    const incoming = readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => ({ migrationName: file, checksum: createHash('sha256').update(readFileSync(resolve(dir, file))).digest('hex'), sql: readFileSync(resolve(dir, file), 'utf8') }));
    const applied = await this.prisma.addonMigrationRecord.findMany({ where: { addonName: addon.manifest.name } });
    const plan = planMigrations(applied, incoming);
    if (plan.mismatch) return `Migration alterada depois de executada: ${plan.mismatch}`;
    for (const name of plan.run) {
      const file = incoming.find((item) => item.migrationName === name)!;
      for (const statement of file.sql.split(/;\s*(?:\r?\n|$)/).map((part) => part.trim()).filter(Boolean)) {
        await this.prisma.$executeRawUnsafe(statement);
      }
      await this.prisma.addonMigrationRecord.create({
        data: { id: randomUUID(), addonName: addon.manifest.name, addonVersion: addon.manifest.version, migrationName: name, checksum: file.checksum },
      });
    }
    return null;
  }

  private context(addon: LoadedAddon, tenantId: string): AddonContext {
    const yaml = this.addonConfig(addon.directory);
    return {
      addon: { name: addon.manifest.name, version: addon.manifest.version, path: addon.directory, capabilities: addon.manifest.capabilities },
      database: {
        execute: async (statement, params = []) => {
          const sql = bind(statement, params);
          if (/^\s*select/i.test(statement)) return this.prisma.$queryRaw(sql);
          return this.prisma.$executeRaw(sql);
        },
      },
      http: {
        route: (method, path, permission, handler) => this.routes.push({ addon: addon.manifest.name, method: method.toUpperCase(), path, permission, handler }),
        publicRoute: (method, path, handler) => this.routes.push({ addon: addon.manifest.name, method: method.toUpperCase(), path, permission: null, handler }),
      },
      permissions: {
        register: (permissions) => this.registeredPermissions.set(addon.manifest.name, [...new Set([...(this.registeredPermissions.get(addon.manifest.name) ?? []), ...permissions])]),
      },
      menu: { register: (item) => this.menuItems.push({ addon: addon.manifest.name, ...item }) },
      events: {
        on: (name, listener) => {
          const list = this.listeners.get(name) ?? [];
          list.push(listener);
          this.listeners.set(name, list);
        },
        emit: (name, payload) => {
          for (const listener of this.listeners.get(name) ?? []) listener(payload);
        },
      },
      audit: {
        log: async (entry) => {
          await this.prisma.auditLog.create({
            data: { action: entry.action, entity: entry.entity, entityId: entry.entityId, newValue: entry.newValue === undefined ? null : JSON.stringify(entry.newValue) },
          });
        },
      },
      tenant: { id: tenantId, current: () => tenantId },
      config: { get: (key) => process.env[`ADDON_${addon.manifest.name.toUpperCase()}_${key.toUpperCase()}`] ?? yaml[key] },
      logger: {
        info: (message) => this.logger.log(`[${addon.manifest.name}] ${message}`),
        warn: (message) => this.logger.warn(`[${addon.manifest.name}] ${message}`),
        error: (message) => this.logger.error(`[${addon.manifest.name}] ${message}`),
      },
      ui: { extend: (slot: UiSlot, item: { id: string }) => this.logger.log(`${addon.manifest.name} estende ${slot}:${item.id}`) },
    };
  }

  private addonConfig(directory: string) {
    const dir = resolve(directory, 'config');
    if (!existsSync(dir)) return {};
    return readdirSync(dir)
      .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
      .reduce<Record<string, string>>((acc, file) => ({ ...acc, ...parseSimpleYaml(readFileSync(resolve(dir, file), 'utf8')) }), {});
  }

  private async activeNames(tenantId: string) {
    const rows = await this.prisma.addonInstallation.findMany({ where: { tenantId, state: 'ACTIVE' } });
    return new Set(rows.map((row) => row.addonName));
  }

  private async refreshGrants() {
    const rows = await this.prisma.addonInstallation.findMany({ where: { state: 'ACTIVE' } });
    const byTenant = new Map<string, string[]>();
    for (const row of rows) {
      const declared = this.addons.get(row.addonName)?.manifest.permissions ?? [];
      const permissions = [...new Set([...declared, ...(this.registeredPermissions.get(row.addonName) ?? [])])];
      byTenant.set(row.tenantId, [...(byTenant.get(row.tenantId) ?? []), ...permissions]);
    }
    for (const [tenantId, permissions] of byTenant) setAddonGrants(tenantId, permissions);
    if (!byTenant.size) setAddonGrants('company', []);
  }

  private async remember(name: string, version: string, state: string, error: string | null, tenantId = 'company', activatedAt?: Date) {
    const companies = tenantId ? await this.prisma.company.findMany({ where: { id: tenantId }, select: { id: true } }) : [];
    if (!companies.length) return;
    const current = await this.prisma.addonInstallation.findUnique({ where: { tenantId_addonName: { tenantId, addonName: name } } });
    if (!current) {
      await this.prisma.addonInstallation.create({
        data: { id: randomUUID(), tenantId, addonName: name, installedVersion: version, state, error, activatedAt: state === 'ACTIVE' ? activatedAt ?? new Date() : null },
      });
      return;
    }
    await this.prisma.addonInstallation.update({
      where: { id: current.id },
      data: { installedVersion: version, state, error, activatedAt: state === 'ACTIVE' ? current.activatedAt ?? new Date() : current.activatedAt },
    });
  }
}
