const MAX_BODY_BYTES = 512 * 1024;
const REPORT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENGINE_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

interface AuthenticatedUser {
  id: string;
}

interface ReportPayload {
  content: string;
  engineVersion: string;
  format: 'html' | 'json';
  generatedAt: string;
  reportId: string;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function corsHeaders(env: Env, request: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  });
  if (request.headers.get('Origin') === env.ALLOWED_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN);
  }
  return headers;
}

function securityHeaders(headers: Headers): Headers {
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  return headers;
}

function jsonResponse(env: Env, request: Request, status: number, payload: Record<string, unknown>): Response {
  const headers = securityHeaders(corsHeaders(env, request));
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return Response.json(payload, { status, headers });
}

function assertConfigured(env: Env): void {
  if (
    env.SUPABASE_URL.includes('configure-before-deploy') ||
    env.SUPABASE_PUBLISHABLE_KEY === 'configure-before-deploy' ||
    !env.SUPABASE_URL.startsWith('https://')
  ) {
    throw new HttpError(503, 'Report service is not configured.');
  }
}

function assertOrigin(env: Env, request: Request): void {
  const origin = request.headers.get('Origin');
  if (origin && origin !== env.ALLOWED_ORIGIN) throw new HttpError(403, 'Origin is not allowed.');
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get('Authorization') ?? '';
  const match = /^Bearer ([A-Za-z0-9._~-]{20,8192})$/.exec(authorization);
  if (!match) throw new HttpError(401, 'A valid bearer token is required.');
  return match[1];
}

async function authenticate(env: Env, token: string): Promise<AuthenticatedUser> {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new HttpError(401, 'The account session is invalid or expired.');
  const user = await response.json<Partial<AuthenticatedUser>>();
  if (!user.id || !REPORT_ID_PATTERN.test(user.id)) throw new HttpError(401, 'Verified account identity is missing.');
  return { id: user.id };
}

async function parsePayload(request: Request): Promise<ReportPayload> {
  if (!request.body) throw new HttpError(400, 'Report request body is required.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'Report request must be no larger than 512 KiB.');
    }
    chunks.push(value);
  }
  if (totalBytes < 2) throw new HttpError(400, 'Report request body is required.');
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new HttpError(400, 'Report request is not valid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Report request is invalid.');
  const payload = value as Partial<ReportPayload>;
  if (!payload.reportId || !REPORT_ID_PATTERN.test(payload.reportId)) throw new HttpError(400, 'Report id must be a UUID.');
  if (payload.format !== 'html' && payload.format !== 'json') throw new HttpError(400, 'Report format is unsupported.');
  if (typeof payload.content !== 'string' || payload.content.length === 0) throw new HttpError(400, 'Report content is required.');
  if (new TextEncoder().encode(payload.content).byteLength > MAX_BODY_BYTES) throw new HttpError(413, 'Report content is too large.');
  if (!payload.engineVersion || !ENGINE_VERSION_PATTERN.test(payload.engineVersion)) throw new HttpError(400, 'Engine version is invalid.');
  const generatedAt = new Date(payload.generatedAt ?? '');
  if (!Number.isFinite(generatedAt.getTime())) throw new HttpError(400, 'Generated timestamp is invalid.');
  return { ...payload, generatedAt: generatedAt.toISOString() } as ReportPayload;
}

function objectKey(ownerId: string, reportId: string, format: ReportPayload['format']): string {
  return `${ownerId}/${reportId}.${format}`;
}

async function writeExportRecord(env: Env, token: string, ownerId: string, key: string, payload: ReportPayload, bytes: number): Promise<void> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/export_records`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      owner_id: ownerId,
      export_kind: 'report',
      metadata_json: {
        bytes,
        engine_version: payload.engineVersion,
        format: payload.format,
        generated_at: payload.generatedAt,
        object_key: key,
        provider: 'cloudflare-r2',
        report_id: payload.reportId,
      },
    }),
  });
  if (!response.ok) throw new HttpError(502, 'Report metadata could not be recorded.');
}

async function deleteExportRecord(env: Env, token: string, key: string): Promise<void> {
  const filter = encodeURIComponent(`eq.${key}`);
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/export_records?metadata_json->>object_key=${filter}`, {
    method: 'DELETE',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=minimal',
    },
  });
  if (!response.ok) throw new HttpError(502, 'Report metadata cleanup could not be recorded.');
}

async function createReport(env: Env, request: Request, ownerId: string, token: string): Promise<Response> {
  const payload = await parsePayload(request);
  const key = objectKey(ownerId, payload.reportId, payload.format);
  const bytes = new TextEncoder().encode(payload.content).byteLength;
  await env.REPORTS.put(key, payload.content, {
    customMetadata: {
      engineVersion: payload.engineVersion,
      generatedAt: payload.generatedAt,
      ownerId,
      reportId: payload.reportId,
    },
    httpMetadata: { contentType: payload.format === 'html' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8' },
  });
  try {
    await writeExportRecord(env, token, ownerId, key, payload, bytes);
  } catch (error) {
    await env.REPORTS.delete(key);
    throw error;
  }
  console.log(JSON.stringify({ event: 'report_created', ownerId, reportId: payload.reportId, bytes }));
  return jsonResponse(env, request, 201, { reportId: payload.reportId, format: payload.format, bytes });
}

async function getReport(env: Env, request: Request, ownerId: string, reportId: string, format: ReportPayload['format']): Promise<Response> {
  const object = await env.REPORTS.get(objectKey(ownerId, reportId, format));
  if (!object) throw new HttpError(404, 'Report was not found.');
  const headers = securityHeaders(corsHeaders(env, request));
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="interestshield-${reportId}.${format}"`);
  return new Response(object.body, { headers });
}

async function deleteReport(env: Env, request: Request, ownerId: string, token: string, reportId: string, format: ReportPayload['format']): Promise<Response> {
  const key = objectKey(ownerId, reportId, format);
  await env.REPORTS.delete(key);
  await deleteExportRecord(env, token, key);
  console.log(JSON.stringify({ event: 'report_deleted', ownerId, reportId }));
  return new Response(null, { status: 204, headers: securityHeaders(corsHeaders(env, request)) });
}

function route(url: URL): { reportId: string; format: ReportPayload['format'] } | null {
  const match = /^\/v1\/reports\/([0-9a-f-]{36})\.(html|json)$/i.exec(url.pathname);
  if (!match || !REPORT_ID_PATTERN.test(match[1])) return null;
  return { reportId: match[1], format: match[2].toLowerCase() as ReportPayload['format'] };
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      assertConfigured(env);
      assertOrigin(env, request);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env, request) });
      const token = bearerToken(request);
      const user = await authenticate(env, token);
      const url = new URL(request.url);
      if (request.method === 'POST' && url.pathname === '/v1/reports') return await createReport(env, request, user.id, token);
      const reportRoute = route(url);
      if (reportRoute && request.method === 'GET') return await getReport(env, request, user.id, reportRoute.reportId, reportRoute.format);
      if (reportRoute && request.method === 'DELETE') return await deleteReport(env, request, user.id, token, reportRoute.reportId, reportRoute.format);
      throw new HttpError(404, 'Route was not found.');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'Report service failed.';
      console.error(JSON.stringify({ event: 'report_request_failed', status, path: new URL(request.url).pathname }));
      return jsonResponse(env, request, status, { error: message });
    }
  },
} satisfies ExportedHandler<Env>;
