const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const port = process.env.IOS_SMOKE_PORT || '8082';
const timeoutMs = Number(process.env.IOS_SMOKE_TIMEOUT_MS || 300000);
const screenshotPath = process.env.IOS_SMOKE_SCREENSHOT || path.join(os.tmpdir(), 'interestshield-ios-smoke.png');
const deepLinkScreenshotPath = process.env.IOS_SMOKE_DEEP_LINK_SCREENSHOT
  || path.join(os.tmpdir(), 'interestshield-ios-settings.png');
const ocrSourcePath = path.join(__dirname, 'ocr-ios-screenshot.swift');
const ocrBinaryPath = path.join(os.tmpdir(), `interestshield-ios-ocr-${process.pid}`);
const expoGoBundleId = 'host.exp.Exponent';
const expoGoVersion = '56.0.4';
const expoGoSha256 = 'e6ed55f7ad9c31c81e819addcb79ed8f0cd629950517d84328e377f182104eed';
const expoGoArchivePath = path.join(os.tmpdir(), `Expo-Go-${expoGoVersion}.tar.gz`);
const requiredDashboardText = [
  'InterestShield',
  'Dashboard',
  'Money Loop Mobile',
  'Simulator',
  'Cockpit',
  'Portfolio',
  'Learn',
  'Vault',
  'Settings',
];
const requiredSettingsText = [
  'Settings',
  'secure native storage',
  'Money Loop Mobile',
  'Dashboard',
  'Simulator',
  'Cockpit',
  'Portfolio',
  'Learn',
  'Vault',
];
const exactOcrText = new Set([
  'interestshield',
  'dashboard',
  'money loop mobile',
  'simulator',
  'cockpit',
  'portfolio',
  'learn',
  'vault',
  'settings',
]);
const shellNavigationText = [
  'dashboard',
  'simulator',
  'cockpit',
  'portfolio',
  'learn',
  'vault',
  'settings',
];
const settingsRoutePath = '/--/settings';
const macosRequiredMessage = 'iOS Expo Go smoke requires macOS with Xcode and Simulator.';
let expoGoDownloadRoot;

if (process.platform !== 'darwin') {
  console.error(macosRequiredMessage);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || appRoot,
    encoding: options.encoding ?? 'utf8',
    env: options.env || process.env,
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
    timeout: options.timeout || 30000,
  });

  return {
    output: `${result.stdout || ''}${result.stderr || ''}`,
    status: result.status,
    stdout: result.stdout,
  };
}

function snapshotFile(relativePath) {
  const filePath = path.join(appRoot, relativePath);
  return {
    content: fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null,
    existed: fs.existsSync(filePath),
    filePath,
  };
}

function restoreFile(snapshot) {
  if (snapshot.existed) {
    fs.writeFileSync(snapshot.filePath, snapshot.content);
    return;
  }

  if (fs.existsSync(snapshot.filePath)) {
    fs.rmSync(snapshot.filePath, { force: true });
  }
}

function requireXcodeTools() {
  const result = run('xcrun', ['simctl', 'help'], { timeout: 60000 });
  if (result.status !== 0) {
    throw new Error(`xcrun simctl was not available. ${macosRequiredMessage}\n${result.output}`);
  }
}

function parseAvailableIphoneSimulators() {
  const result = run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], {
    maxBuffer: 40 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`xcrun simctl list devices failed:\n${result.output}`);
  }

  const parsed = JSON.parse(result.output);
  const devices = [];

  for (const [runtime, runtimeDevices] of Object.entries(parsed.devices || {})) {
    if (!/iOS/i.test(runtime)) continue;

    for (const device of runtimeDevices) {
      if (!device.isAvailable || !/iPhone/i.test(device.name)) continue;
      devices.push({
        name: device.name,
        runtime,
        state: device.state,
        udid: device.udid,
      });
    }
  }

  return devices;
}

function chooseSimulator() {
  const devices = parseAvailableIphoneSimulators();
  const requested = process.env.IOS_SMOKE_SIMULATOR;

  if (requested) {
    const match = devices.find((device) => device.udid === requested || device.name === requested);
    if (match) return match;
    throw new Error(`Requested iOS simulator was not available: ${requested}`);
  }

  const booted = devices.find((device) => device.state === 'Booted');
  if (booted) return booted;

  const preferredPatterns = [
    /^iPhone \d+ Pro Max$/i,
    /^iPhone \d+ Pro$/i,
    /^iPhone \d+$/i,
    /^iPhone (?!SE)/i,
    /^iPhone SE/i,
  ];
  for (const pattern of preferredPatterns) {
    const preferred = devices.find((device) => pattern.test(device.name));
    if (preferred) return preferred;
  }

  const fallback = devices[0];
  if (fallback) return fallback;

  throw new Error('No available iPhone Simulator was found for iOS smoke testing.');
}

