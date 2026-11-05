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
 * - 图片（lib/mpImages.ts）：主视觉、服务 / 研究卡片图、文章配图、logo、人物与项目照片，走网站图片压缩；
 *   含收益数字、投资回报的图表和数据图不给；视频用封面图代替。
 */
import { aboutPage, homePage, researchPages, servicePages, servicesOverviewPage, site, stats } from '@/lib/content';
import { listArticles, getArticle } from '@/lib/geo/content';
import type { Article, Block } from '@/lib/geo/types';
import { indexCategories } from '@/lib/researchIndex';
import { benefitsContent } from '@/lib/benefitsContent';
import { IMAGES, img, imageAllowed, researchPoster, serviceImage, type MpImage } from '@/lib/mpImages';

export type Node =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[]; title?: string }
  | { t: 'quote'; text: string; by?: string }
  | { t: 'note'; text: string }
  | { t: 'img'; img: MpImage; caption?: string };

export const RESTRICTED_NOTICE = '本页涉及投资、融资或移民相关内容，小程序内只提供简介。如需进一步了解，请联系商会工作人员。';

/** 标题 / slug 命中即只给简介 */
const RESTRICT_RE = /(EB-?5|投资|值得投|可投|融资|收益|回报|现金流|赚钱|盈利|利润|募资|资本|资金|移民|IRR|ROE|Cap\s*Rate|LP\s*\/\s*GP|capital|eb5|irr|lp-gp)/i;
/** 段落命中即去掉：收益数字、金额、百分比、募资 / 认购等推介字样 */
const FIGURE_RE = /(IRR|ROE|ROI|回报|收益|年化|利润|分红|赚钱|盈利|收入|现金流|溢价|cap\s*rate|募资|募集|认购|最低投资|投资额|EB-?5|\$\s?\d|\d[\d,.]*\s*(%|％|万美元|亿美元|美元|万元|亿元))/i;

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
    case 'assetBreak': {
      // 文章配图：图片直接用，视频用封面图；示意图 / 数据图 / 含收益数字的不给
      const d = b.data;
      const path = d.kind === 'video' ? d.poster : d.src;
      if (!path || !imageAllowed(d.alt, d.title, d.eyebrow, d.body)) return [];
      return [{ t: 'img', img: img(path, d.alt), caption: d.title ? clean(d.title) : undefined }];
    }
    // 数据表、指标卡、图表、案例引用、行动按钮：小程序不展示
    default:
      return [];
  }
}

// ── 列表数据 ────────────────────────────────────────────────────────────
type Card = { slug: string; title: string; summary: string; restricted: boolean; tag?: string; date?: string; image?: MpImage | null };

/** 文章第一张可用配图（卡片封面） */
function articleCover(a: Article, w: 384 | 750 = 384): MpImage | null {
  for (const b of a.blocks) {
    if (b.type !== 'assetBreak') continue;
    const path = b.data.kind === 'video' ? b.data.poster : b.data.src;
    if (path && imageAllowed(b.data.alt, b.data.title, b.data.eyebrow, b.data.body)) return img(path, b.data.alt, w);
  }
  return null;
}

function researchCards(): Card[] {
  const geo = listArticles({ status: 'published' })
    .slice()
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .map((a) => ({ slug: a.slug, title: a.title, summary: safeSummary(a.description), restricted: isRestricted(a.title, a.slug), tag: '研究', date: a.publishedAt, image: articleCover(a) }));
  const seen = new Set(geo.map((g) => g.slug));
  const idx: Card[] = [];
  for (const cat of indexCategories) {
    for (const art of cat.articles) {
      const slug = slugOf(art.href);
      if (seen.has(slug)) continue;
      seen.add(slug);
      idx.push({ slug, title: art.title, summary: safeSummary(art.desc), restricted: isRestricted(art.title, slug), tag: cat.title, image: researchPoster(slug, art.title) });
    }
  }
  return [...geo, ...idx];
}

