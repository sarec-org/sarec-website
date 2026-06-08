/**
 * SAREC GEO B+ Core —— P1-1 访问层(接缝二:页面走 accessor)。
 * ------------------------------------------------------------------
 * 这是【唯一】允许 import content/geo/* 数据文件的访问层。
 * 页面 / layout / schema / sitemap 未来只能经此处的 accessor 取内容,
 * 绝不直接 import content/geo/articles/* 等内容文件。
 *
 * Core 阶段:accessor 背后读取本地 TS 数据文件。
 * Pro 阶段:换 CMS / 数据库时,只允许换本文件的实现,签名保持不变。
 */
import type { Article, Case, Cluster, ClusterId, Source } from './types';
import { clusters } from '../../content/geo/clusters';
import { sources } from '../../content/geo/sources';
import { stubArticle } from '../../content/geo/articles/_stub';
import { chineseCapitalUsRealEstate10Traps } from '../../content/geo/articles/chinese-capital-us-real-estate-10-traps';
import { stubCase } from '../../content/geo/cases/_stub';
import { oceanwidePlazaCase } from '../../content/geo/cases/oceanwide-plaza';

// ── 本地数据注册表(Core 阶段唯一数据来源)────────────────────────────
const articles: Article[] = [stubArticle, chineseCapitalUsRealEstate10Traps];
const cases: Case[] = [stubCase, oceanwidePlazaCase];

type ContentFilter = {
  cluster?: ClusterId;
  status?: 'draft' | 'published';
};

function matchesFilter(item: { cluster: ClusterId; status: 'draft' | 'published' }, filter?: ContentFilter): boolean {
  if (filter?.cluster && item.cluster !== filter.cluster) return false;
  if (filter?.status && item.status !== filter.status) return false;
  return true;
}

// ── 文章 ──────────────────────────────────────────────────────────
export function getArticle(slug: string): Article | null {
  return articles.find((a) => a.slug === slug) ?? null;
}

export function listArticles(filter?: ContentFilter): Article[] {
  return articles.filter((a) => matchesFilter(a, filter));
}

// ── 案例 ──────────────────────────────────────────────────────────
export function getCase(slug: string): Case | null {
  return cases.find((c) => c.slug === slug) ?? null;
}

export function listCases(filter?: ContentFilter): Case[] {
  return cases.filter((c) => matchesFilter(c, filter));
}

// ── 集群 ──────────────────────────────────────────────────────────
export function getCluster(id: ClusterId): Cluster | null {
  return clusters.find((c) => c.id === id) ?? null;
}

// ── 证据来源 ──────────────────────────────────────────────────────
export function listSources(): Source[] {
  return sources;
}

export function getSource(id: string): Source | null {
  return sources.find((s) => s.id === id) ?? null;
}

// 按 id 列表解析 Source;缺失的 id 静默跳过,不抛错(只返回找到的)。
export function resolveSources(ids: string[]): Source[] {
  return ids
    .map((id) => getSource(id))
    .filter((s): s is Source => s !== null);
}

// ── Sitemap 出口(只暴露 published 内容)────────────────────────────
// URL 形式预留:article → /zh/research/<slug>;case → /zh/research/cases/<slug>。
// P1-1 阶段 stub 均为 draft,因此本函数返回 [] 是正确结果。本任务不建路由、不改 app/sitemap.ts。
export function listAllContentForSitemap(): { url: string; lastmod?: string }[] {
  const entries: { url: string; lastmod?: string }[] = [];

  for (const a of articles) {
    if (a.status !== 'published') continue;
    entries.push({ url: `/zh/research/${a.slug}`, lastmod: a.updatedAt ?? a.publishedAt });
  }

  for (const c of cases) {
    if (c.status !== 'published') continue;
    entries.push({ url: `/zh/research/cases/${c.slug}` });
  }

  return entries;
}
