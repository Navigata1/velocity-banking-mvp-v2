'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { legacyScenarioStorage } from '@/stores/legacy-scenario-storage';

export default function LegacyScenarioGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname(), params = useSearchParams();
  const status = useSyncExternalStore(legacyScenarioStorage.subscribe, legacyScenarioStorage.getStatus, legacyScenarioStorage.getServerStatus);
  const canonical = (pathname === '/' || pathname === '/simulator') && params.get('scenario') === 'portfolio';
  const legacy = !canonical && ['/', '/simulator', '/cockpit', '/vault', '/learn'].includes(pathname);
  if (!status.blocked || !legacy) return children;
  return <section data-testid="legacy-scenario-storage-error" className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
    <h1 className="text-xl font-semibold">Single-target storage needs review</h1>
    <p role="alert" className="text-sm leading-6">{status.error}</p>
    <p className="text-sm">Forecasts and automatic writes are paused for this scenario. Your separate Portfolio is unchanged.</p>
    <nav aria-label="Scenario recovery" className="flex flex-wrap items-center gap-4 text-sm">
      <Link href="/portfolio" className="inline-flex min-h-11 items-center underline">Open separate Portfolio</Link>
      <Link href="/settings" className="inline-flex min-h-11 items-center underline">Open data settings</Link>
      <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3">
        <RefreshCw aria-hidden="true" size={16} />Reload saved scenario
      </button>
    </nav>
    <p className="text-xs">Educational tool. Not financial advice.</p>
  </section>;
}
