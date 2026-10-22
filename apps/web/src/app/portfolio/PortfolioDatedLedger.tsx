'use client';

import { useState } from 'react';
import type { PortfolioSimulationResult } from '@interestshield/financial-engine/portfolio';
import { formatCommonMonthAmount as money } from '@interestshield/financial-engine/portfolio-common-month';
import type { PortfolioThemeClasses } from './portfolio-types';

const names = { income: 'Income', expense: 'Living expense', 'debt-payment': 'Debt payment', chunk: 'LOC chunk',
  'annual-fee': 'Annual fee', 'draw-fee': 'Draw fee', 'loc-payment': 'LOC repayment', 'loc-minimum': 'LOC minimum',
  'loc-interest': 'Posted LOC interest', 'loc-maturity': 'Maturity principal', 'loc-statement': 'New statement minimum' };
export default function PortfolioDatedLedger({ result, classes }: { result?: PortfolioSimulationResult; classes: PortfolioThemeClasses }) {
  const [selection, setSelection] = useState('');
  const ledger = result?.datedLedger;
  if (!ledger) return null;
  const months = [...new Set([...ledger.daily.map(row => row.date.slice(0, 7)), ...ledger.events.map(row => row.date.slice(0, 7))])];
  const month = months.includes(selection) ? selection : months[0] ?? '';
  const events = ledger.events.filter(row => row.date.startsWith(month)), days = ledger.daily.filter(row => row.date.startsWith(month));
  const accepted = result.monthResults.at(-1)?.date ?? 'None';
  return <section data-testid="dated-ledger" aria-label="Dated transaction ledger" className={`min-w-0 space-y-4 border-t py-5 ${classes.border} ${classes.text}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-base font-semibold">Dated transaction ledger</h2>
      <p className={`mt-1 text-xs leading-5 ${classes.textSecondary}`}>Accepted through {accepted}. Protected reserve: {money(ledger.cashReserve)}. Fees: {money(result.totalFees ?? 0)} through accepted months.</p></div>
      {months.length ? <label className="text-xs">Ledger month<select aria-label="Ledger month" value={month} onChange={e => setSelection(e.target.value)} className={`mt-1 block min-h-11 rounded-md border px-3 text-sm ${classes.bgSecondary} ${classes.border}`}>{months.map(value => <option key={value}>{value}</option>)}</select></label> : null}
    </div>
    {ledger.failure ? <p role="alert" className="text-sm leading-6 [overflow-wrap:anywhere]">Stopped {ledger.failure.date}: {ledger.failure.message} Transactions in that incomplete month are diagnostic, not an accepted payoff forecast.</p> : null}
    {ledger.notices.filter(row => row.date.startsWith(month)).map((notice, index) => <p key={index} className={`text-xs leading-5 ${classes.textSecondary}`}>{notice.date}: {notice.message}</p>)}
    {events.length ? <div role="region" aria-label="Dated postings" tabIndex={0} className={`max-w-full overflow-x-auto rounded border ${classes.border}`}>
      <table className="w-full text-left text-xs tabular-nums"><caption className={`p-3 text-left leading-5 ${classes.textSecondary}`}>Cash and LOC changes are separate. A new minimum is a bill, not an additional fee.</caption>
        <thead><tr>{['Date', 'Posting', 'Amount', 'Cash change', 'LOC change', 'Checking', 'LOC', 'Minimum due'].map(label => <th key={label} scope="col" className="whitespace-nowrap p-3 font-medium">{label}</th>)}</tr></thead>
        <tbody>{events.map((event, index) => <tr key={index} className={`border-t ${classes.border}`}><td className="whitespace-nowrap p-3">{event.date}</td><td className="p-3">{names[event.kind]}</td>
          {[event.amount, event.cashChange, event.locChange, event.cashBalance, event.locBalance].map((amount, i) => <td key={i} className="whitespace-nowrap p-3">{money(amount)}</td>)}
          <td className="whitespace-nowrap p-3">{money(event.minimumOutstanding)} / {event.minimumDueOn}</td></tr>)}</tbody>
      </table>
    </div> : <p className={`text-sm ${classes.textSecondary}`}>No dated postings.</p>}
    {days.length ? <details><summary className="min-h-11 cursor-pointer text-sm">Daily interest balances</summary>
      <div role="region" aria-label="Daily accrual balances" tabIndex={0} className="max-w-full overflow-x-auto"><table className="w-full text-left text-xs tabular-nums"><thead><tr>{['Date', 'Interest balance', 'Closing LOC', 'Unposted interest', 'Checking', 'Other debt'].map(label => <th scope="col" key={label} className="whitespace-nowrap p-3 font-medium">{label}</th>)}</tr></thead>
        <tbody>{days.map(day => <tr key={day.date} className={`border-t ${classes.border}`}><td className="whitespace-nowrap p-3">{day.date}</td>{[day.interestBalance, day.locBalance, day.unpostedInterest, day.cashBalance, day.debtBalance].map((amount, i) => <td key={i} className="whitespace-nowrap p-3">{money(amount)}</td>)}</tr>)}</tbody>
      </table></div><p className={`text-xs leading-5 ${classes.textSecondary}`}>Daily unposted interest is displayed rounded, not posted daily. The interest balance precedes statement interest and any after-statement repayment.</p>
    </details> : null}
  </section>;
}
