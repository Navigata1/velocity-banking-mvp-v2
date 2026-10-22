import { buildLenderTermsContract, decodeLenderTerms, type MoneyLoopLOC } from './index';
import { addDatedMonths, datedCentsAmount, datedCivilDate, datedMoneyCents, datedMonthDay,
  datedRateRatio, decodeDatedPortfolioPlan, daysInDatedMonth, DATED_OUTPUT_CENTS_LIMIT,
  roundDatedRatio, type DatedPortfolioPlan } from './dated-plan';

export type DatedFailureReason = 'dated-calendar' | 'dated-cash-shortfall' | 'dated-minimum-draw'
  | 'dated-draw-expired' | 'dated-minimum-unfunded' | 'dated-maturity-unfunded'
  | 'dated-numeric-range' | 'loc-projection-overlimit';
export class DatedLedgerError extends Error {
  constructor(readonly code: DatedFailureReason, readonly date: string, message: string,
    readonly attemptedBalance?: number) { super(message); this.name = 'DatedLedgerError'; }
}
export type DatedLOCEventKind = 'income' | 'expense' | 'debt-payment' | 'chunk'
  | 'annual-fee' | 'draw-fee' | 'loc-payment' | 'loc-minimum' | 'loc-interest' | 'loc-maturity' | 'loc-statement';
export interface DatedLOCEvent {
  date: string; kind: DatedLOCEventKind; amount: number; cashBalance: number;
  locBalance: number; cashChange: number; locChange: number; minimumOutstanding: number; minimumDueOn: string; reference?: string;
}
export interface DatedLOCDay {
  date: string; cashBalance: number; locBalance: number;
  unpostedInterest: number; interestBalance: number; minimumOutstanding: number; minimumDueOn: string;
}
export interface DatedLOCPosition {
  cashCents: bigint; locCents: bigint; reserveCents: bigint; minimumCents: bigint;
  minimumDueOn: string;
  unpostedNumerator: bigint; totalFeesCents: bigint; totalInterestCents: bigint; closed: boolean;
}
const min = (a: bigint, b: bigint) => a < b ? a : b;

/** Ordered posted balances; fractional simple interest stays separate until its posting. */
export class DatedLOCAccount {
  readonly plan: DatedPortfolioPlan;
  private state: DatedLOCPosition;
  private readonly limit: bigint;
  private readonly annualFee: bigint;
  private readonly minimumDraw: bigint;
  private readonly fixedMinimum: bigint;
  private readonly rate: { numerator: bigint; denominator: bigint };
  private readonly feeRate: { numerator: bigint; denominator: bigint };
  private readonly interestDenominator: bigint;
  private expectedDate: string | null;
  private date: string;
  private dayOpen = false;
  private afterStatement = false;
  private readonly eventRows: DatedLOCEvent[] = [];
  private readonly dayRows: DatedLOCDay[] = [];
  private loggedCash: bigint;
  private loggedLOC: bigint;

  constructor(loc: MoneyLoopLOC, plan: DatedPortfolioPlan) {
    this.plan = decodeDatedPortfolioPlan(plan);
    const terms = decodeLenderTerms(loc.lenderTerms), contract = buildLenderTermsContract(terms);
    if (!contract.inputComplete || terms.rateMode !== 'fixed' || terms.minimumPayment?.mode !== 'fixed') {
      throw new Error('This dated protocol requires complete fixed-rate terms and a fixed inclusive minimum.');
    }
    if (this.plan.accountOpenedOn > this.plan.startDate || this.plan.startDate > this.plan.maturesOn
      || this.plan.annualFeeFirstDueOn < this.plan.accountOpenedOn
      || addDatedMonths(this.plan.accountOpenedOn, terms.drawPeriodMonths!) !== this.plan.drawEndsOn
      || addDatedMonths(this.plan.drawEndsOn, terms.repaymentPeriodMonths!) !== this.plan.maturesOn) {
      throw new Error('Dated account dates do not match the declared account age and term periods.');
    }
    this.limit = datedMoneyCents(loc.limit, 'LOC limit');
    const balance = datedMoneyCents(loc.balance, 'Opening LOC balance');
    this.annualFee = datedMoneyCents(terms.annualFee, 'Annual fee');
    this.minimumDraw = datedMoneyCents(terms.minimumDraw, 'Minimum draw');
    this.fixedMinimum = datedMoneyCents(terms.minimumPayment.value, 'Fixed minimum');
    this.rate = datedRateRatio(loc.apr); this.feeRate = datedRateRatio(terms.transactionFeePercent);
    this.interestDenominator = this.rate.denominator * 365n;
    const cash = datedMoneyCents(this.plan.openingCash), reserve = datedMoneyCents(this.plan.cashReserve);
    const owed = datedMoneyCents(this.plan.openingMinimumPayment);
    if (balance > this.limit || reserve > cash || owed > balance) throw new Error('Opening LOC, cash reserve or statement minimum needs review.');
    const start = datedCivilDate(this.plan.startDate);
    this.state = { cashCents: cash, locCents: balance, reserveCents: reserve, minimumCents: owed,
      minimumDueOn: datedMonthDay(start.year, start.month, this.plan.minimumDueDay),
      unpostedNumerator: 0n, totalFeesCents: 0n, totalInterestCents: 0n, closed: false };
    this.expectedDate = this.plan.startDate; this.date = this.plan.startDate;
    this.loggedCash = cash; this.loggedLOC = balance;
  }

