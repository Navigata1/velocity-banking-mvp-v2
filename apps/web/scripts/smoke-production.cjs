/* eslint-disable @typescript-eslint/no-require-imports */

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const origin = normalizeOrigin(process.env.PRODUCTION_ORIGIN || 'https://web-islanddevcrew.vercel.app');
const timeoutMs = Number(process.env.PRODUCTION_SMOKE_TIMEOUT_MS || 20000);
const maxRedirects = 4;

const routes = [
  ['/', 'Dashboard'],
  ['/simulator', 'Simulator'],
  ['/cockpit', 'Cockpit'],
  ['/portfolio', 'Portfolio'],
  ['/learn', 'Learn'],
  ['/settings', 'Settings'],
  ['/vault', 'Vault'],
];

const failureSignatures = [
  'DEPLOYMENT_NOT_FOUND',
  'This deployment has been disabled',
  'Authentication Required',
  'Vercel Authentication',
  'Application error',
  'Internal Server Error',
  '__next_error__',
];

function normalizeOrigin(value) {
  const url = new URL(value);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function requestUrl(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.get(
      url,
      {
        headers: {
          accept: 'text/html',
          'accept-encoding': 'identity',
          'user-agent': 'InterestShield-production-smoke/1.0',
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();

          if (redirects >= maxRedirects) {
            reject(new Error(`Too many redirects while requesting ${url.toString()}.`));
            return;
          }

          resolve(requestUrl(new URL(location, url), redirects + 1));
          return;
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({ body, response, url });
        });
      }
    );

    request.on('error', reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timed out requesting ${url.toString()}.`));
    });
  });
}

function assertCleanProductionShell({ body, response, route, label, url }) {
  const contentType = String(response.headers['content-type'] || '');

  if (response.statusCode !== 200) {
    throw new Error(`${label} route ${route} returned HTTP ${response.statusCode} from ${url.toString()}.`);
  }

  if (!contentType.includes('text/html')) {
    throw new Error(`${label} route ${route} returned ${contentType || 'no content type'} instead of text/html.`);
  }

  if (!body.includes('InterestShield - Financial Empowerment') || !body.includes('/_next/static')) {
    throw new Error(`${label} route ${route} did not return the expected InterestShield Next shell.`);
  }

  const failureSignature = failureSignatures.find((signature) => body.includes(signature));
  if (failureSignature) {
    throw new Error(`${label} route ${route} returned a deployment failure signature: ${failureSignature}.`);
  }
}

async function run() {
  console.log(`Production origin: ${origin}`);

  for (const [route, label] of routes) {
    const url = new URL(route, `${origin}/`);
    const result = await requestUrl(url);
    assertCleanProductionShell({ ...result, route, label });
    console.log(`PASS ${label} ${route}`);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
