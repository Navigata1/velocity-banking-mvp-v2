/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const moduleCache = new Map();

function createMemoryStorage() {
  const items = new Map();
  return {
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

const testStorage = createMemoryStorage();
globalThis.localStorage = globalThis.localStorage ?? testStorage;
globalThis.window = globalThis.window ?? { localStorage: globalThis.localStorage };

function loadTsModule(relativePath) {
  return loadTsFile(path.resolve(__dirname, '..', relativePath));
}

function loadTsFile(filename) {
  if (moduleCache.has(filename)) {
    return moduleCache.get(filename).exports;
  }

  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const testModule = { exports: {} };
  moduleCache.set(filename, testModule);

  const localRequire = (request) => {
    if (request === '@interestshield/financial-engine') {
      return loadTsFile(path.resolve(__dirname, '..', '..', '..', 'packages/financial-engine/src/index.ts'));
    }

    if (request.startsWith('.')) {
      const resolvedBase = path.resolve(path.dirname(filename), request);
      const candidates = [
        resolvedBase,
        `${resolvedBase}.ts`,
        `${resolvedBase}.tsx`,
        `${resolvedBase}.js`,
        path.join(resolvedBase, 'index.ts'),
      ];
      const resolved = candidates.find((candidate) => fs.existsSync(candidate));
      if (resolved?.endsWith('.ts') || resolved?.endsWith('.tsx')) {
        return loadTsFile(resolved);
      }
      if (resolved) {
        return require(resolved);
      }
    }

    if (request.startsWith('@/')) {
      const resolvedBase = path.resolve(__dirname, '..', 'src', request.slice(2));
      const candidates = [
        resolvedBase,
        `${resolvedBase}.ts`,
        `${resolvedBase}.tsx`,
        `${resolvedBase}.js`,
        path.join(resolvedBase, 'index.ts'),
      ];
      const resolved = candidates.find((candidate) => fs.existsSync(candidate));
      if (resolved?.endsWith('.ts') || resolved?.endsWith('.tsx')) {
        return loadTsFile(resolved);
      }
      if (resolved) {
        return require(resolved);
      }
    }

    return require(request);
  };

  const contextStorage = createMemoryStorage();
  const context = {
    console,
    Date,
    Intl,
    localStorage: contextStorage,
    Math,
    module: testModule,
    exports: testModule.exports,
    require: localRequire,
    window: { localStorage: contextStorage },
  };
  vm.runInNewContext(output, context, { filename });
  return testModule.exports;
}

const calculations = loadTsModule('src/engine/calculations.ts');
const sharedFinancialEngine = loadTsFile(path.resolve(__dirname, '..', '..', '..', 'packages/financial-engine/src/index.ts'));
const moneyLoop = loadTsModule('src/engine/money-loop.ts');
const portfolio = loadTsModule('src/engine/portfolio.ts');
const portfolioPathVisual = loadTsModule('src/engine/portfolio-path-visual.ts');
const portfolioRunDiff = loadTsModule('src/engine/portfolio-run-diff.ts');
const portfolioStore = loadTsModule('src/stores/portfolio-store.ts');
const financialStore = loadTsModule('src/stores/financial-store.ts');
const appStore = loadTsModule('src/stores/app-store.ts');
const themeStore = loadTsModule('src/stores/theme-store.ts');
const preferencesStore = loadTsModule('src/stores/preferences-store.ts');
const learnProgress = loadTsModule('src/app/learn/progress-store.ts');
const settingsBackend = loadTsModule('src/app/settings/backend-readiness.ts');
const settingsMigration = loadTsModule('src/app/settings/backend-migration-contract.ts');
const settingsReset = loadTsModule('src/app/settings/local-data-reset.ts');
const settingsSnapshot = loadTsModule('src/app/settings/local-demo-snapshot.ts');
const guardian = loadTsModule('src/data/shield-guardian-qa.ts');
const dashboardModel = loadTsModule('src/app/dashboard-model.ts');
const simulatorModel = loadTsModule('src/app/simulator-model.ts');
const velocityTargeting = loadTsModule('src/engine/velocity-targeting.ts');
const preAppPreviewModel = loadTsModule('src/components/pre-app-preview-model.ts');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function roundCents(value) {
  return Math.round(value * 100) / 100;
}

function defaultCarDebt() {
  return {
    id: 'car',
    name: 'Auto Loan',
    type: 'car',
    balance: 18450,
    apr: 0.069,
    monthlyPayment: 425,
    termMonths: 48,
  };
}

test('amortization payment matches a known 30-year fixed-rate fixture', () => {
  const payment = calculations.calculateAmortizationPayment(100000, 0.06, 360);

  assert.equal(roundCents(payment), 599.55);
  assert.equal(roundCents(calculations.calculateTotalAmortizationInterest(100000, 0.06, 360)), 115838.19);
  assert.equal(
    roundCents(calculations.calculateTotalAmortizationInterest(100000, 0.06, 360)),
    roundCents(sharedFinancialEngine.calculateTotalAmortizationInterest(100000, 0.06, 360))
  );
});

test('biweekly payoff helper uses the shared amortized payoff engine', () => {
  const calculationsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/calculations.ts'), 'utf8');
  const biweeklyStart = calculationsSource.indexOf('export function simulateBiweeklyPayments');
  const biweeklyBody = calculationsSource.slice(
    biweeklyStart,
    calculationsSource.indexOf('export interface StrategyComparison', biweeklyStart)
  );
  const monthlyPayment = calculations.calculateAmortizationPayment(100000, 0.06, 360);
  const webProjection = calculations.simulateBiweeklyPayments(100000, 0.06, monthlyPayment, 360);
  const sharedProjection = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: 100000,
    apr: 0.06,
    monthlyPayment,
    extraPayment: monthlyPayment / 12,
    maxMonths: 360,
  });

  assert.ok(
    biweeklyBody.includes('simulateAmortizedPayoff({'),
    'expected biweekly payoff math to delegate to the shared payoff helper'
  );
  assert.ok(!biweeklyBody.includes('while ('), 'expected biweekly payoff math not to keep a separate payoff loop');
  assert.equal(webProjection.totalMonths, sharedProjection.payoffMonths);
  assert.equal(roundCents(webProjection.totalInterest), roundCents(sharedProjection.totalInterest));
  assert.equal(webProjection.monthsSavedVsMonthly, 65);
  assert.equal(roundCents(webProjection.interestSavedVsMonthly), 24555.12);
});

test('single-debt strategy comparison standard path honors the actual monthly payment', () => {
  const strategies = calculations.comparePaymentStrategies(
    100000,
    0.06,
    700,
    360,
    undefined,
    5000,
    3000,
    0
  );
  const sharedProjection = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: 100000,
    apr: 0.06,
    monthlyPayment: 700,
    maxMonths: 1440,
  });

  assert.equal(strategies.monthly.months, sharedProjection.payoffMonths);
  assert.equal(roundCents(strategies.monthly.totalInterest), roundCents(sharedProjection.totalInterest));
  assert.ok(strategies.monthly.months < 360, 'expected a higher actual payment to shorten the standard payoff');
});

test('biweekly savings compare against the actual monthly payment baseline', () => {
  const webProjection = calculations.simulateBiweeklyPayments(100000, 0.06, 700, 360);
  const monthlyProjection = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: 100000,
    apr: 0.06,
    monthlyPayment: 700,
    maxMonths: 1440,
  });
  const biweeklyProjection = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: 100000,
    apr: 0.06,
    monthlyPayment: 700,
    extraPayment: 700 / 12,
    maxMonths: 1440,
  });

  assert.equal(webProjection.totalMonths, biweeklyProjection.payoffMonths);
  assert.equal(roundCents(webProjection.totalInterest), roundCents(biweeklyProjection.totalInterest));
  assert.equal(webProjection.monthsSavedVsMonthly, monthlyProjection.payoffMonths - biweeklyProjection.payoffMonths);
  assert.equal(
    roundCents(webProjection.interestSavedVsMonthly),
    roundCents(monthlyProjection.totalInterest - biweeklyProjection.totalInterest)
  );
  assert.ok(webProjection.monthsSavedVsMonthly > 0, 'expected actual-payment biweekly savings to be positive');
});

test('LOC ADB interest uses daily closing balances across web and shared engines', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const expectedInterest = ((1116.6666666667 + 4500) / 2) * (0.12 / 365) * 30;
  const webInterest = calculations.calculateADBInterest(5000, 0.12, 4000, 3500, 30);
  const sharedInterest = sharedFinancialEngine.calculateADBInterest(5000, 0.12, 4000, 3500, 30);
  const month = moneyLoop.simulateMoneyLoopMonth({
    month: 1,
    debtBalance: 0,
    debtApr: 0,
    debtPayment: 0,
    loc: {
      limit: 10000,
      apr: 0.12,
      balance: 5000,
    },
    locBalance: 5000,
    chunkAmount: 0,
    cashFlowPaydown: 0,
    locDepositAmount: 4000,
    locExpenseAmount: 3500,
    monthsSinceChunk: 999,
  });
  const locInterestEvent = month.events.find((event) => event.type === 'loc-interest');

  assert.equal(roundCents(expectedInterest), 27.7);
  assert.equal(roundCents(webInterest), 27.7);
  assert.equal(roundCents(sharedInterest), 27.7);
  assert.ok(locInterestEvent, 'expected Money Loop month to expose LOC interest event');
  assert.equal(roundCents(locInterestEvent.amount), 27.7);
});

test('daily interest burn uses the shared financial-engine helper', () => {
  const dashboardModelSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/dashboard-model.ts'), 'utf8');
  const financialStoreSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/stores/financial-store.ts'), 'utf8');
  const portfolioSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/portfolio.ts'), 'utf8');
  const velocityTargetingSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/velocity-targeting.ts'), 'utf8');

  assert.equal(roundCents(sharedFinancialEngine.calculateDailyInterest(18450, 0.069)), 3.49);
  assert.equal(roundCents(sharedFinancialEngine.calculateDailyInterest(18450, 6.9)), 3.49);
  assert.equal(roundCents(calculations.calculateDailyInterest(18450, 0.069)), 3.49);
  assert.equal(roundCents(calculations.calculateDailyInterest(-18450, 0.069)), 0);
  assert.equal(roundCents(calculations.calculateDailyInterest(18450, -0.069)), 0);
  assert.equal(velocityTargeting.estimateDailyInterest(18450, 6.9), calculations.calculateDailyInterest(18450, 6.9));
  assert.ok(
    dashboardModelSource.includes('calculateDailyInterest(debt.balance, debt.interestRate)') &&
      dashboardModelSource.includes('calculateDailyInterest(input.loc.balance, input.loc.interestRate)'),
    'expected dashboard daily burn to use the shared helper for debt and LOC balances'
  );
  assert.ok(
    financialStoreSource.includes('calculateDailyInterest(debt.balance, debt.interestRate)'),
    'expected cockpit/store daily interest to use the shared helper'
  );
  assert.ok(
    portfolioSource.includes('calculateDailyInterest(balance, debt.apr)') &&
      portfolioSource.includes('calculateDailyInterest(balance, aprUsedForBurn)'),
    'expected portfolio priority burn math to use the shared helper'
  );
  assert.ok(
    velocityTargetingSource.includes('return calculateDailyInterest(balance, apr);'),
    'expected velocity targeting daily burn to delegate to the shared helper'
  );
});

test('velocity targeting sanitizes non-finite debt inputs before scoring and ranking', () => {
  const corruptDebt = {
    id: 'corrupt',
    name: 'Corrupt Card',
    type: 'creditCard',
    balance: Number.POSITIVE_INFINITY,
    interestRate: Number.NaN,
    minimumPayment: Number.POSITIVE_INFINITY,
  };
  const usableDebt = {
    id: 'usable',
    name: 'Usable Card',
    type: 'creditCard',
    balance: 5000,
    interestRate: 0.24,
    minimumPayment: 125,
  };

  const ranked = velocityTargeting.rankDebtsVelocity([corruptDebt, usableDebt]);
  const corruptReason = velocityTargeting.buildVelocityReason(corruptDebt);

  assert.equal(ranked[0].id, 'usable');
  assert.equal(velocityTargeting.velocityScore(corruptDebt), 0);
  assert.ok(Number.isFinite(velocityTargeting.velocityScore(usableDebt)));
  assert.ok(!corruptReason.includes('Infinity'), corruptReason);
  assert.ok(!corruptReason.includes('NaN'), corruptReason);
});

test('web calculations use shared financial-engine primitives', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  const tsconfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'tsconfig.json'), 'utf8'));
  const nextConfig = fs.readFileSync(path.resolve(__dirname, '..', 'next.config.ts'), 'utf8');
  const calculationsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/calculations.ts'), 'utf8');
  const duplicateExports = [
    'calculateDailyInterest',
    'calculateDailyRate',
    'calculateCashFlow',
    'calculateAmortizationPayment',
    'calculateTotalAmortizationInterest',
    'calculateADBInterest',
    'simulateAmortizedPayoff',
    'formatCurrency',
  ];

  assert.equal(packageJson.dependencies['@interestshield/financial-engine'], 'file:../../packages/financial-engine');
  assert.deepEqual(
    tsconfig.compilerOptions.paths['@interestshield/financial-engine'],
    ['../../packages/financial-engine/src/index.ts']
  );
  assert.ok(
    nextConfig.includes("transpilePackages: ['@interestshield/financial-engine']"),
    'expected Next to transpile the local shared financial engine package'
  );
  assert.ok(
    nextConfig.includes('turbopack') && nextConfig.includes('root: workspaceRoot'),
    'expected Turbopack to resolve shared package files from the workspace root'
  );
  assert.ok(
    calculationsSource.includes("from '@interestshield/financial-engine'"),
    'expected web calculations to import shared financial engine primitives'
  );

  for (const exportName of duplicateExports) {
    assert.ok(
      !new RegExp(`export\\s+function\\s+${exportName}\\s*\\(`).test(calculationsSource),
      `expected ${exportName} to come from @interestshield/financial-engine instead of a web duplicate`
    );
  }
});

test('web Money Loop module re-exports shared financial-engine ledger', () => {
  const moneyLoopSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/money-loop.ts'), 'utf8');
  const duplicateExports = [
    'simulateMoneyLoopMonth',
    'simulateMoneyLoopPayoff',
  ];

  assert.equal(moneyLoop.simulateMoneyLoopMonth, sharedFinancialEngine.simulateMoneyLoopMonth);
  assert.equal(moneyLoop.simulateMoneyLoopPayoff, sharedFinancialEngine.simulateMoneyLoopPayoff);
  assert.ok(
    moneyLoopSource.includes("from '@interestshield/financial-engine'"),
    'expected web Money Loop module to import the shared financial engine package'
  );

  for (const exportName of duplicateExports) {
    assert.ok(
      !new RegExp(`export\\s+function\\s+${exportName}\\s*\\(`).test(moneyLoopSource),
      `expected ${exportName} to come from @interestshield/financial-engine instead of a web duplicate`
    );
  }
});

test('web single-debt amortized payoff paths use the shared helper', () => {
  const calculationsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/calculations.ts'), 'utf8');
  const baselineStart = calculationsSource.indexOf('export function simulateBaseline');
  const baselineEnd = calculationsSource.indexOf('export function simulateVelocity', baselineStart);
  const extraStart = calculationsSource.indexOf('function simulateWithExtraPayments');
  const extraEnd = calculationsSource.indexOf('export function simulateMultiDebt', extraStart);
  const baselineSource = calculationsSource.slice(baselineStart, baselineEnd);
  const extraSource = calculationsSource.slice(extraStart, extraEnd);
  const inputs = {
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
      termMonths: 48,
    },
    useVelocity: false,
    extraPayment: 500,
  };
  const cashFlow = inputs.monthlyIncome - inputs.monthlyExpenses;
  const expectedBaseline = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: inputs.carLoan.balance,
    apr: inputs.carLoan.apr,
    monthlyPayment: inputs.carLoan.monthlyPayment,
    maxMonths: 600,
  });
  const expectedAccelerated = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: inputs.carLoan.balance,
    apr: inputs.carLoan.apr,
    monthlyPayment: inputs.carLoan.monthlyPayment,
    extraPayment: Math.min(Math.max(0, inputs.extraPayment), Math.max(0, cashFlow)),
    maxMonths: 600,
  });
  const baseline = calculations.simulateBaseline(inputs);
  const accelerated = calculations.simulateVelocity({ ...inputs, loc: undefined });

  assert.ok(
    baselineSource.includes('simulateAmortizedPayoff({'),
    'expected web baseline payoff to call the shared amortized payoff helper'
  );
  assert.ok(
    extraSource.includes('simulateAmortizedPayoff({'),
    'expected web no-LOC accelerated payoff to call the shared amortized payoff helper'
  );
  assert.ok(!baselineSource.includes('while (balance > 0.01'), 'expected baseline payoff loop to live in the shared helper');
  assert.ok(!extraSource.includes('while (balance > 0.01'), 'expected extra-payment payoff loop to live in the shared helper');
  assert.equal(baseline.payoffMonths, expectedBaseline.payoffMonths);
  assert.equal(roundCents(baseline.totalInterest), roundCents(expectedBaseline.totalInterest));
  assert.equal(baseline.monthlyData.length, expectedBaseline.monthlyData.length);
  assert.equal(roundCents(baseline.monthlyData[0].carBalance), roundCents(expectedBaseline.monthlyData[0].balance));
  assert.equal(accelerated.payoffMonths, expectedAccelerated.payoffMonths);
  assert.equal(roundCents(accelerated.totalInterest), roundCents(expectedAccelerated.totalInterest));
  assert.equal(accelerated.monthlyData.length, expectedAccelerated.monthlyData.length);
  assert.equal(roundCents(accelerated.monthlyData[0].carInterest), roundCents(expectedAccelerated.monthlyData[0].interest));
});

test('amortization yearly breakdown uses the shared payoff schedule', () => {
  const calculationsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/calculations.ts'), 'utf8');
  const breakdownStart = calculationsSource.indexOf('export function generateAmortizationBreakdown');
  const breakdownEnd = calculationsSource.indexOf('//', breakdownStart + 1);
  const breakdownSource = calculationsSource.slice(breakdownStart, breakdownEnd);
  const principal = 100000;
  const apr = 0.06;
  const termYears = 30;
  const payment = calculations.calculateAmortizationPayment(principal, apr, termYears * 12);
  const sharedProjection = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: principal,
    apr,
    monthlyPayment: payment,
    maxMonths: termYears * 12,
  });
  const firstYearRows = sharedProjection.monthlyData.slice(0, 12);
  const breakdown = calculations.generateAmortizationBreakdown(principal, apr, termYears);

  assert.ok(
    breakdownSource.includes('simulateAmortizedPayoff({') && breakdownSource.includes('projection.monthlyData'),
    'expected yearly amortization breakdown to aggregate the shared payoff schedule'
  );
  assert.ok(!breakdownSource.includes('monthlyRate'), 'expected yearly amortization breakdown not to keep a separate monthly-rate loop');
  assert.equal(breakdown.length, termYears);
  assert.equal(
    roundCents(breakdown[0].interestPaid),
    roundCents(firstYearRows.reduce((sum, month) => sum + month.interest, 0))
  );
  assert.equal(
    roundCents(breakdown[0].principalPaid),
    roundCents(firstYearRows.reduce((sum, month) => sum + month.principal, 0))
  );
  assert.equal(roundCents(breakdown[0].remainingBalance), roundCents(firstYearRows.at(-1).balance));
  assert.equal(roundCents(breakdown.at(-1).remainingBalance), 0);
});

test('web multi-debt baseline comparisons use the shared amortized payoff helper', () => {
  const calculationsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/calculations.ts'), 'utf8');
  const baselineDebtStart = calculationsSource.indexOf('function simulateBaselineDebt');
  const baselineDebtEnd = calculationsSource.indexOf('export function runSimulation', baselineDebtStart);
  const baselineDebtSource = calculationsSource.slice(baselineDebtStart, baselineDebtEnd);
  const debt = defaultCarDebt();
  const expected = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: debt.balance,
    apr: debt.apr,
    monthlyPayment: debt.monthlyPayment,
    maxMonths: 600,
  });
  const result = calculations.simulateMultiDebt([debt], 6500, 5000, undefined, 'snowball');
  const impossibleDebt = {
    id: 'interest-heavy',
    name: 'Interest Heavy Card',
    type: 'creditCard',
    balance: 10000,
    apr: 0.24,
    monthlyPayment: 100,
    minimumPayment: 100,
  };
  const impossibleExpected = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: impossibleDebt.balance,
    apr: impossibleDebt.apr,
    monthlyPayment: impossibleDebt.monthlyPayment,
    maxMonths: 600,
  });
  const impossible = calculations.simulateMultiDebt([impossibleDebt], 6500, 5000, undefined, 'snowball');

  assert.ok(
    baselineDebtSource.includes('simulateAmortizedPayoff({'),
    'expected web multi-debt baseline comparison to call the shared amortized payoff helper'
  );
  assert.ok(!baselineDebtSource.includes('while (balance > 0.01'), 'expected baseline debt payoff loop to live in the shared helper');
  assert.equal(result.baselineTotalMonths, expected.payoffMonths);
  assert.equal(roundCents(result.baselineTotalInterest), roundCents(expected.totalInterest));
  assert.equal(result.debts[0].baselinePayoffMonths, expected.payoffMonths);
  assert.equal(roundCents(result.debts[0].baselineInterest), roundCents(expected.totalInterest));
  assert.equal(impossible.failureReason, 'payment-below-interest');
  assert.equal(impossible.baselineTotalMonths, impossibleExpected.payoffMonths);
  assert.equal(roundCents(impossible.baselineTotalInterest), roundCents(impossibleExpected.totalInterest));
  assert.equal(impossible.debts[0].baselinePayoffMonths, impossibleExpected.payoffMonths);
  assert.equal(roundCents(impossible.debts[0].baselineInterest), roundCents(impossibleExpected.totalInterest));
});

test('multi-debt payoff distinguishes horizon misses from under-interest payments', () => {
  const result = calculations.simulateMultiDebt(
    [{
      id: 'long-horizon',
      name: 'Long Horizon Loan',
      type: 'mortgage',
      balance: 1000000,
      apr: 0.06,
      monthlyPayment: 5100,
      termMonths: 360,
    }],
    6000,
    900,
    undefined,
    'snowball'
  );

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payoff-horizon-exceeded');
  assert.equal(result.totalMonths, 600);
  assert.ok(result.debts[0].monthlyData.length > 0, 'expected horizon-limited multi-debt projection to keep reviewed rows');
});

test('zero APR baseline payoff pays principal without charging interest', () => {
  const result = calculations.simulateBaseline({
    monthlyIncome: 4000,
    monthlyExpenses: 3000,
    carLoan: {
      balance: 1000,
      apr: 0,
      monthlyPayment: 250,
    },
    useVelocity: false,
    extraPayment: 0,
  });

  assert.equal(result.isPayoffPossible, true);
  assert.equal(result.payoffMonths, 4);
  assert.equal(roundCents(result.totalInterest), 0);
  assert.equal(result.monthlyData.map((month) => roundCents(month.carBalance)).join('|'), '750|500|250|0');
});

