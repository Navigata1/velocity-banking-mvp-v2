const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

function hasCommand(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'sh';
  const args = process.platform === 'win32' ? [command] : ['-lc', `command -v ${command}`];
  const result = spawnSync(lookup, args, { encoding: 'utf8' });

  return result.status === 0;
}

function pushCheck(checks, label, passed, detail) {
  checks.push({ detail, label, passed });
}

function report(checks) {
  console.log('Native smoke preflight');

  for (const check of checks) {
    console.log(`${check.passed ? 'PASS' : 'BLOCKED'} ${check.label}: ${check.detail}`);
  }

  const blocked = checks.filter((check) => !check.passed);
  if (blocked.length > 0) {
    console.error(`Native smoke preflight blocked: ${blocked.length} item(s) need attention before Android/iOS smoke.`);
    process.exitCode = 1;
  }
}

const packageJson = readJson('package.json');
const appConfig = readJson('app.json').expo;
const easConfig = readJson('eas.json');
const checks = [];

pushCheck(
  checks,
  'Android app id',
  appConfig.android?.package === 'com.islanddevcrew.interestshield',
  appConfig.android?.package || 'missing package id'
);
pushCheck(
  checks,
  'iOS bundle id',
  appConfig.ios?.bundleIdentifier === 'com.islanddevcrew.interestshield',
  appConfig.ios?.bundleIdentifier || 'missing bundle id'
);
pushCheck(
  checks,
  'Platform list',
  appConfig.platforms?.includes('android') && appConfig.platforms?.includes('ios'),
  JSON.stringify(appConfig.platforms || [])
);
pushCheck(
  checks,
  'Android preview build',
  packageJson.scripts['build:android:preview'] === 'npx eas-cli@latest build --platform android --profile preview' &&
    easConfig.build?.preview?.android?.buildType === 'apk',
  'build:android:preview uses the EAS preview APK profile'
);
pushCheck(
  checks,
  'iOS preview build',
  packageJson.scripts['build:ios:preview'] === 'npx eas-cli@latest build --platform ios --profile preview' &&
    easConfig.build?.preview?.ios?.simulator === true,
  'build:ios:preview uses the EAS preview simulator profile'
);
pushCheck(checks, 'Node package runner', hasCommand('npx'), 'npx is required for EAS CLI commands');
pushCheck(checks, 'Android adb', hasCommand('adb'), 'adb is required to discover and control Android devices');
pushCheck(checks, 'Android emulator', hasCommand('emulator'), 'emulator is required for local Android simulator smoke');
pushCheck(
  checks,
  'iOS simulator host',
  process.platform === 'darwin',
  process.platform === 'darwin' ? 'macOS host detected' : `current host is ${process.platform}; iOS simulator smoke needs macOS`
);
pushCheck(
  checks,
  'iOS xcrun',
  process.platform === 'darwin' && hasCommand('xcrun'),
  'xcrun is required to discover and control iOS simulators'
);

report(checks);
