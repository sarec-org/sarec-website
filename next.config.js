/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /zh/join 现为在线入会真实页面（Gate 2 M2），旧的 join→contact 重定向已移除。
      // 隐私政策统一到站点级 /legal/privacy，旧 /zh/legal/privacy 301 归并（不维护两份）。
      { source: '/zh/legal/privacy', destination: '/legal/privacy', permanent: true },
      { source: '/zh/legal/privacy/', destination: '/legal/privacy', permanent: true },
      { source: '/zh/investigate', destination: '/zh/research', permanent: true },
      { source: '/zh/investigate/', destination: '/zh/research', permanent: true },
      { source: '/zh/reg', destination: '/zh/contact/#membership', permanent: true },
      { source: '/zh/login', destination: '/zh/contact/', permanent: true },
      // Deck 外目录回收 (T4.1 / T4.2)
      { source: '/zh/activity', destination: '/zh/events', permanent: true },
      { source: '/zh/activity/:path*', destination: '/zh/events', permanent: true },
      { source: '/zh/solutions', destination: '/zh/services', permanent: true },
      { source: '/zh/solutions/:path*', destination: '/zh/services', permanent: true },
      // GSC 旧栏目 URL 回收 —— 裸(无 /zh 前缀)历史路径,Search Console 报 404 (GSC-Index-Redirect-1)
      { source: '/activity', destination: '/zh/events', permanent: true },
      { source: '/investigate', destination: '/zh/research', permanent: true }
    ];
  }
};

module.exports = nextConfig;
