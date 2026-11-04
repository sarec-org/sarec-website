/**
 * 小程序只读内容（/api/v1/content/...）
 * ------------------------------------------------------------------
 * - 内容来源与网站完全相同：Keystatic 文章（content/geo，经 lib/geo/content）、页面文案（lib/content.ts）、
 *   研究索引（lib/researchIndex.ts）、会员权益（lib/benefitsContent.ts）。网站更新后小程序自动同步，不重复维护。
 * - 输出统一成简单节点（标题 / 段落 / 列表 / 引用），小程序原生渲染，不用 web-view。
 * - 合规（小程序审核）：
 *   · 标题涉及投资、融资、EB-5、收益、募资、资本等的页面：只给简介和“联系商会”，不给正文；
 *   · 其余页面：去掉所有数据表、指标卡、图表，以及含收益数字 / 金额 / 百分比 / 募资字样的段落；
 *   · 不输出任何付款、外部链接或表单。
 */
import { aboutPage, homePage, researchPages, servicePages, servicesOverviewPage, site, stats } from '@/lib/content';
import { listArticles, getArticle } from '@/lib/geo/content';
import type { Article, Block } from '@/lib/geo/types';
import { indexCategories } from '@/lib/researchIndex';
import { benefitsContent } from '@/lib/benefitsContent';

export type Node =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[]; title?: string }
  | { t: 'quote'; text: string; by?: string }
  | { t: 'note'; text: string };

export const RESTRICTED_NOTICE = '本页涉及投资、融资或移民相关内容，小程序内只提供简介。如需进一步了解，请联系商会工作人员。';

/** 标题 / slug 命中即只给简介 */
const RESTRICT_RE = /(EB-?5|投资|融资|收益|回报|募资|资本|资金|移民|IRR|ROE|Cap\s*Rate|LP\s*\/\s*GP|capital|eb5|irr|lp-gp)/i;
/** 段落命中即去掉：收益数字、金额、百分比、募资 / 认购等推介字样 */
const FIGURE_RE = /(IRR|ROE|ROI|回报|收益率|年化|利润率|分红|cap\s*rate|募资|募集|认购|最低投资|投资额|EB-?5|\$\s?\d|\d[\d,.]*\s*(%|％|万美元|亿美元|美元|万元|亿元))/i;

export const isRestricted = (...texts: (string | undefined | null)[]) => texts.some((t) => !!t && RESTRICT_RE.test(t));
const clean = (s: string) =>
  s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 链接只留文字
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\s+\n/g, '\n')
    .trim();
const safe = (s: string | undefined | null) => (s && !FIGURE_RE.test(s) ? clean(s) : null);
/** 简介：逐句过滤，去掉含数字收益 / 金额 / 百分比的句子 */
const safeSummary = (s: string) =>
  clean(s)
    .split(/(?<=[。！？；;])|\s*·\s*/)
    .map((x) => x.trim())
    .filter((x) => x && !FIGURE_RE.test(x))
    .join(' ')
    .trim() || '';
const safeHeading = (s: string): Node[] => (FIGURE_RE.test(s) ? [] : [{ t: 'h', text: clean(s) }]);
const slugOf = (href: string) => href.replace(/\/$/, '').split('/').pop() ?? href;
const servicePage = (slug: string) => Object.values(servicePages).find((p) => p.slug === slug) ?? null;
const researchPage = (slug: string) => Object.values(researchPages).find((p) => p.slug === slug) ?? null;

function mdToNodes(md: string): Node[] {
  const out: Node[] = [];
  for (const raw of md.split(/\n\s*\n/)) {
    const para = raw.trim();
    if (!para) continue;
    const h = para.match(/^#{1,6}\s+(.+)$/);
    if (h) {
      out.push(...safeHeading(h[1]));
      continue;
    }
    const lines = para.split('\n');
    if (lines.every((l) => /^\s*([-*+]|\d+[.)])\s+/.test(l))) {
      const items = lines.map((l) => l.replace(/^\s*([-*+]|\d+[.)])\s+/, '')).map(safe).filter((x): x is string => !!x);
      if (items.length) out.push({ t: 'list', items });
      continue;
    }
    const p = safe(para.replace(/\n/g, ''));
    if (p) out.push({ t: 'p', text: p });
  }
  return out;
}

