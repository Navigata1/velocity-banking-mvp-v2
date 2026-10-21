import { formatCurrency, type MobileDashboardInput } from '@interestshield/financial-engine';
import * as Crypto from 'expo-crypto';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { useMobilePortfolio } from '@/components/mobile-portfolio-provider';
import { useMobileAuth } from '@/components/mobile-auth-provider';
import { PortfolioControls } from '@/components/portfolio/portfolio-controls';
import { PortfolioDebtEditor } from '@/components/portfolio/portfolio-debt-editor';
import { PortfolioPayoffPath } from '@/components/portfolio/portfolio-payoff-path';
import { PortfolioCommonMonth } from '@/components/portfolio/portfolio-common-month';
import { PortfolioTransfer } from '@/components/portfolio/portfolio-transfer';
import { buildMobilePortfolioBookView, copyMobileScenarioToPortfolio, createBlankMobilePortfolio } from '@/lib/mobile-portfolio-model';
import { MobileRouteScreen } from './route-screen';

function Command({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.command, { opacity: disabled || pressed ? 0.6 : 1 }]}>
    <Text style={styles.commandText}>{label}</Text>
  </Pressable>;
}

function PortfolioWorkspace({ input, scenarioReady }: { input: MobileDashboardInput; scenarioReady: boolean }) {
  const portfolio = useMobilePortfolio();
  const { recoveryBusy } = useMobileAuth();
  const [commandError, setCommandError] = useState('');
  const [confirmReload, setConfirmReload] = useState(false);
  const { book, status } = portfolio;
  const view = useMemo(() => book ? buildMobilePortfolioBookView(book) : null, [book]);
  const disabled = recoveryBusy || !portfolio.isHydrated || ['error','unavailable','replacing'].includes(status);
  const perform = (action: () => Promise<unknown>) => {
    setCommandError('');
    void action().catch(error => setCommandError(error instanceof Error ? error.message : 'Portfolio change could not finish.'));
  };
  const statusLabel = status === 'saved' ? `Saved ${portfolio.backend === 'secure-store' ? 'in encrypted storage' : 'on this browser'}. Revision ${portfolio.revision}.`
    : status === 'saving' ? 'Saving portfolio...'
      : status === 'empty' ? 'No portfolio saved for this account or guest scope.'
        : status === 'loading' ? 'Loading portfolio...'
          : status === 'replacing' ? 'Replacing saved portfolio...'
            : `Not saved. ${portfolio.error ?? 'Portfolio storage is unavailable.'} Unsaved changes have not replaced stored data.`;

  return (
    <View style={styles.workspace}>
      <FinancialCard title="Portfolio Coverage" value={view ? formatCurrency(view.startingBalance) : 'No portfolio yet'}
        detail={view ? `${book!.debts.length} simulated debts plus the LOC balance. Only entered liabilities are modeled.`
          : 'Start a separate simulated inventory. Your existing single-debt scenario remains unchanged.'} />
      <Text testID="native-portfolio-storage-status" accessibilityLiveRegion="polite" style={styles.detail}>{statusLabel}</Text>
      {commandError ? <Text accessibilityRole="alert" style={styles.warning}>{commandError}</Text> : null}
      <Text style={styles.detail}>Portfolio and the single-debt scenario have separate inputs. Configured private snapshot sync includes both saved records.</Text>
      {status === 'error' ? <>
        <Text style={styles.warning}>Reloading discards unsaved portfolio edits. Other tabs may have newer saved values.</Text>
        <Command label={confirmReload ? 'Confirm reload saved portfolio' : 'Reload saved portfolio'} onPress={() => {
          if (!confirmReload) { setConfirmReload(true); return; }
          setConfirmReload(false); perform(portfolio.reload);
        }} />
      </> : null}
      {!book ? <View style={styles.actions}>
        <Command label="Create blank portfolio" disabled={disabled} onPress={() => perform(() => portfolio.create(createBlankMobilePortfolio()))} />
        <Command label="Copy current scenario" disabled={disabled || !scenarioReady}
          onPress={() => perform(() => portfolio.create(copyMobileScenarioToPortfolio(input, Crypto.randomUUID())))} />
      </View> : null}
      {book && view ? <View key={portfolio.storageScope} testID="native-portfolio-book" style={styles.workspace}>
        <FinancialCard title="Modeling Mode" value={view.payoffLabel}
          detail="Funded monthly estimate: household cash flow covers minimums, then extra payments within the saved cap. LOC interest uses a 30-day/365-day daily-balance estimate. Lender fees, posting rules and dated calendars are not modeled." />
        {view.warnings.map((warning, index) => <Text key={`${index}-${warning}`} style={styles.warning}>{warning}</Text>)}
        <View style={styles.summaries}>
          <FinancialCard title="First Modeled Target" value={view.targetLabel} />
          <FinancialCard title="Interest Estimate" value={view.interestLabel} />
          <FinancialCard title="Retained Cash at Modeled Payoff" value={view.cashLabel}
            detail="Not interest savings or a common-date wealth comparison. Display amounts are independently rounded; stored inputs retain their precision." />
        </View>
        <PortfolioPayoffPath path={view.path} />
        <PortfolioControls book={book} disabled={disabled} onChange={change => perform(() => portfolio.update(change))} />
        <PortfolioDebtEditor book={book} disabled={disabled} onChange={change => perform(() => portfolio.update(change))} />
        <PortfolioCommonMonth book={book} disabled={disabled} />
        <PortfolioTransfer book={book} storageScope={portfolio.storageScope} revision={portfolio.revision}
          disabled={disabled || status === 'saving'} onReplace={(next, revision) => portfolio.replace(next, undefined, revision)} />
      </View> : null}
    </View>
  );
}

export function PortfolioRoute() {
  const portfolio = useMobilePortfolio();
  return <MobileRouteScreen mode="portfolio" showAssumptionControls={false}
    renderContent={({ input, isHydrated }) => <PortfolioWorkspace key={portfolio.storageScope} input={input} scenarioReady={isHydrated} />} />;
}

const styles = StyleSheet.create({
  workspace: { gap: 18, minWidth: 0 },
  actions: { gap: 12 },
  summaries: { gap: 12 },
  detail: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  warning: { color: '#fbbf24', fontSize: 14, lineHeight: 21 },
  command: { borderColor: '#5eead4', borderWidth: 1, borderRadius: 8, minHeight: 48, padding: 12, justifyContent: 'center' },
  commandText: { color: '#99f6e4', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
