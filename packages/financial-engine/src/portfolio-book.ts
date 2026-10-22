import { decodeLenderTerms, normalizeApr, type MoneyLoopLOC } from './index';
import type { DebtItem, FocusMode, PayoffStrategy, PortfolioSimulationInputs } from './portfolio';
import { hasFiniteNonNegativeSum } from './numeric-range';

export interface PortfolioBook {
  monthlyIncome: number;
  monthlyExpenses: number;
  extraMonthlyPayment: number;
  chunkAmount: number;
  loc: MoneyLoopLOC;
  strategy: PayoffStrategy;
  focusMode: FocusMode;
  splitRatioPrimary: number;
  debts: DebtItem[];
}

type RecordValue = Record<string, unknown>;
function record(value: unknown, allowed: readonly string[], label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label} contains an unknown field: ${key}.`);
  return value as RecordValue;
}
function amount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`);
  return value;
}
function whole(value: unknown, label: string, minimum: number): number {
  const number = amount(value, label);
  if (!Number.isSafeInteger(number) || number < minimum) throw new Error(`${label} must be a safe whole number of at least ${minimum}.`);
  return number;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be non-empty text.`);
  return value;
}
function optionalText(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  return value;
}
function choice<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${label} is unsupported.`);
  return value as T;
}

function debt(value: unknown): DebtItem {
  const raw = record(value, ['id','name','category','kind','balance','apr','minPaymentRule','termMonths','paymentSource','promo','createdAt','notes'], 'Debt');
  const id = text(raw.id, 'Debt id');
  if (['__proto__','constructor','prototype'].includes(id)) throw new Error('Debt id is reserved.');
  const rule = record(raw.minPaymentRule, ['type','amount','percent','floor'], 'Minimum payment rule');
  const type = choice(rule.type, ['fixed','percent'] as const, 'Minimum payment rule');
  if (type === 'fixed' && ('percent' in rule || 'floor' in rule) || type === 'percent' && 'amount' in rule) {
    throw new Error('Minimum payment rule has unsupported mixed fields.');
  }
  const minPaymentRule: DebtItem['minPaymentRule'] = type === 'fixed'
    ? { type, amount: amount(rule.amount, 'Minimum payment') }
    : { type, percent: amount(rule.percent, 'Minimum percent'), floor: amount(rule.floor, 'Minimum floor') };
  let promo: DebtItem['promo'];
  if (raw.promo !== undefined) {
    const p = record(raw.promo, ['introApr','monthsRemaining','postIntroApr'], 'Promo');
    promo = { introApr: amount(p.introApr, 'Promo APR'), monthsRemaining: whole(p.monthsRemaining, 'Promo months', 0),
      postIntroApr: amount(p.postIntroApr, 'Post-promo APR') };
  }
  return {
    id, name: text(raw.name, 'Debt name'),
    category: choice(raw.category, ['mortgage','auto','credit_card','student_loan','personal_loan','medical','land','purchase_plan','custom'] as const, 'Debt category'),
    kind: choice(raw.kind, ['amortized','revolving','simple'] as const, 'Debt kind'),
    balance: amount(raw.balance, 'Debt balance'), apr: amount(raw.apr, 'Debt APR'), minPaymentRule,
    paymentSource: choice(raw.paymentSource, ['checking','loc','either'] as const, 'Payment source'),
    ...(raw.termMonths === undefined ? {} : { termMonths: whole(raw.termMonths, 'Debt term', 1) }),
    ...(promo === undefined ? {} : { promo }),
    ...(raw.createdAt === undefined ? {} : { createdAt: optionalText(raw.createdAt, 'Debt createdAt') }),
    ...(raw.notes === undefined ? {} : { notes: optionalText(raw.notes, 'Debt notes') }),
  };
}

