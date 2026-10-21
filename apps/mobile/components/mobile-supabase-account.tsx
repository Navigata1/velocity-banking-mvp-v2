import type { MobileDashboardInput } from '@interestshield/financial-engine';
import type { PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import * as Linking from 'expo-linking';
import * as Network from 'expo-network';
import { useEffect, useLayoutEffect, useRef, useState, type ElementRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, Text, TextInput, View } from 'react-native';
import { useMobileAuth } from '@/components/mobile-auth-provider';
import { useMobilePortfolio } from '@/components/mobile-portfolio-provider';
import { useAccessibilityAnnouncement } from '@/hooks/use-accessibility-announcement';
import { formatRecoveryAPR, recoveryChoiceAccessibilityLabel } from '@/lib/accessibility-labels';
import { formatFinancialInput } from '@interestshield/financial-engine/input-draft';
import type { MobileAssumptionStorageBackend } from '@/lib/mobile-assumption-storage';
import type { MobileSnapshotOwnerLock } from '@/lib/supabase/auth-storage';
import { mobileSnapshotOutbox } from '@/lib/supabase/snapshot-outbox';
import {
  applyMobileSnapshotRecovery,
  loadMobileSnapshotRecoveryOptions,
  MobileSnapshotRecoveryPendingError,
  serializeMobileRecoveryAssumptions,
  serializeMobileRecoveryPortfolio,
  type MobileSnapshotRecoveryOptions,
  type MobileSnapshotRecoverySource,
} from '@/lib/supabase/snapshot-recovery';

type WorkState = 'adopting' | 'idle' | 'loading-recovery' | 'restoring' | 'resuming' | 'signing-in' | 'signing-out' | 'syncing';

async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
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
  minHeight: 48,
  paddingHorizontal: 14,
  paddingVertical: 12,
};

function RecoveryAssumptionSummary({ input }: { input: MobileDashboardInput | null }) {
  if (!input) return <Text style={{ color: '#94a3b8', fontSize: 12 }}>No scenario in this source. Keep the destination scenario.</Text>;
  return (
    <View style={{ gap: 2 }}>
      <Text selectable style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18 }}>
        Income ${input.monthlyIncome.toLocaleString()} | Expenses ${input.monthlyExpenses.toLocaleString()} | Chunk ${input.chunkAmount.toLocaleString()}
      </Text>
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>
        {input.activeDebtName} ${input.activeDebt.balance.toLocaleString()} at {formatRecoveryAPR(input.activeDebt.apr)}% | Payment ${input.activeDebt.monthlyPayment.toLocaleString()} | Term {input.activeDebt.termMonths ?? 'not set'} months
      </Text>
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>
        LOC ${input.loc.balance.toLocaleString()} of ${input.loc.limit.toLocaleString()} at {formatRecoveryAPR(input.loc.apr)}%
      </Text>
    </View>
  );
}

