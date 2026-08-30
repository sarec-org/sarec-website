/**
 * SAREC CMS V2 —— JSON-LD 纯函数层(news / events / projects)。
 * ------------------------------------------------------------------
 * 与 lib/geo/schema.ts 同风格:无副作用、不读 fs/env、域名由 caller 经
 * options.siteUrl 注入,helper 内绝不硬编码生产域名。返回值均可 JSON.stringify。
 *
 * 【结构化数据红线】
 *  - Event 只在单场活动详情页输出,聚合页不整体标 Event。
 *  - eventStatus 只映射 schema.org 标准值;completed 无标准枚举值 → 不输出该属性,
 *    不自造 "EventCompleted",过去的活动靠日期 + 回顾期叠加 Article 表达。
 *  - offers:registrationStatus=open 且有公开报名 URL 才输出;full 保留 Offer 并
 *    置 availability=SoldOut;closed / notOpen 不输出 offers。
 *  - 会员项目详情页默认 WebPage;不为 GEO 把普通展示页一律标成 Article。
 */
import type { EventItem, MemberProfile, MemberUnit, NewsItem, ProjectItem } from './types';

type JsonLd = Record<string, unknown>;

/** 商会作为内容作者 / 发布者的统一身份。 */
export const PUBLISHER_NAME = '中美房地产商会（SAREC）';
const LOGO_PATH = '/brand/sarec-logo.png';

function organization(siteUrl: string, withLogo = false): JsonLd {
  const org: JsonLd = {
    '@type': 'Organization',
    name: PUBLISHER_NAME,
    url: siteUrl,
  };
  if (withLogo) {
    org.logo = { '@type': 'ImageObject', url: `${siteUrl}${LOGO_PATH}` };
  }
  return org;
}

function absolute(siteUrl: string, path: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${siteUrl}${path}`;
}

// ── 新闻详情:NewsArticle ────────────────────────────────────────────
export function buildNewsArticleJsonLd(
  news: NewsItem,
  options: { siteUrl: string; pathname: string }
): JsonLd {
  const url = `${options.siteUrl}${options.pathname}`;
  const image = absolute(options.siteUrl, news.coverImage);

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': url,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: news.title,
    description: news.summary,
    inLanguage: 'zh-CN',
    datePublished: news.publishedAt,
    dateModified: news.publishedAt,
    author: organization(options.siteUrl),
    publisher: organization(options.siteUrl, true),
  };
  if (image) jsonLd.image = [image];
  return jsonLd;
}

// ── 活动详情:Event ──────────────────────────────────────────────────
/** completed 刻意不在表内 —— schema.org 没有对应枚举值,不自造。 */
const EVENT_STATUS_SCHEMA: Record<string, string> = {
  scheduled: 'https://schema.org/EventScheduled',
  postponed: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
};

export function buildEventJsonLd(
  event: EventItem,
  options: { siteUrl: string; pathname: string }
): JsonLd {
  const url = `${options.siteUrl}${options.pathname}`;
  const image = absolute(options.siteUrl, event.coverImage);

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': url,
    url,
    name: event.title,
    description: event.summary,
    inLanguage: 'zh-CN',
    startDate: event.startAt,
    organizer: organization(options.siteUrl),
  };

  if (event.endAt) jsonLd.endDate = event.endAt;
  if (image) jsonLd.image = [image];

  const status = EVENT_STATUS_SCHEMA[event.eventStatus];
  if (status) jsonLd.eventStatus = status;

  if (event.locationName) {
    const place: JsonLd = { '@type': 'Place', name: event.locationName };
    if (event.address) {
      place.address = { '@type': 'PostalAddress', streetAddress: event.address };
    }
    jsonLd.location = place;
  }

  if (event.speakers.length > 0) {
    jsonLd.performer = event.speakers.map((s) => ({
      '@type': 'Person',
      name: s.name,
      ...(s.title ? { jobTitle: s.title } : {}),
    }));
  }

  // offers:只在报名真正对外开放(open)或已满(full)时输出;
  // closed / notOpen 不输出,会员专属 / 邀请制活动保留普通 Event 语义即可。
  if (event.registrationUrl && (event.registrationStatus === 'open' || event.registrationStatus === 'full')) {
    jsonLd.offers = {
      '@type': 'Offer',
      url: event.registrationUrl,
      price: 0,
      priceCurrency: 'USD',
      availability:
        event.registrationStatus === 'full'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
    };
  }

  return jsonLd;
}

/**
 * 已结束且有回顾的活动,额外叠一份 Article 表达「回顾」这层内容。
 * 这是 completed 没有标准 eventStatus 枚举值时的表达方式,不是给普通活动加 Article。
 */
export function buildEventRecapArticleJsonLd(
  event: EventItem,
  options: { siteUrl: string; pathname: string }
): JsonLd {
  const url = `${options.siteUrl}${options.pathname}`;
  const image = absolute(options.siteUrl, event.coverImage);

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#recap`,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: `${event.title} · 活动回顾`,
    description: event.summary,
    inLanguage: 'zh-CN',
    datePublished: event.startAt.slice(0, 10),
    author: organization(options.siteUrl),
    publisher: organization(options.siteUrl, true),
    about: { '@type': 'Event', name: event.title, startDate: event.startAt },
  };
  if (image) jsonLd.image = [image];
  return jsonLd;
}

