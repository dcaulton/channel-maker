/** @type {import('next').NextConfig} */
const apiBase = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

const nextConfig = {
  transpilePackages: ['@channel-maker/contracts'],
  async rewrites() {
    // Browser calls Next. Next forwards to Nest. No CORS.
    return [{ source: '/nest/:path*', destination: `${apiBase}/:path*` }];
  },
};

export default nextConfig;
