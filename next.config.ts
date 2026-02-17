import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  transpilePackages: ['@line/liff'],

  // Proxy API calls through Next.js so the browser sees same-origin requests.
  // This avoids cross-origin cookie issues in LINE's in-app browser (WebKit/ITP).
  async rewrites() {
    const backendUrl = process.env.API_BASE_URL;
    console.log('[next.config] API_BASE_URL:', backendUrl ?? '(not set)');
    if (!backendUrl) return [];
    return [
      {
        source: '/backend/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Allow LIFF to be embedded in LINE
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;