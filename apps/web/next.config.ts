import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server with only its traced deps — no full node_modules and no
  // pnpm at runtime. Keeps the image small on a shared, memory-tight box.
  output: 'standalone',
  // The workspace root, so tracing follows the symlinked @mm/* packages instead of
  // guessing and dropping them from the standalone bundle.
  outputFileTracingRoot: process.cwd().replace(/[\\/]apps[\\/]web$/, ''),
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  eslint: {
    // Lint is a separate CI gate; running it inside `next build` doubles build
    // time and turns a style nit into a failed deploy.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // A stale service worker pins a user to an old build permanently and no
        // redeploy can reach them. Caddy sets this too — belt and braces, because
        // the failure is unrecoverable for the affected user.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
