#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const work = mkdtempSync(join(tmpdir(), 'interestshield-mission-renderer-'));

try {
  cpSync(new URL('./render-sotu.mjs', import.meta.url), join(work, 'render-sotu.mjs'));
  writeFileSync(join(work, 'state.json'), JSON.stringify({
    version: 1,
    mission: { name: 'Renderer Test', status: 'active' },
    policies: {},
    phases: [],
    metrics: [],
    risks: [],
    prLog: [],
    resume: {},
  }));
  writeFileSync(join(work, 'journal.md'), [
    '# Mission Journal',
    '',
    '## 2026-07-13T01:00Z - first',
    '- First entry.',
    '',
    '## 2026-07-13T02:00Z - second',
    '- Second entry.',
    '',
  ].join('\n'));

  const run = spawnSync(process.execPath, [join(work, 'render-sotu.mjs')], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const html = readFileSync(join(work, 'state-of-the-union.html'), 'utf8');
  assert.ok(!html.includes('<b># Mission Journal</b>'), 'top-level journal heading must not render as an entry');
  assert.ok(!/^[ \t]+$/m.test(html), 'generated HTML must not contain whitespace-only lines');
  assert.ok(html.indexOf('2026-07-13T02:00Z - second') < html.indexOf('2026-07-13T01:00Z - first'));
  console.log('Mission renderer contract passed.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
