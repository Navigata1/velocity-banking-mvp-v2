export interface DatedCashEvent {
  id: string;
  day: number;
  kind: 'income' | 'expense';
  amount: number;
  source?: 'checking' | 'loc';
}

export interface DatedPortfolioPlan {
  contract: 'fixed-loc-daily-v1';
  startDate: string;
  openingCash: number;
  cashReserve: number;
  accountOpenedOn: string;
  drawEndsOn: string;
  maturesOn: string;
  annualFeeFirstDueOn: string;
  openingMinimumPayment: number;
  minimumDueDay: number;
  debtPaymentDay: number;
  cashEvents: DatedCashEvent[];
}

export const DATED_INPUT_MONEY_LIMIT = 1_000_000_000;
export const DATED_OUTPUT_CENTS_LIMIT = 100_000_000_000_000n;
export const DATED_EVENT_LIMIT = 256;

function plainRecord(value: unknown, allowed: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  const prototype = Object.getPrototypeOf(value);
  const constructor = prototype === null ? null : Object.getOwnPropertyDescriptor(prototype, 'constructor');
  if (prototype !== null && (Object.getPrototypeOf(prototype) !== null || !constructor || !('value' in constructor)
    || typeof constructor.value !== 'function' || constructor.value.prototype !== prototype
    || Function.prototype.toString.call(constructor.value) !== Function.prototype.toString.call(Object))) {
    throw new Error(`${label} must be a plain data object.`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new Error(`${label} contains an unsupported field.`);
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (!property?.enumerable || !('value' in property)) throw new Error(`${label} requires enumerable data fields.`);
  }
  return value as Record<string, unknown>;
}

function dataArray(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > DATED_EVENT_LIMIT) throw new Error(`Dated cash entries must be an array of at most ${DATED_EVENT_LIMIT}.`);
  const prototype = Object.getPrototypeOf(value), constructor = prototype === null ? null : Object.getOwnPropertyDescriptor(prototype, 'constructor');
  if (prototype !== null && (!constructor || !('value' in constructor) || typeof constructor.value !== 'function'
    || constructor.value.prototype !== prototype || Function.prototype.toString.call(constructor.value) !== Function.prototype.toString.call(Array))) {
    throw new Error('Dated cash entries must be a plain array.');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') continue;
    const index = typeof key === 'string' ? Number(key) : NaN;
    if (!Number.isSafeInteger(index) || index < 0 || index >= value.length || String(index) !== key) throw new Error('Dated cash entries contain an unsupported field.');
  }
  return Array.from({ length: value.length }, (_, index) => {
    const property = Object.getOwnPropertyDescriptor(value, String(index));
    if (!property?.enumerable || !('value' in property)) throw new Error('Dated cash entries cannot contain holes or accessors.');
    return property.value;
  });
}

function decimalRatio(value: unknown, label: string, limit = DATED_INPUT_MONEY_LIMIT): { numerator: bigint; denominator: bigint; scale: number } {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > limit) throw new Error(`${label} is outside the supported non-negative range.`);
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));
  if (!match) throw new Error(`${label} must be a decimal number.`);
  let numerator = BigInt(match[1] + (match[2] ?? ''));
  let scale = (match[2]?.length ?? 0) - Number(match[3] ?? 0);
  if (scale < 0) { numerator *= 10n ** BigInt(-scale); scale = 0; }
  return { numerator, denominator: 10n ** BigInt(scale), scale };
}

export function datedMoneyCents(value: unknown, label = 'Dated amount'): bigint {
  const ratio = decimalRatio(value, label), scaled = ratio.numerator * 100n;
  if (scaled % ratio.denominator !== 0n) throw new Error(`${label} requires exact cents.`);
  return scaled / ratio.denominator;
}

export function datedOutputCents(value: unknown): bigint {
  const ratio = decimalRatio(value, 'Dated position', Number(DATED_OUTPUT_CENTS_LIMIT) / 100);
  const scaled = ratio.numerator * 100n;
  if (scaled % ratio.denominator !== 0n) throw new Error('Dated positions require exact cents.');
  return scaled / ratio.denominator;
}

export function datedRateRatio(value: unknown): { numerator: bigint; denominator: bigint } {
  const { numerator, denominator, scale } = decimalRatio(value, 'Dated rate');
  if (scale > 8) throw new Error('Dated rates support at most eight decimal places.');
  return { numerator, denominator };
}

export function roundDatedRatio(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) throw new Error('Dated rounding requires a non-negative amount and positive denominator.');
  return (numerator * 2n + denominator) / (denominator * 2n);
}