function bootSimulator(device) {
  if (device.state === 'Booted') return false;

  const boot = run('xcrun', ['simctl', 'boot', device.udid], { timeout: 60000 });
  if (boot.status !== 0 && !/Booted|Unable to boot device in current state/i.test(boot.output)) {
    throw new Error(`Failed to boot iOS Simulator ${device.name}:\n${boot.output}`);
  }

  spawnSync('open', ['-a', 'Simulator'], {
    cwd: appRoot,
    encoding: 'utf8',
    timeout: 10000,
  });

  const bootStatus = run('xcrun', ['simctl', 'bootstatus', device.udid, '-b'], { timeout: timeoutMs });
  if (bootStatus.status !== 0) {
    throw new Error(`iOS Simulator ${device.name} did not finish booting:\n${bootStatus.output}`);
  }

  return true;
}

function captureScreenshot(udid, targetPath = screenshotPath) {
  const result = run('xcrun', ['simctl', 'io', udid, 'screenshot', targetPath], { timeout: 30000 });
  if (result.status !== 0 || !fs.existsSync(targetPath)) {
    throw new Error(`iOS simulator screenshot failed:\n${result.output}`);
  }
}

function compileOcrHelper() {
  if (fs.existsSync(ocrBinaryPath)) return;
  const compiled = run('xcrun', ['swiftc', ocrSourcePath, '-o', ocrBinaryPath], { timeout: 120000 });
  if (compiled.status !== 0) throw new Error(`iOS screenshot OCR helper failed to compile:\n${compiled.output}`);
}