test('baseline treats payment equal to monthly interest as an invalid payoff plan', () => {
  const result = calculations.simulateBaseline({
    monthlyIncome: 4000,
    monthlyExpenses: 3000,
    carLoan: {
      balance: 10000,
      apr: 0.12,
      monthlyPayment: 100,
    },
    useVelocity: false,
    extraPayment: 0,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payment-below-interest');
  assert.equal(result.monthlyData.length, 0);
});

test('shared amortized payoff distinguishes horizon misses from under-interest payments', () => {
  const result = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: 100000,
    apr: 0.06,
    monthlyPayment: 700,
    maxMonths: 12,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payoff-horizon-exceeded');
  assert.equal(result.payoffMonths, 12);
  assert.ok(result.monthlyData.length > 0, 'expected a horizon-limited projection to keep its reviewed schedule');
});

test('shared financial-engine primitives sanitize non-finite inputs', () => {
  assert.equal(sharedFinancialEngine.calculateMonthlyRate(Number.NaN), 0);
  assert.equal(sharedFinancialEngine.calculateDailyRate(Number.POSITIVE_INFINITY), 0);
  assert.equal(sharedFinancialEngine.calculateDailyInterest(Number.NaN, 0.12), 0);
  assert.equal(sharedFinancialEngine.calculateDailyInterest(1000, Number.NaN), 0);
  assert.equal(sharedFinancialEngine.calculateCashFlow(Number.NaN, 500), -500);
  assert.equal(sharedFinancialEngine.calculateCashFlow(500, Number.NaN), 500);
  assert.equal(sharedFinancialEngine.calculateAmortizationPayment(Number.NaN, 0.06, 360), 0);
  assert.equal(sharedFinancialEngine.calculateAmortizationPayment(100000, Number.NaN, 360).toFixed(2), '277.78');
  assert.equal(sharedFinancialEngine.calculateADBInterest(Number.NaN, 0.12, 5000, 4000), 0);
  assert.equal(sharedFinancialEngine.formatCurrency(Number.NaN), '$0');
  assert.equal(sharedFinancialEngine.formatCurrency(Number.POSITIVE_INFINITY), '$0');
  assert.equal(sharedFinancialEngine.formatCurrency(Number.NEGATIVE_INFINITY), '$0');
  assert.equal(sharedFinancialEngine.formatCurrency(-500), '-$500');
});

test('shared amortized payoff sanitizes non-finite inputs before building a schedule', () => {
  const projection = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: 1000,
    apr: Number.NaN,
    monthlyPayment: 250,
    extraPayment: Number.NaN,
    maxMonths: Number.NaN,
  });

  assert.equal(projection.isPayoffPossible, true);
  assert.equal(projection.payoffMonths, 4);
  assert.equal(projection.totalInterest, 0);
  assert.equal(projection.monthlyData.length, 4);
  assert.ok(
    projection.monthlyData.every((month) =>
      [month.balance, month.interest, month.principal, month.payment].every(Number.isFinite)
    ),
    `expected finite amortized rows, got ${JSON.stringify(projection.monthlyData)}`
  );
});

test('shared Money Loop payoff rejects payments below monthly interest before producing a timeline', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 10000,
    debtApr: 0.12,
    debtPayment: 50,
    loc: {
      limit: 10000,
      apr: 0.09,
      balance: 0,
    },
    chunkAmount: 0,
    cashFlowPaydown: 1000,
    locDepositAmount: 4000,
    locExpenseAmount: 3000,
    maxMonths: 12,
    initialMonthsSinceChunk: 999,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payment-below-interest');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.monthlyData.length, 0);
});

test('shared Money Loop payoff treats a missing LOC limit as setup needed instead of over-limit', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 10000,
    debtApr: 0.12,
    debtPayment: 250,
    loc: {
      limit: 0,
      apr: 0.09,
      balance: 0,
    },
    chunkAmount: 0,
    cashFlowPaydown: 1000,
    locDepositAmount: 4000,
    locExpenseAmount: 3000,
    maxMonths: 12,
    initialMonthsSinceChunk: 999,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-setup');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.monthlyData.length, 0);
});

test('shared Money Loop payoff treats a full LOC as no available room instead of over-limit', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 10000,
    debtApr: 0.12,
    debtPayment: 250,
    loc: {
      limit: 5000,
      apr: 0.09,
      balance: 5000,
    },
    chunkAmount: 1000,
    cashFlowPaydown: 1000,
    locDepositAmount: 4000,
    locExpenseAmount: 3000,
    maxMonths: 12,
    initialMonthsSinceChunk: 999,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-no-capacity');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.monthlyData.length, 0);
});

test('shared Money Loop payoff distinguishes horizon misses from under-interest payments', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 100000,
    debtApr: 0.06,
    debtPayment: 700,
    loc: {
      limit: 50000,
      apr: 0.09,
      balance: 0,
    },
    chunkAmount: 0,
    cashFlowPaydown: 1000,
    locDepositAmount: 5000,
    locExpenseAmount: 4000,
    maxMonths: 12,
    initialMonthsSinceChunk: 999,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payoff-horizon-exceeded');
  assert.equal(result.payoffMonths, 12);
  assert.ok(result.monthlyData.length > 0, 'expected a horizon-limited Money Loop projection to keep its event ledger');
});

test('shared Money Loop payoff sanitizes non-finite inputs before building an event ledger', () => {
  const result = sharedFinancialEngine.simulateMoneyLoopPayoff({
    principalBalance: 1000,
    debtApr: Number.NaN,
    debtPayment: 250,
    loc: {
      limit: 5000,
      apr: Number.NaN,
      balance: Number.NaN,
    },
    chunkAmount: Number.NaN,
    cashFlowPaydown: 1000,
    locDepositAmount: Number.NaN,
    locExpenseAmount: Number.NaN,
    maxMonths: Number.NaN,
    initialMonthsSinceChunk: Number.NaN,
  });

  assert.equal(result.isPayoffPossible, true);
  assert.equal(result.payoffMonths, 4);
  assert.equal(result.totalInterest, 0);
  assert.ok(result.monthlyData.length > 0, 'expected sanitized Money Loop rows');
  for (const month of result.monthlyData) {
    assert.ok(
      [month.debtBalance, month.locBalance, month.debtInterest, month.locInterest, month.cashFlowPaydown].every(
        Number.isFinite
      ),
      `expected finite Money Loop month, got ${JSON.stringify(month)}`
    );
    for (const event of month.events) {
      assert.ok(
        [event.amount, event.balanceAfter].every(Number.isFinite),
        `expected finite Money Loop event, got ${JSON.stringify(event)}`
      );
    }
  }
});

test('shared Money Loop caps LOC chunk draw to remaining principal', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 1000,
    debtApr: 0.06,
    debtPayment: 100,
    loc: {
      limit: 10000,
      apr: 0.09,
      balance: 0,
    },
    chunkAmount: 5000,
    cashFlowPaydown: 1500,
    locDepositAmount: 4000,
    locExpenseAmount: 2500,
    maxMonths: 12,
    initialMonthsSinceChunk: 999,
  });

  const firstMonth = result.monthlyData[0];
  const chunkDraw = firstMonth.events.find((event) => event.type === 'loc-chunk-draw');

  assert.ok(chunkDraw, 'expected the first month to use a LOC chunk');
  assert.equal(roundCents(chunkDraw.amount), 1000);
  assert.ok(
    firstMonth.locBalance < 1000,
    `expected LOC balance ${firstMonth.locBalance} to reflect a capped chunk and cash-flow paydown`
  );
});

test('shared Money Loop caps LOC chunk draw to available credit', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 10000,
    debtApr: 0.06,
    debtPayment: 300,
    loc: {
      limit: 10000,
      apr: 0.09,
      balance: 9500,
    },
    chunkAmount: 1000,
    cashFlowPaydown: 1500,
    locDepositAmount: 5000,
    locExpenseAmount: 3500,
    maxMonths: 3,
    initialMonthsSinceChunk: 999,
  });

  const firstMonth = result.monthlyData[0];
  const chunkDraw = firstMonth.events.find((event) => event.type === 'loc-chunk-draw');

  assert.ok(chunkDraw, 'expected the first month to use the available LOC credit');
  assert.equal(roundCents(chunkDraw.amount), 500);
});

test('shared Money Loop payoff includes LOC recovery after the target debt is cleared', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 1000,
    debtApr: 0,
    debtPayment: 100,
    loc: {
      limit: 10000,
      apr: 0,
      balance: 0,
    },
    chunkAmount: 1000,
    cashFlowPaydown: 250,
    locDepositAmount: 4000,
    locExpenseAmount: 3750,
    maxMonths: 12,
    initialMonthsSinceChunk: 999,
  });

  const finalMonth = result.monthlyData.at(-1);

  assert.equal(result.isPayoffPossible, true);
  assert.equal(result.payoffMonths, 4);
  assert.equal(roundCents(finalMonth.debtBalance), 0);
  assert.equal(roundCents(finalMonth.locBalance), 0);
  assert.equal(
    result.monthlyData.map((month) => roundCents(month.locBalance)).join('|'),
    '750|500|250|0'
  );
});

test('multi-debt velocity includes LOC interest in its total interest', () => {
  const velocity = calculations.simulateMultiDebt(
    [defaultCarDebt()],
    6500,
    5000,
    { limit: 25000, apr: 0.085, balance: 3200 },
    'velocity',
    1000
  );

  const debtOnlyInterest = velocity.debts.reduce((sum, debt) => sum + debt.totalInterest, 0);

  assert.ok(
    velocity.locInterestPaid > 0,
    `expected LOC interest to be tracked, got ${velocity.locInterestPaid}`
  );
  assert.ok(
    velocity.totalInterestPaid > debtOnlyInterest,
    `expected total interest ${velocity.totalInterestPaid} to include more than debt interest ${debtOnlyInterest}`
  );
  assert.equal(
    roundCents(velocity.totalInterestPaid),
    roundCents(debtOnlyInterest + velocity.locInterestPaid)
  );
});

test('multi-debt velocity exposes the shared Money Loop event ledger', () => {
  const velocity = calculations.simulateMultiDebt(
    [defaultCarDebt()],
    6500,
    5000,
    { limit: 25000, apr: 0.085, balance: 3200 },
    'velocity',
    1000
  );

  const firstMonth = velocity.moneyLoopMonthlyData[0];

  assert.ok(firstMonth, 'expected multi-debt velocity to expose Money Loop monthly data');
  assert.equal(
    firstMonth.events.map((event) => event.type).join('|'),
    'debt-interest|loc-chunk-draw|debt-payment|income-to-loc|expenses-from-loc|loc-interest|loc-cashflow-paydown'
  );
  assert.equal(firstMonth.events.find((event) => event.type === 'loc-chunk-draw').amount, 1000);
  assert.equal(
    roundCents(firstMonth.events.find((event) => event.type === 'loc-interest').amount),
    roundCents(firstMonth.locInterest)
  );
});

test('multi-debt velocity treats the focus payment as a cash outflow for LOC recovery', () => {
  const velocity = calculations.simulateMultiDebt(
    [
      {
        id: 'simple',
        name: 'Simple Loan',
        type: 'personal',
        balance: 10000,
        apr: 0,
        monthlyPayment: 100,
        minimumPayment: 100,
      },
    ],
    1000,
    700,
    { limit: 10000, apr: 0, balance: 1000 },
    'velocity',
    1
  );

  const firstMonth = velocity.moneyLoopMonthlyData[0];
  const chunkDraw = firstMonth.events.find((event) => event.type === 'loc-chunk-draw');

  assert.ok(chunkDraw, 'expected a tiny LOC chunk so the LOC recovery math is visible');
  assert.equal(roundCents(firstMonth.locBalance), 1001);
  assert.equal(roundCents(firstMonth.cashFlowPaydown), 0);
});

test('multi-debt velocity includes LOC recovery after the final debt payoff', () => {
  const velocity = calculations.simulateMultiDebt(
    [
      {
        id: 'simple',
        name: 'Simple Loan',
        type: 'personal',
        balance: 100,
        apr: 0,
        monthlyPayment: 100,
        minimumPayment: 100,
      },
    ],
    1000,
    850,
    { limit: 1000, apr: 0, balance: 0 },
    'velocity',
    100
  );

  assert.equal(velocity.debts[0].payoffMonths, 1);
  assert.equal(velocity.totalMonths, 2);
  assert.equal(velocity.isPayoffPossible, true);
});

test('multi-debt velocity refuses over-limit LOC plans instead of returning payoff claims', () => {
  const velocity = calculations.simulateMultiDebt(
    [defaultCarDebt()],
    6500,
    5000,
    { limit: 10000, apr: 0.085, balance: 10500 },
    'velocity',
    5000
  );

  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.failureReason, 'loc-overlimit');
  assert.equal(velocity.totalMonths, 0);
  assert.equal(velocity.totalInterestPaid, 0);
  assert.equal(velocity.totalInterestSaved, 0);
  assert.equal(velocity.monthsSaved, 0);
  assert.equal(velocity.moneyLoopMonthlyData.length, 0);
  assert.ok(
    velocity.warnings.some(
      (warning) =>
        warning.type === 'loc-overlimit' &&
        warning.severity === 'critical' &&
        warning.message.includes('above the entered limit')
    ),
    JSON.stringify(velocity.warnings)
  );
  assert.ok(!velocity.warnings.some((warning) => warning.type === 'loc-overutilization'), JSON.stringify(velocity.warnings));
});

test('multi-debt velocity treats a missing LOC limit as setup needed instead of over-limit', () => {
  const velocity = calculations.simulateMultiDebt(
    [defaultCarDebt()],
    6500,
    5000,
    { limit: 0, apr: 0.085, balance: 0 },
    'velocity',
    5000
  );

  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.failureReason, 'loc-setup');
  assert.equal(velocity.totalMonths, 0);
  assert.equal(velocity.totalInterestPaid, 0);
  assert.equal(velocity.totalInterestSaved, 0);
  assert.equal(velocity.monthsSaved, 0);
  assert.equal(velocity.moneyLoopMonthlyData.length, 0);
});

test('multi-debt velocity treats a full LOC as no available room instead of over-limit', () => {
  const velocity = calculations.simulateMultiDebt(
    [defaultCarDebt()],
    6500,
    5000,
    { limit: 10000, apr: 0.085, balance: 10000 },
    'velocity',
    5000
  );

  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.failureReason, 'loc-no-capacity');
  assert.equal(velocity.totalMonths, 0);
  assert.equal(velocity.totalInterestPaid, 0);
  assert.equal(velocity.totalInterestSaved, 0);
  assert.equal(velocity.monthsSaved, 0);
  assert.equal(velocity.moneyLoopMonthlyData.length, 0);
});

test('shared warnings treat a LOC balance without a limit as setup needed instead of infinity utilization', () => {
  const warnings = calculations.generateWarnings(
    6500,
    5000,
    { limit: 0, apr: 0.085, balance: 3200 },
    [defaultCarDebt()]
  );

  assert.ok(
    warnings.some(
      (warning) =>
        warning.type === 'no-loc' &&
        warning.severity === 'warning' &&
        warning.message.includes('LOC balance is present, but the limit is missing')
    ),
    JSON.stringify(warnings)
  );
  assert.ok(!warnings.some((warning) => warning.type === 'loc-overutilization'), JSON.stringify(warnings));
  assert.ok(
    warnings.every((warning) => !warning.message.includes('Infinity') && !warning.message.includes('NaN')),
    JSON.stringify(warnings)
  );
});

test('shared warnings treat a full LOC as no available room instead of high utilization', () => {
  const warnings = calculations.generateWarnings(
    6500,
    5000,
    { limit: 10000, apr: 0.085, balance: 10000 },
    [defaultCarDebt()]
  );

  assert.ok(
    warnings.some(
      (warning) =>
        warning.type === 'loc-no-capacity' &&
        warning.severity === 'critical' &&
        warning.message.includes('at the entered limit')
    ),
    JSON.stringify(warnings)
  );
  assert.ok(!warnings.some((warning) => warning.type === 'loc-overlimit'), JSON.stringify(warnings));
  assert.ok(!warnings.some((warning) => warning.type === 'loc-overutilization'), JSON.stringify(warnings));
});

test('multi-debt velocity refuses under-interest debt plans instead of dropping unpaid interest', () => {
  const velocity = calculations.simulateMultiDebt(
    [
      {
        id: 'interest-heavy',
        name: 'Interest Heavy Card',
        type: 'creditCard',
        balance: 10000,
        apr: 0.24,
        monthlyPayment: 100,
        minimumPayment: 100,
      },
      defaultCarDebt(),
    ],
    6500,
    5000,
    { limit: 25000, apr: 0.085, balance: 3200 },
    'velocity',
    1000
  );

  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.failureReason, 'payment-below-interest');
  assert.equal(velocity.totalMonths, 0);
  assert.equal(velocity.totalInterestPaid, 0);
  assert.equal(velocity.totalInterestSaved, 0);
  assert.equal(velocity.moneyLoopMonthlyData.length, 0);
  assert.ok(
    velocity.warnings.some((warning) => warning.type === 'negative-amortization'),
    JSON.stringify(velocity.warnings)
  );
});

test('multi-debt velocity refuses projections when cash flow cannot cover minimum payments', () => {
  const velocity = calculations.simulateMultiDebt(
    [defaultCarDebt()],
    5300,
    5000,
    { limit: 25000, apr: 0.085, balance: 3200 },
    'velocity',
    1000
  );

  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.failureReason, 'cashflow-below-minimums');
  assert.equal(velocity.totalMonths, 0);
  assert.equal(velocity.totalInterestPaid, 0);
  assert.equal(velocity.totalInterestSaved, 0);
  assert.equal(velocity.monthsSaved, 0);
  assert.equal(velocity.moneyLoopMonthlyData.length, 0);
  assert.ok(
    velocity.warnings.some((warning) => warning.type === 'cashflow-below-minimums'),
    JSON.stringify(velocity.warnings)
  );
});

test('negative cash flow does not deploy a negative velocity chunk', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 4000,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
    },
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
    useVelocity: true,
    extraPayment: 0,
  });

  const firstMonth = result.monthlyData[0];

  assert.ok(firstMonth, 'expected at least one month of simulated data');
  assert.ok(
    firstMonth.carBalance < 18450,
    `expected debt to avoid growing from a negative chunk; got ${firstMonth.carBalance}`
  );
  assert.ok(
    result.totalInterest < 100000,
    `expected invalid velocity plan not to explode interest; got ${result.totalInterest}`
  );
});

test('velocity refuses over-limit LOC plans instead of chunking against unavailable credit', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
    },
    loc: {
      limit: 10000,
      apr: 0.085,
      balance: 10500,
    },
    useVelocity: true,
    extraPayment: 5000,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-overlimit');
  assert.ok(
    result.monthlyData.every((month) => !month.events?.some((event) => event.type === 'loc-chunk-draw')),
    'expected no LOC chunk draw when the line is already over limit'
  );
});

test('velocity treats a missing LOC limit as setup needed instead of over-limit', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
    },
    loc: {
      limit: 0,
      apr: 0.085,
      balance: 0,
    },
    useVelocity: true,
    extraPayment: 5000,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-setup');
  assert.equal(result.totalInterest, 0);
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.monthlyData.length, 0);
});

test('velocity treats a full LOC as no available room instead of over-limit', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
    },
    loc: {
      limit: 10000,
      apr: 0.085,
      balance: 10000,
    },
    useVelocity: true,
    extraPayment: 5000,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-no-capacity');
  assert.equal(result.totalInterest, 0);
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.monthlyData.length, 0);
});

test('single-debt velocity treats the regular debt payment as a cash outflow for LOC recovery', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 1000,
    monthlyExpenses: 700,
    carLoan: {
      balance: 10000,
      apr: 0,
      monthlyPayment: 100,
    },
    loc: {
      limit: 10000,
      apr: 0,
      balance: 1000,
    },
    useVelocity: true,
    extraPayment: 1,
  });

  const firstMonth = result.monthlyData[0];
  const chunkDraw = firstMonth.events.find((event) => event.type === 'loc-chunk-draw');

  assert.ok(chunkDraw, 'expected a tiny LOC chunk so the LOC recovery math is visible');
  assert.equal(roundCents(firstMonth.locBalance), 801);
});

test('single-debt velocity auto-sizes chunks from recoverable LOC cash flow', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 1000,
    monthlyExpenses: 700,
    carLoan: {
      balance: 10000,
      apr: 0,
      monthlyPayment: 100,
    },
    loc: {
      limit: 10000,
      apr: 0,
      balance: 0,
    },
    useVelocity: true,
    extraPayment: 0,
  });

  const firstChunkMonth = result.monthlyData.find((month) =>
    month.events.some((event) => event.type === 'loc-chunk-draw')
  );
  const chunkDraw = firstChunkMonth?.events.find((event) => event.type === 'loc-chunk-draw');

  assert.ok(chunkDraw, 'expected automatic velocity chunk to deploy once the recovery window opens');
  assert.equal(chunkDraw.amount, 600);
  assert.equal(roundCents(firstChunkMonth.cashFlow), 200);
});

test('single-debt velocity refuses projections when cash flow cannot cover the regular debt payment', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 1000,
    monthlyExpenses: 700,
    carLoan: {
      balance: 10000,
      apr: 0,
      monthlyPayment: 350,
    },
    loc: {
      limit: 10000,
      apr: 0,
      balance: 1000,
    },
    useVelocity: true,
    extraPayment: 1,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'cashflow-below-minimums');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.monthlyData.length, 0);
});

test('baseline marks payments below monthly interest as impossible payoff plans', () => {
  const result = calculations.simulateBaseline({
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    carLoan: {
      balance: 10000,
      apr: 0.24,
      monthlyPayment: 100,
    },
    useVelocity: false,
    extraPayment: 0,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payment-below-interest');
});

test('portfolio simulation does not mutate promo terms on input debts', () => {
  const debt = {
    id: 'promo-card',
    name: 'Promo Card',
    category: 'credit_card',
    kind: 'revolving',
    balance: 5000,
    apr: 0.24,
    minPaymentRule: { type: 'fixed', amount: 150 },
    paymentSource: 'checking',
    promo: { introApr: 0, monthsRemaining: 2, postIntroApr: 0.24 },
  };
  const inputs = {
    monthlyIncome: 5000,
    monthlyExpenses: 4000,
    extraMonthlyPayment: 0,
    debts: [debt],
    settings: {
      strategy: 'avalanche',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 4,
  };

  const first = portfolio.simulatePortfolio(inputs);
  const second = portfolio.simulatePortfolio(inputs);

  assert.equal(debt.promo.monthsRemaining, 2);
  assert.equal(roundCents(first.totalInterest), roundCents(second.totalInterest));
});

test('portfolio promo APR lasts for the full remaining-month window before post-intro APR starts', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 5000,
    monthlyExpenses: 4900,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'promo-card',
        name: 'Promo Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 10000,
        apr: 0.24,
        minPaymentRule: { type: 'fixed', amount: 100 },
        paymentSource: 'checking',
        promo: { introApr: 0, monthsRemaining: 2, postIntroApr: 0.24 },
      },
    ],
    settings: {
      strategy: 'avalanche',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 3,
  });

  const monthlyInterest = result.monthResults.map((month) => roundCents(month.interestCharges['promo-card']));

  assert.equal(monthlyInterest.join('|'), '0|0|196');
});

