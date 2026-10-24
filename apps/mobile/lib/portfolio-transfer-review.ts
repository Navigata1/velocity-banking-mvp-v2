import { decodePortfolioDocument, encodePortfolioDocument, type PortfolioBook } from '@interestshield/financial-engine/portfolio-book';

export interface PortfolioTransferCurrent {
  sourceJSON: string;
  book: PortfolioBook;
  storageScope: string;
  revision: number;
  documentVersion?: 3 | 4;
  disabled?: boolean;
}

export interface PortfolioTransferReview {
  readonly sourceJSON: string;
  readonly canonicalDocument: string;
  readonly destinationSignature: string;
  readonly storageScope: string;
  readonly revision: number;
  readonly sourceVersion: 1 | 2 | 3 | 4;
  readonly debtCount: number;
  readonly locBalance: number;
  readonly locLimit: number;
  readonly locAPR: number;
  readonly phase: 'review' | 'pending' | 'complete' | 'failed' | 'cancelled';
}

function assertEditable(current: PortfolioTransferCurrent): void {
  if (current.disabled) throw new Error('Portfolio editing is unavailable. Review again when editing is available.');
  if (typeof current.storageScope !== 'string' || !current.storageScope.trim()) throw new Error('Portfolio storage scope is missing.');
  if (!Number.isSafeInteger(current.revision) || current.revision < 0) throw new Error('Portfolio revision is invalid.');
  if (current.documentVersion !== undefined && current.documentVersion !== 3 && current.documentVersion !== 4) throw new Error('Portfolio document version is unsupported.');
}

export function makePortfolioTransferReview(current: PortfolioTransferCurrent): PortfolioTransferReview {
  assertEditable(current);
  const book = decodePortfolioDocument(current.sourceJSON);
  const sourceVersion = (JSON.parse(current.sourceJSON) as { version: 1 | 2 | 3 | 4 }).version;
  const documentVersion = sourceVersion === 4 || current.documentVersion === 4 ? 4
    : sourceVersion === 3 || current.documentVersion === 3 ? 3 : undefined;
  return Object.freeze({
    sourceJSON: current.sourceJSON,
    canonicalDocument: encodePortfolioDocument(book, documentVersion),
    destinationSignature: encodePortfolioDocument(current.book, current.documentVersion),
    storageScope: current.storageScope,
    revision: current.revision,
    sourceVersion,
    debtCount: book.debts.length,
    locBalance: book.loc.balance,
    locLimit: book.loc.limit,
    locAPR: book.loc.apr,
    phase: 'review',
  });
}

export function validatePortfolioTransferReview(review: PortfolioTransferReview, current: PortfolioTransferCurrent): PortfolioBook {
  if (review.phase !== 'review') throw new Error('This confirmation is no longer available. Review the imported portfolio again.');
  assertEditable(current);
  if (current.storageScope !== review.storageScope) throw new Error('Portfolio owner scope changed. Review the imported portfolio again.');
  if (current.revision !== review.revision) throw new Error('Portfolio revision changed. Review the imported portfolio again.');
  if (current.sourceJSON !== review.sourceJSON) throw new Error('Imported source JSON changed. Review the imported portfolio again.');
  if (encodePortfolioDocument(current.book, current.documentVersion) !== review.destinationSignature) {
    throw new Error('Destination portfolio changed. Review the imported portfolio again.');
  }
  // Only decode the frozen canonical document here: never reinterpret legacy rates twice.
  return decodePortfolioDocument(review.canonicalDocument);
}

export function beginPortfolioTransferConfirmation(review: PortfolioTransferReview, current: PortfolioTransferCurrent): {
  review: PortfolioTransferReview;
  replacement: { book: PortfolioBook; expectedRevision: number; documentVersion?: 3 | 4 } | null;
} {
  const book = validatePortfolioTransferReview(review, current);
  const unchanged = review.canonicalDocument === review.destinationSignature;
  const version = (JSON.parse(review.canonicalDocument) as { version: 2 | 3 | 4 }).version;
  return {
    review: Object.freeze({ ...review, phase: unchanged ? 'complete' : 'pending' }),
    replacement: unchanged ? null : { book, expectedRevision: review.revision,
      ...(version === 3 || version === 4 ? { documentVersion: version } : {}) },
  };
}

export function finishPortfolioTransferConfirmation(review: PortfolioTransferReview, outcome: 'saved' | 'failed'): PortfolioTransferReview {
  if (review.phase !== 'pending') return review;
  return Object.freeze({ ...review, phase: outcome === 'saved' ? 'complete' : 'failed' });
}

export function cancelPortfolioTransferReview(review: PortfolioTransferReview): PortfolioTransferReview {
  if (review.phase === 'pending' || review.phase === 'cancelled') return review;
  return Object.freeze({ ...review, phase: 'cancelled' });
}
