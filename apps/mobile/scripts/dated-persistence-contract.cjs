/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Focused transport regressions only. No builds, numerical gates, cloud or device IO.
const scripts = [
  'dated-storage-contract',
  'portfolio-storage-contract',
  'portfolio-owner-storage-contract',
  'portfolio-session-contract',
  'portfolio-hook-contract',
  'portfolio-transfer-contract',
  'portfolio-snapshot-contract',
  'snapshot-outbox-contract',
  'snapshot-outbox-replay-contract',
  'snapshot-recovery-contract',
  'recovery-hook-contract',
  'recovery-review-ui-contract',
];
let failures = 0;
for (const script of scripts) {
  console.log(`COMMAND node apps/mobile/scripts/${script}.cjs`);
  const result = spawnSync(process.execPath, [path.join(__dirname, `${script}.cjs`)], {
    encoding: 'utf8', timeout: 30000,
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) console.error(result.error);
  if (result.status !== 0 || result.error) failures++;
}
console.log(`${scripts.length} focused native persistence commands: ${scripts.length - failures} passed, ${failures} failed.`);
assert.equal(failures, 0, 'Native persistence transport regressions must all pass.');
