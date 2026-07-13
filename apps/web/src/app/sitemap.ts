import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES, SITE_URL } from './site-metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: new URL(route, SITE_URL).toString(),
    lastModified: new Date('2026-07-12T00:00:00.000Z'),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/learn' || route === '/simulator' ? 0.8 : 0.7,
  }));
}
