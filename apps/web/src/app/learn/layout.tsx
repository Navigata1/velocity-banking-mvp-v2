import { buildRouteMetadata } from '../site-metadata';

export const metadata = buildRouteMetadata(
  'Learn Velocity Banking',
  'Learn the Money Loop, average daily balance, chunk recovery, and the conditions that can make a plan unsafe.',
  '/learn',
);

export default function LearnLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
