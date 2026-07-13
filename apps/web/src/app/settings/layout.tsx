import { buildRouteMetadata } from '../site-metadata';

export const metadata = buildRouteMetadata(
  'Settings',
  'Manage local InterestShield preferences, backups, and private snapshot synchronization.',
  '/settings',
  false,
);

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
