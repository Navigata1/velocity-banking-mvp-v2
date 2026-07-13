import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import {
  buildLenderTermsContract,
  calculateLOCInterestAccrual,
  formatCurrency,
  LENDER_TERMS_CONTRACT_VERSION,
  simulateAmortizedPayoff,
  simulateMoneyLoopMonth,
} from '../../../packages/financial-engine/src/index.ts';

const mediaRoot = new URL('../', import.meta.url);
const outputUrl = new URL('remotion/data/scenarios.v1.json', mediaRoot);
const engineUrl = new URL('../../../packages/financial-engine/src/index.ts', import.meta.url);
const checkOnly = process.argv.includes('--check');
const roundMoney = (value: number) => Math.round(value * 100) / 100;

const baselineInputs = {
  principalBalance: 18_500,
  apr: 7.9,
  baselineMonthlyPayment: 450,
  modeledMonthlyPayment: 750,
  maxMonths: 360,
};
const baselineResult = simulateAmortizedPayoff({
  principalBalance: baselineInputs.principalBalance,
  apr: baselineInputs.apr,
  monthlyPayment: baselineInputs.baselineMonthlyPayment,
  maxMonths: baselineInputs.maxMonths,
});
const modeledPlanResult = simulateAmortizedPayoff({
  principalBalance: baselineInputs.principalBalance,
  apr: baselineInputs.apr,
  monthlyPayment: baselineInputs.modeledMonthlyPayment,
  maxMonths: baselineInputs.maxMonths,
});

const monthInputs = {
  month: 1,
  debtBalance: 18_500,
  debtApr: 7.9,
  debtPayment: 450,
  loc: { limit: 10_000, apr: 10.5, balance: 2_000 },
  locBalance: 2_000,
  chunkAmount: 4_000,
  cashFlowPaydown: 750,
  locDepositAmount: 6_400,
  locExpenseAmount: 5_650,
  monthlyIncome: 6_400,
  monthlyExpenses: 5_650,
  locAccrualCalendar: {
    year: 2026,
    month: 7,
    transactions: [
      { day: 1, type: 'deposit' as const, amount: 3_200 },
      { day: 3, type: 'expense' as const, amount: 1_000 },
      { day: 15, type: 'deposit' as const, amount: 3_200 },
      { day: 20, type: 'expense' as const, amount: 4_650 },
    ],
  },
  monthsSinceChunk: 999,
};
const { monthlyIncome, monthlyExpenses, ...engineMonthInputs } = monthInputs;
const monthResult = simulateMoneyLoopMonth(engineMonthInputs);
const locAccrual = calculateLOCInterestAccrual({
  startBalance: monthInputs.locBalance + monthInputs.chunkAmount,
  apr: monthInputs.loc.apr,
  calendar: monthInputs.locAccrualCalendar,
});
const dailyEvents = [...monthInputs.locAccrualCalendar.transactions]
  .sort((left, right) => left.day - right.day)
  .map((transaction) => ({
    ...transaction,
    closingBalance: roundMoney(locAccrual.dailyClosingBalances[transaction.day - 1]),
  }));

const blockedInputs = {
  monthlyIncome: 5_200,
  monthlyExpenses: 5_450,
  lenderTerms: { rateMode: 'variable' as const },
};
const blockedTerms = buildLenderTermsContract(blockedInputs.lenderTerms);
const engineSource = (await readFile(engineUrl, 'utf8')).replace(/\r\n/g, '\n');
const engineSourceDigest = createHash('sha256').update(engineSource).digest('hex');
const modeledPath = (monthlyPayment: number, result: typeof baselineResult) => ({
  monthlyPayment,
  payoffMonths: result.payoffMonths,
  totalInterest: roundMoney(result.totalInterest),
  isPayoffPossible: true as const,
  failureReason: result.failureReason ?? null,
});

if (!baselineResult.isPayoffPossible || !modeledPlanResult.isPayoffPossible || !monthResult.didChunk) {
  throw new Error('Remotion fixtures must remain valid modeled paths.');
}

