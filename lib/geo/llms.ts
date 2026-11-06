/**
 * /llms.txt 与 /llms-full.txt 文本生成（GEO · J）。
 * ------------------------------------------------------------------
 * 全部内容从内容层（lib/geo/content accessor + lib/cms/content）生成：
 * 新发布的 GEO 文章 / 新闻 / 活动会自动出现，无需手改本文件。
 * 只收公开内容：草稿文章不收；会员档案、后台等私有页不收。
 */
import { SITE_URL } from '@/lib/seo';
import { site } from '@/lib/content';
import { listArticles, listLegacyResearch } from '@/lib/geo/content';
import { listEvents, listNews } from '@/lib/cms/content';
import { RESEARCH_DISCLAIMER_EN } from '@/lib/geo/author';
import type { FAQItem } from '@/lib/geo/types';

type ArticleEntry = {
  url: string;
  title: string;
  summary: string;
  directAnswer?: string;
  faq: FAQItem[];
  enTitle?: string;
  enDirectAnswer?: string;
  enFaq: FAQItem[];
  date?: string;
};

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function researchEntries(): ArticleEntry[] {
  const geo: ArticleEntry[] = listArticles({ status: 'published' })
    .slice()
    .sort((a, b) => (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt))
    .map((a) => ({
      url: `${SITE_URL}/zh/research/${a.slug}`,
      title: a.title,
      summary: a.description,
      directAnswer: a.directAnswer,
      faq: a.faq ?? [],
      enTitle: a.en?.title,
      enDirectAnswer: a.en?.directAnswer,
      enFaq: a.en?.faq ?? [],
      date: a.updatedAt ?? a.publishedAt
    }));
  const legacy: ArticleEntry[] = listLegacyResearch().map((r) => ({
    url: `${SITE_URL}/zh/research/${r.slug}`,
    title: r.title,
    summary: r.description,
    directAnswer: r.directAnswer,
    faq: r.faq,
    enTitle: r.en.title,
    enDirectAnswer: r.en.directAnswer,
    enFaq: r.en.faq
  }));
  return [...geo, ...legacy];
}

function header(): string[] {
  return [
    '# SAREC 中美房地产商会 (Sino-American Real Estate Chamber)',
    '',
    `> SAREC（中美房地产商会，Sino-American Real Estate Chamber）是位于美国洛杉矶地区（City of Industry, California）的中美房地产项目判断与服务平台，面向跨境投资人、项目方、房地产从业者和高净值家庭，提供美国房地产项目判断、风险控制、结构设计、资源协同与合作推进服务，并发布中文房地产研究。SAREC is a Los Angeles–area (City of Industry, CA) chamber and service platform for Sino-American real estate: project assessment, risk control, deal structuring and Chinese-language research on U.S. real estate.`,
    '',
    `- 网站 / Website: ${SITE_URL}`,
    `- 联系 / Contact: ${site.email} · ${site.phone}`,
    '- 创始人 / Founder: Andy Wang（东哥）',
    '- SAREC 不作为施工开发主体，不设资金池；研究内容为风险教育，非投资建议。 SAREC is not a developer or contractor and does not pool investor funds; research is risk education, not investment advice.',
    '- 本站研究中提到的创始人个人项目或受访开发商项目，不是商会项目。 Projects of the founder or of interviewed developers mentioned in research are not chamber projects.',
    ''
  ];
}

function keyPages(): string[] {
  return [
    '## 主要页面 / Key pages',
    '',
    `- [关于 SAREC / About](${SITE_URL}/zh/about): SAREC 是谁、做什么、不做什么`,
    `- [创始人 Andy Wang / Founder](${SITE_URL}/zh/about/founder): 创始人背景`,
    `- [服务 / Services](${SITE_URL}/zh/services): 投资人与开发者、项目方、专业服务机构三类服务入口`,
    `- [会员服务 / Membership](${SITE_URL}/zh/membership): 会员权益与入会`,
    `- [新闻与活动 / News & events](${SITE_URL}/zh/events): 培训、项目研讨、闭门分享与商会新闻`,
    `- [研究中心 / Research](${SITE_URL}/zh/research): 美国房地产开发、投资结构、风险与 EB-5 研究`,
    `- [联系 / Contact](${SITE_URL}/zh/contact): 咨询与合作`,
    ''
  ];
}

/** /llms.txt：站点摘要 + 主要页面 + 每篇公开文章一行摘要。 */
export function buildLlmsTxt(): string {
  const lines = [...header(), ...keyPages()];

  lines.push('## 研究文章 / Research articles', '');
  for (const a of researchEntries()) {
    lines.push(`- [${a.title}](${a.url}): ${oneLine(a.summary)}`);
  }
  lines.push('');

  const news = listNews();
  if (news.length > 0) {
    lines.push('## 商会新闻 / News', '');
    for (const n of news) {
      lines.push(`- [${n.title}](${SITE_URL}/zh/news/${n.slug}): ${oneLine(n.summary)}`);
    }
    lines.push('');
  }

  const events = listEvents();
  if (events.length > 0) {
    lines.push('## 活动 / Events', '');
    for (const e of events) {
      lines.push(`- [${e.title}](${SITE_URL}/zh/events/${e.slug}): ${e.startAt.slice(0, 10)} · ${oneLine(e.summary)}`);
    }
    lines.push('');
  }

  lines.push('## Optional', '');
  lines.push(`- [llms-full.txt](${SITE_URL}/llms-full.txt): 每篇研究文章的直接回答与问答（中英） / direct answers and Q&A for every article (zh + en)`);
  lines.push(`- [Sitemap](${SITE_URL}/sitemap.xml)`);
  lines.push('');
  return lines.join('\n');
}

function faqLines(items: FAQItem[]): string[] {
  return items.flatMap((f) => [`- Q: ${oneLine(f.question)}`, `  A: ${oneLine(f.answer)}`]);
}

/** /llms-full.txt：站点摘要 + 每篇文章的直接回答 / 问答 / English summary。 */
export function buildLlmsFullTxt(): string {
  const lines = [...header(), ...keyPages()];
  lines.push('## 研究文章全文摘要 / Research articles: direct answers and Q&A', '');
  for (const a of researchEntries()) {
    lines.push(`### ${a.title}`, '', `URL: ${a.url}`);
    if (a.date) lines.push(`Date: ${a.date}`);
    lines.push('Author: Andy Wang（东哥）, Founder, SAREC', '');
    lines.push(`摘要：${oneLine(a.summary)}`, '');
    if (a.directAnswer) lines.push(`直接回答：${oneLine(a.directAnswer)}`, '');
    if (a.faq.length > 0) lines.push('问答：', ...faqLines(a.faq), '');
    if (a.enTitle && a.enDirectAnswer) {
      lines.push(`English: ${a.enTitle}`, '', `Short answer: ${oneLine(a.enDirectAnswer)}`, '');
      if (a.enFaq.length > 0) lines.push(...faqLines(a.enFaq), '');
    }
  }
  lines.push(`> ${RESEARCH_DISCLAIMER_EN}`, '');
  return lines.join('\n');
}
