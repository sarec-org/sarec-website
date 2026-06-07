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
  q: string;
  a: string;
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
  relatedSlugs?: string[];
  cta?: CTAConfig;
  heroMedia?: Media;
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
