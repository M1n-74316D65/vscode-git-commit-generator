// Runs vsce with enabledApiProposals temporarily stripped from package.json.
//
// Why: the scm/inputBox menu contribution point is still a proposed API.
// Declaring the proposal is useful in development (Insiders, Extension Dev
// Host, --enable-proposed-api) and degrades gracefully on stable VS Code,
// but the Marketplace may reject manifests that declare proposals. This
// wrapper removes the declaration only for the duration of the vsce call
// and restores package.json afterwards, so the working tree stays clean.
//
// Usage: node scripts/vsce-safe.mjs package
//        node scripts/vsce-safe.mjs publish
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkgPath = new URL('../package.json', import.meta.url);
const original = readFileSync(pkgPath, 'utf8');

const pkg = JSON.parse(original);
if (pkg.enabledApiProposals) {
  delete pkg.enabledApiProposals;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Temporarily stripped enabledApiProposals for vsce.');
}

try {
  const result = spawnSync('npx', ['@vscode/vsce', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  process.exitCode = result.status ?? 1;
} finally {
  writeFileSync(pkgPath, original);
}
