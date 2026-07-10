/**
 * SAREC GEO CMS —— Keystatic → Article 适配层（Gate 3A-1）
 * ------------------------------------------------------------------
 * 职责:把 Keystatic(YAML, conditional 形状)解析出的「原始对象」还原成现有 Article 类型。
 * - 把 blocks 的 { discriminant, value } 还原成现有 { type, data } 判别联合。
 * - 把可选对象的 conditional({ discriminant:boolean, value }) 还原成 Article 的可选字段。
 * - 补默认值、校验必填字段;缺关键字段直接抛错(不静默猜测)。
 * - 输出严格为 Article 形状;不改变 qaUnit / FAQ / sources / Schema 的下游语义。
 * - 纯同步函数:调用方(未来的 lib/geo/content.ts)无需变 async。
 *
 * ⚠️ 本文件不被任何运行代码 import(Gate 3A-1 不接入前台);仅作为 Gate 3A-2 改 content.ts 的预备件。
 *    不修改 lib/geo/types.ts —— 这里只 import type。
 */
import type {
  Article,
  ArticleTemplate,
  Block,
  QaUnit,
  Media,
  FAQItem,
  Author,
  SourceItem,
  MetricCard,
  ChartTableRow,
  ChartPoint,
} from './types';

const TEMPLATES: ArticleTemplate[] = ['deep', 'brief', 'data'];

// 还原栏目/模板 + 扁平元字段。
// 支持两种形状:①Keystatic conditional { discriminant, value };②扁平 { template, tldr, ... }(解析器/兼容)。
function mapTemplate(raw: any, article: Article): void {
  let tpl: string | undefined;
  let v: any = raw; // 元字段默认从顶层读(扁平形状)

  const t = raw.template;
  if (t && typeof t === 'object' && isFilled(t.discriminant)) {
    tpl = t.discriminant;
    v = t.value ?? {};
  } else if (isFilled(t)) {
    tpl = t;
  }
  if (!tpl || !TEMPLATES.includes(tpl as ArticleTemplate)) return;
  article.template = tpl as ArticleTemplate;

  const tldr = toStringArray(v.tldr);
  if (tldr.length) article.tldr = tldr;
  if (isFilled(v.dataCutoff)) article.dataCutoff = String(v.dataCutoff);
  if (isFilled(v.dataPeriod)) article.dataPeriod = String(v.dataPeriod);
  if (isFilled(v.changeNote)) article.changeNote = String(v.changeNote);
  const checklist = toStringArray(v.judgmentChecklist);
  if (checklist.length) article.judgmentChecklist = checklist;
  if (isFilled(v.oneLine)) {
    article.brief = { oneLine: String(v.oneLine) };
    if (isFilled(v.background)) article.brief.background = String(v.background);
    if (isFilled(v.impact)) article.brief.impact = String(v.impact);
    if (isFilled(v.judgment)) article.brief.judgment = String(v.judgment);
  } else if (v.brief && typeof v.brief === 'object' && isFilled(v.brief.oneLine)) {
    // 扁平形状里 brief 作为对象存在
    article.brief = { oneLine: String(v.brief.oneLine) };
    if (isFilled(v.brief.background)) article.brief.background = String(v.brief.background);
    if (isFilled(v.brief.impact)) article.brief.impact = String(v.brief.impact);
    if (isFilled(v.brief.judgment)) article.brief.judgment = String(v.brief.judgment);
  }
}

function mapSourceList(raw: unknown): SourceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === 'object' && isFilled((s as any).name))
    .map((s: any) => {
      const item: SourceItem = { name: String(s.name) };
      if (isFilled(s.url)) item.url = String(s.url);
      if (isFilled(s.accessedAt)) item.accessedAt = String(s.accessedAt);
      return item;
    });
}

type RawBlock = { discriminant?: string; type?: string; value?: any; data?: any };
type RawConditional = { discriminant?: boolean | string; value?: any };

function isFilled(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((s) => s.length > 0);
}

function requireField(raw: Record<string, unknown>, key: string): void {
  if (!isFilled(raw[key] as string) && typeof raw[key] !== 'object') {
    throw new Error(`keystatic-adapter: 缺少必填字段「${key}」`);
  }
}

function unwrapConditional(node: RawConditional | undefined): any | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const d = node.discriminant;
  if (d === true || d === 'true') return node.value ?? undefined;
  return undefined;
}

