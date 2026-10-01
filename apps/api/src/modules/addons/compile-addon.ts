import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const load = createRequire(__filename);

export async function compileAddon(root: string, addonDir: string) {
  const esbuild = load('esbuild') as typeof import('esbuild');
  const outfile = resolve(addonDir, 'dist/backend/index.js');
  mkdirSync(dirname(outfile), { recursive: true });
  await esbuild.build({
    entryPoints: [resolve(addonDir, 'backend/index.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    absWorkingDir: root,
    alias: { '@retailflow/addon-sdk': resolve(root, 'packages/addon-sdk/src/index.ts') },
    logLevel: 'silent',
  });
  return outfile;
}
