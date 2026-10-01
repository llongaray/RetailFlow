import { readFileSync } from 'fs';
import { resolve } from 'path';

const DEFAULTS: Record<string, string> = {
  API_PORT: '3000',
  WEB_PORT: '5173',
  ADMIN_PORT: '5174',
  SITE_PORT: '5175',
  WEB_ORIGIN: 'http://localhost:5173',
  ADMIN_ORIGIN: 'http://localhost:5174',
  SITE_ORIGIN: 'http://localhost:5175',
  SITE_HOST: 'localhost',
  NUVEMSHOP_MODE: 'demo',
  MERCADOPAGO_MODE: 'demo',
  FISCAL_MODE: 'demo',
};

const YAML_KEYS: Record<string, string> = {
  'server.apiPort': 'API_PORT',
  'server.webPort': 'WEB_PORT',
  'server.adminPort': 'ADMIN_PORT',
  'server.sitePort': 'SITE_PORT',
  'server.webOrigin': 'WEB_ORIGIN',
  'server.adminOrigin': 'ADMIN_ORIGIN',
  'server.siteOrigin': 'SITE_ORIGIN',
  'site.host': 'SITE_HOST',
  'integrations.nuvemshop.mode': 'NUVEMSHOP_MODE',
  'integrations.mercadopago.mode': 'MERCADOPAGO_MODE',
  'fiscal.mode': 'FISCAL_MODE',
};

export function parseSimpleYaml(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const stack: { indent: number; key: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const content = line.trim();
    const split = content.indexOf(':');
    if (split <= 0) continue;
    const key = content.slice(0, split).trim();
    const raw = content.slice(split + 1).trim();
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), key].join('.');
    if (!raw) {
      stack.push({ indent, key });
      continue;
    }
    let value = raw;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[path] = value;
  }
  return result;
}

export function applyLayeredConfig(yamlText: string, env: NodeJS.ProcessEnv = process.env) {
  const yaml = parseSimpleYaml(yamlText);
  for (const [path, envKey] of Object.entries(YAML_KEYS)) {
    if (env[envKey]) continue;
    env[envKey] = yaml[path] ?? DEFAULTS[envKey];
  }
  for (const [envKey, value] of Object.entries(DEFAULTS)) {
    if (!env[envKey]) env[envKey] = value;
  }
}

export function loadLayeredConfig() {
  const file = resolve(__dirname, '../../../../../config/retailflow.yaml');
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    text = '';
  }
  applyLayeredConfig(text);
}
