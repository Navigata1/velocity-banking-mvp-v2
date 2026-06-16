const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const port = process.env.ANDROID_SMOKE_PORT || '8081';
const timeoutMs = Number(process.env.ANDROID_SMOKE_TIMEOUT_MS || 180000);
const screenshotPath =
  process.env.ANDROID_SMOKE_SCREENSHOT || path.join(os.tmpdir(), 'interestshield-android-smoke.png');
const windowDumpPath = '/sdcard/interestshield-window.xml';
const requiredText = ['InterestShield', 'Money Loop Mobile', 'Dashboard'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function androidSdkRoots() {
  const roots = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];

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

function commandLookup(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'sh';
  const args = process.platform === 'win32' ? [command] : ['-lc', `command -v ${command}`];
  const result = spawnSync(lookup, args, { encoding: 'utf8' });

  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || command;
}

function findTool(command, sdkRelativePath) {
  const fromPath = commandLookup(command);
  if (fromPath) return fromPath;

  for (const root of androidSdkRoots()) {
    const candidate = path.join(root, sdkRelativePath);
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`${command} was not found on PATH or in the Android SDK`);
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

function onlineAndroidDevice(adb) {
  const result = run(adb, ['devices']);
  if (result.status !== 0) {
    throw new Error(`adb devices failed:\n${result.output}`);
  }

  return result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /\tdevice$/.test(line));
}

function androidAvds(emulator) {
  const result = run(emulator, ['-list-avds']);
  if (result.status !== 0) {
    throw new Error(`emulator -list-avds failed:\n${result.output}`);
  }

  return result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function bootCompleted(adb) {
  const result = run(adb, ['shell', 'getprop', 'sys.boot_completed'], { timeout: 10000 });
  return result.output.trim() === '1';
}

async function waitForBootedDevice(adb, deadline) {
  while (Date.now() < deadline) {
    const device = onlineAndroidDevice(adb);
    if (device && bootCompleted(adb)) return device;
    await sleep(5000);
  }

  return null;
}

function readWindowDump(adb) {
  run(adb, ['shell', 'uiautomator', 'dump', windowDumpPath], { timeout: 30000 });
  const result = run(adb, ['shell', 'cat', windowDumpPath], { timeout: 30000 });
  return result.output;
}

function getFocus(adb) {
  const result = run(adb, ['shell', 'dumpsys', 'window'], { timeout: 30000 });
  return result.output
    .split(/\r?\n/)
    .filter((line) => /mCurrentFocus|mFocusedApp/.test(line))
    .slice(0, 5)
    .join('\n');
}

function dismissExpoMenuIfOpen(adb) {
  const dump = readWindowDump(adb);
  if (/This is the developer menu|Toggle performance monitor|Open DevTools|Go home/.test(dump)) {
    run(adb, ['shell', 'input', 'keyevent', '4'], { timeout: 10000 });
  }
}

function captureScreenshot(adb) {
  const result = spawnSync(adb, ['exec-out', 'screencap', '-p'], {
    cwd: appRoot,
    env: process.env,
    maxBuffer: 30 * 1024 * 1024,
    timeout: 30000,
  });

  if (result.status !== 0 || !result.stdout?.length) {
    throw new Error('screencap did not return image data');
  }

  fs.writeFileSync(screenshotPath, result.stdout);
}

function stopProcessTree(child) {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8' });
    return;
  }

  child.kill('SIGTERM');
}

async function main() {
  const generatedSnapshots = [snapshotFile('expo-env.d.ts'), snapshotFile('.gitignore')];
  const adb = findTool('adb', path.join('platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb'));
  const emulator = findTool(
    'emulator',
    path.join('emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator')
  );
  const sdkRoot = path.dirname(path.dirname(adb));
  const env = {
    ...process.env,
    ANDROID_HOME: process.env.ANDROID_HOME || sdkRoot,
    ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || sdkRoot,
    PATH: [path.join(sdkRoot, 'platform-tools'), path.join(sdkRoot, 'emulator'), process.env.PATH]
      .filter(Boolean)
      .join(path.delimiter),
  };
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  let child;
  let emulatorChild;
  let startedEmulator = false;

  try {
    let device = onlineAndroidDevice(adb);
    if (!device) {
      const avds = androidAvds(emulator);
      const avdName = process.env.ANDROID_SMOKE_AVD || avds[0];
      if (!avdName) {
        throw new Error('No online Android device or Android virtual device was found for smoke testing.');
      }

      emulatorChild = spawn(
        emulator,
        ['-avd', avdName, '-no-snapshot', '-no-boot-anim', '-no-audio', '-gpu', 'swiftshader_indirect', '-no-window'],
        {
          cwd: appRoot,
          env,
          stdio: ['ignore', 'ignore', 'ignore'],
          windowsHide: true,
        }
      );
      startedEmulator = true;

      device = await waitForBootedDevice(adb, Date.now() + timeoutMs);
      if (!device) {
        throw new Error(`Android emulator ${avdName} did not finish booting before the smoke timeout.`);
      }
    }

    run(adb, ['shell', 'am', 'force-stop', 'host.exp.exponent'], { timeout: 30000 });
    run(adb, ['logcat', '-c'], { timeout: 30000 });
    child = spawn(npx, ['expo', 'start', '--android', '--lan', '--port', port, '--clear'], {
      cwd: appRoot,
      env,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let expoLog = '';
    child.stdout.on('data', (chunk) => {
      expoLog += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      expoLog += chunk.toString();
    });

    const deadline = Date.now() + timeoutMs;
    let finalDump = '';
    let finalFocus = '';

    while (Date.now() < deadline) {
      await sleep(5000);
      dismissExpoMenuIfOpen(adb);
      finalDump = readWindowDump(adb);
      finalFocus = getFocus(adb);

      const bundleReady = expoLog.includes('Android Bundled');
      const textReady = requiredText.every((text) => finalDump.includes(text));
      const focusReady = finalFocus.includes('ExperienceActivity') && !finalFocus.includes('ErrorActivity');

      if (bundleReady && textReady && focusReady) {
        captureScreenshot(adb);
        console.log('Android Expo Go smoke passed.');
        console.log(`Device: ${device}`);
        console.log(`Screenshot: ${screenshotPath}`);
        return;
      }
    }

    throw new Error(
      [
        'Android Expo Go smoke timed out.',
        `Required text: ${requiredText.join(', ')}`,
        `Focus: ${finalFocus || 'unknown'}`,
        'Recent Expo log:',
        expoLog.split(/\r?\n/).filter(Boolean).slice(-30).join('\n'),
      ].join('\n')
    );
  } finally {
    stopProcessTree(child);
    if (startedEmulator) {
      run(adb, ['emu', 'kill'], { timeout: 10000 });
      stopProcessTree(emulatorChild);
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