function serviceCards(): Card[] {
  return servicesOverviewPage.services.map((s) => {
    const slug = slugOf(s.href);
    const page = servicePage(slug);
    return { slug, title: s.title, summary: safeSummary(s.description), restricted: isRestricted(s.title, page?.title, slug), image: serviceImage(slug) };
  });
}

// ── 页面 ────────────────────────────────────────────────────────────────
export function contentHome() {
  return {
    site: { name: site.name, fullName: site.fullName, positioning: site.positioning },
    logo: IMAGES.logo,
    hero: { eyebrow: homePage.hero.eyebrow, title: homePage.hero.title, subtitle: homePage.hero.subtitle, image: IMAGES.homeHero },
    // 与网站首页“代表性项目”“创始人”两块同源（去掉收益、资金结构相关文字）
    featured: {
      eyebrow: 'FEATURED PROJECT · 代表性项目',
      title: '4136 Rosewood Ave',
      subtitle: 'East Hollywood, Los Angeles · ED1 经济适用房',
      image: IMAGES.featuredProject,
      role: '项目合作',
      text: '与本地有 15 年美国经验的合作开发商共同推进。'
    },
    founder: {
      eyebrow: 'FOUNDER · 创始人',
      name: 'Andy Wang',
      title: 'SAREC 创始人',
      image: IMAGES.founder,
      credentials: ['中欧国际工商学院 EMBA', '长期从事房地产项目操盘与跨境合作实践', '中美双向跨境合作经验', '在美国推动 SAREC 落地'],
      quote: '跨境房地产合作的核心，不是信息差，而是判断力、结构能力和长期信任。'
    },
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
    { t: 'img', img: IMAGES.founderSpeaking, caption: 'Andy Wang · SAREC 创始人' },
    { t: 'h', text: '我们做什么' },
    ...aboutPage.functions.flatMap((f) => [{ t: 'list' as const, title: f.title, items: f.lines }]),
    { t: 'img', img: IMAGES.featuredProject, caption: '4136 Rosewood Ave · 洛杉矶 ED1 经济适用房项目' },
    { t: 'h', text: '长期积累' },
    { t: 'p', text: aboutPage.statsIntro },
    { t: 'p', text: aboutPage.partners }
  ];
  return { title: aboutPage.title, subtitle: aboutPage.subtitle, logo: IMAGES.logo, hero: IMAGES.aboutHero, stats: aboutPage.stats, nodes };
}

export function contentServices() {
  return {
    title: servicesOverviewPage.title,
    subtitle: servicesOverviewPage.subtitle,
    hero: IMAGES.servicesHero,
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
  const hero = serviceImage(slug, 750);
  if (card.restricted) return { slug, title: card.title, summary: card.summary, hero, restricted: true, notice: RESTRICTED_NOTICE, nodes: [] as Node[] };
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
  return { slug, title: page.title, summary: safeSummary(page.subtitle) || card.summary, hero, restricted: false, nodes };
}

export function contentResearchList() {
  return { title: '研究中心', subtitle: '基于真实项目积累的政策与判断研究', hero: IMAGES.researchHero, items: researchCards() };
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
  const a0 = getArticle(slug);
  const hero = (a0 && a0.status === 'published' ? articleCover(a0, 750) : null) ?? researchPoster(slug, card.title, 750);
  const base = { slug, title: card.title, summary: card.summary, date: card.date ?? null, hero };
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
  return { ...benefitsContent, hero: IMAGES.benefitsHero };
}

export function contentContact() {
  return {
    title: '联系商会',
    logo: IMAGES.logo,
    body: aboutPage.contact.body,
    phone: site.phone,
    phoneDial: site.phone.replace(/[^\d+]/g, ''),
    email: site.email,
    address: `${aboutPage.contact.address}（${site.location}）`,
    note: '如需了解会员、活动、项目协作或研究内容，欢迎来电或发邮件，工作人员会尽快回复。'
  };
}
