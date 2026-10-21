const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = process.cwd(), output = __dirname;
const stages = [['test-three-stage.cjs', 'three'], ['smoke-heroes.cjs', 'heroes'],
  ['hero-fallback-smoke.cjs', 'fallbacks'], ['smoke-routes.cjs', 'routes'],
  ['smoke-rendered.cjs', 'rendered'], ['smoke-dashboard-interest.cjs', 'dashboard'],
  ['smoke-portfolio-budget.cjs', 'portfolio'], ['smoke-vault-comparison.cjs', 'vault'],
  ['smoke-comparison.cjs', 'comparison'], ['smoke-portfolio-portability.cjs', 'portability'],
  ['portfolio-input-smoke.cjs', 'input']];
const run = { startedAt: new Date().toISOString(), status: 'running', stages: [] };
const save = () => fs.writeFileSync(path.join(output, 'web-gates-final.json'), JSON.stringify(run, null, 2) + '\n');
save();
for (const [script, name] of stages) {
  const log = fs.openSync(path.join(output, name + '-final.log'), 'w');
  const startedAt = new Date().toISOString();
  let result;
  try {
    result = spawnSync(process.execPath, [path.join(root, 'apps/web/scripts', script)], {
      cwd: root, env: { ...process.env, RENDERED_SMOKE_MOBILE_WIDTH: '375' },
      stdio: ['ignore', log, log], windowsHide: true, timeout: 600000,
    });
  } finally { fs.closeSync(log); }
  run.stages.push({ script, name, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status,
    ...(result.error ? { error: String(result.error) } : {}) });
  save();
  if (result.error || result.status !== 0) {
    run.status = 'failed'; run.finishedAt = new Date().toISOString(); save(); process.exit(1);
  }
  console.log('PASS final local web ' + name);
}
run.status = 'completed'; run.finishedAt = new Date().toISOString(); save();
