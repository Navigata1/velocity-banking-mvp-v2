import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

function authParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  for (const [key, value] of new URLSearchParams(fragment)) params.set(key, value);
  return params;
}

function callbackIdentity(url: string): string {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  return `${parsed.protocol}//${parsed.host}${pathname}`;
}

export type MobileAuthCallbackResult = 'exchanged' | 'duplicate' | 'ignored';

export async function handleMobileAuthUrl(
  client: SupabaseClient,
  url: string,
  expectedCallbackUrl: string,
  consumedCodes: Set<string> = new Set()
): Promise<MobileAuthCallbackResult> {
  const params = authParams(url);
  const hasAuthResponse = params.has('code') || params.has('error_description') ||
    params.has('access_token') || params.has('refresh_token');
  if (!hasAuthResponse) return 'ignored';
  if (callbackIdentity(url) !== callbackIdentity(expectedCallbackUrl)) {
    throw new Error('Mobile auth callback was rejected because its route did not match the requested sign-in flow.');
  }

  const errorDescription = params.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  if (params.has('access_token') || params.has('refresh_token')) {
    throw new Error('Mobile auth rejected a token fragment because this client requires the PKCE code flow.');
  }

  const code = params.get('code');
  if (code) {
    if (consumedCodes.has(code)) return 'duplicate';
    consumedCodes.add(code);
    try {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return 'exchanged';
    } catch (error) {
      consumedCodes.delete(code);
      throw error;
    }
  }
  return 'ignored';
}

export function registerMobileAuthDeepLinks(
  client: SupabaseClient,
  expectedCallbackUrl: string = Linking.createURL('/settings'),
  onError: (error: Error) => void = () => undefined
): () => void {
  let active = true;
  const consumedCodes = new Set<string>();
  const applyUrl = (url: string | null) => {
    if (!active || !url) return;
    handleMobileAuthUrl(client, url, expectedCallbackUrl, consumedCodes).catch((error: unknown) => {
      if (active) onError(error instanceof Error ? error : new Error('Mobile auth callback failed.'));
    });
  };
  Linking.getInitialURL().then(applyUrl).catch((error: unknown) => {
    if (active) onError(error instanceof Error ? error : new Error('Initial auth callback could not be read.'));
  });
  const subscription = Linking.addEventListener('url', ({ url }) => applyUrl(url));
  return () => {
    active = false;
    subscription.remove();
  };
}
