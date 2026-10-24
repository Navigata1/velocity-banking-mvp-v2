import type { PortfolioBook } from './portfolio-book';
import type { CommonMonthRow } from './common-month';
import { addDatedMonths, datedCentsAmount, datedCivilDate, datedMoneyCents, datedMonthDay,
  datedOutputCents, daysInDatedMonth } from './dated-plan';

export function continueDatedCash(book: PortfolioBook, acceptedRows: readonly CommonMonthRow[],
  payoffMonth: number, horizonMonth: number): { rows: CommonMonthRow[]; failureDate?: string } {
  const plan = book.datedPlan!, rows = [...acceptedRows];
  let cash = datedOutputCents(rows[rows.length - 1]?.cashBalance ?? plan.openingCash);
  const reserve = datedMoneyCents(plan.cashReserve), balances = Object.fromEntries(book.debts.map(debt => [debt.id, 0]));
  let date = plan.startDate;
  try {
    for (let month = payoffMonth + 1; month <= horizonMonth; month++) {
      const civil = datedCivilDate(addDatedMonths(plan.startDate, month - 1)), days = daysInDatedMonth(civil.year, civil.month);
      for (let day = 1; day <= days; day++) {
        date = datedMonthDay(civil.year, civil.month, day);
        for (const event of plan.cashEvents) if (datedMonthDay(civil.year, civil.month, event.day) === date) {
          const amount = datedMoneyCents(event.amount);
          if (event.kind === 'income') { cash += amount; datedCentsAmount(cash); }
          else {
            // The declared closed-account policy cannot finance future spending with a new LOC draw.
            if (amount > cash - reserve) return { rows, failureDate: date };
            cash -= amount;
          }
        }
      }
      rows.push({ month, balances: { ...balances }, locBalance: 0, cashBalance: datedCentsAmount(cash), interest: 0, fees: 0 });
    }
  } catch { return { rows, failureDate: date }; }
  return { rows };
}
