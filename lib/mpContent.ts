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
import { aboutCopy, contactCopy, partnerCopy, partnerNetwork, servicesCopy } from '@/lib/sitePagesCopy';
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
const RESTRICT_RE = /(EB-?5|投资|值得投|可投|融资|收益|回报|现金流|赚钱|盈利|利润|募资|资本|资金|移民|IRR|ROE|Cap\s*Rate|LP\s*\/\s*GP|capital|eb5|irr|lp-gp|开发模式|development-model)/i;
/** 小程序里不出现的研究（标题本身就是收益指标） */
const HIDDEN_RESEARCH = new Set(['cap-rate-irr-roe']);
/** 受限文章在小程序列表里用的标题（去掉“现金流”等字样） */
const MP_TITLES: Record<string, string> = {
  'us-development-model-01-adu': '美国房地产开发模式①：一栋老旧独立屋，如何改造为 4—5 个标准化出租单元'
};
/** 没有可用配图的文章，用网站上的项目实景照片做封面 */
const MP_COVERS: Record<string, [string, string]> = {
  'us-development-model-03-ed1': ['/images/projects/3434-chesapeake-ed1.webp', '洛杉矶 ED1 项目']
};
/** 段落命中即去掉：收益数字、金额、百分比、募资 / 认购等推介字样 */
const FIGURE_RE = /(IRR|ROE|ROI|NOI|回报|收益|年化|利润|分红|赚钱|盈利|收入|现金流|溢价|估值|买入|再融资|资本化率|租金测算|cap\s*rate|募资|募集|认购|最低投资|投资额|EB-?5|\$\s?\d|\d[\d,.]*\s*(%|％|万美元|亿美元|美元|万元|亿元|万(?![人套户名次件个平])|倍|一尺|每尺|\/尺|美元\/))/i;

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

/** 过滤后没有正文的小标题不输出（连着的标题、结尾的标题） */
function dropEmptyHeadings(nodes: Node[]): Node[] {
  return nodes.filter((n, i) => {
    if (n.t !== 'h') return true;
    const next = nodes[i + 1];
    return !!next && next.t !== 'h';
  });
}

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
type Card = { slug: string; title: string; summary: string; brief?: string; restricted: boolean; tag?: string; date?: string; image?: MpImage | null };

/** 文章第一张可用配图（卡片封面） */
function articleCover(a: Article, w: 384 | 750 = 384): MpImage | null {
  for (const b of a.blocks) {
    if (b.type !== 'assetBreak') continue;
    const path = b.data.kind === 'video' ? b.data.poster : b.data.src;
    if (path && imageAllowed(b.data.alt, b.data.title, b.data.eyebrow, b.data.body)) return img(path, b.data.alt, w);
  }
  return null;
}

const firstSentence = (t: string) => (t.match(/^[^。！？]+[。！？]?/)?.[0] ?? t).trim();

function mpCover(slug: string, w: 384 | 750 = 384): MpImage | null {
  const c = MP_COVERS[slug];
  return c ? img(c[0], c[1], w) : null;
}

function researchCards(): Card[] {
  const geo = listArticles({ status: 'published' })
    .slice()
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .filter((a) => !HIDDEN_RESEARCH.has(a.slug))
    .map((a) => {
      const restricted = isRestricted(a.title, a.slug);
      return { slug: a.slug, title: MP_TITLES[a.slug] ?? a.title, summary: restricted ? '' : safeSummary(a.description), brief: firstSentence(safeSummary(a.description)), restricted, tag: '研究', date: a.publishedAt, image: articleCover(a) ?? mpCover(a.slug) };
    });
  const seen = new Set(geo.map((g) => g.slug));
  const idx: Card[] = [];
  for (const cat of indexCategories) {
    for (const art of cat.articles) {
      const slug = slugOf(art.href);
      if (seen.has(slug) || HIDDEN_RESEARCH.has(slug)) continue;
      seen.add(slug);
      const restricted = isRestricted(art.title, slug);
      idx.push({ slug, title: MP_TITLES[slug] ?? art.title, summary: restricted ? '' : safeSummary(art.desc), brief: firstSentence(safeSummary(art.desc)), restricted, tag: cat.title, image: researchPoster(slug, art.title) });
    }
  }
  return [...geo, ...idx];
}
/** 列表输出不带 brief（受限文章列表里不显示摘要） */
const listCards = () => researchCards().map(({ brief: _b, ...c }) => c);

