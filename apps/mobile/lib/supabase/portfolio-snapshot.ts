import { decodePortfolioDocument, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';

export const PORTFOLIO_SNAPSHOT_KEY = 'interestshield-portfolio-v1';

export function readMobileSnapshotPortfolio(entries: readonly unknown[]): PortfolioBook | null {
  const matches = entries.filter((entry): entry is Record<string, unknown> => entry !== null
    && typeof entry === 'object' && 'key' in entry && entry.key === PORTFOLIO_SNAPSHOT_KEY);
  if (matches.length === 0) return null;
  if (matches.length !== 1 || typeof matches[0]!.value !== 'string') {
    throw new Error('Snapshot Portfolio entry is ambiguous or malformed.');
  }
  return decodePortfolioDocument(matches[0].value);
}

export function serializeMobileRecoveryPortfolio(book: PortfolioBook | null): string {
  return book === null ? 'null' : encodePortfolioDocument(book);
}

export function validatePortfolioFingerprint(value: string): void {
  if (value !== 'null' && serializeMobileRecoveryPortfolio(decodePortfolioDocument(value)) !== value) {
    throw new Error('Snapshot Portfolio review fingerprint is malformed.');
  }
}
