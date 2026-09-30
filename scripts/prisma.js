const { readFileSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
try {
  const text = readFileSync(path.join(root, '.env'), 'utf8');
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
  // DATABASE_URL pode já estar no ambiente.
}

const args = process.argv.slice(2);
const result = spawnSync('npm', ['exec', '-w', '@retailflow/api', '--', 'prisma', ...args], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
process.exit(result.status ?? 1);