export function decodePortfolioBook(value: unknown): PortfolioBook {
  const raw = record(value, ['monthlyIncome','monthlyExpenses','extraMonthlyPayment','chunkAmount','loc','strategy','focusMode','splitRatioPrimary','debts'], 'Portfolio book');
  const loc = record(raw.loc, ['limit','balance','apr','lenderTerms'], 'LOC');
  if (!Array.isArray(raw.debts)) throw new Error('Portfolio debts must be an array.');
  const debts = raw.debts.map(debt), identities = new Set<string>();
  for (const d of debts) {
    if (identities.has(d.id)) throw new Error(`Duplicate debt id: ${d.id}.`);
    identities.add(d.id);
  }
  const splitRatioPrimary = amount(raw.splitRatioPrimary, 'Split ratio');
  if (splitRatioPrimary > 1) throw new Error('Split ratio must be between0 and1.');
  const book: PortfolioBook = {
    monthlyIncome: amount(raw.monthlyIncome, 'Monthly income'),
    monthlyExpenses: amount(raw.monthlyExpenses, 'Monthly expenses'),
    extraMonthlyPayment: amount(raw.extraMonthlyPayment, 'Extra payment cap'),
    chunkAmount: amount(raw.chunkAmount, 'Chunk amount'),
    loc: { limit: amount(loc.limit, 'LOC limit'), balance: amount(loc.balance, 'LOC balance'), apr: amount(loc.apr, 'LOC APR'),
      ...('lenderTerms' in loc ? { lenderTerms: decodeLenderTerms(loc.lenderTerms) } : {}) },
    strategy: choice(raw.strategy, ['velocity','snowball','avalanche'] as const, 'Strategy'),
    focusMode: choice(raw.focusMode, ['single','split'] as const, 'Focus mode'), splitRatioPrimary, debts,
  };
  if (!hasFiniteNonNegativeSum([...debts.map(d => d.balance), book.loc.balance])) throw new Error('Total Portfolio balance must be finite.');
  return book;
}

export function decodePortfolioDocument(json: string): PortfolioBook {
  if (typeof json !== 'string') throw new Error('Portfolio document must be JSON text.');
  const raw = record(JSON.parse(json), ['version','aprUnit','data','state','exportedAt'], 'Portfolio document');
  if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) throw new Error('Portfolio document version is unsupported.');
  if (raw.version !== 1 ? raw.aprUnit !== 'decimal' : raw.aprUnit !== undefined) throw new Error('Portfolio document APR units are unsupported.');
  if (('data' in raw) === ('state' in raw)) throw new Error('Portfolio document requires exactly one data or state book.');
  const book = decodePortfolioBook('data' in raw ? raw.data : raw.state);
  if (raw.version !== 3 && book.loc.lenderTerms !== undefined) throw new Error('Lender terms require Portfolio document version3.');
  if (raw.version !== 1) return book;
  // Version1 stored the legacy mixed-unit contract. Convert once, without changing its source.
  return { ...book, loc: { ...book.loc, apr: normalizeApr(book.loc.apr) },
    debts: book.debts.map(d => ({ ...d, apr: normalizeApr(d.apr),
      ...(d.promo ? { promo: { ...d.promo, introApr: normalizeApr(d.promo.introApr), postIntroApr: normalizeApr(d.promo.postIntroApr) } } : {}) })) };
}

export function encodePortfolioDocument(book: PortfolioBook, requestedVersion?: 2 | 3): string {
  const data = decodePortfolioBook(book);
  const version = requestedVersion ?? (data.loc.lenderTerms === undefined ? 2 : 3);
  if (version !== 2 && version !== 3) throw new Error('Portfolio document version is unsupported.');
  if (version !== 3 && data.loc.lenderTerms !== undefined) throw new Error('Lender terms cannot be downgraded to Portfolio document version2.');
  return JSON.stringify({ version, aprUnit: 'decimal', data }, null, 2);
}

export function portfolioBookInputs(book: PortfolioBook): PortfolioSimulationInputs {
  const value = decodePortfolioBook(book);
  return { aprUnit: 'decimal', monthlyIncome: value.monthlyIncome, monthlyExpenses: value.monthlyExpenses,
    extraMonthlyPayment: value.extraMonthlyPayment, chunkAmount: value.chunkAmount, loc: value.loc, debts: value.debts,
    settings: { strategy: value.strategy, focusMode: value.focusMode, splitRatioPrimary: value.splitRatioPrimary }, maxMonths: 600 };
}
