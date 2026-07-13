import type { SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

export function registerMobileAuthLifecycle(client: SupabaseClient): () => void {
  if (Platform.OS === 'web') return () => undefined;

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  });
  if (AppState.currentState === 'active') client.auth.startAutoRefresh();

  return () => {
    subscription.remove();
    client.auth.stopAutoRefresh();
  };
}
