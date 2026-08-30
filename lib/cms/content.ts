/**
 * SAREC CMS V2 —— 内容访问层(news / events / projects)。
 * ------------------------------------------------------------------
 * 这是【唯一】允许读 content/news、content/events、content/projects 的模块。
 * 页面 / sitemap / schema 只能经此处的 accessor 取内容。
 *
 * 模式照搬 lib/geo/content.ts 的既有约定:
 *  - 同步 readdirSync 扫 *.yaml,accessor 保持同步(SSG 友好)。
 *  - 目录不存在 → 返回 [](空集合不是错误:PR-1 上线时 news/events 本就为空)。
 *  - YAML 解析失败 / 结构非法 → 显式抛错,绝不静默吞掉。
 *
 * ⚠️ 本模块与 lib/geo/* 完全独立,互不 import;research collection 不受影响。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  EventItem,
  EventSpeaker,
  EventStatus,
  GalleryImage,
  LinkedMember,
  MemberRole,
  NewsCategory,
  NewsItem,
  ProjectItem,
  ProjectRegion,
  ProjectStage,
  ProjectTag,
  ProjectType,
  RegistrationStatus,
} from './types';

const CONTENT_ROOT = join(process.cwd(), 'content');

// ── 通用取值助手(容忍缺字段;类型不对就当空,必填项由 caller 显式校验)────
function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function strOrNull(v: unknown): string | null {
  const s = str(v).trim();
  return s.length > 0 ? s : null;
}

/** fields.date / fields.datetime 的值;若 YAML 解析成 Date 对象则转回 ISO 文本。 */
function dateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return str(v).trim();
}

function dateTimeStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 16);
  return str(v).trim();
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(str).filter((s) => s.length > 0);
}

function gallery(v: unknown, file: string): GalleryImage[] {
  if (!Array.isArray(v)) return [];
  return v.map((raw, i) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const image = str(row.image).trim();
    const alt = str(row.alt).trim();
    if (!image) throw new Error(`[cms] ${file} 图集第 ${i + 1} 项缺少图片。`);
    if (!alt) throw new Error(`[cms] ${file} 图集第 ${i + 1} 项缺少 alt(无障碍与 SEO 必填)。`);
    return { image, alt };
  });
}

/** 目录扫描 + YAML 解析的公共外壳;失败显式抛错。 */
function loadDir<T>(dir: string, map: (raw: Record<string, unknown>, slug: string, file: string) => T): T[] {
  const full = join(CONTENT_ROOT, dir);
  let files: string[];
  try {
    files = readdirSync(full).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    return []; // 目录不存在 = 该集合暂无内容,不是错误。
  }
  return files.map((file) => {
    const path = join(full, file);
    let raw: unknown;
    try {
      raw = parseYaml(readFileSync(path, 'utf8'));
    } catch (err) {
      throw new Error(`[cms] YAML 解析失败: ${dir}/${file} —— ${(err as Error).message}`);
    }
    if (!raw || typeof raw !== 'object') {
      throw new Error(`[cms] YAML 内容为空或不是对象: ${dir}/${file}`);
    }
    const slug = basename(file).replace(/\.ya?ml$/, '');
    return map(raw as Record<string, unknown>, slug, `${dir}/${file}`);
  });
}

// ── 新闻 ────────────────────────────────────────────────────────────
const NEWS_CATEGORIES: NewsCategory[] = ['chamber-news', 'member-update', 'partnership-progress'];

function toNews(raw: Record<string, unknown>, slug: string, file: string): NewsItem {
  const category = str(raw.category) as NewsCategory;
  if (!NEWS_CATEGORIES.includes(category)) {
    throw new Error(`[cms] ${file} 的分类「${str(raw.category)}」不在允许范围内。`);
  }
  const publishedAt = dateStr(raw.publishedAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    throw new Error(`[cms] ${file} 的发布日期必须是 YYYY-MM-DD,当前为「${publishedAt}」。`);
  }
  return {
    slug,
    title: str(raw.title).trim(),
    category,
    publishedAt,
    summary: str(raw.summary).trim(),
    coverImage: strOrNull(raw.coverImage),
    gallery: gallery(raw.gallery, file),
    body: str(raw.body),
  };
}

