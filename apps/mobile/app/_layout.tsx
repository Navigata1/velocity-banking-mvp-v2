import { Stack } from 'expo-router';

export default function RootLayout() {
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
