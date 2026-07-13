import { createBrowserClient } from '@supabase/ssr';
import { readPublicSupabaseConfig } from './config';

export function createSupabaseBrowserClient() {
  const config = readPublicSupabaseConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.publishableKey);
}
