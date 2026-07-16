/* eslint-disable @typescript-eslint/no-require-imports */

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const origin = normalizeOrigin(process.env.PRODUCTION_ORIGIN || 'https://web-islanddevcrew.vercel.app');
const timeoutMs = Number(process.env.PRODUCTION_SMOKE_TIMEOUT_MS || 20000);
const protectionBypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET || process.env.VERCEL_PROTECTION_BYPASS_SECRET || '';
const githubRepository = process.env.GITHUB_REPOSITORY || 'Navigata1/velocity-banking-mvp-v2';
const githubToken = process.env.GITHUB_TOKEN || '';
const vercelTeamSlug = process.env.VERCEL_TEAM_SLUG || 'islanddevcrew';
const vercelProjectSlug = process.env.VERCEL_PROJECT_SLUG || 'velocity-banking-mvp-v2';
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

const protectedDeploymentSignatures = [
  'Authentication Required',
  'Vercel Authentication',
  'Password Protection',
  'Deployment Protection',
  'data-testid="login/email-button"',
  'Continue with Email',
  'sso-api?url=',
];

const failureSignatures = [
  'DEPLOYMENT_NOT_FOUND',
  'This deployment has been disabled',
  ...protectedDeploymentSignatures,
  'Application error',
  'Internal Server Error',
  '__next_error__',
];

const currentShellSignatures = [
  'data-testid="primary-navigation"',
];

const staleProductionSignatures = [
  'Welcome to InterestShield',
  'How Interest Really Works',
  'This is NOT a budget app',
  'Financial Health',
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
    const headers = {
      accept: 'text/html',
      'accept-encoding': 'identity',
      'user-agent': 'InterestShield-production-smoke/1.0',
    };

    if (protectionBypassSecret) {
      headers['x-vercel-protection-bypass'] = protectionBypassSecret;
    }

    const request = client.get(
      url,
      {
        headers,
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

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      accept: 'application/vnd.github+json',
      'user-agent': 'InterestShield-production-smoke/1.0',
      'x-github-api-version': '2022-11-28',
    };

    if (githubToken) {
      headers.authorization = `Bearer ${githubToken}`;
    }

    const request = https.get(url, { headers }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`GitHub API returned HTTP ${response.statusCode}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timed out requesting ${url.toString()}.`));
    });
  });
}

async function fetchLatestGitHubProductionDeployment() {
  const deploymentsUrl = new URL(`https://api.github.com/repos/${githubRepository}/deployments`);
  deploymentsUrl.searchParams.set('environment', 'Production');
  deploymentsUrl.searchParams.set('per_page', '1');

  try {
    const deployments = await requestJson(deploymentsUrl);
    const [deployment] = Array.isArray(deployments) ? deployments : [];

    if (!deployment?.statuses_url) {
      return {
        diagnostics: '',
        remediation: '',
      };
    }

    const statuses = await requestJson(new URL(deployment.statuses_url));
    const latestStatus = Array.isArray(statuses) ? statuses[0] : undefined;
    const targetUrl = latestStatus?.target_url || latestStatus?.log_url;

    if (!targetUrl) {
      return {
        diagnostics:
          ` Latest GitHub Production deployment: ${deployment.sha || deployment.ref || 'unknown sha'} has no target URL.`,
        remediation: buildAliasRemediationHint(),
      };
    }

    const sha = deployment.sha || deployment.ref || 'unknown sha';
    const status = latestStatus?.state || 'unknown';

    return {
      diagnostics: ` Latest GitHub Production deployment target: ${targetUrl} (${sha}, status: ${status}).`,
      remediation: buildAliasRemediationHint({ targetUrl, sha, status }),
    };
  } catch (error) {
    return {
      diagnostics: ` Latest GitHub Production deployment lookup failed: ${error.message}.`,
      remediation: buildAliasRemediationHint(),
    };
  }
}

function buildAliasRemediationHint(latestDeployment = {}) {
  const target = latestDeployment.targetUrl || '<latest GitHub Production deployment target>';
  const targetStatus = latestDeployment.status ? `, target status: ${latestDeployment.status}` : '';
  const sha = latestDeployment.sha ? `, sha: ${latestDeployment.sha}` : '';

  return (
    ` Remediation: authenticate Vercel access for team/project ${vercelTeamSlug}/${vercelProjectSlug}` +
    `${sha}${targetStatus}; run \`npx vercel promote ${target} --scope ${vercelTeamSlug}\`; ` +
    `then run \`npx vercel cache purge --yes --scope ${vercelTeamSlug}\`; ` +
    'then rerun `npm run smoke:production` and a rendered Browser/Chrome freshness check.'
  );
}

