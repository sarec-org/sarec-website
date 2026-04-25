/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/zh/join', destination: '/zh/contact/#membership', permanent: true },
      { source: '/zh/join/', destination: '/zh/contact/#membership', permanent: true },
      { source: '/zh/investigate', destination: '/zh/activity/', permanent: true },
      { source: '/zh/investigate/', destination: '/zh/activity/', permanent: true },
      { source: '/zh/reg', destination: '/zh/contact/#membership', permanent: true },
      { source: '/zh/login', destination: '/zh/contact/', permanent: true }
    ];
  }
};

module.exports = nextConfig;
