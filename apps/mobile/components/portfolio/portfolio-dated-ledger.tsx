import type { PortfolioSimulationResult } from '@interestshield/financial-engine/portfolio';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMobileDatedAmount as money } from '../../lib/mobile-portfolio-model';
import { ChoiceControl } from './choice-control';

type Ledger = NonNullable<PortfolioSimulationResult['datedLedger']>;
const eventLabels: Record<Ledger['events'][number]['kind'], string> = {
  income: 'Income', expense: 'Expense', 'debt-payment': 'Debt payment', chunk: 'Principal chunk',
  'annual-fee': 'Annual fee', 'draw-fee': 'Draw fee', 'loc-payment': 'LOC payment', 'loc-minimum': 'LOC minimum',
  'loc-interest': 'Statement interest', 'loc-maturity': 'Maturity settlement', 'loc-statement': 'Statement minimum',
};
const modes = [{ value: 'daily', label: 'Daily balances' }, { value: 'events', label: 'Postings' }] as const;
const PAGE_SIZE = 30;

export function PortfolioDatedLedger({ result }: { result: PortfolioSimulationResult }) {
  if (!result.datedLedger) return null;
  return <DatedLedgerRows key={result.datedLedger.startDate} ledger={result.datedLedger} result={result} />;
}

function DatedLedgerRows({ ledger, result }: { ledger: Ledger; result: PortfolioSimulationResult }) {
  const [selectedMonth, setSelectedMonth] = useState(ledger.startDate.slice(0, 7));
  const [mode, setMode] = useState<'daily' | 'events'>('daily'), [requestedPage, setPage] = useState(0);
  const months = useMemo(() => [...new Set([ledger.startDate, ...ledger.daily.map(row => row.date),
    ...ledger.events.map(row => row.date), ...(ledger.failure ? [ledger.failure.date] : [])].map(date => date.slice(0, 7)))].sort(), [ledger]);
  const monthIndex = Math.max(0, months.indexOf(selectedMonth)), month = months[monthIndex];
  const days = ledger.daily.filter(row => row.date.startsWith(month));
  const events = ledger.events.filter(row => row.date.startsWith(month));
  const pages = Math.max(1, Math.ceil(events.length / PAGE_SIZE)), page = Math.min(requestedPage, pages - 1);
  const changeMonth = (offset: number) => { const next = months[monthIndex + offset]; if (next) { setSelectedMonth(next); setPage(0); } };
  return <View testID="native-dated-ledger" style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Dated daily ledger</Text>
    <Text style={styles.detail}>Start {ledger.startDate}. Draw boundary {ledger.drawEndsOn}. Maturity {ledger.maturesOn}.</Text>
    <Text style={styles.detail}>Opening cash {money(ledger.openingCash)}. Protected reserve {money(ledger.cashReserve)}.</Text>
    <Text style={styles.label}>{result.isPayoffPossible && result.payoffDate ? `Payoff observed ${result.payoffDate}` : 'Payoff unavailable.'}</Text>
    <Text style={styles.detail}>Interest: {result.isPayoffPossible ? money(result.totalInterest) : 'Not projected'}. Fees: {result.isPayoffPossible ? money(result.totalFees ?? 0) : 'Not projected'}.</Text>
    {ledger.failure ? <Text accessibilityRole="alert" style={styles.warning}>{ledger.failure.date}: {ledger.failure.message}
      {ledger.failure.attemptedBalance === undefined ? '' : ` Attempted LOC balance ${money(ledger.failure.attemptedBalance)}.`} Diagnostic prefix only; the failed month is not an accepted monthly result.</Text> : null}
    <View style={styles.navigation}>
      <LedgerCommand label="Previous ledger month" disabled={monthIndex === 0} onPress={() => changeMonth(-1)} symbol={'\u2190'} />
      <Text accessibilityLiveRegion="polite" style={styles.label}>{month}</Text>
      <LedgerCommand label="Next ledger month" disabled={monthIndex >= months.length - 1} onPress={() => changeMonth(1)} symbol={'\u2192'} />
    </View>
    <ChoiceControl label="Ledger" accessibilityLabel="Dated ledger view" value={mode} options={modes}
      onChange={value => { setMode(value); setPage(0); }} />
    {mode === 'daily' ? <>
      {days.length === 0 ? <Text style={styles.detail}>No completed daily rows in this month.</Text> : null}
      {days.map(row => <View key={row.date} style={styles.row}>
        <Text style={styles.label}>{row.date}</Text>
        <Text style={styles.detail}>Cash {money(row.cashBalance)} | LOC {money(row.locBalance)} | Listed debt {money(row.debtBalance)}</Text>
        <Text style={styles.detail}>Interest balance {money(row.interestBalance)} | Unposted interest (rounded display) {money(row.unpostedInterest)}</Text>
        <Text style={styles.detail}>Minimum {money(row.minimumOutstanding)} due {row.minimumDueOn}</Text>
      </View>)}
    </> : <>
      {events.length === 0 ? <Text style={styles.detail}>No posted events in this month.</Text> : null}
      {events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((event, index) => <View key={`${month}-${page}-${index}`} style={styles.row}>
        <Text style={styles.label}>{event.date} | {eventLabels[event.kind]} | {money(event.amount)}</Text>
        {event.reference ? <Text style={styles.detail}>{event.reference}</Text> : null}
        <Text style={styles.detail}>Cash {money(event.cashBalance)} ({money(event.cashChange)}) | LOC {money(event.locBalance)} ({money(event.locChange)})</Text>
        <Text style={styles.detail}>Minimum {money(event.minimumOutstanding)} due {event.minimumDueOn}</Text>
      </View>)}
      {pages > 1 ? <View style={styles.navigation}>
        <LedgerCommand label="Previous postings page" disabled={page === 0} onPress={() => setPage(page - 1)} symbol={'\u2190'} />
        <Text style={styles.detail}>{page + 1} / {pages}</Text>
        <LedgerCommand label="Next postings page" disabled={page === pages - 1} onPress={() => setPage(page + 1)} symbol={'\u2192'} />
      </View> : null}
    </>}
    {ledger.notices.filter(notice => notice.date.startsWith(month)).map((notice, index) =>
      <Text key={`${notice.date}-${index}`} style={styles.warning}>{notice.date}: {notice.message}</Text>)}
    {result.payoffOrder.filter(event => event.paidOffOn).map(event => <Text key={event.id} style={styles.detail}>{event.name}: modeled settlement {event.paidOffOn}</Text>)}
  </View>;
}

function LedgerCommand({ label, disabled, onPress, symbol }: { label: string; disabled: boolean; onPress: () => void; symbol: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={() => { if (!disabled) onPress(); }} style={[styles.command, { opacity: disabled ? 0.4 : 1 }]}><Text style={styles.label}>{symbol}</Text></Pressable>;
}
const styles = StyleSheet.create({
  section: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 18, gap: 12, minWidth: 0 },
  heading: { color: '#f8fafc', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  label: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, fontWeight: '600', flexShrink: 1, fontVariant: ['tabular-nums'] },
  detail: { color: '#94a3b8', fontSize: 12, lineHeight: 19, fontVariant: ['tabular-nums'] }, warning: { color: '#fbbf24', fontSize: 13, lineHeight: 20 },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', minWidth: 0 },
  row: { borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10, gap: 4, minWidth: 0 },
  command: { width: 48, minHeight: 48, borderWidth: 1, borderColor: '#475569', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
