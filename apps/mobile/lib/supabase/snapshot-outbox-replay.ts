import type { SupabaseClient } from '@supabase/supabase-js';
import * as Network from 'expo-network';
import { AppState } from 'react-native';
import {
  mobileSnapshotOutbox,
  type MobileSnapshotOutbox,
  type MobileSnapshotOutboxFlushResult,
} from './snapshot-outbox';

interface RemovableSubscription {
  remove(): void;
}

interface AppStatePort {
  addEventListener(event: 'change', listener: (state: string) => void): RemovableSubscription;
}

interface NetworkState {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}

interface NetworkPort {
  addNetworkStateListener(listener: (state: NetworkState) => void): RemovableSubscription;
  getNetworkStateAsync(): Promise<NetworkState>;
}

interface MobileSnapshotReplayOptions {
  appState?: AppStatePort;
  network?: NetworkPort;
  onError?: (error: Error) => void;
  onSuccess?: (result: MobileSnapshotOutboxFlushResult) => void;
  outbox?: MobileSnapshotOutbox;
}

function isOnline(state: NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return new Error(error.message);
  }
  return new Error('Queued snapshot replay failed.');
}

export function registerMobileSnapshotOutboxReplay(
  client: SupabaseClient,
  ownerId: string,
  options: MobileSnapshotReplayOptions = {}
): () => void {
  const appState = options.appState ?? AppState;
  const network = options.network ?? Network;
  const outbox = options.outbox ?? mobileSnapshotOutbox;
  let active = true;

  const replay = async (knownState?: NetworkState) => {
    try {
      const state = knownState ?? await network.getNetworkStateAsync();
      if (!active || !isOnline(state)) return;
      const result = await outbox.flush(client, ownerId);
      if (active && result.sent > 0) options.onSuccess?.(result);
    } catch (error) {
      if (active) options.onError?.(asError(error));
    }
  };

  void replay();
  const networkSubscription = network.addNetworkStateListener((state) => {
    if (isOnline(state)) void replay(state);
  });
  const appStateSubscription = appState.addEventListener('change', (state) => {
    if (state === 'active') void replay();
  });

  return () => {
    active = false;
    networkSubscription.remove();
    appStateSubscription.remove();
  };
}
