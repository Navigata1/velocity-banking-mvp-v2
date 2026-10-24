/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict'), path = require('node:path');
const { spawnSync } = require('node:child_process');

// Native integration plus its focused persistence regressions, not a release gate.
const scripts = [
  'dated-provider-contract',
  'mobile-assumption-storage-contract',
  'dated-draft-contract',
  'dated-model-contract',
  'dated-common-month-contract',
  'dated-native-smoke-contract',
  'dated-ui-contract',
  'dated-route-contract',
  'dated-native-workflow-contract',
  'portfolio-model-contract',
  'financial-input-draft-contract',
  'dated-persistence-contract',
];
let failures = 0;
for (const script of scripts) {
  console.log(`COMMAND node apps/mobile/scripts/${script}.cjs`);
  const result = spawnSync(process.execPath, [path.join(__dirname, `${script}.cjs`)], {
    encoding: 'utf8', timeout: script === 'dated-persistence-contract' ? 120000 : 30000,
  });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  if (result.error) console.error(result.error);
  if (result.status !== 0 || result.error) failures++;
}
console.log(`${scripts.length} focused native integration commands: ${scripts.length - failures} passed, ${failures} failed.`);
assert.equal(failures, 0, 'Focused native dated integration contracts must all pass.');
