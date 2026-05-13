import type { Metadata } from 'next';
import {
  Cormorant_Garamond,
  Noto_Serif_SC,
  Inter_Tight,
  JetBrains_Mono
} from 'next/font/google';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap'
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '900'],
  variable: '--font-noto-serif-sc',
  display: 'swap'
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600'],
  variable: '--font-inter-tight',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap'
});

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
    <html
      lang="zh-CN"
      className={`${cormorant.variable} ${notoSerifSC.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