test('portfolio simulation does not project payoff when a minimum payment is below monthly interest', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 6000,
    monthlyExpenses: 4000,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'interest-heavy',
        name: 'Interest Heavy Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 10000,
        apr: 0.24,
        minPaymentRule: { type: 'fixed', amount: 100 },
        paymentSource: 'checking',
      },
      {
        id: 'small-card',
        name: 'Small Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 800,
        apr: 0.1,
        minPaymentRule: { type: 'fixed', amount: 80 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'snowball',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 12,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payment-below-interest');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.monthResults.length, 0);
  assert.ok(
    result.warnings.some((warning) => warning.includes("Interest Heavy Card payment doesn't cover monthly interest")),
    result.warnings.join(' | ')
  );
});

test('portfolio simulation distinguishes horizon misses from under-interest payments', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 6000,
    monthlyExpenses: 900,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'long-horizon',
        name: 'Long Horizon Loan',
        category: 'mortgage',
        kind: 'amortized',
        balance: 1000000,
        apr: 0.06,
        minPaymentRule: { type: 'fixed', amount: 5100 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'avalanche',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 12,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'payoff-horizon-exceeded');
  assert.equal(result.payoffMonths, 12);
  assert.ok(result.monthResults.length > 0, 'expected horizon-limited portfolio projection to keep reviewed rows');
});

test('portfolio simulation does not project payoff when cash flow cannot cover minimums', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 4000,
    monthlyExpenses: 3700,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'card',
        name: 'Credit Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 5000,
        apr: 0.24,
        minPaymentRule: { type: 'fixed', amount: 250 },
        paymentSource: 'checking',
      },
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 14000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'avalanche',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 12,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'cashflow-below-minimums');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.payoffOrder.length, 0);
  assert.equal(result.monthResults.length, 0);
  assert.ok(
    result.warnings.some((warning) => warning.includes("doesn't cover all minimums")),
    result.warnings.join(' | ')
  );
});

test('portfolio split focus allocates the full available extra payment across both targets', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 5000,
    monthlyExpenses: 4700,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'primary',
        name: 'Primary Debt',
        category: 'credit_card',
        kind: 'revolving',
        balance: 1000,
        apr: 0,
        minPaymentRule: { type: 'fixed', amount: 50 },
        paymentSource: 'checking',
      },
      {
        id: 'secondary',
        name: 'Secondary Debt',
        category: 'personal_loan',
        kind: 'simple',
        balance: 2000,
        apr: 0,
        minPaymentRule: { type: 'fixed', amount: 50 },
        paymentSource: 'checking',
      },
    ],
    settings: { strategy: 'snowball', focusMode: 'split', splitRatioPrimary: 0.6 },
    maxMonths: 1,
  });

  const month = result.monthResults[0];
  assert.ok(month, 'expected first-month portfolio result');
  assert.equal(roundCents(month.payments.primary), 170);
  assert.equal(roundCents(month.payments.secondary), 130);
  assert.equal(
    roundCents(month.payments.primary + month.payments.secondary),
    300,
    `expected all available cash flow to be assigned, got ${JSON.stringify(month.payments)}`
  );
});

test('portfolio page blocks debt-free date claims for invalid projections', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/portfolio/page.tsx'), 'utf8');

  assert.ok(source.includes('portfolioProjectionValid'), 'expected Portfolio page to derive projection validity');
  assert.ok(source.includes("portfolioProjectionValid ? formatDate(payoffMonths) : 'Review inputs'"));
  assert.ok(source.includes("portfolioProjectionValid ? formatCurrency(totalInterest) : 'Not projected'"));
  assert.ok(source.includes('portfolioProjectionValid && payoffOrder.length > 0'));
});

test('portfolio run comparison explains projection deltas after an edit', () => {
  const baselineInputs = {
    monthlyIncome: 5000,
    monthlyExpenses: 3600,
    extraMonthlyPayment: 0,
    debts: [{
      id: 'card',
      name: 'Card',
      category: 'credit_card',
      kind: 'revolving',
      balance: 14000,
      apr: 0.199,
      minPaymentRule: { type: 'fixed', amount: 320 },
      paymentSource: 'checking',
    }],
    settings: {
      strategy: 'avalanche',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 120,
  };
  const improvedInputs = {
    ...baselineInputs,
    extraMonthlyPayment: 250,
    debts: baselineInputs.debts.map((debt) => ({ ...debt, minPaymentRule: { ...debt.minPaymentRule } })),
  };

  const baselineResult = portfolio.simulatePortfolio(baselineInputs);
  const improvedResult = portfolio.simulatePortfolio(improvedInputs);
  const comparison = portfolioRunDiff.comparePortfolioRuns(
    portfolioRunDiff.summarizePortfolioRun(baselineInputs, baselineResult),
    portfolioRunDiff.summarizePortfolioRun(improvedInputs, improvedResult)
  );

  assert.equal(comparison.status, 'changed');
  assert.ok(
    comparison.changes.some((change) => change.id === 'payoff-months' && change.direction === 'improved'),
    JSON.stringify(comparison.changes)
  );
  assert.ok(
    comparison.changes.some((change) => change.id === 'total-interest' && change.direction === 'improved'),
    JSON.stringify(comparison.changes)
  );
});

test('portfolio run comparison formats invalid projection reasons for users', () => {
  const previous = {
    cashFlow: 1500,
    totalDebt: 14000,
    totalMinimums: 390,
    payoffMonths: 24,
    totalInterest: 1200,
    isPayoffPossible: true,
    strategy: 'velocity',
    focusMode: 'single',
    primaryTargetName: 'Auto Loan',
    debtCount: 1,
  };
  const current = {
    ...previous,
    payoffMonths: 0,
    totalInterest: 0,
    isPayoffPossible: false,
    failureReason: 'loc-no-capacity',
  };

  const comparison = portfolioRunDiff.comparePortfolioRuns(previous, current);
  const projectionChange = comparison.changes.find((change) => change.id === 'projection');

  assert.equal(projectionChange.value, 'Needs review');
  assert.equal(projectionChange.body, 'The latest inputs stopped the payoff projection: no LOC room.');
  assert.ok(!projectionChange.body.includes('loc-no-capacity'), projectionChange.body);
});

test('portfolio run comparison formats restored projection reasons for users', () => {
  const previous = {
    cashFlow: 1500,
    totalDebt: 14000,
    totalMinimums: 390,
    payoffMonths: 0,
    totalInterest: 0,
    isPayoffPossible: false,
    failureReason: 'loc-setup',
    strategy: 'velocity',
    focusMode: 'single',
    primaryTargetName: 'Auto Loan',
    debtCount: 1,
  };
  const current = {
    ...previous,
    payoffMonths: 24,
    totalInterest: 1200,
    isPayoffPossible: true,
    failureReason: undefined,
  };

  const comparison = portfolioRunDiff.comparePortfolioRuns(previous, current);
  const projectionChange = comparison.changes.find((change) => change.id === 'projection');

  assert.equal(projectionChange.value, 'Projection restored');
  assert.equal(projectionChange.body, 'The plan moved from LOC setup needed back to a projected payoff.');
  assert.ok(!projectionChange.body.includes('loc-setup'), projectionChange.body);
});

test('portfolio page mounts the what-changed-since-last-run panel', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/portfolio/page.tsx'), 'utf8');

  assert.ok(source.includes('What changed since last run'), 'expected Portfolio to name the run-diff panel');
  assert.ok(source.includes('data-testid="portfolio-run-comparison"'), 'expected Portfolio run-diff panel to expose a stable hook');
  assert.ok(source.includes('data-testid="portfolio-run-change"'), 'expected Portfolio run changes to expose stable hooks');
  assert.ok(source.includes('store.lastRunComparison'), 'expected Portfolio to render the store-backed run comparison');
});

test('portfolio payoff path visual model samples the simulated balance descent', () => {
  const inputs = {
    monthlyIncome: 5000,
    monthlyExpenses: 3600,
    extraMonthlyPayment: 250,
    debts: [{
      id: 'path-card',
      name: 'Path Card',
      category: 'credit_card',
      kind: 'revolving',
      balance: 14000,
      apr: 0.199,
      minPaymentRule: { type: 'fixed', amount: 320 },
      paymentSource: 'checking',
    }],
    settings: {
      strategy: 'avalanche',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 120,
  };

  const result = portfolio.simulatePortfolio(inputs);
  const model = portfolioPathVisual.buildPortfolioPathVisualModel(result, 14000);
  const firstPoint = model.sampledPoints[0];
  const finalPoint = model.sampledPoints[model.sampledPoints.length - 1];

  assert.equal(model.isProjected, true);
  assert.equal(model.statusLabel, 'Projected path');
  assert.equal(firstPoint.month, 0);
  assert.equal(firstPoint.balance, 14000);
  assert.equal(finalPoint.month, result.payoffMonths);
  assert.equal(roundCents(finalPoint.balance), 0);
  assert.equal(roundCents(model.totalInterest), roundCents(result.totalInterest));
  assert.ok(model.sampledPoints.length <= 9, 'expected bounded SVG point sampling');
});

test('portfolio page mounts the engine-backed payoff path visual', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/portfolio/page.tsx'), 'utf8');
  const componentSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/PortfolioPayoffPath.tsx'), 'utf8');

  assert.ok(source.includes('buildPortfolioPathVisualModel'), 'expected Portfolio page to build the path model outside the component');
  assert.ok(source.includes('<PortfolioPayoffPath model={payoffPathModel} />'), 'expected Portfolio page to mount the payoff path component');
  assert.ok(componentSource.includes('data-testid="portfolio-payoff-path-visual"'), 'expected a stable payoff path smoke hook');
  assert.ok(componentSource.includes('data-testid="portfolio-payoff-path-svg"'), 'expected the payoff path SVG to expose a stable hook');
  assert.ok(componentSource.includes('data-testid="portfolio-payoff-path-node"'), 'expected model-backed path nodes to expose stable hooks');
});

test('portfolio debt controls are labeled with the debt name', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/portfolio/page.tsx'), 'utf8');

  assert.ok(
    source.includes('aria-label={`Debt name for ${d.name}`}'),
    'expected debt name inputs to identify the debt being edited'
  );
  assert.ok(
    source.includes('aria-label={`Remove ${d.name}`}'),
    'expected remove buttons to identify the debt being removed'
  );
});

test('theme controls expose selected state to assistive technology', () => {
  const settingsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/settings/page.tsx'), 'utf8');
  const navSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/Navigation.tsx'), 'utf8');

  assert.ok(
    settingsSource.includes('aria-pressed={theme === opt.value}'),
    'expected Settings theme buttons to expose the selected theme'
  );
  assert.ok(
    settingsSource.includes('aria-label={`Use ${opt.label} theme`}'),
    'expected Settings theme buttons to have explicit theme labels'
  );
  assert.ok(
    navSource.includes('aria-expanded={showThemes}'),
    'expected navigation theme menu trigger to expose expanded state'
  );
  assert.ok(
    navSource.includes('aria-pressed={theme === option.value}'),
    'expected navigation theme options to expose the selected theme'
  );
});

test('navigation exposes active page and mobile landmark state', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/Navigation.tsx'), 'utf8');

  assert.ok(source.includes('aria-label="Primary navigation"'), 'expected navigation to expose a primary landmark label');
  assert.ok(source.includes('data-testid="primary-navigation"'), 'expected a stable navigation smoke-test hook');
  assert.ok(
    source.includes("aria-current={pathname === item.href ? 'page' : undefined}"),
    'expected active navigation links to expose aria-current page state'
  );
});

test('root layout exposes a keyboard skip link to main content', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/layout.tsx'), 'utf8');

  assert.ok(source.includes('href="#main-content"'), 'expected a skip link target for keyboard users');
  assert.ok(source.includes('Skip to main content'), 'expected skip link copy to be plain and discoverable');
  assert.ok(source.includes('id="main-content"'), 'expected the main region to expose the skip-link target id');
  assert.ok(source.includes('tabIndex={-1}'), 'expected the main region to be programmatically focusable');
  assert.ok(source.includes('aria-label="Main content"'), 'expected the main region to have a readable landmark label');
});

test('intro modal exposes dialog semantics and traps keyboard focus', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/IntroModal.tsx'), 'utf8');

  assert.ok(source.includes('role="dialog"'), 'expected intro modal to use dialog semantics');
  assert.ok(source.includes('aria-modal="true"'), 'expected intro modal to mark the background inert for assistive technology');
  assert.ok(source.includes('aria-labelledby="intro-dialog-title"'), 'expected intro dialog to point at its title');
  assert.ok(source.includes('aria-describedby="intro-dialog-description"'), 'expected intro dialog to point at its description');
  assert.ok(source.includes('introDialogRef'), 'expected intro modal to retain a dialog ref for focus management');
  assert.ok(source.includes('previouslyFocusedElement'), 'expected intro modal to restore focus after close');
  assert.ok(source.includes('focusableSelectors'), 'expected intro modal to define focusable children for a focus trap');
  assert.ok(source.includes("event.key === 'Escape'"), 'expected Escape to close the intro dialog');
  assert.ok(source.includes("event.key !== 'Tab'"), 'expected Tab handling to stay inside the intro dialog');
});

test('intro copy keeps a coach tone and labels assumptions', () => {
  const source = [
    fs.readFileSync(path.resolve(__dirname, '..', 'src/components/IntroModal.tsx'), 'utf8'),
    fs.readFileSync(path.resolve(__dirname, '..', 'src/components/IntroAnimation.tsx'), 'utf8'),
  ]
    .join('\n')
    .replace(/^\s*\/\/.*$/gm, '')
    .toLowerCase();
  const bannedPhrases = [
    'most people don',
    '85',
    '90%',
    'drains silently',
    'daily drain',
    'you lose',
    'before a dime touches your balance',
    'this is not a budget app',
    'slashing daily interest',
    'watch months fall off',
    'watch years fall off',
    'debt-crushing',
    'crush it',
  ];

  for (const phrase of bannedPhrases) {
    assert.ok(!source.includes(phrase), `expected intro copy not to include fear or unsupported phrase: ${phrase}`);
  }

  assert.ok(source.includes('educational simulator'), 'expected intro copy to label the experience as educational');
  assert.ok(source.includes('sample mortgage'), 'expected intro animation to label mortgage figures as sample inputs');
  assert.ok(source.includes('teaching example'), 'expected intro animation to frame examples as teaching examples');
});

test('intro animation separates mobile beat content from captions', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/IntroAnimation.tsx'), 'utf8');

  assert.ok(
    source.includes('absolute left-0 right-0 top-4'),
    'expected mobile beat content to be pinned above the caption area'
  );
  assert.ok(source.includes('text-base font-bold leading-tight'), 'expected mobile intro headings to use compact type');
  assert.ok(source.includes('hidden h-20 w-32') && source.includes('sm:block'), 'expected decorative tank to be hidden on compact mobile');
  assert.ok(source.includes('bottom-12') && source.includes('sm:bottom-14'), 'expected captions to reserve space above controls on mobile');
});

test('settings exposes controls to restore the pre-app snapshot preview', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/settings/page.tsx'), 'utf8');

  assert.ok(source.includes('usePreferencesStore'), 'expected Settings to read preview preferences');
  assert.ok(source.includes('showPreAppPreview'), 'expected Settings to show the snapshot preview toggle state');
  assert.ok(source.includes('setShowPreAppPreview'), 'expected Settings to toggle the snapshot preview preference');
  assert.ok(source.includes('setLastPreviewRefresh(0)'), 'expected Settings to expire the preview window when restoring the snapshot');
  assert.ok(source.includes('appStore.setPreviewDismissed(false)'), 'expected Settings to clear the preview dismissed state');
  assert.ok(source.includes('aria-label="Toggle snapshot preview"'), 'expected preview toggle to have an explicit label');
  assert.ok(source.includes('Show snapshot next visit'), 'expected Settings to expose a visible restore-preview action');
});

test('settings makes demo backend status explicit', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/settings/page.tsx'), 'utf8');

  assert.ok(source.includes('Backend status'), 'expected Settings to include a backend status section');
  assert.equal(settingsBackend.BACKEND_STATUS_SUMMARY.mode, 'Local demo mode');
  assert.ok(
    settingsBackend.BACKEND_STATUS_SUMMARY.headline.includes('No production backend is connected'),
    'expected Settings model to avoid implying a live backend'
  );
  assert.ok(
    settingsBackend.BACKEND_STATUS_SUMMARY.detail.includes('Data is stored in this browser'),
    'expected Settings model to explain local-only storage'
  );
  assert.ok(source.includes('BACKEND_STATUS_SUMMARY.mode'), 'expected Settings to render the modeled persistence mode');
  assert.ok(source.includes('BACKEND_READINESS_OPTIONS'), 'expected Settings to render backend candidates from the readiness model');
  assert.ok(
    source.includes('data-testid="settings-backend-readiness"'),
    'expected Settings backend readiness panel to expose a stable smoke hook'
  );
  assert.ok(
    !source.includes('Next backend step: Supabase Postgres + Auth + RLS'),
    'expected Settings not to hard-code Supabase as the selected backend'
  );
  assert.ok(
    source.includes('aria-label={`${provider} sign-in unavailable: backend not connected`}'),
    'expected disabled OAuth buttons to explain why sign-in is unavailable'
  );
  assert.ok(
    source.includes('title={`${provider} sign-in unavailable until backend keys are configured`}'),
    'expected disabled OAuth buttons to expose unavailable reason on hover'
  );
});

test('settings backend readiness model keeps provider choice explicit', () => {
  assert.deepEqual(
    Array.from(settingsBackend.BACKEND_HANDOFF_TARGETS),
    ['supabase-postgres-auth-rls', 'cloudflare-workers-d1-durable-objects']
  );
  assert.equal(settingsBackend.BACKEND_READINESS_OPTIONS.length, 2);
  for (const option of settingsBackend.BACKEND_READINESS_OPTIONS) {
    assert.ok(settingsBackend.BACKEND_HANDOFF_TARGETS.includes(option.id), `expected ${option.id} to be a handoff target`);
    assert.equal(option.status, 'Candidate');
    assert.ok(option.bestFit.length > 0, `expected ${option.id} to explain best fit`);
    assert.ok(option.strengths.length >= 2, `expected ${option.id} to list strengths`);
    assert.ok(option.openGates.length >= 2, `expected ${option.id} to list open gates`);
    assert.ok(option.nextGate.length > 0, `expected ${option.id} to name the next gate`);
  }
  assert.ok(
    settingsBackend.BACKEND_STATUS_SUMMARY.nextGate.includes('auth/RLS or equivalent access rules'),
    'expected backend summary to require access-control rules before user data storage'
  );
});

test('settings backend migration contract requires ownership and provider shapes', () => {
  const contract = settingsMigration.buildBackendMigrationContract();
  const validation = settingsMigration.validateBackendMigrationContract(contract);

  assert.equal(contract.version, 1);
  assert.equal(contract.mode, 'contract-only');
  assert.equal(validation.ok, true);
  assert.deepEqual(Array.from(contract.targets), Array.from(settingsBackend.BACKEND_HANDOFF_TARGETS));
  assert.deepEqual(Array.from(contract.localStorageKeys), Array.from(settingsReset.LOCAL_DEMO_STORAGE_KEYS));
  assert.ok(contract.collections.length >= 4, 'expected user profile, snapshot, run, and learning collections');
  assert.ok(
    contract.collections.some((collection) => collection.id === 'financial_snapshots'),
    'expected financial snapshots collection'
  );
  assert.ok(
    contract.collections.some((collection) => collection.id === 'simulation_runs'),
    'expected simulation run history collection'
  );
  for (const collection of contract.collections) {
    assert.ok(collection.ownerRule.toLowerCase().includes('owner'), `expected ${collection.id} to define ownership`);
    assert.ok(collection.requiredFields.includes('owner_id'), `expected ${collection.id} to require owner_id`);
    for (const target of settingsBackend.BACKEND_HANDOFF_TARGETS) {
      assert.ok(collection.providerShape[target], `expected ${collection.id} to define ${target} shape`);
    }
  }
  assert.ok(
    contract.gates.some((gate) => gate.includes('owner-only')),
    'expected contract to require owner-only access rules'
  );
  const missingOwnerId = {
    ...contract,
    collections: contract.collections.map((collection) => collection.id === 'user_profiles'
      ? { ...collection, requiredFields: collection.requiredFields.filter((field) => field !== 'owner_id') }
      : collection),
  };
  assert.deepEqual(
    settingsMigration.validateBackendMigrationContract(missingOwnerId).error,
    'Backend collection user_profiles is missing owner_id.'
  );
  assert.deepEqual(
    settingsMigration.validateBackendMigrationContract({ ...contract, mode: 'live-wiring' }).error,
    'Backend migration contract must be contract-only before live backend wiring.'
  );
});

test('backup controls label local-only export and import replacement behavior', () => {
  const settingsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/settings/page.tsx'), 'utf8');
  const portfolioSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/portfolio/page.tsx'), 'utf8');

  for (const [name, source] of [
    ['Settings', settingsSource],
    ['Portfolio', portfolioSource],
  ]) {
    assert.ok(source.includes('Local backup only'), `expected ${name} backup copy to label local-only data`);
    assert.ok(
      source.includes('Import replaces the current local portfolio plan in this browser'),
      `expected ${name} backup copy to explain import replacement behavior`
    );
    assert.ok(
      source.includes('aria-label="Export local portfolio backup"'),
      `expected ${name} export control to have a specific accessible label`
    );
    assert.ok(
      source.includes('aria-label="Import local portfolio backup JSON"'),
      `expected ${name} import input to have a specific accessible label`
    );
  }

  assert.ok(
    settingsSource.includes('data-testid="settings-export-backup"'),
    'expected Settings export control to expose a stable smoke-test hook'
  );
  assert.ok(
    settingsSource.includes('data-testid="settings-import-backup-input"'),
    'expected Settings import input to expose a stable smoke-test hook'
  );
  assert.ok(
    settingsSource.includes('data-testid="settings-import-backup"'),
    'expected Settings visible import control to expose a stable file-chooser hook'
  );
  assert.ok(
    portfolioSource.includes('data-testid="portfolio-export-backup"'),
    'expected Portfolio export control to expose a stable smoke-test hook'
  );
  assert.ok(
    portfolioSource.includes('data-testid="portfolio-import-backup-input"'),
    'expected Portfolio import input to expose a stable smoke-test hook'
  );
  assert.ok(
    portfolioSource.includes('data-testid="portfolio-import-backup"'),
    'expected Portfolio visible import control to expose a stable file-chooser hook'
  );
  assert.ok(
    portfolioSource.includes('setImportStatus'),
    'expected Portfolio import results to render in-page instead of alert-only feedback'
  );
  assert.ok(
    !portfolioSource.includes('alert(res.error)'),
    'expected Portfolio import failures not to depend on alert-only feedback'
  );
});

