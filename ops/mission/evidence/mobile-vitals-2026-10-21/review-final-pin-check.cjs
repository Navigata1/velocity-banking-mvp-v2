const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const out = __dirname, repo = process.cwd();
const evidence = JSON.parse(fs.readFileSync(path.join(out, 'review-final-evidence.json'), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const currentHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();
const code = Object.keys(evidence.initialHashes).filter(n => !n.startsWith('docs/'));
const currentHashes = Object.fromEntries(code.map(n => [n, sha(fs.readFileSync(path.join(repo, n)))]));
assert.equal(currentHead, evidence.head); assert.equal(currentHead, evidence.finalHead);
for (const file of code) {
  assert.equal(evidence.initialHashes[file], evidence.finalHashes[file], `${file}: unchanged during browser run`);
  assert.equal(currentHashes[file], evidence.finalHashes[file], `${file}: unchanged after browser run`);
}
assert.equal(evidence.mutants.length, 12);
assert.ok(evidence.mutants.every(m => m.rejected));
assert.equal(evidence.positives.length, 8);
assert.ok(evidence.positives.every(p => p.accepted && p.independentPaintAndFit && p.hero.loaded && p.hero.visibleHeight >= 48));
assert.ok(evidence.positives.filter(p => p.browserErrors).every(p => p.browserErrors.length === 0));
assert.ok(evidence.serverStopped && evidence.oldReviewArtifactsUnchanged && evidence.desktopComparison.samePixels && evidence.desktopComparison.sameLayout);
const doc = 'docs/mobile-vitals-contract-2026-10-21.md';
const receipt = { command: 'node .superpowers/sdd/2026-10-21-mobile-vitals/review-final-pin-check.cjs', checked: new Date().toISOString(),
  currentHead, codeHashes: currentHashes, codeStable: true, priorReviewArtifactsUnchanged: true,
  browserProbeExit: 1, browserProbeReason: 'Only untracked contract documentation changed during browser run; original broad checksum guard failed, all 8 positives and 12 controls passed',
  document: { path: doc, initial: evidence.initialHashes[doc], afterProbe: evidence.finalHashes[doc], current: sha(fs.readFileSync(path.join(repo, doc))) },
  positives: 8, mutantsRejected: 12, desktopSameLayoutAndPixels: true, serverStopped: true };
fs.writeFileSync(path.join(out, 'review-final-pin-check.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
