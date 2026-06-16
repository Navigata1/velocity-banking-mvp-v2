const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const outputDir = path.resolve(appRoot, process.env.IOS_BUNDLE_OUTPUT_DIR || 'dist-ios');
const timeoutMs = Number(process.env.IOS_BUNDLE_TIMEOUT_MS || 300000);

function assertInsideApp(targetPath) {
  const relative = path.relative(appRoot, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to use iOS bundle output outside app root: ${targetPath}`);
  }
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

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function recentOutput(result) {
  return `${result.stdout || ''}${result.stderr || ''}`.split(/\r?\n/).filter(Boolean).slice(-60).join('\n');
}

function main() {
  assertInsideApp(outputDir);

  const generatedSnapshots = [snapshotFile('expo-env.d.ts'), snapshotFile('.gitignore')];
  const npx = 'npx';

  try {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    const outputArg = path.relative(appRoot, outputDir).replace(/\\/g, '/') || '.';
    const result = spawnSync(npx, ['expo', 'export', '--platform', 'ios', '--output-dir', outputArg, '--clear'], {
      cwd: appRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1',
      },
      maxBuffer: 40 * 1024 * 1024,
      shell: process.platform === 'win32',
      timeout: timeoutMs,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(`iOS bundle export failed:\n${recentOutput(result)}`);
    }

    const files = walkFiles(outputDir);
    const normalizedFiles = files.map((file) => file.replace(/\\/g, '/'));
    const metadataPath = path.join(outputDir, 'metadata.json');
    const iosBundleFiles = normalizedFiles.filter(
      (file) => file.includes('/_expo/static/js/ios/') && /\.(?:hbc|js)$/.test(file)
    );

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`iOS bundle export did not create metadata.json in ${outputDir}`);
    }

    if (iosBundleFiles.length === 0) {
      throw new Error(`iOS bundle export did not create an iOS JS bundle in ${outputDir}`);
    }

    console.log('iOS bundle export smoke passed.');
    console.log(`Output: ${outputDir}`);
    console.log(`Bundle files: ${iosBundleFiles.map((file) => path.relative(outputDir, file)).join(', ')}`);
  } finally {
    for (const snapshot of generatedSnapshots) {
      restoreFile(snapshot);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
