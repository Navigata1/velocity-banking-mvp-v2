import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const directory = path.resolve('.superpowers/sdd/2026-10-21-common-month');
const release = path.join(directory, 'release'), output = path.join(release, 'failed-7bd72ac');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const run = JSON.parse(await fs.readFile(path.join(release, 'hosted/run-envelope.json'), 'utf8'));
assert.equal(run.headSha, '7bd72ac67f2e0aa32cd0275361c6bf983eb4ea47');
assert.equal(run.status, 'completed'); assert.equal(run.exitCode, 0);
await fs.mkdir(output, { recursive: true });
for (const file of ['deployment-final.json', 'Hosted-Mobile-Vitals.jpg', 'Hosted-Common-Month.jpg', 'failed-push-ci.log', 'failed-pr-ci.log', 'failed-7bd72ac-browser-proof.json', 'hosted-run.log']) await fs.copyFile(path.join(release, file), path.join(output, file));
await fs.copyFile(path.join(release, 'hosted/run-envelope.json'), path.join(output, 'run-envelope.json'));
const receipt = await fs.readFile('ops/mission/evidence/portfolio-common-month-2026-10-21/artifact-receipt.json');
assert.equal(hash(receipt), run.localReceiptSha256);
await fs.writeFile(path.join(output, 'committed-local-receipt.json'), receipt);
const guard = await fs.readFile('ops/mission/evidence/portfolio-common-month-2026-10-21/shipping/shipping-guards.mjs');
assert.equal(hash(guard), run.guardsSha256);
await fs.writeFile(path.join(output, 'invocation-shipping-guards.mjs'), guard);
const ci = [];
for (const id of [39605673471, 39605676575]) {
  const bytes = await fs.readFile(path.join(directory, `failed-${id}-metadata.json`));
  const metadata = JSON.parse(bytes); assert.equal(metadata.headSha, run.headSha); assert.equal(metadata.status, 'completed'); assert.equal(metadata.conclusion, 'failure');
  const web = metadata.jobs.find(job => job.name === 'Web and mobile quality gates');
  const sql = metadata.jobs.find(job => job.name === 'Isolated SQL and owner isolation');
  assert.equal(web.conclusion, 'failure'); assert.equal(sql.conclusion, 'success');
  assert.equal(web.steps.find(step => step.conclusion === 'failure').name, 'Verify funded Portfolio allocations and debt scope');
  await fs.writeFile(path.join(output, `ci-${id}.json`), bytes);
  ci.push({ id, url: metadata.url, web: 'failure', sql: 'success', failedStep: 'Verify funded Portfolio allocations and debt scope',
    skippedWebSteps: web.steps.filter(step => step.conclusion === 'skipped').map(step => step.name) });
}
const files = {};
for (const file of await fs.readdir(output)) { const bytes = await fs.readFile(path.join(output, file)); files[file] = { bytes: bytes.length, sha256: hash(bytes) }; }
await fs.writeFile(path.join(directory, 'failed-checkpoint-7bd72ac.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), headSha: run.headSha,
  status: 'failed-CI-not-a-verified-release', ci, hosted: { id: run.id, origin: run.origin, status: run.status, suites: Object.keys(run.suites).length, workflows: 109 },
  failure: 'Common-month large-values280 section overflow. Requested-Verdana local RED independently reproduces99px currency columns at12px; actual Linux font is not inferred.',
  originalPreviewPortfolio: 'UI export/import restore and canonical export equality verified; comparison month reset60; browser viewport reset.',
  desktopPublished: false, receiptPosted: false, retainedDirectory: output, files,
}, null, 2) + '\n');
console.log(JSON.stringify({ headSha: run.headSha, ciRuns: ci.map(v => v.id), retainedFiles: Object.keys(files).length, receiptPosted: false, desktopPublished: false }));
