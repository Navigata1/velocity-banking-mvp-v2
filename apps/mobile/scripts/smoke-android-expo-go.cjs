const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const port = process.env.ANDROID_SMOKE_PORT || '8081';
const timeoutMs = Number(process.env.ANDROID_SMOKE_TIMEOUT_MS || 180000);
const screenshotPath =
  process.env.ANDROID_SMOKE_SCREENSHOT || path.join(os.tmpdir(), 'interestshield-android-smoke.png');
const accessibilitySmoke = process.env.ANDROID_SMOKE_ACCESSIBILITY === '1';
const accessibilityScreenshotPath = process.env.ANDROID_SMOKE_ACCESSIBILITY_SCREENSHOT
  || path.join(os.tmpdir(), 'interestshield-android-accessibility-landscape.png');
const deepLinkScreenshotPath = process.env.ANDROID_SMOKE_DEEP_LINK_SCREENSHOT
  || path.join(os.tmpdir(), 'interestshield-android-settings.png');
const windowDumpPath = '/sdcard/interestshield-window.xml';
const requiredText = ['InterestShield', 'Money Loop Mobile', 'Dashboard'];
const requiredOrbitText = ['Payoff Orbit', 'LOC orbit step'];
const requiredSettingsText = ['Settings screen', 'Backend Status'];
const settingsRoutePath = '/--/settings';

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

function dumpTextExcerpt(dump) {
  const values = [];
  const pattern = /\b(?:text|content-desc)="([^"]+)"/g;
  let match;

  while ((match = pattern.exec(dump)) !== null && values.length < 30) {
    const value = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#10;/g, ' ')
      .trim();

    if (value && !values.includes(value)) {
      values.push(value);
    }
  }

  return values.join(' | ') || 'no readable text in final UI dump';
}

function dumpIncludesText(dump, text) {
  return dump.toLowerCase().includes(text.toLowerCase());
}

function getFocus(adb) {
  const result = run(adb, ['shell', 'dumpsys', 'window'], { timeout: 30000 });
  return result.output
    .split(/\r?\n/)
    .filter((line) => /mCurrentFocus|mFocusedApp/.test(line))
    .slice(0, 5)
    .join('\n');
}

function expoProjectUrl(expoLog) {
  return expoLog.match(/exp:\/\/[^\s]+/)?.[0].replace(/[),.]+$/, '') ?? null;
}

async function openSettingsRoute(adb, expoLog) {
  const projectUrl = expoProjectUrl(expoLog);
  if (!projectUrl) throw new Error('Android smoke could not find the Expo project URL for direct-route testing.');
  const settingsUrl = `${projectUrl.replace(/\/+$/, '')}${settingsRoutePath}`;
  const opened = run(adb, [
    'shell',
    'am',
    'start',
    '-W',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    settingsUrl,
    'host.exp.exponent',
  ], { timeout: 30000 });
  if (opened.status !== 0) throw new Error(`Android Settings deep link failed:\n${opened.output}`);

  const deadline = Date.now() + 30000;
  let dump = '';
  let focus = '';
  while (Date.now() < deadline) {
    await sleep(1000);
    if (dismissSystemUiAnrIfOpen(adb)) await sleep(1500);
    dump = readWindowDump(adb);
    focus = getFocus(adb);
    if (
      requiredSettingsText.every((text) => dumpIncludesText(dump, text))
      && focus.includes('ExperienceActivity')
      && !focus.includes('ErrorActivity')
    ) {
      captureScreenshot(adb, deepLinkScreenshotPath);
      return settingsUrl;
    }
  }

  throw new Error(
    `Android Settings deep link did not render. Focus: ${focus || 'unknown'}. UI: ${dumpTextExcerpt(dump)}`
  );
}

function dismissExpoMenuIfOpen(adb) {
  const dump = readWindowDump(adb);
  if (/This is the developer menu|Toggle performance monitor|Open DevTools|Go home/.test(dump)) {
    run(adb, ['shell', 'input', 'keyevent', '4'], { timeout: 10000 });
  }
}

function readSystemSetting(adb, name, fallback) {
  const result = run(adb, ['shell', 'settings', 'get', 'system', name], { timeout: 10000 });
  const value = result.output.trim();
  return result.status === 0 && value && value !== 'null' ? value : fallback;
}

