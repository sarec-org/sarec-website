/**
 * AI 助手 —— 第 0 级：常见问题库按意图（关键词）匹配，直接回答，不调模型。纯函数。
 */
import { eventLine, type UpcomingEvent } from './knowledge';
import { keywordScore, normalizeTight } from './text';

export type FaqLike = { id: number; intent: string; title: string; keywords: string[]; answer_zh: string; answer_en: string | null; priority: number };

/** 只对短问题用常见问题库直接回答（长问题、带具体情况的交给检索 + 模型）。 */
export const FAQ_MAX_LEN = 60;

export function matchFaq<T extends FaqLike>(text: string, faqs: T[]): { faq: T; score: number } | null {
  if (normalizeTight(text).length > FAQ_MAX_LEN) return null;
  let best: { faq: T; score: number } | null = null;
  for (const f of faqs) {
    const s = keywordScore(text, f.keywords);
    if (!s) continue;
    if (!best || s > best.score || (s === best.score && f.priority > best.faq.priority)) best = { faq: f, score: s };
  }
  return best;
}

export function nextEventText(events: UpcomingEvent[], lang: 'zh' | 'en'): string {
  const e = events[0];
  if (!e) return lang === 'en' ? 'No upcoming event has been published yet — new events are posted at /zh/events.' : '近期活动正在安排中，发布后会在 /zh/events 更新。';
  return (lang === 'en' ? 'Our next event: ' : '最近一场活动：') + eventLine(e, lang);
}

export function eventsListText(events: UpcomingEvent[], lang: 'zh' | 'en'): string {
  if (!events.length) return nextEventText(events, lang);
  return (lang === 'en' ? 'Upcoming events:\n' : '近期活动：\n') + events.slice(0, 3).map((e) => '· ' + eventLine(e, lang)).join('\n');
}

export function renderFaq(f: FaqLike, lang: 'zh' | 'en', events: UpcomingEvent[]): string {
  const tpl = lang === 'en' && f.answer_en ? f.answer_en : f.answer_zh;
  return tpl.replace(/\{next_event\}/g, nextEventText(events, lang)).replace(/\{events_list\}/g, eventsListText(events, lang)).trim();
}
