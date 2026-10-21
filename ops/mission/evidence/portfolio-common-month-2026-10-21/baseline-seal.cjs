const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const OUT = __dirname;
const ROOT = path.resolve(OUT, '../../..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.resolve(OUT, file));
const load = file => JSON.parse(read(file));
const git = args => execFileSync('git', args, { cwd: ROOT, windowsHide: true, encoding: 'utf8',
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
const save = (name, bytes) => {
  assert.match(name, /^baseline-[\w.-]+$/);
  fs.writeFileSync(path.join(OUT, name), bytes, { flag: 'wx' });
};
const result = load('baseline-v2-results.json');
assert.equal(result.expectedHead, '1aec5bf7be3d0f3c26079141245e4c7291fd8778');
assert.equal(result.verifierRevision, 2);
assert.equal(result.fatal, undefined);
assert.equal(result.failedChecks, 0);
assert.equal(result.passedChecks, 4134);
assert.equal(result.checks.length, result.passedChecks);
assert.equal(result.discrepancies.length, 0);
assert.equal(git(['rev-parse', 'HEAD']).trim(), result.expectedHead);
assert.equal(git(['branch', '--show-current']).trim(), 'codex/restoration/asset-heroes');
for (const artifact of [result.postflight, result.desktopManifest, result.publication]) {
  const bytes = fs.readFileSync(artifact.path);
  assert.equal(bytes.length, artifact.bytes);
  assert.equal(hash(bytes), artifact.sha256);
}
const post = JSON.parse(fs.readFileSync(result.postflight.path));
const reportBytes = fs.readFileSync(post.desktopReport.path);
assert.equal(reportBytes.length, 121936);
assert.equal(hash(reportBytes), '720ebd84c8a94bb6cc49c7ee46bb0c77e63e8a32fc8464c9b4668ba5e3d864df');
for (const run of result.ci) {
  assert.equal(run.attempt, 1);
  assert.equal(run.jobs.length, 2);
  for (const job of run.jobs) {
    const kind = job.name === 'Web and mobile quality gates' ? 'web' : 'sql';
    const bytes = read('baseline-v2-' + run.event + '-' + kind + '.log');
    assert.equal(bytes.length, job.bytes);
    assert.equal(hash(bytes), job.sha256);
  }
}
const finalStatus = git(['status', '--porcelain=v1', '--untracked-files=normal']);
const summary = {
  verifiedAt: result.finishedAt, sealedAt: new Date().toISOString(), head: result.expectedHead,
  verdict: 'PASS: no baseline drift found', passedBaselineChecks: result.passedChecks, totalBaselineChecks: result.checks.length,
  newlyExecutedApplicationTests: 0, coverage: result.coverage, remote: result.remote,
  postflight: result.postflight, manifest: result.desktopManifest, publication: result.publication,
  desktopReport: post.desktopReport, ci: result.ci.map(run => ({ event: run.event, id: run.id, attempt: run.attempt, archiveSha256: run.archiveSha256,
    jobs: run.jobs.map(job => ({ name: job.name, id: job.id, steps: job.steps, bytes: job.bytes, sha256: job.sha256 })) })),
  deployment: result.deployment, receiptComment: result.receiptComment, priorVerifierCorrection: result.priorVerifierCorrection,
  startStatus: result.startStatus, endStatus: result.endStatus, finalStatus,
  limitations: ['Baseline-only verification; no R2 feature implementation or product review.',
    'Historical CI test counts were independently read and hashed, not newly run.',
    'Desktop report checked statically only, not opened in a browser.',
    'Immutable text fingerprints use LF normalization; binary assets and recorded artifacts use raw bytes.',
    'Source working-tree edits are contextual, not baseline drift; 285 source checks use the pinned Git commit.',
    'Production/device/security/backend approval remains open as recorded in the baseline.'],
};
save('baseline-final.json', JSON.stringify(summary, null, 2) + '\n');
const lines = [
  '# R2 Common-Month Baseline Verification', '',
  '**PASS: 4,134 / 4,134 baseline checks; no baseline drift found. These are not new application tests.**', '',
  '- Exact pinned HEAD: `' + result.expectedHead + '`.',
  '- Branch: `codex/restoration/asset-heroes`; fresh remote branch and draft/open PR 256 agree, checked at start and end.',
  '- Verification completed: `' + result.finishedAt + '`.',
  '- Receipt comment `6315242743` was fetched read-only, belongs to PR 256, and names the exact HEAD.',
  '- Prior goal turn made verified progress; no goal or mission state was changed.', '',
  '## Coverage', '',
  '- 285 normalized source fingerprints from `git show <pinned HEAD>:<path>`; concurrent product edits excluded from baseline-drift judgments.',
  '- 138 current immutable tracked files: media, public assets, dependency manifests/locks, SQL/config, and CI workflows, compared against pinned Git bytes (LF-normalized text).',
  '- 189 recorded evidence files checked both from committed Git bytes and current disk bytes.',
  '- All 322 Desktop manifest files; all 324 journal targets and staged files; all 48 recoverable backups.',
  '- All 10 model/poster/video identities, all 20 vendor GLBs, current served GLBs/posters, and committed GLBs/posters.',
  '- Both complete attempt-1 CI events, four jobs, 116 successful steps, each step uniquely resolved in fetched log archives.',
  '- Each event logs 348 regressions, 145 media contracts, 27 rendered stills, 49 native browser executions (35 route + 12 portfolio + 2 input), the full contract markers, and SQL63 twice. These historical counts were not rerun.', '',
  '## Exact Local Hashes', '',
  '| Artifact | Bytes | SHA-256 |', '|---|---:|---|',
  '| Postflight | ' + result.postflight.bytes + ' | `' + result.postflight.sha256 + '` |',
  '| Desktop manifest | ' + result.desktopManifest.bytes + ' | `' + result.desktopManifest.sha256 + '` |',
  '| Desktop standalone report | 121936 | `' + hash(reportBytes) + '` |',
  '| Committed publication journal | ' + result.publication.bytes + ' | `' + result.publication.sha256 + '` |', '',
  '## Complete CI Log Hashes', '',
  '| Event / Run / Attempt | Job ID | Steps | SHA-256 |', '|---|---:|---:|---|',
];
for (const run of result.ci) for (const job of run.jobs) lines.push('| ' + run.event + ' / ' + run.id + ' / 1 | ' + job.id + ' | ' + job.steps + ' | `' + job.sha256 + '` |');
lines.push('',
  'The original CI run and attempt records, complete job/step metadata, ZIP archive SHA-256 and individual entry hashes, full normalized job logs, and historical contract summary line numbers are retained in `baseline-v2-*`. ZIP bytes stayed in memory. Log normalization is documented in `baseline-verify-v2.cjs` and `baseline-v2-results.json`.', '',
  '## Authenticated Vercel Readback', '',
  '- Deployment: `dpl_9xWRX1G7xEpNinJ88YmCPCHpnpE9`; `state=READY`, `readyState=READY`, `target=null`.',
  '- Project: `prj_AYKVLmLw6D1vZmOFPQ512WdfpM5s`.',
  '- Team-scoped request: `team_rccC7q4MEQxCAEz45598ttAe`; authenticated get_team independently resolves `islanddevcrew`.',
  '- Commit: `' + result.deployment.deployment.meta.githubCommitSha + '`.',
  '- Only selected deployment/team metadata is saved. No private environment payloads are printed or saved.', '',
  '## Verifier Correction', '',
  'The first pass retained in `baseline-results.json` had 4,127 passes and three checker false negatives, all at journal entry 322. The generated File-Manifest.json entry has no pre-publication `expected` field, only durable `after`. Revision 2 allows this only for that exact manifest target, compares it against the independently read manifest hash, and rechecks the target and staged bytes. The complete corrected pass has zero discrepancies. No baseline content was repaired or changed, and the first run was not overwritten.', '',
  '## Reproduction And Scope', '',
  'From the repo root run `node .superpowers/sdd/2026-10-21-common-month/baseline-verify-v2.cjs` with existing `gh` Navigata1 credentials and existing adm-zip installed. Outputs use exclusive creation and never overwrite evidence; for another run, use an unused baseline output prefix in a new baseline-prefixed verifier copy. Vercel metadata must be freshly selected through the read-only connector before a later reproduction.', '',
  'All writes from this sidecar are confined to new `.superpowers/sdd/2026-10-21-common-month/baseline-*` files. No application test suites, browsers, servers, dependency installs, cloud/schema changes, Git mutations, PR comments, user sessions/ports 53143 or 53144, or unrelated agents were touched. Credentials stayed in memory and existing gh config was not modified. Untracked common-month design/plan files appeared concurrently and are recorded as context only. Parent owns R2 implementation and review.', '',
  '`baseline-files.json` fingerprints all sidecar files except itself; its own hash is returned separately. The packet is supporting evidence, not production certification.', '');
save('baseline-report.md', lines.join('\n'));
const names = fs.readdirSync(OUT).filter(name => name.startsWith('baseline-') && name !== 'baseline-files.json').sort();
const files = names.map(name => {
  const file = path.join(OUT, name);
  assert.equal(fs.statSync(file).isFile(), true);
  assert.equal(git(['check-ignore', file]).trim().length > 0, true);
  const bytes = fs.readFileSync(file);
  return { name, bytes: bytes.length, sha256: hash(bytes), ignored: true };
});
save('baseline-files.json', JSON.stringify({ generatedAt: new Date().toISOString(), head: result.expectedHead,
  files, self: { name: 'baseline-files.json', note: 'Self-hash omitted; returned separately' } }, null, 2) + '\n');
const inventory = read('baseline-files.json');
for (const file of files) assert.equal(hash(read(file.name)), file.sha256);
console.log(JSON.stringify({ head: result.expectedHead, passedBaselineChecks: result.passedChecks, totalBaselineChecks: result.checks.length,
  baselineDriftFound: false, newlyExecutedApplicationTests: 0, sidecarFiles: files.length + 1, allIgnored: true,
  inventorySha256: hash(inventory), finalJsonSha256: hash(read('baseline-final.json')), reportSha256: hash(read('baseline-report.md')),
  currentWorkingTreeContext: finalStatus,
}, null, 2));
