/**
 * SAREC GEO —— 作者署名 / 免责声明常量（GEO · J）。
 * ------------------------------------------------------------------
 * 纯常量 + 纯函数，无副作用。
 * - GEO 文章 YAML 署名为「东哥 · SAREC 中美房地产商会创始人」；全站其他位置署名为「Andy Wang · SAREC 创始人」。
 *   两者是同一人：前台 / JSON-LD 统一把「东哥」关联到 Andy Wang，方便读者与 AI 识别作者。
 * - 旧版手写研究页（无 author 字段）默认署名 FOUNDER_AUTHOR。
 */
import type { Author } from './types';

export const FOUNDER = {
  name: 'Andy Wang',
  zhName: '东哥',
  zhTitle: 'SAREC 中美房地产商会创始人',
  enTitle: 'Founder, SAREC (Sino-American Real Estate Chamber)',
  profilePath: '/zh/about/founder',
} as const;

// 旧版研究页默认署名（与全站「Andy Wang · SAREC 创始人」一致）。
export const FOUNDER_AUTHOR: Author = {
  name: FOUNDER.name,
  title: FOUNDER.zhTitle,
  profileUrl: FOUNDER.profilePath,
};

function isFounder(author: Pick<Author, 'name'>): boolean {
  return author.name === FOUNDER.zhName || author.name === FOUNDER.name;
}

// 前台署名显示名：「东哥」→「东哥（Andy Wang）」；其余原样。
export function displayAuthorName(author: Pick<Author, 'name'>): string {
  return author.name === FOUNDER.zhName ? `${FOUNDER.zhName}（${FOUNDER.name}）` : author.name;
}

// 英文署名行（English summary 区）。
export function englishByline(author: Pick<Author, 'name'>): string {
  return isFounder(author) ? `By ${FOUNDER.name}, ${FOUNDER.enTitle}` : `By ${author.name}`;
}

// JSON-LD Person（schema.org/Person）。siteUrl 由 caller 注入。
export function authorJsonLd(author: Author, siteUrl: string): Record<string, unknown> {
  if (isFounder(author)) {
    return {
      '@type': 'Person',
      name: FOUNDER.name,
      alternateName: FOUNDER.zhName,
      jobTitle: FOUNDER.enTitle,
      url: `${siteUrl}${FOUNDER.profilePath}`,
      worksFor: { '@id': `${siteUrl}/#organization` },
    };
  }
  const profile = author.profileUrl
    ? author.profileUrl.startsWith('http')
      ? author.profileUrl
      : `${siteUrl}${author.profileUrl}`
    : undefined;
  return {
    '@type': 'Person',
    name: author.name,
    ...(author.title ? { jobTitle: author.title } : {}),
    ...(profile ? { url: profile } : {}),
  };
}

// 研究页统一免责声明（含「非投资建议」）。
export const RESEARCH_DISCLAIMER =
  '非投资建议：本文为基于公开信息的研究与风险教育，不构成投资、法律、税务、移民或证券建议，不构成证券发行，也不作任何收益承诺；文中数据以所列公开来源为准，具体事项请咨询持牌专业人士。';

export const RESEARCH_DISCLAIMER_EN =
  'Not investment advice. This article is research and risk education based on public information. It is not investment, legal, tax, immigration or securities advice, is not an offer of securities, and makes no promise of returns.';