function blockNodes(b: Block): Node[] {
  switch (b.type) {
    case 'prose':
      return mdToNodes(b.data.md);
    case 'sectionHeading':
      return safeHeading(b.data.text);
    case 'keyPoints': {
      const items = b.data.items.map(safe).filter((x): x is string => !!x);
      return items.length ? [{ t: 'list', items, title: b.data.title ? clean(b.data.title) : undefined }] : [];
    }
    case 'pullQuote': {
      const q = safe(b.data.text);
      return q ? [{ t: 'quote', text: q, by: b.data.attribution }] : [];
    }
    case 'callout': {
      const n = safe(b.data.md);
      return n ? [{ t: 'note', text: n }] : [];
    }
    case 'qaUnit': {
      const j = safe(b.data.judgment);
      return j && !FIGURE_RE.test(b.data.question) ? [{ t: 'h', text: clean(b.data.question) }, { t: 'p', text: j }] : [];
    }
    // 数据表、指标卡、图表、媒体、案例引用、行动按钮：小程序不展示
    default:
      return [];
  }
}

// ── 列表数据 ────────────────────────────────────────────────────────────
type Card = { slug: string; title: string; summary: string; restricted: boolean; tag?: string; date?: string };

function researchCards(): Card[] {
  const geo = listArticles({ status: 'published' })
    .slice()
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .map((a) => ({ slug: a.slug, title: a.title, summary: safeSummary(a.description), restricted: isRestricted(a.title, a.slug), tag: '研究', date: a.publishedAt }));
  const seen = new Set(geo.map((g) => g.slug));
  const idx: Card[] = [];
  for (const cat of indexCategories) {
    for (const art of cat.articles) {
      const slug = slugOf(art.href);
      if (seen.has(slug)) continue;
      seen.add(slug);
      idx.push({ slug, title: art.title, summary: safeSummary(art.desc), restricted: isRestricted(art.title, slug), tag: cat.title });
    }
  }
  return [...geo, ...idx];
}

function serviceCards(): Card[] {
  return servicesOverviewPage.services.map((s) => {
    const slug = slugOf(s.href);
    const page = servicePage(slug);
    return { slug, title: s.title, summary: safeSummary(s.description), restricted: isRestricted(s.title, page?.title, slug) };
  });
}

// ── 页面 ────────────────────────────────────────────────────────────────
export function contentHome() {
  return {
    site: { name: site.name, fullName: site.fullName, positioning: site.positioning },
    hero: { eyebrow: homePage.hero.eyebrow, title: homePage.hero.title, subtitle: homePage.hero.subtitle },
    services: { title: homePage.serviceTitle, items: serviceCards() },
    research: { title: homePage.researchTitle, items: researchCards().slice(0, 3) },
    stats,
    activity: { eyebrow: homePage.activity.eyebrow, title: homePage.activity.title, lines: homePage.activity.lines },
    trust: { title: homePage.trustTitle, text: homePage.partners },
    disclaimer: '页面内容仅作信息说明与研究参考，不构成证券发行、收益承诺或投资建议。'
  };
}

export function contentAbout() {
  const nodes: Node[] = [
    { t: 'h', text: aboutPage.who.title },
    ...aboutPage.who.body.map((p) => ({ t: 'p' as const, text: p })),
    { t: 'h', text: aboutPage.positioning.title },
    { t: 'quote', text: aboutPage.positioning.intro },
    { t: 'p', text: aboutPage.positioning.body },
    { t: 'h', text: '我们做什么' },
    ...aboutPage.functions.flatMap((f) => [{ t: 'list' as const, title: f.title, items: f.lines }]),
    { t: 'h', text: '长期积累' },
    { t: 'p', text: aboutPage.statsIntro },
    { t: 'p', text: aboutPage.partners }
  ];
  return { title: aboutPage.title, subtitle: aboutPage.subtitle, stats: aboutPage.stats, nodes };
}

export function contentServices() {
  return {
    title: servicesOverviewPage.title,
    subtitle: servicesOverviewPage.subtitle,
    intro: servicesOverviewPage.positioningIntro,
    points: servicesOverviewPage.positioningPoints,
    items: serviceCards(),
    guide: servicesOverviewPage.guide
  };
}

