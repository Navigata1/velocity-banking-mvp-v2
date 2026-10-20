import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const root=new URL('./',import.meta.url), statePath=new URL('state.json',root);
const state=JSON.parse(await readFile(statePath,'utf8'));
if(state.historicalState) throw new Error('Restoration is already active; update state.json in place.');
await mkdir(new URL('history/',root),{recursive:true});
await copyFile(statePath,new URL('history/july-2026-state.json',root));
state.historicalState={path:'ops/mission/history/july-2026-state.json',note:'Original July phases, gates and task history are preserved here; their completion counts do not establish October production readiness.'};
state.mission.name='InterestShield Original-Vision Production Restoration';
state.mission.tagline='Recognizable assets, conserved cash, trustworthy comparisons. Task progress is not production readiness.';
state.mission.status='active'; state.mission.updated=new Date().toISOString(); state.mission.sessionCount+=1;
state.mission.planDoc='C:/Users/IslandDevCrew/Documents/Interest Shield/docs/restoration-status-2026-10-20.md';
state.policies.merge='review'; state.policies.branchPrefix='codex/';
state.policies.notes='User approved autonomous implementation, verified pushes and recurring work. PR #256 stays draft while required production gates remain open. Do not auto-deploy, broaden access, start paid GPU jobs or mutate production data. Keep future implementation slices focused.';
const pr={number:256,url:'https://github.com/Navigata1/velocity-banking-mvp-v2/pull/256',mergedAt:null};
const task=(id,title,status='pending',notes='')=>({id,title,status,dependsOn:[],pr:status==='done'?pr:null,notes});
const gate=(id,title,command)=>({id,title,command,status:'pending',evidence:null,lastRun:null,notes:''});
const phase=(id,title,goal,tasks,gates,status='pending')=>({id,title,goal,status,sessionsEstimate:'evidence-driven',tasks,gates});
state.phases=[
  phase('R0','Verified Restoration Checkpoint','Preserve the recovered dashboard and financial fixes on GitHub with exact-SHA checks.',[
    task('R0-T1','Push the reviewed restoration checkpoint','done','Commits 382f042, 474f5cf and 24d238e pushed to the draft PR. Not merged or deployed to production.'),
    task('R0-T2','Require exact-SHA GitHub CI and preview evidence','in_progress','Vercel preview passed for the checkpoint. GitHub Actions has not created a matching CI run; investigate without weakening gates.'),
  ],[gate('R0-G1','Web regressions and asset contracts','npm --prefix apps/web test'),gate('R0-G2','Built desktop/mobile routes','npm --prefix apps/web run smoke:rendered:built'),gate('R0-G3','Exact pushed commit has successful CI','node scripts/check-restoration-ci.cjs')],'in_progress'),
  phase('R1','Photoreal Hero Collection','Ten coherent, licensed or original textured models with portable finite rotations and real browser proof.',[
    task('R1-T1','Refine and optimize the Auto model','in_progress','Licensed Car Concept adapted with attribution; 134971 triangles, 14 textures, 2.06 MiB. Browser and export proof required before closure.'),
    task('R1-T2','Refine House, Land and Vault while preserving identity'),
    task('R1-T3','Refine the remaining six debt-domain models'),
    task('R1-T4','Harden loading, GPU cleanup, licensing and mobile budgets','in_progress','Artwork remains until model readiness; decoded textures and shared resources have dedicated cleanup regressions.'),
  ],[gate('R1-G1','Texture and provenance contracts','npm --prefix apps/media run test:contracts'),gate('R1-G2','Desktop/mobile actual-geometry checks','npm --prefix apps/web run test:heroes'),gate('R1-G3','Rendered full-revolution pixel proof','npm --prefix apps/media run verify:heroes')]),
  phase('R2','Scenario and Calculation Coherence','Dashboard, Portfolio, Vault and Expo use consistent scenarios and budget/liability contracts.',[
    task('R2-T1','Safely unify scenario ownership without overwriting saved household data'),
    task('R2-T2','Complete equal-budget equal-liability strategy comparisons'),
    task('R2-T3','Implement or remove ineffective chunk-frequency controls'),
  ],[gate('R2-G1','Financial regressions','npm --prefix apps/web test'),gate('R2-G2','Independent reference scenarios','npm --prefix apps/web run test:reference')]),
  phase('R3','Lender and Calendar Truth','Normal calculations enforce lender terms and dated cash ledgers, with labeled fallback estimates.',[
    task('R3-T1','Wire lender term confidence into normal simulation entry points'),
    task('R3-T2','Integrate real transaction calendars and explicit cash reserves'),
  ],[gate('R3-G1','Financial contract and conservation tests','npm --prefix apps/web test')]),
  phase('R4','Backend and Release Readiness','Verify owner isolation, recovery and the exact release artifact before production.',[
    task('R4-T1','Verify dedicated Supabase environment and owner-scoped persistence'),
    task('R4-T2','Verify backup, conflict recovery and cross-device behavior'),
    task('R4-T3','Confirm custom domain and exact-SHA production release'),
  ],[gate('R4-G1','Persistence client contracts','npm --prefix apps/web run test:supabase:client'),gate('R4-G2','Account isolation contracts','npm --prefix apps/web run test:supabase:account'),gate('R4-G3','Verified production routes','npm --prefix apps/web run smoke:production')]),
  phase('R5','Native Final Candidate','Rebuild and re-test native clients against the restored shared financial contracts.',[
    task('R5-T1','Regenerate Expo/Hermes bundles after financial changes'),
    task('R5-T2','Repeat Android and iOS final-candidate device checks'),
  ],[gate('R5-G1','Mobile type check','npm --prefix apps/mobile run check'),gate('R5-G2','Native route contracts','node scripts/mobile-port-contract-tests.cjs')]),
];
state.metrics=[
 {label:'Textured refined model candidates',baseline:'0',current:'1',target:'10',direction:'up'},
 {label:'Web financial regressions passing',baseline:'263',current:'270',target:'270',direction:'up'},
 {label:'Scenario owners to consolidate',baseline:'3',current:'3',target:'1',direction:'down'},
 {label:'Verified restoration production releases',baseline:'0',current:'0',target:'1',direction:'up'},
];
state.risks=[
 {title:'Nine models remain studies',severity:'high',note:'The Auto model now has licensed textured geometry. Other heroes must not be represented as finished photoreal assets. Public generation GPU quota is limited and Hugging Face is not connected.'},
 {title:'Financial coherence gates remain open',severity:'high',note:'Scenario ownership, lender/calendar integration and equal-liability comparisons require contract-level work despite passing current regressions.'},
 {title:'Exact-SHA CI has not run',severity:'high',note:'Actions workflows are enabled but no CI run exists for checkpoint 24d238e. A successful Vercel preview is not CI approval.'},
 {title:'Production backend and custom domain unverified',severity:'high',note:'Do not apply production migrations, change DNS or promote the draft while ownership and release gates are open.'},
];
state.prLog.push({number:256,title:'Restore original asset-centered experience (draft)',url:pr.url,phase:'R0',mergedAt:null});
state.resume.activePhase='R1';
state.resume.nextActions=[
 'Verify the refined Auto GLB on desktop and 375px mobile, including delayed loading, repeated mode selection, context cleanup, credit visibility and a new HyperFrames turntable. Push only with fresh local gates.',
 'Investigate why GitHub Actions has no exact-SHA run for the restoration push. Keep the draft unmerged; Vercel success alone is insufficient.',
 'Refine House/Land/Vault from properly licensed or original textured sources, with provenance, small opt-in budgets and visual review. Do not overwrite refined imports by running the study generator.',
 'When external art generation is blocked, advance R2/R3 with failing reproductions and no destructive scenario migration.',
 'The approved heartbeat runs every four hours. Continue bounded verified improvements on codex/restoration/asset-heroes and update PR #256.'
];
state.resume.blockers=[
 'Public custom reconstruction GPU quota; no authenticated Hugging Face connection. Do not initiate paid GPU jobs without a defined authorized budget.',
 'No exact-SHA GitHub CI run for the pushed checkpoint despite enabled workflow configuration.',
 'Production Supabase environment and exact owned custom-domain hostname/access remain unverified.'
];
state.resume.conventions.push('Preserve calm Car / House / Vault identity. No further broad visual redesign.','Commit and push verified improvements; never force-push or auto-promote the draft.','Use Navigata1 GitHub credentials from the existing credential store without printing tokens.');
await writeFile(statePath,JSON.stringify(state,null,2)+'\n');
console.log('Activated October restoration; full July state preserved in history.');
