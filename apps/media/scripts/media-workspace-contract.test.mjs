import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseDocument } from 'yaml';

import { visualIdentity } from '../src/visual-identity.mjs';

const root = new URL('../../../', import.meta.url);

test('ships a version-matched human visual identity specification', async () => {
  const specification = await readFile(new URL('apps/media/VISUAL-IDENTITY.md', root), 'utf8');
  for (const required of [
    '# InterestShield Visual Identity and Motion Contract',
    'Contract version: `1`',
    '## Brand Posture',
    '## Semantic Color',
    '## Typography',
    '## Composition Formats',
    '## Motion Language',
    '## Accessibility and Captions',
    '## Financial Data Semantics',
    '## First Three Stories',
    '## Runtime Boundary',
    '## Explicit Anti-Patterns',
  ]) {
    assert.ok(specification.includes(required), `missing specification section: ${required}`);
  }
  assert.ok(specification.includes('Utilization always means percentage used.'));
  assert.ok(specification.includes('Available capacity always means currency or percentage open.'));

  for (const group of Object.values(visualIdentity.palette)) {
    if (!group || typeof group !== 'object') continue;
    for (const value of Object.values(group)) {
      if (typeof value === 'string' && value.startsWith('#')) assert.ok(specification.includes(value));
    }
  }
  for (const format of Object.values(visualIdentity.formats)) {
    assert.ok(specification.includes(`${format.frame.width} x ${format.frame.height}`));
  }
  for (const face of ['display', 'body', 'data']) {
    assert.ok(specification.includes(visualIdentity.typography[face].family));
  }
  for (const story of visualIdentity.stories) assert.ok(specification.includes(`\`${story.id}\``));
  assert.ok(specification.includes(visualIdentity.motion.seededRandom.algorithm));
  assert.ok(specification.includes(visualIdentity.motion.seededRandom.seedHash));
  assert.ok(specification.includes(visualIdentity.motion.timebase.hyperframesSecondsFormula));
});

test('keeps the machine-readable specification snapshot synchronized', async () => {
  const specification = await readFile(new URL('apps/media/VISUAL-IDENTITY.md', root), 'utf8');
  const match = specification.match(
    /<!-- identity-snapshot:start -->\s*`sha256:([a-f0-9]{64})`\s*<!-- identity-snapshot:end -->/,
  );
  assert.ok(match, 'missing machine-readable identity snapshot');
  const digest = createHash('sha256').update(JSON.stringify(visualIdentity)).digest('hex');
  assert.equal(match[1], digest);
});

test('keeps media checks in the standing GitHub quality workflow', async () => {
  const workflowSource = await readFile(new URL('.github/workflows/ci.yml', root), 'utf8');
  const workflowDocument = parseDocument(workflowSource);
  assert.deepEqual(workflowDocument.errors, []);
  const workflow = workflowDocument.toJS();
  const job = workflow.jobs['web-mobile-quality'];
  const steps = job.steps;
  const checkoutIndex = steps.findIndex((step) => step.uses?.startsWith('actions/checkout@'));
  const installIndex = steps.findIndex((step) =>
    step['working-directory'] === 'apps/media'
      && step.run === 'npm ci --ignore-scripts'
      && step.if !== false);
  const checkIndex = steps.findIndex((step) =>
    step['working-directory'] === 'apps/media' && step.run === 'npm run check' && step.if !== false);

  assert.ok(job.steps.some((step) =>
    step.with?.['cache-dependency-path']?.includes('apps/media/package-lock.json')));
  assert.ok(checkoutIndex >= 0);
  assert.ok(installIndex > checkoutIndex);
  assert.ok(checkIndex > installIndex);
  await access(new URL('apps/media/package-lock.json', root));
});
