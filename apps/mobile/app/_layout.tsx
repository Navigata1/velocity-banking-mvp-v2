import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StatusBar, useWindowDimensions } from 'react-native';
import { MobileAssumptionsProvider } from '@/components/mobile-assumptions-provider';
import { MobileAuthProvider } from '@/components/mobile-auth-provider';

function MobileSystemBar() {
  const { height, width } = useWindowDimensions();

  useEffect(() => {
    const applySystemBar = () => {
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') StatusBar.setBackgroundColor('#0f172a', true);
    };
    applySystemBar();
    const frame = requestAnimationFrame(applySystemBar);
    return () => cancelAnimationFrame(frame);
  }, [height, width]);

  return <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={false} />;
}

export default function RootLayout() {
  return (
    <MobileAuthProvider>
      <MobileAssumptionsProvider>
        <MobileSystemBar />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0f172a' },
            headerTintColor: '#f8fafc',
            statusBarBackgroundColor: '#0f172a',
            statusBarStyle: 'light',
            statusBarTranslucent: false,
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
