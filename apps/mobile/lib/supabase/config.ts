export interface PublicMobileSupabaseConfig {
  url: string;
  publishableKey: string;
}

export interface PublicMobileSupabaseEnv {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

export function readPublicMobileSupabaseConfig(
  env: PublicMobileSupabaseEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
): PublicMobileSupabaseConfig | null {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const isLocal = parsedUrl.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsedUrl.hostname);
  if (parsedUrl.protocol !== 'https:' && !isLocal) return null;
  return { url: parsedUrl.toString().replace(/\/$/, ''), publishableKey };
}
