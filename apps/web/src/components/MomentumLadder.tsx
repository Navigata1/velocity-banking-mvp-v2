'use client';

import { motion } from 'framer-motion';
import { DebtItem, DebtPayoffEvent } from '@/engine/portfolio';
import { calculateMinimumPayment, formatCurrency, formatDate } from '@/engine/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { CARD_DURATION, useMotionDuration } from '@/components/ui/motion';

interface MomentumLadderProps {
  payoffOrder: DebtPayoffEvent[];
  debts: DebtItem[];
  payoffMonths: number;
  title?: string;
}

export default function MomentumLadder({
  payoffOrder,
  debts,
  payoffMonths,
  title = 'Momentum Ladder',
}: MomentumLadderProps) {
  const duration = useMotionDuration(CARD_DURATION);

  let chunkCapacity = 0;
  const rows = payoffOrder.map((event, index) => {
    const debt = debts.find((item) => item.id === event.id);
    const freedPayment = debt ? calculateMinimumPayment(debt.minPaymentRule, debt.balance) : 0;
    const previousChunk = chunkCapacity;
    chunkCapacity += freedPayment;
    const nextTarget = payoffOrder[index + 1]?.name ?? 'Debt-free runway';
    const etaShift = Math.max(0, payoffMonths - event.monthPaidOff);

    return {
      ...event,
      freedPayment,
      previousChunk,
      chunkCapacity,
      etaShift,
      nextTarget,
    };
  });

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
      </CardHeader>
      <CardBody className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Payoff milestones will appear here after a simulation run.</p>
        ) : (
          rows.map((row, index) => (
            <motion.div
              key={`${row.id}-${row.monthPaidOff}`}
              className="rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] p-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: index * 0.06 }}
            >
              <p className="text-sm font-semibold text-[var(--color-text)]">✅ {row.name} paid off in month {row.monthPaidOff}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">🔓 Monthly payment freed: {formatCurrency(row.freedPayment)}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                ⚡ Chunk capacity: {formatCurrency(row.previousChunk)} → {formatCurrency(row.chunkCapacity)}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">📉 Debt-free impact: about {row.etaShift} months remaining from this point</p>
              <p className="text-xs font-medium text-[var(--color-accent)]">🎯 Next target: {row.nextTarget}</p>
            </motion.div>
          ))
        )}
        {payoffMonths > 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">Projected debt-free date: {formatDate(payoffMonths)}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}

