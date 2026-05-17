/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/zh/join', destination: '/zh/contact/#membership', permanent: true },
      { source: '/zh/join/', destination: '/zh/contact/#membership', permanent: true },
      { source: '/zh/investigate', destination: '/zh/activity/', permanent: true },
      { source: '/zh/investigate/', destination: '/zh/activity/', permanent: true },
      { source: '/zh/reg', destination: '/zh/contact/#membership', permanent: true },
      { source: '/zh/login', destination: '/zh/contact/', permanent: true },
      // Empty research stub slugs → research index (4c-8 P0-fix T1)
      { source: '/zh/research/eb5', destination: '/zh/research', permanent: true },
      { source: '/zh/research/framework', destination: '/zh/research', permanent: true },
      { source: '/zh/research/investment-pitfalls', destination: '/zh/research', permanent: true },
      // Deck 外目录回收 (T4.1 / T4.2)
      { source: '/zh/activity', destination: '/zh/events', permanent: true },
      { source: '/zh/activity/:path*', destination: '/zh/events', permanent: true },
      { source: '/zh/solutions', destination: '/zh/services', permanent: true },
      { source: '/zh/solutions/:path*', destination: '/zh/services', permanent: true }
    ];
  }
};

module.exports = nextConfig;
