import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../dist-test/index.js';

const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '10000000-0000-4000-8000-000000000002';
const reportId = '20000000-0000-4000-8000-000000000001';
const token = 'a'.repeat(40);

class MemoryR2 {
  constructor() {
    this.objects = new Map();
  }
  async put(key, value, options) {
    this.objects.set(key, { options, value });
  }
  async get(key) {
    const entry = this.objects.get(key);
    if (!entry) return null;
    return {
      body: entry.value,
      writeHttpMetadata(headers) {
        headers.set('Content-Type', entry.options.httpMetadata.contentType);
      },
    };
  }
  async delete(key) {
    this.objects.delete(key);
  }
}

function env(reports = new MemoryR2()) {
  return {
    ALLOWED_ORIGIN: 'https://app.interestshield.test',
    REPORTS: reports,
    SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    SUPABASE_URL: 'https://interestshield.supabase.test',
  };
}

function request(path, init = {}) {
  return new Request(`https://reports.interestshield.test${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'https://app.interestshield.test',
      ...init.headers,
    },
  });
}

function reportBody(content = '<h1>Private report</h1>') {
  return JSON.stringify({
    content,
    engineVersion: 'financial-engine-2.0.0',
    format: 'html',
    generatedAt: '2026-07-13T03:50:00.000Z',
    reportId,
  });
}

function installSupabaseFetch({ ownerId = ownerA, metadataStatus = 201 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ init, url: String(url) });
    if (String(url).endsWith('/auth/v1/user')) return Response.json({ id: ownerId });
    if (String(url).includes('/rest/v1/export_records')) return new Response(null, { status: metadataStatus });
    throw new Error(`Unexpected fetch ${url}`);
  };
  return calls;
}

test('refuses placeholder configuration before accepting data', async () => {
  const response = await worker.fetch(request('/v1/reports', { method: 'POST' }), {
    ...env(),
    SUPABASE_URL: 'https://configure-before-deploy.supabase.co',
  });
  assert.equal(response.status, 503);
});

test('rejects an unapproved browser origin', async () => {
  const response = await worker.fetch(request('/v1/reports', {
    headers: { Origin: 'https://foreign.example' },
    method: 'POST',
  }), env());
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('stores a report under the verified owner and records metadata in Supabase', async () => {
  const reports = new MemoryR2();
  const calls = installSupabaseFetch();
  const body = reportBody();
  const response = await worker.fetch(request('/v1/reports', {
    body,
    headers: { 'Content-Length': String(Buffer.byteLength(body)), 'Content-Type': 'application/json' },
    method: 'POST',
  }), env(reports));

  assert.equal(response.status, 201);
  assert.ok(reports.objects.has(`${ownerA}/${reportId}.html`));
  assert.equal(calls.length, 2);
  const metadata = JSON.parse(calls[1].init.body);
  assert.equal(metadata.owner_id, ownerA);
  assert.equal(metadata.metadata_json.provider, 'cloudflare-r2');
  assert.equal(metadata.metadata_json.object_key, `${ownerA}/${reportId}.html`);
});

test('rolls back the R2 object when Supabase metadata cannot be recorded', async () => {
  const reports = new MemoryR2();
  installSupabaseFetch({ metadataStatus: 500 });
  const body = reportBody();
  const response = await worker.fetch(request('/v1/reports', {
    body,
    headers: { 'Content-Length': String(Buffer.byteLength(body)), 'Content-Type': 'application/json' },
    method: 'POST',
  }), env(reports));
  assert.equal(response.status, 502);
  assert.equal(reports.objects.size, 0);
});

test('rejects the actual streamed body when it exceeds the report limit', async () => {
  installSupabaseFetch();
  const body = reportBody('x'.repeat(512 * 1024));
  const response = await worker.fetch(request('/v1/reports', {
    body,
    headers: { 'Content-Length': '2', 'Content-Type': 'application/json' },
    method: 'POST',
  }), env());
  assert.equal(response.status, 413);
});

test('downloads only the verified owner object as a hardened attachment', async () => {
  const reports = new MemoryR2();
  reports.objects.set(`${ownerA}/${reportId}.html`, {
    options: { httpMetadata: { contentType: 'text/html; charset=utf-8' } },
    value: '<h1>Private report</h1>',
  });
  installSupabaseFetch();
  const response = await worker.fetch(request(`/v1/reports/${reportId}.html`), env(reports));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Disposition'), /^attachment;/);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(await response.text(), '<h1>Private report</h1>');

  installSupabaseFetch({ ownerId: ownerB });
  const foreignResponse = await worker.fetch(request(`/v1/reports/${reportId}.html`), env(reports));
  assert.equal(foreignResponse.status, 404);
});

test('deletes the owner object and its Supabase metadata record', async () => {
  const reports = new MemoryR2();
  reports.objects.set(`${ownerA}/${reportId}.html`, { options: {}, value: 'report' });
  const calls = installSupabaseFetch();
  const response = await worker.fetch(request(`/v1/reports/${reportId}.html`, { method: 'DELETE' }), env(reports));
  assert.equal(response.status, 204);
  assert.equal(reports.objects.size, 0);
  assert.equal(calls[1].init.method, 'DELETE');
  assert.match(calls[1].url, /metadata_json->>object_key=/);
});