// ── 会员项目详情:默认 WebPage ───────────────────────────────────────
/**
 * 「确为完整案例文章」的可判定口径:tags 含「案例研究」且正文达到长文体量。
 * 阈值取 800 字符 —— 低于此的展示型条目一律 WebPage,不为 GEO 抬升类型。
 */
const CASE_STUDY_BODY_MIN = 800;

export function shouldUseArticleType(project: ProjectItem): boolean {
  return project.tags.includes('case-study') && project.body.trim().length >= CASE_STUDY_BODY_MIN;
}

export function buildProjectJsonLd(
  project: ProjectItem,
  options: {
    siteUrl: string;
    pathname: string;
    /** 关联的会员单位名称(PR-1 为空;PR-2 由 memberUnits 解析后注入)。 */
    memberOrganizations?: string[];
  }
): JsonLd {
  const url = `${options.siteUrl}${options.pathname}`;
  const image = absolute(options.siteUrl, project.coverImage);
  const isArticle = shouldUseArticleType(project);

  const about: JsonLd[] = [
    { '@type': 'Project', name: project.title, description: project.summary },
    ...(options.memberOrganizations ?? []).map((name) => ({
      '@type': 'Organization',
      name,
    })),
  ];

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : 'WebPage',
    '@id': url,
    url,
    name: project.title,
    description: project.summary,
    inLanguage: 'zh-CN',
    dateModified: project.lastVerified,
    about,
    publisher: organization(options.siteUrl, true),
  };

  if (isArticle) {
    jsonLd.headline = project.title;
    jsonLd.mainEntityOfPage = { '@type': 'WebPage', '@id': url };
    jsonLd.author = organization(options.siteUrl);
  }
  if (image) jsonLd.image = [image];

  return jsonLd;
}

// ── 会员单位详情:Organization(memberOf = SAREC)────────────────────
export function buildMemberUnitJsonLd(
  unit: MemberUnit,
  options: { siteUrl: string; pathname: string }
): JsonLd {
  const url = `${options.siteUrl}${options.pathname}`;
  const logo = absolute(options.siteUrl, unit.logo);

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': url,
    url,
    name: unit.name,
    memberOf: organization(options.siteUrl),
  };
  if (unit.coreBusiness) jsonLd.description = unit.coreBusiness;
  if (logo) jsonLd.logo = { '@type': 'ImageObject', url: logo };
  if (unit.representative) {
    jsonLd.employee = { '@type': 'Person', name: unit.representative };
  }
  return jsonLd;
}

// ── 会员人物详情:Person ─────────────────────────────────────────────
export function buildMemberProfileJsonLd(
  profile: MemberProfile,
  options: { siteUrl: string; pathname: string; unitName?: string | null }
): JsonLd {
  const url = `${options.siteUrl}${options.pathname}`;
  const image = absolute(options.siteUrl, profile.coverImage);

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': url,
    url,
    name: profile.name,
  };
  if (profile.title) jsonLd.jobTitle = profile.title;
  if (options.unitName) {
    jsonLd.worksFor = { '@type': 'Organization', name: options.unitName };
  }
  jsonLd.memberOf = organization(options.siteUrl);
  if (image) jsonLd.image = [image];
  return jsonLd;
}
