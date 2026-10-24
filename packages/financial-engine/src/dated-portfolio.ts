import { buildLenderTermsContract, decodeLenderTerms, type ForecastBasis } from './index';
import { decodePortfolioBook, type PortfolioBook } from './portfolio-book';
import type { DebtItem, MonthResult, PortfolioSimulationInputs, PortfolioSimulationResult } from './portfolio';
import { DatedLOCAccount, DatedLedgerError, type DatedFailureReason, type DatedLOCEvent, type DatedLOCDay } from './dated-loc';
import { addDatedMonths, datedCentsAmount, datedCivilDate, datedMoneyCents, datedOutputCents, datedMonthDay, datedRateRatio, daysInDatedMonth } from './dated-plan';
import { allocateDatedExtra, datedCheckingEarmark, datedDebtInterest, datedDebtMinimum,
  type DatedPortfolioPolicy } from './dated-portfolio-policy';

export interface DatedPortfolioLedger {
  contract: 'fixed-loc-daily-v1'; startDate: string; openingCash: number; cashReserve: number;
  drawEndsOn: string; maturesOn: string; events: DatedLOCEvent[];
  daily: Array<DatedLOCDay & { debtBalance: number }>;
  notices: Array<{ date: string; code: string; message: string; amount: number; reference?: string }>;
  failure?: { date: string; code: DatedFailureReason; message: string; attemptedBalance?: number };
}
const assumptions = [
  'Declared fixed-rate dated LOC estimate, not verification or approval of an actual lender agreement.',
  'LOC interest uses actual calendar days, a fixed365 denominator and once-rounded monthly statement interest. Each financed draw fee rounds half-up to cents.',
  'Other debt interest and minimums use educational monthly rules, not verified statement calendars. Living expenses exclude those separate debt payments.',
  'Checking reserves are protected. Known checking commitments before next income are earmarked separately. This is a chosen allocation policy, not a claim of optimality.',
  'Income and expenses repeat monthly in entered same-day order; days beyond month-end clamp to the last day. Later income cannot fund an earlier event.',
  'Statement bills precede after-cut-off repayments; such repayments credit the new bill once. The ledger separately records the daily interest balance.',
  'Payoff is observed at a fully accepted month end. The LOC is assumed closed then; no early-closure fee, new debt or investment return is modeled.',
];
const min = (a: bigint, b: bigint) => a < b ? a : b;
const nonNegative = (value: bigint) => value > 0n ? value : 0n;
const sum = (values: Iterable<bigint>) => Array.from(values).reduce((total, value) => total + value, 0n);
const dollarBalances = (balances: Map<string, bigint>) => new Map(Array.from(balances, ([id, value]) => [id, datedCentsAmount(value)]));

function review(inputs: PortfolioSimulationInputs, cause: unknown): PortfolioSimulationResult {
  let terms;
  try { terms = buildLenderTermsContract(decodeLenderTerms(inputs.loc?.lenderTerms)); }
  catch { terms = buildLenderTermsContract({}); }
  const forecastBasis: ForecastBasis = { kind: 'lender-review', label: terms.inputComplete ? 'Dated inputs need review' : 'Terms incomplete',
    canProject: false, reason: terms.inputComplete ? 'lender-terms-unmodeled' : 'lender-terms-incomplete', lenderTerms: terms,
    reasons: [cause instanceof Error ? cause.message : 'Dated inputs are unsupported.'] };
  return { forecastBasis, payoffMonths: 0, totalInterest: 0, totalFees: 0, isPayoffPossible: false,
    failureReason: forecastBasis.reason, payoffOrder: [], monthResults: [], debtRationales: {},
    locInterestPaid: 0, moneyLoopMonthlyData: [], assumptions: [...forecastBasis.reasons], warnings: [...forecastBasis.reasons], cashAtPayoff: 0 };
}

