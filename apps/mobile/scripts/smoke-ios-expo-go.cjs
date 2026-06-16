const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const port = process.env.IOS_SMOKE_PORT || '8082';
const timeoutMs = Number(process.env.IOS_SMOKE_TIMEOUT_MS || 300000);
const screenshotPath = process.env.IOS_SMOKE_SCREENSHOT || path.join(os.tmpdir(), 'interestshield-ios-smoke.png');
const macosRequiredMessage = 'iOS Expo Go smoke requires macOS with Xcode and Simulator.';

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

function captureScreenshot(udid) {
  const result = run('xcrun', ['simctl', 'io', udid, 'screenshot', screenshotPath], { timeout: 30000 });
  if (result.status !== 0 || !fs.existsSync(screenshotPath)) {
    throw new Error(`iOS simulator screenshot failed:\n${result.output}`);
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

    child = spawn(npx, ['expo', 'start', '--ios', '--localhost', '--port', port, '--clear'], {
      cwd: appRoot,
      detached: true,
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1',
      },
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

      if (expoLog.includes('iOS Bundled')) {
        await sleep(5000);
        captureScreenshot(simulator.udid);
        console.log('iOS Expo Go smoke passed.');
        console.log(`Simulator: ${simulator.name} (${simulator.udid})`);
        console.log(`Screenshot: ${screenshotPath}`);
        return;
      }
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
    for (const snapshot of generatedSnapshots) {
      restoreFile(snapshot);
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
