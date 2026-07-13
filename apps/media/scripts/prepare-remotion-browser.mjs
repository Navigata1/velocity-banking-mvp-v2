import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mediaRoot = fileURLToPath(new URL('../', import.meta.url));
const pinnedVersion = (await readFile(new URL('../remotion/chrome.version', import.meta.url), 'utf8')).trim();
const platform = process.platform === 'win32'
  ? 'win64'
  : process.platform === 'darwin'
    ? (process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64')
    : process.arch === 'arm64'
      ? 'linux-arm64'
      : 'linux64';
const archiveName = `chrome-${platform}.zip`;
const outputRoot = join(mediaRoot, 'remotion', '.chrome-for-testing');
const archivePath = join(outputRoot, archiveName);
const url = `https://storage.googleapis.com/chrome-for-testing-public/${pinnedVersion}/${platform}/${archiveName}`;

await mkdir(outputRoot, { recursive: true });
process.stdout.write(`Downloading Chrome for Testing ${pinnedVersion} (${platform})...\n`);
const response = await fetch(url);
if (!response.ok) throw new Error(`Chrome download failed: ${response.status} ${response.statusText}`);
await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));

const extraction = spawnSync('tar', ['-xf', archivePath, '-C', outputRoot], { stdio: 'inherit' });
if (extraction.error) throw extraction.error;
if (extraction.status !== 0) throw new Error(`Chrome extraction failed with status ${extraction.status}.`);
await rm(archivePath, { force: true });
process.stdout.write(`Prepared pinned Chrome ${pinnedVersion} in ${outputRoot}.\n`);
