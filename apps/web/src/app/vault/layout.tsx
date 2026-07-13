import { buildRouteMetadata } from '../site-metadata';

export const metadata = buildRouteMetadata(
  'Wealth Timeline',
  'Explore an educational mortgage and equity timeline with assumptions labeled and unstable projections blocked.',
  '/vault',
);

export default function VaultLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
