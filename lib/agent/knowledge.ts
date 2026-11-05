/**
 * AI 助手 —— 知识库：网站文章、研究页、服务 / 关于 / 联系 / 首页问答、会员权益、活动、常见问题。
 * ------------------------------------------------------------------
 * 进程内建索引（BM25），每次只取最相关的 3–5 段发给模型，不发全站。
 * 静态内容进程内只建一次；数据库活动与常见问题 5 分钟刷新一次。
 * 不收录：会员价格、项目 / 案例详情（避免把个人项目说成商会项目）。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listArticles } from '@/lib/geo/content';
import type { Article, Block } from '@/lib/geo/types';
import { researchPages, servicePages } from '@/lib/content';
import { indexCategories } from '@/lib/researchIndex';
import { aboutCopy, contactCopy, homeCopy, partnerNetwork, servicesCopy } from '@/lib/sitePagesCopy';
import { benefitsContent } from '@/lib/benefitsContent';
import {
  COMPLIANCE_FOOTNOTE,
  HOW_TO_CHOOSE,
  MEMBERSHIP_CARD_SLUGS,
  MEMBERSHIP_OVERVIEW_ZH,
  MEMBERSHIP_TIER_CONTENT,
  STRATEGIC_PARTNER_CONTENT,
  getTierSeed
} from '@/lib/membership/tiers';
import { listEvents as listCmsEvents, listNews } from '@/lib/cms/content';
import { Bm25, chunkText, flattenText, type Chunk, type Hit } from './bm25';
import { fmtLaTime } from './text';

export type UpcomingEvent = {
  slug: string;
  title: string;
  summary: string | null;
  startsAt: string;
  timezone: string;
  locationName: string | null;
  address: string | null;
  registrationOpen: boolean;
  status: string;
};

function pushChunks(out: Chunk[], base: Omit<Chunk, 'id' | 'text'>, text: string, idPrefix: string) {
  chunkText(text).forEach((t, i) => out.push({ ...base, id: `${idPrefix}#${i}`, text: t }));
}

function blockText(b: Block): string {
  switch (b.type) {
    case 'prose':
      return b.data.md;
    case 'keyPoints':
      return [b.data.title, ...b.data.items].filter(Boolean).join('\n');
    case 'dataTable':
      return [b.data.caption, ...b.data.rows.map((r) => `${r.label}：${r.value}`)].filter(Boolean).join('\n');
    case 'pullQuote':
      return b.data.text;
    case 'callout':
      return b.data.md;
    case 'qaUnit':
      return `${b.data.question}\n${b.data.judgment}\n${b.data.boundary ?? ''}`;
    case 'chartTable':
      return [b.data.caption, b.data.headers.join(' / '), ...b.data.rows.map((r) => r.cells.join(' / '))].filter(Boolean).join('\n');
    case 'metricCards':
      return [b.data.title, ...b.data.items.map((m) => `${m.label}：${m.value}${m.note ? '（' + m.note + '）' : ''}`)].filter(Boolean).join('\n');
    default:
      return '';
  }
}

function stripMd(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#|]/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

function articleChunks(a: Article, out: Chunk[]) {
  const url = `/zh/research/${a.slug}`;
  const head = [a.description, ...(a.summary ?? []), ...(a.tldr ?? []), a.brief?.oneLine, a.brief?.judgment].filter(Boolean).join('\n');
  pushChunks(out, { source: 'article', title: a.title, url }, head, `a:${a.slug}:head`);
  let section = a.title;
  let buf: string[] = [];
  let n = 0;
  const flush = () => {
    if (buf.length) pushChunks(out, { source: 'article', title: section, url }, stripMd(buf.join('\n')), `a:${a.slug}:${n++}`);
    buf = [];
  };
  for (const b of a.blocks) {
    if (b.type === 'sectionHeading') {
      flush();
      section = `${a.title} · ${b.data.text}`;
      continue;
    }
    const t = blockText(b);
    if (t.trim()) buf.push(t);
  }
  flush();
  (a.faq ?? []).forEach((f, i) => out.push({ id: `a:${a.slug}:faq${i}`, source: 'article', title: `${a.title} · ${f.question}`, url, text: `${f.question}\n${f.answer}` }));
}

/**
 * 旧研究页里有 7 篇是手写页面（文字直接写在 page.tsx 里，没有数据文件）。
 * 这里只读源码里的中文字符串（不执行页面代码），作为检索内容。
 */
