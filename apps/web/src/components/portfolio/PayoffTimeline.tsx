'use client';

import { motion } from 'framer-motion';
import { DebtPayoffEvent } from '@/engine/portfolio';
import { formatDate } from '@/engine/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { MICRO_DURATION, useMotionDuration } from '@/components/ui/motion';

interface PayoffTimelineProps {
  payoffOrder: DebtPayoffEvent[];
}

export default function PayoffTimeline({ payoffOrder }: PayoffTimelineProps) {
  const duration = useMotionDuration(MICRO_DURATION);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Payoff Timeline</h2>
        <Badge>{payoffOrder.length} milestones</Badge>
      </CardHeader>
      <CardBody className="space-y-2">
        {payoffOrder.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Run your plan to generate projected payoff milestones.</p>
        ) : (
          payoffOrder.map((event, index) => (
            <motion.div
              key={event.id}
              className="flex items-center justify-between rounded-xl border border-[color:var(--color-border-soft)] bg-[var(--surface-glass)] px-3 py-2"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration, delay: index * 0.04 }}
            >
              <div>
                <p className="font-medium text-[var(--color-text)]">{event.name}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Month {event.monthPaidOff}</p>
              </div>
              <Badge tone="success">{formatDate(event.monthPaidOff)}</Badge>
            </motion.div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

