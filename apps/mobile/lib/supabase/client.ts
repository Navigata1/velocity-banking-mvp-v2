import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { createMobileAuthStorage } from './auth-storage';
import { readPublicMobileSupabaseConfig } from './config';

let client: SupabaseClient | null | undefined;

export function createMobileSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = readPublicMobileSupabaseConfig();
  if (!config) {
    client = null;
    return client;
  }

  client = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
      lock: processLock,
      persistSession: true,
      storage: createMobileAuthStorage(),
    },
  });
  return client;
}
