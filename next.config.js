/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // pdfmake/pdfkit must run as plain Node modules (server-side BA PDF)
    serverComponentsExternalPackages: ['pdfmake', 'pdfkit'],
  },
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
      { source: '/audit', destination: '/' },
      { source: '/laporan', destination: '/' },
      { source: '/form', destination: '/' },
      { source: '/preview', destination: '/' },
      { source: '/landing', destination: '/' },
    ];
  },
};

module.exports = nextConfig;