  get position(): DatedLOCPosition { return { ...this.state }; }
  get availableCash(): bigint { return this.state.cashCents - this.state.reserveCents; }
  get accruedInterestCents(): bigint { return roundDatedRatio(this.state.unpostedNumerator, this.interestDenominator); }
  get events(): DatedLOCEvent[] { return this.eventRows.map(row => ({ ...row })); }
  get daily(): DatedLOCDay[] { return this.dayRows.map(row => ({ ...row })); }

  private fail(code: DatedFailureReason, message: string, attemptedBalance?: bigint): never {
    throw new DatedLedgerError(code, this.date, message,
      attemptedBalance === undefined || attemptedBalance > DATED_OUTPUT_CENTS_LIMIT ? undefined : datedCentsAmount(attemptedBalance));
  }
  private range(amount: bigint): void {
    if (typeof amount !== 'bigint' || amount < 0n || amount > DATED_OUTPUT_CENTS_LIMIT) this.fail('dated-numeric-range', 'Dated amount exceeds the exact supported range.');
  }
  private requireOpen(): void {
    if (!this.dayOpen) this.fail('dated-calendar', 'Open the next dated day before posting transactions.');
  }
  private requireCapacity(balance: bigint): void {
    this.range(balance);
    if (balance > this.limit) this.fail('loc-projection-overlimit', 'The dated LOC posting exceeds the entered credit limit.', balance);
  }
  private append(kind: DatedLOCEventKind, amount: bigint, reference?: string): void {
    const signed = (value: bigint) => value < 0n ? -datedCentsAmount(-value) : datedCentsAmount(value);
    this.eventRows.push({ date: this.date, kind, amount: datedCentsAmount(amount),
      cashBalance: datedCentsAmount(this.state.cashCents), locBalance: datedCentsAmount(this.state.locCents),
      cashChange: signed(this.state.cashCents - this.loggedCash), locChange: signed(this.state.locCents - this.loggedLOC),
      minimumOutstanding: datedCentsAmount(this.state.minimumCents), minimumDueOn: this.state.minimumDueOn,
      ...(reference === undefined ? {} : { reference }) });
    this.loggedCash = this.state.cashCents; this.loggedLOC = this.state.locCents;
  }
  private minimumIsDue(): boolean {
    return this.date === this.state.minimumDueOn;
  }
  startDay(date: string): void {
    datedCivilDate(date);
    if (this.dayOpen || date !== this.expectedDate) this.fail('dated-calendar', 'Dated days must be opened exactly once and in sequence.');
    this.date = date; this.dayOpen = true; this.afterStatement = false;
    const current = datedCivilDate(date), firstFee = datedCivilDate(this.plan.annualFeeFirstDueOn);
    if (!this.state.closed && date >= this.plan.annualFeeFirstDueOn
      && date === datedMonthDay(current.year, firstFee.month, firstFee.day)) {
      this.requireCapacity(this.state.locCents + this.annualFee);
      this.range(this.state.totalFeesCents + this.annualFee);
      this.state.locCents += this.annualFee; this.state.totalFeesCents += this.annualFee;
      this.append('annual-fee', this.annualFee);
    }
  }
  receiveIncome(amount: bigint, reference?: string): void {
    this.requireOpen(); this.range(amount); this.range(this.state.cashCents + amount);
    if (this.afterStatement) this.fail('dated-calendar', 'Cash entries must post before the statement cut-off.');
    this.state.cashCents += amount; this.append('income', amount, reference);
  }
  spend(amount: bigint, source: 'checking' | 'loc' | 'either',
    kind: 'expense' | 'debt-payment' | 'chunk' = 'expense', reference?: string): void {
    this.requireOpen(); this.range(amount);
    if (!['checking', 'loc', 'either'].includes(source) || !['expense', 'debt-payment', 'chunk'].includes(kind)) this.fail('dated-calendar', 'Dated transaction routing is unsupported.');
    const cash = source === 'loc' ? 0n : min(amount, this.availableCash), draw = amount - cash;
    if (source === 'checking' && cash !== amount) this.fail('dated-cash-shortfall', 'The chosen checking payment cannot be funded without spending the reserve.');
    let fee = 0n;
    if (draw > 0n) {
      if (this.afterStatement) this.fail('dated-calendar', 'This protocol does not make new credit advances after statement cut-off.');
      if (this.state.closed || this.date >= this.plan.drawEndsOn) this.fail('dated-draw-expired', 'This dated LOC advance is outside the declared draw period.');
      if (draw < this.minimumDraw) this.fail('dated-minimum-draw', 'This dated LOC advance is below the declared minimum draw.');
      fee = roundDatedRatio(draw * this.feeRate.numerator, this.feeRate.denominator);
      this.requireCapacity(this.state.locCents + draw + fee); this.range(this.state.totalFeesCents + fee);
    }
    // Check the entire combined funding before posting either leg.
    this.state.cashCents -= cash; this.state.locCents += draw; this.append(kind, amount, reference);
    if (fee > 0n) { this.state.locCents += fee; this.state.totalFeesCents += fee; this.append('draw-fee', fee, reference); }
  }
  repayLOC(amount: bigint, kind: 'loc-payment' | 'loc-minimum' = 'loc-payment'): bigint {
    this.requireOpen(); this.range(amount);
    const paid = min(amount, this.state.locCents);
    if (paid > this.availableCash) this.fail('dated-cash-shortfall', 'The LOC payment cannot use protected reserve cash.');
    if (paid === 0n) return 0n;
    this.state.cashCents -= paid; this.state.locCents -= paid;
    this.state.minimumCents -= min(paid, this.state.minimumCents); this.append(kind, paid); return paid;
  }
  sweepLOC(cap?: bigint): bigint {
    this.requireOpen(); if (cap !== undefined) this.range(cap);
    return this.repayLOC(min(this.availableCash, cap ?? this.availableCash));
  }
  settleDue(): void {
    this.requireOpen();
    if (!this.state.closed && this.date === this.plan.maturesOn) {
      const interest = roundDatedRatio(this.state.unpostedNumerator, this.interestDenominator);
      const required = this.state.locCents + interest;
      this.range(required); this.range(this.state.totalInterestCents + interest);
      if (required > this.availableCash) this.fail('dated-maturity-unfunded', 'Full maturity settlement cannot be funded above the checking reserve.');
      // Maturity is paid before today's accrual; no interest is charged on a zero closing balance.
      this.state.cashCents -= interest; this.state.totalInterestCents += interest; this.state.unpostedNumerator = 0n;
      if (interest > 0n) this.append('loc-interest', interest);
      const principal = this.state.locCents;
      this.state.cashCents -= principal; this.state.locCents = 0n; this.state.minimumCents = 0n; this.state.closed = true;
      this.append('loc-maturity', principal); return;
    }
    if (!this.state.closed && this.minimumIsDue()) {
      const required = min(this.state.minimumCents, this.state.locCents);
      if (required > this.availableCash) this.fail('dated-minimum-unfunded', 'The statement minimum is unfunded on its declared due date.');
      this.repayLOC(required, 'loc-minimum');
    }
  }
  finishDay(postStatementSweep: bigint | 'all' | null = null, afterStatementPayment?: () => void): void {
    this.requireOpen();
    if (this.afterStatement) this.fail('dated-calendar', 'A dated day cannot close twice.');
    if (postStatementSweep !== null && postStatementSweep !== 'all') this.range(postStatementSweep);
    if (!this.state.closed && this.date >= this.plan.maturesOn) this.fail('dated-maturity-unfunded', 'Maturity settlement must occur before the day can close.');
    if (!this.state.closed && this.minimumIsDue() && min(this.state.minimumCents, this.state.locCents) > 0n) {
      this.fail('dated-minimum-unfunded', 'The due statement minimum cannot be carried into a new statement.');
    }
    const interestBalance = this.state.locCents;
    const numerator = this.state.unpostedNumerator + interestBalance * this.rate.numerator;
    if (numerator > DATED_OUTPUT_CENTS_LIMIT * this.interestDenominator) this.fail('dated-numeric-range', 'Accrued interest exceeds the supported range.');
    this.state.unpostedNumerator = numerator;
    const current = datedCivilDate(this.date), lastDay = current.day === daysInDatedMonth(current.year, current.month);
    if (lastDay && !this.state.closed) {
      const interest = roundDatedRatio(numerator, this.interestDenominator);
      this.requireCapacity(this.state.locCents + interest); this.range(this.state.totalInterestCents + interest);
      this.state.locCents += interest; this.state.totalInterestCents += interest; this.state.unpostedNumerator = 0n;
      this.append('loc-interest', interest);
      this.state.minimumCents = min(this.fixedMinimum, this.state.locCents);
      const nextMonth = datedCivilDate(addDatedMonths(datedMonthDay(current.year, current.month, 1), 1));
      this.state.minimumDueOn = datedMonthDay(nextMonth.year, nextMonth.month, this.plan.minimumDueDay);
      this.afterStatement = true; this.append('loc-statement', this.state.minimumCents);
      if (postStatementSweep !== null) this.sweepLOC(postStatementSweep === 'all' ? undefined : postStatementSweep);
    }
    if (lastDay && afterStatementPayment) { this.afterStatement = true; afterStatementPayment(); }
    this.dayRows.push({ date: this.date, cashBalance: datedCentsAmount(this.state.cashCents),
      locBalance: datedCentsAmount(this.state.locCents), interestBalance: datedCentsAmount(interestBalance),
      minimumOutstanding: datedCentsAmount(this.state.minimumCents), minimumDueOn: this.state.minimumDueOn,
      unpostedInterest: Number(this.state.unpostedNumerator) / Number(this.interestDenominator) / 100 });
    const next = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
    this.expectedDate = next.getUTCFullYear() > 9999 ? null : `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
    this.dayOpen = false;
  }
}
