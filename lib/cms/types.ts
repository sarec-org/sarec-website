/**
 * SAREC CMS V2 —— 内容类型契约(news / events / projects)。
 * ------------------------------------------------------------------
 * 与 lib/geo/types.ts 平行、彼此独立:GEO 研究文章走 lib/geo/*,
 * 本模块只服务「新闻与活动」「会员项目」。两套不互相 import。
 *
 * 形状与 keystatic.config.ts 的 collection schema 一一对应:
 *  - fields.slug   → 文件名即 slug;字段值(标题/名称)另存在 YAML 里
 *  - fields.date   → 'YYYY-MM-DD' 字符串
 *  - fields.datetime → 'YYYY-MM-DDTHH:mm' 字符串(不含时区,时区另存 timezone 字段)
 *  - fields.multiselect → string[]
 *  - fields.image  → public 路径字符串,未上传为 null
 */

export type GalleryImage = {
  image: string;
  alt: string;
};

// ── 新闻 ────────────────────────────────────────────────────────────
export type NewsCategory = 'chamber-news' | 'member-update' | 'partnership-progress';

export type NewsItem = {
  slug: string;
  title: string;
  category: NewsCategory;
  /** 'YYYY-MM-DD' */
  publishedAt: string;
  summary: string;
  coverImage: string | null;
  gallery: GalleryImage[];
  body: string;
};

// ── 活动 ────────────────────────────────────────────────────────────
export type EventStatus = 'scheduled' | 'completed' | 'postponed' | 'cancelled';
export type RegistrationStatus = 'notOpen' | 'open' | 'closed' | 'full';

export type EventSpeaker = {
  name: string;
  title: string | null;
};

export type EventItem = {
  slug: string;
  title: string;
  summary: string;
  /** 'YYYY-MM-DDTHH:mm'(当地时间,时区见 timezone) */
  startAt: string;
  endAt: string | null;
  /** IANA 时区标识,如 America/Los_Angeles */
  timezone: string;
  locationName: string | null;
  address: string | null;
  organizer: string | null;
  registrationUrl: string | null;
  eventStatus: EventStatus;
  registrationStatus: RegistrationStatus;
  coverImage: string | null;
  body: string;
  recapBody: string;
  speakers: EventSpeaker[];
  gallery: GalleryImage[];
};

// ── 会员项目 ────────────────────────────────────────────────────────
export type ProjectType = 'ed1-affordable' | 'boutique-apartment' | 'cross-border-equity' | 'other';
export type ProjectRegion = 'los-angeles' | 'socal-other' | 'california-other' | 'us-other';
export type ProjectStage =
  | 'pre-development'
  | 'entitlement'
  | 'construction'
  | 'operating'
  | 'completed';
export type ProjectTag = 'sarec-involved' | 'member-submitted' | 'case-study';
export type MemberRole =
  | 'development'
  | 'lending'
  | 'construction'
  | 'legal'
  | 'accounting'
  | 'brokerage'
  | 'other';

export type LinkedMember = {
  /** memberUnits 的 slug */
  unit: string;
  roles: MemberRole[];
  roleDescription: string | null;
};

export type ProjectItem = {
  slug: string;
  title: string;
  summary: string;
  projectType: ProjectType;
  region: ProjectRegion;
  stage: ProjectStage;
  sarecRole: string[];
  linkedMembers: LinkedMember[];
  tags: ProjectTag[];
  /** 'YYYY-MM-DD' */
  lastVerified: string;
  sortWeight: number;
  coverImage: string | null;
  gallery: GalleryImage[];
  body: string;
};

// ── 会员单位 / 会员人物 ──────────────────────────────────────────────
export type MembershipTier = 'vice-chair' | 'executive-director' | 'director' | 'member';
export type RelationshipTag = 'strategic-partner';
export type Expertise =
  | 'development-investment'
  | 'construction-materials'
  | 'lending-finance'
  | 'legal-tax'
  | 'brokerage'
  | 'tech-professional-services';

export type MemberUnit = {
  slug: string;
  name: string;
  logo: string | null;
  membershipTier: MembershipTier;
  relationshipTags: RelationshipTag[];
  representative: string | null;
  coreBusiness: string | null;
  expertise: Expertise[];
  /** 'YYYY-MM-DD' */
  joinedAt: string | null;
  lastVerified: string | null;
  sortWeight: number;
  published: boolean;
  publicationApproved: boolean;
};

export type MemberProfile = {
  slug: string;
  name: string;
  /** memberUnits 的 slug;未关联为 null */
  unit: string | null;
  title: string | null;
  coverImage: string | null;
  body: string;
  published: boolean;
  publicationApproved: boolean;
};
