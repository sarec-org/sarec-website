/**
 * SAREC GEO —— 前台可见中文标签（M3.1 栏目中文名 / cluster 中文名）。
 * ------------------------------------------------------------------
 * 纯映射，无副作用。前台一律经此取中文名，绝不再直接显示机器串（cluster / template value）。
 * 老文章一次性映射：无 template 字段 → 按 'deep'（SAREC 深度）兜底。
 */
import type { Article, ArticleTemplate, ClusterId } from './types';

// 栏目（模板）中文名 —— 前台文章头部 eyebrow 显示这一层。
export const COLUMN_LABELS: Record<ArticleTemplate, string> = {
  deep: 'SAREC 深度',
  brief: 'SAREC 快评',
  data: 'SAREC 数据追踪',
};

// cluster（主题集群）中文名 —— 替换旧机器串；用于需要显示主题标签处。
export const CLUSTER_LABELS: Record<ClusterId, string> = {
  'chinese-capital-us-re-risk': '中国资本赴美房地产风险',
  'eb5-real-estate': 'EB-5 与房地产',
  'la-development-ed1': '洛杉矶开发与 ED1',
  'sec-finder-compliance': 'SEC Finder 合规',
};

// 文章栏目（含老文章兜底）。
export function articleTemplate(article: Pick<Article, 'template'>): ArticleTemplate {
  return article.template ?? 'deep';
}

// 文章栏目中文名（前台 eyebrow 用）。
export function columnLabel(article: Pick<Article, 'template'>): string {
  return COLUMN_LABELS[articleTemplate(article)];
}

// cluster 中文名；未知值原样返回（不抛错，前台不崩）。
export function clusterLabel(cluster: ClusterId): string {
  return CLUSTER_LABELS[cluster] ?? cluster;
}
