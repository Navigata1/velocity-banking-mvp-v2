const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const Zip = require(require.resolve('adm-zip', { paths: [path.resolve('apps/media')] }));

const HEAD = 'caefd8086180513b3fb6c1cf85492174996a437b';
const BRANCH = 'codex/restoration/asset-heroes';
const REPO = 'Navigata1/velocity-banking-mvp-v2';
const OUT = path.resolve('.superpowers/sdd/2026-10-21-mobile-vitals');
const CUSTOM = path.resolve('.superpowers/sdd/2026-10-21-custom');
const DESKTOP = 'C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20';
const EVIDENCE = 'ops/mission/evidence/custom-2026-10-21';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const norm = b => b.toString('utf8').replace(/\r\n?/g, '\n');
const read = p => fs.readFileSync(p);
const json = p => JSON.parse(read(p));
const git = args => execFileSync('git', args, { windowsHide: true, maxBuffer: 128 * 1024 * 1024 });
const save = (name, bytes) => {
  if (!/^baseline-[\w.-]+$/.test(name)) throw new Error('Output name outside sidecar allowance');
  const dest = path.join(OUT, name);
  execFileSync('git', ['check-ignore', '--quiet', dest], { windowsHide: true });
  fs.writeFileSync(dest, bytes);
};
const saveJson = (name, data) => save(name, JSON.stringify(data, null, 2) + '\n');
const result = { verifiedAt: new Date().toISOString(), expectedHead: HEAD, checks: [], discrepancies: [], notes: [], ci: [], artifacts: [] };
function check(label, actual, expected) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  const item = { label, passed, actual, expected };
  result.checks.push(item);
  if (!passed) result.discrepancies.push(item);
  return passed;
}
function bytesCheck(label, bytes, expected) {
  const actual = { bytes: bytes.length, sha256: hash(bytes) };
  check(label + ' SHA-256', actual.sha256, expected.sha256);
  if (expected.bytes !== undefined) check(label + ' bytes', actual.bytes, expected.bytes);
  result.artifacts.push({ label, ...actual });
  return actual;
}
function safeRead(label, file) {
  try { return read(file); } catch (e) { check(label + ' readable', e.code, 'readable'); return null; }
}
function headBatch(paths) {
  const unique = [...new Set(paths)];
  const raw = execFileSync('git', ['cat-file', '--batch'], {
    input: unique.map(p => HEAD + ':' + p + '\n').join(''), windowsHide: true, maxBuffer: 192 * 1024 * 1024,
  });
  const found = new Map();
  let offset = 0;
  for (const file of unique) {
    const end = raw.indexOf(10, offset);
    const header = raw.subarray(offset, end).toString();
    offset = end + 1;
    const parts = header.split(' ');
    if (parts.at(-1) === 'missing') { check('HEAD path exists: ' + file, false, true); continue; }
    const size = Number(parts.at(-1));
    found.set(file, raw.subarray(offset, offset + size));
    offset += size + 1;
  }
  return found;
}

