/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(appRoot, relativePath), 'utf8');

const layout = read('src/app/layout.tsx');
const siteMetadata = read('src/app/site-metadata.ts');
const manifest = read('src/app/manifest.ts');
const robots = read('src/app/robots.ts');
const sitemap = read('src/app/sitemap.ts');
const openGraphImage = read('src/app/opengraph-image.tsx');
const routeMetadata = new Map(
  ['simulator', 'cockpit', 'portfolio', 'learn', 'vault', 'settings'].map((route) => [
    route,
    read(`src/app/${route}/layout.tsx`),
  ]),
);

assert.match(siteMetadata, /NEXT_PUBLIC_SITE_URL/);
assert.match(siteMetadata, /https:\/\/web-islanddevcrew\.vercel\.app/);
assert.match(layout, /metadataBase: SITE_URL/);
assert.match(layout, /alternates: \{ canonical: "\/" \}/);
assert.match(layout, /openGraph:/);
assert.match(layout, /twitter:/);
assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
assert.match(layout, /robots: \{ index: true, follow: true \}/);

assert.match(manifest, /display: 'standalone'/);
assert.match(manifest, /purpose: 'maskable'/);
assert.match(manifest, /'\/icon-192\.png'/);
assert.match(manifest, /'\/icon-512\.png'/);
assert.doesNotMatch(manifest, /orientation:/);

assert.match(robots, /allow: '\/'/);
assert.match(robots, /'\/sitemap\.xml'/);
assert.match(robots, /host: SITE_URL\.origin/);

for (const route of ['/', '/simulator', '/cockpit', '/portfolio', '/learn', '/vault']) {
  assert.ok(siteMetadata.includes(`'${route}'`), `expected public metadata route ${route}`);
}
assert.ok(!siteMetadata.includes("  '/settings',"), 'expected Settings to stay out of the public sitemap');
assert.match(sitemap, /PUBLIC_ROUTES\.map/);
assert.match(siteMetadata, /type: 'website'/);
assert.match(siteMetadata, /siteName: SITE_NAME/);
assert.match(siteMetadata, /card: 'summary_large_image'/);
assert.match(siteMetadata, /images: \['\/opengraph-image'\]/);
assert.match(siteMetadata, /width: 1200/);
assert.match(siteMetadata, /height: 630/);

for (const [route, source] of routeMetadata) {
  assert.match(source, /buildRouteMetadata/);
  assert.ok(source.includes(`'/${route}'`), `expected /${route} to own its canonical route`);
}
assert.match(routeMetadata.get('settings'), /false/);

assert.match(openGraphImage, /width: 1200/);
assert.match(openGraphImage, /height: 630/);
assert.match(openGraphImage, /Income.*LOC.*Expenses.*Cash Flow.*Principal/s);
assert.match(openGraphImage, /Truth first\. Hope forward\./);

for (const icon of ['public/icon-192.png', 'public/icon-512.png']) {
  const stat = fs.statSync(path.join(appRoot, icon));
  assert.ok(stat.size > 1000, `expected non-empty metadata icon ${icon}`);
}

console.log('Metadata contract passed canonical, install, crawl, sitemap, and social surfaces.');
