'use client';

import { Card, CardBody } from '@/components/ui/Card';

interface CockpitHeaderProps {
  subtitle: string;
}

export default function CockpitHeader({ subtitle }: CockpitHeaderProps) {
  return (
    <Card>
      <CardBody>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Cockpit</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
      </CardBody>
    </Card>
  );
}