function serviceCards(): Card[] {
  return servicesOverviewPage.services.map((s) => {
    const slug = slugOf(s.href);
    const page = servicePage(slug);
    return { slug, title: page?.title ?? s.title, summary: safeSummary(page?.subtitle ?? s.description), restricted: isRestricted(s.title, page?.title, slug), image: serviceImage(slug) };
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
    research: { title: homePage.researchTitle, items: listCards().slice(0, 3) },
    stats,
    activity: { eyebrow: homePage.activity.eyebrow, title: homePage.activity.title, lines: homePage.activity.lines },
    trust: { title: homePage.trustTitle, text: homePage.partners },
    disclaimer: '页面内容仅作信息说明与研究参考，不构成证券发行、收益承诺或投资建议。'
  };
}

/** 关于：与网站 /zh/about 同一份文案（lib/sitePagesCopy.ts） */
export function contentAbout() {
  const listOf = (xs: { title: string; body: string }[]) => xs.filter((x) => safe(x.body) && safe(x.title)).map((x) => `${x.title}：${x.body}`);
  const nodes: Node[] = [
    { t: 'h', text: aboutCopy.whoTitle },
    { t: 'list', items: listOf(aboutCopy.whoLayers) },
    { t: 'h', text: aboutCopy.proofTitle },
    { t: 'list', items: listOf(aboutCopy.proofPoints.map((p) => ({ title: p.title.join(''), body: p.body }))) },
    { t: 'img', img: IMAGES.featuredProject, caption: '4136 Rosewood Ave · 洛杉矶 ED1 经济适用房项目' },
    { t: 'h', text: aboutCopy.diffTitle },
    { t: 'list', items: listOf(aboutCopy.differentiators) },
    { t: 'quote', text: aboutCopy.manifesto, by: 'Andy Wang · SAREC 创始人' },
    { t: 'img', img: IMAGES.founderSpeaking, caption: 'Andy Wang · SAREC 创始人' },
    { t: 'h', text: '创始人' },
    // 网站原文“长期房地产投资、项目操盘与跨境合作实践者”，小程序去掉“投资”
    { t: 'p', text: 'Andy Wang，SAREC 创始人。SAREC 由长期房地产项目操盘与跨境合作实践者推动。' },
    { t: 'h', text: aboutCopy.cta.title },
    { t: 'p', text: '欢迎联系商会，我们一起判断 SAREC 是不是合适的合作方。' }
  ];
  return { title: aboutCopy.hero.title, subtitle: aboutCopy.hero.lead, logo: IMAGES.logo, hero: IMAGES.aboutHero, stats: [] as typeof aboutPage.stats, nodes };
}

/** 服务：与网站 /zh/services 同一份文案；三类客户入口 + 平台服务 + 伙伴网络，下面列出网站上的 4 个核心服务页 */
export function contentServices() {
  const nodes: Node[] = [
    { t: 'h', text: servicesCopy.entriesTitle },
    { t: 'p', text: servicesCopy.entriesLead },
    ...servicesCopy.entries.map((e) => ({ t: 'list' as const, title: e.title, items: [safe(e.description), e.points.join(' · ')].filter((x): x is string => !!x) })),
    { t: 'h', text: servicesCopy.chamber.title },
    { t: 'p', text: servicesCopy.chamber.tagline },
    ...servicesCopy.chamber.items.map((c) => ({ t: 'list' as const, title: c.title, items: [c.body.join('')].map(safe).filter((x): x is string => !!x) })),
    { t: 'h', text: partnerCopy.title },
    { t: 'p', text: partnerCopy.lead },
    { t: 'list', items: partnerNetwork.filter((p) => safe(p.body)).map((p) => `${p.title}：${p.body}`) }
  ];
  return {
    title: servicesCopy.hero.title,
    subtitle: servicesCopy.hero.sub,
    hero: IMAGES.servicesHero,
    intro: '',
    points: [] as string[],
    nodes,
    itemsTitle: '核心服务',
    items: serviceCards(),
    guide: [] as string[]
  };
}

export function contentService(slug: string) {
  const card = serviceCards().find((c) => c.slug === slug);
  const page = servicePage(slug);
  if (!card || !page) return null;
  const hero = serviceImage(slug, 750);
  if (card.restricted) return { slug, title: page.title, summary: card.summary, hero, restricted: true, notice: RESTRICTED_NOTICE, nodes: [] as Node[] };
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
  return { title: '研究中心', subtitle: '基于真实项目积累的政策与判断研究', hero: IMAGES.researchHero, items: listCards() };
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
  const hero = (a0 && a0.status === 'published' ? articleCover(a0, 750) : null) ?? mpCover(slug, 750) ?? researchPoster(slug, card.title, 750);
  const base = { slug, title: card.title, summary: card.restricted ? card.brief ?? '' : card.summary, date: card.date ?? null, hero };
  if (card.restricted) return { ...base, restricted: true, notice: RESTRICTED_NOTICE, nodes: [] as Node[] };
  const a = getArticle(slug);
  if (a && a.status === 'published') {
    // 封面已经放在页头，正文里同一张不再重复
    const nodes = dropEmptyHeadings(geoNodes(a).filter((n) => !(n.t === 'img' && hero && n.img.src === hero.src)));
    return { ...base, author: a.author?.name ?? 'SAREC Research', restricted: false, nodes };
  }
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
    return { ...base, restricted: false, nodes: dropEmptyHeadings(nodes) };
  }
  // 网站上是独立页面、没有结构化正文的研究：给简介
  return { ...base, restricted: false, nodes: [{ t: 'p', text: card.summary } as Node], more: '完整研究内容可联系商会工作人员获取。' };
}