const RESEARCH_DIR = join(process.cwd(), 'app', 'zh', '(internal)', 'research');
export function legacyResearchChunks(skip: string[], out: Chunk[]) {
  let dirs: string[] = [];
  try {
    dirs = readdirSync(RESEARCH_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('[') && skip.indexOf(d.name) < 0)
      .map((d) => d.name);
  } catch {
    return;
  }
  for (const dir of dirs) {
    let src = '';
    try {
      src = readFileSync(join(RESEARCH_DIR, dir, 'page.tsx'), 'utf8');
    } catch {
      continue;
    }
    const title = (src.match(/title:\s*'([^']+)'/)?.[1] ?? dir).replace(/｜SAREC.*$|\|\s*SAREC.*$/, '').trim();
    const texts: string[] = [];
    const re = /'((?:[^'\\\n]|\\.)*[一-鿿](?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*[一-鿿](?:[^"\\\n]|\\.)*)"|>\s*([^<>{}\n]*[一-鿿][^<>{}\n]*)\s*</g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const t = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\'/g, "'").trim();
      if (t.length >= 6 && texts.indexOf(t) < 0) texts.push(t);
    }
    pushChunks(out, { source: 'research', title, url: `/zh/research/${dir}` }, texts.join('\n'), `rl:${dir}`);
  }
}

let staticChunks: Chunk[] | null = null;

/** 静态内容分段（进程内只算一次）。导出给测试用。 */
export function buildStaticChunks(): Chunk[] {
  if (staticChunks) return staticChunks;
  const out: Chunk[] = [];
  // 1) GEO 文章（只收已发布）
  try {
    for (const a of listArticles({ status: 'published' })) articleChunks(a, out);
  } catch (e) {
    console.error('[agent] articles index failed', e instanceof Error ? e.message : 'error');
  }
  // 2) 旧研究页 + 研究中心目录
  Object.keys(researchPages).forEach((k) => {
    const p = researchPages[k];
    const url = `/zh/research/${p.slug}`;
    p.sections.forEach((s, i) => pushChunks(out, { source: 'research', title: `${p.title} · ${s.title}`, url }, flattenText(s).join('\n'), `r:${p.slug}:${i}`));
    pushChunks(out, { source: 'research', title: `${p.title} · SAREC 判断`, url }, flattenText(p.expertQuote).join('\n'), `r:${p.slug}:q`);
  });
  legacyResearchChunks(Object.keys(researchPages).map((k) => researchPages[k].slug), out);
  for (const c of indexCategories) {
    out.push({ id: `ri:${c.title}`, source: 'research', title: `研究中心 · ${c.title}`, url: '/zh/research', text: c.articles.map((a) => `${a.title}：${a.desc}（${a.href}）`).join('\n') });
  }
  // 3) 网站页面文案
  const page = (id: string, title: string, url: string, o: unknown) => pushChunks(out, { source: 'page', title, url }, flattenText(o).join('\n'), id);
  page('p:about:who', '关于 SAREC', '/zh/about', { hero: aboutCopy.hero, whoTitle: aboutCopy.whoTitle, whoLayers: aboutCopy.whoLayers, founder: aboutCopy.founder });
  page('p:about:diff', '关于 SAREC · 不一样的地方', '/zh/about', { proof: aboutCopy.proofPoints, diff: aboutCopy.differentiators, manifesto: aboutCopy.manifesto });
  page('p:services', '服务', '/zh/services', { hero: servicesCopy.hero, entries: servicesCopy.entries, chamber: servicesCopy.chamber });
  page('p:partners', '专业服务伙伴网络', '/zh/services', partnerNetwork);
  page('p:contact', '联系 SAREC', '/zh/contact', { lead: contactCopy.lead, email: contactCopy.email, intents: contactCopy.intents, steps: contactCopy.steps, org: contactCopy.org });
  homeCopy.faq.forEach((f, i) => out.push({ id: `p:homefaq:${i}`, source: 'page', title: `常见问题 · ${f.question}`, url: '/zh', text: `${f.question}\n${f.answer.join('')}` }));
  page('p:home:why', '首页 · 中美房地产合作的门槛', '/zh', homeCopy.why);
  Object.keys(servicePages).forEach((k) => {
    const s = servicePages[k] as unknown as Record<string, unknown> & { title?: string; slug: string };
    const { form: _f, related: _r, ...rest } = s;
    void _f;
    void _r;
    pushChunks(out, { source: 'page', title: `服务 · ${s.title ?? k}`, url: `/zh/services/${s.slug}` }, flattenText(rest).join('\n'), `p:svc:${k}`);
  });
  // 4) 会员权益（不含价格）
  page('m:benefits', '会员权益与场地服务', '/zh/benefits', benefitsContent);
  out.push({ id: 'm:overview', source: 'membership', title: '会员档整体定位', url: '/zh/membership', text: `${MEMBERSHIP_OVERVIEW_ZH}\n${HOW_TO_CHOOSE.memberPath}\n${HOW_TO_CHOOSE.partnerPath}\n${HOW_TO_CHOOSE.bothNote}\n${COMPLIANCE_FOOTNOTE}` });
  for (const slug of MEMBERSHIP_CARD_SLUGS) {
    const c = MEMBERSHIP_TIER_CONTENT[slug];
    const name = getTierSeed(slug)?.nameZh ?? slug;
    out.push({
      id: `m:tier:${slug}`,
      source: 'membership',
      title: `会员档位 · ${name}`,
      url: `/zh/join?tier=${slug}#apply`,
      text: `${name}：${c.positioningZh}${c.focusZh}\n本档新增权益：${c.addedBenefits.map((b) => b.text + (b.reviewGated ? '（经审核与排期后安排）' : '')).join('；')}`
    });
  }
  out.push({ id: 'm:partner', source: 'membership', title: '战略合作伙伴', url: '/zh/strategic-partners', text: `${STRATEGIC_PARTNER_CONTENT.positioningZh}\n${STRATEGIC_PARTNER_CONTENT.benefits.map((b) => b.text).join('；')}` });
  // 5) 网站活动页（CMS）与新闻
  try {
    for (const e of listCmsEvents()) {
      const text = [e.summary, e.startAt ? `时间：${e.startAt.replace('T', ' ')}（${e.timezone}）` : '', e.locationName ? `地点：${e.locationName}` : '', e.address ? `地址：${e.address}` : '', stripMd(e.body), stripMd(e.recapBody)].filter(Boolean).join('\n');
      pushChunks(out, { source: 'event', title: `活动 · ${e.title}`, url: `/zh/e/${e.slug}` }, text, `ce:${e.slug}`);
    }
    for (const n of listNews()) {
      const nn = n as unknown as { slug: string; title: string; summary?: string; body?: string };
      pushChunks(out, { source: 'news', title: `新闻 · ${nn.title}`, url: `/zh/news/${nn.slug}` }, [nn.summary, stripMd(nn.body ?? '')].filter(Boolean).join('\n'), `n:${nn.slug}`);
    }
  } catch (e) {
    console.error('[agent] cms index failed', e instanceof Error ? e.message : 'error');
  }
  staticChunks = out;
  return out;
}

