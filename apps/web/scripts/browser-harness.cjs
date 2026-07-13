/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function findOnPath(command) {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(locator, [command], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
}

function findBrowserExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    localAppData && path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    localAppData && path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ...['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge']
      .flatMap(findOnPath),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getHeadlessChromiumArgs() {
  return [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-gpu-blocklist',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
  ];
}

module.exports = { findBrowserExecutable, getHeadlessChromiumArgs };