function dismissSystemUiAnrIfOpen(adb) {
  const dump = readWindowDump(adb);
  if (!dumpIncludesText(dump, "System UI isn't responding")) return false;
  const waitNode = dump.match(/<node\b[^>]*\btext="Wait"[^>]*>/)?.[0];
  const bounds = waitNode?.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) return false;
  const x = Math.round((Number(bounds[1]) + Number(bounds[3])) / 2);
  const y = Math.round((Number(bounds[2]) + Number(bounds[4])) / 2);
  run(adb, ['shell', 'input', 'tap', String(x), String(y)], { timeout: 10000 });
  return true;
}

function displaySize(adb) {
  const result = run(adb, ['shell', 'wm', 'size'], { timeout: 10000 });
  const match = result.output.match(/Physical size:\s*(\d+)x(\d+)/);

  if (!match) {
    return { height: 1920, width: 1080 };
  }

  return {
    height: Number(match[2]),
    width: Number(match[1]),
  };
}

function scrollDashboardDown(adb) {
  const { height, width } = displaySize(adb);
  const x = Math.round(width / 2);
  const startY = Math.round(height * 0.78);
  const endY = Math.round(height * 0.28);
  run(adb, ['shell', 'input', 'swipe', String(x), String(startY), String(x), String(endY), '450'], {
    timeout: 10000,
  });
}

async function waitForDashboardOrbit(adb, deadline) {
  let dump = '';

  while (Date.now() < deadline) {
    dump = readWindowDump(adb);
    if (requiredOrbitText.every((text) => dumpIncludesText(dump, text))) {
      return dump;
    }

    scrollDashboardDown(adb);
    await sleep(1000);
  }

  return dump;
}

