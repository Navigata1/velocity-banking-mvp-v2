import type { NextConfig } from "next";
import path from 'node:path';

const workspaceRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: ['@interestshield/financial-engine'],
  allowedDevOrigins: [
    '*.replit.dev',
    '*.replit.app',
    '*.repl.co',
    'localhost:5000',
    '*.janeway.replit.dev',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
