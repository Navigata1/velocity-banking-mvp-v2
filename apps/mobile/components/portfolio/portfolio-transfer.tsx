import { encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatFinancialInput } from '../../lib/financial-input-draft';
import { beginPortfolioTransferConfirmation, cancelPortfolioTransferReview, finishPortfolioTransferConfirmation,
  makePortfolioTransferReview, type PortfolioTransferCurrent, type PortfolioTransferReview } from '../../lib/portfolio-transfer-review';

type Props = {
  book: PortfolioBook;
  storageScope: string;
  revision: number;
  documentVersion?: 3 | 4;
  disabled?: boolean;
  onReplace: (book: PortfolioBook, expectedRevision: number, documentVersion?: 3 | 4) => Promise<unknown>;
};

export function PortfolioTransfer(props: Props) {
  // An owner switch discards local text and review state even without a keyed parent.
  return <PortfolioTransferForm key={props.storageScope} {...props} />;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Portfolio transfer could not complete. Your imported JSON is unchanged.';
}

function PortfolioTransferForm(props: Props) {
  const [draft, setDraft] = useState('');
  const [review, setReview] = useState<PortfolioTransferReview | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [work, setWork] = useState<'replace' | 'share' | null>(null);
  const draftRef = useRef('');
  const reviewRef = useRef<PortfolioTransferReview | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; }, [props]);
  useLayoutEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const exported = useMemo(() => {
    try { return { document: encodePortfolioDocument(props.book, props.documentVersion), error: '' }; }
    catch (cause) { return { document: '', error: errorMessage(cause) }; }
  }, [props.book, props.documentVersion]);
  const disabled = Boolean(props.disabled || work);

  function currentInput(): PortfolioTransferCurrent {
    const current = latest.current;
    return { sourceJSON: draftRef.current, book: current.book, storageScope: current.storageScope,
      revision: current.revision, disabled: current.disabled,
      ...(current.documentVersion === undefined ? {} : { documentVersion: current.documentVersion }) };
  }
  function updateReview(next: PortfolioTransferReview | null) {
    reviewRef.current = next;
    setReview(next);
  }
  function reviewImport() {
    if (!active.current || busy.current || latest.current.disabled) return;
    setError(''); setStatus('');
    try { updateReview(makePortfolioTransferReview(currentInput())); }
    catch (cause) { updateReview(null); setError(errorMessage(cause)); }
  }
  function cancelReview() {
    if (!active.current || busy.current || latest.current.disabled || !reviewRef.current) return;
    const next = cancelPortfolioTransferReview(reviewRef.current);
    if (next.phase === 'cancelled') { updateReview(null); setError(''); setStatus(''); }
  }
  async function confirmImport() {
    if (!active.current || busy.current || latest.current.disabled || !reviewRef.current) return;
    setError(''); setStatus('');
    let pendingReview: PortfolioTransferReview | null = null;
    try {
      const next = beginPortfolioTransferConfirmation(reviewRef.current, currentInput());
      // Consume the confirmation synchronously, before awaiting persistence or another press.
      updateReview(next.review);
      if (!next.replacement) { setStatus('This portfolio already matches the imported data. Nothing was replaced.'); return; }
      pendingReview = next.review;
      busy.current = true;
      setWork('replace');
      await latest.current.onReplace(next.replacement.book, next.replacement.expectedRevision, next.replacement.documentVersion);
      if (active.current && reviewRef.current === pendingReview) {
        updateReview(finishPortfolioTransferConfirmation(pendingReview, 'saved'));
        setStatus('Portfolio replaced.');
      }
    } catch (cause) {
      if (active.current) {
        if (pendingReview && reviewRef.current === pendingReview) updateReview(finishPortfolioTransferConfirmation(pendingReview, 'failed'));
        setError(errorMessage(cause));
      }
    } finally {
      busy.current = false;
      if (active.current) setWork(null);
    }
  }
  async function shareExport() {
    if (!active.current || busy.current || latest.current.disabled) return;
    busy.current = true;
    setWork('share'); setError('');
    try {
      const message = encodePortfolioDocument(latest.current.book, latest.current.documentVersion);
      await Share.share({ title: 'Portfolio JSON', message });
    } catch (cause) { if (active.current) setError(errorMessage(cause)); }
    finally { busy.current = false; if (active.current) setWork(null); }
  }

  return (
    <View testID="native-portfolio-transfer" style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>Portfolio JSON</Text>
      <Text accessible={false} style={styles.label}>Export JSON</Text>
      <ScrollView style={styles.exportField} contentContainerStyle={styles.exportContent} nestedScrollEnabled>
        <Text accessibilityLabel="Portfolio export JSON" selectable style={styles.jsonText}>{exported.document}</Text>
      </ScrollView>
      {exported.error ? <Text accessibilityRole="alert" style={styles.error}>{exported.error}</Text> : null}
      {Platform.OS !== 'web' ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Share portfolio JSON" disabled={disabled || !exported.document}
          accessibilityState={{ disabled: disabled || !exported.document, busy: work === 'share' }} onPress={shareExport}
          style={({ pressed }) => [styles.command, { opacity: disabled || !exported.document || pressed ? 0.6 : 1 }]}>
          <Text style={styles.commandText}>{work === 'share' ? 'Opening share sheet...' : 'Share portfolio JSON'}</Text>
        </Pressable>
      ) : null}

      <Text accessible={false} style={styles.label}>Import JSON</Text>
      <TextInput accessibilityLabel="Portfolio import JSON" multiline autoCapitalize="none" autoCorrect={false}
        spellCheck={false} editable={!disabled} value={draft} style={[styles.importField, styles.jsonText]}
        onChangeText={value => {
          if (busy.current || latest.current.disabled) return;
          draftRef.current = value; setDraft(value);
          updateReview(null); setError(''); setStatus('');
        }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Review imported portfolio" disabled={disabled}
        accessibilityState={{ disabled }} onPress={reviewImport}
        style={({ pressed }) => [styles.command, { opacity: disabled || pressed ? 0.6 : 1 }]}>
        <Text style={styles.commandText}>Review imported portfolio</Text>
      </Pressable>

      {review ? (
        <View testID="native-portfolio-transfer-review" style={styles.review}>
          <Text accessibilityRole="header" style={styles.subheading}>Replacement review</Text>
          <Text style={styles.detail}>{review.debtCount} simulated {review.debtCount === 1 ? 'debt' : 'debts'}.</Text>
          <Text selectable style={styles.detail}>LOC balance: ${formatFinancialInput(review.locBalance, 'money')}{'\n'}
            LOC limit: ${formatFinancialInput(review.locLimit, 'money')}{'\n'}
            LOC APR: {formatFinancialInput(review.locAPR, 'percent')}%</Text>
          <Text style={styles.detail}>{review.sourceVersion === 1
            ? 'Version 1 import. Legacy rates were converted once.' : `Version ${review.sourceVersion} import. Rates are decimal APRs.`}</Text>
          <Text style={styles.detail}>Stored APRs use decimals: 0.065 = 6.5%; 2 = 200%.</Text>
          <Text style={styles.detail}>This replaces this simulated portfolio, including its household inputs and LOC.</Text>
          <View style={styles.commands}>
            {review.phase === 'review' || review.phase === 'pending' ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Confirm replace portfolio" disabled={disabled || review.phase !== 'review'}
                accessibilityState={{ disabled: disabled || review.phase !== 'review', busy: work === 'replace' }} onPress={confirmImport}
                style={({ pressed }) => [styles.command, styles.primary, styles.flexCommand,
                  { opacity: disabled || review.phase !== 'review' || pressed ? 0.6 : 1 }]}>
                <Text style={styles.commandText}>{work === 'replace' ? 'Replacing portfolio...' : 'Confirm replace portfolio'}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel" disabled={disabled}
              accessibilityState={{ disabled }} onPress={cancelReview}
              style={({ pressed }) => [styles.command, styles.flexCommand, { opacity: disabled || pressed ? 0.6 : 1 }]}>
              <Text style={styles.commandText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {status ? <Text accessibilityLiveRegion="polite" style={styles.detail}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, minWidth: 0 },
  heading: { color: '#f8fafc', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  subheading: { color: '#f8fafc', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  exportField: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 8, borderWidth: 1, height: 180, minWidth: 0 },
  exportContent: { minWidth: 0, padding: 12 },
  jsonText: { color: '#cbd5e1', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, lineHeight: 19 },
  importField: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 8, borderWidth: 1,
    minHeight: 160, maxHeight: 320, minWidth: 0, padding: 12, textAlignVertical: 'top' },
  review: { borderColor: '#334155', borderTopWidth: 1, gap: 10, minWidth: 0, paddingTop: 12 },
  detail: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  error: { color: '#fbbf24', fontSize: 13, lineHeight: 19 },
  commands: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minWidth: 0 },
  flexCommand: { flexBasis: 180, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  command: { alignItems: 'center', borderColor: '#475569', borderRadius: 8, borderWidth: 1,
    justifyContent: 'center', minHeight: 48, paddingHorizontal: 12, paddingVertical: 12 },
  primary: { backgroundColor: '#173c37', borderColor: '#5eead4' },
  commandText: { color: '#99f6e4', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