export function datedCentsAmount(cents: bigint): number {
  if (cents < 0n || cents > DATED_OUTPUT_CENTS_LIMIT) throw new Error('Dated amount exceeds the exact-cent output range.');
  return Number(cents) / 100;
}

function day(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 31) throw new Error(`${label} requires a day from1 to31.`);
  return value;
}

export function datedCivilDate(value: unknown): { year: number; month: number; day: number } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Dated plan requires an ISO calendar date.');
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInDatedMonth(year, month)) throw new Error('Dated plan contains an invalid calendar date.');
  return { year, month, day };
}

export function daysInDatedMonth(year: number, month: number): number {
  if (!Number.isSafeInteger(year) || year < 1900 || year > 9999 || !Number.isSafeInteger(month) || month < 1 || month > 12) throw new Error('Dated month is outside the supported calendar.');
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function datedMonthDay(year: number, month: number, requestedDay: number): string {
  const actualDay = Math.min(day(requestedDay, 'Calendar day'), daysInDatedMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
}

export function addDatedMonths(value: string, months: number): string {
  const current = datedCivilDate(value);
  if (!Number.isSafeInteger(months) || months < 0) throw new Error('Dated month offset must be a non-negative whole number.');
  const total = current.year * 12 + current.month - 1 + months;
  if (!Number.isSafeInteger(total)) throw new Error('Dated month offset is outside range.');
  return datedMonthDay(Math.floor(total / 12), total % 12 + 1, current.day);
}

function cashEvent(value: unknown): DatedCashEvent {
  const raw = plainRecord(value, ['id', 'day', 'kind', 'amount', 'source'], 'Dated cash entry');
  if (typeof raw.id !== 'string' || !raw.id.trim() || ['__proto__', 'prototype', 'constructor'].includes(raw.id)) throw new Error('Dated cash entry requires a non-reserved id.');
  if (raw.kind !== 'income' && raw.kind !== 'expense') throw new Error('Dated cash entry kind is unsupported.');
  if (raw.kind === 'income' ? Object.prototype.hasOwnProperty.call(raw, 'source') : raw.source !== 'checking' && raw.source !== 'loc') throw new Error('Dated cash entry requires explicit supported routing.');
  datedMoneyCents(raw.amount, 'Dated cash entry amount');
  return { id: raw.id, day: day(raw.day, 'Dated cash entry'), kind: raw.kind, amount: raw.amount as number,
    ...(raw.kind === 'expense' ? { source: raw.source as 'checking' | 'loc' } : {}) };
}

export function decodeDatedPortfolioPlan(value: unknown): DatedPortfolioPlan {
  const raw = plainRecord(value, ['contract', 'startDate', 'openingCash', 'cashReserve', 'accountOpenedOn', 'drawEndsOn', 'maturesOn', 'annualFeeFirstDueOn', 'openingMinimumPayment', 'minimumDueDay', 'debtPaymentDay', 'cashEvents'], 'Dated plan');
  if (raw.contract !== 'fixed-loc-daily-v1') throw new Error('Dated plan protocol is unsupported.');
  const dateKeys = ['startDate', 'accountOpenedOn', 'drawEndsOn', 'maturesOn', 'annualFeeFirstDueOn'] as const;
  for (const key of dateKeys) datedCivilDate(raw[key]);
  if (datedCivilDate(raw.startDate).day !== 1) throw new Error('Dated plan starts on the first day after a month-end statement.');
  for (const key of ['openingCash', 'cashReserve', 'openingMinimumPayment'] as const) datedMoneyCents(raw[key], key);
  const cashEvents = dataArray(raw.cashEvents).map(cashEvent), ids = new Set<string>();
  for (const event of cashEvents) { if (ids.has(event.id)) throw new Error('Dated cash entry ids must be unique.'); ids.add(event.id); }
  return { contract: raw.contract, startDate: raw.startDate as string, openingCash: raw.openingCash as number,
    cashReserve: raw.cashReserve as number, accountOpenedOn: raw.accountOpenedOn as string, drawEndsOn: raw.drawEndsOn as string,
    maturesOn: raw.maturesOn as string, annualFeeFirstDueOn: raw.annualFeeFirstDueOn as string,
    openingMinimumPayment: raw.openingMinimumPayment as number, minimumDueDay: day(raw.minimumDueDay, 'LOC minimum due day'),
    debtPaymentDay: day(raw.debtPaymentDay, 'Other-debt due day'), cashEvents };
}
