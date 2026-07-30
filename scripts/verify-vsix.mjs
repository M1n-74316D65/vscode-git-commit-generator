import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const vsixPath = process.argv[2] ?? 'artifacts/vsix/git-commit-generator.vsix';
const sourceManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const size = statSync(vsixPath).size;

if (size >= 5 * 1024 * 1024) {
  throw new Error(`VSIX exceeds 5 MB: ${size} bytes`);
}

const packagedManifestResult = spawnSync(
  'unzip',
  ['-p', vsixPath, 'extension/package.json'],
  { encoding: 'utf8' }
);
if (packagedManifestResult.status !== 0) {
  throw new Error(packagedManifestResult.stderr || 'Cannot read the packaged manifest');
}

const packagedManifest = JSON.parse(packagedManifestResult.stdout);
if (packagedManifest.version !== sourceManifest.version) {
  throw new Error('Packaged manifest version does not match package.json');
}
if (packagedManifest.enabledApiProposals !== undefined) {
  throw new Error('Packaged manifest enables proposed APIs');
}
if (packagedManifest.contributes?.menus?.['scm/inputBox'] !== undefined) {
  throw new Error('Packaged manifest contains the proposed SCM input-box menu');
}
if (
  packagedManifest.contributes?.commands?.length !==
  sourceManifest.contributes.commands.length
) {
  throw new Error('Packaged command count does not match package.json');
}

const packageListResult = spawnSync('unzip', ['-Z1', vsixPath], { encoding: 'utf8' });
if (packageListResult.status !== 0) {
  throw new Error(packageListResult.stderr || 'Cannot list the VSIX contents');
}

const forbidden = [
  /^extension\/\./,
  /^extension\/src\//,
  /^extension\/out\/test\//,
  /^extension\/scripts\//,
  /^extension\/artifacts\//,
  /^extension\/(?:package-lock|bun\.lock)/,
  /\.(?:ts|map)$/,
  /^extension\/resources\/(?!icon\.png$)/,
];
const packagedFiles = packageListResult.stdout.trim().split('\n');
const required = [
  'extension/package.json',
  'extension/package.nls.json',
  'extension/package.nls.es.json',
  'extension/out/extension.js',
  'extension/resources/icon.png',
];
for (const file of required) {
  if (!packagedFiles.includes(file)) {
    throw new Error(`Required file missing from VSIX: ${file}`);
  }
}
for (const file of packagedFiles) {
  if (forbidden.some((pattern) => pattern.test(file))) {
    throw new Error(`Forbidden file in VSIX: ${file}`);
  }
}

console.log(`Verified ${vsixPath} (${size} bytes, ${packagedFiles.length} files)`);
