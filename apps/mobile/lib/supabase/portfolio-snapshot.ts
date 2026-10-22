import { decodePortfolioDocument, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';
import type { MobileDashboardInput } from '@interestshield/financial-engine';
import { decodeMobileAssumptions } from '../mobile-assumption-storage';

export const PORTFOLIO_SNAPSHOT_KEY = 'interestshield-portfolio-v1';

export function readMobileSnapshotPortfolioState(entries: readonly unknown[]): { book: PortfolioBook | null; documentVersion?: 3 | 4 } {
  const matches = entries.filter((entry): entry is Record<string, unknown> => entry !== null
    && typeof entry === 'object' && 'key' in entry && entry.key === PORTFOLIO_SNAPSHOT_KEY);
  if (matches.length === 0) return { book: null };
  if (matches.length !== 1 || typeof matches[0]!.value !== 'string') {
    throw new Error('Snapshot Portfolio entry is ambiguous or malformed.');
  }
  const book = decodePortfolioDocument(matches[0].value);
  const version = (JSON.parse(matches[0].value) as { version: 1 | 2 | 3 | 4 }).version;
  return { book, ...(version === 3 || version === 4 ? { documentVersion: version } : {}) };
}

export function readMobileSnapshotPortfolio(entries: readonly unknown[]): PortfolioBook | null {
  return readMobileSnapshotPortfolioState(entries).book;
}

export function serializeMobileRecoveryPortfolio(book: PortfolioBook | null, documentVersion?: 3 | 4): string {
  if (documentVersion !== undefined && (documentVersion !== 3 && documentVersion !== 4 || book === null)) throw new Error('Snapshot Portfolio document version is invalid.');
  return book === null ? 'null' : encodePortfolioDocument(book, documentVersion);
}

export function validatePortfolioFingerprint(value: string): void {
  if (value === 'null') return;
  const version = (JSON.parse(value) as { version: 1 | 2 | 3 | 4 }).version;
  if (serializeMobileRecoveryPortfolio(decodePortfolioDocument(value), version === 3 || version === 4 ? version : undefined) !== value) {
    throw new Error('Snapshot Portfolio review fingerprint is malformed.');
  }
}

function assertLegacyScenario(value: unknown): void {
  if (value && typeof value === 'object' && 'datedPlan' in value) {
    throw new Error('Scenario version1 does not support dated plans. Use an explicit Portfolio document4.');
  }
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
