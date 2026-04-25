import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: '%s'
  },
  description:
    'SAREC 中美房地产商会面向跨境投资人、项目方、房地产从业者和高净值家庭，提供美国房地产项目判断、风险控制、结构设计、资源协同与合作推进服务。',
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
