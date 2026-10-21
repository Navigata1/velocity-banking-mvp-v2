import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(join(repo, 'apps/media/package.json'));
const { parse } = await import(pathToFileURL(require.resolve('parse5')).href);
const mission = join(repo, 'ops/mission');
const before = readFileSync(new URL('./renderer-original.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const after = readFileSync(join(mission, 'render-sotu.mjs'), 'utf8').replace(/\r\n/g, '\n');
const expected = before.replace('line-height:1.55}', 'line-height:1.55;overflow-wrap:anywhere}')
  .replace('${prLog.length} PRs merged', '${prLog.length} PRs tracked');
assert.notEqual(expected, before);
assert.equal(after, expected, 'renderer must contain exactly the two authorized changes');
const state = readFileSync(join(mission, 'state.json'));
const journal = existsSync(join(mission, 'journal.md')) ? readFileSync(join(mission, 'journal.md')) : null;
const outputs = [];
for (const [name, source] of [['original', before], ['fixed', after]]) {
  const dir = fileURLToPath(new URL(`./renderer-preservation/${name}/`, import.meta.url));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'render-sotu.mjs'), source);
  writeFileSync(join(dir, 'state.json'), state);
  if (journal) writeFileSync(join(dir, 'journal.md'), journal);
  const run = spawnSync(process.execPath, [join(dir, 'render-sotu.mjs')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  outputs.push(readFileSync(join(dir, 'state-of-the-union.html'), 'utf8'));
}
const normalize = (html) => html.replace(/\r\n/g, '\n')
  .replace('line-height:1.55;overflow-wrap:anywhere}', 'line-height:1.55}')
  .replace(/(\d+) PRs tracked/, '$1 PRs merged')
  .replace(/generated \d{4}-\d{2}-\d{2} \d{2}:\d{2}Z/, 'generated TIMESTAMP');
const project = (node) => ({ name: node.nodeName, attrs: node.attrs, value: node.value,
  children: (node.childNodes ?? []).map(project) });
assert.equal(normalize(outputs[1]), normalize(outputs[0]), 'HTML differs beyond authorized changes and generation timestamp');
assert.deepEqual(project(parse(normalize(outputs[1]))), project(parse(normalize(outputs[0]))));
console.log('PASS: exactly two source changes (LF-normalized).');
console.log('PASS: captured state/journal HTML and parsed DOM/metadata preserved except authorized changes and generation timestamp.');
console.log('Static comparison only; no viewport, geometry, clipboard, browser, or external network proof.');