export function simulateDatedPortfolio(inputs: PortfolioSimulationInputs, policy: DatedPortfolioPolicy): PortfolioSimulationResult {
  let book: PortfolioBook, account: DatedLOCAccount, maxMonths: number;
  try {
    const property = Object.getOwnPropertyDescriptor(inputs, 'datedPlan');
    if (!property?.enumerable || !('value' in property)) throw new Error('Dated context requires an own data field.');
    if (inputs.aprUnit !== 'decimal') throw new Error('Dated projections require explicit decimal APR units.');
    book = decodePortfolioBook({ monthlyIncome: inputs.monthlyIncome, monthlyExpenses: inputs.monthlyExpenses,
      extraMonthlyPayment: inputs.extraMonthlyPayment, chunkAmount: inputs.chunkAmount ?? 0, loc: inputs.loc,
      strategy: inputs.settings.strategy, focusMode: inputs.settings.focusMode, splitRatioPrimary: inputs.settings.splitRatioPrimary,
      debts: inputs.debts, datedPlan: property.value });
    account = new DatedLOCAccount(book.loc, book.datedPlan!);
    const income = datedMoneyCents(book.monthlyIncome), expenses = datedMoneyCents(book.monthlyExpenses);
    datedMoneyCents(book.extraMonthlyPayment); datedMoneyCents(book.chunkAmount); datedRateRatio(book.splitRatioPrimary);
    if (sum(book.datedPlan!.cashEvents.filter(event => event.kind === 'income').map(event => datedMoneyCents(event.amount))) !== income
      || sum(book.datedPlan!.cashEvents.filter(event => event.kind === 'expense').map(event => datedMoneyCents(event.amount))) !== expenses) {
      throw new Error('Dated cash entry totals must exactly match the saved monthly income and living expenses.');
    }
    for (const debt of book.debts) {
      datedMoneyCents(debt.balance); datedRateRatio(debt.apr);
      if (debt.promo) { datedRateRatio(debt.promo.introApr); datedRateRatio(debt.promo.postIntroApr); }
      datedDebtMinimum(debt, datedMoneyCents(debt.balance));
    }
    datedCentsAmount(sum(book.debts.map(debt => datedMoneyCents(debt.balance))) + account.position.locCents + account.position.cashCents);
    maxMonths = inputs.maxMonths ?? 600;
    if (!Number.isSafeInteger(maxMonths) || maxMonths < 1 || maxMonths > 600) throw new Error('Dated forecast horizon must be a whole month from1 to600.');
  } catch (cause) { return review(inputs, cause); }
  const plan = book.datedPlan!, debts: DebtItem[] = book.debts.map(debt => ({ ...debt, ...(debt.promo ? { promo: { ...debt.promo } } : {}) }));
  const balances = new Map(debts.map(debt => [debt.id, datedMoneyCents(debt.balance)]));
  const settings = { strategy: book.strategy, focusMode: book.focusMode, splitRatioPrimary: book.splitRatioPrimary };
  const contract = buildLenderTermsContract(book.loc.lenderTerms!);
  const forecastBasis: ForecastBasis = { kind: 'lender-dated', label: 'Declared dated estimate', canProject: true,
    lenderTerms: { ...contract, projectionReady: true, unmodeledFields: [], assumptions: [...assumptions] }, reasons: [...assumptions] };
  const rationales = policy.rationales(debts, dollarBalances(balances), settings, book.loc.balance, book.loc.apr);
  const result: PortfolioSimulationResult = { forecastBasis, payoffMonths: 0, totalInterest: 0, totalFees: 0,
    isPayoffPossible: false, payoffOrder: [], monthResults: [], debtRationales: rationales,
    locInterestPaid: 0, moneyLoopMonthlyData: [], assumptions: [...assumptions], warnings: [], cashAtPayoff: 0,
    primaryTargetName: policy.targets(debts, dollarBalances(balances), settings, book.loc.balance, book.loc.apr).find(target => target.debt)?.debt?.name };
  const notices: DatedPortfolioLedger['notices'] = [], dailyDebt = new Map<string, bigint>();
  const paidOff = new Set<string>(), paymentDates = new Map<string, string>();
  let acceptedInterest = 0n, acceptedLOCInterest = 0n, acceptedFees = 0n, date = plan.startDate;
  let failure: DatedPortfolioLedger['failure'];
  if (sum(balances.values()) === 0n && account.position.locCents === 0n) {
    result.isPayoffPossible = true; result.payoffDate = plan.startDate; result.cashAtPayoff = plan.openingCash;
  } else for (let month = 1; month <= maxMonths; month++) {
    const before = account.position;
    const payments = new Map(debts.map(debt => [debt.id, 0n])), interestCharges = new Map<string, bigint>();
    const beforeEvents = account.events.length;
    let usedExtra = 0n;
    const extraCap = datedMoneyCents(book.extraMonthlyPayment), chunk = datedMoneyCents(book.chunkAmount);
    const ranked = () => policy.targets(debts, dollarBalances(balances), settings, datedCentsAmount(account.position.locCents), book.loc.apr);
    const earmark = (order: number, omit?: string, payingLOC = false) => datedCheckingEarmark(book, debts, balances, account.position, date, order, policy, omit, payingLOC);
    const sweep = (order: number) => account.sweepLOC(nonNegative(account.availableCash - earmark(order, undefined, true)));
    const payDebt = (debt: DebtItem, amount: bigint, kind: 'debt-payment' | 'chunk' = 'debt-payment') => {
      if (amount === 0n) return;
      account.spend(amount, kind === 'chunk' ? 'loc' : debt.paymentSource, kind, debt.id);
      balances.set(debt.id, balances.get(debt.id)! - amount); payments.set(debt.id, payments.get(debt.id)! + amount);
      if (balances.get(debt.id) === 0n) paymentDates.set(debt.id, date);
    };
    const extras = (order: number) => {
      const autoVelocity = book.strategy === 'velocity' && extraCap === 0n;
      if (autoVelocity && account.position.locCents > 0n) return;
      const holdInterest = account.position.locCents === 0n ? account.accruedInterestCents : 0n;
      const candidates = ranked().filter(target => book.strategy !== 'velocity' || !!target.debt)
        .filter(target => !target.debt || !(order >= 900 || autoVelocity) || target.debt.paymentSource !== 'loc');
      const budget = min(nonNegative(account.availableCash - earmark(order) - holdInterest),
        extraCap === 0n ? account.availableCash : nonNegative(extraCap - usedExtra));
      const capacities = candidates.map(target => target.debt ? balances.get(target.debt.id)! : account.position.locCents);
      const allocations = allocateDatedExtra(capacities, budget, settings);
      candidates.forEach((target, index) => {
        const amount = allocations[index]; if (amount === 0n) return;
        if (target.debt) payDebt(target.debt, amount); else account.repayLOC(amount);
        usedExtra += amount;
      });
      if (book.strategy !== 'velocity' && ranked()[0]?.debt === undefined) {
        const budget = min(nonNegative(account.availableCash - earmark(order, undefined, true)),
          extraCap === 0n ? account.availableCash : nonNegative(extraCap - usedExtra));
        usedExtra += account.repayLOC(budget);
      }
      // Clearing a checking-funded target also releases its earmarked future minimum.
      for (const target of candidates) if (target.debt && target.debt.paymentSource !== 'loc') {
        const amount = balances.get(target.debt.id)!;
        const releasedBudget = min(nonNegative(account.availableCash - earmark(order, target.debt.id) - holdInterest),
          extraCap === 0n ? account.availableCash : nonNegative(extraCap - usedExtra));
        if (amount > 0n && amount <= releasedBudget) { payDebt(target.debt, amount); usedExtra += amount; }
      }
    };
    try {
      const first = datedCivilDate(addDatedMonths(plan.startDate, month - 1)), days = daysInDatedMonth(first.year, first.month);
      for (const debt of debts) {
        const interest = datedDebtInterest(debt, balances.get(debt.id)!, policy);
        interestCharges.set(debt.id, interest); balances.set(debt.id, balances.get(debt.id)! + interest);
        datedCentsAmount(balances.get(debt.id)!);
      }
      for (let day = 1; day <= days; day++) {
        date = datedMonthDay(first.year, first.month, day); account.startDay(date);
        for (const [index, event] of plan.cashEvents.entries()) if (datedMonthDay(first.year, first.month, event.day) === date) {
          if (event.kind === 'income') { account.receiveIncome(datedMoneyCents(event.amount), event.id); if (book.strategy === 'velocity') sweep(index); }
          else account.spend(datedMoneyCents(event.amount), event.source!, 'expense', event.id);
        }
        account.settleDue();
        if (date === datedMonthDay(first.year, first.month, plan.debtPaymentDay)) {
          for (const debt of debts) payDebt(debt, datedDebtMinimum(debt, balances.get(debt.id)!));
        }
        if (day === 1 && book.strategy === 'velocity' && chunk > 0n && account.position.locCents === 0n) {
          const target = ranked().find(target => target.debt)?.debt;
          if (target) {
            const amount = min(chunk, balances.get(target.id)!);
            if (target.paymentSource === 'checking') notices.push({ date, code: 'checking-only-target', message: 'The chosen target does not permit a LOC-funded chunk; cash-funded payments remain separate.', amount: datedCentsAmount(amount), reference: target.id });
            else try { payDebt(target, amount, 'chunk'); } catch (cause) {
              if (!(cause instanceof DatedLedgerError) || !['dated-draw-expired', 'dated-minimum-draw', 'loc-projection-overlimit'].includes(cause.code)) throw cause;
              notices.push({ date, code: cause.code, message: cause.message, amount: datedCentsAmount(amount), reference: target.id });
            }
          }
        }
        if (day === days) extras(600);
        if (book.strategy === 'velocity') sweep(600);
        account.finishDay(null, day === days ? () => {
          if (book.strategy === 'velocity') sweep(900);
          extras(900);
          if (book.strategy === 'velocity') sweep(900);
        } : undefined);
        dailyDebt.set(date, sum(balances.values()));
      }
      const after = account.position, locInterest = after.totalInterestCents - before.totalInterestCents;
      const fees = after.totalFeesCents - before.totalFeesCents, debtInterest = sum(interestCharges.values());
      const events = account.events.slice(beforeEvents);
      const row: MonthResult = { month, date, balances: Object.fromEntries(Array.from(balances, ([id, value]) => [id, datedCentsAmount(value)])),
        interestCharges: Object.fromEntries(Array.from(interestCharges, ([id, value]) => [id, datedCentsAmount(value)])),
        payments: Object.fromEntries(Array.from(payments, ([id, value]) => [id, datedCentsAmount(value)])),
        targetIds: ranked().slice(0, settings.focusMode === 'split' ? 2 : 1).flatMap(target => target.debt ? [target.debt.id] : []),
        locBalance: datedCentsAmount(after.locCents), cashBalance: datedCentsAmount(after.cashCents),
        locInterest: datedCentsAmount(locInterest), locFees: datedCentsAmount(fees),
        locDraw: datedCentsAmount(sum(events.filter(event => ['expense', 'debt-payment', 'chunk'].includes(event.kind)).map(event => datedOutputCents(Math.max(0, event.locChange))))),
        locPayment: datedCentsAmount(sum(events.filter(event => ['loc-payment', 'loc-minimum', 'loc-maturity'].includes(event.kind)).map(event => datedOutputCents(event.amount)))),
        locIsTarget: ranked()[0]?.debt === undefined && after.locCents > 0n };
      datedCentsAmount(acceptedInterest + locInterest + debtInterest); datedCentsAmount(acceptedFees + fees);
      result.monthResults.push(row); acceptedInterest += locInterest + debtInterest; acceptedLOCInterest += locInterest; acceptedFees += fees;
      for (const debt of debts) if (datedMoneyCents(debt.balance) > 0n && balances.get(debt.id) === 0n && !paidOff.has(debt.id)) {
        paidOff.add(debt.id); result.payoffOrder.push({ id: debt.id, name: debt.name, monthPaidOff: month, paidOffOn: paymentDates.get(debt.id) ?? date });
      }
      if (sum(balances.values()) === 0n && after.locCents === 0n && after.unpostedNumerator === 0n) {
        result.isPayoffPossible = true; result.payoffMonths = month; result.payoffDate = date; result.cashAtPayoff = datedCentsAmount(after.cashCents); break;
      }
      for (const debt of debts) if (debt.promo && debt.promo.monthsRemaining > 0) debt.promo.monthsRemaining--;
    } catch (cause) {
      const error = cause instanceof DatedLedgerError ? cause : new DatedLedgerError('dated-numeric-range', date, cause instanceof Error ? cause.message : 'Dated amount is unsupported.');
      failure = { date: error.date, code: error.code, message: error.message, ...(error.attemptedBalance === undefined ? {} : { attemptedBalance: error.attemptedBalance }) };
      result.failureReason = error.code; result.warnings.push(`${error.date}: ${error.message}`); break;
    }
  }
  result.totalInterest = datedCentsAmount(acceptedInterest); result.locInterestPaid = datedCentsAmount(acceptedLOCInterest); result.totalFees = datedCentsAmount(acceptedFees);
  if (!result.isPayoffPossible && !result.failureReason) result.failureReason = 'payoff-horizon-exceeded';
  result.datedLedger = { contract: plan.contract, startDate: plan.startDate, openingCash: plan.openingCash, cashReserve: plan.cashReserve,
    drawEndsOn: plan.drawEndsOn, maturesOn: plan.maturesOn, events: account.events, notices,
    daily: account.daily.map(row => ({ ...row, debtBalance: datedCentsAmount(dailyDebt.get(row.date) ?? 0n) })), ...(failure ? { failure } : {}) };
  return result;
}
