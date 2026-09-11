/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Was `ignoreBuildErrors: true` - that let broken code ship to
    // production silently. `npx tsc --noEmit` passes clean, so this is
    // safe to enforce now.
    ignoreBuildErrors: false,
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';

    const csp = [
      "default-src 'self'",
      // 'unsafe-eval' is required in dev only - Next's React Refresh/HMR
      // runtime uses eval() to apply hot updates. Production's build
      // doesn't need it, so it's left out there.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
