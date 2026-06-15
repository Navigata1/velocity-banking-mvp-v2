const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const exportRoot = path.join(appRoot, 'dist-web');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8110);
const origin = `http://${host}:${port}`;
const routes = [
  ['/', 'Dashboard'],
  ['/simulator', 'Simulator'],
  ['/cockpit', 'Cockpit'],
  ['/portfolio', 'Portfolio'],
  ['/learn', 'Learn'],
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
    request.setTimeout(5000, () => {
      request.destroy(new Error(`Timed out requesting ${route}`));
    });
  });
}

async function waitForServer(server) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 10000) {
    if (server.exitCode !== null) {
      throw new Error('Expo export smoke server exited before it was ready.');
    }

    try {
      const { response } = await requestRoute('/');
      if (response.statusCode === 200) return;
    } catch {
      // Retry until the server starts listening.
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`Expo export smoke server did not start at ${origin}.`);
}

async function run() {
  const indexPath = path.join(exportRoot, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('Run npm run build:web before npm run smoke:web-export.');
  }

  const server = spawn(process.execPath, ['scripts/serve-web-export.cjs'], {
    cwd: appRoot,
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

      if (!body.includes('_expo/static/js') || !body.includes('<title>InterestShield</title>')) {
        throw new Error(`${label} route ${route} did not return the exported InterestShield app shell.`);
      }

      console.log(`PASS ${label} ${route}`);
    }
  } finally {
    server.kill();
  }

  if (serverOutput.trim()) {
    console.log(serverOutput.trim());
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