function RecoveryPortfolioSummary({ book }: { book: PortfolioBook | null }) {
  const style = { color: '#94a3b8', fontSize: 12, lineHeight: 18 };
  const money = (value: number) => `$${formatFinancialInput(value, 'money')}`;
  if (!book) return <Text style={style}>No Portfolio in this source. Keep the destination Portfolio.</Text>;
  return <View style={{ gap: 6, minWidth: 0 }}>
    <Text selectable style={style}>Portfolio: {book.debts.length} simulated debts. Income {money(book.monthlyIncome)}, expenses {money(book.monthlyExpenses)}, extra cap {money(book.extraMonthlyPayment)}.</Text>
    <Text selectable style={style}>LOC {money(book.loc.balance)} of {money(book.loc.limit)} at {formatRecoveryAPR(book.loc.apr, 'decimal')}%. Chunk {money(book.chunkAmount)}. {book.strategy}/{book.focusMode}, primary share {formatFinancialInput(book.splitRatioPrimary, 'percent')}%.</Text>
    {book.debts.map((debt, index) => <View key={debt.id} style={{ gap: 2, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#334155' }}>
      <Text selectable style={style}>Debt {index + 1}: {debt.name}. Balance {money(debt.balance)} at {formatRecoveryAPR(debt.apr, 'decimal')}%.</Text>
      <Text selectable style={style}>{debt.category}/{debt.kind}; pay from {debt.paymentSource}. Minimum {debt.minPaymentRule.type === 'fixed'
        ? money(debt.minPaymentRule.amount) : `${formatFinancialInput(debt.minPaymentRule.percent, 'percent')}%, floor ${money(debt.minPaymentRule.floor)}`}.</Text>
      {debt.promo ? <Text selectable style={style}>Promo {formatRecoveryAPR(debt.promo.introApr, 'decimal')}% for {debt.promo.monthsRemaining} months, then {formatRecoveryAPR(debt.promo.postIntroApr, 'decimal')}%.</Text> : null}
      {debt.termMonths !== undefined ? <Text selectable style={style}>Recorded term {debt.termMonths} months, reference only.</Text> : null}
      {debt.notes ? <Text selectable style={style}>{debt.notes}</Text> : null}
    </View>)}
  </View>;
}

export function MobileSupabaseAccount({
  assumptions,
  assumptionsReady,
  onReplaceAssumptions,
}: {
  assumptions: MobileDashboardInput;
  assumptionsReady: boolean;
  onReplaceAssumptions: (
    input: MobileDashboardInput,
    ownerLock?: MobileSnapshotOwnerLock,
    expectedRevision?: number
  ) => Promise<MobileAssumptionStorageBackend>;
}) {
  const { authError, authReady, client, consumeSyncNotice, session, syncNotice, retryPendingRecovery, runRecovery } = useMobileAuth();
  const portfolio = useMobilePortfolio();
  const reviewedDestination = useRef<{ ownerId: string; assumptions: string; portfolio: string } | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [work, setWork] = useState<WorkState>('idle');
  const [recoveryOptions, setRecoveryOptions] = useState<MobileSnapshotRecoveryOptions | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [pendingRecovery, setPendingRecovery] = useState<MobileSnapshotRecoverySource | null>(null);
  const [hasStagedRecovery, setHasStagedRecovery] = useState(false);
  const [recoveryStateOwnerId, setRecoveryStateOwnerId] = useState<string | null>(null);
  const recoveryConfirmationRef = useRef<ElementRef<typeof Text>>(null);
  const currentOwnerId = session?.user.id ?? null;
  const statusOwnerId = useRef<string | null>(currentOwnerId);
  const renderOwnerId = useRef<string | null>(currentOwnerId);
  renderOwnerId.current = currentOwnerId;
  const recoveryRequestVersion = useRef(0);
  const currentDestination = useRef<{ ownerId: string | null; assumptions: MobileDashboardInput;
    assumptionsReady: boolean; book: PortfolioBook | null; bookReady: boolean; bookStatus: string } | null>(null);
  useLayoutEffect(() => {
    currentDestination.current = { ownerId: currentOwnerId, assumptions, assumptionsReady,
      book: portfolio.book, bookReady: portfolio.isHydrated, bookStatus: portfolio.status };
  });
  useLayoutEffect(() => () => { currentDestination.current = null; }, []);
  const beginReview = (source: MobileSnapshotRecoverySource) => {
    if (!currentOwnerId || !assumptionsReady || !portfolio.isHydrated || !['saved','empty'].includes(portfolio.status)) return;
    reviewedDestination.current = { ownerId: currentOwnerId, assumptions: serializeMobileRecoveryAssumptions(assumptions),
      portfolio: serializeMobileRecoveryPortfolio(portfolio.book) };
    setPendingRecovery(JSON.parse(JSON.stringify(source)) as MobileSnapshotRecoverySource);
  };

  useEffect(() => {
    if (authError) setStatus(`Account setup stopped: ${authError}`);
  }, [authError]);

  useEffect(() => {
    if (statusOwnerId.current === currentOwnerId) return;
    recoveryRequestVersion.current += 1;
    statusOwnerId.current = currentOwnerId;
    setWork('idle');
    setStatus(null);
    setRecoveryOptions(null);
    setSelectedSnapshotId(null);
    setPendingRecovery(null);
    setHasStagedRecovery(false);
    reviewedDestination.current = null;
    setRecoveryStateOwnerId(null);
  }, [currentOwnerId]);

  useEffect(() => {
    if (!currentOwnerId) return;
    let active = true;
    mobileSnapshotOutbox.readRecovery(currentOwnerId)
      .then((pending) => {
        if (!active || statusOwnerId.current !== currentOwnerId || !pending) return;
        setRecoveryStateOwnerId(currentOwnerId);
        setHasStagedRecovery(true);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [currentOwnerId]);

  useEffect(() => {
    if (!syncNotice || syncNotice.ownerId !== currentOwnerId) return;
    setStatus(syncNotice.message);
    consumeSyncNotice(syncNotice.id);
  }, [consumeSyncNotice, currentOwnerId, syncNotice]);

  const requestMagicLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!client) return;
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setStatus('Enter a valid email address.');
      return;
    }
    setWork('signing-in');
    try {
      if (!await isOnline()) {
        setStatus('You are offline. Reconnect before requesting a sign-in link.');
        return;
      }
      const { error } = await client.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: Linking.createURL('/settings') },
      });
      setStatus(error ? `Sign-in link failed: ${error.message}` : 'Check your email for the secure sign-in link.');
    } catch (error) {
      setStatus(`Sign-in link failed: ${message(error)}`);
    } finally {
      setWork('idle');
    }
  };

  const syncSnapshot = async () => {
    const expectedOwnerId = session?.user.id;
    if (!client || !expectedOwnerId) return;
    if (!assumptionsReady || !portfolio.isHydrated || !['empty','saved'].includes(portfolio.status)) {
      setStatus('Wait for the scenario and Portfolio to finish saving before account sync.');
      return;
    }
    setWork('syncing');
    setStatus(null);
    let queued = false;
    try {
      await mobileSnapshotOutbox.enqueue({
        assumptions,
        portfolio: portfolio.book,
        expectedOwnerId,
      });
      queued = true;
      if (!await isOnline()) {
        setStatus('Saved on this device. Your snapshot will sync when you reconnect.');
        return;
      }
      const result = await mobileSnapshotOutbox.flush(client, expectedOwnerId);
      setStatus(
        result.sent > 1
          ? `${result.sent} queued snapshots synced to your private account.`
          : 'Assumptions synced to your private, owner-protected snapshot.'
      );
    } catch (error) {
      setStatus(
        queued
          ? `Saved on this device; account sync will retry automatically. ${message(error)}`
          : `Could not queue account sync: ${message(error)} Local assumptions are unchanged.`
      );
    } finally {
      setWork('idle');
    }
  };

  const signOut = async () => {
    if (!client) return;
    setWork('signing-out');
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      setStatus(error ? `Sign-out failed: ${error.message}` : 'Signed out. This account\'s local data remains isolated on this device.');
    } catch (error) {
      setStatus(`Sign-out failed: ${message(error)}`);
    } finally {
      setWork('idle');
    }
  };

  const reviewRecoveryOptions = async () => {
    const expectedOwnerId = session?.user.id;
    if (!client || !expectedOwnerId) return;
    const requestVersion = ++recoveryRequestVersion.current;
    const isCurrentRequest = () => renderOwnerId.current === expectedOwnerId
      && recoveryRequestVersion.current === requestVersion;
    setRecoveryStateOwnerId(expectedOwnerId);
    setWork('loading-recovery');
    setStatus(null);
    setSelectedSnapshotId(null);
    setPendingRecovery(null);
    try {
      const stagedRecovery = await mobileSnapshotOutbox.readRecovery(expectedOwnerId);
      if (!isCurrentRequest()) return;
      if (stagedRecovery) {
        setHasStagedRecovery(true);
        setStatus('A confirmed recovery is pending. Resume it before reviewing another option.');
        return;
      }
      if (!await isOnline()) {
        if (isCurrentRequest()) {
          setStatus('Reconnect to review account snapshots. Guest assumptions remain unchanged.');
        }
        return;
      }
      const options = await loadMobileSnapshotRecoveryOptions(client, expectedOwnerId);
      if (!isCurrentRequest()) return;
      setRecoveryOptions(options);
      setStatus(
        options.snapshots.length === 0
          ? 'No valid private snapshots are available for this account.'
          : 'Choose one snapshot to review. Nothing has been restored.'
      );
    } catch (error) {
      if (!isCurrentRequest()) return;
      setRecoveryOptions(null);
      setStatus(`Recovery review failed: ${message(error)}`);
    } finally {
      if (isCurrentRequest()) setWork('idle');
    }
  };

  const confirmRecovery = async () => {
    const expectedOwnerId = session?.user.id;
    if (!client || !expectedOwnerId || !pendingRecovery) return;
    const source = pendingRecovery;
    const reviewed = reviewedDestination.current;
    if (!reviewed || reviewed.ownerId !== expectedOwnerId) { setStatus('Recovery review expired. Review again.'); return; }
    const destinationMatches = () => {
      const current = currentDestination.current;
      return current?.ownerId === expectedOwnerId && current.assumptionsReady && current.bookReady
        && ['saved','empty'].includes(current.bookStatus)
        && serializeMobileRecoveryAssumptions(current.assumptions) === reviewed.assumptions
        && serializeMobileRecoveryPortfolio(current.book) === reviewed.portfolio;
    };
    if (!destinationMatches()) { setStatus('Local inputs changed or are still saving. Review recovery again.'); return; }
    const requestVersion = ++recoveryRequestVersion.current;
    const isCurrentRequest = () => renderOwnerId.current === expectedOwnerId
      && recoveryRequestVersion.current === requestVersion;
    setWork(source.kind === 'guest' ? 'adopting' : 'restoring');
    setStatus(null);
    let replacedLocally = false;
    try {
      if (!await isOnline()) {
        if (isCurrentRequest()) {
          setStatus('Reconnect before confirming recovery so the selected revision can be verified again.');
        }
        return;
      }
      if (!isCurrentRequest()) return;
      if (!destinationMatches()) { setStatus('Local inputs changed while checking the connection. Review recovery again.'); return; }
      const confirmation = source.kind === 'remote'
        ? { clientRevision: source.snapshot.clientRevision, snapshotId: source.snapshot.snapshotId }
        : {
          kind: source.kind,
          ownerId: expectedOwnerId,
          reviewedAssumptions: serializeMobileRecoveryAssumptions(source.assumptions),
          reviewedPortfolio: serializeMobileRecoveryPortfolio(source.portfolio ?? null),
        };
      const result = await runRecovery(expectedOwnerId, () => applyMobileSnapshotRecovery(client, {
        confirmation,
        expectedOwnerId,
        reviewedLocalAssumptions: reviewed.assumptions,
        reviewedLocalPortfolio: reviewed.portfolio,
        source,
      }, {
        outbox: mobileSnapshotOutbox,
        replaceAssumptions: async (nextInput, ownerLock, expectedRevision) => {
          const backend = await onReplaceAssumptions(nextInput, ownerLock, expectedRevision);
          replacedLocally = true;
          return backend;
        },
        replacePortfolio: portfolio.replace,
      }));
      if (!isCurrentRequest()) return;
      setRecoveryOptions(null);
      setSelectedSnapshotId(null);
      setPendingRecovery(null);
      setHasStagedRecovery(false);
      const actionLabel = source.kind === 'guest'
        ? 'Guest assumptions adopted'
        : source.kind === 'device'
          ? 'This device kept as the account version'
          : 'Snapshot restored';
      setStatus(
        result.synced
          ? `${actionLabel} and synced. ${result.discarded} queued local change${result.discarded === 1 ? '' : 's'} replaced by your confirmation.`
          : `${actionLabel} locally. Account sync remains queued.`
      );
    } catch (error) {
      if (!isCurrentRequest()) return;
      if (error instanceof MobileSnapshotRecoveryPendingError) {
        setHasStagedRecovery(true);
        setPendingRecovery(null);
        setStatus(`Recovery is durably pending. Resume it below; it cannot be cancelled after confirmation. ${message(error)}`);
      } else {
        setStatus(
          replacedLocally
            ? `Recovery was saved locally, but account sync is queued. ${message(error)}`
            : `Recovery was not applied: ${message(error)}`
        );
      }
    } finally {
      if (isCurrentRequest()) setWork('idle');
    }
  };

  const resumeStagedRecovery = async () => {
    const expectedOwnerId = session?.user.id;
    if (!client || !expectedOwnerId) return;
    const requestVersion = ++recoveryRequestVersion.current;
    const isCurrentRequest = () => renderOwnerId.current === expectedOwnerId
      && recoveryRequestVersion.current === requestVersion;
    setWork('resuming');
    setStatus(null);
    try {
      const resumed = await retryPendingRecovery();
      if (!isCurrentRequest()) return;
      setHasStagedRecovery(false);
      if (!resumed) {
        setStatus('No pending recovery remains for this account.');
        return;
      }
      if (!await isOnline()) {
        if (isCurrentRequest()) setStatus('Recovery completed locally. Account sync remains queued until reconnect.');
        return;
      }
      const result = await mobileSnapshotOutbox.flush(client, expectedOwnerId);
      if (isCurrentRequest()) {
        setStatus(result.remaining === 0 ? 'Pending recovery completed and synced.' : 'Recovery completed locally. Account sync remains queued.');
      }
    } catch (error) {
      if (isCurrentRequest()) {
        setHasStagedRecovery(true);
        setStatus(`Recovery is still pending safely. ${message(error)}`);
      }
    } finally {
      if (isCurrentRequest()) setWork('idle');
    }
  };

  const recoveryStateIsCurrent = recoveryStateOwnerId === currentOwnerId;
  const currentRecoveryOptions = recoveryStateIsCurrent ? recoveryOptions : null;
  const currentPendingRecovery = recoveryStateIsCurrent ? pendingRecovery : null;
  const currentHasStagedRecovery = recoveryStateIsCurrent && hasStagedRecovery;
  const currentStatus = statusOwnerId.current === currentOwnerId ? status : null;
  useAccessibilityAnnouncement(currentStatus);
  useEffect(() => {
    if (!currentPendingRecovery) return;
    const frame = requestAnimationFrame(() => {
      const node = findNodeHandle(recoveryConfirmationRef.current);
      if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => cancelAnimationFrame(frame);
  }, [currentPendingRecovery]);
  const selectedSnapshot = currentRecoveryOptions?.snapshots.find(
    (snapshot) => snapshot.snapshotId === selectedSnapshotId
  ) ?? null;

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
          {!authReady ? <View style={{ gap: 8 }}>
            <Text style={{ color: '#fbbf24', fontSize: 13, lineHeight: 19 }}>Recovery must finish before editing or automatic sync can resume.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry pending account recovery" disabled={work !== 'idle'}
              onPress={resumeStagedRecovery} style={primaryButton}>
              <Text style={{ color: '#ecfdf5', fontSize: 14 }}>Retry pending recovery</Text>
            </Pressable>
          </View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Sync local assumptions" disabled={!assumptionsReady || work !== 'idle'} onPress={syncSnapshot} style={({ pressed }) => [primaryButton, { opacity: pressed || !assumptionsReady || work !== 'idle' ? 0.65 : 1 }]}>
            <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>{work === 'syncing' ? 'Syncing...' : assumptionsReady ? 'Sync local snapshot' : 'Loading saved assumptions...'}</Text>
          </Pressable>
          <View testID="settings-snapshot-recovery" style={{ borderTopColor: '#334155', borderTopWidth: 1, gap: 10, paddingTop: 12 }}>
            <Text selectable style={{ color: '#f8fafc', fontSize: 15, fontWeight: '800' }}>Restore or adopt assumptions</Text>
            <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 19 }}>
              Review a private snapshot, copy guest assumptions, or keep this device as the account version. No option is selected automatically.
            </Text>
            {currentHasStagedRecovery ? (
              <View style={{ backgroundColor: '#0f172a', borderLeftColor: '#fbbf24', borderLeftWidth: 3, gap: 8, padding: 11 }}>
                <Text selectable style={{ color: '#f8fafc', fontSize: 14, fontWeight: '800' }}>Confirmed recovery pending</Text>
                <Text selectable style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18 }}>
                  Resume the durable recovery before reviewing another option. It cannot be cancelled after confirmation.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Resume pending assumption recovery"
                  disabled={work !== 'idle'}
                  onPress={resumeStagedRecovery}
                  style={({ pressed }) => [primaryButton, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}
                >
                  <Text selectable style={{ color: '#ecfdf5', fontSize: 13, fontWeight: '900' }}>
                    {work === 'resuming' ? 'Resuming...' : 'Resume pending recovery'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review snapshot recovery options"
              disabled={!assumptionsReady || currentHasStagedRecovery || work !== 'idle'}
              onPress={reviewRecoveryOptions}
              style={({ pressed }) => [{ alignItems: 'center', borderColor: '#475569', borderRadius: 12, borderWidth: 1, minHeight: 48, padding: 12 }, { opacity: pressed || !assumptionsReady || currentHasStagedRecovery || work !== 'idle' ? 0.65 : 1 }]}
            >
              <Text selectable style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '800' }}>
                {work === 'loading-recovery' ? 'Loading recovery options...' : 'Review recovery options'}
              </Text>
            </Pressable>
            {currentRecoveryOptions ? (
              <View accessibilityLabel="Assumption recovery choices" accessibilityRole="radiogroup" style={{ gap: 8 }}>
                {currentRecoveryOptions.snapshots.map((snapshot) => {
                  const selected = snapshot.snapshotId === selectedSnapshotId;
                  return (
                    <Pressable
                      key={snapshot.snapshotId}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={snapshot.assumptions ? recoveryChoiceAccessibilityLabel(
                        snapshot.assumptions,
                        `Snapshot revision ${snapshot.clientRevision}`,
                        snapshot.updatedAt
                      ) : `Portfolio-only snapshot revision ${snapshot.clientRevision}`}
                      onPress={() => {
                        setSelectedSnapshotId(snapshot.snapshotId);
                        setPendingRecovery(null);
                      }}
                      style={{ borderColor: selected ? '#34d399' : '#334155', borderRadius: 8, borderWidth: 1, gap: 3, minHeight: 48, padding: 10 }}
                    >
                      <Text selectable style={{ color: '#f8fafc', fontSize: 13, fontWeight: '800' }}>
                        Revision {snapshot.clientRevision}
                      </Text>
                      <RecoveryAssumptionSummary input={snapshot.assumptions} />
                      <RecoveryPortfolioSummary book={snapshot.portfolio} />
                      <Text selectable style={{ color: '#94a3b8', fontSize: 12 }}>
                        Saved {new Date(snapshot.updatedAt).toLocaleString()}
                      </Text>
                    </Pressable>
                  );
                })}
                {currentRecoveryOptions.guestAssumptions || currentRecoveryOptions.guestPortfolio ? (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: currentPendingRecovery?.kind === 'guest' }}
                    accessibilityLabel={currentRecoveryOptions.guestAssumptions ? recoveryChoiceAccessibilityLabel(
                      currentRecoveryOptions.guestAssumptions,
                      'Saved guest assumptions'
                    ) : 'Saved guest Portfolio'}
                    disabled={work !== 'idle'}
                    onPress={() => {
                      setSelectedSnapshotId(null);
                      beginReview({ assumptions: currentRecoveryOptions.guestAssumptions, portfolio: currentRecoveryOptions.guestPortfolio, kind: 'guest' });
                    }}
                    style={({ pressed }) => [{ alignItems: 'center', borderColor: '#38bdf8', borderRadius: 12, borderWidth: 1, minHeight: 48, padding: 12 }, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}
                  >
                    <Text selectable style={{ color: '#bae6fd', fontSize: 14, fontWeight: '800' }}>
                      Review guest adoption
                    </Text>
                    <RecoveryAssumptionSummary input={currentRecoveryOptions.guestAssumptions} />
                    <RecoveryPortfolioSummary book={currentRecoveryOptions.guestPortfolio} />
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: currentPendingRecovery?.kind === 'device' }}
                  accessibilityLabel={recoveryChoiceAccessibilityLabel(assumptions, 'Current device assumptions')}
                  disabled={work !== 'idle'}
                  onPress={() => {
                    setSelectedSnapshotId(null);
                    beginReview({ assumptions, portfolio: portfolio.book, kind: 'device' });
                  }}
                  style={({ pressed }) => [{ borderColor: '#34d399', borderRadius: 12, borderWidth: 1, gap: 4, minHeight: 48, padding: 12 }, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}
                >
                  <Text selectable style={{ color: '#bbf7d0', fontSize: 14, fontWeight: '800' }}>Keep this device as account version</Text>
                  <RecoveryAssumptionSummary input={assumptions} />
                  <RecoveryPortfolioSummary book={portfolio.book} />
                </Pressable>
              </View>
            ) : null}
            {currentRecoveryOptions?.rejectedCount ? (
              <Text selectable style={{ color: '#fbbf24', fontSize: 12, lineHeight: 18 }}>
                {currentRecoveryOptions.rejectedCount} corrupt or unsupported snapshot{currentRecoveryOptions.rejectedCount === 1 ? '' : 's'} hidden.
              </Text>
            ) : null}
            {selectedSnapshot && !currentPendingRecovery ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Review selected snapshot restore"
                disabled={work !== 'idle'}
                onPress={() => beginReview({ kind: 'remote', snapshot: selectedSnapshot })}
                style={({ pressed }) => [primaryButton, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}
              >
                <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>Review selected restore</Text>
              </Pressable>
            ) : null}
            {currentPendingRecovery ? (
              <View style={{ backgroundColor: '#0f172a', borderLeftColor: '#fbbf24', borderLeftWidth: 3, gap: 9, padding: 11 }}>
                <Text ref={recoveryConfirmationRef} accessibilityRole="header" selectable style={{ color: '#f8fafc', fontSize: 14, fontWeight: '800' }}>
                  Confirm {currentPendingRecovery.kind === 'guest'
                    ? 'guest adoption'
                    : currentPendingRecovery.kind === 'device'
                      ? 'keep this device'
                      : `revision ${currentPendingRecovery.snapshot.clientRevision} restore`}
                </Text>
                <RecoveryAssumptionSummary input={
                  currentPendingRecovery.kind === 'remote'
                    ? currentPendingRecovery.snapshot.assumptions
                    : currentPendingRecovery.assumptions
                } />
                <RecoveryPortfolioSummary book={currentPendingRecovery.kind === 'remote'
                  ? currentPendingRecovery.snapshot.portfolio : currentPendingRecovery.portfolio ?? null} />
                <Text selectable style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18 }}>
                  This applies the reviewed scenario and Portfolio together and discards queued changes for this device&apos;s sync stream. Missing source data preserves its destination. The source and both local stores are rechecked before any write.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Confirm assumption recovery"
                    disabled={work !== 'idle'}
                    onPress={confirmRecovery}
                    style={({ pressed }) => [primaryButton, { flex: 1, opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}
                  >
                    <Text selectable style={{ color: '#ecfdf5', fontSize: 13, fontWeight: '900' }}>
                      {work === 'restoring' || work === 'adopting' ? 'Applying...' : 'Confirm'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel assumption recovery"
                    disabled={work !== 'idle'}
                    onPress={() => setPendingRecovery(null)}
                    style={({ pressed }) => [{ alignItems: 'center', borderColor: '#64748b', borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 48, padding: 12 }, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}
                  >
                    <Text selectable style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '800' }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out of private account" disabled={work !== 'idle'} onPress={signOut} style={({ pressed }) => [{ alignItems: 'center', borderColor: '#475569', borderRadius: 12, borderWidth: 1, minHeight: 48, padding: 12 }, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}>
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
            style={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, borderWidth: 1, color: '#f8fafc', fontSize: 15, minHeight: 48, paddingHorizontal: 12, paddingVertical: 11 }}
            value={email}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Email secure sign-in link" disabled={work !== 'idle'} onPress={requestMagicLink} style={({ pressed }) => [primaryButton, { opacity: pressed || work !== 'idle' ? 0.65 : 1 }]}>
            <Text selectable style={{ color: '#ecfdf5', fontSize: 14, fontWeight: '900' }}>{work === 'signing-in' ? 'Sending...' : 'Email sign-in link'}</Text>
          </Pressable>
        </View>
      )}
      {currentStatus ? <Text accessibilityLiveRegion="polite" selectable style={{ color: '#bbf7d0', fontSize: 13, lineHeight: 19 }}>{currentStatus}</Text> : null}
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>Educational tool. Not financial advice.</Text>
    </View>
  );
}
