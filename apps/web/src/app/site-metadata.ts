import type { Metadata } from 'next';

export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://web-islanddevcrew.vercel.app',
);

export const SITE_NAME = 'InterestShield';

export const SITE_DESCRIPTION =
  'A truth-first educational tool for modeling cash flow, debt payoff, and Velocity Banking assumptions without promised outcomes.';

export const PUBLIC_ROUTES = [
  '/',
  '/simulator',
  '/cockpit',
  '/portfolio',
  '/learn',
  '/vault',
] as const;

export function buildRouteMetadata(
  title: string,
  description: string,
  path: string,
  index = true,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} Money Loop dashboard`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: ['/opengraph-image'],
    },
    robots: { index, follow: index },
  };
}
