import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { runRemotion } from './remotion-cli.mjs';

const require = createRequire(import.meta.url);
const mediaRoot = fileURLToPath(new URL('../', import.meta.url));
const prepareAssets = fileURLToPath(new URL('./prepare-remotion-assets.mjs', import.meta.url));
const renderMatrix = fileURLToPath(new URL('./render-remotion-matrix.mjs', import.meta.url));
const tsxCli = require.resolve('tsx/cli');
const tscCli = require.resolve('typescript/bin/tsc');

function run(label, entrypoint, args) {
  console.log(`\n[remotion] ${label}`);
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: mediaRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('prepare pinned local fonts', prepareAssets, []);
run('verify generated financial scenarios', tsxCli, [
  'scripts/generate-remotion-scenarios.ts',
  '--check',
]);
run('type-check compositions', tscCli, ['-p', 'remotion/tsconfig.json']);
console.log('\n[remotion] bundle and enumerate compositions');
runRemotion([
  'compositions',
  'remotion/src/index.ts',
  '--public-dir=remotion/public',
]);
run('render browser-verified aspect-ratio matrix', renderMatrix, []);

console.log('\nRemotion checks passed.');
