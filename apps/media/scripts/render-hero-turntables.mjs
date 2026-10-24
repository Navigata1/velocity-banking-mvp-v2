import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const heroes = process.argv.slice(2);
if (!heroes.length) heroes.push('car','house','land','creditCard','studentLoan','medical','personal','recreation','custom','vault');
await mkdir(new URL('../hyperframes/output/heroes/', import.meta.url), { recursive: true });
for (const hero of heroes) {
  if (!/^(car|house|land|creditCard|studentLoan|medical|personal|recreation|custom|vault)$/.test(hero)) throw new Error('Unknown hero');
  const variables = new URL(`../hyperframes/output/heroes/${hero}.json`, import.meta.url);
  await writeFile(variables, JSON.stringify({hero}));
  const result = spawnSync(process.execPath, ['node_modules/hyperframes/dist/cli.js','render','hero-turntables',
    '--variables-file',fileURLToPath(variables),
    '--output',`hyperframes/output/heroes/${hero}.mp4`,'--fps','30','--quality','high','--workers','1','--browser-gpu'],
  { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
