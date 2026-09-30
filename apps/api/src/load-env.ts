import { readFileSync } from 'fs';
import { resolve } from 'path';

export function loadRootEnv() {
  const file = resolve(__dirname, '../../../.env');
  try {
    const text = readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]]) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch {
    // O ambiente de teste ou CI pode injetar as variáveis sem arquivo.
  }
}
