import { buildRouteMetadata } from '../site-metadata';

export const metadata = buildRouteMetadata(
  'What-If Simulator',
  'Compare debt payoff strategies with explicit cash-flow, APR, payment, and line-of-credit assumptions.',
  '/simulator',
);

export default function SimulatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