async function main() {
  const startHead = git(['rev-parse', 'HEAD']).toString().trim();
  check('current exact HEAD', startHead, HEAD);
  check('branch', git(['branch', '--show-current']).toString().trim(), BRANCH);
  check('origin URL', git(['remote', 'get-url', 'origin']).toString().trim(), 'https://github.com/' + REPO + '.git');
  check('local origin ref', git(['rev-parse', 'origin/' + BRANCH]).toString().trim(), HEAD);
  result.startStatus = git(['status', '--porcelain=v1']).toString();
  save('baseline-git-start.log', result.startStatus || '(clean)\n');
  const postBytes = read(path.join(CUSTOM, 'postflight.json'));
  const post = JSON.parse(postBytes);
  result.postflight = { path: path.join(CUSTOM, 'postflight.json'), sha256: hash(postBytes), verifiedAt: post.verifiedAt };
  check('postflight head', post.headSha, HEAD);
  check('postflight productionReady', post.productionReady, false);
  check('normalized fingerprint count', Object.keys(post.local.sources).length, 285);
  check('committed evidence count', Object.keys(post.local.files).length, 109);
  const manifestPath = path.join(DESKTOP, 'Custom-caefd80-File-Manifest.json');
  const manifestBytes = read(manifestPath), manifest = JSON.parse(manifestBytes);
  result.desktopManifest = { path: manifestPath, sha256: hash(manifestBytes) };
  check('Desktop manifest head', manifest.headSha, HEAD);
  check('Desktop manifest receipt', manifest.receipt, post.receipt);
  check('Desktop manifest count', Object.keys(manifest.files).length, 198);
  for (const [file, expected] of Object.entries(manifest.files)) {
    const dest = path.resolve(DESKTOP, file);
    if (!dest.startsWith(path.resolve(DESKTOP) + path.sep)) throw new Error('Manifest path escaped collection');
    const bytes = safeRead('Desktop ' + file, dest);
    if (bytes) bytesCheck('Desktop ' + file, bytes, expected);
  }

  const modelsFile = 'apps/media/hero-models.json';
  const sourcePaths = Object.keys(post.local.sources);
  const evidencePaths = Object.keys(post.local.files).map(p => EVIDENCE + '/' + p);
  const extra = [modelsFile, 'apps/media/hero-imported.json', 'apps/media/hero-provenance.json',
    EVIDENCE + '/artifact-receipt.json', EVIDENCE + '/turntable-verification.json',
    'ops/mission/state.json', 'ops/mission/render-sotu.mjs'];
  const ids = ['car', 'house', 'land', 'creditCard', 'studentLoan', 'medical', 'personal', 'recreation', 'custom', 'vault'];
  const head = headBatch([...sourcePaths, ...evidencePaths, ...extra, ...ids.flatMap(id => [
    `apps/web/public/heroes/${id}.glb`, `apps/web/public/heroes/${id}.webp`,
  ])]);
  for (const [file, expected] of Object.entries(post.local.sources)) {
    if (head.has(file)) check('HEAD normalized source ' + file, hash(norm(head.get(file))), expected);
  }
  for (const [file, expected] of Object.entries(post.local.files)) {
    const bytes = head.get(EVIDENCE + '/' + file);
    if (bytes) bytesCheck('HEAD evidence ' + file, bytes, expected);
    const current = safeRead('current committed evidence ' + file, EVIDENCE + '/' + file);
    if (current) bytesCheck('current committed evidence ' + file, current, expected);
  }
  check('HEAD preflight receipt equals postflight.local', JSON.parse(head.get(EVIDENCE + '/artifact-receipt.json')), post.local);
  check('Desktop verification equals postflight', json(path.join(DESKTOP, 'Custom-caefd80-Verification.json')), post);
  bytesCheck('Desktop progress report', read(post.desktopReport.path), post.desktopReport);
  check('HEAD source preflight state hash', hash(head.get('ops/mission/state.json')), post.desktopReport.sourcePreflightStateSha256);
  const renderer = head.get('ops/mission/render-sotu.mjs');
  const checkoutRenderer = read('ops/mission/render-sotu.mjs');
  check('checkout renderer raw hash', hash(checkoutRenderer), post.desktopReport.unchangedRendererSha256);
  check('HEAD renderer normalized equals recorded checkout', hash(norm(renderer)), hash(norm(checkoutRenderer)));
  check('HEAD renderer CRLF reproduction of recorded raw hash', hash(norm(renderer).replace(/\n/g, '\r\n')), post.desktopReport.unchangedRendererSha256);
  result.renderer = { headBytes: renderer.length, headSha256: hash(renderer), checkoutBytes: checkoutRenderer.length,
    checkoutSha256: hash(checkoutRenderer), normalizedSha256: hash(norm(renderer)),
    note: 'Receipt renderer hash is raw CRLF checkout bytes; Git blob uses LF. Normalized contents match exactly.' };
  check('projected state hash', hash(read(path.join(CUSTOM, 'desktop-postflight/state.json'))), post.desktopReport.projectedStateSha256);
  check('projection report equals Desktop', hash(read(path.join(CUSTOM, 'desktop-postflight/state-of-the-union.html'))), post.desktopReport.sha256);

  const models = JSON.parse(head.get(modelsFile));
  const posters = JSON.parse(head.get('apps/media/hero-provenance.json'));
  const videos = JSON.parse(head.get(EVIDENCE + '/turntable-verification.json'));
  check('model IDs', models.map(m => m.id).sort(), [...ids].sort());
  check('poster IDs', posters.map(m => m.id).sort(), [...ids].sort());
  check('video IDs', videos.map(m => m.id).sort(), [...ids].sort());
  const byId = records => [...records].sort((a,b) => a.id.localeCompare(b.id));
  const imported = JSON.parse(head.get('apps/media/hero-imported.json'));
  check('HEAD imported records equal model records by ID', byId(imported), byId(models));
  result.notes.push('hero-imported.json and hero-models.json list the same ten exact records in different orders; comparison is keyed by ID.');
  check('current model records equal HEAD', json(modelsFile), models);
  check('current video records equal HEAD evidence', json('apps/media/hyperframes/output/heroes/verification.json'), videos);
  check('postflight video snapshots equal committed evidence', post.local.rebuild.videoSnapshots, videos);
  for (const model of models) {
    const id = model.id, poster = posters.find(p => p.id === id), video = videos.find(v => v.id === id);
    const served = post.hosted.served.find(p => p.id === id);
    check(id + ' postflight served hash', served.sha256, model.sha256);
    bytesCheck('HEAD model ' + id, head.get(`apps/web/public/heroes/${id}.glb`), model);
    bytesCheck('HEAD poster ' + id, head.get(`apps/web/public/heroes/${id}.webp`), { bytes: poster.bytes, sha256: poster.posterSha256 });
    for (const root of ['apps/web/public/heroes', 'apps/media/hyperframes/vendor/heroes', 'apps/media/hero-turntables/vendor/heroes']) {
      const file = `${root}/${id}.glb`, bytes = safeRead('current ' + file, file);
      if (bytes) bytesCheck('current ' + file, bytes, model);
    }
    const videoFile = `apps/media/hyperframes/output/heroes/${id}.mp4`;
    const videoBytes = safeRead('current video ' + id, videoFile);
    if (videoBytes) bytesCheck('current video ' + id, videoBytes, video);
    const posterFile = `apps/web/public/heroes/${id}.webp`;
    const posterBytes = safeRead('current poster ' + id, posterFile);
    if (posterBytes) bytesCheck('current poster ' + id, posterBytes, { bytes: poster.bytes, sha256: poster.posterSha256 });
  }

  const depBytes = read(path.join(CUSTOM, 'deployment-final.json')), dep = JSON.parse(depBytes);
  result.priorDeployment = { sha256: hash(depBytes), ...dep };
  check('prior deployment equals postflight deployment', dep, post.deployment);
  const freshEnvelope = json(path.join(OUT, 'baseline-vercel-response.json'));
  const fresh = JSON.parse(freshEnvelope.content.find(c => c.type === 'text').text).result.deployment;
  check('fresh deployment ID', fresh.id, dep.id);
  check('fresh deployment state', fresh.readyState, 'READY');
  check('fresh deployment state field', fresh.state, 'READY');
  check('fresh deployment project', fresh.project.id, 'prj_AYKVLmLw6D1vZmOFPQ512WdfpM5s');
  check('fresh deployment URL and scope', fresh.url, 'velocity-banking-mvp-v2-btrr3qe0h-islanddevcrew.vercel.app');
  check('prior deployment scope', dep.scope, 'islanddevcrew');
  check('fresh deployment target', fresh.target, null);
  check('fresh deployment SHA', fresh.meta.githubCommitSha, HEAD);
  check('fresh deployment branch', fresh.meta.githubCommitRef, BRANCH);
  check('fresh deployment GitHub repo', fresh.meta.githubOrg + '/' + fresh.meta.githubRepo, REPO);
  const projectEnvelope = json(path.join(OUT, 'baseline-vercel-project.json'));
  const teamEnvelope = json(path.join(OUT, 'baseline-vercel-team.json'));
  const project = JSON.parse(projectEnvelope.content.find(c => c.type === 'text').text).result;
  const team = JSON.parse(teamEnvelope.content.find(c => c.type === 'text').text).result.team;
  check('fresh project ID', project.id, fresh.project.id);
  check('fresh project account equals team ID', project.accountId, team.id);
  check('fresh team ID', team.id, 'team_rccC7q4MEQxCAEz45598ttAe');
  check('fresh team slug', team.slug, 'islanddevcrew');
  check('fresh project latest deployment ID', project.latestDeployment.id, fresh.id);
  result.notes.push('Fresh deployment/project requests explicitly used slug=islanddevcrew; project accountId resolves to the independently retrieved islanddevcrew team ID.');

  // Credential remains only in memory; requests are GET-only and signed redirects are not persisted.
  const token = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com', '--user', 'Navigata1'], {
    windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  async function api(endpoint, binary = false) {
    const response = await fetch('https://api.github.com/' + endpoint, {
      method: 'GET', redirect: 'manual', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    let final = response;
    if (response.status === 302) final = await fetch(response.headers.get('location'), { method: 'GET' });
    if (!final.ok) throw new Error('GitHub GET ' + endpoint + ' returned ' + final.status);
    return binary ? Buffer.from(await final.arrayBuffer()) : final.json();
  }
  const remoteRef = await api(`repos/${REPO}/git/ref/heads/${BRANCH}`);
  saveJson('baseline-origin-ref.json', remoteRef);
  check('fresh origin branch SHA', remoteRef.object.sha, HEAD);
  const pr = await api(`repos/${REPO}/pulls/256`);
  saveJson('baseline-pr256.json', pr);
  check('PR number', pr.number, 256);
  check('PR open', pr.state, 'open');
  check('PR draft', pr.draft, true);
  check('PR HEAD', pr.head.sha, HEAD);
  check('PR source branch', pr.head.ref, BRANCH);
  check('PR source repo', pr.head.repo.full_name, REPO);
  check('PR target repo', pr.base.repo.full_name, REPO);
  check('PR target branch', pr.base.ref, 'main');

  const fullContracts = [
    '15 explicit APR unit contracts passed.', '17 portable Portfolio book contracts passed.',
    '22 canonical Portfolio persistence contracts passed.', '3 real-store Portfolio persistence contracts passed.',
    '19 native input draft contracts passed.', '9 Portfolio encrypted storage contracts passed.',
    '14 owner-scoped Portfolio storage contracts passed.', '13 Portfolio lifecycle contracts passed.',
    '8 whole-book Portfolio model contracts passed.', '7 Portfolio hook contracts: 7 passed, 0 failed.',
    '16 portable Portfolio transfer contracts passed.', '18 paired Portfolio snapshot contracts passed.',
    '16 Recovery hook contracts: 16 passed, 0 failed.', '11 Recovery review UI contracts: 11 passed, 0 failed.',
  ];
  for (const [event, id] of [['push', 39581976729], ['pull_request', 39581984357]]) {
    const run = await api(`repos/${REPO}/actions/runs/${id}`);
    const attempt = await api(`repos/${REPO}/actions/runs/${id}/attempts/1`);
    const jobsResponse = await api(`repos/${REPO}/actions/runs/${id}/attempts/1/jobs?per_page=100`);
    const jobs = jobsResponse.jobs;
    saveJson(`baseline-${event}-metadata.json`, { run, attempt, jobs: jobsResponse });
    for (const [name, value, expected] of [
      ['event', run.event, event], ['head', run.head_sha, HEAD], ['branch', run.head_branch, BRANCH],
      ['status', run.status, 'completed'], ['conclusion', run.conclusion, 'success'],
      ['attempt', run.run_attempt, 1], ['attempt1 head', attempt.head_sha, HEAD],
      ['attempt1 status', attempt.status, 'completed'], ['attempt1 conclusion', attempt.conclusion, 'success'],
      ['job count', jobsResponse.total_count, 2], ['workflow name', run.name, 'CI'],
      ['workflow path', run.path, '.github/workflows/ci.yml'], ['repository', run.repository.full_name, REPO],
    ]) check(event + ' ' + name, value, expected);
    const zipBytes = await api(`repos/${REPO}/actions/runs/${id}/attempts/1/logs`, true);
    save(`baseline-${event}-attempt1-raw.zip`, zipBytes);
    const zip = new Zip(zipBytes);
    const runResult = { event, id, attempt: run.run_attempt, url: run.html_url, archiveSha256: hash(zipBytes), jobs: [] };
    for (const job of jobs) {
      check(event + ' job status ' + job.name, job.status, 'completed');
      check(event + ' job conclusion ' + job.name, job.conclusion, 'success');
      check(event + ' job head ' + job.name, job.head_sha, HEAD);
      const kind = job.name === 'Web and mobile quality gates' ? 'web' : 'sql';
      check(event + ' known job name ' + kind, job.name, kind === 'web' ? 'Web and mobile quality gates' : 'Isolated SQL and owner isolation');
      check(event + ' prior receipt job ID ' + kind, job.id, post.ci.find(c => c.event === event).jobs.find(j => j.name === job.name).databaseId);
      const parts = [], stepTexts = {};
      for (const step of job.steps) {
        check(`${event} ${kind} step ${step.number} ${step.name}`, step.conclusion, 'success');
        const entry = zip.getEntries().find(e => e.entryName.startsWith(`${job.name}/${step.number}_`) && e.entryName.endsWith('.txt'));
        if (!entry) { check(`${event} ${kind} archive step ${step.number} exists`, false, true); continue; }
        const text = entry.getData().toString('utf8').replace(/\r\n?/g, '\n');
        stepTexts[step.name] = text;
        // Match gh's ScanLines and visible ESC rendering, retaining internal empty lines and BOMs.
        const lines = text.replace(/\x1b/g, '^[').split('\n');
        if (lines.at(-1) === '') lines.pop();
        for (const line of lines) parts.push(`${job.name}\t${step.name}\t${line}\n`);
      }
      const log = parts.join('');
      save(`baseline-${event}-${kind}.log`, log);
      const prior = post.ci.find(c => c.event === event);
      check(`${event} ${kind} fresh full archive log hash`, hash(log), prior[kind + 'LogSha256']);
      check(`${event} ${kind} original scratch log hash`, hash(read(path.join(CUSTOM, `ci-${event}-${kind}.log`))), prior[kind + 'LogSha256']);
      const jobResult = { name: job.name, id: job.id, bytes: Buffer.byteLength(log), sha256: hash(log), steps: job.steps.length };
      if (kind === 'web') {
        for (const phrase of ['348 regression tests passed.', 'Rendered 27 Remotion matrix stills.',
          'Custom front lug physically seats the closed bail with a real empty ring aperture',
          'Collection packaging delivers validated source and manifest snapshots despite source-path changes', ...fullContracts]) {
          check(event + ' full-log marker: ' + phrase, log.includes(phrase), true);
        }
        const media = stepTexts['Check media identity contracts'] || '';
        for (const phrase of ['# tests 145', '# pass 145', '# fail 0', '# skipped 0', '# cancelled 0']) check(event + ' media ' + phrase, media.includes(phrase), true);
        const browser = stepTexts['Smoke rendered Expo accessibility'] || '';
        const native = { routes: (browser.match(/\bPASS (?:compact-|phone-|tablet-)/g) || []).length,
          portfolio: (browser.match(/\bPASS native portfolio /g) || []).length,
          inputs: (browser.match(/\bPASS native financial inputs /g) || []).length };
        check(event + ' native route executions', native.routes, 35);
        check(event + ' native portfolio executions', native.portfolio, 12);
        check(event + ' native input executions', native.inputs, 2);
        check(event + ' native browser total', Object.values(native).reduce((a,b) => a+b, 0), 49);
        jobResult.native = native;
        jobResult.summaryLines = log.split('\n').map((line, index) => ({ line: index + 1, text: line }))
          .filter(x => !x.text.includes('TIMING ') && /contracts.*pass|# (?:tests|pass|fail|cancelled|skipped) \d+|regression tests passed|Rendered 27|reference lane passed|\bPASS (?:native portfolio|native financial inputs|compact-|phone-|tablet-)/.test(x.text));
      } else {
        const sqlCount = (log.match(/Tests=63\b/g) || []).length;
        check(event + ' SQL63 executions', sqlCount, 2);
        check(event + ' SQL successful test results', (log.match(/Result: PASS/g) || []).length, 2);
        jobResult.sqlExecutions = sqlCount;
        jobResult.summaryLines = log.split('\n').map((line, index) => ({ line: index + 1, text: line })).filter(x => /Tests=63\b|Result: PASS/.test(x.text));
      }
      runResult.jobs.push(jobResult);
    }
    result.ci.push(runResult);
  }
  check('postflight unchanged during verification', hash(read(path.join(CUSTOM, 'postflight.json'))), hash(postBytes));
  check('HEAD unchanged during verification', git(['rev-parse', 'HEAD']).toString().trim(), HEAD);
  result.endStatus = git(['status', '--porcelain=v1']).toString();
  save('baseline-git-end.log', result.endStatus || '(clean)\n');
  result.notes.push('Working-tree changes are contextual only; all 285 source checks and committed evidence checks use fixed Git HEAD bytes. No application tests, renderers, browsers, deployments or CI jobs were rerun.');
  result.finishedAt = new Date().toISOString();
  result.passedChecks = result.checks.filter(c => c.passed).length;
  saveJson('baseline-results.json', result);
  console.log(JSON.stringify({ head: HEAD, passedChecks: result.passedChecks, checks: result.checks.length,
    discrepancies: result.discrepancies.map(d => ({ ...d, actual: JSON.stringify(d.actual).slice(0,500), expected: JSON.stringify(d.expected).slice(0,500) })),
    startStatus: result.startStatus, endStatus: result.endStatus, ci: result.ci.map(r => ({ event:r.event,id:r.id,jobs:r.jobs.map(j => ({ name:j.name,id:j.id,sha256:j.sha256 })) })) }, null, 2));
  process.exitCode = result.discrepancies.length ? 2 : 0;
}
main().catch(error => {
  result.fatal = { name: error.name, message: error.message };
  result.finishedAt = new Date().toISOString();
  saveJson('baseline-results.json', result);
  console.error(JSON.stringify(result.fatal));
  process.exitCode = 1;
});
