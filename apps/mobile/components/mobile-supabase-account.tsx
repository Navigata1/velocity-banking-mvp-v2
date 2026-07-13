import type { MobileDashboardInput } from '@interestshield/financial-engine';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as Network from 'expo-network';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { createMobileSupabaseClient } from '@/lib/supabase/client';
import { syncMobileSnapshot } from '@/lib/supabase/snapshot-sync';

type WorkState = 'idle' | 'signing-in' | 'signing-out' | 'syncing';

async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable !== false;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'The account request could not be completed.';
}

const primaryButton = {
  alignItems: 'center' as const,
  backgroundColor: '#047857',
  borderColor: '#34d399',
  borderRadius: 12,
  borderWidth: 1,
  paddingHorizontal: 14,
  paddingVertical: 12,
};

export function MobileSupabaseAccount({ assumptions }: { assumptions: MobileDashboardInput }) {
  const client = useMemo(() => createMobileSupabaseClient(), []);
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [work, setWork] = useState<WorkState>('idle');

  useEffect(() => {
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const requestMagicLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!client) return;
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setStatus('Enter a valid email address.');
      return;
    }
    if (!await isOnline()) {
      setStatus('You are offline. Reconnect before requesting a sign-in link.');
      return;
    }
    setWork('signing-in');
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: { emailRedirectTo: Linking.createURL('/settings') },
    });
    setWork('idle');
    setStatus(error ? `Sign-in link failed: ${error.message}` : 'Check your email for the secure sign-in link.');
  };

  const syncSnapshot = async () => {
    if (!client) return;
    if (!await isOnline()) {
      setStatus('You are offline. Encrypted local data is unchanged; reconnect and try again.');
      return;
    }
    setWork('syncing');
    setStatus(null);
    try {
      await syncMobileSnapshot(client, { assumptions });
      setStatus('Encrypted local assumptions synced to your private snapshot.');
    } catch (error) {
      setStatus(`Sync failed: ${message(error)} Encrypted local data is unchanged.`);
    } finally {
      setWork('idle');
    }
  };

  const signOut = async () => {
    if (!client) return;
    setWork('signing-out');
    const { error } = await client.auth.signOut();
    setWork('idle');
    setStatus(error ? `Sign-out failed: ${error.message}` : 'Signed out. Encrypted local data remains on this device.');
  };

  if (!client) {
    return (
      <View testID="settings-supabase-account-unconfigured" style={{ backgroundColor: '#111827', borderColor: '#243244', borderRadius: 18, borderWidth: 1, gap: 8, padding: 16 }}>
        <Text selectable style={{ color: '#f8fafc', fontSize: 17, fontWeight: '800' }}>Private account sync is not configured</Text>
        <Text selectable style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 20 }}>
          This build stays local-only until a dedicated InterestShield Supabase URL and publishable key are configured.
        </Text>
      </View>
    );
  }

  return (
    <View testID="settings-supabase-account" style={{ backgroundColor: '#111827', borderColor: '#243244', borderRadius: 18, borderWidth: 1, gap: 12, padding: 16 }}>
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>Account and private sync</Text>
      {session ? (
        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800' }}>{session.user.email ?? 'Verified account'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Sync encrypted local assumptions" disabled={work !== 'idle'} onPress={syncSnapshot} style={({ pressed }) => [primaryButton, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}>
            <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>{work === 'syncing' ? 'Syncing...' : 'Sync local snapshot'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out of private account" disabled={work !== 'idle'} onPress={signOut} style={({ pressed }) => [{ alignItems: 'center', borderColor: '#475569', borderRadius: 12, borderWidth: 1, padding: 12 }, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}>
            <Text selectable style={{ color: '#cbd5e1', fontSize: 14, fontWeight: '800' }}>{work === 'signing-out' ? 'Signing out...' : 'Sign out'}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 20 }}>Sign in by email. Nothing leaves this device until you press sync.</Text>
          <TextInput
            accessibilityLabel="Private account email address"
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            style={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, borderWidth: 1, color: '#f8fafc', fontSize: 15, paddingHorizontal: 12, paddingVertical: 11 }}
            value={email}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Email secure sign-in link" disabled={work !== 'idle'} onPress={requestMagicLink} style={({ pressed }) => [primaryButton, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}>
            <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>{work === 'signing-in' ? 'Sending...' : 'Email sign-in link'}</Text>
          </Pressable>
        </View>
      )}
      {status ? <Text accessibilityLiveRegion="polite" selectable style={{ color: '#bbf7d0', fontSize: 13, lineHeight: 19 }}>{status}</Text> : null}
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>Educational tool. Not financial advice.</Text>
    </View>
  );
}
