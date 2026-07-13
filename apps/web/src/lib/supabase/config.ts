export interface PublicSupabaseConfig {
  url: string;
  publishableKey: string;
}

export function readPublicSupabaseConfig(env: NodeJS.ProcessEnv = process.env): PublicSupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
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