const allNews = (): NewsItem[] => loadDir('news', toNews);

/** 新闻:按发布日期倒序。 */
export function listNews(options: { category?: NewsCategory } = {}): NewsItem[] {
  return allNews()
    .filter((n) => (options.category ? n.category === options.category : true))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getNewsBySlug(slug: string): NewsItem | null {
  return allNews().find((n) => n.slug === slug) ?? null;
}

// ── 活动 ────────────────────────────────────────────────────────────
const EVENT_STATUSES: EventStatus[] = ['scheduled', 'completed', 'postponed', 'cancelled'];
const REGISTRATION_STATUSES: RegistrationStatus[] = ['notOpen', 'open', 'closed', 'full'];

function speakers(v: unknown): EventSpeaker[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((raw) => {
      const row = (raw ?? {}) as Record<string, unknown>;
      return { name: str(row.name).trim(), title: strOrNull(row.title) };
    })
    .filter((s) => s.name.length > 0);
}

function toEvent(raw: Record<string, unknown>, slug: string, file: string): EventItem {
  const eventStatus = str(raw.eventStatus) as EventStatus;
  if (!EVENT_STATUSES.includes(eventStatus)) {
    throw new Error(`[cms] ${file} 的活动状态「${str(raw.eventStatus)}」不在允许范围内。`);
  }
  const registrationStatus = str(raw.registrationStatus) as RegistrationStatus;
  if (!REGISTRATION_STATUSES.includes(registrationStatus)) {
    throw new Error(`[cms] ${file} 的报名状态「${str(raw.registrationStatus)}」不在允许范围内。`);
  }
  const startAt = dateTimeStr(raw.startAt);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(startAt)) {
    throw new Error(`[cms] ${file} 的开始时间必须是日期时间,当前为「${startAt}」。`);
  }
  const timezone = str(raw.timezone).trim();
  if (!timezone) {
    throw new Error(`[cms] ${file} 缺少时区 —— 开始/结束时间不带时区,必须单独指明。`);
  }
  return {
    slug,
    title: str(raw.title).trim(),
    summary: str(raw.summary).trim(),
    startAt,
    endAt: strOrNull(dateTimeStr(raw.endAt)),
    timezone,
    locationName: strOrNull(raw.locationName),
    address: strOrNull(raw.address),
    organizer: strOrNull(raw.organizer),
    registrationUrl: strOrNull(raw.registrationUrl),
    eventStatus,
    registrationStatus,
    coverImage: strOrNull(raw.coverImage),
    body: str(raw.body),
    recapBody: str(raw.recapBody),
    speakers: speakers(raw.speakers),
    gallery: gallery(raw.gallery, file),
  };
}

const allEvents = (): EventItem[] => loadDir('events', toEvent);

/**
 * 活动列表。
 * - scheduled / postponed:按开始时间正序(最近的排前面,读者关心"接下来")。
 * - 其余(含 completed):按开始时间倒序(最近办过的排前面)。
 */
export function listEvents(options: { status?: EventStatus | EventStatus[] } = {}): EventItem[] {
  const wanted = options.status
    ? Array.isArray(options.status)
      ? options.status
      : [options.status]
    : null;
  const rows = allEvents().filter((e) => (wanted ? wanted.includes(e.eventStatus) : true));
  const ascending = wanted !== null && wanted.every((s) => s === 'scheduled' || s === 'postponed');
  return rows.sort((a, b) =>
    ascending ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt)
  );
}

export function getEventBySlug(slug: string): EventItem | null {
  return allEvents().find((e) => e.slug === slug) ?? null;
}

/** 已结束且写了回顾的活动 —— 聚合页新闻流里的「活动回顾卡片」取数口径。 */
export function listEventRecaps(): EventItem[] {
  return listEvents({ status: 'completed' }).filter((e) => e.recapBody.trim().length > 0);
}

