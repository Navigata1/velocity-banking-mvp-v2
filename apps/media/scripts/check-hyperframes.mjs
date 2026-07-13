import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mediaRoot = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/hyperframes/dist/cli.js', import.meta.url));

function run(label, command, args) {
  console.log(`\n[hyperframes] ${label}`);
  const result = spawnSync(command, args, {
    cwd: mediaRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('prepare local renderer assets', process.execPath, ['scripts/prepare-hyperframes-assets.mjs']);
run('lint composition structure', process.execPath, [cli, 'lint', 'hyperframes']);
run('strict runtime, layout, motion, and contrast check', process.execPath, [
  cli,
  'check',
  'hyperframes',
  '--strict',
  '--samples=15',
  '--at-transitions',
  '--frame-check=severity=error;seek=.25,.75;tol=2',
]);
run('map registered animation timelines', process.execPath, ['scripts/map-hyperframes.mjs']);
