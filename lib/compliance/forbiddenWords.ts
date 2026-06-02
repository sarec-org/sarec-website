/**
 * 入口 2(项目方 / project-owner)合规禁词表 —— 中英双语(实施方案 G.5 / 商业模式 V2.0 §四 ⚠️)
 * ------------------------------------------------------------------
 * 用途:写 project-owners 相关文案(中/英)后自动 grep,拦截踩证券法/经纪法红线的「死词」。
 *
 * ⚠️ 这只是第一道(查死词)。组合表达 grep 检不出(中:「让您的资产更快流转」= 变相卖房;
 *    英:"move your assets faster" 同理),必须叠加战略 Claude 人工复读;终稿由 Andy + 律师终审。
 * ⚠️ 本表只覆盖入口 2;入口 1/3 合规另见 Final Copy Deck Part 3「整站合规边界」。
 *
 * 配套脚本:scripts/check-compliance.mjs(读取本表 → 中英各扫各 → 命中即非零退出)
 */
import type { Locale } from '@/lib/i18n/types';

export const FORBIDDEN_WORDS: Record<Locale, string[]> = {
  // 中文 24 项
  zh: [
    '卖房',
    '帮你卖',
    '帮卖',
    '募资',
    '帮你募',
    '保证收益',
    '保收益',
    '保证客户线索',
    '保证线索',
    '承诺收益',
    '承诺回报',
    '分成',
    '按成交分成',
    '公开募集',
    '面向公众募集',
    '帮你找投资人',
    '融资',
    '帮你融资',
    '募集资金',
    '代募',
    '帮你找买家',
    '找买家',
    '帮你成交',
    '包成交'
  ],
  // 英文 28 项(ChatGPT + 战略 Claude 合并定版),比对时大小写不敏感
  en: [
    'sell your property',
    'sell properties',
    'raise capital',
    'raise funds',
    'guaranteed returns',
    'guarantee returns',
    'guaranteed leads',
    'guaranteed clients',
    'guaranteed buyers',
    'commission split',
    'split commissions',
    'success-based compensation',
    'public offering',
    'solicit investors',
    'find investors for you',
    'we will find investors',
    'we will raise capital',
    'promised returns',
    'fundraising',
    'capital raising',
    'capital raise',
    'sell units',
    'find buyers',
    'we will find buyers',
    'secure investors',
    'connect you with investors',
    'placement agent',
    'broker-dealer'
  ]
};

/**
 * 找出文案中命中的禁词。
 * @param text   待检查文案
 * @param locale 'zh' | 'en' | 'all'(默认中英都扫)
 * @returns 命中的禁词数组(空 = 通过第一道)
 */
export function findForbiddenWords(text: string, locale: Locale | 'all' = 'all'): string[] {
  const lower = text.toLowerCase();
  const hitZh = (locale === 'zh' || locale === 'all') ? FORBIDDEN_WORDS.zh.filter((w) => text.includes(w)) : [];
  const hitEn = (locale === 'en' || locale === 'all')
    ? FORBIDDEN_WORDS.en.filter((w) => lower.includes(w.toLowerCase()))
    : [];
  return [...hitZh, ...hitEn];
}

/** 是否通过第一道(查死词) */
export function isProjectOwnerCopyClean(text: string, locale: Locale | 'all' = 'all'): boolean {
  return findForbiddenWords(text, locale).length === 0;
}
