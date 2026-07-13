import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const mediaRoot = fileURLToPath(new URL('../', import.meta.url));
const remotionCli = join(dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');
const pinnedChromeVersion = readFileSync(new URL('../remotion/chrome.version', import.meta.url), 'utf8').trim();
const localChromePlatform = process.platform === 'win32'
  ? 'chrome-win64'
  : process.platform === 'darwin'
    ? (process.arch === 'arm64' ? 'chrome-mac-arm64' : 'chrome-mac-x64')
    : (process.arch === 'arm64' ? 'chrome-linux-arm64' : 'chrome-linux64');
const localChromeExecutable = process.platform === 'win32'
  ? 'chrome.exe'
  : process.platform === 'darwin'
    ? 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    : 'chrome';

function systemChromeCandidates() {
  const candidates = [
    process.env.CHROME_PATH,
    join(mediaRoot, 'remotion', '.chrome-for-testing', localChromePlatform, localChromeExecutable),
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const root of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
    if (root) candidates.push(join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  }
  return candidates.filter(Boolean);
}

export function findSystemChrome() {
  const installed = [];
  for (const chrome of systemChromeCandidates()) {
    if (!existsSync(chrome)) continue;
    const probe = process.platform === 'win32'
      ? spawnSync('powershell', ['-NoProfile', '-Command', '(Get-Item -LiteralPath $env:CHROME_PROBE_PATH).VersionInfo.ProductVersion'], {
          encoding: 'utf8',
          env: { ...process.env, CHROME_PROBE_PATH: chrome },
          timeout: 5000,
          windowsHide: true,
        })
      : spawnSync(chrome, ['--version'], { encoding: 'utf8', timeout: 5000 });
    if (probe.error || probe.status !== 0) continue;
    const reported = `${probe.stdout}${probe.stderr}`.match(/\d+\.\d+\.\d+\.\d+/)?.[0];
    if (!reported) continue;
    installed.push(`${reported} at ${chrome}`);
    if (reported === pinnedChromeVersion) {
      process.stdout.write(`[remotion] Chrome ${reported} at ${chrome}\n`);
      return chrome;
    }
  }
  const observed = installed.length > 0 ? ` Found: ${installed.join('; ')}.` : '';
  throw new Error(`Chrome ${pinnedChromeVersion} is required.${observed} Run npm run prepare:remotion-browser or set CHROME_PATH to the pinned executable.`);
}

export function runRemotion(args) {
  const browserExecutable = findSystemChrome();
  const result = spawnSync(process.execPath, [
    remotionCli,
    ...args,
    `--browser-executable=${browserExecutable}`,
  ], {
    cwd: mediaRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) runRemotion(process.argv.slice(2));