function parseOcrRecords(recognizedText) {
  return recognizedText
    .split(/\r?\n/)
    .map((line) => {
      try {
        const record = JSON.parse(line);
        if (typeof record.text !== 'string') return null;
        return {
          ...record,
          centerX: Number(record.x) + (Number(record.width) / 2),
          centerY: Number(record.y) + (Number(record.height) / 2),
          normalizedText: record.text.trim().toLowerCase(),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function ocrTextSummary(recognizedText) {
  return parseOcrRecords(recognizedText).map((record) => record.text).join(' | ');
}

function ocrIncludesText(recognizedText, requiredText) {
  const normalizedRequired = requiredText.trim().toLowerCase();
  const records = parseOcrRecords(recognizedText);

  if (exactOcrText.has(normalizedRequired)) {
    return records.some((record) => record.normalizedText === normalizedRequired);
  }
  return records.some((record) => record.normalizedText.includes(normalizedRequired));
}

function followsReadingOrder(previous, next) {
  const sameRowTolerance = Math.max(previous.height, next.height) * 0.75;
  if (Math.abs(previous.centerY - next.centerY) <= sameRowTolerance) {
    return next.centerX > previous.centerX;
  }
  return next.centerY < previous.centerY;
}

function orderedNavigationExists(recordGroups, index = 0, previous = null) {
  if (index === recordGroups.length) return true;
  return recordGroups[index].some((record) => {
    if (previous && !followsReadingOrder(previous, record)) return false;
    return orderedNavigationExists(recordGroups, index + 1, record);
  });
}

function shellLayoutIsValid(recognizedText) {
  const records = parseOcrRecords(recognizedText);
  const headers = records.filter((record) => record.normalizedText === 'money loop mobile');
  return headers.some((header) => {
    const recordGroups = shellNavigationText.map(
      (text) => records.filter(
        (record) => record.normalizedText === text && record.centerY < header.centerY
      )
    );
    return recordGroups.every((group) => group.length > 0)
      && orderedNavigationExists(recordGroups);
  });
}

async function waitForScreenText(udid, targetPath, requiredText, label) {
  compileOcrHelper();
  const deadline = Date.now() + 45000;
  let recognizedText = '';
  while (Date.now() < deadline) {
    await sleep(3000);
    captureScreenshot(udid, targetPath);
    const recognized = run(ocrBinaryPath, [targetPath], { timeout: 30000 });
    recognizedText = recognized.output;
    if (
      recognized.status === 0
      && requiredText.every((text) => ocrIncludesText(recognizedText, text))
      && shellLayoutIsValid(recognizedText)
    ) {
      await sleep(1500);
      captureScreenshot(udid, targetPath);
      const settled = run(ocrBinaryPath, [targetPath], { timeout: 30000 });
      const settledText = settled.output;
      if (
        settled.status === 0
        && requiredText.every((text) => ocrIncludesText(settledText, text))
        && shellLayoutIsValid(settledText)
      ) {
        return;
      }
      recognizedText = settledText;
    }
  }

  throw new Error(
    `iOS ${label} did not render required text: ${requiredText.join(', ')}. `
    + `Recognized text: ${ocrTextSummary(recognizedText) || 'none'}`
  );
}

async function openColdProjectUrl(udid, targetUrl, label) {
  const terminated = run('xcrun', ['simctl', 'terminate', udid, expoGoBundleId], { timeout: 30000 });
  if (terminated.status !== 0) throw new Error(`Expo Go could not be reset before the ${label} launch:\n${terminated.output}`);
  await sleep(1000);
  const opened = run('xcrun', ['simctl', 'openurl', udid, targetUrl], { timeout: 30000 });
  if (opened.status !== 0) throw new Error(`iOS ${label} launch failed:\n${opened.output}`);
}

async function openSettingsRoute(udid, projectUrl) {
  const settingsUrl = `${projectUrl.replace(/\/+$/, '')}${settingsRoutePath}`;
  await openColdProjectUrl(udid, settingsUrl, 'Settings deep link');

  await waitForScreenText(udid, deepLinkScreenshotPath, requiredSettingsText, 'Settings deep link');
  return settingsUrl;
}

function expoGoIsInstalled(udid) {
  const result = run('xcrun', ['simctl', 'get_app_container', udid, expoGoBundleId, 'app'], {
    timeout: 30000,
  });
  return result.status === 0;
}

function installedExpoGoVersion(udid) {
  const container = run('xcrun', ['simctl', 'get_app_container', udid, expoGoBundleId, 'app'], {
    timeout: 30000,
  });
  const appPath = container.output.trim();
  if (container.status !== 0 || !appPath) return null;
  const version = run('/usr/libexec/PlistBuddy', [
    '-c',
    'Print :CFBundleShortVersionString',
    path.join(appPath, 'Info.plist'),
  ], { timeout: 30000 });
  return version.status === 0 ? version.output.trim() : null;
}

function reopenProjectInExpoGo(udid, projectUrl) {
  const launch = run('xcrun', ['simctl', 'launch', udid, expoGoBundleId], { timeout: 30000 });
  if (launch.status !== 0) return false;

  const opened = run('xcrun', ['simctl', 'openurl', udid, projectUrl], { timeout: 30000 });
  if (opened.status !== 0) return false;

  console.log(`Reopened Expo Go project through simctl: ${projectUrl}`);
  return true;
}

function expoSdkVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const version = String(packageJson.dependencies?.expo || '').match(/\d+/)?.[0];
  if (!version) throw new Error('Unable to resolve the Expo SDK version from package.json.');
  return version;
}

function localNetworkAddress() {
  const defaultRoute = run('route', ['-n', 'get', 'default'], { timeout: 30000 });
  const defaultInterface = defaultRoute.output.match(/^\s*interface:\s*(\S+)/m)?.[1];
  if (defaultRoute.status === 0 && defaultInterface) {
    const defaultAddress = run('ipconfig', ['getifaddr', defaultInterface], { timeout: 30000 });
    const address = defaultAddress.output.trim();
    if (defaultAddress.status === 0 && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return address;
  }

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if ((address.family === 'IPv4' || address.family === 4) && !address.internal) return address.address;
    }
  }
  return null;
}

function resolvedExpoProjectUrl() {
  const endpoint = `http://127.0.0.1:${port}/_expo/open?platform=ios&runtime=expo`;
  const response = run('curl', ['--fail', '--silent', '--show-error', endpoint], { timeout: 30000 });
  if (response.status !== 0) return null;

  try {
    const pending = [JSON.parse(response.output)];
    while (pending.length) {
      const value = pending.shift();
      if (typeof value === 'string' && value.startsWith('exp://')) return value;
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(...Object.values(value));
    }
  } catch {
    return null;
  }
  return null;
}

function expoGoArchiveSha256() {
  if (!fs.existsSync(expoGoArchivePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(expoGoArchivePath)).digest('hex');
}

function downloadExpoGoArchive(downloadUrl) {
  const download = run('curl', [
    '--location', '--fail', '--silent', '--show-error', '--output', expoGoArchivePath, downloadUrl,
  ], { timeout: 240000 });
  if (download.status !== 0) throw new Error(`Expo Go ${expoGoVersion} download failed:\n${download.output}`);
}

function downloadExpoGoArchiveWithInstalledFallback(udid, downloadUrl) {
  try {
    downloadExpoGoArchive(downloadUrl);
    return true;
  } catch (error) {
    const installedVersion = installedExpoGoVersion(udid);
    if (installedVersion !== expoGoVersion) throw error;
    console.log(
      `Reusing installed Expo Go ${installedVersion} because the verified archive could not be downloaded.`
    );
    return false;
  }
}

function preinstallExpoGo(udid) {
  const sdkVersion = expoSdkVersion();
  if (sdkVersion !== expoGoVersion.split('.')[0]) {
    throw new Error(`Pinned Expo Go ${expoGoVersion} does not match project SDK ${sdkVersion}.`);
  }

  const downloadUrl = `https://github.com/expo/expo-go-releases/releases/download/Expo-Go-${expoGoVersion}`
    + `/Expo-Go-${expoGoVersion}.tar.gz`;
  if (
    !fs.existsSync(expoGoArchivePath)
    && !downloadExpoGoArchiveWithInstalledFallback(udid, downloadUrl)
  ) return;

  let actualSha256 = expoGoArchiveSha256();
  if (actualSha256 !== expoGoSha256) {
    fs.rmSync(expoGoArchivePath, { force: true });
    if (!downloadExpoGoArchiveWithInstalledFallback(udid, downloadUrl)) return;
    actualSha256 = expoGoArchiveSha256();
  }

  if (actualSha256 !== expoGoSha256) {
    throw new Error(`Expo Go ${expoGoVersion} checksum mismatch: ${actualSha256}`);
  }

  expoGoDownloadRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'interestshield-expo-go-'));
  const appPath = path.join(expoGoDownloadRoot, `Expo-Go-${expoGoVersion}.app`);
  fs.mkdirSync(appPath);
  const extracted = run('tar', ['-xzf', expoGoArchivePath, '-C', appPath], { timeout: 120000 });
  if (extracted.status !== 0) throw new Error(`Expo Go ${expoGoVersion} extraction failed:\n${extracted.output}`);

  run('xcrun', ['simctl', 'uninstall', udid, expoGoBundleId], { timeout: 30000 });
  const install = run('xcrun', ['simctl', 'install', udid, appPath], {
    timeout: 120000,
  });
  if (install.status !== 0) throw new Error(`Expo Go ${expoGoVersion} install failed:\n${install.output}`);

  console.log(`Preinstalled verified Expo Go ${expoGoVersion}: ${path.basename(appPath)}`);
}

function preapproveExpoGoScheme(udid) {
  const approvalPlist = path.join(
    os.homedir(),
    'Library',
    'Developer',
    'CoreSimulator',
    'Devices',
    udid,
    'data',
    'Library',
    'Preferences',
    'com.apple.launchservices.schemeapproval.plist'
  );
  fs.mkdirSync(path.dirname(approvalPlist), { recursive: true });
  const approvalKey = `${'com.apple.CoreSimulator.CoreSimulatorBridge'}-->exp`;
  run('/usr/libexec/PlistBuddy', ['-c', `Delete ${approvalKey}`, approvalPlist], { timeout: 30000 });
  const approved = run('/usr/libexec/PlistBuddy', [
    '-c',
    `Add ${approvalKey} string ${expoGoBundleId}`,
    approvalPlist,
  ], { timeout: 30000 });
  if (approved.status !== 0) throw new Error(`Expo Go URL scheme preapproval failed:\n${approved.output}`);
}

function preconfigureExpoGoPreferences(udid) {
  const preferences = [
    ['EXDevMenuIsOnboardingFinished', 'true'],
    ['EXDevMenuShowsAtLaunch', 'false'],
    ['EXDevMenuShowFloatingActionButton', 'false'],
  ];

  for (const [key, value] of preferences) {
    const configured = run('xcrun', [
      'simctl',
      'spawn',
      udid,
      'defaults',
      'write',
      expoGoBundleId,
      key,
      '-bool',
      value,
    ], { timeout: 30000 });
    if (configured.status !== 0) {
      throw new Error(`Expo Go preference ${key} could not be configured:\n${configured.output}`);
    }
  }
}

function stopProcessTree(child) {
  if (!child || child.exitCode !== null) return;

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

async function main() {
  const generatedSnapshots = [snapshotFile('expo-env.d.ts'), snapshotFile('.gitignore')];
  const npx = 'npx';
  let child;
  let bootedBySmoke = false;
  let simulator;

  try {
    requireXcodeTools();
    simulator = chooseSimulator();
    bootedBySmoke = bootSimulator(simulator);
    preinstallExpoGo(simulator.udid);
    preconfigureExpoGoPreferences(simulator.udid);
    preapproveExpoGoScheme(simulator.udid);
    const packagerHostname = localNetworkAddress();
    const metroTransport = packagerHostname ? '--lan' : '--localhost';
    const fallbackProjectUrl = `exp://${packagerHostname || '127.0.0.1'}:${port}`;
    const metroEnv = {
      ...process.env,
      EXPO_NO_TELEMETRY: '1',
      ...(packagerHostname ? { REACT_NATIVE_PACKAGER_HOSTNAME: packagerHostname } : {}),
    };

    child = spawn(npx, ['expo', 'start', '--go', metroTransport, '--port', port, '--clear'], {
      cwd: appRoot,
      detached: true,
      env: metroEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let expoLog = '';
    child.stdout.on('data', (chunk) => {
      expoLog += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      expoLog += chunk.toString();
    });

    const deadline = Date.now() + timeoutMs;
    let lastReopenAt = 0;
    let projectUrl;

    while (Date.now() < deadline) {
      await sleep(5000);

      if (child.exitCode !== null) {
        throw new Error(
          [
            'Expo CLI exited before the iOS smoke completed.',
            'Recent Expo log:',
            expoLog.split(/\r?\n/).filter(Boolean).slice(-30).join('\n'),
          ].join('\n')
        );
      }

      if (expoLog.includes('CommandError') || expoLog.includes('Metro error')) {
        throw new Error(
          [
            'Expo CLI reported an iOS smoke error.',
            'Recent Expo log:',
            expoLog.split(/\r?\n/).filter(Boolean).slice(-30).join('\n'),
          ].join('\n')
        );
      }

      const metroIsReady = expoLog.includes('Waiting on http://') || expoLog.includes('Metro waiting on');
      if (metroIsReady && Date.now() - lastReopenAt >= 15000 && expoGoIsInstalled(simulator.udid)) {
        projectUrl = resolvedExpoProjectUrl() || projectUrl;
        reopenProjectInExpoGo(simulator.udid, projectUrl || fallbackProjectUrl);
        lastReopenAt = Date.now();
      }

      if (expoLog.includes('iOS Bundled')) {
        projectUrl = resolvedExpoProjectUrl() || projectUrl || fallbackProjectUrl;
        await waitForScreenText(simulator.udid, screenshotPath, requiredDashboardText, 'Dashboard');
        const settingsUrl = await openSettingsRoute(simulator.udid, projectUrl);
        console.log('iOS Expo Go smoke passed.');
        console.log(`Simulator: ${simulator.name} (${simulator.udid})`);
        console.log(`Screenshot: ${screenshotPath}`);
        console.log(`iOS Settings deep link passed: ${settingsUrl}`);
        console.log(`Settings screenshot: ${deepLinkScreenshotPath}`);
        return;
      }
    }

    try {
      captureScreenshot(simulator.udid);
    } catch {
      // The Metro log remains the primary diagnostic if Simulator screenshot capture also fails.
    }
    throw new Error(
      [
        'iOS Expo Go smoke timed out.',
        `Simulator: ${simulator.name} (${simulator.udid})`,
        'Recent Expo log:',
        expoLog.split(/\r?\n/).filter(Boolean).slice(-30).join('\n'),
      ].join('\n')
    );
  } finally {
    stopProcessTree(child);
    if (bootedBySmoke && simulator) {
      run('xcrun', ['simctl', 'shutdown', simulator.udid], { timeout: 30000 });
    }
    if (fs.existsSync(ocrBinaryPath)) fs.rmSync(ocrBinaryPath, { force: true });
    if (expoGoDownloadRoot) fs.rmSync(expoGoDownloadRoot, { recursive: true, force: true });
    for (const snapshot of generatedSnapshots) {
      restoreFile(snapshot);
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
