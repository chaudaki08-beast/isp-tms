/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint locally (npm run lint) but don't block production builds on it.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      // Supabase Storage public bucket URLs.
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        // Allow the service worker to control the whole origin.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
