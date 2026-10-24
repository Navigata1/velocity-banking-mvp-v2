/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { loadDatedTestModule: load, datedBookFixture } = require('./dated-codec-tests.cjs');
const { datedPlanFixture } = require('./dated-plan-tests.cjs');
// Independent cent conversion and fixed365, statement-only half-up reference; no engine rounding oracle.
function cents(value) {
  assert.equal(typeof value, 'number', 'money must be a primitive finite number');
  assert.ok(Number.isFinite(value), 'money must be a primitive finite number');
  const c = Math.round(value * 100); assert.ok(Number.isSafeInteger(c) && Math.abs(c / 100 - value) < 1e-9); return BigInt(c);
}
const halfUp = (n, d) => n / d + (n % d * 2n >= d ? 1n : 0n);
const rates = { '.365': [365n, 1000n], '.1825': [1825n, 10000n], '.073': [73n, 1000n] };
const dateRange = (from, to) => { const rows = []; for (let d = new Date(from + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) rows.push(d.toISOString().slice(0, 10)); return rows; };
const terms = more => ({ annualFee: 0, transactionFeePercent: 0, rateMode: 'fixed', drawPeriodMonths: 120, repaymentPeriodMonths: 180, minimumDraw: 0, minimumPayment: { mode: 'fixed', value: 50 }, ...more });
const span = (from, to, balance) => ({ from, to, balance });
const jan = balance => [span('2026-01-01', '2026-01-31', balance)];
const aCases = [
  { id: 'A01', label: 'annual fee accrues with principal for 31 real days', apr: .365, fee: 12.34, end: '2026-01-31', cash: 150, reserve: 50, bal: 1000, spans: jan(1012.34), expected: [150, 1043.72, 31.38, 12.34] },
  { id: 'A02', label: 'leap February has 29 actual days, fixed365', apr: .365, start: '2028-02-01', end: '2028-02-29', cash: 100, reserve: 100, bal: 1000, spans: [span('2028-02-01', '2028-02-29', 1000)], expected: [100, 1029, 29, 0] },
  { id: 'A03', label: 'nonleap February has 28 actual days', apr: .365, start: '2027-02-01', end: '2027-02-28', cash: 100, reserve: 100, bal: 1000, spans: [span('2027-02-01', '2027-02-28', 1000)], expected: [100, 1028, 28, 0] },
  { id: 'A04', label: '30-day month at non-36.5-percent APR', apr: .073, start: '2026-04-01', end: '2026-04-30', cash: 40, reserve: 40, bal: 1000, spans: [span('2026-04-01', '2026-04-30', 1000)], expected: [40, 1006, 6, 0] },
  { id: 'A05', label: 'fractional-cent daily accrual rounds once, not each day', apr: .1825, end: '2026-01-31', cash: 10, reserve: 10, bal: 1.01, spans: jan(1.01), expected: [10, 1.03, .02, 0] },
  { id: 'A06', label: 'half-cent financed draw fee rounds once before accrual', apr: .365, feeRate: .005, end: '2026-01-31', cash: 20, reserve: 20, bal: 100, actions: { '2026-01-01': a => a.spend(100n, 'loc') }, spans: jan(101.01), expected: [20, 104.14, 3.13, .01] },
  { id: 'A07', label: 'either funding uses only unreserved cash and fees only its draw', apr: .365, feeRate: .01, end: '2026-01-31', cash: 160, reserve: 60, bal: 200, actions: { '2026-01-01': a => a.spend(12500n, 'either', 'debt-payment') }, spans: jan(225.25), expected: [60, 232.23, 6.98, .25] },
  { id: 'A08', label: 'real repayment credits minimum once before same-day new draw', apr: .365, feeRate: .02, end: '2026-01-31', cash: 200, reserve: 50, bal: 500, owed: 50, due: 1, actions: { '2026-01-01': a => { a.receiveIncome(10000n); a.repayLOC(7000n); a.spend(8000n, 'loc'); } }, spans: jan(511.60), expected: [230, 527.46, 15.86, 1.60], noDue: true },
  { id: 'A09', label: 'income/checking expense/minimum/chunk are four real same-day legs', apr: .365, feeRate: .0125, end: '2026-01-31', cash: 100, reserve: 50, bal: 500, owed: 40, due: 1, actions: { '2026-01-01': a => { a.receiveIncome(20000n); a.spend(8000n, 'checking'); a.settleDue(); a.spend(10000n, 'loc', 'chunk', 'target'); } }, spans: jan(561.25), expected: [180, 578.65, 17.40, 1.25], ordered: ['income', 'expense', 'loc-minimum', 'chunk', 'draw-fee'] },
  { id: 'A10', label: 'after-statement repayment credits new bill, not next draw twice', apr: .365, feeRate: .01, end: '2026-02-28', cash: 400, reserve: 100, bal: 1000, actions: { '2026-02-01': a => a.spend(10000n, 'loc') }, post: { '2026-01-31': 6000n }, spans: [...jan(1000), span('2026-02-01', '2026-02-28', 1072)], expected: [340, 1102.02, 61.02, 1], noDue: true },
  { id: 'A11', label: 'year boundary annual fee and due minimum do not consume reserve twice', apr: .365, fee: 10, start: '2027-12-01', end: '2028-01-31', cash: 300, reserve: 100, bal: 1000, fixed: 25, due: 1, actions: { '2028-01-01': a => { a.receiveIncome(10000n); a.spend(2000n, 'checking'); } }, spans: [span('2027-12-01', '2027-12-31', 1000), span('2028-01-01', '2028-01-31', 1016)], expected: [355, 1047.50, 62.50, 10] },
  { id: 'A12', label: 'funded leap-month maturity pays prior accrual plus financed fee', apr: .365, fee: 5, start: '2028-02-01', end: '2028-02-29', cash: 1119.07, reserve: 100, bal: 1000, short: true, annual: '2028-02-01', spans: [span('2028-02-01', '2028-02-14', 1005), span('2028-02-15', '2028-02-29', 0)], expected: [100, 0, 14.07, 5] },
  { id: 'A13', label: 'Feb29 annual anniversary clamps once in a nonleap February', apr: .365, fee: 12.34, start: '2027-02-01', end: '2027-02-28', annual: '2024-02-29', cash: 200, reserve: 50, bal: 1000, spans: [span('2027-02-01', '2027-02-27', 1000), span('2027-02-28', '2027-02-28', 1012.34)], expected: [200, 1040.35, 28.01, 12.34] },
];
function makePlan(c) { return { ...datedPlanFixture(), startDate: c.start || '2026-01-01', openingCash: c.cash, cashReserve: c.reserve, openingMinimumPayment: c.owed || 0, minimumDueDay: c.due || 15, annualFeeFirstDueOn: c.annual || '2020-01-01', cashEvents: [], ...(c.short ? { accountOpenedOn: '2027-12-15', drawEndsOn: '2028-01-15', maturesOn: '2028-02-15' } : {}) }; }
function checkDaily(daily, spans, apr) {
  const bases = new Map(); for (const s of spans) for (const date of dateRange(s.from, s.to)) { assert.equal(bases.has(date), false); bases.set(date, cents(s.balance)); }
  assert.equal(daily.length, bases.size); const [rate, den] = rates[String(apr).replace('0.', '.')], sums = new Map();
  assert.deepEqual(Array.from(daily, row => row.date), Array.from(bases.keys()), 'exact ordered daily dates');
  for (const row of daily) { assert.equal(cents(row.interestBalance), bases.get(row.date), row.date + ' hand closing interest base'); sums.set(row.date.slice(0, 7), (sums.get(row.date.slice(0, 7)) || 0n) + bases.get(row.date) * rate); }
  return [...sums].map(([month, n]) => ({ month, expectedRoundedCents: halfUp(n, den * 365n), centDays: n / rate }));
}
function checkEvents(events, openingCash, openingLOC, reserve) {
  let cash = cents(openingCash), loc = cents(openingLOC), income = 0n, spent = 0n, cashSpent = 0n, draws = 0n, fees = 0n, interest = 0n, capitalInterest = 0n, cashInterest = 0n, repaid = 0n;
  for (const e of events) {
    const a = cents(e.amount), dc = cents(e.cashChange), dl = cents(e.locChange); assert.ok(a >= 0n);
    if (e.kind === 'income') { assert.equal(dc, a); assert.equal(dl, 0n); income += a; }
    else if (['expense', 'debt-payment', 'chunk'].includes(e.kind)) { assert.ok(dc <= 0n && dl >= 0n); assert.equal(-dc + dl, a); spent += a; cashSpent -= dc; draws += dl; }
    else if (['annual-fee', 'draw-fee'].includes(e.kind)) { assert.equal(dc, 0n); assert.equal(dl, a); fees += a; }
    else if (['loc-payment', 'loc-minimum', 'loc-maturity'].includes(e.kind)) { assert.equal(dc, -a); assert.equal(dl, -a); repaid += a; }
    else if (e.kind === 'loc-interest') { assert.ok(dc === 0n && dl === a || dc === -a && dl === 0n); interest += a; capitalInterest += dl; cashInterest -= dc; }
    else { assert.equal(e.kind, 'loc-statement'); assert.equal(dc, 0n); assert.equal(dl, 0n); }
    cash += dc; loc += dl; assert.equal(cents(e.cashBalance), cash); assert.equal(cents(e.locBalance), loc); assert.ok(cash >= cents(reserve));
  }
  assert.equal(cash, cents(openingCash) + income - cashSpent - repaid - cashInterest);
  assert.equal(loc, cents(openingLOC) + draws + fees + capitalInterest - repaid);
  assert.equal(cash - loc - (cents(openingCash) - cents(openingLOC)), income - spent - fees - interest);
  return { cash, loc, interest, fees };
}
const cashEvent = (id, day, kind, amount, source) => ({ id, day, kind, amount, ...(source ? { source } : {}) });
const debt = (balance, minimum, source = 'checking', apr = 0) => ({ id: 'loan', name: 'Loan', category: 'auto', kind: 'amortized', balance, apr, minPaymentRule: { type: 'fixed', amount: minimum }, paymentSource: source });
const normalEvents = [cashEvent('pay', 1, 'income', 1000), cashEvent('bill', 1, 'expense', 300, 'checking')];
const pCases = [
  { id: 'P14', label: 'velocity same-day income funds checking expense and credits minimum once', strategy: 'velocity', cash: 200, reserve: 100, bal: 1000, apr: .365, fee: 10, owed: 50, due: 1, events: normalEvents, spans: jan(210), rows: [[100, 216.51, 6.51, 10]], noDue: true },
  { id: 'P15', label: 'earlier checking expense cannot spend reserve or later same-day income', strategy: 'velocity', cash: 200, reserve: 100, bal: 1000, apr: .365, fee: 10, owed: 50, due: 1, events: [...normalEvents].reverse(), fail: ['2026-01-01', 'dated-cash-shortfall'], spans: [] },
  { id: 'P16', label: 'snowball later LOC repayment changes daily interest but not conserved cash', strategy: 'snowball', cash: 200, reserve: 100, bal: 1000, apr: .365, fee: 10, owed: 50, due: 1, events: normalEvents, spans: [span('2026-01-01', '2026-01-30', 960), span('2026-01-31', '2026-01-31', 210)], rows: [[100, 239.01, 29.01, 10]] },
  { id: 'P17', label: 'avalanche financed 1.25-percent fee and reserve have separate cash effects', strategy: 'avalanche', cash: 250, reserve: 75, bal: 1500, apr: .073, fee: 7.50, feeRate: .0125, owed: 20, due: 1, events: [cashEvent('pay', 1, 'income', 600), cashEvent('bill', 1, 'expense', 275, 'loc')], spans: [span('2026-01-01', '2026-01-30', 1765.94), span('2026-01-31', '2026-01-31', 1010.94)], rows: [[75, 1021.74, 10.80, 10.94]] },
  // Day-one cash50 minus reserve25 funds a real25 sweep, before Jan20 income: Jan1-19 base980.
  { id: 'P18', label: 'two-month real reserve/earmark/debt minimum/new LOC bill never duplicate inventory', strategy: 'velocity', cash: 50, reserve: 25, bal: 1000, apr: .365, fee: 5, debts: [debt(200, 30, 'checking', .12)], events: [cashEvent('pay', 20, 'income', 300), cashEvent('bill', 25, 'expense', 100, 'checking')], spans: [span('2026-01-01', '2026-01-19', 980), span('2026-01-20', '2026-01-31', 860), span('2026-02-01', '2026-02-19', 838.94), span('2026-02-20', '2026-02-28', 718.94)], rows: [[25, 838.94, 28.94, 5, 172, 2], [25, 691.35, 22.41, 0, 143.72, 1.72]], noDue: true },
  { id: 'P19', label: 'income/checking expense/debt minimum/chunk/sweep all have actual funding once', strategy: 'velocity', cash: 50, reserve: 50, bal: 100, apr: .365, feeRate: .02, owed: 20, due: 1, debtDay: 1, chunk: 200, debts: [debt(1000, 50, 'either')], events: [cashEvent('pay', 1, 'income', 500), cashEvent('bill', 1, 'expense', 100, 'checking')], spans: jan(0), rows: [[50, 0, 0, 4, 704, 0]], noDue: true, chunkCheck: true },
  { id: 'P20', label: 'either-funded debt minimum spends cash only above reserve and fees the remainder', strategy: 'snowball', cash: 75, reserve: 50, bal: 1000, apr: .365, feeRate: .01, debtDay: 1, debts: [debt(100, 50, 'either')], events: [], spans: jan(1025.25), rows: [[50, 1057.03, 31.78, .25, 50, 0]] },
  { id: 'P21', label: 'leap-day 30/31 clamping preserves entered order, anniversary fee and minimum credit', strategy: 'velocity', start: '2028-02-01', cash: 100, reserve: 100, bal: 2000, apr: .365, fee: 5, annual: '2024-02-29', owed: 50, due: 31, events: [cashEvent('pay', 31, 'income', 500), cashEvent('bill', 30, 'expense', 200, 'checking')], spans: [span('2028-02-01', '2028-02-28', 2000), span('2028-02-29', '2028-02-29', 1705)], rows: [[100, 1762.71, 57.71, 5]], noDue: true },
  { id: 'P22', label: 'reversed clamped same-day checking event fails before later income', strategy: 'velocity', start: '2028-02-01', cash: 100, reserve: 100, bal: 2000, apr: .365, fee: 5, annual: '2024-02-29', owed: 50, due: 31, events: [cashEvent('bill', 30, 'expense', 200, 'checking'), cashEvent('pay', 31, 'income', 500)], fail: ['2028-02-29', 'dated-cash-shortfall'], spans: [span('2028-02-01', '2028-02-28', 2000)] },
  { id: 'P23', label: 'year boundary interest capitalization and financed annual fee conserve all wealth', strategy: 'snowball', start: '2027-12-01', cash: 75, reserve: 75, bal: 1000, apr: .073, fee: 10, fixed: 0, events: [], spans: [span('2027-12-01', '2027-12-31', 1000), span('2028-01-01', '2028-01-31', 1016.20)], rows: [[75, 1006.20, 6.20, 0], [75, 1022.50, 6.30, 10]] },
  { id: 'P24', label: 'normal entry funded leap-month maturity uses reserve once and no final-day interest', strategy: 'snowball', start: '2028-02-01', cash: 1119.07, reserve: 100, bal: 1000, apr: .365, fee: 5, annual: '2028-02-01', fixed: 0, short: true, events: [], spans: [span('2028-02-01', '2028-02-14', 1005), span('2028-02-15', '2028-02-29', 0)], rows: [[100, 0, 14.07, 5]], payoff: '2028-02-29' },
];
function checkOracleGuards() {
  const assertion = error => error.code === 'ERR_ASSERTION';
  for (const value of [null, undefined, false, true, '0', '12.34', NaN, Infinity, -Infinity, .001]) assert.throws(() => cents(value), assertion);
  const spans = [span('2026-01-01', '2026-01-03', 100)];
  const daily = dateRange('2026-01-01', '2026-01-03').map(date => ({ date, interestBalance: 100 }));
  assert.equal(checkDaily(daily, spans, .365).length, 1);
  for (const invalid of [[daily[0], daily[0], daily[2]], daily.slice(1), [...daily].reverse()]) {
    assert.throws(() => checkDaily(invalid, spans, .365), assertion);
  }
}
function runDatedConservationReferenceTests() {
  checkOracleGuards();
  const { DatedLOCAccount } = load('dated-loc'), engine = load('portfolio'), codec = load('portfolio-book');
  let count = 0, failed = 0;
  function test(c, fn) { count++; try { fn(); console.log('PASS dated conservation ' + c.id + ' ' + c.label); } catch (error) { failed++; console.error('FAIL dated conservation ' + c.id + ' ' + c.label + ': ' + error.stack); } }
  for (const c of aCases) test(c, () => {
    const plan = makePlan(c), loc = { ...datedBookFixture().loc, limit: 100000, balance: c.bal, apr: c.apr, lenderTerms: terms({ annualFee: c.fee || 0, transactionFeePercent: c.feeRate || 0, minimumPayment: { mode: 'fixed', value: c.fixed ?? 50 }, ...(c.short ? { drawPeriodMonths: 1, repaymentPeriodMonths: 1 } : {}) }) };
    const inputBefore = JSON.stringify([loc, plan]), a = new DatedLOCAccount(loc, plan);
    for (const date of dateRange(plan.startDate, c.end)) { a.startDay(date); c.actions?.[date]?.(a); a.settleDue(); a.finishDay(c.post?.[date] ?? null); assert.ok(a.availableCash >= 0n); }
    assert.equal(JSON.stringify([loc, plan]), inputBefore);
    const p = a.position, expected = c.expected.map(cents);
    assert.deepEqual([p.cashCents, p.locCents, p.totalInterestCents, p.totalFeesCents], expected);
    const ledger = checkEvents(a.events, c.cash, c.bal, c.reserve); assert.equal(ledger.cash, p.cashCents); assert.equal(ledger.loc, p.locCents); assert.equal(ledger.interest, p.totalInterestCents); assert.equal(ledger.fees, p.totalFeesCents);
    const interest = checkDaily(a.daily, c.spans, c.apr); assert.equal(interest.reduce((s, r) => s + r.expectedRoundedCents, 0n), expected[2]);
    if (c.noDue) assert.equal(a.events.filter(e => e.kind === 'loc-minimum' && e.amount > 0).length, 0);
    if (c.ordered) assert.deepEqual(Array.from(a.events.filter(e => e.date === plan.startDate && e.amount > 0), e => e.kind), c.ordered);
  });
  for (const c of pCases) test(c, () => {
    const b = datedBookFixture(); Object.assign(b, { strategy: c.strategy, debts: c.debts || [], chunkAmount: c.chunk || 0, monthlyIncome: c.events.filter(e => e.kind === 'income').reduce((s, e) => s + e.amount, 0), monthlyExpenses: c.events.filter(e => e.kind === 'expense').reduce((s, e) => s + e.amount, 0) });
    b.loc = { ...b.loc, balance: c.bal, limit: 100000, apr: c.apr, lenderTerms: terms({ annualFee: c.fee || 0, transactionFeePercent: c.feeRate || 0, minimumPayment: { mode: 'fixed', value: c.fixed ?? 50 }, ...(c.short ? { drawPeriodMonths: 1, repaymentPeriodMonths: 1 } : {}) }) };
    b.datedPlan = { ...makePlan(c), cashEvents: c.events, debtPaymentDay: c.debtDay || 25 };
    const input = codec.portfolioBookInputs(b), inputBefore = JSON.stringify(input);
    const simulationInput = { ...input, maxMonths: c.rows?.length || 1 }, simulationBefore = JSON.stringify(simulationInput);
    const r = engine.simulatePortfolio(simulationInput);
    assert.equal(JSON.stringify(simulationInput), simulationBefore, 'actual supplied simulation input remains unchanged');
    assert.equal(JSON.stringify(input), inputBefore); assert.equal(r.forecastBasis.kind, 'lender-dated'); assert.equal(r.forecastBasis.canProject, true);
    const trace = checkEvents(r.datedLedger.events, c.cash, c.bal, c.reserve), handInterest = checkDaily(r.datedLedger.daily, c.spans, c.apr);
    if (c.fail) { assert.equal(r.isPayoffPossible, false); assert.equal(r.monthResults.length, 0); assert.equal(r.datedLedger.failure.date, c.fail[0]); assert.equal(r.failureReason, c.fail[1]); assert.equal(trace.cash, cents(c.cash)); assert.equal(r.totalFees, 0); assert.equal(r.totalInterest, 0); return; }
    assert.equal(r.monthResults.length, c.rows.length); assert.equal(r.datedLedger.failure, undefined);
    const startingLiabilities = cents(c.bal) + (c.debts || []).reduce((s, d) => s + cents(d.balance), 0n); let interest = 0n, fees = 0n, locInterest = 0n;
    for (const [index, row] of r.monthResults.entries()) {
      const expected = c.rows[index], actual = [row.cashBalance, row.locBalance, row.locInterest, row.locFees, ...(c.debts?.length ? [row.balances.loan, row.interestCharges.loan] : [])];
      assert.deepEqual(actual.map(cents), expected.map(cents)); assert.equal(cents(row.locInterest), handInterest[index].expectedRoundedCents);
      interest += cents(row.locInterest) + Object.values(row.interestCharges).reduce((s, n) => s + cents(n), 0n); locInterest += cents(row.locInterest); fees += cents(row.locFees);
      const liabilities = cents(row.locBalance) + Object.values(row.balances).reduce((s, n) => s + cents(n), 0n);
      assert.equal(cents(row.cashBalance) - cents(c.cash) + startingLiabilities - liabilities, BigInt(index + 1) * (cents(b.monthlyIncome) - cents(b.monthlyExpenses)) - interest - fees);
      assert.ok(cents(row.cashBalance) >= cents(c.reserve));
    }
    assert.equal(cents(r.totalInterest), interest); assert.equal(cents(r.locInterestPaid), locInterest); assert.equal(cents(r.totalFees), fees);
    const final = r.monthResults.at(-1); assert.equal(trace.cash, cents(final.cashBalance)); assert.equal(trace.loc, cents(final.locBalance));
    if (c.noDue) assert.equal(r.datedLedger.events.filter(e => e.kind === 'loc-minimum' && e.amount > 0).length, 0);
    if (c.chunkCheck) { const chunks = r.datedLedger.events.filter(e => e.kind === 'chunk'); assert.equal(chunks.length, 1); assert.equal(chunks[0].amount, 200); assert.equal(final.locDraw, 200); assert.equal(final.locPayment, 304); assert.equal(final.payments.loan, 296); }
    if (c.payoff) { assert.equal(r.payoffDate, c.payoff); assert.equal(r.cashAtPayoff, c.reserve); }
    if (c.id === 'P18') {
      assert.deepEqual(handInterest.map(row => row.centDays), [2894000n, 2241032n]);
      const opening = r.datedLedger.events.find(e => e.kind === 'loc-payment' && e.amount > 0);
      assert.equal(opening.date, '2026-01-01'); assert.equal(opening.amount, 25); assert.equal(opening.cashBalance, 25);
      for (const date of ['2026-01-31', '2026-02-28']) {
        const events = r.datedLedger.events.filter(e => e.date === date), bill = events.findIndex(e => e.kind === 'loc-statement');
        assert.equal(events[bill].amount, 50); assert.equal(events[bill].cashChange, 0);
        const payment = events.slice(bill + 1).find(e => e.kind === 'loc-payment');
        assert.equal(payment.amount, 50); assert.equal(payment.cashChange, -50); assert.equal(payment.locChange, -50); assert.equal(payment.minimumOutstanding, 0);
      }
    }
  });
  assert.equal(count, 24); assert.equal(failed, 0, failed + '/' + count + ' dated conservation reference cases failed');
  console.log(count + ' dated conservation reference cases passed.');
}
module.exports = { runDatedConservationReferenceTests };
if (require.main === module) runDatedConservationReferenceTests();