// ── 会员项目 ────────────────────────────────────────────────────────
const PROJECT_TYPES: ProjectType[] = [
  'ed1-affordable',
  'boutique-apartment',
  'cross-border-equity',
  'other',
];
const PROJECT_REGIONS: ProjectRegion[] = ['los-angeles', 'socal-other', 'california-other', 'us-other'];
const PROJECT_STAGES: ProjectStage[] = [
  'pre-development',
  'entitlement',
  'construction',
  'operating',
  'completed',
];
const PROJECT_TAGS: ProjectTag[] = ['sarec-involved', 'member-submitted', 'case-study'];
const MEMBER_ROLES: MemberRole[] = [
  'development',
  'lending',
  'construction',
  'legal',
  'accounting',
  'brokerage',
  'other',
];

/**
 * linkedMembers 的强校验。
 * Keystatic 的 multiselect 没有"至少选 N 项"的 validation,
 * 所以「单项内至少选一个角色」只能在这一层守;违规即构建期抛错,不放行到线上。
 */
function linkedMembers(v: unknown, file: string): LinkedMember[] {
  if (!Array.isArray(v)) return [];
  return v.map((raw, i) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const unit = str(row.unit).trim();
    if (!unit) {
      throw new Error(`[cms] ${file} 参与会员单位第 ${i + 1} 项未选择会员单位。`);
    }
    const roles = strArray(row.roles) as MemberRole[];
    if (roles.length === 0) {
      throw new Error(`[cms] ${file} 参与会员单位第 ${i + 1} 项(${unit})至少要选一个参与角色。`);
    }
    const bad = roles.find((r) => !MEMBER_ROLES.includes(r));
    if (bad) {
      throw new Error(`[cms] ${file} 参与会员单位第 ${i + 1} 项的角色「${bad}」不在允许范围内。`);
    }
    return { unit, roles, roleDescription: strOrNull(row.roleDescription) };
  });
}

function toProject(raw: Record<string, unknown>, slug: string, file: string): ProjectItem {
  const projectType = str(raw.projectType) as ProjectType;
  if (!PROJECT_TYPES.includes(projectType)) {
    throw new Error(`[cms] ${file} 的项目类型「${str(raw.projectType)}」不在允许范围内。`);
  }
  const region = str(raw.region) as ProjectRegion;
  if (!PROJECT_REGIONS.includes(region)) {
    throw new Error(`[cms] ${file} 的地区「${str(raw.region)}」不在允许范围内。`);
  }
  const stage = str(raw.stage) as ProjectStage;
  if (!PROJECT_STAGES.includes(stage)) {
    throw new Error(`[cms] ${file} 的项目阶段「${str(raw.stage)}」不在允许范围内。`);
  }
  const lastVerified = dateStr(raw.lastVerified);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastVerified)) {
    throw new Error(`[cms] ${file} 的资料最后核实日必须是 YYYY-MM-DD,当前为「${lastVerified}」。`);
  }
  const tags = strArray(raw.tags) as ProjectTag[];
  const badTag = tags.find((t) => !PROJECT_TAGS.includes(t));
  if (badTag) {
    throw new Error(`[cms] ${file} 的标签「${badTag}」不在允许范围内。`);
  }
  return {
    slug,
    title: str(raw.title).trim(),
    summary: str(raw.summary).trim(),
    projectType,
    region,
    stage,
    sarecRole: strArray(raw.sarecRole),
    linkedMembers: linkedMembers(raw.linkedMembers, file),
    tags,
    lastVerified,
    coverImage: strOrNull(raw.coverImage),
    gallery: gallery(raw.gallery, file),
    body: str(raw.body),
  };
}

const allProjects = (): ProjectItem[] => loadDir('projects', toProject);

/**
 * 会员项目列表:按资料核实日倒序。
 * ⚠️ 筛选只开放 region / projectType 两个维度 —— stage 不做筛选(合规红线:
 *    按阶段筛项目是挂牌板的典型形态特征)。
 */
export function listProjects(
  options: { region?: ProjectRegion; projectType?: ProjectType } = {}
): ProjectItem[] {
  return allProjects()
    .filter((p) => (options.region ? p.region === options.region : true))
    .filter((p) => (options.projectType ? p.projectType === options.projectType : true))
    .sort((a, b) => b.lastVerified.localeCompare(a.lastVerified));
}

export function getProjectBySlug(slug: string): ProjectItem | null {
  return allProjects().find((p) => p.slug === slug) ?? null;
}