function buildDeploymentProtectionHint({ statusCode, signature }) {
  const isProtectedStatus = statusCode === 401 || statusCode === 403;
  const hasProtectedSignature = protectedDeploymentSignatures.includes(signature);

  if (!isProtectedStatus && !hasProtectedSignature) {
    return '';
  }

  if (protectionBypassSecret) {
    return (
      ' This looks like Vercel Deployment or Preview Protection. The smoke sent ' +
      '`x-vercel-protection-bypass`, so confirm the bypass secret is current and enabled for this project.'
    );
  }

  return (
    ' This looks like Vercel Deployment or Preview Protection, not an application render failure. ' +
    'Set VERCEL_AUTOMATION_BYPASS_SECRET so this smoke sends `x-vercel-protection-bypass`, ' +
    'use `vercel curl`, or test an unprotected production URL before marking the release ready.'
  );
}

function buildDeploymentDiagnostics({ body, response }) {
  const diagnostics = [];
  const deploymentMarkers = [...new Set([...body.matchAll(/dpl_[A-Za-z0-9]+/g)].map((match) => match[0]))];
  const vercelRequestId = response.headers['x-vercel-id'];
  const cacheStatus = response.headers['x-vercel-cache'];

  if (deploymentMarkers.length > 0) {
    diagnostics.push(`deployment marker(s): ${deploymentMarkers.join(', ')}`);
  }

  if (vercelRequestId) {
    diagnostics.push(`x-vercel-id: ${vercelRequestId}`);
  }

  if (cacheStatus) {
    diagnostics.push(`x-vercel-cache: ${cacheStatus}`);
  }

  return diagnostics.length > 0 ? ` Observed Vercel diagnostics: ${diagnostics.join('; ')}.` : '';
}

function extractDocumentTitle(body) {
  return body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
}

function assertCleanProductionShell({ body, response, route, label, url, latestDeployment }) {
  const contentType = String(response.headers['content-type'] || '');
  const failureSignature = failureSignatures.find((signature) => body.includes(signature));
  const documentTitle = extractDocumentTitle(body);
  const deploymentDiagnostics = `${buildDeploymentDiagnostics({ body, response })}${latestDeployment.diagnostics}`;
  const remediation = latestDeployment.remediation;

  if (response.statusCode !== 200) {
    const hint = buildDeploymentProtectionHint({
      statusCode: response.statusCode,
      signature: failureSignature,
    });

    throw new Error(
      `${label} route ${route} returned HTTP ${response.statusCode} from ${url.toString()}.` +
        `${hint}${deploymentDiagnostics}${remediation}`
    );
  }

  if (!contentType.includes('text/html')) {
    throw new Error(
      `${label} route ${route} returned ${contentType || 'no content type'} instead of text/html.` +
        `${deploymentDiagnostics}${remediation}`
    );
  }

  if (failureSignature) {
    const hint = buildDeploymentProtectionHint({
      statusCode: response.statusCode,
      signature: failureSignature,
    });

    throw new Error(
      `${label} route ${route} returned a deployment failure signature: ${failureSignature}.` +
        `${hint}${deploymentDiagnostics}${remediation}`
    );
  }

  if (!documentTitle.includes('InterestShield') || !body.includes('/_next/static')) {
    throw new Error(
      `${label} route ${route} did not return the expected InterestShield Next shell. ` +
        `Observed title: ${documentTitle || 'none'}.` +
        `${deploymentDiagnostics}${remediation}`
    );
  }

  const missingCurrentShellSignature = currentShellSignatures.find((signature) => !body.includes(signature));

  if (missingCurrentShellSignature) {
    throw new Error(
      `${label} route ${route} did not expose the current InterestShield shell marker: ` +
        `${missingCurrentShellSignature}. Promote/deploy the current dashboard build, then rerun this smoke and a ` +
        'rendered Browser or Chrome check for `money-loop-artifact-rail`, `money-loop-payoff-orbit`, ' +
        `and the four dashboard vitals.${deploymentDiagnostics}${remediation}`
    );
  }

  if (route === '/') {
    const staleSignature = staleProductionSignatures.find((signature) => body.includes(signature));

    if (staleSignature) {
      throw new Error(
        `${label} route ${route} appears to be serving an older intro-gated InterestShield build: ` +
          `${staleSignature}. Promote/deploy the current dashboard build, then rerun this smoke and a ` +
          'rendered Browser or Chrome check for `money-loop-artifact-rail`, `money-loop-payoff-orbit`, ' +
          `and the four dashboard vitals.${deploymentDiagnostics}${remediation}`
      );
    }
  }
}

async function run() {
  console.log(`Production origin: ${origin}`);
  const latestDeployment = await fetchLatestGitHubProductionDeployment();

  for (const [route, label] of routes) {
    const url = new URL(route, `${origin}/`);
    const result = await requestUrl(url);
    assertCleanProductionShell({ ...result, route, label, latestDeployment });
    console.log(`PASS ${label} ${route}`);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
