const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

function hasCommand(command) {
  return findCommand(command).found;
}

function pathExists(value) {
  return !!value && fs.existsSync(value);
}

function commandLookup(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'sh';
  const args = process.platform === 'win32' ? [command] : ['-lc', `command -v ${command}`];
  const result = spawnSync(lookup, args, { encoding: 'utf8' });

  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || command;
}

function androidSdkRoots() {
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
  ];

  if (process.platform === 'win32') {
    roots.push(
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk') : null
    );
  } else if (process.platform === 'darwin') {
    roots.push(process.env.HOME ? path.join(process.env.HOME, 'Library', 'Android', 'sdk') : null);
  } else {
    roots.push(process.env.HOME ? path.join(process.env.HOME, 'Android', 'Sdk') : null);
  }

  return [...new Set(roots.filter(Boolean))];
}

function findCommand(command, sdkRelativePath) {
  const fromPath = commandLookup(command);
  if (fromPath) {
    return {
      detail: `${command} found on PATH at ${fromPath}`,
      found: true,
      path: fromPath,
    };
  }

  if (sdkRelativePath) {
    for (const root of androidSdkRoots()) {
      const candidate = path.join(root, sdkRelativePath);
      if (pathExists(candidate)) {
        return {
          detail: `${command} found at ${candidate}; add ${path.dirname(candidate)} to PATH for Expo CLI convenience`,
          found: true,
          path: candidate,
        };
      }
    }
  }

  return {
    detail: `${command} not found on PATH, ANDROID_HOME, ANDROID_SDK_ROOT, or standard SDK locations`,
    found: false,
    path: null,
  };
}

function runTool(tool, args) {
  if (!tool.found) return { output: '', status: 1 };

  const result = spawnSync(tool.path, args, {
    encoding: 'utf8',
    timeout: 15000,
  });

  return {
    output: `${result.stdout || ''}${result.stderr || ''}`,
    status: result.status,
  };
}

function androidDevices(adbTool) {
  const result = runTool(adbTool, ['devices']);
  if (result.status !== 0) return [];

  return result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\tdevice$/.test(line));
}

function androidAvds(emulatorTool) {
  const result = runTool(emulatorTool, ['-list-avds']);
  if (result.status !== 0) return [];

  return result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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
const adbTool = findCommand('adb', path.join('platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));
const emulatorTool = findCommand(
  'emulator',
  path.join('emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator')
);
const connectedDevices = androidDevices(adbTool);
const avds = androidAvds(emulatorTool);

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
pushCheck(checks, 'Android adb', adbTool.found, adbTool.detail);
pushCheck(checks, 'Android emulator', emulatorTool.found, emulatorTool.detail);
pushCheck(
  checks,
  'Android connected device',
  connectedDevices.length > 0,
  connectedDevices.length > 0 ? connectedDevices.join(', ') : 'no adb devices are connected and online'
);
pushCheck(
  checks,
  'Android virtual device',
  avds.length > 0,
  avds.length > 0 ? avds.join(', ') : 'no Android virtual devices returned by emulator -list-avds'
);
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
