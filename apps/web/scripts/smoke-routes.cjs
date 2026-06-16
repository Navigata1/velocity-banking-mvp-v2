/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = 5000;
const origin = `http://${host}:${port}`;
const routes = [
  ['/', 'Dashboard'],
  ['/simulator', 'Simulator'],
  ['/cockpit', 'Cockpit'],
  ['/portfolio', 'Portfolio'],
  ['/learn', 'Learn'],
  ['/settings', 'Settings'],
  ['/vault', 'Vault'],
];

function requestRoute(route) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${origin}${route}`, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({ body, response });
      });
    });

    request.on('error', reject);
    request.setTimeout(6000, () => {
      request.destroy(new Error(`Timed out requesting ${route}`));
    });
  });
}

async function waitForServer(server) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    if (server.exitCode !== null) {
      throw new Error('Next route smoke server exited before it was ready.');
    }

    try {
      const { response } = await requestRoute('/');
      if (response.statusCode === 200) return;
    } catch {
      // Retry until the built Next server accepts connections.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Next route smoke server did not start at ${origin}.`);
}

function stopServer(server) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
}

async function run() {
  const buildManifest = path.join(appRoot, '.next', 'build-manifest.json');
  if (!fs.existsSync(buildManifest)) {
    throw new Error('Run npm run build before npm run smoke:routes.');
  }

  const startCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const startArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run start'] : ['run', 'start'];
  const server = spawn(startCommand, startArgs, {
    cwd: appRoot,
    detached: process.platform !== 'win32',
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverOutput = '';

  server.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForServer(server);

    for (const [route, label] of routes) {
      const { body, response } = await requestRoute(route);
      const contentType = String(response.headers['content-type'] || '');

      if (response.statusCode !== 200) {
        throw new Error(`${label} route ${route} returned HTTP ${response.statusCode}.`);
      }

      if (!contentType.includes('text/html')) {
        throw new Error(`${label} route ${route} returned ${contentType || 'no content type'} instead of text/html.`);
      }

      if (!body.includes('InterestShield - Financial Empowerment') || !body.includes('/_next/static')) {
        throw new Error(`${label} route ${route} did not return the expected InterestShield Next shell.`);
      }

      console.log(`PASS ${label} ${route}`);
    }
  } finally {
    stopServer(server);
  }

  if (serverOutput.trim()) {
    console.log(serverOutput.trim());
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
