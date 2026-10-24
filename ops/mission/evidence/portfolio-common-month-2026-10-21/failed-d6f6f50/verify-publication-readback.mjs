import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const head = 'd6f6f5010237ff1843bb73a33360445b7d094687';
const root = path.dirname(fileURLToPath(import.meta.url));
const collection = 'C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20';
const desktop = 'C:/Users/IslandDevCrew/Desktop/InterestShield-Production-Progress-2026-10-21.html';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const fingerprint = async file => {
  assert.ok((await fs.lstat(file)).isFile(), 'regular file required: ' + file);
  const bytes = await fs.readFile(file);
  return { bytes: bytes.length, sha256: digest(bytes) };
};
const receipt = await json(path.join(root, 'postflight.json'));
assert.equal(receipt.headSha, head);
assert.equal(receipt.productionReady, false);
const manifestFile = path.join(collection, 'Common-Month-d6f6f50-File-Manifest.json');
const manifest = await json(manifestFile);
assert.equal(manifest.headSha, head);
assert.equal(manifest.receipt, receipt.receipt);
for (const [file, expected] of Object.entries(manifest.files)) {
  const relative = path.relative(collection, path.resolve(collection, file));
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  assert.deepEqual(await fingerprint(path.join(collection, file)), expected, file);
}
const journal = await json(receipt.desktopReport.publicationJournal);
assert.equal(journal.state, 'committed');
assert.equal(journal.id, 'desktop-publication-' + head);
assert.equal(journal.files.length, Object.keys(manifest.files).length + 2);
assert.equal(path.resolve(journal.files.at(-1).target), path.resolve(desktop));
const targets = new Set();
for (const entry of journal.files) {
  const target = path.resolve(entry.target).toLowerCase();
  assert.ok(!targets.has(target)); targets.add(target);
  assert.deepEqual(entry.after, entry.expected);
  assert.deepEqual(await fingerprint(entry.target), entry.after);
  assert.deepEqual(await fingerprint(entry.staged), entry.after);
  if (entry.before) assert.deepEqual(await fingerprint(entry.backup), entry.before);
}
assert.deepEqual(await fingerprint(desktop), {bytes: receipt.desktopReport.bytes, sha256: receipt.desktopReport.sha256});
const prior = await json('.superpowers/sdd/2026-10-21-mobile-vitals/postflight.json');
const priorDesktopBackup = journal.files.find(entry => path.resolve(entry.target) === path.resolve(desktop));
assert.equal(priorDesktopBackup.before.sha256, prior.desktopReport.sha256);
assert.equal(digest(await fs.readFile('ops/mission/state.json')), receipt.desktopReport.sourcePreflightStateSha256);
const projectedFile = path.join(collection, 'Common-Month-d6f6f50-Evidence/report-projection/state.json');
assert.equal(digest(await fs.readFile(projectedFile)), receipt.desktopReport.projectedStateSha256);
const projected = await json(projectedFile);
const gates = projected.phases.flatMap(phase => phase.gates);
assert.equal(gates.find(gate => gate.id === 'R0-G3').status, 'passed');
assert.equal(gates.filter(gate => gate.status === 'passed').length, 21);
assert.ok(projected.phases.some(phase => phase.status !== 'complete'));
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(), head);
assert.equal(execFileSync('git', ['status', '--porcelain'], {encoding:'utf8'}).trim(), '');
execFileSync(process.execPath, ['.superpowers/sdd/2026-10-20-native-portfolio/verify-report.mjs', desktop], {stdio:'inherit', windowsHide:true});
const result = {verifiedAt:new Date().toISOString(), headSha:head, files:Object.keys(manifest.files).length,
  journalEntries:journal.files.length, recoverableBackups:journal.files.filter(entry => entry.before).length,
  manifest:await fingerprint(manifestFile), journal:await fingerprint(receipt.desktopReport.publicationJournal),
  desktop:await fingerprint(desktop), sourceStateUnchanged:true, passedGates:21, totalGates:gates.length,
  productionReady:false, scope:'Independent staged/current/backup byte readback and static HTML checks, not whole-set crash or sealed runtime certification'};
await fs.writeFile(path.join(root, 'publication-readback.json'), JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
