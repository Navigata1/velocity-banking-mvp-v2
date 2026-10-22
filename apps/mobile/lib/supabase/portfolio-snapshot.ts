import { decodePortfolioDocument, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import type { MobileDashboardInput } from '@interestshield/financial-engine';
import { decodeMobileAssumptions } from '../mobile-assumption-storage';

export const PORTFOLIO_SNAPSHOT_KEY = 'interestshield-portfolio-v1';

export function readMobileSnapshotPortfolioState(entries: readonly unknown[]): { book: PortfolioBook | null; documentVersion?: 3 } {
  const matches = entries.filter((entry): entry is Record<string, unknown> => entry !== null
    && typeof entry === 'object' && 'key' in entry && entry.key === PORTFOLIO_SNAPSHOT_KEY);
  if (matches.length === 0) return { book: null };
  if (matches.length !== 1 || typeof matches[0]!.value !== 'string') {
    throw new Error('Snapshot Portfolio entry is ambiguous or malformed.');
  }
  const book = decodePortfolioDocument(matches[0].value);
  return { book, ...(JSON.parse(matches[0].value).version === 3 ? { documentVersion: 3 as const } : {}) };
}

export function readMobileSnapshotPortfolio(entries: readonly unknown[]): PortfolioBook | null {
  return readMobileSnapshotPortfolioState(entries).book;
}

export function serializeMobileRecoveryPortfolio(book: PortfolioBook | null, documentVersion?: 3): string {
  if (documentVersion !== undefined && (documentVersion !== 3 || book === null)) throw new Error('Snapshot Portfolio document version is invalid.');
  return book === null ? 'null' : encodePortfolioDocument(book, documentVersion);
}

export function validatePortfolioFingerprint(value: string): void {
  if (value !== 'null' && serializeMobileRecoveryPortfolio(decodePortfolioDocument(value), JSON.parse(value).version === 3 ? 3 : undefined) !== value) {
    throw new Error('Snapshot Portfolio review fingerprint is malformed.');
  }
}

function assertLegacyScenario(value: unknown): void {
  if (value && typeof value === 'object' && 'loc' in value && value.loc && typeof value.loc === 'object' && 'lenderTerms' in value.loc) {
    throw new Error('Scenario version1 does not support lender terms. Use an explicit Portfolio document3.');
  }
}

export function captureMobileSnapshotAssumptions(input: MobileDashboardInput): MobileDashboardInput {
  assertLegacyScenario(input);
  return JSON.parse(JSON.stringify(input)) as MobileDashboardInput;
}

export function decodeMobileSnapshotAssumptions(raw: string, ownerId: string): MobileDashboardInput | null {
  try {
    // Reject extensions before the legacy normalizer can discard them.
    assertLegacyScenario((JSON.parse(raw) as { input?: unknown } | null)?.input);
    return decodeMobileAssumptions(raw, ownerId);
  } catch { return null; }
}