export function eventLine(e: UpcomingEvent, lang: 'zh' | 'en' = 'zh'): string {
  const when = fmtLaTime(e.startsAt, lang, e.timezone || undefined);
  const where = [e.locationName, e.address].filter(Boolean).join('，');
  if (lang === 'en') return `「${e.title}」— ${when}${where ? `, ${where}` : ''}. Details: /zh/e/${e.slug}`;
  return `「${e.title}」——${when}${where ? `，${where}` : ''}。详情：/zh/e/${e.slug}`;
}

export function eventChunks(events: UpcomingEvent[]): Chunk[] {
  return events.map((e) => ({
    id: `de:${e.slug}`,
    source: 'event' as const,
    title: `近期活动 · ${e.title}`,
    url: `/zh/e/${e.slug}`,
    text: `近期活动 时间 地点：${eventLine(e)}\n${e.summary ?? ''}\n报名：${e.registrationOpen ? '开放中，可在活动页或让助手帮忙报名' : '暂未开放或已截止'}`
  }));
}

export function faqChunks(faqs: { id: number; title: string; answer_zh: string }[]): Chunk[] {
  return faqs.map((f) => ({ id: `faq:${f.id}`, source: 'faq' as const, title: `常见问题 · ${f.title}`, url: null, text: f.answer_zh.replace(/\{next_event\}|\{events_list\}/g, '') }));
}

// ── 合并索引（静态 + 活动 + 常见问题），5 分钟缓存 ─────────────────────────────

let combined: { at: number; key: string; index: Bm25 } | null = null;

export function getIndex(events: UpcomingEvent[], faqs: { id: number; title: string; answer_zh: string }[]): Bm25 {
  const key = events.map((e) => e.slug + e.startsAt).join('|') + '#' + faqs.map((f) => f.id + ':' + f.answer_zh.length).join('|');
  if (combined && combined.key === key && Date.now() - combined.at < 5 * 60_000) return combined.index;
  const index = new Bm25([...buildStaticChunks(), ...eventChunks(events), ...faqChunks(faqs)]);
  combined = { at: Date.now(), key, index };
  return index;
}

export function retrieve(index: Bm25, query: string, k = 4): Hit[] {
  return index.search(query, k);
}