test('backup controls expose a pasted JSON import path', () => {
  const settingsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/settings/page.tsx'), 'utf8');
  const portfolioSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/portfolio/page.tsx'), 'utf8');

  for (const [name, source, prefix] of [
    ['Settings', settingsSource, 'settings'],
    ['Portfolio', portfolioSource, 'portfolio'],
  ]) {
    assert.ok(source.includes('Paste backup JSON'), `expected ${name} to expose paste import copy`);
    assert.ok(source.includes('Import pasted JSON'), `expected ${name} to expose a paste import action`);
    assert.ok(
      source.includes(`data-testid="${prefix}-import-backup-json"`),
      `expected ${name} paste textarea to expose a stable smoke-test hook`
    );
    assert.ok(
      source.includes(`data-testid="${prefix}-import-backup-json-submit"`),
      `expected ${name} paste submit to expose a stable smoke-test hook`
    );
    assert.ok(
      source.includes('Paste backup JSON first.'),
      `expected ${name} empty paste imports to give direct in-page feedback`
    );
  }
});

test('settings exposes a local demo data reset path', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/settings/page.tsx'), 'utf8');

  assert.ok(source.includes('Reset local demo data'), 'expected Settings to expose a local data reset control');
  assert.ok(
    source.includes('data-testid="settings-reset-local-data"'),
    'expected reset control to have a stable smoke-test hook'
  );
  assert.ok(
    source.includes('clearLocalDemoData'),
    'expected Settings reset control to use the scoped local data reset helper'
  );
});

test('settings exposes a full local demo backend handoff snapshot path', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/settings/page.tsx'), 'utf8');

  assert.ok(source.includes('Backend handoff snapshot'), 'expected Settings to name the backend handoff snapshot');
  assert.ok(source.includes('exportLocalDemoSnapshot'), 'expected Settings to export the local demo handoff snapshot');
  assert.ok(source.includes('importLocalDemoSnapshot'), 'expected Settings to import the local demo handoff snapshot');
  assert.ok(
    source.includes('data-testid="settings-backend-handoff-snapshot"'),
    'expected Settings handoff snapshot section to have a stable hook'
  );
  assert.ok(
    source.includes('data-testid="settings-export-local-snapshot"'),
    'expected Settings handoff snapshot export to have a stable hook'
  );
  assert.ok(
    source.includes('data-testid="settings-import-local-snapshot-json"'),
    'expected Settings handoff snapshot import textarea to have a stable hook'
  );
  assert.ok(
    source.includes('data-testid="settings-backend-migration-contract"'),
    'expected Settings to disclose the backend migration contract in the handoff snapshot'
  );
});

test('settings local demo data reset clears only InterestShield storage keys', () => {
  const storage = createMemoryStorage();

  for (const key of settingsReset.LOCAL_DEMO_STORAGE_KEYS) {
    storage.setItem(key, 'demo-value');
  }
  storage.setItem('unrelated-app-key', 'keep-me');

  const result = settingsReset.clearLocalDemoData(storage);

  assert.equal(result.cleared, settingsReset.LOCAL_DEMO_STORAGE_KEYS.length);
  for (const key of settingsReset.LOCAL_DEMO_STORAGE_KEYS) {
    assert.equal(storage.getItem(key), null);
  }
  assert.equal(storage.getItem('unrelated-app-key'), 'keep-me');
});

test('settings full local demo snapshot exports only known InterestShield storage keys', () => {
  const storage = createMemoryStorage();
  storage.setItem('velocity-bank-storage', '{"state":{"monthlyIncome":6500}}');
  storage.setItem('interestshield-portfolio-v1', '{"state":{"strategy":"velocity"}}');
  storage.setItem('unrelated-app-key', 'keep-me');

  const result = settingsSnapshot.exportLocalDemoSnapshot(storage);
  assert.equal(result.ok, true);
  assert.equal(result.count, 2);

  const parsed = JSON.parse(result.json);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.mode, 'local-demo');
  assert.deepEqual(parsed.backendTargets, Array.from(settingsBackend.BACKEND_HANDOFF_TARGETS));
  assert.equal(parsed.backendMigrationContract.version, 1);
  assert.equal(parsed.backendMigrationContract.mode, 'contract-only');
  assert.equal(settingsMigration.validateBackendMigrationContract(parsed.backendMigrationContract).ok, true);
  assert.equal(parsed.storage.length, 2);
  assert.deepEqual(
    parsed.storage.map((entry) => entry.key).sort(),
    ['interestshield-portfolio-v1', 'velocity-bank-storage']
  );
  assert.ok(!result.json.includes('unrelated-app-key'));
});

test('settings full local demo snapshot import rejects unknown storage keys without mutating storage', () => {
  const storage = createMemoryStorage();
  storage.setItem('velocity-bank-storage', 'keep-original');

  const result = settingsSnapshot.importLocalDemoSnapshot(JSON.stringify({
    version: 1,
    storage: [
      { key: 'velocity-bank-storage', value: '{"state":{"monthlyIncome":6500}}' },
      { key: 'unknown-app-key', value: 'bad' },
    ],
  }), storage);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Snapshot contains an unknown storage key.');
  assert.equal(storage.getItem('velocity-bank-storage'), 'keep-original');
});

test('settings full local demo snapshot import rejects an invalid backend migration contract', () => {
  const storage = createMemoryStorage();
  storage.setItem('velocity-bank-storage', 'keep-original');

  const contract = settingsMigration.buildBackendMigrationContract();
  const result = settingsSnapshot.importLocalDemoSnapshot(JSON.stringify({
    version: 1,
    backendMigrationContract: {
      ...contract,
      targets: ['supabase-postgres-auth-rls'],
    },
    storage: [
      { key: 'velocity-bank-storage', value: '{"state":{"monthlyIncome":6500}}' },
    ],
  }), storage);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Backend migration contract targets do not match configured handoff targets.');
  assert.equal(storage.getItem('velocity-bank-storage'), 'keep-original');
});

test('settings full local demo snapshot import replaces only known InterestShield storage keys', () => {
  const storage = createMemoryStorage();
  storage.setItem('velocity-bank-storage', 'old');
  storage.setItem('interestshield-theme', 'old-theme');
  storage.setItem('unrelated-app-key', 'keep-me');

  const result = settingsSnapshot.importLocalDemoSnapshot(JSON.stringify({
    version: 1,
    mode: 'local-demo',
    storage: [
      { key: 'interestshield-theme', value: '{"state":{"theme":"dark"}}' },
      { key: 'interestshield-preferences-v1', value: '{"state":{"teacherMode":true}}' },
    ],
  }), storage);

  assert.equal(result.ok, true);
  assert.equal(result.imported, 2);
  assert.equal(storage.getItem('velocity-bank-storage'), null);
  assert.equal(storage.getItem('interestshield-theme'), '{"state":{"theme":"dark"}}');
  assert.equal(storage.getItem('interestshield-preferences-v1'), '{"state":{"teacherMode":true}}');
  assert.equal(storage.getItem('unrelated-app-key'), 'keep-me');
});

test('editable financial controls expose contextual screen-reader labels', () => {
  const componentSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/EditableNumber.tsx'), 'utf8');
  const dashboardSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/page.tsx'), 'utf8');

  assert.ok(
    componentSource.includes('ariaLabel?: string'),
    'expected EditableNumber to accept a caller-provided screen-reader label'
  );
  assert.ok(
    componentSource.includes('aria-label={editLabel}'),
    'expected editable display buttons to expose a contextual edit label'
  );
  assert.ok(
    componentSource.includes('aria-label={inputLabel}'),
    'expected edit-mode inputs to expose a contextual input label'
  );
  assert.ok(
    dashboardSource.includes('ariaLabel="Monthly income"'),
    'expected Dashboard income editor to provide a contextual label'
  );
  assert.ok(
    dashboardSource.includes('ariaLabel="Monthly expenses"'),
    'expected Dashboard expenses editor to provide a contextual label'
  );
  assert.ok(
    dashboardSource.includes('ariaLabel="Velocity chunk amount"'),
    'expected Dashboard chunk editor to provide a contextual label'
  );
});

test('simulator editable controls expose contextual screen-reader labels', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/simulator/page.tsx'), 'utf8');

  assert.ok(source.includes('ariaLabel="Simulator monthly income"'), 'expected Simulator income editor label');
  assert.ok(source.includes('ariaLabel="Simulator monthly expenses"'), 'expected Simulator expenses editor label');
  assert.ok(source.includes('ariaLabel={`${domainName} balance`}'), 'expected Simulator active debt balance label');
  assert.ok(source.includes('ariaLabel={`${domainName} APR`}'), 'expected Simulator active debt APR label');
  assert.ok(source.includes('ariaLabel={`${domainName} monthly payment`}'), 'expected Simulator active debt payment label');
  assert.ok(source.includes('ariaLabel="Simulator line of credit limit"'), 'expected Simulator LOC limit label');
  assert.ok(source.includes('ariaLabel="Simulator line of credit APR"'), 'expected Simulator LOC APR label');
  assert.ok(source.includes('ariaLabel="Simulator extra payment chunk"'), 'expected Simulator chunk label');
  assert.ok(source.includes('ariaLabel="Mortgage purchase price"'), 'expected mortgage purchase detail label');
  assert.ok(source.includes('ariaLabel="Mortgage current balance"'), 'expected mortgage current balance label');
});

test('portfolio editable controls expose contextual screen-reader labels', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/portfolio/page.tsx'), 'utf8');

  assert.ok(source.includes('ariaLabel="Portfolio monthly income"'), 'expected Portfolio income editor label');
  assert.ok(source.includes('ariaLabel="Portfolio monthly expenses"'), 'expected Portfolio expenses editor label');
  assert.ok(source.includes('ariaLabel="Portfolio extra debt payment"'), 'expected Portfolio extra payment label');
  assert.ok(source.includes('ariaLabel="Portfolio line of credit limit"'), 'expected Portfolio LOC limit label');
  assert.ok(source.includes('ariaLabel="Portfolio line of credit balance"'), 'expected Portfolio LOC balance label');
  assert.ok(source.includes('ariaLabel="Portfolio line of credit APR"'), 'expected Portfolio LOC APR label');
  assert.ok(source.includes('ariaLabel="Portfolio velocity chunk"'), 'expected Portfolio chunk label');
  assert.ok(source.includes('ariaLabel={`${d.name} balance`}'), 'expected Portfolio debt balance label');
  assert.ok(source.includes('ariaLabel={`${d.name} APR`}'), 'expected Portfolio debt APR label');
  assert.ok(source.includes('ariaLabel={`${d.name} minimum payment`}'), 'expected Portfolio debt minimum label');
  assert.ok(source.includes('ariaLabel="New debt balance"'), 'expected add-debt balance label');
  assert.ok(source.includes('ariaLabel="New debt APR"'), 'expected add-debt APR label');
  assert.ok(source.includes('ariaLabel="New debt minimum payment"'), 'expected add-debt minimum payment label');
});

test('vault and cockpit editable controls expose contextual screen-reader labels', () => {
  const vaultSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/vault/page.tsx'), 'utf8');
  const cockpitSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/cockpit/page.tsx'), 'utf8');

  assert.ok(vaultSource.includes('ariaLabel="Vault age at purchase"'), 'expected Vault purchase age label');
  assert.ok(vaultSource.includes('ariaLabel="Vault purchase price"'), 'expected Vault purchase price label');
  assert.ok(vaultSource.includes('ariaLabel="Vault down payment"'), 'expected Vault down payment label');
  assert.ok(vaultSource.includes('ariaLabel="Vault original rate"'), 'expected Vault original rate label');
  assert.ok(vaultSource.includes('ariaLabel="Vault current age"'), 'expected Vault current age label');
  assert.ok(vaultSource.includes('ariaLabel="Vault current balance"'), 'expected Vault current balance label');
  assert.ok(vaultSource.includes('ariaLabel="Vault remaining years"'), 'expected Vault remaining years label');
  assert.ok(vaultSource.includes('ariaLabel="Vault current rate"'), 'expected Vault current rate label');
  assert.ok(vaultSource.includes('ariaLabel="Vault monthly payment"'), 'expected Vault monthly payment label');
  assert.ok(vaultSource.includes('ariaLabel="Vault extra payment amount"'), 'expected Vault extra payment label');
  assert.ok(vaultSource.includes('ariaLabel="Vault refinance count"'), 'expected Vault refinance count label');
  assert.ok(vaultSource.includes('ariaLabel="Vault investment return rate"'), 'expected Vault investment return label');

  assert.ok(cockpitSource.includes('const activeDomainLabel ='), 'expected Cockpit to derive a reusable active-domain label');
  assert.ok(cockpitSource.includes('ariaLabel="Cockpit airspeed cash flow"'), 'expected Cockpit airspeed label');
  assert.ok(cockpitSource.includes('aria-label="Cockpit monthly income slider"'), 'expected Cockpit income slider label');
  assert.ok(cockpitSource.includes('ariaLabel="Cockpit monthly income"'), 'expected Cockpit income editor label');
  assert.ok(cockpitSource.includes('aria-label="Cockpit monthly expenses slider"'), 'expected Cockpit expenses slider label');
  assert.ok(cockpitSource.includes('ariaLabel="Cockpit monthly expenses"'), 'expected Cockpit expenses editor label');
  assert.ok(cockpitSource.includes('aria-label="Cockpit chunk size slider"'), 'expected Cockpit chunk slider label');
  assert.ok(cockpitSource.includes('ariaLabel="Cockpit chunk size"'), 'expected Cockpit chunk editor label');
  assert.ok(cockpitSource.includes('ariaLabel={`Cockpit ${activeDomainLabel} balance`}'), 'expected Cockpit active debt balance label');
  assert.ok(cockpitSource.includes('ariaLabel={`Cockpit ${activeDomainLabel} interest rate`}'), 'expected Cockpit active debt APR label');
  assert.ok(cockpitSource.includes('ariaLabel={`Cockpit ${activeDomainLabel} minimum payment`}'), 'expected Cockpit active debt minimum label');
});

test('portfolio simulation explains each debt priority with money-loop rationale', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'promo-card',
        name: 'Promo Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 5000,
        apr: 0.24,
        minPaymentRule: { type: 'fixed', amount: 150 },
        paymentSource: 'either',
        promo: { introApr: 0, monthsRemaining: 2, postIntroApr: 0.24 },
      },
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 14000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 1,
  });

  const rationale = result.debtRationales['promo-card'];

  assert.ok(rationale, 'expected debtRationales keyed by debt id');
  assert.equal(rationale.monthlyPaymentUnlock, 150);
  assert.equal(roundCents(rationale.dailyInterestBurn), roundCents(5000 * 0.24 / 365));
  assert.equal(rationale.promoUrgency?.monthsRemaining, 2);
  assert.ok(rationale.summary.includes('cash-flow unlock'), rationale.summary);
  assert.ok(rationale.points.some((point) => point.includes('Daily burn')), rationale.points.join(' | '));
  assert.ok(rationale.points.some((point) => point.includes('LOC utilization')), rationale.points.join(' | '));
});

test('portfolio debt rationales do not leak non-finite display values', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'corrupt-card',
        name: 'Corrupt Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 5000,
        apr: Number.NaN,
        minPaymentRule: { type: 'fixed', amount: Number.POSITIVE_INFINITY },
        paymentSource: 'checking',
        promo: { introApr: Number.NaN, monthsRemaining: 2, postIntroApr: Number.POSITIVE_INFINITY },
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 1,
  });

  const rationale = result.debtRationales['corrupt-card'];

  assert.ok(rationale, 'expected a rationale even when source debt values need review');

  const displayText = [rationale.summary, ...rationale.points, ...result.warnings].join(' | ');

  assert.ok(!displayText.includes('NaN'), displayText);
  assert.ok(!displayText.includes('Infinity'), displayText);
  assert.ok(displayText.includes('$0'), displayText);
  assert.ok(displayText.includes('0.00%'), displayText);
});

test('portfolio velocity labels its ranking assumptions instead of implying LOC math', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 5000,
    monthlyExpenses: 3500,
    extraMonthlyPayment: 0,
    debts: [
      {
        id: 'card',
        name: 'Credit Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 5000,
        apr: 0.24,
        minPaymentRule: { type: 'fixed', amount: 150 },
        paymentSource: 'either',
      },
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 14000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 1,
  });

  assert.ok(Array.isArray(result.assumptions), 'expected portfolio result assumptions');
  assert.ok(
    result.assumptions.some((note) => note.includes('ranking planner')),
    result.assumptions.join(' | ')
  );
  assert.ok(
    result.assumptions.some((note) => note.includes('does not simulate LOC chunk draws or LOC interest')),
    result.assumptions.join(' | ')
  );
});

test('portfolio velocity uses shared Money Loop LOC math when LOC inputs are present', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    extraMonthlyPayment: 0,
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
    chunkAmount: 1000,
    debts: [
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 14000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 1,
  });

  const firstMonth = result.moneyLoopMonthlyData[0];
  const debtInterestOnly = result.monthResults.reduce(
    (sum, month) => sum + Object.values(month.interestCharges).reduce((monthSum, value) => monthSum + value, 0),
    0
  );

  assert.ok(firstMonth, 'expected portfolio velocity to expose Money Loop monthly data');
  assert.equal(
    firstMonth.events.map((event) => event.type).join('|'),
    'debt-interest|loc-chunk-draw|debt-payment|income-to-loc|expenses-from-loc|loc-interest|loc-cashflow-paydown'
  );
  assert.equal(firstMonth.events.find((event) => event.type === 'loc-chunk-draw').amount, 1000);
  assert.ok(result.locInterestPaid > 0, `expected LOC interest, got ${result.locInterestPaid}`);
  assert.equal(roundCents(firstMonth.locInterest), roundCents(result.locInterestPaid));
  assert.equal(roundCents(result.totalInterest), roundCents(debtInterestOnly + result.locInterestPaid));
  assert.ok(
    result.assumptions.some((note) => note.includes('simulates LOC chunk draws and LOC interest')),
    result.assumptions.join(' | ')
  );
  assert.ok(
    result.assumptions.every((note) => !note.includes('does not simulate LOC chunk draws or LOC interest')),
    result.assumptions.join(' | ')
  );
});

test('portfolio velocity refuses over-limit LOC projections instead of ignoring the line', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    extraMonthlyPayment: 0,
    loc: {
      limit: 10000,
      apr: 0.085,
      balance: 10500,
    },
    chunkAmount: 1000,
    debts: [
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 14000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 24,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-overlimit');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.locInterestPaid, 0);
  assert.equal(result.moneyLoopMonthlyData.length, 0);
  assert.ok(
    result.warnings.some((warning) => warning.includes('LOC balance is above the available limit')),
    result.warnings.join(' | ')
  );
  assert.ok(
    !result.warnings.some((warning) => warning.includes('LOC utilization: use the LOC lane only while utilization stays under 80%')),
    result.warnings.join(' | ')
  );
});

test('portfolio velocity treats a full LOC as no available room instead of over-limit', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    extraMonthlyPayment: 0,
    loc: {
      limit: 10000,
      apr: 0.085,
      balance: 10000,
    },
    chunkAmount: 1000,
    debts: [
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 14000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 24,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-no-capacity');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.locInterestPaid, 0);
  assert.equal(result.moneyLoopMonthlyData.length, 0);
  assert.ok(
    result.warnings.some((warning) => warning.includes('LOC balance is at the available limit')),
    result.warnings.join(' | ')
  );
});

test('portfolio velocity treats an existing LOC balance without a limit as setup needed', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    extraMonthlyPayment: 0,
    loc: {
      limit: 0,
      apr: 0.085,
      balance: 3200,
    },
    chunkAmount: 1000,
    debts: [
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 14000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 24,
  });

  assert.equal(result.isPayoffPossible, false);
  assert.equal(result.failureReason, 'loc-setup');
  assert.equal(result.payoffMonths, 0);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.locInterestPaid, 0);
  assert.equal(result.moneyLoopMonthlyData.length, 0);
  assert.ok(
    result.warnings.some((warning) => warning.includes('LOC balance is present, but the limit is missing')),
    result.warnings.join(' | ')
  );
  assert.ok(
    result.warnings.every((warning) => !warning.includes('Infinity') && !warning.includes('NaN')),
    result.warnings.join(' | ')
  );
});

test('portfolio velocity warns when LOC utilization is high but still available', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    extraMonthlyPayment: 0,
    loc: {
      limit: 10000,
      apr: 0.085,
      balance: 9000,
    },
    chunkAmount: 1000,
    debts: [
      {
        id: 'auto',
        name: 'Auto Loan',
        category: 'auto',
        kind: 'amortized',
        balance: 1000,
        apr: 0.08,
        minPaymentRule: { type: 'fixed', amount: 390 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 120,
  });

  assert.ok(result.moneyLoopMonthlyData.length > 0, 'expected high-but-available LOC to keep Money Loop math active');
  assert.ok(
    result.warnings.some((warning) => warning.includes('LOC is over 80% utilized')),
    result.warnings.join(' | ')
  );
  assert.ok(
    !result.warnings.some((warning) => warning.includes('above the available limit') || warning.includes('limit is missing')),
    result.warnings.join(' | ')
  );
  assert.equal(result.failureReason, undefined);
});

test('portfolio velocity treats target debt payments as cash outflows for LOC recovery', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 1000,
    monthlyExpenses: 700,
    extraMonthlyPayment: 0,
    loc: {
      limit: 10000,
      apr: 0,
      balance: 1000,
    },
    chunkAmount: 1,
    debts: [
      {
        id: 'simple',
        name: 'Simple Loan',
        category: 'personal_loan',
        kind: 'simple',
        balance: 10000,
        apr: 0,
        minPaymentRule: { type: 'fixed', amount: 100 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 1,
  });

  const firstMonth = result.moneyLoopMonthlyData[0];
  const chunkDraw = firstMonth.events.find((event) => event.type === 'loc-chunk-draw');

  assert.ok(chunkDraw, 'expected a tiny LOC chunk so the LOC recovery math is visible');
  assert.equal(roundCents(firstMonth.locBalance), 1001);
  assert.equal(roundCents(firstMonth.cashFlowPaydown), 0);
});

