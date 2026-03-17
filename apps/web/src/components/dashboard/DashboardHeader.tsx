'use client';

import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface DashboardHeaderProps {
  subtitle: string;
}

export default function DashboardHeader({ subtitle }: DashboardHeaderProps) {
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Car Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/simulator"><Button variant="secondary">Open Simulator</Button></Link>
          <Link href="/portfolio"><Button>Open Portfolio</Button></Link>
          <Link href="/showroom"><Button variant="ghost">Open Showroom</Button></Link>
        </div>
      </CardBody>
    </Card>
  );
}
