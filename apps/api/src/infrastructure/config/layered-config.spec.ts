import { applyLayeredConfig, parseSimpleYaml } from './layered-config';

describe('layered config', () => {
  it('lê mapa aninhado', () => {
    const parsed = parseSimpleYaml('server:\n  apiPort: 3000\nfiscal:\n  mode: demo\n');
    expect(parsed['server.apiPort']).toBe('3000');
    expect(parsed['fiscal.mode']).toBe('demo');
  });

  it('prioriza o ambiente, depois o yaml e depois o padrão', () => {
    const env: NodeJS.ProcessEnv = { NUVEMSHOP_MODE: 'live' };
    applyLayeredConfig('integrations:\n  nuvemshop:\n    mode: demo\n', env);
    expect(env.NUVEMSHOP_MODE).toBe('live');
    expect(env.FISCAL_MODE).toBe('demo');
    expect(env.API_PORT).toBe('3000');
  });
});