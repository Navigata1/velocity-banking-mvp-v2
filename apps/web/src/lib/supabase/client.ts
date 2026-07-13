import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readPublicSupabaseConfig } from './config';

let client: SupabaseClient | null | undefined;

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = readPublicSupabaseConfig();
  if (!config) {
    client = null;
    return client;
  }
  client = createBrowserClient(config.url, config.publishableKey);
  return client;
}
