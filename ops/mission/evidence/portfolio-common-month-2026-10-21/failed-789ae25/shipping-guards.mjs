import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const baselineHead = '1aec5bf7be3d0f3c26079141245e4c7291fd8778';
export const localReceiptPath = 'ops/mission/evidence/portfolio-common-month-2026-10-21/artifact-receipt.json';
export const modifiedSources = [
  'apps/mobile/components/mobile-routes/portfolio-route.tsx', 'apps/mobile/scripts/smoke-accessibility-rendered.cjs',
  'apps/web/package.json', 'apps/web/src/app/portfolio/PortfolioPlanSection.tsx', 'packages/financial-engine/package.json',
];
export const newSources = [
  'apps/mobile/components/portfolio/portfolio-common-month.tsx', 'apps/web/scripts/portfolio-common-month-reference-tests.cjs',
  'apps/web/scripts/portfolio-common-month-tests.cjs', 'apps/web/scripts/smoke-portfolio-common-month.cjs',
  'apps/web/scripts/smoke-portfolio-currency-width.cjs',
  'apps/web/src/app/portfolio/PortfolioCommonMonth.tsx', 'packages/financial-engine/src/common-month.ts', 'packages/financial-engine/src/portfolio-common-month.ts',
];
export const hostedConfigs = [
  ['portfolio-input-smoke.cjs','input',['portfolio-input/portfolio-input-verification.json']], ['smoke-production.cjs','http',[]], ['smoke-rendered.cjs','routes',[]],
  ['smoke-dashboard-interest.cjs','dashboard',['dashboard-interest/verification.json','dashboard-interest/oracle-controls.json','dashboard-interest/fallback-font-280.json','dashboard-interest/auto-375-viewport.png']],
  ['smoke-portfolio-budget.cjs','portfolio',['portfolio-budget/verification.json']], ['smoke-vault-comparison.cjs','vault',['vault-comparison/verification.json']],
  ['smoke-comparison.cjs','comparison',['comparison/verification.json']], ['smoke-portfolio-portability.cjs','portability',['portfolio-portability/verification.json']],
  ['smoke-portfolio-common-month.cjs','commonMonth',['portfolio-common-month/verification.json','portfolio-common-month/web-cash-versus-wealth-375.png']],
  ['smoke-portfolio-currency-width.cjs','currencyWidth',['currency-width/verification.json']],
];
export const currencyWidths = [280,375,640,690,700,768,1024,1100,1120,1280,1440];
export const hostedEnvironment = origin => ({...Object.fromEntries(['PRODUCTION_ORIGIN','RENDERED_SMOKE_ORIGIN','DASHBOARD_INTEREST_SMOKE_ORIGIN','PORTFOLIO_BUDGET_SMOKE_ORIGIN','VAULT_COMPARISON_SMOKE_ORIGIN','COMPARISON_SMOKE_ORIGIN','PORTFOLIO_PORTABILITY_ORIGIN','PORTFOLIO_INPUT_ORIGIN','COMMON_MONTH_SMOKE_ORIGIN','CURRENCY_WIDTH_ORIGIN'].map(key=>[key,origin])),RENDERED_SMOKE_MOBILE_WIDTH:'375'});
export const ciMarkers = [
  '348 regression tests passed.', 'PASS Dashboard interest large-import at 280px',
  'PASS common-month wider-font 280px',
  'Custom front lug physically seats the closed bail with a real empty ring aperture',
  'Collection packaging delivers validated source and manifest snapshots despite source-path changes',
  '15 explicit APR unit contracts passed.', '17 portable Portfolio book contracts passed.',
  '22 canonical Portfolio persistence contracts passed.', '3 real-store Portfolio persistence contracts passed.',
  '19 native input draft contracts passed.', '9 Portfolio encrypted storage contracts passed.',
  '14 owner-scoped Portfolio storage contracts passed.', '13 Portfolio lifecycle contracts passed.',
  '8 whole-book Portfolio model contracts passed.', '7 Portfolio hook contracts: 7 passed, 0 failed.',
  '16 portable Portfolio transfer contracts passed.', '18 paired Portfolio snapshot contracts passed.',
  '16 Recovery hook contracts: 16 passed, 0 failed.', '11 Recovery review UI contracts: 11 passed, 0 failed.',
];

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const exists = async file => fs.access(file).then(() => true, error => {if (error.code === 'ENOENT') return false; throw error;});
const inside = (root, file) => {const relative = path.relative(path.resolve(root), path.resolve(file)); return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);};
const fingerprint = async file => {assert.ok((await fs.lstat(file)).isFile(), file + ' must be a regular file'); const bytes = await fs.readFile(file); return {bytes:bytes.length, sha256:digest(bytes)};};
const equalFile = async (file, expected) => assert.deepEqual(await fingerprint(file), expected, file);
const writeJournal = async (file, value) => {const temporary=file+'.next-'+randomUUID();await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n');await fs.rename(temporary,file);};
export const writeJsonAtomic = writeJournal;
const sorted = values => [...values].sort();
const normalizedDigest = bytes => digest(bytes.toString('utf8').replace(/\r\n?/g,'\n'));

export function validateBaselineSeal(seal, priorBytes) {
  assert.equal(seal.expectedHead,baselineHead);assert.equal(seal.passedChecks,4134);assert.equal(seal.failedChecks,0);
  assert.equal(seal.checks.length,4134);assert.ok(seal.checks.every(check=>check.passed===true));
  assert.equal(seal.postflight.bytes,priorBytes.length);assert.equal(seal.postflight.sha256,digest(priorBytes));
  assert.equal(seal.publication.entries,324);assert.equal(seal.publication.backups,48);return seal;
}

export function assertCleanHead(expected) {
  assert.match(expected ?? '',/^[a-f0-9]{40}$/,'INTERESTSHIELD_EXPECTED_HEAD required');
  const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  assert.equal(head,expected);assert.notEqual(head,baselineHead,'new substantive feature commit required');
  assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','clean committed source required');
  execFileSync('git',['merge-base','--is-ancestor',baselineHead,head]);return head;
}

export function validateLocalReceipt(local, prior) {
  assert.equal(prior.headSha,baselineHead);assert.equal(local.baseline,baselineHead);assert.equal(local.priorReceipt,prior.receipt);assert.equal(local.productionReady,false);
  assert.deepEqual(sorted(local.allowedSourceChanges),sorted([...modifiedSources,...newSources]));
  assert.equal(Object.keys(prior.local.sources).length,285);
  assert.deepEqual(sorted(Object.keys(local.sources)),sorted([...Object.keys(prior.local.sources),...newSources]));assert.equal(Object.keys(local.sources).length,293);
  for(const [file,pin]of Object.entries(local.sources)){assert.match(pin,/^[a-f0-9]{64}$/);if(!local.allowedSourceChanges.includes(file))assert.equal(pin,prior.local.sources[file],file+' immutable pin');}
  assert.equal(local.web.regressions,348);assert.equal(local.web.dashboardCases,18);assert.equal(local.web.hostedCasesRequired,120);
  assert.equal(local.media.contracts,145);assert.equal(local.media.freshStills,27);assert.equal(local.native.browserExecutions,70);assert.equal(local.native.commonMonthCases,21);
  for(const key of ['models','posters','videos'])assert.deepEqual(local[key],prior.local[key],key+' unchanged asset snapshots');
  const common=local.commonMonth;assert.ok(Number.isSafeInteger(common.coreContracts)&&common.coreContracts>0,'explicit core contract count required');
  assert.equal(common.webCases,21);assert.equal(common.nativeCases,21);assert.equal(common.currencyWidthCases,11);assert.equal(common.oracleControls,4);assert.deepEqual(sorted(common.widths),[1440,280,375]);
  const ref=common.reference;assert.ok(ref?.adjudicated===true,'adjudicated reference receipt required');assert.ok(Number.isSafeInteger(ref.passed)&&ref.passed>0);assert.equal(ref.failed,0);
  assert.ok(typeof ref.logFile==='string'&&ref.logFile.length>0);assert.ok(local.files[ref.logFile],'reference log must be hash-pinned in local.files');
  assert.ok(typeof ref.reportFile==='string'&&ref.reportFile.length>0);assert.ok(local.files[ref.reportFile],'adjudication report must be hash-pinned in local.files');
  for(const [file,proof]of Object.entries(local.files)){assert.ok(inside('/receipt',path.resolve('/receipt',file))&&file!=='.');assert.ok(Number.isSafeInteger(proof.bytes)&&proof.bytes>0);assert.match(proof.sha256,/^[a-f0-9]{64}$/);}
  return local;
}

export function validateSourceChanges(changed) {
  assert.deepEqual(sorted(changed),sorted([...modifiedSources.map(file=>'M\t'+file),...newSources.map(file=>'A\t'+file)]),'exact executable source boundary');
}

export async function verifySourcePins(local, head) {
  const changed=execFileSync('git',['diff','--no-renames','--name-status',baselineHead,head,'--','apps/web','apps/mobile','apps/media','packages','.github','supabase'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  validateSourceChanges(changed);
  for(const [file,pin]of Object.entries(local.sources)){
    assert.equal(normalizedDigest(await fs.readFile(file)),pin,file+' current source');
    assert.equal(normalizedDigest(execFileSync('git',['show',head+':'+file],{maxBuffer:16*1024*1024})),pin,file+' committed source');
  }
  const manifest=file=>JSON.parse(execFileSync('git',['show',head+':'+file],{encoding:'utf8'})),oldManifest=file=>JSON.parse(execFileSync('git',['show',baselineHead+':'+file],{encoding:'utf8'}));
  const web=manifest('apps/web/package.json'),oldWeb=oldManifest('apps/web/package.json');
  for(const key of ['test','smoke:portfolio:built']){delete web.scripts[key];delete oldWeb.scripts[key];}assert.deepEqual(web,oldWeb,'web manifest changes limited to two scripts');
  const engine=manifest('packages/financial-engine/package.json'),oldEngine=oldManifest('packages/financial-engine/package.json');
  delete engine.exports['./portfolio-common-month'];assert.deepEqual(engine,oldEngine,'engine manifest change limited to new typed subpath');
  assert.equal(execFileSync('git',['diff','--name-only',baselineHead,head,'--','ops/mission/render-sotu.mjs'],{encoding:'utf8'}).trim(),'','report renderer unchanged');
  assert.equal(normalizedDigest(await fs.readFile(localReceiptPath)),normalizedDigest(execFileSync('git',['show',head+':'+localReceiptPath],{maxBuffer:16*1024*1024})),'local receipt must be committed at exact HEAD');
  return {headSha:head,count:Object.keys(local.sources).length};
}

export async function verifyLocalFiles(local, directory=path.dirname(localReceiptPath)) {
  for(const [file,proof]of Object.entries(local.files)){assert.ok(inside(directory,path.resolve(directory,file)));await equalFile(path.resolve(directory,file),proof);}
}

export async function referenceBinding(root=process.cwd(), head) {
  const script=path.join(root,'apps/web/scripts/portfolio-common-month-reference-tests.cjs'),sourceHashes={};
  // The reference runner hashes raw bytes, unlike the normalized source-pin inventory.
  const bytes=async file=>head?execFileSync('git',['show',head+':'+file.replaceAll('\\','/')],{cwd:root,maxBuffer:16*1024*1024}):fs.readFile(path.resolve(root,file));
  for(const name of ['portfolio-common-month','portfolio-book','index','numeric-range','portfolio','common-month'])sourceHashes[name]=digest(await bytes('packages/financial-engine/src/'+name+'.ts'));
  return {testSourceHash:digest(await bytes(path.relative(root,script))),sourceHashes};
}

export function validateReferenceLog(log, reference, binding) {
  const summaries=log.split(/\r?\n/).flatMap(line=>{const start=line.indexOf('{"seed":');if(start<0)return[];try{return[JSON.parse(line.slice(start))];}catch{return[];}});
  assert.equal(summaries.length,1,'exactly one actual common-month reference summary required');const summary=summaries[0];
  assert.equal(reference.adjudicated,true);assert.equal(reference.failed,0);assert.equal(summary.seed,20261021);assert.equal(summary.passed,reference.passed);assert.equal(summary.failed,0);
  assert.equal(summary.testSourceHash,binding.testSourceHash);assert.deepEqual(summary.sourceHashes,binding.sourceHashes);return summary;
}

export function validateCiLogs(webLog, sqlLog, common, binding) {
  for(const marker of [...ciMarkers,`${common.coreContracts} common-month contracts passed.`,'# tests 145','Rendered 27 Remotion matrix stills.'])assert.ok(webLog.includes(marker),'CI missing '+marker);
  for(const [pattern,count]of [[/\bPASS (?:compact-|phone-|tablet-)/g,35],[/\bPASS native portfolio /g,12],[/\bPASS native financial inputs /g,2],[/\bPASS native common month /g,21],[/\bPASS web common month /g,21]])assert.equal((webLog.match(pattern)||[]).length,count,'actual browser execution count');
  assert.equal((sqlLog.match(/Tests=63\b/g)||[]).length,2,'SQL63 twice per event');
  assert.equal(common.currencyWidthCases,11);validateCurrencyWidthLog(webLog);
  return validateReferenceLog(webLog,common.reference,binding);
}

export function validateCurrencyWidthLog(log) {
  const actual=[...log.matchAll(/\bPASS max-standard-currency boundary (\d+)px[ \t]*$/gm)].map(match=>Number(match[1]));
  assert.deepEqual(actual.sort((a,b)=>a-b),currencyWidths,'each of the eleven actual currency boundary executions required exactly once');
  return actual;
}

export function validateCurrencyWidth(data, origin) {
  assert.equal(data.origin,origin);assert.equal(data.receipts.length,11);const seen=new Set();
  for(const receipt of data.receipts){
    assert.ok(currencyWidths.includes(receipt.viewportWidth));assert.ok(!seen.has(receipt.viewportWidth));seen.add(receipt.viewportWidth);
    assert.equal(receipt.text,'-$1,000,000,000.00');assert.equal(receipt.fontFamilyRequested,'Verdana');
    assert.ok(Number.isFinite(receipt.fontSize)&&receipt.fontSize>=12);
    assert.equal(receipt.fits,true);assert.equal(receipt.contained,true);assert.equal(receipt.oneLine,true);assert.equal(receipt.pageOverflow,false);assert.deepEqual(receipt.errors,[]);
    assert.ok(Number.isFinite(receipt.metricWidth)&&receipt.metricWidth>0&&Number.isFinite(receipt.glyphWidth)&&receipt.glyphWidth>0&&receipt.glyphWidth<=receipt.metricWidth+1);
  }
  return data;
}

export function validateCommonMonth(data, origin, native=false) {
  assert.equal(data.origin,origin);assert.equal(data.receipts.length,21);const seen=new Set();
  const names=['cash-versus-wealth','adverse','blocked-reference','failed-attempt','nonzero-tolerance','cleared','large-values'];
  for(const receipt of data.receipts){
    assert.ok(names.includes(receipt.name));assert.ok([1440,375,280].includes(receipt.width));const key=receipt.name+':'+receipt.width;assert.ok(!seen.has(key));seen.add(key);
    assert.equal(receipt.native,native);assert.equal(receipt.storagePreserved,true);assert.deepEqual(receipt.errors,[]);
    const g=receipt.geometry;assert.equal(g.pageOverflow,false);assert.equal(g.sectionOverflow,false);assert.equal(g.metrics.length,15);
    for(const m of g.metrics)assert.ok(m.visible&&m.fits&&m.contained&&m.fontSize>=12&&m.text.trim()&&m.tokens.length&&m.tokens.every(t=>t.oneLine));
    if(receipt.name==='cash-versus-wealth'&&receipt.width===375){
      assert.deepEqual(receipt.oracleControls.map(c=>c.kind),['ancestor-opacity','value-opacity','value-clip','empty-value']);
      for(const c of receipt.oracleControls){assert.equal(c.rejected,true);assert.equal(c.restored,true);if(c.kind!=='ancestor-opacity')assert.equal(c.originalNode,true);}
    }else assert.deepEqual(receipt.oracleControls,[]);
    if(!native&&receipt.name==='large-values'&&receipt.width===280){
      assert.equal(receipt.widerFontProbe?.fontFamily,'Verdana');assert.equal(receipt.widerFontProbe.passed,true);
      assert.ok(Number.isFinite(receipt.widerFontProbe.minFontSize)&&receipt.widerFontProbe.minFontSize>=12);
    }
  }
  return data;
}

export function validateBrowserProof(manual, invocation) {
  assert.equal(manual.headSha,invocation.headSha);assert.equal(manual.invocationId,invocation.id);
  assert.ok(Date.parse(manual.capturedAt)>=Date.parse(invocation.startedAt)&&Date.parse(manual.capturedAt)<=Date.now(),'fresh actual-browser capture required');
  const house=manual.house;assert.equal(house.url,invocation.origin+'/');assert.equal(house.domain,'house');assert.equal(house.vitalsCount,4);assert.deepEqual(house.logs,[]);assert.equal(house.interactionVerified,true);
  assert.equal(house.before.cashFlow,'$3,500');assert.equal(house.after.cashFlow,'$3,600');assert.equal(house.before.interest,'Est. $51.50/day');assert.equal(house.after.interest,house.before.interest);assert.deepEqual(house.restored,house.before);
  const common=manual.commonMonth;assert.equal(common.url,invocation.origin+'/portfolio');assert.equal(common.fixture,'cash-versus-wealth');assert.equal(common.width,375);assert.deepEqual(common.logs,[]);assert.equal(common.interactionVerified,true);
  assert.deepEqual(common.storageProof,{source:'invocation-bound-browser-fixtures',runId:invocation.id,suite:'commonMonth',storagePreserved:true});
  assert.equal(invocation.suites.commonMonth.runId,invocation.id);assert.ok(invocation.suites.commonMonth.artifacts['apps/web/test-results/portfolio-common-month/verification.json']);
  assert.equal('storageBefore' in common,false);assert.equal('storageAfter' in common,false);
  assert.deepEqual(common.observations.map(o=>o.month),[0,3,6,600]);
  for(const observation of common.observations)for(const policy of ['snowball','velocity']){
    const expected=observation.month===0?{cash:'$0.00',debt:'$140.00',loc:'$40.00',net:'-$180.00'}:
      observation.month===3?(policy==='snowball'?{cash:'$200.00',debt:'$80.00',loc:'$0.00',net:'$120.00'}:{cash:'$120.00',debt:'$0.00',loc:'$0.00',net:'$120.00'}):
      {cash:observation.month===6?'$420.00':'$59,820.00',debt:'$0.00',loc:'$0.00',net:observation.month===6?'$420.00':'$59,820.00'};
    assert.deepEqual(observation[policy],expected);
  }
  assert.deepEqual(common.restored,common.observations[1]);return manual;
}

export function validateDeployment(deployment, head, origin) {
  const project = 'prj_AYKVLmLw6D1vZmOFPQ512WdfpM5s', team = 'team_rccC7q4MEQxCAEz45598ttAe';
  assert.equal(deployment.headSha, head); assert.equal(deployment.preview, origin);
  assert.equal(deployment.projectId, project); assert.equal(deployment.teamId, team);
  assert.equal(deployment.scope, 'islanddevcrew'); assert.equal(deployment.state, 'READY'); assert.equal(deployment.target, null);
  const raw = deployment.metadata;
  assert.equal(raw.id, deployment.id); assert.equal('https://' + raw.url, origin);
  assert.equal(raw.meta.githubCommitSha, head); assert.equal(raw.meta.githubCommitRef, 'codex/restoration/asset-heroes');
  assert.equal(raw.meta.githubOrg, 'Navigata1'); assert.equal(raw.meta.githubRepo, 'velocity-banking-mvp-v2');
  assert.equal(raw.project.id, project); assert.equal(raw.state, 'READY'); assert.equal(raw.readyState, 'READY'); assert.equal(raw.target, null);
  if (raw.teamId !== undefined) assert.equal(raw.teamId, team);
  assert.deepEqual(deployment.request, {idOrUrl:raw.id, teamId:team, withGitRepoInfo:'true'});
  assert.equal(deployment.authenticatedTeam.id, team); assert.equal(deployment.authenticatedTeam.slug, deployment.scope);
  assert.equal(deployment.authenticatedTeam.source, 'Authenticated Vercel get_team');
  assert.ok(Number.isFinite(Date.parse(deployment.authenticatedTeam.verifiedAt)));
  return deployment;
}

export async function verifyBaseline(collection, desktop, prior) {
  assert.equal(prior.headSha,baselineHead);
  const manifestFile = path.join(collection, 'Mobile-Vitals-1aec5bf-File-Manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  assert.equal(manifest.headSha, prior.headSha); assert.equal(manifest.receipt, prior.receipt);
  assert.equal(Object.keys(manifest.files).length, 322);
  for (const [file, expected] of Object.entries(manifest.files)) {assert.ok(inside(collection, path.join(collection,file))); await equalFile(path.join(collection,file), expected);}
  await equalFile(desktop, {bytes:prior.desktopReport.bytes, sha256:prior.desktopReport.sha256});
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(collection,'Mobile-Vitals-1aec5bf-Verification.json'),'utf8')),prior);
  const journalFile=prior.desktopReport.publicationJournal,journal=JSON.parse(await fs.readFile(journalFile,'utf8'));
  assert.equal(journal.id,'desktop-publication-'+baselineHead);assert.equal(journal.state,'committed');assert.equal(journal.files.length,324);assert.equal(journal.files.filter(f=>f.before).length,48);
  validateTargets(journal,[collection,desktop]);assert.equal(path.resolve(journal.files.at(-1).target),path.resolve(desktop));
  for(const entry of journal.files){const expected=entry.expected??(path.resolve(entry.target)===path.resolve(manifestFile)?await fingerprint(manifestFile):null);assert.ok(expected);assert.deepEqual(entry.after,expected);assert.ok(inside(path.dirname(path.dirname(journalFile)),entry.staged));await equalFile(entry.target,entry.after);await equalFile(entry.staged,entry.after);if(entry.before){assert.ok(inside(path.dirname(journalFile),entry.backup));await equalFile(entry.backup,entry.before);}}
  return {verifiedAt:new Date().toISOString(), head:prior.headSha, files:322, journalEntries:324, recoverableBackups:48, journalSha256:digest(await fs.readFile(journalFile)), manifestSha256:digest(await fs.readFile(manifestFile)), report:await fingerprint(desktop)};
}

export async function verifyHostedInvocation(cache, deployment, {root=process.cwd(),expectedRunId,receiptFile=path.resolve(root,localReceiptPath)}={}) {
  const run = JSON.parse(await fs.readFile(path.join(cache,'hosted/run-envelope.json'), 'utf8'));
  assert.equal(run.status,'completed'); assert.equal(run.exitCode,0); assert.equal(run.headSha,deployment.headSha);
  assert.equal(run.origin,deployment.preview); assert.equal(run.deploymentId,deployment.id);
  assert.equal(run.deploymentSha256,digest(await fs.readFile(path.join(cache,'deployment-final.json'))));
  assert.equal(run.runnerSha256,digest(await fs.readFile(path.join(cache,'run-hosted.cjs'))));
  assert.equal(run.schemaVersion,2);assert.equal(run.guardsSha256,digest(await fs.readFile(path.join(cache,'shipping-guards.mjs'))));
  assert.equal(run.localReceiptSha256,digest(await fs.readFile(receiptFile)));if(expectedRunId!==undefined)assert.equal(run.id,expectedRunId);
  assert.match(run.id,/^[a-f0-9-]{36}$/); assert.ok(Date.parse(run.finishedAt) >= Date.parse(run.startedAt));
  assert.equal(run.directory,'hosted-runs/'+run.id);
  assert.ok(Date.parse(run.startedAt)>=Date.parse(deployment.authenticatedTeam.verifiedAt));
  assert.deepEqual(Object.keys(run.suites),hostedConfigs.map(c=>c[1]));
  const scripts=Object.fromEntries(hostedConfigs.map(([script,name])=>[name,script])),environment=hostedEnvironment(run.origin);
  for (const [name, suite] of Object.entries(run.suites)) {
    assert.equal(suite.exitCode,0); assert.equal(suite.runId,run.id); assert.equal(suite.origin,run.origin);
    assert.ok(Date.parse(suite.startedAt)>=Date.parse(run.startedAt) && Date.parse(suite.finishedAt)>=Date.parse(suite.startedAt) && Date.parse(suite.finishedAt)<=Date.parse(run.finishedAt));
    assert.equal(suite.script,'apps/web/scripts/'+scripts[name]);assert.equal(suite.scriptSha256,digest(await fs.readFile(path.resolve(root,suite.script))));
    assert.equal(suite.command.cwd,path.resolve(root,'apps/web')); assert.deepEqual(suite.command.args,[path.resolve(root,suite.script)]);assert.equal(suite.command.executable,process.execPath);
    assert.deepEqual(suite.environment,environment);
    for (const record of [suite.log,...Object.values(suite.artifacts)]) {
      assert.ok(inside(cache,path.join(cache,record.captured)));
      assert.ok(inside(path.join(cache,run.directory),path.join(cache,record.captured)));
      await equalFile(path.join(cache,record.captured),{bytes:record.bytes,sha256:record.sha256});
      await equalFile(record.live,{bytes:record.bytes,sha256:record.sha256});
    }
    assert.equal(suite.log.live,path.join(cache,'hosted',name+'.log'));
    for(const [file,record]of Object.entries(suite.artifacts))assert.equal(record.live,path.resolve(root,file));
    const log=await fs.readFile(suite.log.live,'utf8');
    if(name==='http') assert.ok(log.startsWith('Production origin: '+run.origin+'\n')||log.startsWith('Production origin: '+run.origin+'\r\n'));
    if(name==='routes') assert.ok(log.startsWith('Rendered smoke origin: '+run.origin+'\n')||log.startsWith('Rendered smoke origin: '+run.origin+'\r\n'));
  }
  const expected=Object.fromEntries(hostedConfigs.map(([,name,files])=>[name,files]));
  for(const [name, files]of Object.entries(expected))assert.deepEqual(Object.keys(run.suites[name].artifacts),files.map(file=>'apps/web/test-results/'+file));
  return run;
}

function validateTargets(journal, allowedRoots) {
  assert.ok(Array.isArray(journal.files) && journal.files.length>0);
  const unique=new Set();
  for(const entry of journal.files){assert.ok(allowedRoots.some(root=>inside(root,entry.target)),entry.target+' outside publication scope');const key=process.platform==='win32'?path.resolve(entry.target).toLowerCase():path.resolve(entry.target);assert.ok(!unique.has(key));unique.add(key);}
}

export async function recoverPublication(journalFile, allowedRoots) {
  if(!await exists(journalFile))return null;
  const journal=JSON.parse(await fs.readFile(journalFile,'utf8'));validateTargets(journal,allowedRoots);
  if(journal.state==='committed'){for(const entry of journal.files)await equalFile(entry.target,entry.after);return journal;}
  if(journal.state==='rolled-back')return journal;
  for(const [index,entry]of [...journal.files.entries()].reverse()){
    const current=await exists(entry.target)?await fingerprint(entry.target):null;
    if(JSON.stringify(current)===JSON.stringify(entry.before))continue;
    assert.deepEqual(current,entry.after,entry.target+' changed outside publication; preserved recovery files');
    if(entry.before){assert.ok(inside(path.dirname(journalFile),entry.backup));await equalFile(entry.backup,entry.before);const temp=entry.target+'.restore-'+journal.id;await fs.copyFile(entry.backup,temp);await fs.rename(temp,entry.target);}
    else await fs.rename(entry.target,path.join(path.dirname(journalFile),'recovered-new-'+index+'-'+randomUUID()));
  }
  journal.state='rolled-back';await writeJournal(journalFile,journal);return journal;
}

export async function publishFiles(entries, journalFile, allowedRoots, afterWrite) {
  const prior=await recoverPublication(journalFile,allowedRoots);if(prior?.state==='committed')return prior;
  const journal={id:path.basename(path.dirname(journalFile)),state:'prepared',files:[]};
  await fs.mkdir(path.join(path.dirname(journalFile),'backups'),{recursive:true});
  for(const [index,entry]of entries.entries()){
    const after=await fingerprint(entry.staged);if(entry.expected)assert.deepEqual(after,entry.expected);
    const before=await exists(entry.target)?await fingerprint(entry.target):null,backup=path.join(path.dirname(journalFile),'backups',String(index));
    journal.files.push({...entry,after,before,backup});
  }
  validateTargets(journal,allowedRoots);
  for(const entry of journal.files)if(entry.before){await fs.copyFile(entry.target,entry.backup);await equalFile(entry.backup,entry.before);}
  await writeJournal(journalFile,journal);
  try{
    for(const [index,entry]of journal.files.entries()){
      assert.deepEqual(await exists(entry.target)?await fingerprint(entry.target):null,entry.before,entry.target+' changed during staging');
      await equalFile(entry.staged,entry.after);await fs.mkdir(path.dirname(entry.target),{recursive:true});
      const temp=entry.target+'.staged-'+journal.id;await fs.copyFile(entry.staged,temp);await equalFile(temp,entry.after);await fs.rename(temp,entry.target);
      await afterWrite?.(index,entry);
    }
    for(const entry of journal.files)await equalFile(entry.target,entry.after);
    journal.state='committed';await writeJournal(journalFile,journal);return journal;
  }catch(error){await recoverPublication(journalFile,allowedRoots);throw error;}
}
