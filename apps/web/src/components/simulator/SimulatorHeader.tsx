'use client';

import { Card, CardBody } from '@/components/ui/Card';

interface SimulatorHeaderProps {
  subtitle: string;
}

export default function SimulatorHeader({ subtitle }: SimulatorHeaderProps) {
  return (
    <Card>
      <CardBody>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">What-If Simulator</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
      </CardBody>
    </Card>
  );
}

