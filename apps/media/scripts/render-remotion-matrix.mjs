import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runRemotion } from './remotion-cli.mjs';

const mediaRoot = fileURLToPath(new URL('../', import.meta.url));
const outputRootUrl = new URL('../remotion/out/matrix/', import.meta.url);
const outputRoot = fileURLToPath(outputRootUrl);
const prepareAssets = fileURLToPath(new URL('./prepare-remotion-assets.mjs', import.meta.url));
const entrypoint = 'remotion/src/index.ts';
const compositions = [
  ['Baseline-Landscape', 1920, 1080],
  ['Baseline-Portrait', 1080, 1920],
  ['Baseline-Square', 1080, 1080],
  ['MoneyLoopMonth-Landscape', 1920, 1080],
  ['MoneyLoopMonth-Portrait', 1080, 1920],
  ['MoneyLoopMonth-Square', 1080, 1080],
  ['BlockedPlan-Landscape', 1920, 1080],
  ['BlockedPlan-Portrait', 1080, 1920],
  ['BlockedPlan-Square', 1080, 1080],
];
const keyframes = [
  ['intro', 18],
  ['story', 120],
  ['resolve', 220],
];

async function inspectPng(compositionId, phase, frame, expectedWidth, expectedHeight) {
  const file = `${compositionId}-${phase}.png`;
  const data = await readFile(new URL(file, outputRootUrl));
  const signature = data.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${file} is not a PNG.`);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`${file} rendered ${width}x${height}; expected ${expectedWidth}x${expectedHeight}.`);
  }
  return {
    compositionId,
    phase,
    frame,
    width,
    height,
    bytes: data.byteLength,
    sha256: createHash('sha256').update(data).digest('hex'),
    file,
  };
}

function run(entry, args) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: mediaRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await mkdir(outputRoot, { recursive: true });
run(prepareAssets, []);

for (const [id] of compositions) {
  for (const [phase, frame] of keyframes) {
    console.log(`\n[remotion] rendering ${id} ${phase} frame ${frame}`);
    runRemotion([
      'still',
      entrypoint,
      id,
      `remotion/out/matrix/${id}-${phase}.png`,
      `--frame=${frame}`,
      '--public-dir=remotion/public',
      '--overwrite',
    ]);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  keyframes: Object.fromEntries(keyframes),
  renders: await Promise.all(
    compositions.flatMap(([id, width, height]) => keyframes.map(([phase, frame]) => (
      inspectPng(id, phase, frame, width, height)
    ))),
  ),
};
await writeFile(
  new URL('../remotion/out/matrix/manifest.json', import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`\nRendered ${compositions.length * keyframes.length} Remotion matrix stills.`);
