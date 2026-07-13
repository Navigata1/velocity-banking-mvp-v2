import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

function authParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  for (const [key, value] of new URLSearchParams(fragment)) params.set(key, value);
  return params;
}

export async function handleMobileAuthUrl(client: SupabaseClient, url: string): Promise<void> {
  const params = authParams(url);
  const errorDescription = params.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = params.get('code');
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return;
  const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
}

export function registerMobileAuthDeepLinks(client: SupabaseClient): () => void {
  let active = true;
  const applyUrl = (url: string | null) => {
    if (!active || !url) return;
    handleMobileAuthUrl(client, url).catch(() => undefined);
  };
  Linking.getInitialURL().then(applyUrl);
  const subscription = Linking.addEventListener('url', ({ url }) => applyUrl(url));
  return () => {
    active = false;
    subscription.remove();
  };
}
