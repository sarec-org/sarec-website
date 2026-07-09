/**
 * SAREC GEO B+ Core —— P1-1 数据模型(接缝一:内容即数据,不是 JSX)
 * ------------------------------------------------------------------
 * - 文章正文用 blocks[] 判别联合表达;Core 用简单 switch 渲染;Pro 可接通用 Block Renderer。
 * - 禁止复用旧 lib/content.ts 的 ResearchArticleSection / ResearchArticleContent 形状。
 * - 本文件仅类型,无运行时副作用。
 */

export type Locale = 'zh' | 'en';

export type ClusterId =
  | 'chinese-capital-us-re-risk'
  | 'eb5-real-estate'
  | 'la-development-ed1'
  | 'sec-finder-compliance';

export type Tier = 'pillar' | 'satellite' | 'note';

// 栏目(前台可见分类)：三个内容模板 = 三个栏目。
// deep = SAREC 深度；brief = SAREC 快评；data = SAREC 数据追踪。
// 老文章无 template 字段时，accessor / 渲染层按 'deep' 兜底（一次性映射，见 lib/geo/labels.ts）。
export type ArticleTemplate = 'deep' | 'brief' | 'data';

// 前台「数据来源」区的一条来源（M3.4）。
// 与 sources:string[]（引用已注册 Source ID）并存：sourceList 用于 markdown 导入的自由文本来源，
// 含 URL 与抓取日期，可选接入 Schema citation。
export type SourceItem = {
  name: string;
  url?: string;
  accessedAt?: string; // 抓取 / 访问日期 YYYY-MM-DD
};

export type Author = {
  name: string;
  title?: string;
  profileUrl?: string;
};

export type Media = {
  kind: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
};

export type Source = {
  id: string;
  type:
    | 'law'
    | 'government'
    | 'court'
    | 'market-report'
    | 'project-experience'
    | 'expert-opinion'
    | 'news';
  name: string;
  url?: string;
  date?: string;
  jurisdiction?: string;
  language?: Locale;
  reliability?: 'high' | 'medium' | 'low';
  quoteAllowed?: boolean;
  notes?: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type QaUnit = {
  id: string;
  question: string;
  judgment: string;
  evidence: string[]; // source ids
  boundary: string;
  riskNote?: string;
};

export type CTAConfig = {
  intent: 'risk-review';
  label: string;
  sourceSlug: string;
};

export type Block =
  | { type: 'prose'; data: { md: string } }
  | { type: 'sectionHeading'; data: { text: string; id?: string } }
  | { type: 'keyPoints'; data: { title?: string; items: string[] } }
  | { type: 'dataTable'; data: { caption?: string; rows: { label: string; value: string }[] } }
  | { type: 'pullQuote'; data: { text: string; attribution?: string } }
  | { type: 'callout'; data: { tone: 'risk' | 'note' | 'legal'; md: string } }
  | { type: 'qaUnit'; data: QaUnit }
  | { type: 'caseRef'; data: { caseSlug: string } }
  | { type: 'assetBreak'; data: Media & { eyebrow?: string; title?: string; body?: string } }
  | { type: 'cta'; data: CTAConfig };

export type Article = {
  slug: string;
  locale: Locale;
  cluster: ClusterId;
  tier: Tier;
  template?: ArticleTemplate; // 栏目 / 模板；缺省按 'deep' 兜底
  status: 'draft' | 'published';
  title: string;
  description: string;
  audience?: string;
  intent?: string;
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  summary: string[];
  blocks: Block[];
  faq?: FAQItem[];
  sources: string[]; // source ids
  sourceList?: SourceItem[]; // 自由文本来源（含 URL / 抓取日期），前台「数据来源」区
  relatedSlugs?: string[];
  cta?: CTAConfig;
  heroMedia?: Media;
  // ── 模板专属元字段（M2；全部可选，老文章 / 旧 YAML 不填仍合法）───────────
  tldr?: string[]; // 深度：TL;DR / 核心判断
  dataCutoff?: string; // 深度 / 数据追踪：数据截止日
  dataPeriod?: string; // 数据追踪：数据周期
  changeNote?: string; // 数据追踪：变化说明
  judgmentChecklist?: string[]; // 深度：SAREC 判断清单
  brief?: {
    // 快评：一句话结论 + 背景 + 影响 + SAREC 判断
    oneLine: string;
    background?: string;
    impact?: string;
    judgment?: string;
  };
};

export type LegalNode = {
  node: string;
  complianceTag: string;
};

export type Case = {
  slug: string;
  locale: Locale;
  cluster: ClusterId;
  status: 'draft' | 'published';
  projectName: string;
  aka?: string[];
  location: string;
  assetType: string;
  dealType: string;
  capitalStack?: string;
  failurePoint: string;
  riskMechanism: string;
  legalNodes: LegalNode[];
  legalBoundary: string;
  timeline: { date: string; event: string }[];
  quantifiedLoss?: string;
  warningSignals: string[];
  lessons: string[];
  sources: string[]; // source ids
  relatedSlugs?: string[];
};

export type Cluster = {
  id: ClusterId;
  title: string;
  description: string;
};
