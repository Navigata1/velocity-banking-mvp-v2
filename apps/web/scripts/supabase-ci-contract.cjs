/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
const databaseJob = workflow.split('\n  backend-isolation:')[1] || '';
const scripts = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')).scripts;

// Wiring checks only. The hosted pgTAP run is the actual database isolation proof.
test('standing CI runs a bounded real database isolation job', () => {
  assert.ok(databaseJob, 'CI needs a backend-isolation job, not just client mocks');
  assert.match(databaseJob, /runs-on: ubuntu-latest/);
  assert.match(databaseJob, /timeout-minutes: 20/);
  assert.match(databaseJob, /supabase db start/);
  assert.match(databaseJob, /supabase db reset --local --no-seed/);
  assert.match(databaseJob, /npm --prefix apps\/web run test:supabase/);
  assert.match(databaseJob, /supabase test db --local supabase\/tests/);
  assert.match(databaseJob, /supabase db lint --local --schema public --fail-on warning/);
  assert.match(databaseJob, /supabase db advisors --local --type security --fail-on error/);
});

test('database commands pin the CLI and do not select a remote target', () => {
  assert.match(databaseJob, /supabase\/setup-cli@[a-f0-9]{40}/);
  assert.match(databaseJob, /version: 2\.109\.1/);
  assert.match(scripts['test:supabase'], /npx --yes supabase@2\.109\.1 test db --local supabase\/tests$/);
  assert.ok(scripts['test:supabase'].includes('node scripts/supabase-ci-contract.cjs'));
  assert.doesNotMatch(databaseJob, /secrets\.|--linked|--db-url|supabase (?:link|login|db push|functions deploy)\b/);
  assert.doesNotMatch(databaseJob, /continue-on-error/);
});

test('database job preserves logs and always cleans up only its own project', () => {
  assert.match(databaseJob, /name: Stop disposable database\s+if: always\(\)/);
  assert.match(databaseJob, /supabase stop --project-id Interest_Shield --no-backup/);
  assert.doesNotMatch(databaseJob, /supabase stop[^\n]*--all/);
  assert.match(databaseJob, /name: Upload database isolation proof\s+if: always\(\)/);
  assert.match(databaseJob, /path: \$\{\{ runner.temp \}\}\/backend-isolation/);
  assert.match(databaseJob, /tee "\$RUNNER_TEMP\/backend-isolation\/pgtap\.log"/);
  assert.match(databaseJob, /tee "\$RUNNER_TEMP\/backend-isolation\/pgtap-repeat\.log"/);
});