export function contentBenefits() {
  return { ...benefitsContent, hero: IMAGES.benefitsHero };
}

/** 联系：与网站 /zh/contact 同一份文案；不含表单、入会付款入口 */
export function contentContact() {
  const nodes: Node[] = [{ t: 'h', text: '你想了解什么' }];
  for (const it of contactCopy.intents) {
    if (it.intentKey === 'membership') continue; // 入会付款流程，小程序不放
    nodes.push({ t: 'list', title: it.title, items: [...it.fit, ...it.detail].map(safe).filter((x): x is string => !!x) });
  }
  nodes.push({ t: 'h', text: '联系之后' });
  nodes.push({
    t: 'list',
    items: contactCopy.steps.map((st) => `${st.title}：${st.body.split('；').filter((x) => !/会员费|付款|支付/.test(x)).join('；')}`)
  });
  nodes.push({ t: 'h', text: partnerCopy.title }, { t: 'p', text: partnerCopy.lead });
  nodes.push({ t: 'list', items: partnerNetwork.filter((p) => safe(p.body)).map((p) => `${p.title}：${p.body}`) });
  return {
    title: contactCopy.title,
    logo: IMAGES.logo,
    body: `不论你是想了解 SAREC、看具体项目，还是参加活动——都可以从这里开始。${contactCopy.lead}`,
    phone: site.phone,
    phoneDial: site.phone.replace(/[^\d+]/g, ''),
    email: contactCopy.email,
    address: `${aboutPage.contact.address}（${site.location}）`,
    org: contactCopy.org,
    nodes,
    note: '工作人员会在 1 个工作日内回复（美国西部时间）。'
  };
}
