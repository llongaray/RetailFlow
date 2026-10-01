import { captureAddonFailure, findPermissionConflict, findRouteConflict, missingDependency, planMigrations, readManifest, resolveTenantHost, versionSatisfies } from './addon.rules';

const manifest = {
  schemaVersion: 1,
  name: 'website',
  displayName: 'Website',
  description: 'Landing pública',
  version: '1.0.0',
  retailflowVersion: '>=6.0.0 <7.0.0',
  license: 'AGPL-3.0-only',
  author: { name: 'RetailFlow', url: 'https://github.com/llongaray/RetailFlow' },
  entrypoints: { backend: './dist/backend/index.js', frontend: './frontend/index.ts', site: './site/index.ts' },
  dependencies: {},
  permissions: ['website.read', 'website.update'],
  capabilities: ['backend', 'panel', 'public-site', 'migrations'],
};

describe('addon rules', () => {
  it('aceita manifesto sem enabled', () => {
    const result = readManifest(manifest);
    expect('manifest' in result).toBe(true);
  });

  it('recusa enabled no pacote', () => {
    const result = readManifest({ ...manifest, enabled: true });
    expect(result).toEqual({ error: 'enabled não pertence ao manifesto.' });
  });

  it('confere o intervalo da versão do core', () => {
    expect(versionSatisfies('6.0.0', '>=6.0.0 <7.0.0')).toBe(true);
    expect(versionSatisfies('6.4.1', '>=6.0.0 <7.0.0')).toBe(true);
    expect(versionSatisfies('7.0.0', '>=6.0.0 <7.0.0')).toBe(false);
    expect(versionSatisfies('5.9.0', '>=6.0.0 <7.0.0')).toBe(false);
  });

  it('exige dependência ativa', () => {
    expect(missingDependency({ website: '>=1.0.0' }, new Set())).toBe('website');
    expect(missingDependency({ website: '>=1.0.0' }, new Set(['website']))).toBeNull();
  });

  it('não reaplica migration com o mesmo checksum e recusa checksum alterado', () => {
    const applied = [{ migrationName: '0001_create_settings.sql', checksum: 'abc' }];
    const again = planMigrations(applied, [{ migrationName: '0001_create_settings.sql', checksum: 'abc' }]);
    expect(again.run).toEqual([]);
    expect(again.skip).toEqual(['0001_create_settings.sql']);
    expect(again.mismatch).toBeNull();
    const changed = planMigrations(applied, [
      { migrationName: '0001_create_settings.sql', checksum: 'xyz' },
      { migrationName: '0002_create_sections.sql', checksum: 'new' },
    ]);
    expect(changed.mismatch).toBe('0001_create_settings.sql');
    expect(changed.run).toEqual([]);
  });

  it('executa só o arquivo novo quando o anterior já correu', () => {
    const plan = planMigrations([{ migrationName: '0001_create_settings.sql', checksum: 'abc' }], [
      { migrationName: '0001_create_settings.sql', checksum: 'abc' },
      { migrationName: '0002_create_sections.sql', checksum: 'def' },
    ]);
    expect(plan.run).toEqual(['0002_create_sections.sql']);
  });

  it('não substitui permissão já registrada', () => {
    expect(findPermissionConflict(['website.read'], ['website.read'])).toBe('website.read');
    expect(findPermissionConflict(['website.read'], ['website.update'])).toBeNull();
  });

  it('não substitui rota já registrada', () => {
    expect(findRouteConflict(['GET /website/public'], ['GET /website/public'])).toBe('GET /website/public');
    expect(findRouteConflict(['GET /website/public'], ['POST /website/public'])).toBeNull();
  });

  it('resolve a empresa pelo host configurado', () => {
    expect(resolveTenantHost('localhost:5175')).toBe('company');
    expect(resolveTenantHost('loja.exemplo', 'loja.exemplo')).toBe('company');
    expect(resolveTenantHost('outra.exemplo', 'loja.exemplo')).toBeNull();
  });

  it('isola falha de um addon', () => {
    expect(captureAddonFailure(() => undefined)).toBeNull();
    expect(captureAddonFailure(() => { throw new Error('manifesto quebrado'); })).toBe('manifesto quebrado');
  });
});
