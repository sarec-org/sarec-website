import type { Metadata } from 'next';

export const SITE_URL = 'https://sinoamericanrec.org';
export const SITE_NAME = 'SAREC 中美房地产商会';

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
      url
    }
  };
}
