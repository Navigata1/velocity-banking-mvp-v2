import { Stack } from 'expo-router';
import { MobileAssumptionsProvider } from '@/components/mobile-assumptions-provider';
import { MobileAuthProvider } from '@/components/mobile-auth-provider';

export default function RootLayout() {
  return (
    <MobileAuthProvider>
      <MobileAssumptionsProvider>
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
      </MobileAssumptionsProvider>
    </MobileAuthProvider>
  );
}