function mapAuthor(raw: any): Author {
  if (!raw || !isFilled(raw.name)) {
    throw new Error('keystatic-adapter: 缺少必填字段「author.name」');
  }
  const author: Author = { name: raw.name };
  if (isFilled(raw.title)) author.title = raw.title;
  if (isFilled(raw.profileUrl)) author.profileUrl = raw.profileUrl;
  return author;
}

// M1（批次 3）：本地直传图片的 public 前缀，与 keystatic.config.ts 中 assetBreak.upload.publicPath 一致。
const UPLOAD_PUBLIC_PATH = '/images/research/uploads';

// 解析媒体源：优先 Keystatic 直传字段 upload（原始 YAML 存 basename），回退到 src（URL 文本）。
// 防御性：upload 若已是绝对路径 / http(s) 则原样用，避免重复前缀；否则按 publicPath 还原。
function resolveMediaSrc(raw: any): string {
  const up = raw?.upload;
  if (isFilled(up)) {
    const s = String(up).trim();
    if (/^(https?:)?\/\//.test(s) || s.startsWith('/')) return s;
    return `${UPLOAD_PUBLIC_PATH}/${s.replace(/^\/+/, '')}`;
  }
  return String(raw?.src ?? '');
}

function mapMedia(raw: any): Media {
  const kind = raw?.kind === 'video' ? 'video' : 'image';
  const media: Media = { kind, src: resolveMediaSrc(raw), alt: String(raw?.alt ?? '') };
  if (isFilled(raw?.poster)) media.poster = raw.poster;
  return media;
}

function mapFaq(raw: any): FAQItem {
  return { question: String(raw?.question ?? ''), answer: String(raw?.answer ?? '') };
}

function mapBlock(raw: RawBlock, index: number): Block {
  const type = raw.discriminant ?? raw.type;
  const v = raw.value ?? raw.data ?? {};
  switch (type) {
    case 'prose':
      return { type: 'prose', data: { md: String(v.md ?? '') } };
    case 'sectionHeading': {
      const data: { text: string; id?: string } = { text: String(v.text ?? '') };
      if (isFilled(v.id)) data.id = v.id;
      return { type: 'sectionHeading', data };
    }
    case 'keyPoints': {
      const data: { title?: string; items: string[] } = { items: toStringArray(v.items) };
      if (isFilled(v.title)) data.title = v.title;
      return { type: 'keyPoints', data };
    }
    case 'dataTable': {
      const rows = Array.isArray(v.rows)
        ? v.rows.map((r: any) => ({ label: String(r?.label ?? ''), value: String(r?.value ?? '') }))
        : [];
      const data: { caption?: string; rows: { label: string; value: string }[] } = { rows };
      if (isFilled(v.caption)) data.caption = v.caption;
      return { type: 'dataTable', data };
    }
    case 'pullQuote': {
      const data: { text: string; attribution?: string } = { text: String(v.text ?? '') };
      if (isFilled(v.attribution)) data.attribution = v.attribution;
      return { type: 'pullQuote', data };
    }
    case 'callout': {
      const tone = v.tone === 'risk' || v.tone === 'legal' ? v.tone : 'note';
      return { type: 'callout', data: { tone, md: String(v.md ?? '') } };
    }
    case 'qaUnit': {
      const data: QaUnit = {
        id: String(v.id ?? ''),
        question: String(v.question ?? ''),
        judgment: String(v.judgment ?? ''),
        evidence: toStringArray(v.evidence),
        boundary: String(v.boundary ?? ''),
      };
      if (isFilled(v.riskNote)) data.riskNote = v.riskNote;
      return { type: 'qaUnit', data };
    }
    case 'caseRef':
      return { type: 'caseRef', data: { caseSlug: String(v.caseSlug ?? '') } };
    case 'assetBreak': {
      const media = mapMedia(v);
      const data: Media & {
        eyebrow?: string;
        title?: string;
        body?: string;
        generated?: 'illustration' | 'ai';
      } = { ...media };
      if (isFilled(v.eyebrow)) data.eyebrow = v.eyebrow;
      if (isFilled(v.title)) data.title = v.title;
      if (isFilled(v.body)) data.body = v.body;
      if (v.generated === 'illustration' || v.generated === 'ai') data.generated = v.generated;
      return { type: 'assetBreak', data };
    }
    case 'cta':
      return {
        type: 'cta',
        data: { intent: 'risk-review', label: String(v.label ?? ''), sourceSlug: String(v.sourceSlug ?? '') },
      };
    case 'metricCards': {
      const items = Array.isArray(v.items)
        ? v.items.map((it: any) => {
            const card: MetricCard = {
              label: String(it?.label ?? ''),
              value: String(it?.value ?? ''),
            };
            if (isFilled(it?.change)) card.change = String(it.change);
            if (it?.trend === 'up' || it?.trend === 'down' || it?.trend === 'flat') card.trend = it.trend;
            if (isFilled(it?.note)) card.note = String(it.note);
            return card;
          })
        : [];
      const data: { title?: string; items: MetricCard[] } = { items };
      if (isFilled(v.title)) data.title = v.title;
      return { type: 'metricCards', data };
    }
    case 'chartTable': {
      const headers = toStringArray(v.headers);
      const rows = Array.isArray(v.rows)
        ? v.rows.map((r: any) => ({
            cells: toStringArray(r?.cells),
            ...(r?.highlight === true || r?.highlight === 'true' ? { highlight: true } : {}),
          }))
        : [];
      const data: { caption?: string; headers: string[]; rows: ChartTableRow[] } = { headers, rows };
      if (isFilled(v.caption)) data.caption = v.caption;
      return { type: 'chartTable', data };
    }
    case 'barLineChart': {
      const variant = v.variant === 'line' ? 'line' : 'bar';
      const series = Array.isArray(v.series)
        ? v.series
            .map((p: any) => ({ label: String(p?.label ?? ''), value: Number(p?.value) }))
            .filter((p: any) => p.label.length > 0 && Number.isFinite(p.value))
        : [];
      const data: {
        caption?: string;
        variant: 'bar' | 'line';
        unit?: string;
        series: ChartPoint[];
        source?: string;
      } = { variant, series };
      if (isFilled(v.caption)) data.caption = v.caption;
      if (isFilled(v.unit)) data.unit = v.unit;
      if (isFilled(v.source)) data.source = v.source;
      return { type: 'barLineChart', data };
    }
    default:
      throw new Error(`keystatic-adapter: 第 ${index} 个 block 的未知类型「${String(type)}」`);
  }
}

export function fromKeystaticArticle(raw: any): Article {
  if (!raw || typeof raw !== 'object') {
    throw new Error('keystatic-adapter: 文章原始数据不是对象');
  }
  for (const key of ['slug', 'locale', 'cluster', 'tier', 'status', 'title', 'description', 'publishedAt']) {
    requireField(raw, key);
  }
  if (!Array.isArray(raw.blocks)) {
    throw new Error('keystatic-adapter: blocks 必须是数组');
  }

  const article: Article = {
    slug: String(raw.slug),
    locale: raw.locale,
    cluster: raw.cluster,
    tier: raw.tier,
    status: raw.status,
    title: String(raw.title),
    description: String(raw.description),
    author: mapAuthor(raw.author),
    publishedAt: String(raw.publishedAt),
    summary: toStringArray(raw.summary),
    blocks: raw.blocks.map((b: RawBlock, i: number) => mapBlock(b, i)),
    sources: toStringArray(raw.sources),
  };

  mapTemplate(raw, article);
  // 版式（M3）：仅 report / compact 显式设置，其余（含老文章缺字段）由渲染层按 classic 兜底。
  if (raw.layout === 'report' || raw.layout === 'compact') article.layout = raw.layout;
  if (isFilled(raw.audience)) article.audience = raw.audience;
  if (isFilled(raw.intent)) article.intent = raw.intent;
  if (isFilled(raw.updatedAt)) article.updatedAt = raw.updatedAt;
  const sourceList = mapSourceList(raw.sourceList);
  if (sourceList.length > 0) article.sourceList = sourceList;
  if (Array.isArray(raw.faq) && raw.faq.length > 0) article.faq = raw.faq.map(mapFaq);
  if (Array.isArray(raw.relatedSlugs) && raw.relatedSlugs.length > 0) {
    article.relatedSlugs = toStringArray(raw.relatedSlugs);
  }

  const cta = unwrapConditional(raw.cta);
  if (cta && isFilled(cta.label)) {
    article.cta = { intent: 'risk-review', label: String(cta.label), sourceSlug: String(cta.sourceSlug ?? '') };
  }

  const hero = unwrapConditional(raw.heroMedia);
  if (hero && isFilled(hero.src)) {
    article.heroMedia = mapMedia(hero);
  }

  return article;
}
