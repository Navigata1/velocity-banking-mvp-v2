import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION, SITE_NAME } from './site-metadata';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - Velocity Banking Education`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#080d0c',
    theme_color: '#059669',
    categories: ['finance', 'education', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
