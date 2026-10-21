import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const media = createRequire(new URL('../../apps/media/package.json', import.meta.url));
const web = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { parse } = await import(pathToFileURL(media.resolve('parse5')).href);
const postcss = web('postcss');
const receipts = `https://receipts.invalid/${'a'.repeat(2048)}?ref=256&kind=draft`;
const evidence = fileURLToPath(new URL('../../.superpowers/sdd/2026-10-21-ci-isolation/', import.meta.url));
mkdirSync(evidence, { recursive: true });
const work = mkdtempSync(join(evidence, 'renderer-fixture-'));
const fixture = {
  mission: { name: 'Receipt <Review>', tagline: receipts, status: 'active', repo: 'owner/repo',
    planDoc: 'PLAN.md', updated: '2026-10-21', sessionCount: 7 },
  phases: [{ id: 'P1', title: 'Receipt audit', goal: 'Keep all receipts', status: 'in_progress',
    tasks: [{ id: 'T1', title: 'Review draft', status: 'pending', notes: receipts }],
    gates: [{ id: 'G1', title: 'Static check', status: 'pending', command: 'node check.mjs', evidence: receipts }] }],
  metrics: [{ label: 'Coverage', baseline: 0, current: 1, target: 2, direction: 'up' }],
  risks: [{ title: 'Review needed', severity: 'low', note: receipts }],
  prLog: [{ number: 255, title: 'Merged receipt', phase: 'P1', mergedAt: '2026-10-20', url: 'https://example.invalid/pull/255' },
    { number: 256, title: 'Draft receipt', phase: 'P1', url: 'https://example.invalid/pull/256' }],
  resume: { activePhase: 'P1', nextActions: ['Review draft 256'], blockers: ['Await review'] },
};
let html;
try {
  cpSync(new URL('./render-sotu.mjs', import.meta.url), join(work, 'render-sotu.mjs'));
  writeFileSync(join(work, 'state.json'), JSON.stringify(fixture));
  writeFileSync(join(work, 'journal.md'), '# Journal\n\n## Receipt checkpoint\nKeep original metadata.\n');
  const run = spawnSync(process.execPath, [join(work, 'render-sotu.mjs')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(run.stderr, '');
  html = readFileSync(join(work, 'state-of-the-union.html'), 'utf8');
} finally {
  // mkdtemp's literal prefix confines cleanup to this suite's ignored fixture directory.
  assert.ok(work.startsWith(join(evidence, 'renderer-fixture-')));
  rmSync(work, { recursive: true, force: true });
}
const doc = parse(html);
const nodes = (node) => [node, ...(node.childNodes ?? []).flatMap(nodes)];
const all = nodes(doc);
const text = (node) => nodes(node).filter((n) => n.nodeName === '#text').map((n) => n.value).join('');
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const css = text(all.find((n) => n.tagName === 'style'));

// Declaration checks only: no CSS cascade, layout, or viewport measurement is simulated.
function assertBodyContract(styles) {
  const sheet = postcss.parse(styles);
  const body = sheet.nodes.filter((n) => n.type === 'rule' && n.selector === 'body');
  const declarations = body.flatMap((rule) => rule.nodes).filter((n) => n.type === 'decl');
  assert.equal(declarations.filter((n) => n.prop === 'overflow-wrap').at(-1)?.value, 'anywhere',
    'body must declare inherited overflow-wrap:anywhere');
  sheet.walkRules((rule) => {
    if (!rule.selector.split(',').some((s) => ['body', 'html', 'main', '*', ':root'].includes(s.trim()))) return;
    rule.walkDecls((d) => {
      if (/^overflow(?:-[xy])?$/.test(d.prop)) assert.doesNotMatch(d.value, /hidden|clip/, 'no overflow concealment');
      if (rule.selector === 'body') assert.ok(!['font-size', 'zoom', 'transform'].includes(d.prop), 'no body font shrinking');
    });
  });
}

test('static CSS gives long receipt text inherited body wrapping', () => {
  assertBodyContract(css);
  assert.equal(text(all.find((n) => attr(n, 'class') === 'tagline')), receipts);
  assert.ok(receipts.length > 2000 && !/\s/.test(receipts));
  assert.ok(all.some((n) => n.tagName === 'td' && text(n) === receipts));
});

test('static contract rejects wrong selector, concealed overflow, and body shrinking', () => {
  const valid = 'body{overflow-wrap:anywhere}';
  assert.doesNotThrow(() => assertBodyContract(valid));
  assert.throws(() => assertBodyContract(valid.replace('body', '.body')), /body must declare/);
  for (const value of ['hidden', 'clip']) {
    assert.throws(() => assertBodyContract(`${valid}body{overflow-x:${value}}`), /no overflow concealment/);
  }
  assert.throws(() => assertBodyContract(`${valid}body{font-size:.5rem}`), /no body font shrinking/);
});

test('summary counts draft and merged PRs as tracked, not merged', () => {
  const chips = all.filter((n) => attr(n, 'class')?.split(' ').includes('chip')).map(text);
  assert.ok(chips.includes('2 PRs tracked'), 'draft #256 must not be counted as merged');
  assert.ok(!chips.includes('2 PRs merged'));
  const draft = all.find((n) => n.tagName === 'article' && text(n).includes('#256'));
  assert.match(text(draft), /Draft receipt/);
  assert.doesNotMatch(text(draft), /merged/);
});

test('static output retains semantic content, receipt tokens, and document metadata', () => {
  assert.equal(attr(all.find((n) => n.tagName === 'html'), 'lang'), 'en');
  assert.ok(all.some((n) => n.tagName === 'meta' && attr(n, 'charset') === 'utf-8'));
  assert.equal(attr(all.find((n) => attr(n, 'name') === 'viewport'), 'content'), 'width=device-width, initial-scale=1');
  assert.equal(text(all.find((n) => n.tagName === 'title')), 'Receipt <Review> \u2014 State of the Union');
  for (const id of ['coldstart', 'metrics', 'risks', 'phases', 'prs', 'journal']) assert.ok(all.some((n) => attr(n, 'id') === id), id);
  for (const value of ['Receipt <Review>', 'Keep all receipts', 'Coverage', 'Review needed', 'node check.mjs',
    'Receipt checkpoint', 'Keep original metadata.', 'updated: 2026-10-21', 'sessions: 7', 'owner/repo', 'PLAN.md']) assert.ok(text(doc).includes(value), value);
  assert.ok(all.some((n) => n.tagName === 'span' && text(n) === receipts));
  assert.ok(all.some((n) => n.tagName === 'pre' && text(n).includes('Review draft 256')));
  assert.ok(all.some((n) => n.tagName === 'a' && attr(n, 'href') === 'https://example.invalid/pull/256'));
});
