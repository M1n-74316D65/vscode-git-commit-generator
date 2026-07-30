import { mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const outputDirectory = new URL('../artifacts/vsix/', import.meta.url);
const outputPath = new URL('git-commit-generator.vsix', outputDirectory);

mkdirSync(outputDirectory, { recursive: true });
rmSync(outputPath, { force: true });

const command = process.platform === 'win32' ? 'vsce.cmd' : 'vsce';
const result = spawnSync(
  command,
  ['package', '--out', fileURLToPath(outputPath)],
  { stdio: 'inherit' }
);

process.exitCode = result.status ?? 1;
