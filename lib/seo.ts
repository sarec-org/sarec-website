import type { Metadata } from 'next';

export const SITE_URL = 'https://sinoamericanrec.org';
export const SITE_NAME = 'SAREC 中美房地产商会';
// 默认社交分享卡图(微信/OG)。JPG(非 webp,微信兼容)、1200x630、绝对 https URL。
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og/sarec-og-default.jpg`;

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
};

function normalizePath(path: string) {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }

  return path;
}

export function createPageMetadata({ title, description, path, type = 'website' }: PageMetadataInput): Metadata {
  const normalizedPath = normalizePath(path);
  const url = `${SITE_URL}${normalizedPath}`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true
    },
    alternates: {
      canonical: url
    },
    openGraph: {
      type,
      locale: 'zh_CN',
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: SITE_NAME
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE]
    }
  };
}