export function contentService(slug: string) {
  const card = serviceCards().find((c) => c.slug === slug);
  const page = servicePage(slug);
  if (!card || !page) return null;
  if (card.restricted) return { slug, title: card.title, summary: card.summary, restricted: true, notice: RESTRICTED_NOTICE, nodes: [] as Node[] };
  const nodes: Node[] = [];
  const intro = safe(page.problemIntro);
  if (intro) nodes.push({ t: 'p', text: intro });
  const problems = page.problems.map(safe).filter((x): x is string => !!x);
  if (problems.length) nodes.push({ t: 'list', items: problems });
  const concl = safe(page.problemConclusion);
  if (concl) nodes.push({ t: 'p', text: concl });
  if (page.work.length) nodes.push({ t: 'h', text: '我们怎么做' });
  for (const w of page.work) {
    const items = (w.items ?? []).map(safe).filter((x): x is string => !!x);
    const desc = safe(w.description);
    nodes.push({ t: 'list', title: w.title, items: [desc, ...items].filter((x): x is string => !!x) });
  }
  const judge = safe(page.expertQuote.sarecJudgment);
  if (judge) nodes.push({ t: 'quote', text: judge, by: 'SAREC 判断' });
  const fit = page.fit.map(safe).filter((x): x is string => !!x);
  if (fit.length) nodes.push({ t: 'h', text: '适合谁' }, { t: 'list', items: fit });
  return { slug, title: page.title, summary: safeSummary(page.subtitle) || card.summary, restricted: false, nodes };
}

export function contentResearchList() {
  return { title: '研究中心', subtitle: '基于真实项目积累的政策与判断研究', items: researchCards() };
}

function geoNodes(a: Article): Node[] {
  const nodes: Node[] = [];
  const tldr = (a.tldr ?? a.summary ?? []).map(safe).filter((x): x is string => !!x);
  if (tldr.length) nodes.push({ t: 'list', title: '核心判断', items: tldr });
  for (const b of a.blocks) nodes.push(...blockNodes(b));
  const check = (a.judgmentChecklist ?? []).map(safe).filter((x): x is string => !!x);
  if (check.length) nodes.push({ t: 'list', title: 'SAREC 判断清单', items: check });
  return nodes;
}

export function contentResearch(slug: string) {
  const card = researchCards().find((c) => c.slug === slug);
  if (!card) return null;
  const base = { slug, title: card.title, summary: card.summary, date: card.date ?? null };
  if (card.restricted) return { ...base, restricted: true, notice: RESTRICTED_NOTICE, nodes: [] as Node[] };
  const a = getArticle(slug);
  if (a && a.status === 'published') return { ...base, author: a.author?.name ?? 'SAREC Research', restricted: false, nodes: geoNodes(a) };
  const r = researchPage(slug);
  if (r) {
    const nodes: Node[] = [];
    for (const sec of r.sections) {
      nodes.push(...safeHeading(sec.title));
      for (const p of sec.paragraphs ?? []) {
        const x = safe(p);
        if (x) nodes.push({ t: 'p', text: x });
      }
      const items = [...(sec.orderedItems ?? []), ...(sec.bullets ?? []), ...(sec.negativeBullets ?? [])].map(safe).filter((x): x is string => !!x);
      if (items.length) nodes.push({ t: 'list', items });
      for (const d of sec.detailItems ?? []) {
        const body = [d.question, d.method, d.body, d.redFlag ? `红旗信号：${d.redFlag}` : null].map((x) => safe(x ?? null)).filter((x): x is string => !!x);
        if (body.length) nodes.push({ t: 'list', title: d.title, items: body });
      }
    }
    return { ...base, restricted: false, nodes };
  }
  // 网站上是独立页面、没有结构化正文的研究：给简介
  return { ...base, restricted: false, nodes: [{ t: 'p', text: card.summary } as Node], more: '完整研究内容可联系商会工作人员获取。' };
}

export function contentBenefits() {
  return benefitsContent;
}

export function contentContact() {
  return {
    title: '联系商会',
    body: aboutPage.contact.body,
    phone: site.phone,
    phoneDial: site.phone.replace(/[^\d+]/g, ''),
    email: site.email,
    address: `${aboutPage.contact.address}（${site.location}）`,
    note: '如需了解会员、活动、项目协作或研究内容，欢迎来电或发邮件，工作人员会尽快回复。'
  };
}