test('portfolio velocity includes LOC recovery after the final debt payoff', () => {
  const result = portfolio.simulatePortfolio({
    monthlyIncome: 1000,
    monthlyExpenses: 850,
    extraMonthlyPayment: 0,
    loc: {
      limit: 1000,
      apr: 0,
      balance: 0,
    },
    chunkAmount: 100,
    debts: [
      {
        id: 'simple',
        name: 'Simple Loan',
        category: 'personal_loan',
        kind: 'simple',
        balance: 100,
        apr: 0,
        minPaymentRule: { type: 'fixed', amount: 100 },
        paymentSource: 'checking',
      },
    ],
    settings: {
      strategy: 'velocity',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
    },
    maxMonths: 12,
  });

  assert.equal(result.payoffOrder[0].monthPaidOff, 1);
  assert.equal(result.payoffMonths, 2);
  assert.equal(result.isPayoffPossible, true);
});

test('portfolio store passes LOC and chunk inputs into portfolio simulation', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/stores/portfolio-store.ts'), 'utf8');

  assert.ok(source.includes('loc: state.loc'), 'expected portfolio store to pass LOC details into simulatePortfolio');
  assert.ok(source.includes('chunkAmount: state.chunkAmount'), 'expected portfolio store to pass chunk amount into simulatePortfolio');
  assert.ok(source.includes('updateLOC:'), 'expected portfolio store to expose LOC editing for the route');
});

test('portfolio store records a comparison against the previous run', () => {
  const store = portfolioStore.usePortfolioStore.getState();
  const original = store.exportState();
  const scenario = {
    version: 1,
    data: {
      monthlyIncome: 5000,
      monthlyExpenses: 3600,
      extraMonthlyPayment: 0,
      chunkAmount: 1000,
      loc: { limit: 25000, balance: 0, apr: 0.085 },
      strategy: 'avalanche',
      focusMode: 'single',
      splitRatioPrimary: 0.7,
      debts: [{
        id: 'comparison-card',
        name: 'Comparison Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 14000,
        apr: 0.199,
        minPaymentRule: { type: 'fixed', amount: 320 },
        paymentSource: 'checking',
        createdAt: '2026-06-16T00:00:00.000Z',
      }],
    },
  };

  try {
    portfolioStore.usePortfolioStore.setState({
      lastResult: undefined,
      lastRunSummary: undefined,
      lastRunComparison: undefined,
    });

    const importResult = portfolioStore.usePortfolioStore.getState().importState(JSON.stringify(scenario));
    assert.equal(importResult.ok, true);
    assert.equal(portfolioStore.usePortfolioStore.getState().lastRunComparison.status, 'baseline');

    portfolioStore.usePortfolioStore.getState().setExtraMonthlyPayment(250);
    const comparison = portfolioStore.usePortfolioStore.getState().lastRunComparison;

    assert.equal(comparison.status, 'changed');
    assert.ok(
      comparison.changes.some((change) => change.id === 'payoff-months' && change.direction === 'improved'),
      JSON.stringify(comparison.changes)
    );
    assert.ok(
      comparison.changes.some((change) => change.id === 'total-interest' && change.direction === 'improved'),
      JSON.stringify(comparison.changes)
    );
  } finally {
    portfolioStore.usePortfolioStore.getState().importState(original);
    portfolioStore.usePortfolioStore.setState({
      lastResult: undefined,
      lastRunSummary: undefined,
      lastRunComparison: undefined,
    });
  }
});

test('portfolio backup export and import preserve Money Loop planning inputs', () => {
  const store = portfolioStore.usePortfolioStore.getState();
  const original = store.exportState();
  const backup = {
    version: 1,
    data: {
      monthlyIncome: 8123,
      monthlyExpenses: 5123,
      extraMonthlyPayment: 222,
      chunkAmount: 1450,
      loc: { limit: 32000, balance: 4100, apr: 0.0925 },
      strategy: 'velocity',
      focusMode: 'split',
      splitRatioPrimary: 0.55,
      debts: [{
        id: 'backup-card',
        name: 'Backup Card',
        category: 'credit_card',
        kind: 'revolving',
        balance: 7200,
        apr: 0.199,
        minPaymentRule: { type: 'percent', percent: 0.03, floor: 45 },
        paymentSource: 'either',
        createdAt: '2026-06-09T00:00:00.000Z',
      }],
    },
  };

  try {
    const result = store.importState(JSON.stringify(backup));
    assert.equal(result.ok, true);

    const exported = JSON.parse(store.exportState()).data;
    assert.equal(exported.monthlyIncome, 8123);
    assert.equal(exported.monthlyExpenses, 5123);
    assert.equal(exported.chunkAmount, 1450);
    assert.deepEqual(exported.loc, backup.data.loc);
    assert.equal(exported.focusMode, 'split');
    assert.equal(exported.splitRatioPrimary, 0.55);
    assert.equal(exported.debts[0].name, 'Backup Card');
    assert.equal(exported.debts[0].minPaymentRule.percent, 0.03);
  } finally {
    store.importState(original);
  }
});

test('portfolio backup import rejects non-finite money inputs without corrupting state', () => {
  const store = portfolioStore.usePortfolioStore.getState();
  const original = store.exportState();
  const originalData = JSON.parse(original).data;

  try {
    const result = store.importState(JSON.stringify({
      version: 1,
      data: {
        monthlyIncome: 'not-a-number',
        monthlyExpenses: 5000,
        debts: [{
          id: 'bad-import',
          name: 'Bad Import',
          category: 'auto',
          kind: 'amortized',
          balance: 10000,
          apr: 0.065,
          minPaymentRule: { type: 'fixed', amount: 300 },
          paymentSource: 'checking',
        }],
      },
    }));

    assert.equal(result.ok, false);
    assert.match(result.error, /monthly income/i);
    assert.equal(portfolioStore.usePortfolioStore.getState().monthlyIncome, originalData.monthlyIncome);
  } finally {
    store.importState(original);
  }
});

test('portfolio persisted state sanitizes corrupt browser storage before hydration', () => {
  const store = portfolioStore.usePortfolioStore.getState();
  const current = JSON.parse(store.exportState()).data;

  const sanitized = portfolioStore.sanitizePersistedPortfolioState({
    monthlyIncome: 'not-a-number',
    monthlyExpenses: -250,
    extraMonthlyPayment: Number.POSITIVE_INFINITY,
    chunkAmount: Number.NaN,
    loc: {
      limit: 'missing',
      balance: -400,
      apr: 'bad-apr',
    },
    strategy: 'magic',
    focusMode: 'all',
    splitRatioPrimary: 5,
    debts: [{
      id: 'corrupt-debt',
      name: 'Corrupt Debt',
      category: 'auto',
      kind: 'amortized',
      balance: 'not-a-number',
      apr: 0.07,
      minPaymentRule: { type: 'fixed', amount: 300 },
      paymentSource: 'checking',
    }],
  }, store);

  assert.equal(sanitized.monthlyIncome, current.monthlyIncome);
  assert.equal(sanitized.monthlyExpenses, 0);
  assert.equal(sanitized.extraMonthlyPayment, current.extraMonthlyPayment);
  assert.equal(sanitized.chunkAmount, current.chunkAmount);
  assert.equal(sanitized.loc.limit, current.loc.limit);
  assert.equal(sanitized.loc.balance, 0);
  assert.equal(sanitized.loc.apr, current.loc.apr);
  assert.equal(sanitized.strategy, 'velocity');
  assert.equal(sanitized.focusMode, 'single');
  assert.equal(sanitized.splitRatioPrimary, 1);
  assert.equal(sanitized.debts.length, current.debts.length);
  assert.equal(sanitized.debts[0].name, current.debts[0].name);
});

test('financial persisted state sanitizes corrupt browser storage before hydration', () => {
  const store = financialStore.useFinancialStore.getState();

  const sanitized = financialStore.sanitizePersistedFinancialState({
    monthlyIncome: 'bad-income',
    monthlyExpenses: -900,
    currentAge: 'old',
    activeDomain: 'crypto',
    activeSubcategories: {
      car: 'not-a-real-subcategory',
      house: 'family',
    },
    debts: {
      car: {
        id: '',
        type: 'crypto',
        name: '',
        balance: 'bad-balance',
        interestRate: -0.2,
        minimumPayment: Number.POSITIVE_INFINITY,
        termMonths: Number.NaN,
      },
    },
    loc: {
      limit: 'bad-limit',
      balance: -250,
      interestRate: 'bad-rate',
    },
    chunkAmount: Number.POSITIVE_INFINITY,
    chunkFrequency: 'hourly',
    mortgageDetails: {
      entryMode: 'invalid',
      originalCost: 'bad-cost',
      downPayment: -500,
      currentMonthlyPayment: Number.NaN,
      paymentFrequency: 'daily',
      hasExtraPayments: 'yes',
    },
  }, store);

  assert.equal(sanitized.monthlyIncome, store.monthlyIncome);
  assert.equal(sanitized.monthlyExpenses, 0);
  assert.equal(sanitized.currentAge, store.currentAge);
  assert.equal(sanitized.activeDomain, store.activeDomain);
  assert.equal(sanitized.activeSubcategories.car, store.activeSubcategories.car);
  assert.equal(sanitized.activeSubcategories.house, 'family');
  assert.equal(sanitized.debts.car.id, store.debts.car.id);
  assert.equal(sanitized.debts.car.type, 'car');
  assert.equal(sanitized.debts.car.name, store.debts.car.name);
  assert.equal(sanitized.debts.car.balance, store.debts.car.balance);
  assert.equal(sanitized.debts.car.interestRate, 0);
  assert.equal(sanitized.debts.car.minimumPayment, store.debts.car.minimumPayment);
  assert.equal(sanitized.debts.car.termMonths, store.debts.car.termMonths);
  assert.equal(sanitized.loc.limit, store.loc.limit);
  assert.equal(sanitized.loc.balance, 0);
  assert.equal(sanitized.loc.interestRate, store.loc.interestRate);
  assert.equal(sanitized.chunkAmount, store.chunkAmount);
  assert.equal(sanitized.chunkFrequency, store.chunkFrequency);
  assert.equal(sanitized.mortgageDetails.entryMode, store.mortgageDetails.entryMode);
  assert.equal(sanitized.mortgageDetails.downPayment, 0);
  assert.equal(sanitized.mortgageDetails.paymentFrequency, store.mortgageDetails.paymentFrequency);
  assert.equal(sanitized.mortgageDetails.hasExtraPayments, store.mortgageDetails.hasExtraPayments);
});

test('dashboard payoff helpers use the canonical single-debt engine', () => {
  const store = financialStore.useFinancialStore.getState();
  const debt = store.debts.car;
  const inputs = {
    monthlyIncome: store.monthlyIncome,
    monthlyExpenses: store.monthlyExpenses,
    carLoan: {
      balance: debt.balance,
      apr: debt.interestRate,
      monthlyPayment: debt.minimumPayment,
      termMonths: debt.termMonths,
    },
    loc: {
      limit: store.loc.limit,
      apr: store.loc.interestRate,
      balance: store.loc.balance,
    },
    useVelocity: true,
    extraPayment: store.chunkAmount,
  };

  const expectedBaseline = calculations.simulateBaseline(inputs);
  const expectedVelocity = calculations.simulateVelocity(inputs);
  const actualBaseline = store.getBaselinePayoff('car');
  const actualVelocity = store.getVelocityPayoff('car');

  assert.equal(actualBaseline.months, expectedBaseline.payoffMonths);
  assert.equal(roundCents(actualBaseline.totalInterest), roundCents(expectedBaseline.totalInterest));
  assert.equal(actualVelocity.months, expectedVelocity.payoffMonths);
  assert.equal(roundCents(actualVelocity.totalInterest), roundCents(expectedVelocity.totalInterest));
  assert.equal(
    roundCents(actualVelocity.savings),
    roundCents(Math.max(0, expectedBaseline.totalInterest - expectedVelocity.totalInterest))
  );
});

test('single-debt strategy comparison keeps velocity aligned with runSimulation', () => {
  const inputs = {
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
      termMonths: 48,
    },
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
    useVelocity: true,
    extraPayment: 1000,
  };

  const runResult = calculations.runSimulation(inputs);
  const comparison = calculations.compareSingleDebtStrategies(inputs);
  const traditional = comparison.find((strategy) => strategy.name === 'Traditional');
  const velocity = comparison.find((strategy) => strategy.name === 'Velocity');

  assert.ok(traditional, 'expected a Traditional strategy result');
  assert.ok(velocity, 'expected a Velocity strategy result');
  assert.equal(traditional.months, runResult.baseline.payoffMonths);
  assert.equal(roundCents(traditional.totalInterest), roundCents(runResult.baseline.totalInterest));
  assert.equal(velocity.months, runResult.velocity.payoffMonths);
  assert.equal(roundCents(velocity.totalInterest), roundCents(runResult.velocity.totalInterest));
});

test('single-debt velocity exposes a transparent monthly event ledger', () => {
  const result = calculations.simulateVelocity({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
      termMonths: 48,
    },
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
    useVelocity: true,
    extraPayment: 1000,
  });

  const firstMonth = result.monthlyData[0];

  assert.ok(firstMonth, 'expected first month simulation data');
  assert.ok(Array.isArray(firstMonth.events), 'expected monthly data to include an event ledger');
  assert.equal(
    firstMonth.events.map((event) => event.type).join('|'),
    'debt-interest|loc-chunk-draw|debt-payment|income-to-loc|expenses-from-loc|loc-interest|loc-cashflow-paydown'
  );
  assert.equal(firstMonth.events.find((event) => event.type === 'loc-chunk-draw').amount, 1000);
  assert.equal(
    roundCents(firstMonth.events.find((event) => event.type === 'loc-interest').amount),
    roundCents(firstMonth.locInterest)
  );
});

test('shared money-loop payoff engine emits the canonical LOC event ledger', () => {
  const moneyLoop = loadTsModule('src/engine/money-loop.ts');
  const result = moneyLoop.simulateMoneyLoopPayoff({
    principalBalance: 18450,
    debtApr: 0.069,
    debtPayment: 425,
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
    chunkAmount: 1000,
    cashFlowPaydown: 1500,
    locDepositAmount: 6500,
    locExpenseAmount: 5000,
    maxMonths: 600,
    initialMonthsSinceChunk: 0,
  });

  const firstMonth = result.monthlyData[0];

  assert.equal(result.isPayoffPossible, true);
  assert.ok(firstMonth, 'expected first month simulation data');
  assert.equal(
    firstMonth.events.map((event) => event.type).join('|'),
    'debt-interest|loc-chunk-draw|debt-payment|income-to-loc|expenses-from-loc|loc-interest|loc-cashflow-paydown'
  );
  assert.equal(firstMonth.events.find((event) => event.type === 'loc-chunk-draw').amount, 1000);
  assert.equal(
    roundCents(firstMonth.events.find((event) => event.type === 'loc-interest').amount),
    roundCents(firstMonth.locInterest)
  );
});

test('simulator strategy cards preserve invalid payoff states instead of claiming zero-month wins', () => {
  const comparison = calculations.compareSingleDebtStrategies({
    monthlyIncome: 4000,
    monthlyExpenses: 4500,
    carLoan: {
      balance: 18450,
      apr: 0.069,
      monthlyPayment: 425,
      termMonths: 48,
    },
    loc: {
      limit: 25000,
      apr: 0.085,
      balance: 3200,
    },
    useVelocity: true,
    extraPayment: 1000,
  });

  const cards = simulatorModel.buildSimulatorStrategyCards(comparison);
  const velocity = cards.find((card) => card.name === 'Velocity');

  assert.equal(cards.length, 4);
  assert.equal(velocity.isPayoffPossible, false);
  assert.equal(velocity.months, 0);
  assert.equal(velocity.monthsLabel, 'Review inputs');
  assert.equal(velocity.interestLabel, 'Not projected');
  assert.equal(velocity.statusLabel, 'Needs positive cash flow');
});

test('simulator strategy cards explain over-limit LOC failures plainly', () => {
  const cards = simulatorModel.buildSimulatorStrategyCards([
    {
      name: 'Traditional',
      months: 51,
      totalInterest: 2800,
      isPayoffPossible: true,
    },
    {
      name: 'Velocity',
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    },
  ]);
  const velocity = cards.find((card) => card.name === 'Velocity');

  assert.equal(velocity.monthsLabel, 'Review inputs');
  assert.equal(velocity.interestLabel, 'Not projected');
  assert.equal(velocity.statusLabel, 'LOC over limit');
  assert.equal(velocity.icon, '⚡');
});

test('simulator strategy cards explain missing LOC limit failures plainly', () => {
  const cards = simulatorModel.buildSimulatorStrategyCards([
    {
      name: 'Traditional',
      months: 51,
      totalInterest: 2800,
      isPayoffPossible: true,
    },
    {
      name: 'Velocity',
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-setup',
    },
  ]);
  const velocity = cards.find((card) => card.name === 'Velocity');

  assert.equal(velocity.monthsLabel, 'Review inputs');
  assert.equal(velocity.interestLabel, 'Not projected');
  assert.equal(velocity.statusLabel, 'Add LOC limit');
});

test('simulator strategy cards explain full LOC failures without calling them over-limit', () => {
  const cards = simulatorModel.buildSimulatorStrategyCards([
    {
      name: 'Traditional',
      months: 51,
      totalInterest: 2800,
      isPayoffPossible: true,
    },
    {
      name: 'Velocity',
      months: 0,
      totalInterest: 0,
      isPayoffPossible: false,
      failureReason: 'loc-no-capacity',
    },
  ]);
  const velocity = cards.find((card) => card.name === 'Velocity');

  assert.equal(velocity.monthsLabel, 'Review inputs');
  assert.equal(velocity.interestLabel, 'Not projected');
  assert.equal(velocity.statusLabel, 'No LOC room');
});

test('simulator warnings treat a missing LOC limit as setup needed instead of high utilization', () => {
  assert.equal(
    typeof simulatorModel.buildSimulatorWarnings,
    'function',
    'expected simulator warnings to be built by a presentation model helper'
  );

  const warnings = simulatorModel.buildSimulatorWarnings({
    cashFlow: 1500,
    loc: {
      limit: 0,
      balance: 3200,
    },
  });

  assert.ok(warnings.some((warning) => warning.kind === 'loc-setup'));
  assert.ok(!warnings.some((warning) => warning.kind === 'loc-utilization'));
  assert.equal(warnings.find((warning) => warning.kind === 'loc-setup').title, 'Add LOC limit');
  assert.equal(
    warnings.find((warning) => warning.kind === 'loc-setup').body,
    'A LOC balance is present, but the limit is missing. Enter a limit before trusting utilization or chunk projections.'
  );
});

test('simulator warnings treat an exact-full LOC as no available room', () => {
  const warnings = simulatorModel.buildSimulatorWarnings({
    cashFlow: 1500,
    loc: {
      limit: 10000,
      balance: 10000,
    },
  });

  assert.ok(
    warnings.some(
      (warning) =>
        warning.kind === 'loc-no-capacity' &&
        warning.title === 'No LOC room available' &&
        warning.body.includes('at the entered limit')
    ),
    JSON.stringify(warnings)
  );
  assert.ok(!warnings.some((warning) => warning.kind === 'loc-overlimit'), JSON.stringify(warnings));
  assert.ok(!warnings.some((warning) => warning.kind === 'loc-utilization'), JSON.stringify(warnings));
});

test('web warning models distinguish LOC over limit from high utilization', () => {
  const simulatorWarnings = simulatorModel.buildSimulatorWarnings({
    cashFlow: 1500,
    loc: {
      limit: 10000,
      balance: 10500,
    },
  });
  const dashboard = dashboardModel.buildDashboardModel({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebt: {
      name: 'Auto Loan',
      balance: 18450,
      interestRate: 0.069,
      minimumPayment: 425,
    },
    allDebts: [
      {
        name: 'Auto Loan',
        balance: 18450,
        interestRate: 0.069,
        minimumPayment: 425,
      },
    ],
    loc: {
      limit: 10000,
      balance: 10500,
      interestRate: 0.085,
    },
    baseline: {
      months: 48,
      totalInterest: 2600,
      isPayoffPossible: true,
    },
    velocity: {
      months: 0,
      totalInterest: 0,
      savings: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    },
  });

  assert.ok(
    simulatorWarnings.some(
      (warning) =>
        warning.kind === 'loc-overlimit' &&
        warning.title === 'LOC balance is over the limit' &&
        warning.body.includes('above the available limit')
    ),
    JSON.stringify(simulatorWarnings)
  );
  assert.ok(
    !simulatorWarnings.some((warning) => warning.title === 'High LOC utilization'),
    JSON.stringify(simulatorWarnings)
  );
  assert.equal(dashboard.nextMove.title, 'Pay down the LOC');
  assert.equal(dashboard.nextMove.value, '105% used');
  assert.equal(dashboard.nextMove.caption, 'The LOC balance is above the available limit. Bring it back under the limit before modeling another chunk.');
  assert.ok(
    dashboard.warnings.some(
      (warning) =>
        warning.kind === 'loc-overlimit' &&
        warning.title === 'LOC balance is over the limit' &&
        warning.body.includes('above the available limit')
    ),
    JSON.stringify(dashboard.warnings)
  );
  assert.ok(!dashboard.warnings.some((warning) => warning.title === 'LOC utilization is above 80%'));
});

test('simulator timeline status does not claim LOC interest visibility without events', () => {
  assert.equal(
    typeof simulatorModel.buildSimulatorTimelineStatus,
    'function',
    'expected simulator timeline status to be built by a presentation model helper'
  );

  const unavailable = simulatorModel.buildSimulatorTimelineStatus(0);
  const available = simulatorModel.buildSimulatorTimelineStatus(3);

  assert.equal(unavailable.label, 'Review inputs');
  assert.equal(unavailable.tone, 'amber');
  assert.equal(available.label, 'LOC interest visible');
  assert.equal(available.tone, 'emerald');
});

test('strategy glass copy does not label faster-but-costlier paths as interest savings', () => {
  let strategyGlassModel;
  assert.doesNotThrow(() => {
    strategyGlassModel = loadTsModule('src/components/strategy-glass-fill-model.ts');
  }, 'expected StrategyGlassFill presentation copy helpers');

  assert.equal(
    strategyGlassModel.formatStrategyInterestDelta(1000, 1200),
    '$200 more interest'
  );
  assert.equal(
    strategyGlassModel.formatStrategyDeltaBadge({
      baselineMonths: 12,
      baselineInterest: 1000,
      strategyMonths: 8,
      strategyInterest: 1200,
    }),
    '4 mo faster - $200 more interest'
  );
  assert.equal(
    strategyGlassModel.formatStrategyDeltaBadge({
      baselineMonths: 12,
      baselineInterest: 1000,
      strategyMonths: 8,
      strategyInterest: 700,
    }),
    '4 mo faster - $300 interest saved'
  );
  assert.equal(strategyGlassModel.getStrategyDeltaTone(1000, 1200), 'amber');
  assert.equal(strategyGlassModel.getStrategyDeltaTone(1000, 700), 'emerald');
  assert.equal(strategyGlassModel.getStrategyDeltaTone(1000, 1000), 'sky');
});

