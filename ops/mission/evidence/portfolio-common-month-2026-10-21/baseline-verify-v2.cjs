const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = __dirname;
const HEAD = '1aec5bf7be3d0f3c26079141245e4c7291fd8778';
const BRANCH = 'codex/restoration/asset-heroes';
const REPO = 'Navigata1/velocity-banking-mvp-v2';
const PRIOR = path.join(ROOT, '.superpowers/sdd/2026-10-21-mobile-vitals');
const EVIDENCE = 'ops/mission/evidence/mobile-vitals-wrap-2026-10-21';
const DESKTOP = 'C:/Users/IslandDevCrew/Desktop/InterestShield-Hero-Collection-2026-10-20';
const IDS = ['car', 'house', 'land', 'creditCard', 'studentLoan', 'medical', 'personal', 'recreation', 'custom', 'vault'];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const norm = b => b.toString('utf8').replace(/\r\n?/g, '\n');
const read = file => fs.readFileSync(path.resolve(ROOT, file));
const json = file => JSON.parse(read(file));
const git = args => execFileSync('git', args, {
  cwd: ROOT, windowsHide: true, maxBuffer: 256 * 1024 * 1024,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
});
const headCache = new Map();
function head(file) {
  if (!headCache.has(file)) headCache.set(file, git(['show', HEAD + ':' + file]));
  return headCache.get(file);
}
let token = '';
const result = {
  verifiedAt: new Date().toISOString(), expectedHead: HEAD, mode: 'read-only-baseline-checks-not-new-app-tests',
  verifierRevision: 2,
  priorVerifierCorrection: { priorResults: 'baseline-results.json', falseNegatives: 3, explanation: 'Journal entry 322 is the generated File-Manifest.json. It intentionally has no pre-publication expected field; its durable after hash must match the independently read manifest. The initial verifier incorrectly required that absent field. Original run and logs are preserved.' },
  checks: [], discrepancies: [], ci: [], artifacts: [], sourceFingerprints: [], invariantFingerprints: [], notes: [
    'All 285 source fingerprints use git show <pinned HEAD>:<path>, not the concurrent product working tree.',
    'No application tests, browsers, servers, renders, dependency installs, cloud writes, schema operations, Git writes, PR mutations, or comments were run.',
    'GitHub credentials are captured in process memory from the existing Navigata1 gh account, never printed, saved, switched, or reconfigured.',
    'CI log normalization reproduces gh scan-lines output: LF endings, ESC rendered as ^[, job and step tab prefixes, one trailing newline per line. Raw ZIP archive and individual entry hashes are recorded; ZIPs stay in memory.',
    'Historical CI assertion counts are revalidated from fetched logs and must not be reported as tests newly executed by this sidecar.',
    'Prior goal turn made verified progress. This verification does not change goal or mission state.',
  ],
};
function check(label, actual, expected) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  const item = { label, passed, actual, expected };
  result.checks.push(item);
  if (!passed) result.discrepancies.push(item);
  return passed;
}
function save(name, value) {
  if (!/^baseline-[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('Output name outside baseline allowance');
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (token && bytes.includes(Buffer.from(token))) throw new Error('Credential detected in output; refused');
  fs.writeFileSync(path.join(OUT, name.replace(/^baseline-/, 'baseline-v2-')), bytes, { flag: 'wx' });
}
const saveJson = (name, value) => save(name, JSON.stringify(value, null, 2) + '\n');
function bytesCheck(label, bytes, expected) {
  const actual = { bytes: bytes.length, sha256: hash(bytes) };
  check(label + ' SHA-256', actual.sha256, expected.sha256);
  check(label + ' bytes', actual.bytes, expected.bytes);
  result.artifacts.push({ label, ...actual });
  return actual;
}
function fileCheck(label, file, expected) {
  try { return bytesCheck(label, read(file), expected); }
  catch (error) { check(label + ' readable', error.code || error.name, 'readable'); return null; }
}
function within(root, file) {
  const resolved = path.resolve(root, file);
  if (!resolved.toLowerCase().startsWith(path.resolve(root).toLowerCase() + path.sep)) throw new Error('Evidence path outside root');
  return resolved;
}
function status() { return git(['status', '--porcelain=v1', '--untracked-files=normal']).toString(); }
function finish() {
  result.finishedAt = new Date().toISOString();
  result.passedChecks = result.checks.filter(c => c.passed).length;
  result.failedChecks = result.discrepancies.length;
  saveJson('baseline-results.json', result);
  console.log(JSON.stringify({ expectedHead: HEAD, passedBaselineChecks: result.passedChecks,
    totalBaselineChecks: result.checks.length, failedBaselineChecks: result.failedChecks,
    coverage: result.coverage, fatal: result.fatal, discrepancies: result.discrepancies,
    ci: result.ci.map(r => ({ event: r.event, id: r.id, attempt: r.attempt, jobs: r.jobs.map(j => ({ name: j.name, id: j.id, sha256: j.sha256 })) })),
  }, null, 2));
}
async function main() {
  check('current exact HEAD', git(['rev-parse', 'HEAD']).toString().trim(), HEAD);
  check('current branch', git(['branch', '--show-current']).toString().trim(), BRANCH);
  check('origin URL', git(['remote', 'get-url', 'origin']).toString().trim(), 'https://github.com/' + REPO + '.git');
  result.startStatus = status();
  save('baseline-git-start.log', result.startStatus || '(clean)\n');
  const postBytes = read(path.join(PRIOR, 'postflight.json'));
  const post = JSON.parse(postBytes);
  result.postflight = { path: path.join(PRIOR, 'postflight.json'), bytes: postBytes.length, sha256: hash(postBytes) };
  check('postflight head', post.headSha, HEAD);
  check('postflight productionReady remains false', post.productionReady, false);
  check('source fingerprint count', Object.keys(post.local.sources).length, 285);
  for (const [file, expected] of Object.entries(post.local.sources)) {
    const bytes = head(file);
    const fingerprint = { file, bytes: bytes.length, sha256: hash(bytes), normalizedSha256: hash(norm(bytes)), expectedNormalizedSha256: expected };
    result.sourceFingerprints.push(fingerprint);
    check('HEAD normalized source ' + file, fingerprint.normalizedSha256, expected);
  }
  const tree = git(['ls-tree', '-r', '--name-only', HEAD]).toString().trim().split('\n');
  const invariantPaths = tree.filter(file => /^(?:apps\/media\/|apps\/web\/public\/|\.github\/|supabase\/)|(?:^|\/)(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$|\.sql$/.test(file));
  const binary = /\.(?:png|jpe?g|webp|gif|ico|glb|mp4|woff2?|ttf|otf|pdf)$/i;
  for (const file of invariantPaths) {
    const baseline = head(file);
    try {
      const current = read(file);
      const normalized = !binary.test(file);
      const actual = hash(normalized ? norm(current) : current);
      const expected = hash(normalized ? norm(baseline) : baseline);
      result.invariantFingerprints.push({ file, normalization: normalized ? 'LF-only' : 'raw-bytes', actual, expected });
      check('current invariant ' + file, actual, expected);
    } catch (error) { check('current invariant readable ' + file, error.code || error.name, 'readable'); }
  }
  check('HEAD artifact receipt equals postflight.local', JSON.parse(head(EVIDENCE + '/artifact-receipt.json')), post.local);
  for (const [file, expected] of Object.entries(post.local.files)) {
    bytesCheck('HEAD evidence ' + file, head(EVIDENCE + '/' + file), expected);
    fileCheck('current recorded evidence ' + file, EVIDENCE + '/' + file, expected);
  }

  const manifestPath = path.join(DESKTOP, 'Mobile-Vitals-1aec5bf-File-Manifest.json');
  const manifestBytes = read(manifestPath), manifest = JSON.parse(manifestBytes);
  result.desktopManifest = { path: manifestPath, bytes: manifestBytes.length, sha256: hash(manifestBytes) };
  check('Desktop manifest exact head', manifest.headSha, HEAD);
  check('Desktop manifest receipt', manifest.receipt, post.receipt);
  check('Desktop manifest file count', Object.keys(manifest.files).length, 322);
  for (const [file, expected] of Object.entries(manifest.files)) fileCheck('Desktop manifest ' + file, within(DESKTOP, file), expected);
  const verificationPath = path.join(DESKTOP, 'Mobile-Vitals-1aec5bf-Verification.json');
  check('Desktop verification equals postflight', json(verificationPath), post);
  fileCheck('standalone Desktop report', post.desktopReport.path, post.desktopReport);
  check('report committed preflight state hash', hash(head('ops/mission/state.json')), post.desktopReport.sourcePreflightStateSha256);
  check('report projected state hash', hash(read(path.join(PRIOR, 'desktop-postflight/state.json'))), post.desktopReport.projectedStateSha256);
  fileCheck('projected report equals Desktop', path.join(PRIOR, 'desktop-postflight/state-of-the-union.html'), post.desktopReport);
  const renderer = read('ops/mission/render-sotu.mjs');
  check('current renderer raw hash', hash(renderer), post.desktopReport.unchangedRendererSha256);
  check('HEAD renderer normalized equals current', hash(norm(head('ops/mission/render-sotu.mjs'))), hash(norm(renderer)));
  const reportText = read(post.desktopReport.path).toString('utf8');
  const scripts = [...reportText.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const executable = scripts.filter(m => !/\btype\s*=\s*["']application\/json["']/i.test(m[1]));
  let parsedScripts = 0;
  for (const match of executable) { new vm.Script(match[2], { filename: 'baseline-report-inline.js' }); parsedScripts++; }
  check('report inline scripts statically parse (not executed)', parsedScripts, post.desktopReport.inlineScriptsParsed);
  const external = [...reportText.matchAll(/<(?:script|img|iframe|video|audio|source|link)\b[^>]*\b(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+["']/gi)];
  check('report external runtime resource tags', external.length, post.desktopReport.externalRuntimeResources);

  const journalPath = post.desktopReport.publicationJournal;
  const journalBytes = read(journalPath), journal = JSON.parse(journalBytes);
  result.publication = { path: journalPath, bytes: journalBytes.length, sha256: hash(journalBytes), entries: journal.files.length, backups: journal.files.filter(f => f.before).length };
  check('publication journal ID', journal.id, 'desktop-publication-' + HEAD);
  check('publication journal state', journal.state, 'committed');
  check('publication journal entries', journal.files.length, 324);
  check('publication journal backups', journal.files.filter(f => f.before).length, 48);
  check('publication targets unique', new Set(journal.files.map(f => path.resolve(f.target).toLowerCase())).size, 324);
  for (const [index, entry] of journal.files.entries()) {
    const target = path.resolve(entry.target);
    const isGeneratedManifest = target === path.resolve(manifestPath);
    const expected = entry.expected || (isGeneratedManifest ? { bytes: manifestBytes.length, sha256: hash(manifestBytes) } : undefined);
    if (!entry.expected) {
      check('only generated manifest has no pre-publication expected hash ' + index, isGeneratedManifest, true);
      check('generated manifest journal after agrees with captured manifest', entry.after, expected);
    }
    if (target !== path.resolve(post.desktopReport.path)) within(DESKTOP, target);
    within(PRIOR, entry.staged);
    check('publication after equals expected ' + index, entry.after, expected);
    fileCheck('publication target ' + index, target, expected);
    fileCheck('publication staged ' + index, entry.staged, expected);
    if (entry.before) fileCheck('publication recoverable backup ' + index, within(path.dirname(journalPath), entry.backup), entry.before);
  }

  const models = JSON.parse(head('apps/media/hero-models.json'));
  const posters = JSON.parse(head('apps/media/hero-provenance.json'));
  const videos = post.local.videos;
  const sortedIds = records => records.map(v => v.id).sort();
  for (const [kind, records] of Object.entries({ models, posters, videos })) check('all ten ' + kind + ' IDs', sortedIds(records), [...IDS].sort());
  check('HEAD model records equal receipt', models, post.local.models);
  check('HEAD poster records equal receipt', posters, post.local.posters);
  check('current video verification equals receipt', json('apps/media/hyperframes/output/heroes/verification.json'), videos);
  const sorted = records => [...records].sort((a, b) => a.id.localeCompare(b.id));
  check('HEAD imported records equal model records keyed by ID', sorted(JSON.parse(head('apps/media/hero-imported.json'))), sorted(models));
  for (const model of models) {
    const id = model.id, poster = posters.find(p => p.id === id), video = videos.find(v => v.id === id);
    const posterExpected = { bytes: poster.bytes, sha256: poster.posterSha256 };
    bytesCheck('HEAD served GLB ' + id, head('apps/web/public/heroes/' + id + '.glb'), model);
    bytesCheck('HEAD poster ' + id, head('apps/web/public/heroes/' + id + '.webp'), posterExpected);
    for (const root of ['apps/web/public/heroes', 'apps/media/hyperframes/vendor/heroes', 'apps/media/hero-turntables/vendor/heroes']) fileCheck('current GLB ' + root + '/' + id, root + '/' + id + '.glb', model);
    fileCheck('current poster ' + id, 'apps/web/public/heroes/' + id + '.webp', posterExpected);
    fileCheck('current video ' + id, 'apps/media/hyperframes/output/heroes/' + id + '.mp4', video);
    check('receipt hosted model fingerprint ' + id, post.hosted.served.find(v => v.id === id), { id, bytes: model.bytes, sha256: model.sha256 });
    check('receipt hosted poster fingerprint ' + id, post.hosted.posters.find(v => v.id === id), { id, ...posterExpected });
  }

  const v = json(path.join(OUT, 'baseline-vercel-selected.json'));
  const dep = v.deployment;
  for (const [key, expected] of Object.entries({ id: 'dpl_9xWRX1G7xEpNinJ88YmCPCHpnpE9', state: 'READY', readyState: 'READY', target: null,
    projectId: 'prj_AYKVLmLw6D1vZmOFPQ512WdfpM5s', url: post.deployment.metadata.url })) check('authenticated deployment ' + key, dep[key], expected);
  check('authenticated deployment head', dep.meta.githubCommitSha, HEAD);
  check('authenticated deployment branch', dep.meta.githubCommitRef, BRANCH);
  check('authenticated deployment repository', dep.meta.githubOrg + '/' + dep.meta.githubRepo, REPO);
  check('authenticated request team', v.request.teamId, 'team_rccC7q4MEQxCAEz45598ttAe');
  check('authenticated team ID', v.team.id, v.request.teamId);
  check('authenticated team slug', v.team.slug, 'islanddevcrew');
  result.deployment = v;

  const Zip = require(require.resolve('adm-zip', { paths: [path.join(ROOT, 'apps/media')] }));
  token = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com', '--user', 'Navigata1'], {
    windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  async function api(endpoint, binary = false) {
    let response = await fetch('https://api.github.com/' + endpoint, { method: 'GET', redirect: 'manual',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(120000),
    });
    if (response.status === 302) {
      const location = response.headers.get('location');
      if (!location || new URL(location).protocol !== 'https:') throw new Error('Unsafe log redirect');
      response = await fetch(location, { method: 'GET', signal: AbortSignal.timeout(120000) });
    }
    if (!response.ok) throw new Error('GitHub GET ' + endpoint + ' returned ' + response.status);
    return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
  }
  check('ephemeral GitHub credential account', (await api('user')).login, 'Navigata1');
  const ref = await api('repos/' + REPO + '/git/ref/heads/' + BRANCH);
  check('fresh remote branch head', ref.object.sha, HEAD);
  const pr = await api('repos/' + REPO + '/pulls/256');
  for (const [key, actual, expected] of [['number', pr.number, 256], ['state', pr.state, 'open'], ['draft', pr.draft, true],
    ['head', pr.head.sha, HEAD], ['branch', pr.head.ref, BRANCH], ['source repo', pr.head.repo.full_name, REPO],
    ['target repo', pr.base.repo.full_name, REPO], ['target branch', pr.base.ref, 'main']]) check('fresh PR ' + key, actual, expected);
  result.remote = { branch: { ref: ref.ref, sha: ref.object.sha }, pr: { number: pr.number, state: pr.state, draft: pr.draft, head: pr.head.sha, branch: pr.head.ref, url: pr.html_url, updatedAt: pr.updated_at } };
  saveJson('baseline-remote.json', result.remote);
  const comment = await api('repos/' + REPO + '/issues/comments/6315242743');
  check('receipt comment exact URL', comment.html_url, post.receipt);
  check('receipt comment PR issue', comment.issue_url, 'https://api.github.com/repos/' + REPO + '/issues/256');
  check('receipt comment mentions exact head', comment.body.includes(HEAD), true);
  result.receiptComment = { id: comment.id, url: comment.html_url, issueUrl: comment.issue_url, bodySha256: hash(comment.body), createdAt: comment.created_at, updatedAt: comment.updated_at };
  saveJson('baseline-receipt-comment.json', result.receiptComment);
  const fullContracts = [
    '15 explicit APR unit contracts passed.', '17 portable Portfolio book contracts passed.',
    '22 canonical Portfolio persistence contracts passed.', '3 real-store Portfolio persistence contracts passed.',
    '19 native input draft contracts passed.', '9 Portfolio encrypted storage contracts passed.',
    '14 owner-scoped Portfolio storage contracts passed.', '13 Portfolio lifecycle contracts passed.',
    '8 whole-book Portfolio model contracts passed.', '7 Portfolio hook contracts: 7 passed, 0 failed.',
    '16 portable Portfolio transfer contracts passed.', '18 paired Portfolio snapshot contracts passed.',
    '16 Recovery hook contracts: 16 passed, 0 failed.', '11 Recovery review UI contracts: 11 passed, 0 failed.',
  ];
  for (const prior of post.ci) {
    const event = prior.event, id = prior.id;
    console.log('Fetching complete baseline CI event ' + event + ' run ' + id);
    const run = await api('repos/' + REPO + '/actions/runs/' + id);
    const attempt = await api('repos/' + REPO + '/actions/runs/' + id + '/attempts/1');
    const jobsResponse = await api('repos/' + REPO + '/actions/runs/' + id + '/attempts/1/jobs?per_page=100');
    const jobs = jobsResponse.jobs;
    const selectRun = r => ({ id: r.id, event: r.event, head_sha: r.head_sha, head_branch: r.head_branch, status: r.status, conclusion: r.conclusion,
      run_attempt: r.run_attempt, name: r.name, path: r.path, repository: r.repository.full_name, url: r.html_url, created_at: r.created_at, updated_at: r.updated_at });
    saveJson('baseline-' + event + '-metadata.json', { run: selectRun(run), attempt: selectRun(attempt), totalCount: jobsResponse.total_count, jobs });
    for (const [key, expected] of Object.entries({ id, event, head_sha: HEAD, head_branch: BRANCH, status: 'completed', conclusion: 'success', run_attempt: 1, name: 'CI', path: '.github/workflows/ci.yml' })) {
      check(event + ' run ' + key, run[key], expected);
      check(event + ' attempt1 ' + key, attempt[key], expected);
    }
    check(event + ' run repository', run.repository.full_name, REPO);
    check(event + ' complete job count', jobsResponse.total_count, 2);
    check(event + ' complete returned jobs', jobs.length, jobsResponse.total_count);
    const archive = await api('repos/' + REPO + '/actions/runs/' + id + '/attempts/1/logs', true);
    const zip = new Zip(archive), entries = zip.getEntries();
    const runResult = { event, id, attempt: run.run_attempt, archiveBytes: archive.length, archiveSha256: hash(archive), url: run.html_url,
      archiveEntries: entries.filter(e => !e.isDirectory).map(e => { const b = e.getData(); return { name: e.entryName, bytes: b.length, sha256: hash(b) }; }), jobs: [] };
    for (const job of jobs) {
      const kind = job.name === 'Web and mobile quality gates' ? 'web' : 'sql';
      const expectedJob = prior.jobs.find(j => j.name === job.name);
      check(event + ' known job ' + job.name, Boolean(expectedJob), true);
      check(event + ' job ID ' + kind, job.id, expectedJob?.databaseId);
      for (const [key, expected] of Object.entries({ status: 'completed', conclusion: 'success', head_sha: HEAD, run_id: id, run_attempt: 1 })) check(event + ' job ' + kind + ' ' + key, job[key], expected);
      const selectSteps = steps => steps.map(s => ({ number: s.number, name: s.name, status: s.status, conclusion: s.conclusion }));
      check(event + ' exact complete ' + kind + ' steps', selectSteps(job.steps), selectSteps(expectedJob?.steps || []));
      const parts = [], stepTexts = {};
      for (const step of job.steps) {
        check(event + ' ' + kind + ' step success ' + step.number, step.conclusion, 'success');
        const matches = entries.filter(e => e.entryName.startsWith(job.name + '/' + step.number + '_') && e.entryName.endsWith('.txt'));
        check(event + ' ' + kind + ' archive step ' + step.number + ' unique', matches.length, 1);
        if (matches.length !== 1) continue;
        const text = norm(matches[0].getData());
        stepTexts[step.name] = text;
        const lines = text.replace(/\x1b/g, '^[').split('\n');
        if (lines.at(-1) === '') lines.pop();
        for (const line of lines) parts.push(job.name + '\t' + step.name + '\t' + line + '\n');
      }
      const log = parts.join('');
      save('baseline-' + event + '-' + kind + '.log', log);
      check(event + ' ' + kind + ' fresh complete log SHA-256', hash(log), prior[kind + 'LogSha256']);
      check(event + ' ' + kind + ' original local log SHA-256', hash(read(path.join(PRIOR, 'ci-' + event + '-' + kind + '.log'))), prior[kind + 'LogSha256']);
      const jobResult = { name: job.name, id: job.id, steps: job.steps.length, bytes: Buffer.byteLength(log), sha256: hash(log), markers: [] };
      if (kind === 'web') {
        for (const marker of ['348 regression tests passed.', 'Rendered 27 Remotion matrix stills.', ...fullContracts]) {
          check(event + ' full-log marker ' + marker, log.includes(marker), true);
          jobResult.markers.push({ marker, found: log.includes(marker) });
        }
        const media = stepTexts['Check media identity contracts'] || '';
        for (const marker of ['# tests 145', '# pass 145', '# fail 0', '# skipped 0', '# cancelled 0']) check(event + ' media marker ' + marker, media.includes(marker), true);
        const browser = stepTexts['Smoke rendered Expo accessibility'] || '';
        const native = { routes: (browser.match(/\bPASS (?:compact-|phone-|tablet-)/g) || []).length,
          portfolio: (browser.match(/\bPASS native portfolio /g) || []).length, inputs: (browser.match(/\bPASS native financial inputs /g) || []).length };
        check(event + ' native browser routes', native.routes, 35);
        check(event + ' native browser portfolio', native.portfolio, 12);
        check(event + ' native browser inputs', native.inputs, 2);
        check(event + ' native browser actual executions', Object.values(native).reduce((a,b) => a+b, 0), 49);
        jobResult.nativeExecutions = native;
      } else {
        const executions = (log.match(/Tests=63\b/g) || []).length;
        check(event + ' SQL63 executions', executions, 2);
        check(event + ' SQL successful results', (log.match(/Result: PASS/g) || []).length, 2);
        jobResult.sqlAssertionsPerExecution = 63;
        jobResult.sqlExecutions = executions;
      }
      jobResult.summaryLines = log.split('\n').map((text, i) => ({ line: i + 1, text })).filter(v => !v.text.includes('TIMING ') && /contracts.*pass|# (?:tests|pass|fail|cancelled|skipped) \d+|regression tests passed|Rendered 27|Tests=63\b|Result: PASS|reference lane passed|\bPASS (?:native portfolio|native financial inputs|compact-|phone-|tablet-)/.test(v.text));
      runResult.jobs.push(jobResult);
    }
    result.ci.push(runResult);
    saveJson('baseline-' + event + '-archive-index.json', { archiveBytes: runResult.archiveBytes, archiveSha256: runResult.archiveSha256, entries: runResult.archiveEntries });
  }
  const finalRef = await api('repos/' + REPO + '/git/ref/heads/' + BRANCH);
  const finalPr = await api('repos/' + REPO + '/pulls/256');
  check('fresh remote head unchanged at end', finalRef.object.sha, HEAD);
  check('fresh PR head unchanged at end', finalPr.head.sha, HEAD);
  check('fresh PR draft unchanged at end', finalPr.draft, true);
  check('postflight unchanged during checks', hash(read(path.join(PRIOR, 'postflight.json'))), hash(postBytes));
  check('manifest unchanged during checks', hash(read(manifestPath)), hash(manifestBytes));
  check('journal unchanged during checks', hash(read(journalPath)), hash(journalBytes));
  check('local HEAD unchanged during checks', git(['rev-parse', 'HEAD']).toString().trim(), HEAD);
  result.endStatus = status();
  save('baseline-git-end.log', result.endStatus || '(clean)\n');
  result.coverage = { sourceFingerprintsFromPinnedGitShow: 285, currentImmutableTrackedFiles: invariantPaths.length,
    committedEvidenceFiles: Object.keys(post.local.files).length, desktopManifestFiles: 322,
    publicationEntries: 324, recoverableBackups: 48, models: 10, posters: 10, videoFiles: 10, vendorModelFiles: 20,
    fullCIEvents: 2, fullCIJobs: result.ci.reduce((n,r) => n+r.jobs.length, 0), completeCISteps: result.ci.reduce((n,r) => n+r.jobs.reduce((s,j) => s+j.steps, 0), 0),
    newlyExecutedApplicationTests: 0 };
  finish();
  process.exitCode = result.discrepancies.length ? 2 : 0;
}
main().catch(error => {
  result.fatal = { name: error.name, message: token ? String(error.message).split(token).join('[REDACTED]') : String(error.message) };
  finish();
  process.exitCode = 1;
});
