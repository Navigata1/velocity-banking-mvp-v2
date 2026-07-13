import { buildRouteMetadata } from '../site-metadata';

export const metadata = buildRouteMetadata(
  'Debt Portfolio',
  'Model a complete debt portfolio, compare payoff order, and see which assumptions change the projected path.',
  '/portfolio',
);

export default function PortfolioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