test('strategy glass model suppresses winners and savings when the baseline is invalid', () => {
  const strategyGlassModel = loadTsModule('src/components/strategy-glass-fill-model.ts');
  const comparison = strategyGlassModel.buildStrategyGlassComparison([
    {
      name: 'Traditional',
      months: 0,
      totalInterest: Number.NaN,
      isPayoffPossible: false,
    },
    {
      name: 'Velocity',
      months: 1,
      totalInterest: 100,
      isPayoffPossible: true,
    },
  ]);

  assert.equal(comparison.baselineValid, false);
  assert.equal(comparison.baselineMonths, 0);
  assert.equal(comparison.baselineInterest, 0);
  assert.equal(comparison.winner, null);
  assert.equal(comparison.cards[0].fillPercent, 0);
  assert.equal(comparison.cards[1].fillPercent, 0);
  assert.equal(comparison.cards[1].monthsSaved, 0);
  assert.equal(comparison.cards[1].isWinner, false);
});

test('mortgage analysis warns when current balance exceeds original loan amount', () => {
  const analysis = calculations.calculateMortgageAnalysis({
    entryMode: 'both',
    purchaseAge: 32,
    currentAge: 38,
    originalCost: 320000,
    originalTermYears: 30,
    originalRate: 0.045,
    downPayment: 64000,
    currentBalance: 285000,
    remainingTermMonths: 288,
    currentRate: 0.065,
    currentMonthlyPayment: 1850,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: true,
    refinanceCount: 1,
  });

  assert.ok(Array.isArray(analysis.warnings), 'expected mortgage analysis to expose warnings');
  assert.ok(
    analysis.warnings.some((warning) => warning.type === 'current-balance-exceeds-original-loan'),
    `expected warning for current balance above original loan, got ${JSON.stringify(analysis.warnings)}`
  );
});

test('mortgage analysis clamps an overlarge down payment instead of showing a negative loan', () => {
  const analysis = calculations.calculateMortgageAnalysis({
    entryMode: 'purchase',
    purchaseAge: 32,
    currentAge: 32,
    originalCost: 100000,
    originalTermYears: 30,
    originalRate: 0.06,
    downPayment: 125000,
    currentBalance: 0,
    remainingTermMonths: 360,
    currentRate: 0.06,
    currentMonthlyPayment: 0,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  });

  assert.equal(analysis.originalLoanAmount, 0);
  assert.equal(analysis.totalPaidLifetime, 0);
  assert.equal(analysis.totalInterestLifetime, 0);
  assert.ok(
    analysis.warnings.some((warning) => warning.type === 'down-payment-exceeds-purchase-price'),
    `expected down-payment warning, got ${JSON.stringify(analysis.warnings)}`
  );
});

test('mortgage purchase-mode analysis uses shared schedule without advancing unelapsed months', () => {
  const calculationsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/calculations.ts'), 'utf8');
  const analysisStart = calculationsSource.indexOf('export function calculateMortgageAnalysis');
  const analysisEnd = calculationsSource.indexOf('//', analysisStart + 1);
  const analysisSource = calculationsSource.slice(analysisStart, analysisEnd);
  const input = {
    entryMode: 'purchase',
    purchaseAge: 32,
    currentAge: 32,
    originalCost: 320000,
    originalTermYears: 30,
    originalRate: 0.065,
    downPayment: 64000,
    currentBalance: 0,
    remainingTermMonths: 0,
    currentRate: 0.065,
    currentMonthlyPayment: 0,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };
  const analysis = calculations.calculateMortgageAnalysis(input);
  const strategies = calculations.compareMortgageStrategies(input, 1500, {
    limit: 50000,
    apr: 0.08,
    balance: 0,
  });

  assert.ok(
    analysisSource.includes('simulateAmortizedPayoff({') &&
      analysisSource.includes('originalSchedule') &&
      analysisSource.includes('elapsedRows'),
    'expected mortgage analysis to derive history from the shared amortized payoff schedule'
  );
  assert.ok(!analysisSource.includes('Math.max(monthsElapsed, 84)'), 'expected first-seven-year math not to advance current purchase balance');
  assert.equal(analysis.monthsElapsed, 0);
  assert.equal(analysis.principalPaidSoFar, 0);
  assert.equal(analysis.interestPaidSoFar, 0);
  assert.equal(roundCents(analysis.equityPercent), 20);
  assert.equal(strategies.standard.isPayoffPossible, true);
  assert.equal(strategies.standard.months, 360);
});

test('mortgage purchase-mode strategies ignore hidden stale current balance inputs', () => {
  const input = {
    entryMode: 'purchase',
    purchaseAge: 32,
    currentAge: 32,
    originalCost: 320000,
    originalTermYears: 30,
    originalRate: 0.065,
    downPayment: 64000,
    currentBalance: 0,
    remainingTermMonths: 0,
    currentRate: 0.065,
    currentMonthlyPayment: 0,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const analysis = calculations.calculateMortgageAnalysis(input);
  const strategies = calculations.compareMortgageStrategies(input, 1500, {
    limit: 50000,
    apr: 0.08,
    balance: 0,
  });

  assert.ok(
    !analysis.warnings.some((warning) => warning.type === 'payment-below-interest'),
    `expected purchase mode not to warn from hidden current payment, got ${JSON.stringify(analysis.warnings)}`
  );
  assert.equal(strategies.standard.isPayoffPossible, true);
  assert.ok(strategies.standard.months > 0, `expected visible purchase mortgage to need payoff time, got ${strategies.standard.months}`);
  assert.ok(strategies.standard.totalInterest > 0, `expected visible purchase mortgage to accrue interest, got ${strategies.standard.totalInterest}`);
});

test('mortgage standard strategy uses the actual current monthly payment', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.12,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const strategies = calculations.compareMortgageStrategies(input, 1200, {
    limit: 50000,
    apr: 0.1,
    balance: 0,
  });
  const idealAmortizedInterest = calculations.calculateTotalAmortizationInterest(
    input.currentBalance,
    input.currentRate,
    input.remainingTermMonths
  );

  assert.equal(strategies.standard.isPayoffPossible, true);
  assert.ok(
    strategies.standard.months > input.remainingTermMonths,
    `expected actual payment payoff to exceed ${input.remainingTermMonths} months, got ${strategies.standard.months}`
  );
  assert.ok(
    strategies.standard.totalInterest > idealAmortizedInterest,
    `expected actual payment interest ${strategies.standard.totalInterest} to exceed ideal amortized ${idealAmortizedInterest}`
  );
});

test('mortgage strategy payment plans use the shared amortized payoff helper', () => {
  const calculationsSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/engine/calculations.ts'), 'utf8');
  const wrapperStart = calculationsSource.indexOf('function simulateMortgagePaymentPlan');
  const wrapperEnd = calculationsSource.indexOf('export function compareMortgageStrategies', wrapperStart);
  const wrapperSource = calculationsSource.slice(wrapperStart, wrapperEnd);
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.12,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };
  const strategies = calculations.compareMortgageStrategies(input, 1200, {
    limit: 50000,
    apr: 0.1,
    balance: 0,
  });
  const sharedProjection = sharedFinancialEngine.simulateAmortizedPayoff({
    principalBalance: input.currentBalance,
    apr: input.currentRate,
    monthlyPayment: input.currentMonthlyPayment,
    maxMonths: input.remainingTermMonths * 4,
  });

  assert.ok(wrapperSource.includes('simulateAmortizedPayoff({'), 'expected mortgage strategy plans to delegate to the shared payoff helper');
  assert.ok(!wrapperSource.includes('while ('), 'expected mortgage strategy plans not to keep a separate payoff loop');
  assert.equal(strategies.standard.months, sharedProjection.payoffMonths);
  assert.equal(roundCents(strategies.standard.totalInterest), roundCents(sharedProjection.totalInterest));
  assert.equal(strategies.standard.isPayoffPossible, sharedProjection.isPayoffPossible);
});

test('mortgage strategies do not replace a zero current payment with a derived payment', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.04,
    currentMonthlyPayment: 0,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const analysis = calculations.calculateMortgageAnalysis(input);
  const strategies = calculations.compareMortgageStrategies(input, 3000, {
    limit: 50000,
    apr: 0.08,
    balance: 0,
  });

  assert.ok(
    analysis.warnings.some((warning) => warning.type === 'payment-below-interest'),
    `expected zero current payment to warn, got ${JSON.stringify(analysis.warnings)}`
  );

  for (const key of ['standard', 'biweekly', 'extraPayment', 'velocity']) {
    assert.equal(strategies[key].isPayoffPossible, false, `expected ${key} to be blocked`);
    assert.equal(strategies[key].failureReason, 'payment-below-interest', `expected ${key} to name the interest gap`);
  }
  assert.equal(strategies.biweekly.saved, 0);
  assert.equal(strategies.extraPayment.saved, 0);
  assert.equal(strategies.velocity.saved, 0);
  assert.equal(strategies.velocity.chunkSize, 0);
});

test('vault freedom path does not replace an explicit zero current payment', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/vault/page.tsx'), 'utf8');

  assert.ok(
    !source.includes('md.currentMonthlyPayment || analysis.originalPayment'),
    'expected Vault freedom path not to replace a zero current payment with the original mortgage payment'
  );
  assert.ok(
    source.includes("md.entryMode === 'purchase' ? analysis.originalPayment : md.currentMonthlyPayment"),
    'expected Vault freedom path payment input to respect purchase vs current mortgage mode explicitly'
  );
});

test('mortgage analysis and strategies preserve an explicit zero current rate', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 150000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 30000,
    currentBalance: 12000,
    remainingTermMonths: 12,
    currentRate: 0,
    currentMonthlyPayment: 1000,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const analysis = calculations.calculateMortgageAnalysis(input);
  const strategies = calculations.compareMortgageStrategies(input, 2000, {
    limit: 50000,
    apr: 0.08,
    balance: 0,
  });

  assert.equal(analysis.interestPercentOfPayment, 0);
  assert.ok(
    !analysis.warnings.some((warning) => warning.type === 'payment-below-interest'),
    `expected no interest-gap warning for a zero-rate mortgage, got ${JSON.stringify(analysis.warnings)}`
  );
  assert.equal(strategies.standard.isPayoffPossible, true);
  assert.equal(strategies.standard.months, 12);
  assert.equal(roundCents(strategies.standard.totalInterest), 0);
});

test('vault strategy cards block invalid non-velocity mortgage projections', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/vault/page.tsx'), 'utf8');

  assert.ok(source.includes('function formatMortgageMonths'), 'expected Vault strategy cards to use invalid-state month labels');
  assert.ok(source.includes('function formatMortgageInterest'), 'expected Vault strategy cards to use invalid-state interest labels');
  assert.ok(source.includes('function formatMortgageSavings'), 'expected Vault strategy cards to use invalid-state savings labels');
  assert.ok(source.includes('function formatMortgageTimeDelta'), 'expected Vault strategy cards to use invalid-state time-delta labels');
  assert.ok(source.includes('formatMortgageMonths(strategies.standard)'), 'expected Standard card to block invalid month claims');
  assert.ok(source.includes('formatMortgageInterest(strategies.standard.totalInterest, strategies.standard.isPayoffPossible)'), 'expected Standard card to block invalid interest claims');
  assert.ok(source.includes('formatMortgageMonths(strategies.biweekly)'), 'expected Bi-Weekly card to block invalid month claims');
  assert.ok(source.includes('formatMortgageSavings(strategies.biweekly)'), 'expected Bi-Weekly card to block invalid savings claims');
  assert.ok(source.includes('formatMortgageMonths(strategies.extraPayment)'), 'expected Extra Payment card to block invalid month claims');
  assert.ok(source.includes('formatMortgageSavings(strategies.extraPayment)'), 'expected Extra Payment card to block invalid savings claims');
});

test('vault strategy labels do not frame zero improvement as savings', () => {
  let vaultModel;
  assert.doesNotThrow(() => {
    vaultModel = loadTsModule('src/app/vault-model.ts');
  }, 'expected Vault presentation label helpers');

  const zeroImprovement = {
    saved: 0,
    monthsSaved: 0,
    isPayoffPossible: true,
  };
  const positiveImprovement = {
    saved: 1250,
    monthsSaved: 7,
    isPayoffPossible: true,
  };
  const invalidProjection = {
    saved: 0,
    monthsSaved: 0,
    isPayoffPossible: false,
    failureReason: 'cashflow-below-minimums',
  };
  const horizonProjection = {
    saved: 0,
    monthsSaved: 0,
    isPayoffPossible: false,
    failureReason: 'payoff-horizon-exceeded',
  };

  assert.equal(vaultModel.formatVaultStrategySavings(zeroImprovement), 'No interest savings');
  assert.equal(vaultModel.formatVaultStrategyTimeDelta(zeroImprovement), 'No faster payoff');
  assert.equal(vaultModel.formatVaultStrategySavings(positiveImprovement), 'Saves $1,250');
  assert.equal(vaultModel.formatVaultStrategyTimeDelta(positiveImprovement), '7 months faster');
  assert.equal(vaultModel.formatVaultStrategySavings(invalidProjection), 'Not projected');
  assert.equal(vaultModel.formatVaultStrategyTimeDelta(invalidProjection), 'Cash flow below payment');
  assert.equal(vaultModel.formatVaultStrategyTimeDelta(horizonProjection), 'Extend projection horizon');
});

test('mortgage extra-payment strategy does not invent extra cash when cash flow is not positive', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.12,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const strategies = calculations.compareMortgageStrategies(input, -200, {
    limit: 50000,
    apr: 0.1,
    balance: 0,
  });

  assert.equal(strategies.extraPayment.extraAmount, 0);
  assert.equal(strategies.extraPayment.months, strategies.standard.months);
  assert.equal(roundCents(strategies.extraPayment.totalInterest), roundCents(strategies.standard.totalInterest));
  assert.equal(strategies.extraPayment.saved, 0);
  assert.equal(strategies.extraPayment.monthsSaved, 0);
});

test('mortgage biweekly strategy does not invent an extra annual payment when cash flow is not positive', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.12,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const strategies = calculations.compareMortgageStrategies(input, -200, {
    limit: 50000,
    apr: 0.1,
    balance: 0,
  });

  assert.equal(strategies.biweekly.months, strategies.standard.months);
  assert.equal(roundCents(strategies.biweekly.totalInterest), roundCents(strategies.standard.totalInterest));
  assert.equal(strategies.biweekly.saved, 0);
  assert.equal(strategies.biweekly.monthsSaved, 0);
});

test('mortgage velocity strategy refuses over-limit LOC savings claims', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.12,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const strategies = calculations.compareMortgageStrategies(input, 1200, {
    limit: 50000,
    apr: 0.1,
    balance: 51000,
  });

  assert.equal(strategies.velocity.isPayoffPossible, false);
  assert.equal(strategies.velocity.failureReason, 'loc-overlimit');
  assert.equal(strategies.velocity.saved, 0);
  assert.equal(strategies.velocity.monthsSaved, 0);
  assert.equal(strategies.velocity.chunkSize, 0);
});

test('mortgage velocity strategy treats a missing LOC limit as setup needed instead of over-limit', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.12,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const strategies = calculations.compareMortgageStrategies(input, 1200, {
    limit: 0,
    apr: 0.1,
    balance: 0,
  });
  const vaultModel = loadTsModule('src/app/vault-model.ts');

  assert.equal(strategies.velocity.isPayoffPossible, false);
  assert.equal(strategies.velocity.failureReason, 'loc-setup');
  assert.equal(strategies.velocity.saved, 0);
  assert.equal(strategies.velocity.monthsSaved, 0);
  assert.equal(strategies.velocity.chunkSize, 0);
  assert.equal(vaultModel.formatVaultStrategyTimeDelta(strategies.velocity), 'Add LOC limit');
});

test('mortgage velocity strategy treats a full LOC as no available room instead of over-limit', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.12,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const strategies = calculations.compareMortgageStrategies(input, 1200, {
    limit: 50000,
    apr: 0.1,
    balance: 50000,
  });
  const vaultModel = loadTsModule('src/app/vault-model.ts');

  assert.equal(strategies.velocity.isPayoffPossible, false);
  assert.equal(strategies.velocity.failureReason, 'loc-no-capacity');
  assert.equal(strategies.velocity.saved, 0);
  assert.equal(strategies.velocity.monthsSaved, 0);
  assert.equal(strategies.velocity.chunkSize, 0);
  assert.equal(vaultModel.formatVaultStrategyTimeDelta(strategies.velocity), 'No LOC room');
});

test('mortgage velocity strategy refuses projections when cash flow cannot cover the mortgage payment', () => {
  const input = {
    entryMode: 'current',
    purchaseAge: 30,
    currentAge: 40,
    originalCost: 125000,
    originalTermYears: 30,
    originalRate: 0.07,
    downPayment: 25000,
    currentBalance: 100000,
    remainingTermMonths: 120,
    currentRate: 0.04,
    currentMonthlyPayment: 1100,
    paymentFrequency: 'monthly',
    hasExtraPayments: false,
    extraPaymentAmount: 0,
    hasRefinanced: false,
    refinanceCount: 0,
  };

  const strategies = calculations.compareMortgageStrategies(input, 900, {
    limit: 50000,
    apr: 0.08,
    balance: 0,
  });

  assert.equal(strategies.velocity.isPayoffPossible, false);
  assert.equal(strategies.velocity.failureReason, 'cashflow-below-minimums');
  assert.equal(strategies.velocity.saved, 0);
  assert.equal(strategies.velocity.monthsSaved, 0);
  assert.equal(strategies.velocity.chunkSize, 0);
});

test('vault freedom path blocks impact claims when velocity is invalid', () => {
  let vaultModel;
  assert.doesNotThrow(() => {
    vaultModel = loadTsModule('src/app/vault-model.ts');
  }, 'expected a Vault presentation model for invalid projection guards');

  const model = vaultModel.buildVaultFreedomPathModel({
    currentAge: 40,
    standardMonths: 240,
    velocity: {
      months: 0,
      saved: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    },
    monthlyPayment: 1850,
    investmentRate: 0.07,
  });

  assert.equal(model.isProjected, false);
  assert.equal(model.interestSavedLabel, 'Not projected');
  assert.equal(model.freedomYearsLabel, 'Review inputs');
  assert.equal(model.portfolioValueLabel, 'Not projected');
  assert.equal(model.timelineLabel, 'Velocity path needs usable inputs first');
  assert.equal(model.investmentGrowth, 0);
});

test('cockpit gauge dashes stay within SVG bounds', () => {
  const cockpitModel = loadTsModule('src/app/cockpit-model.ts');

  assert.equal(cockpitModel.buildCashFlowGaugeDash(-500), '0 251');
  assert.equal(cockpitModel.buildCashFlowGaugeDash(Number.NaN), '0 251');
  assert.equal(cockpitModel.buildCashFlowGaugeDash(1500), '126 251');
  assert.equal(cockpitModel.buildCashFlowGaugeDash(3000), '251 251');
  assert.equal(cockpitModel.buildCashFlowGaugeDash(12000), '251 251');
  assert.equal(cockpitModel.buildDebtBalanceGaugeDash(-1), '0 251');
  assert.equal(cockpitModel.buildDebtBalanceGaugeDash(25000), '126 251');
  assert.equal(cockpitModel.buildDebtBalanceGaugeDash(125000), '251 251');
});

test('vault default copy keeps a coach tone instead of fear language', () => {
  const source = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/vault/page.tsx'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .toLowerCase();
  const bannedPhrases = [
    'death pledge',
    'banks extract',
    "bank didn't tell",
    "the bank's cut",
    'goes to the bank',
    'steals your equity',
    'amortization trap',
    'reset the interest clock',
    'only 1% of americans ever pay off their mortgage',
    'this could have been generational wealth',
    'this is wealth you can pass on',
  ];

  for (const phrase of bannedPhrases) {
    assert.ok(!source.includes(phrase), `expected Vault copy not to include fear-language phrase: ${phrase}`);
  }
});

test('vault generation screen labels multiplier-based family scenarios as assumptions', () => {
  const source = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/vault/page.tsx'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .toLowerCase();

  assert.ok(!source.includes('your parents&apos; mortgage interest'), 'expected prior-generation estimate not to be labeled as actual parent data');
  assert.ok(!source.includes('your child&apos;s projected interest'), 'expected next-generation estimate not to be labeled as a child forecast');
  assert.ok(source.includes('illustrative multipliers'), 'expected Vault to label generation estimates as illustrative multipliers');
  assert.ok(source.includes('assumed prior-generation interest'), 'expected Vault to label the prior generation as an assumption');
  assert.ok(source.includes('assumed next-generation interest'), 'expected Vault to label the next generation as an assumption');
});

test('learn page labels sample savings instead of presenting them as universal outcomes', () => {
  const source = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .toLowerCase();
  const bannedPhrases = [
    'can shave years off a 30-year mortgage',
    'positive cash flow is non-negotiable',
    'even $200/month can accelerate debt payoff by years',
    'a single $3,000 chunk can save $6,000+',
    'each $3k chunk saves ~$6,400',
    'repeat the cycle for exponential acceleration',
    'perpetual interest-reduction machine',
    'mortgage-killing power',
    'offensive weapon',
    'silent killer',
    'for many people, even a higher-rate loc provides net savings',
  ];

  for (const phrase of bannedPhrases) {
    assert.ok(!source.includes(phrase), `expected Learn copy not to include unqualified sample outcome: ${phrase}`);
  }
});

test('learn page avoids universal LOC rate-spread rules', () => {
  const source = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .toLowerCase();
  const bannedPhrases = [
    'velocity banking still works even if your loc rate is slightly higher than your mortgage rate',
    'the sweet spot is a loc rate 2-4% below your primary debt rate',
    'this maximizes the arbitrage',
    'this is where chunks have maximum impact',
  ];

  for (const phrase of bannedPhrases) {
    assert.ok(!source.includes(phrase), `expected Learn copy not to include universal LOC-rate rule: ${phrase}`);
  }
});

