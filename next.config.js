// 商会资料 PDF 原件：小程序下载只能走本站域名 → /files/* 直接转到图片存储（不经函数，不受 4.5MB 限制）
const BLOB_HOST = (() => {
  const m = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `${m[1].toLowerCase()}.public.blob.vercel-storage.com` : null;
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 名片模板库：服务器上用无头 Chrome 出图（不打包，原样随函数部署，含 chromium 压缩包）
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'mupdf'],
    // AI 助手知识库在接口里同步读取 content/（文章、活动、新闻 YAML）；确保这些文件随函数一起部署
    outputFileTracingIncludes: {
      '/api/v1/agent/**': ['./content/**/*', './app/zh/(internal)/research/*/page.tsx'],
      // 1.4 会员下载模板（不放 public/，只经接口给会员）
      '/api/v1/tools/download/**': ['./private/tools/*'],
      '/api/v1/cards/**': ['./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**'],
      // 商会资料：PDF 逐页转图用 MuPDF（WebAssembly）
      '/api/v1/staff/docs/**': ['./node_modules/.pnpm/mupdf@*/node_modules/mupdf/dist/**']
    }
  },
  images: {
    // 小程序内容图片统一走本站 /_next/image 压缩；视频封面放在 R2 媒体桶
    remotePatterns: [
      { protocol: 'https', hostname: 'pub-750866849946432cb842827f7414652c.r2.dev', pathname: '/**' },
      // 1.2：活动相册、封面、头像、商会微信二维码（Vercel Blob）
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/**' }
    ]
  },
  async rewrites() {
    return BLOB_HOST ? [{ source: '/files/:path*', destination: `https://${BLOB_HOST}/:path*` }] : [];
  },
  async redirects() {
    return [
      // 首页语言跳转:裸首页 / → /zh 用永久 308(带 Location),取代 app/page.tsx 的 RSC redirect()
      // ——后者被 Vercel 缓存成无 Location 的 307,Googlebot 跟不过去,致首页/权重无法传给 /zh。
      { source: '/', destination: '/zh', permanent: true },
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
