import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { registerMobileAuthLifecycle } from '@/lib/supabase/auth-lifecycle';
import { createMobileSupabaseClient } from '@/lib/supabase/client';

export default function RootLayout() {
  useEffect(() => {
    const client = createMobileSupabaseClient();
    return client ? registerMobileAuthLifecycle(client) : undefined;
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'InterestShield' }} />
      <Stack.Screen name="simulator" options={{ title: 'Simulator' }} />
      <Stack.Screen name="cockpit" options={{ title: 'Cockpit' }} />
      <Stack.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      <Stack.Screen name="learn" options={{ title: 'Learn' }} />
      <Stack.Screen name="vault" options={{ title: 'Vault' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