test('learn and dashboard LOC copy avoids hype and fear phrasing', () => {
  const learnSource = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8')
    .replace(/\\'/g, "'")
    .toLowerCase();
  const dashboardSource = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/dashboard-model.ts'), 'utf8')
    .toLowerCase();
  const bannedLearnPhrases = [
    "but here's the magic",
    "isn't magic",
    "it's not free money",
    'every day costs you',
    'works double-duty',
    'double duty',
    'powerful cycle',
    'it fails without',
    'when does it not work',
    "you're just adding debt",
    'defeats the purpose',
  ];

  for (const phrase of bannedLearnPhrases) {
    assert.ok(!learnSource.includes(phrase), `expected Learn copy to avoid hype or fear phrase: ${phrase}`);
  }

  assert.ok(!dashboardSource.includes('not free money'), 'expected Dashboard LOC copy not to frame credit as free money');
  assert.ok(
    dashboardSource.includes('available credit is capacity, not income'),
    'expected Dashboard LOC copy to frame available credit as capacity'
  );
});

test('learn progress sanitizes corrupt browser storage before hydration', () => {
  const progress = learnProgress.sanitizeLearnProgress({
    completed: [1, '2', 0, 99, 'not-a-module', 2],
    quizAnswers: {
      1: 0,
      2: '3',
      3: -1,
      4: null,
      99: 1,
      nope: 2,
    },
  }, 4);

  assert.equal(progress.completed.has(1), true);
  assert.equal(progress.completed.has(2), true);
  assert.equal(progress.completed.has(0), false);
  assert.equal(progress.completed.has(99), false);
  assert.equal(progress.completed.size, 2);
  assert.equal(progress.quizAnswers[1], 0);
  assert.equal(progress.quizAnswers[2], 3);
  assert.equal(progress.quizAnswers[3], undefined);
  assert.equal(progress.quizAnswers[4], null);
  assert.equal(progress.quizAnswers[99], undefined);
});

test('learn page mistake cascade example keeps LOC availability arithmetic consistent', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8');
  const renderedSource = source.replace(/\\'/g, "'");
  assert.ok(renderedSource.includes('$15,000 LOC'), 'expected Learn mistake example to include the LOC limit fixture');
  assert.ok(renderedSource.includes('chunked $8,000'), 'expected Learn mistake example to include the safer chunk fixture');
  assert.ok(
    !renderedSource.includes("chunked $8,000 instead, it would have had $7,000 available"),
    'expected safer-chunk availability not to be understated as $7,000'
  );
  assert.ok(
    renderedSource.includes("chunked $8,000 instead, it would have had $8,000 available"),
    'expected $15,000 limit - ($8,000 chunk - $1,000 recovery) = $8,000 available'
  );
});

test('learn page uses neutral examples instead of unsupported named anecdotes', () => {
  const source = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8')
    .replace(/\\'/g, "'")
    .toLowerCase();
  const bannedPhrases = [
    'real-world example',
    'sarah has $500/month cash flow',
  ];

  for (const phrase of bannedPhrases) {
    assert.ok(!source.includes(phrase), `expected Learn copy not to use unsupported named anecdote: ${phrase}`);
  }
  assert.ok(source.includes('planning example'), 'expected Learn copy to preserve the scenario as a neutral planning example');
});

test('learn page common mistakes uses coach tone instead of fear directives', () => {
  const source = fs
    .readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8')
    .replace(/\\'/g, "'")
    .toLowerCase();
  const fearDirectives = [
    'the most dangerous mistake',
    'always maintain at least 20% available credit',
    'a massive chunk feels great',
    'never use the loc for lifestyle spending',
    'tracking it religiously',
    'you must fix that first',
    'before starting velocity banking',
    'track every dollar for at least 3 months before starting',
  ];

  for (const phrase of fearDirectives) {
    assert.ok(!source.includes(phrase), `expected Learn copy to avoid fear/directive phrase: ${phrase}`);
  }

  assert.ok(
    source.includes('keep at least 20% available credit as a planning buffer'),
    'expected Learn copy to preserve the LOC utilization warning in coach-tone language'
  );
  assert.ok(
    source.includes('avoid treating loc credit as spendable income'),
    'expected Learn copy to warn against lifestyle spending without fear language'
  );
});

test('Guardian teacher responses render as clean plain text', () => {
  const response = guardian.getGuardianResponse('How do I improve cash flow?', {
    teacherMode: true,
    context: {
      monthlyIncome: 6500,
      monthlyExpenses: 5000,
      cashFlow: 1500,
      activeDomainLabel: 'car',
    },
  });

  assert.ok(!response.includes('**'), `expected no markdown emphasis markers, got: ${response}`);
  assert.ok(response.includes('Open Simulator'), `expected readable next step text, got: ${response}`);
  assert.ok(!response.includes('changes the whole timeline'), `expected Teacher Mode to avoid unsupported cash-flow timeline claim, got: ${response}`);
});

test('Guardian answer bank avoids unqualified savings promises', () => {
  const answerBank = guardian.shieldGuardianQA
    .flatMap((qa) => qa.answers)
    .join('\n')
    .toLowerCase();
  const bannedClaims = [
    'many pay off mortgages 10-15 years early',
    'velocity typically saves 30-50%',
    'active usually wins',
    'can shave years off',
    'many pay off car loans 2-3 years early',
    'mortgages are the biggest velocity banking opportunity',
    'a 30-year can become 15-20',
    'interest savings are massive',
    'the average family saves $50k-$150k',
    'helocs are perfect here',
    'creates generational wealth',
    'wealth created',
    'multi-generational impact',
    'lasting financial freedom',
    'trust the math',
    "the math works - if it's not working",
    'debt-crushing ammunition',
  ];

  for (const claim of bannedClaims) {
    assert.ok(!answerBank.includes(claim), `expected Guardian copy not to include unqualified claim: ${claim}`);
  }
});

test('Guardian answer bank avoids unsupported population stats and named anecdotes', () => {
  const answerBank = guardian.shieldGuardianQA
    .flatMap((qa) => qa.answers)
    .join('\n')
    .toLowerCase();
  const unsupportedClaims = [
    'most people find 10-20%',
    'the average person has $200+',
    'even $100 more per month in cash flow can save thousands',
    'real example: sarah',
    'her $700 cash flow helped her pay off $18,000 in 2 years faster',
    'the average american has $100k+ in debt',
  ];

  for (const claim of unsupportedClaims) {
    assert.ok(!answerBank.includes(claim), `expected Guardian copy not to include unsupported statistic or anecdote: ${claim}`);
  }
});

test('Guardian answer bank avoids hard-coded LOC rate and qualification thresholds', () => {
  const answerBank = guardian.shieldGuardianQA
    .flatMap((qa) => qa.answers)
    .join('\n')
    .toLowerCase();
  const unsupportedThresholds = [
    'often 7-9% vs 15-20%',
    '8-12%) vs credit cards (15-25%',
    'good credit (680+)',
    'usually 15-20% minimum',
  ];

  for (const threshold of unsupportedThresholds) {
    assert.ok(!answerBank.includes(threshold), `expected Guardian copy not to include unsupported threshold: ${threshold}`);
  }

  assert.ok(
    answerBank.includes('compare the actual apr, fees, draw rules, repayment terms, and collateral risk'),
    'expected Guardian copy to point users back to actual LOC terms instead of generic threshold advice'
  );
});

test('Guardian prioritizes HELOC intent over generic LOC matching', () => {
  for (const prompt of ['What is a HELOC?', 'home equity line of credit']) {
    const response = guardian.getGuardianResponse(prompt).toLowerCase();
    assert.ok(
      response.includes('heloc') || response.includes('home equity') || response.includes('home as collateral'),
      `expected HELOC-specific response for "${prompt}", got: ${response}`
    );
    assert.ok(
      !response.includes('reusable loan'),
      `expected HELOC prompt not to fall through to generic LOC answer, got: ${response}`
    );
  }
});

test('Guardian answer bank avoids directive card and investment advice without modeling', () => {
  const answerBank = guardian.shieldGuardianQA
    .flatMap((qa) => qa.answers)
    .join('\n')
    .toLowerCase();
  const directiveClaims = [
    'credit cards have high rates (15-25%)',
    'priority one',
    'interest spread is huge',
    'attack cards aggressively',
    'math says: if investment return > debt rate, invest',
    'guaranteed 7% saved interest vs potential 10% market return',
  ];

  for (const claim of directiveClaims) {
    assert.ok(!answerBank.includes(claim), `expected Guardian copy not to include directive financial advice: ${claim}`);
  }

  assert.ok(
    answerBank.includes('model the card apr, minimums, fees, loc terms, and cash-flow recovery timeline'),
    'expected Guardian credit-card guidance to direct users back to modeled inputs'
  );
  assert.ok(
    answerBank.includes('compare debt payoff with investing only after accounting for risk, taxes, liquidity, employer match, and time horizon'),
    'expected Guardian investment guidance to label the broader planning assumptions'
  );
});

test('Guardian routes mixed velocity credit-card prompts to card guidance', () => {
  const response = guardian
    .getGuardianResponse('Should I use velocity banking for credit cards?')
    .toLowerCase();

  assert.ok(
    response.includes('card apr') || response.includes('promo expiry') || response.includes('card apr'),
    `expected mixed velocity/card prompt to return credit-card guidance, got: ${response}`
  );
  assert.ok(
    !response.includes('checking account hub'),
    `expected mixed velocity/card prompt not to fall through to generic velocity answer, got: ${response}`
  );
});

test('Guardian debt-priority guidance uses modeled inputs instead of fixed-rate directives', () => {
  const answerBank = guardian.shieldGuardianQA
    .flatMap((qa) => qa.answers)
    .join('\n')
    .toLowerCase();
  const directiveClaims = [
    'if your loc is 8% and credit cards are 20%, attack the cards',
    'if mortgage is 7%, that might come later',
    'bigger spread = more benefit from velocity banking',
    'mathematically: highest interest rate',
  ];

  for (const claim of directiveClaims) {
    assert.ok(!answerBank.includes(claim), `expected Guardian debt-priority copy not to include fixed directive: ${claim}`);
  }

  assert.ok(
    answerBank.includes('compare each debt by actual apr, fees, minimum payment pressure, loc cost, recovery timeline, and risk'),
    'expected Guardian debt-priority copy to use modeled inputs'
  );
});

test('Guardian prerequisite and income guidance avoids universal start/apply claims', () => {
  const answerBank = guardian.shieldGuardianQA
    .flatMap((qa) => qa.answers)
    .join('\n')
    .toLowerCase();
  const universalClaims = [
    'start the application process now',
    'some use credit cards strategically (0% periods)',
    'loc is preferred',
    'even $200/month surplus works',
    'the math is the math at any scale',
  ];

  for (const claim of universalClaims) {
    assert.ok(!answerBank.includes(claim), `expected Guardian prerequisite copy not to include universal claim: ${claim}`);
  }

  assert.ok(
    answerBank.includes('you can learn the money loop before opening a loc'),
    'expected Guardian LOC prerequisite copy to separate education from opening credit'
  );
  assert.ok(
    answerBank.includes('model your surplus against balances, rates, fees, minimums, and recovery time'),
    'expected Guardian income guidance to require modeled surplus checks'
  );
});

test('Guardian answer bank avoids fixed mortgage and refinance shortcuts', () => {
  const answerBank = guardian.shieldGuardianQA
    .flatMap((qa) => qa.answers)
    .join('\n')
    .toLowerCase();
  const fixedClaims = [
    'you might pay $100k in interest the first 10 years',
    'save massive interest',
    'even $500 chunks make a significant difference',
    'a 30-year mortgage in 18 years saves 12 years',
    'if you can get a significantly lower rate (1%+), it often makes sense',
    'refinancing + velocity banking = powerful combination',
  ];

  for (const claim of fixedClaims) {
    assert.ok(!answerBank.includes(claim), `expected Guardian copy not to include fixed mortgage/refinance shortcut: ${claim}`);
  }

  assert.ok(
    answerBank.includes('run a break-even check against closing costs, the new term, how long you expect to keep the loan, and your payoff plan'),
    'expected refinance guidance to require break-even assumptions'
  );
  assert.ok(
    answerBank.includes('test the exact chunk size in the simulator before trusting the impact'),
    'expected chunk guidance to send fixed-size examples back to the Simulator'
  );
});

test('Guardian cash-flow examples state income minus expenses correctly', () => {
  const answers = guardian.shieldGuardianQA.flatMap((qa) => qa.answers);
  const examples = [];

  function parseMoney(value) {
    return Number(value.replace(/[$,]/g, ''));
  }

  for (const answer of answers) {
    const sentenceMatch = answer.match(/earn (\$[\d,]+)\/month and spend (\$[\d,]+), your cash flow is \+(\$[\d,]+)/i);
    if (sentenceMatch) {
      examples.push({
        answer,
        income: parseMoney(sentenceMatch[1]),
        expenses: parseMoney(sentenceMatch[2]),
        statedCashFlow: parseMoney(sentenceMatch[3]),
      });
    }

    const equationMatch = answer.match(/(\$[\d,]+) income - (\$[\d,]+) expenses = (\$[\d,]+) cash flow/i);
    if (equationMatch) {
      examples.push({
        answer,
        income: parseMoney(equationMatch[1]),
        expenses: parseMoney(equationMatch[2]),
        statedCashFlow: parseMoney(equationMatch[3]),
      });
    }
  }

  assert.ok(examples.length >= 2, 'expected Guardian answer bank to include cash-flow arithmetic examples');
  for (const example of examples) {
    assert.equal(
      example.income - example.expenses,
      example.statedCashFlow,
      `cash-flow example arithmetic is inconsistent: ${example.answer}`
    );
  }
});

test('dashboard model keeps the first screen to four vitals and blocks unstable payoff claims', () => {
  const model = dashboardModel.buildDashboardModel({
    monthlyIncome: 4000,
    monthlyExpenses: 4500,
    chunkAmount: 1000,
    activeDebt: {
      name: 'Auto Loan',
      balance: 18450,
      interestRate: 0.069,
      minimumPayment: 425,
    },
    allDebts: [
      {
        name: 'Auto Loan',
        balance: 18450,
        interestRate: 0.069,
        minimumPayment: 425,
      },
    ],
    loc: {
      limit: 10000,
      balance: 8500,
      interestRate: 0.085,
    },
    baseline: {
      months: 48,
      totalInterest: 2600,
      isPayoffPossible: true,
    },
    velocity: {
      months: 0,
      totalInterest: 0,
      savings: 0,
      isPayoffPossible: false,
      failureReason: 'negative-cash-flow',
    },
  });

  assert.equal(
    model.vitals.map((vital) => vital.label).join('|'),
    'Cash Flow|Interest Burn|Debt-Free ETA|Next Move'
  );
  assert.equal(model.vitals.length, 4);
  assert.equal(model.vitals.find((vital) => vital.id === 'debt-free-eta').value, 'Stabilize first');
  assert.equal(model.nextMove.title, 'Restore positive cash flow');
  assert.ok(model.warnings.some((warning) => warning.kind === 'cash-flow'));
  assert.ok(model.warnings.some((warning) => warning.kind === 'loc-utilization'));
});

test('dashboard model treats a missing LOC limit as setup needed instead of maxed out', () => {
  const model = dashboardModel.buildDashboardModel({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebt: {
      name: 'Auto Loan',
      balance: 18450,
      interestRate: 0.069,
      minimumPayment: 425,
    },
    allDebts: [
      {
        name: 'Auto Loan',
        balance: 18450,
        interestRate: 0.069,
        minimumPayment: 425,
      },
    ],
    loc: {
      limit: 0,
      balance: 0,
      interestRate: 0.085,
    },
    baseline: {
      months: 48,
      totalInterest: 2600,
      isPayoffPossible: true,
    },
    velocity: {
      months: 0,
      totalInterest: 0,
      savings: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    },
  });

  assert.equal(model.locUtilization, 0);
  assert.equal(model.locUtilizationLabel, 'No LOC');
  assert.equal(model.nextMove.title, 'Add LOC details');
  assert.equal(model.nextMove.value, 'No LOC set');
  assert.ok(model.warnings.some((warning) => warning.kind === 'loc-setup'));
  assert.ok(!model.warnings.some((warning) => warning.kind === 'loc-utilization'));
  const locArtifact = model.moneyLoopArtifacts.find((artifact) => artifact.id === 'loc');
  assert.equal(locArtifact.value, 'Add LOC limit');
  assert.equal(locArtifact.signal, 'Setup needed');
  assert.equal(locArtifact.note, 'LOC capacity needs a limit before chunk projections are meaningful.');
  assert.equal(locArtifact.tone, 'amber');
  assert.equal(locArtifact.fillPercent, 12);
});

test('dashboard model labels an existing LOC balance without a limit as missing limit', () => {
  const model = dashboardModel.buildDashboardModel({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebt: {
      name: 'Auto Loan',
      balance: 18450,
      interestRate: 0.069,
      minimumPayment: 425,
    },
    allDebts: [
      {
        name: 'Auto Loan',
        balance: 18450,
        interestRate: 0.069,
        minimumPayment: 425,
      },
    ],
    loc: {
      limit: 0,
      balance: 3200,
      interestRate: 0.085,
    },
    baseline: {
      months: 48,
      totalInterest: 2600,
      isPayoffPossible: true,
    },
    velocity: {
      months: 0,
      totalInterest: 0,
      savings: 0,
      isPayoffPossible: false,
      failureReason: 'loc-overlimit',
    },
  });

  assert.equal(model.locNeedsSetup, true);
  assert.equal(model.locUtilization, 0);
  assert.equal(model.locUtilizationLabel, 'Missing limit');
  assert.equal(model.nextMove.title, 'Add LOC details');
  assert.equal(model.nextMove.value, 'Missing limit');
  assert.ok(model.warnings.some((warning) => warning.kind === 'loc-setup'));
  assert.ok(!model.warnings.some((warning) => warning.kind === 'loc-utilization'));
});

test('dashboard model treats a full LOC as no available room instead of over-limit', () => {
  const model = dashboardModel.buildDashboardModel({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebt: {
      name: 'Auto Loan',
      balance: 18450,
      interestRate: 0.069,
      minimumPayment: 425,
    },
    allDebts: [
      {
        name: 'Auto Loan',
        balance: 18450,
        interestRate: 0.069,
        minimumPayment: 425,
      },
    ],
    loc: {
      limit: 10000,
      balance: 10000,
      interestRate: 0.085,
    },
    baseline: {
      months: 48,
      totalInterest: 2600,
      isPayoffPossible: true,
    },
    velocity: {
      months: 0,
      totalInterest: 0,
      savings: 0,
      isPayoffPossible: false,
      failureReason: 'loc-no-capacity',
    },
  });

  assert.equal(model.availableLoc, 0);
  assert.equal(model.locUtilizationLabel, '100%');
  assert.equal(model.nextMove.title, 'Create LOC room');
  assert.equal(model.nextMove.value, 'No LOC room');
  assert.ok(model.warnings.some((warning) => warning.kind === 'loc-no-capacity'));
  assert.ok(!model.warnings.some((warning) => warning.kind === 'loc-overlimit'));
  assert.ok(!model.warnings.some((warning) => warning.kind === 'loc-utilization'));
  const locArtifact = model.moneyLoopArtifacts.find((artifact) => artifact.id === 'loc');
  assert.equal(locArtifact.value, '$0 open');
  assert.equal(locArtifact.signal, '100% used');
  assert.equal(locArtifact.tone, 'amber');
});

test('dashboard model provides a five-part Money Loop artifact rail without adding vitals', () => {
  const model = dashboardModel.buildDashboardModel({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebt: {
      name: 'Auto Loan',
      balance: 18450,
      interestRate: 0.069,
      minimumPayment: 425,
    },
    allDebts: [
      {
        name: 'Auto Loan',
        balance: 18450,
        interestRate: 0.069,
        minimumPayment: 425,
      },
    ],
    loc: {
      limit: 25000,
      balance: 3200,
      interestRate: 0.085,
    },
    baseline: {
      months: 48,
      totalInterest: 2600,
      isPayoffPossible: true,
    },
    velocity: {
      months: 36,
      totalInterest: 1800,
      savings: 800,
      isPayoffPossible: true,
    },
  });

  assert.equal(model.vitals.length, 4);
  assert.ok(Array.isArray(model.moneyLoopArtifacts), 'expected dashboard model to expose visual artifacts');
  assert.equal(
    model.moneyLoopArtifacts.map((artifact) => artifact.label).join('|'),
    'Income|LOC|Expenses|Cash Flow|Principal'
  );
  assert.ok(
    model.moneyLoopArtifacts.every(
      (artifact) => Number.isFinite(artifact.fillPercent) && artifact.fillPercent >= 12 && artifact.fillPercent <= 100
    ),
    JSON.stringify(model.moneyLoopArtifacts)
  );
  assert.equal(model.moneyLoopArtifacts.find((artifact) => artifact.id === 'cash-flow').tone, 'emerald');
});

test('dashboard model explains why edited inputs change the plan without adding vitals', () => {
  const model = dashboardModel.buildDashboardModel({
    monthlyIncome: 6500,
    monthlyExpenses: 5000,
    chunkAmount: 1000,
    activeDebt: {
      name: 'Auto Loan',
      balance: 18450,
      interestRate: 0.069,
      minimumPayment: 425,
    },
    allDebts: [
      {
        name: 'Auto Loan',
        balance: 18450,
        interestRate: 0.069,
        minimumPayment: 425,
      },
    ],
    loc: {
      limit: 25000,
      balance: 3200,
      interestRate: 0.085,
    },
    baseline: {
      months: 48,
      totalInterest: 2600,
      isPayoffPossible: true,
    },
    velocity: {
      months: 36,
      totalInterest: 1800,
      savings: 800,
      isPayoffPossible: true,
    },
  });

  assert.equal(model.vitals.length, 4);
  assert.ok(Array.isArray(model.changeExplanations), 'expected dashboard model to expose change explanations');
  assert.equal(
    model.changeExplanations.map((explanation) => explanation.label).join('|'),
    'Cash Flow|LOC Room|Chunk|ETA'
  );
  assert.ok(
    model.changeExplanations.some((explanation) =>
      explanation.body.includes('Income minus expenses')
    ),
    JSON.stringify(model.changeExplanations)
  );
  assert.ok(
    model.changeExplanations.some((explanation) =>
      explanation.body.includes('capped by the active debt balance and available LOC room')
    ),
    JSON.stringify(model.changeExplanations)
  );
});

test('dashboard home page mounts the Money Loop artifact rail', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/page.tsx'), 'utf8');

  assert.ok(source.includes('MoneyLoopArtifactRail'), 'expected dashboard to render the artifact rail component');
  assert.ok(source.includes('data-testid="money-loop-artifact-rail"'), 'expected a stable smoke-test hook');
});

test('dashboard home page mounts why-this-changed explanations', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/page.tsx'), 'utf8');

  assert.ok(source.includes('Why this changed'), 'expected dashboard to name the explanation panel');
  assert.ok(source.includes('data-testid="dashboard-change-explanations"'), 'expected a stable explanation smoke-test hook');
  assert.ok(source.includes('model.changeExplanations.map'), 'expected dashboard to render model-backed explanations');
});

test('Money Loop artifact child hooks do not collide with the rail smoke hook', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/MoneyLoopArtifactRail.tsx'), 'utf8');

  assert.ok(
    source.includes('data-testid={`money-loop-artifact-node-${artifact.id}`}'),
    'expected child artifacts to use a distinct node hook prefix'
  );
  assert.ok(
    !source.includes('data-testid={`money-loop-artifact-${artifact.id}`}'),
    'expected child artifacts not to share the rail test hook prefix'
  );
});

test('Money Loop artifact rail contains horizontal overflow inside its own frame', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/MoneyLoopArtifactRail.tsx'), 'utf8');

  assert.ok(source.includes('overflow-x-auto'), 'expected artifact rail to scroll internally when the panel is narrow');
  assert.ok(source.includes('min-w-[760px]'), 'expected artifact cards to keep a stable minimum rail width');
  assert.ok(source.includes('grid-cols-5'), 'expected the five Money Loop artifacts to remain a horizontal rail');
});

