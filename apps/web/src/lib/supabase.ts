'use client';

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: SupabaseUser;
}

export interface SupabaseProfile {
  id: string;
  user_id: string;
  name: string | null;
  currency: string;
}

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
}

export const supabaseConfig: SupabaseClientConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

function withAuthHeaders(accessToken?: string): HeadersInit {
  return {
    apikey: supabaseConfig.anonKey,
    Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${supabaseConfig.anonKey}`,
    'Content-Type': 'application/json',
  };
}

async function supabaseFetch<T>(
  path: string,
  init: RequestInit,
  accessToken?: string,
): Promise<{ data: T | null; error: string | null }> {
  if (!hasSupabaseConfig()) {
    return { data: null, error: 'Missing Supabase environment configuration.' };
  }

  try {
    const response = await fetch(`${supabaseConfig.url}${path}`, {
      ...init,
      headers: {
        ...withAuthHeaders(accessToken),
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const fallback = `${response.status} ${response.statusText}`;
      const message = await response.text();
      return { data: null, error: message || fallback };
    }

    if (response.status === 204) {
      return { data: null, error: null };
    }

    const json = (await response.json()) as T;
    return { data: json, error: null };
  } catch (error: unknown) {
    return { data: null, error: error instanceof Error ? error.message : 'Supabase request failed.' };
  }
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  return supabaseFetch<{ session: SupabaseSession | null; user: SupabaseUser | null; error?: { message?: string } }>(
    '/auth/v1/signup',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: name ? { name } : undefined,
      }),
    },
  );
}

export async function signInWithEmail(email: string, password: string) {
  return supabaseFetch<SupabaseSession & { error?: { message?: string } }>(
    '/auth/v1/token?grant_type=password',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );
}

export async function signOutSession(accessToken: string) {
  return supabaseFetch<null>('/auth/v1/logout', { method: 'POST' }, accessToken);
}

export async function fetchUser(accessToken: string) {
  return supabaseFetch<SupabaseUser>('/auth/v1/user', { method: 'GET' }, accessToken);
}

export function getGoogleOAuthUrl(redirectTo: string): string | null {
  if (!hasSupabaseConfig()) return null;
  const params = new URLSearchParams({ provider: 'google', redirect_to: redirectTo });
  return `${supabaseConfig.url}/auth/v1/authorize?${params.toString()}`;
}

export async function getProfileByUserId(userId: string, accessToken: string) {
  return supabaseFetch<SupabaseProfile[]>(
    `/rest/v1/profiles?select=*&user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'GET' },
    accessToken,
  );
}

export async function createProfile(userId: string, accessToken: string, name?: string) {
  return supabaseFetch<SupabaseProfile[]>(
    '/rest/v1/profiles',
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{ user_id: userId, name: name ?? null }]),
    },
    accessToken,
  );
}

export async function upsertJsonState(
  table: 'portfolio_state' | 'preferences_state',
  profileId: string,
  dataJson: Record<string, unknown>,
  accessToken: string,
) {
  return supabaseFetch<unknown[]>(
    `/rest/v1/${table}`,
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{ profile_id: profileId, data_json: dataJson, updated_at: new Date().toISOString() }]),
    },
    accessToken,
  );
}

export async function getJsonState<T>(
  table: 'portfolio_state' | 'preferences_state',
  profileId: string,
  accessToken: string,
) {
  return supabaseFetch<Array<{ data_json: T }>>(
    `/rest/v1/${table}?select=data_json&profile_id=eq.${encodeURIComponent(profileId)}&limit=1`,
    { method: 'GET' },
    accessToken,
  );
}

export async function logGamificationEvent(
  profileId: string,
  eventType: string,
  eventData: Record<string, unknown>,
  accessToken: string,
) {
  return supabaseFetch<unknown[]>(
    '/rest/v1/gamification_events',
    {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          profile_id: profileId,
          event_type: eventType,
          event_data: eventData,
        },
      ]),
    },
    accessToken,
  );
}

