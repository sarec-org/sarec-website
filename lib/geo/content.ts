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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Article, Case, Cluster, ClusterId, Source } from './types';
import { fromKeystaticArticle } from './keystatic-adapter';
import { clusters } from '../../content/geo/clusters';
import { sources } from '../../content/geo/sources';
import { stubArticle } from '../../content/geo/articles/_stub';
import { chineseCapitalUsRealEstate10Traps } from '../../content/geo/articles/chinese-capital-us-real-estate-10-traps';
import { stubCase } from '../../content/geo/cases/_stub';
import { oceanwidePlazaCase } from '../../content/geo/cases/oceanwide-plaza';

// ── 旧 TS 文章(Core 阶段手写注册表)──────────────────────────────────
const tsArticles: Article[] = [stubArticle, chineseCapitalUsRealEstate10Traps];

// ── 新 YAML 文章(Keystatic local 模式产物;同步读取,accessor 保持同步)──
const ARTICLES_DIR = join(process.cwd(), 'content', 'geo', 'articles');

// 同步扫描 content/geo/articles/*.yaml,经 adapter 转 Article;
// YAML 损坏 / 转换失败必须显式抛错,不静默吞掉(无文件则返回 [],旧 TS 仍正常)。
function loadYamlArticles(): Article[] {
  let files: string[];
  try {
    files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    return []; // 目录不存在等:视作无 YAML,退回旧 TS。
  }
  return files.map((file) => {
    const fullPath = join(ARTICLES_DIR, file);
    let raw: unknown;
    try {
      raw = parseYaml(readFileSync(fullPath, 'utf8'));
    } catch (err) {
      throw new Error(`[geo] YAML 解析失败: ${file} —— ${(err as Error).message}`);
    }
    try {
      return fromKeystaticArticle(raw);
    } catch (err) {
      throw new Error(`[geo] YAML 转 Article 失败: ${file} —— ${(err as Error).message}`);
    }
  });
}

// 按 slug 合并:同 slug 时 YAML(override)覆盖 TS(base),且每个 slug 只保留一份,顺序保持稳定。
function mergeArticlesBySlug(base: Article[], override: Article[]): Article[] {
  const overrideBySlug = new Map(override.map((a) => [a.slug, a]));
  const usedFromOverride = new Set<string>();
  const merged: Article[] = [];
  for (const a of base) {
    const fromYaml = overrideBySlug.get(a.slug);
    if (fromYaml) {
      merged.push(fromYaml);
      usedFromOverride.add(a.slug);
    } else {
      merged.push(a);
    }
  }
  for (const a of override) {
    if (!usedFromOverride.has(a.slug)) merged.push(a);
  }
  return merged;
}

// ── 本地数据注册表(双轨:旧 TS + YAML;同 slug YAML 覆盖)──────────────
const articles: Article[] = mergeArticlesBySlug(tsArticles, loadYamlArticles());
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