test('Money Loop artifact rail exposes an item-selection carousel', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/MoneyLoopArtifactRail.tsx'), 'utf8');
  const css = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/globals.css'), 'utf8');

  assert.ok(source.includes('useState'), 'expected artifact rail to track the selected artifact');
  assert.ok(source.includes('setActiveArtifactId'), 'expected artifact selector controls to update the active artifact');
  assert.ok(source.includes('data-testid="money-loop-artifact-active"'), 'expected a stable active artifact smoke hook');
  assert.ok(source.includes('role="tablist"'), 'expected selector controls to expose tablist semantics');
  assert.ok(source.includes('aria-selected={isActive}'), 'expected selector controls to expose selected state');
  assert.ok(source.includes('artifact-carousel-token'), 'expected active artifact to use the carousel token animation class');
  assert.ok(css.includes('@keyframes artifactSpinSelect'), 'expected selected artifacts to spin once when chosen');
  assert.ok(css.includes('.artifact-carousel-token'), 'expected CSS to define the active carousel token');
});

test('Money Loop artifact rail renders a model-backed payoff orbit visual', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/MoneyLoopArtifactRail.tsx'), 'utf8');
  const css = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/globals.css'), 'utf8');

  assert.ok(source.includes('orbitNodePositions'), 'expected artifact rail to define stable orbit node positions');
  assert.ok(source.includes('data-testid="money-loop-payoff-orbit"'), 'expected a stable active orbit smoke hook');
  assert.ok(
    source.includes('data-testid={`money-loop-orbit-node-${artifact.id}`}'),
    'expected the orbit to render one model-backed node per Money Loop artifact'
  );
  assert.ok(
    source.includes('--active-artifact-color') && source.includes('--orbit-node-color'),
    'expected orbit visuals to use model tone colors instead of static decoration'
  );
  assert.ok(css.includes('.artifact-orbit-ring'), 'expected CSS to draw the payoff orbit ring');
  assert.ok(css.includes('.artifact-orbit-sweep'), 'expected CSS to draw the payoff orbit sweep');
  assert.ok(css.includes('@keyframes artifactOrbitSweep'), 'expected the orbit sweep to animate when motion is allowed');
  assert.ok(
    css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('.artifact-orbit-sweep'),
    'expected the payoff orbit to define a reduced-motion state'
  );
});

test('dashboard Money Loop rail is width-contained for mobile layouts', () => {
  const pageSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/page.tsx'), 'utf8');
  const railSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/MoneyLoopArtifactRail.tsx'), 'utf8');

  assert.ok(
    pageSource.includes('${classes.glass} min-w-0 rounded-2xl'),
    'expected the dashboard loop panel to allow child overflow containment'
  );
  assert.ok(
    railSource.includes('relative min-w-0 rounded-2xl'),
    'expected the artifact rail itself to be min-width contained'
  );
});

test('CountUp starts from the supplied value instead of a zero placeholder', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/CountUp.tsx'), 'utf8');

  assert.ok(source.includes('const safeValue = Number.isFinite(value) ? value : 0'), 'expected CountUp to sanitize non-finite source values');
  assert.ok(source.includes('useMotionValue(safeValue)'), 'expected CountUp motion value to initialize from the sanitized supplied value');
  assert.ok(
    source.includes('formatCountUpValue(safeValue, prefix, suffix, decimals)'),
    'expected CountUp display text to initialize from the sanitized supplied value'
  );
  assert.ok(
    !source.includes('useState(`${prefix}0${suffix}`)'),
    'expected CountUp not to render a zero placeholder before the real value'
  );
});

test('CountUp hides animated financial ticks from assistive technology', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/CountUp.tsx'), 'utf8');

  assert.ok(
    source.includes('const stableText = formatCountUpValue(safeValue, prefix, suffix, decimals)'),
    'expected CountUp to compute a stable final value for assistive technology'
  );
  assert.ok(source.includes('aria-hidden="true"'), 'expected the animated text to be visual-only');
  assert.ok(source.includes('className="sr-only"'), 'expected a screen-reader-only stable value');
  assert.ok(source.includes('{stableText}'), 'expected CountUp to render the stable value for screen readers');
});

test('CountUp sanitizes non-finite animated values before formatting', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/CountUp.tsx'), 'utf8');

  assert.ok(
    source.includes('const safeValue = Number.isFinite(value) ? value : 0;'),
    'expected CountUp formatter and component to use a finite fallback'
  );
  assert.ok(source.includes('motionVal.set(safeValue)'), 'expected offscreen updates to avoid non-finite motion values');
  assert.ok(source.includes('animate(motionVal, safeValue'), 'expected animations to avoid non-finite motion targets');
});

test('Learn animated progress counter hides visual ticks from assistive technology', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8');

  assert.ok(source.includes('function AnimatedCounter'), 'expected Learn page to keep a local animated progress counter');
  assert.ok(source.includes('useMotionValue(value)'), 'expected Learn counter motion value to initialize from the final value');
  assert.ok(source.includes('const stableText = String(value)'), 'expected Learn counter to compute stable screen-reader text');
  assert.ok(source.includes('aria-hidden="true"'), 'expected Learn counter animated text to be visual-only');
  assert.ok(source.includes('className="sr-only"'), 'expected Learn counter to render a stable screen-reader-only value');
  assert.ok(source.includes('{stableText}'), 'expected Learn counter to render the stable value for assistive technology');
  assert.ok(
    !source.includes('const motionVal = useMotionValue(0);'),
    'expected Learn counter not to initialize from a zero placeholder'
  );
});

test('Learn decorative celebration canvases are hidden from assistive technology', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/app/learn/page.tsx'), 'utf8');
  const canvasCount = (source.match(/<canvas/g) ?? []).length;
  const ariaHiddenCanvasCount = (source.match(/aria-hidden="true"/g) ?? []).length;
  const presentationCanvasCount = (source.match(/role="presentation"/g) ?? []).length;

  assert.equal(canvasCount, 2);
  assert.ok(
    ariaHiddenCanvasCount >= canvasCount,
    'expected each Learn celebration canvas to be hidden from assistive technology'
  );
  assert.ok(
    presentationCanvasCount >= canvasCount,
    'expected each Learn celebration canvas to be marked as presentation-only'
  );
});

test('pre-app preview blocks unstable debt-free date claims', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/PreAppPreview.tsx'), 'utf8');
  const modelSource = fs.readFileSync(path.resolve(__dirname, '..', 'src/components/pre-app-preview-model.ts'), 'utf8');

  assert.ok(
    modelSource.includes('function hasStablePayoffProjection'),
    'expected preview to derive payoff validity before showing ETA and score claims'
  );
  assert.ok(
    modelSource.includes('const debtFreeDateLabel = payoffProjected'),
    'expected preview to store a projection-gated date label'
  );
  assert.ok(
    source.includes("value: snapshot.debtFreeDateLabel"),
    'expected Debt-Free Date card to use the gated label'
  );
  assert.ok(
    modelSource.includes(": 'Review inputs';"),
    'expected invalid preview projections to show Review inputs'
  );
  assert.ok(
    modelSource.includes('const velocityScore = payoffProjected'),
    'expected preview velocity score to be gated by payoff validity'
  );
  assert.ok(
    !source.includes('const freedomMonths = velocity.months;'),
    'expected preview not to convert raw velocity months into a date without validation'
  );
  assert.ok(
    !source.includes("value: snapshot.freedomDate.toLocaleDateString"),
    'expected preview not to render a raw date from an unvalidated payoff projection'
  );
});

test('pre-app preview snapshot ignores non-finite debt values at the model boundary', () => {
  const snapshot = preAppPreviewModel.buildPreAppPreviewSnapshot({
    currentTime: Date.UTC(2026, 0, 1),
    cashFlow: 1500,
    debts: [
      {
        id: 'corrupt',
        name: 'Corrupt Card',
        type: 'creditCard',
        balance: Number.POSITIVE_INFINITY,
        interestRate: Number.NaN,
        minimumPayment: Number.POSITIVE_INFINITY,
      },
      {
        id: 'usable',
        name: 'Usable Card',
        type: 'creditCard',
        balance: 5000,
        interestRate: 0.24,
        minimumPayment: 125,
      },
    ],
    baseline: {
      months: 40,
      totalInterest: Number.POSITIVE_INFINITY,
      savings: 0,
      isPayoffPossible: true,
    },
    velocity: {
      months: Number.POSITIVE_INFINITY,
      totalInterest: 1000,
      savings: Number.POSITIVE_INFINITY,
      isPayoffPossible: true,
    },
  });

  assert.equal(snapshot.totalDebt, 5000);
  assert.equal(snapshot.next.id, 'usable');
  assert.equal(snapshot.top3.length, 1);
  assert.ok(Number.isFinite(snapshot.dailyBurn));
  assert.equal(snapshot.velocityScore, 0);
  assert.equal(snapshot.debtFreeDateLabel, 'Review inputs');
  assert.equal(snapshot.payoffProjected, false);
});

test('app startup defaults keep the dashboard ungated', () => {
  const state = appStore.useAppStore.getState();

  assert.equal(state.introModalOpen, false);
  assert.equal(state.skipIntroOnStartup, true);
  assert.equal(state.previewDismissed, true);
});

test('theme persisted state falls back from invalid browser storage', () => {
  const state = themeStore.useThemeStore.getState();
  const sanitized = themeStore.sanitizePersistedThemeState({ theme: 'neon' }, state);

  assert.equal(sanitized.theme, 'original');
  assert.ok(themeStore.themeClasses[sanitized.theme], 'expected sanitized theme to map to theme classes');
});

test('preferences persisted state sanitizes local UI settings', () => {
  const state = preferencesStore.usePreferencesStore.getState();
  const sanitized = preferencesStore.sanitizePersistedPreferencesState({
    teacherMode: 'yes',
    skipIntroOnStartup: 'no',
    landingPreference: 'settings',
    previewPersistHours: Number.POSITIVE_INFINITY,
    showPreAppPreview: 'maybe',
    lastPreviewRefresh: 'bad-date',
  }, state);

  assert.equal(sanitized.teacherMode, state.teacherMode);
  assert.equal(sanitized.skipIntroOnStartup, state.skipIntroOnStartup);
  assert.equal(sanitized.landingPreference, 'dashboard');
  assert.equal(sanitized.previewPersistHours, state.previewPersistHours);
  assert.equal(sanitized.showPreAppPreview, state.showPreAppPreview);
  assert.equal(sanitized.lastPreviewRefresh, state.lastPreviewRefresh);
});

test('app persisted state sanitizes shell routing and demo user state', () => {
  const state = appStore.useAppStore.getState();
  const sanitized = appStore.sanitizePersistedAppState({
    introSeen: 'true',
    introModalOpen: true,
    skipIntroOnStartup: false,
    setupComplete: 'done',
    landingPage: 'vault',
    user: {
      email: '',
      name: 123,
      avatarUrl: [],
    },
    previewDismissed: false,
  }, state);

  assert.equal(sanitized.introSeen, true);
  assert.equal(sanitized.introModalOpen, false);
  assert.equal(sanitized.skipIntroOnStartup, true);
  assert.equal(sanitized.setupComplete, state.setupComplete);
  assert.equal(sanitized.landingPage, 'dashboard');
  assert.equal(sanitized.user, null);
  assert.equal(sanitized.previewDismissed, true);
});

test('web app exposes a repeatable route smoke command', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  const smokeScriptPath = path.resolve(__dirname, 'smoke-routes.cjs');
  const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

  assert.equal(packageJson.scripts['smoke:routes'], 'node scripts/smoke-routes.cjs');
  assert.ok(fs.existsSync(smokeScriptPath), 'expected a repeatable web route smoke script');
  assert.ok(smokeScript.includes("['/', 'Dashboard'"), 'expected smoke script to cover the dashboard route');
  assert.ok(smokeScript.includes("['/simulator', 'Simulator'"), 'expected smoke script to cover the simulator route');
  assert.ok(smokeScript.includes("['/cockpit', 'Cockpit'"), 'expected smoke script to cover the cockpit route');
  assert.ok(smokeScript.includes("['/portfolio', 'Portfolio'"), 'expected smoke script to cover the portfolio route');
  assert.ok(smokeScript.includes("['/learn', 'Learn'"), 'expected smoke script to cover the learn route');
  assert.ok(smokeScript.includes("['/settings', 'Settings'"), 'expected smoke script to cover the settings route');
  assert.ok(smokeScript.includes("['/vault', 'Vault'"), 'expected smoke script to cover the vault route');
  assert.ok(smokeScript.includes("process.platform === 'win32' ? 'cmd.exe' : 'npm'"), 'expected smoke script to use a Windows-safe npm wrapper');
  assert.ok(smokeScript.includes("'npm run start'"), 'expected smoke script to start Next through npm');
  assert.ok(smokeScript.includes('taskkill'), 'expected smoke script to clean up Windows child processes');
  assert.ok(smokeScript.includes('detached: process.platform !=='), 'expected smoke script to isolate non-Windows server process groups');
  assert.ok(smokeScript.includes('process.kill(-server.pid'), 'expected smoke script to clean up non-Windows process groups');
  assert.ok(smokeScript.includes("'start'"), 'expected smoke script to smoke the built Next server');
  assert.ok(smokeScript.includes('response.statusCode !== 200'), 'expected smoke script to fail non-200 routes');
  assert.ok(smokeScript.includes("content-type") && smokeScript.includes("text/html"), 'expected smoke script to verify HTML responses');
  assert.ok(smokeScript.includes('InterestShield - Financial Empowerment'), 'expected smoke script to verify app metadata');
  assert.ok(smokeScript.includes('/_next/static'), 'expected smoke script to verify Next static assets');
  assert.ok(smokeScript.includes('finally') && smokeScript.includes('stopServer(server)'), 'expected smoke script to clean up the server');
});

test('web app exposes a repeatable accessibility route contract', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  const a11yScriptPath = path.resolve(__dirname, 'accessibility-route-contract.cjs');
  const a11yScript = fs.existsSync(a11yScriptPath) ? fs.readFileSync(a11yScriptPath, 'utf8') : '';

  assert.ok(
    packageJson.scripts.test.includes('node scripts/accessibility-route-contract.cjs'),
    'expected npm test to run the accessibility route contract'
  );
  assert.equal(packageJson.scripts['test:a11y'], 'node scripts/accessibility-route-contract.cjs');
  assert.ok(fs.existsSync(a11yScriptPath), 'expected a repeatable accessibility route contract script');
  assert.ok(a11yScript.includes("route: '/', label: 'Dashboard'"), 'expected dashboard route accessibility coverage');
  assert.ok(a11yScript.includes("route: '/simulator', label: 'Simulator'"), 'expected simulator route accessibility coverage');
  assert.ok(a11yScript.includes("route: '/cockpit', label: 'Cockpit'"), 'expected cockpit route accessibility coverage');
  assert.ok(a11yScript.includes("route: '/portfolio', label: 'Portfolio'"), 'expected portfolio route accessibility coverage');
  assert.ok(a11yScript.includes("route: '/learn', label: 'Learn'"), 'expected learn route accessibility coverage');
  assert.ok(a11yScript.includes("route: '/settings', label: 'Settings'"), 'expected settings route accessibility coverage');
  assert.ok(a11yScript.includes("route: '/vault', label: 'Vault'"), 'expected vault route accessibility coverage');
  assert.ok(
    a11yScript.includes('scanNonInteractiveClickTargets') && a11yScript.includes('onClick on <'),
    'expected accessibility route contract to reject non-native click targets'
  );
  assert.ok(
    a11yScript.includes('scanUnnamedFormControls') && a11yScript.includes('missing an accessible name'),
    'expected accessibility route contract to reject unnamed form controls'
  );
  assert.ok(
    a11yScript.includes('aria-label="Primary navigation"') &&
      a11yScript.includes('aria-label="Ask Velocity Guardian a question"') &&
      a11yScript.includes('aria-current={i === step ?'),
    'expected accessibility route contract to cover shared navigation, Guardian, and Vault stepper keyboard markers'
  );
});

test('web app exposes a repeatable production Vercel smoke command', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
  const productionSmokeScriptPath = path.resolve(__dirname, 'smoke-production.cjs');
  const productionSmokeScript = fs.existsSync(productionSmokeScriptPath)
    ? fs.readFileSync(productionSmokeScriptPath, 'utf8')
    : '';

  assert.equal(packageJson.scripts['smoke:production'], 'node scripts/smoke-production.cjs');
  assert.ok(fs.existsSync(productionSmokeScriptPath), 'expected a repeatable production Vercel smoke script');
  assert.ok(
    productionSmokeScript.includes("process.env.PRODUCTION_ORIGIN || 'https://web-islanddevcrew.vercel.app'"),
    'expected production smoke to default to the current Vercel app URL while allowing overrides'
  );
  assert.ok(productionSmokeScript.includes("['/', 'Dashboard'"), 'expected production smoke to cover the dashboard route');
  assert.ok(productionSmokeScript.includes("['/simulator', 'Simulator'"), 'expected production smoke to cover the simulator route');
  assert.ok(productionSmokeScript.includes("['/cockpit', 'Cockpit'"), 'expected production smoke to cover the cockpit route');
  assert.ok(productionSmokeScript.includes("['/portfolio', 'Portfolio'"), 'expected production smoke to cover the portfolio route');
  assert.ok(productionSmokeScript.includes("['/learn', 'Learn'"), 'expected production smoke to cover the learn route');
  assert.ok(productionSmokeScript.includes("['/settings', 'Settings'"), 'expected production smoke to cover the settings route');
  assert.ok(productionSmokeScript.includes("['/vault', 'Vault'"), 'expected production smoke to cover the vault route');
  assert.ok(productionSmokeScript.includes('response.statusCode !== 200'), 'expected production smoke to fail non-200 routes');
  assert.ok(
    productionSmokeScript.includes("content-type") && productionSmokeScript.includes("text/html"),
    'expected production smoke to verify HTML responses'
  );
  assert.ok(productionSmokeScript.includes('InterestShield - Financial Empowerment'), 'expected production smoke to verify app metadata');
  assert.ok(productionSmokeScript.includes('/_next/static'), 'expected production smoke to verify Next static assets');
  assert.ok(productionSmokeScript.includes('DEPLOYMENT_NOT_FOUND'), 'expected production smoke to catch missing Vercel deployments');
  assert.ok(productionSmokeScript.includes('Vercel Authentication'), 'expected production smoke to catch protected deployments');
  assert.ok(
    productionSmokeScript.includes('data-testid="login/email-button"') &&
      productionSmokeScript.includes('Continue with Email') &&
      productionSmokeScript.includes('sso-api?url='),
    'expected production smoke to catch Vercel login-shell protection pages'
  );
  assert.ok(
    productionSmokeScript.includes('VERCEL_AUTOMATION_BYPASS_SECRET'),
    'expected production smoke to support the Vercel automation bypass secret'
  );
  assert.ok(
    productionSmokeScript.includes('x-vercel-protection-bypass'),
    'expected production smoke to send the Vercel protection bypass header when configured'
  );
  assert.ok(
    productionSmokeScript.includes('statusCode === 401') &&
      productionSmokeScript.includes('statusCode === 403'),
    'expected production smoke to diagnose protected preview status codes'
  );
  assert.ok(
    productionSmokeScript.includes('Vercel Deployment or Preview Protection') &&
      productionSmokeScript.includes('use `vercel curl`'),
    'expected protected preview failures to produce an actionable release-verification hint'
  );
  assert.ok(
    productionSmokeScript.includes('currentShellSignatures') &&
      productionSmokeScript.includes('data-testid="primary-navigation"'),
    'expected production smoke to require the current shared navigation shell marker'
  );
  assert.ok(
    productionSmokeScript.includes('did not expose the current InterestShield shell marker'),
    'expected production smoke to fail clearly when the current shell marker is missing'
  );
  assert.ok(
    productionSmokeScript.includes('staleProductionSignatures') &&
      productionSmokeScript.includes('Welcome to InterestShield') &&
      productionSmokeScript.includes('This is NOT a budget app') &&
      productionSmokeScript.includes('Financial Health'),
    'expected production smoke to reject the known stale intro-gated production build'
  );
  assert.ok(
    productionSmokeScript.includes('older intro-gated InterestShield build') &&
      productionSmokeScript.includes('money-loop-artifact-rail') &&
      productionSmokeScript.includes('money-loop-payoff-orbit') &&
      productionSmokeScript.includes('four dashboard vitals'),
    'expected stale production failures to explain the required rendered freshness check'
  );
  assert.ok(
    productionSmokeScript.includes('buildDeploymentDiagnostics') &&
      productionSmokeScript.includes('Observed Vercel diagnostics') &&
      productionSmokeScript.includes('deployment marker(s)') &&
      productionSmokeScript.includes('x-vercel-id'),
    'expected production smoke failures to include observed Vercel deployment diagnostics'
  );
});

test('web app declares Vercel Next deployment configuration', () => {
  const vercelConfigPath = path.resolve(__dirname, '..', 'vercel.json');

  assert.ok(fs.existsSync(vercelConfigPath), 'expected apps/web/vercel.json to document web deployment intent');
  const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

  assert.equal(config.$schema, 'https://openapi.vercel.sh/vercel.json');
  assert.equal(config.framework, 'nextjs');
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.devCommand, 'next dev --port $PORT');
});

test('repository exposes a manual release deployment smoke workflow', () => {
  const workflowPath = path.resolve(__dirname, '..', '..', '..', '.github', 'workflows', 'release-smoke.yml');
  const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, 'utf8') : '';

  assert.ok(fs.existsSync(workflowPath), 'expected a manual release smoke workflow');
  assert.ok(workflow.includes('workflow_dispatch'), 'expected release smoke to run manually');
  assert.ok(workflow.includes('production_origin'), 'expected release smoke to accept a target deployment origin');
  assert.ok(
    workflow.includes('VERCEL_AUTOMATION_BYPASS_SECRET'),
    'expected release smoke to pass the Vercel automation bypass secret when configured'
  );
  assert.ok(workflow.includes('npm run smoke:production'), 'expected release smoke to run deployed web route smoke');
  assert.ok(workflow.includes('inputs.run_mobile_export'), 'expected release smoke to make Expo export smoke optional');
  assert.ok(workflow.includes('npm run smoke:web-export'), 'expected release smoke to verify the Expo web export');
});

test('client mount hook notifies subscribers after hydration', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'src/hooks/useIsClient.ts'), 'utf8');

  assert.ok(
    !source.includes('const subscribe = () => () => {};'),
    'expected useIsClient subscription not to be inert'
  );
  assert.ok(
    source.includes('const subscribe = (callback: () => void)'),
    'expected useIsClient subscription to notify React after hydration'
  );
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }
}

if (failures > 0) {
  console.error(`${failures} regression test${failures === 1 ? '' : 's'} failed.`);
  process.exit(1);
}

console.log(`${tests.length} regression tests passed.`);
