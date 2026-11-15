/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/dashboard', destination: '/' },
      { source: '/overview', destination: '/' },
      { source: '/tickets', destination: '/' },
      { source: '/schedule', destination: '/' },
      { source: '/reports', destination: '/' },
      { source: '/setting', destination: '/' },
      { source: '/settings', destination: '/' },
      { source: '/config', destination: '/' },
      { source: '/users', destination: '/' },
      { source: '/form', destination: '/' },
      { source: '/preview', destination: '/' },
      { source: '/landing', destination: '/' },
    ];
  },
};

module.exports = nextConfig;

