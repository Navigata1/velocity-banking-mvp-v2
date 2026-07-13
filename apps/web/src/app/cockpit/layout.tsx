import { buildRouteMetadata } from '../site-metadata';

export const metadata = buildRouteMetadata(
  'Cockpit',
  'Review cash flow, line-of-credit room, and recovery guardrails before relying on a Velocity Banking projection.',
  '/cockpit',
);

export default function CockpitLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