function captureScreenshot(adb, targetPath = screenshotPath) {
  const result = spawnSync(adb, ['exec-out', 'screencap', '-p'], {
    cwd: appRoot,
    env: process.env,
    maxBuffer: 30 * 1024 * 1024,
    timeout: 30000,
  });

  if (result.status !== 0 || !result.stdout?.length) {
    throw new Error('screencap did not return image data');
  }

  fs.writeFileSync(targetPath, result.stdout);
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
  let emulatorLog = '';
  let startedEmulator = false;
  let originalDeviceSettings = null;

  try {
    let device = onlineAndroidDevice(adb);
    if (!device) {
      const avds = androidAvds(emulator);
      const requestedAvdName = process.env.ANDROID_SMOKE_AVD;
      const avdName = requestedAvdName || avds[0];
      if (!avdName) {
        throw new Error('No online Android device or Android virtual device was found for smoke testing.');
      }
      if (requestedAvdName && !avds.includes(requestedAvdName)) {
        throw new Error(
          [
            `Requested Android virtual device was not available: ${requestedAvdName}`,
            `Available AVDs: ${avds.join(', ') || 'none'}`,
            'Check ANDROID_AVD_HOME and the AVD creation step before launching the emulator.',
          ].join('\n')
        );
      }

      emulatorChild = spawn(
        emulator,
        ['-avd', avdName, '-no-snapshot', '-no-boot-anim', '-no-audio', '-gpu', 'swiftshader_indirect', '-no-window'],
        {
          cwd: appRoot,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        }
      );
      emulatorChild.stdout.on('data', (chunk) => {
        emulatorLog += chunk.toString();
      });
      emulatorChild.stderr.on('data', (chunk) => {
        emulatorLog += chunk.toString();
      });
      startedEmulator = true;

      device = await waitForBootedDevice(adb, Date.now() + timeoutMs);
      if (!device) {
        throw new Error(
          [
            `Android emulator ${avdName} did not finish booting before the smoke timeout.`,
            'Recent emulator log:',
            emulatorLog.split(/\r?\n/).filter(Boolean).slice(-40).join('\n') || 'no emulator output captured',
          ].join('\n')
        );
      }
    }

    if (accessibilitySmoke) {
      originalDeviceSettings = {
        accelerometerRotation: readSystemSetting(adb, 'accelerometer_rotation', '1'),
        fontScale: readSystemSetting(adb, 'font_scale', '1.0'),
        userRotation: readSystemSetting(adb, 'user_rotation', '0'),
      };
      run(adb, ['shell', 'settings', 'put', 'system', 'font_scale', '1.8']);
      run(adb, ['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0']);
      run(adb, ['shell', 'settings', 'put', 'system', 'user_rotation', '0']);
      run(adb, ['shell', 'cmd', 'window', 'user-rotation', 'lock', '0']);
      const appliedFontScale = Number(readSystemSetting(adb, 'font_scale', '0'));
      if (Math.abs(appliedFontScale - 1.8) > 0.01) {
        throw new Error(`Android accessibility smoke could not apply font scale 1.8; observed ${appliedFontScale}.`);
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
      if (dismissSystemUiAnrIfOpen(adb)) await sleep(1500);
      dismissExpoMenuIfOpen(adb);
      finalDump = readWindowDump(adb);
      finalFocus = getFocus(adb);

      const bundleReady = expoLog.includes('Android Bundled');
      const textReady = requiredText.every((text) => dumpIncludesText(finalDump, text));
      const focusReady = finalFocus.includes('ExperienceActivity') && !finalFocus.includes('ErrorActivity');

      if (bundleReady && textReady && focusReady) {
        finalDump = await waitForDashboardOrbit(adb, deadline);
        const orbitReady = requiredOrbitText.every((text) => dumpIncludesText(finalDump, text));
        if (!orbitReady) break;

        captureScreenshot(adb);
        if (accessibilitySmoke) {
          run(adb, ['shell', 'settings', 'put', 'system', 'user_rotation', '1']);
          run(adb, ['shell', 'cmd', 'window', 'user-rotation', 'lock', '1']);
          const landscapeDeadline = Date.now() + 20000;
          let landscapeDump = '';
          let landscapeFocus = '';
          while (Date.now() < landscapeDeadline) {
            await sleep(1000);
            landscapeDump = readWindowDump(adb);
            landscapeFocus = getFocus(adb);
            const landscapeContentReady = requiredOrbitText.every((text) => dumpIncludesText(landscapeDump, text));
            if (
              landscapeDump.includes('rotation="1"')
              && landscapeFocus.includes('ExperienceActivity')
              && landscapeContentReady
            ) {
              break;
            }
          }
          const landscapeContentReady = requiredOrbitText.every((text) => dumpIncludesText(landscapeDump, text));
          if (
            !landscapeDump.includes('rotation="1"')
            || !landscapeFocus.includes('ExperienceActivity')
            || !landscapeContentReady
          ) {
            const observedRotation = landscapeDump.match(/rotation="(\d+)"/)?.[1] ?? 'unknown';
            throw new Error(
              `Android accessibility landscape check failed. Rotation: ${observedRotation}. Orbit: ${landscapeContentReady}. Focus: ${landscapeFocus || 'unknown'}`
            );
          }
          captureScreenshot(adb, accessibilityScreenshotPath);
          console.log('Android enlarged-text landscape smoke passed.');
          console.log(`Accessibility screenshot: ${accessibilityScreenshotPath}`);
        }
        if (accessibilitySmoke) {
          run(adb, ['shell', 'cmd', 'window', 'user-rotation', 'lock', '0']);
          await sleep(1000);
        }
        const settingsUrl = await openSettingsRoute(adb, expoLog);
        console.log(`Android Settings deep link passed: ${settingsUrl}`);
        console.log(`Settings screenshot: ${deepLinkScreenshotPath}`);
        console.log('Android Expo Go smoke passed.');
        console.log(`Device: ${device}`);
        console.log(`Orbit text: ${requiredOrbitText.join(', ')}`);
        console.log(`Screenshot: ${screenshotPath}`);
        return;
      }
    }

    throw new Error(
      [
        'Android Expo Go smoke timed out.',
        `Required text: ${requiredText.join(', ')}`,
        `Required orbit text after scroll: ${requiredOrbitText.join(', ')}`,
        `Focus: ${finalFocus || 'unknown'}`,
        `Final UI text excerpt: ${dumpTextExcerpt(finalDump)}`,
        'Recent Expo log:',
        expoLog.split(/\r?\n/).filter(Boolean).slice(-30).join('\n'),
      ].join('\n')
    );
  } finally {
    stopProcessTree(child);
    if (accessibilitySmoke && originalDeviceSettings) {
      run(adb, ['shell', 'settings', 'put', 'system', 'font_scale', originalDeviceSettings.fontScale]);
      run(adb, ['shell', 'settings', 'put', 'system', 'user_rotation', originalDeviceSettings.userRotation]);
      if (originalDeviceSettings.accelerometerRotation === '1') {
        run(adb, ['shell', 'cmd', 'window', 'user-rotation', 'free']);
      } else {
        run(adb, ['shell', 'cmd', 'window', 'user-rotation', 'lock', originalDeviceSettings.userRotation]);
      }
      run(adb, ['shell', 'settings', 'put', 'system', 'accelerometer_rotation', originalDeviceSettings.accelerometerRotation]);
    }
    if (startedEmulator) {
      run(adb, ['emu', 'kill'], { timeout: 10000 });
      stopProcessTree(emulatorChild);
    }
    for (const snapshot of generatedSnapshots) {
      restoreFile(snapshot);
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