const bundle = {
  version: 1,
  engineContractVersion: `source-sha256:${engineSourceDigest.slice(0, 12)}`,
  lenderTermsContractVersion: LENDER_TERMS_CONTRACT_VERSION,
  engineSourceDigest,
  generatedBy: [
    'simulateAmortizedPayoff',
    'simulateMoneyLoopMonth',
    'calculateLOCInterestAccrual',
    'buildLenderTermsContract',
  ],
  scenarios: [
    {
      id: 'baseline-comparison',
      status: 'modeled',
      visual: 'baseline-comparison',
      kicker: 'Baseline / compatible paths',
      title: 'Compare two valid paths.',
      summary: 'Same balance and APR. Only the modeled monthly payment changes.',
      inputs: baselineInputs,
      output: {
        compatible: true,
        baseline: modeledPath(baselineInputs.baselineMonthlyPayment, baselineResult),
        modeledPlan: modeledPath(baselineInputs.modeledMonthlyPayment, modeledPlanResult),
      },
      cards: [
        { label: 'Fixed-payment path', value: `${baselineResult.payoffMonths} months`, detail: `${formatCurrency(baselineResult.totalInterest)} modeled interest`, tone: 'information' },
        { label: 'Higher-payment path', value: `${modeledPlanResult.payoffMonths} months`, detail: `${formatCurrency(modeledPlanResult.totalInterest)} modeled interest`, tone: 'progress' },
      ],
      assumption: 'Assumption: fixed 7.9% APR, no new charges or fees; payment changes from $450 to $750.',
      closing: 'Comparison only, not a recommendation.',
    },
    {
      id: 'money-loop-month',
      status: 'modeled',
      visual: 'money-loop',
      kicker: 'Money Loop / month 01',
      title: 'Follow month one in order.',
      summary: 'A principal chunk, four dated LOC moves, and both interest charges stay visible.',
      inputs: monthInputs,
      output: {
        cashFlow: monthlyIncome - monthlyExpenses,
        debtBalance: roundMoney(monthResult.debtBalance),
        locBalance: roundMoney(monthResult.locBalance),
        debtInterest: roundMoney(monthResult.debtInterest),
        locInterest: roundMoney(monthResult.locInterest),
        locInterestMethod: monthResult.locInterestMethod,
        didChunk: monthResult.didChunk,
        dailyEvents,
        storySteps: [
          { id: 'debt-interest', label: 'Debt interest', value: formatCurrency(monthResult.debtInterest), detail: 'Posts before principal movement.', tone: 'caution' },
          { id: 'principal-chunk', label: 'Principal chunk', value: formatCurrency(monthInputs.chunkAmount), detail: 'Drawn from LOC to target debt.', tone: 'progress' },
          { id: 'debt-payment', label: 'Debt payment', value: formatCurrency(monthInputs.debtPayment), detail: 'Applies after the chunk.', tone: 'information' },
          { id: 'early-calendar', label: 'July 1 then July 3', value: `${formatCurrency(dailyEvents[0].closingBalance)} to ${formatCurrency(dailyEvents[1].closingBalance)}`, detail: 'Deposit, then expense.', tone: 'information' },
          { id: 'late-calendar', label: 'July 15 then July 20', value: `${formatCurrency(dailyEvents[2].closingBalance)} to ${formatCurrency(dailyEvents[3].closingBalance)}`, detail: 'Deposit, then expense.', tone: 'information' },
          { id: 'loc-interest', label: 'LOC interest', value: formatCurrency(monthResult.locInterest), detail: 'Posts after dated closing balances.', tone: 'caution' },
        ],
      },
      cards: [
        { label: 'Debt after month 1', value: formatCurrency(monthResult.debtBalance), detail: 'After interest, chunk, and payment', tone: 'progress' },
        { label: 'LOC after month 1', value: formatCurrency(monthResult.locBalance), detail: 'After routed cash flow and interest', tone: 'information' },
      ],
      assumption: 'Modeled from July 2026 dated transactions; LOC interest uses each day\'s closing balance.',
      closing: 'Timing changes the balance path. Expenses still count.',
    },
    {
      id: 'blocked-plan',
      status: 'blocked',
      visual: 'blocked',
      kicker: 'Guardrail / terms incomplete',
      title: 'Projection blocked on purpose.',
      summary: 'Missing lender terms and negative cash flow stop the app from inventing a payoff date.',
      inputs: blockedInputs,
      output: {
        projectionReady: blockedTerms.projectionReady,
        payoffMonths: null,
        cashFlow: blockedInputs.monthlyIncome - blockedInputs.monthlyExpenses,
        confidence: blockedTerms.confidence,
        failureReason: 'missing-lender-terms-and-negative-cash-flow',
        missingFields: blockedTerms.missingFields,
        assumptions: blockedTerms.assumptions,
      },
      cards: [
        { label: 'Payoff date', value: 'Not projected', detail: 'Known terms required', tone: 'blocked' },
        { label: 'Monthly cash flow', value: formatCurrency(blockedInputs.monthlyIncome - blockedInputs.monthlyExpenses), detail: 'Income minus expenses', tone: 'blocked' },
      ],
      assumption: 'Enter verified fees, rate mode, draw rules, repayment period, minimum draw, and minimum payment.',
      closing: 'Fix the inputs first. Keep the decision yours.',
    },
  ],
};

const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
if (checkOnly) {
  const existing = await readFile(outputUrl, 'utf8').catch(() => '');
  if (existing !== serialized) {
    console.error('Remotion scenario JSON is stale. Run npm run generate:scenarios.');
    process.exit(1);
  }
  console.log('Remotion scenario JSON matches the shared engine.');
} else {
  await mkdir(new URL('remotion/data/', mediaRoot), { recursive: true });
  await writeFile(outputUrl, serialized);
  console.log('Generated remotion/data/scenarios.v1.json from the shared engine.');
}
