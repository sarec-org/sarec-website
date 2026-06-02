/**
 * 合规禁词表 —— 两层 · 中英双语(实施方案 G.5 / 商业模式 V2.0 §四 ⚠️)
 * ------------------------------------------------------------------
 * A. UNIVERSAL —— 全站绝对高风险词(收益/回报类绝对承诺),任何页面都不能出现。
 * B. PROJECT_OWNER —— 只对入口 2(/zh/services/project-owners 等)强制的经纪/募资类词。
 *
 * 关键:入口 1 投资人页面允许在「专业风险评估语境」使用 融资可行性 / 资金结构 /
 *       贷款条件 / 还款来源 / 退出路径 等——不得为了过入口 2 词表把入口 1 专业词改掉。
 *       因此 universal 不含这些中性专业词;它们只在 project-owner 语境才是红线。
 *
 * ⚠️ 仅查死词。组合表达 grep 检不出(中:「让您的资产更快流转」/ 英:"move your assets faster"),
 *    必须叠加战略 Claude 人工复读;终稿由 Andy + 律师终审。
 *
 * 配套脚本:scripts/check-compliance.mjs(按目标路径决定 scope:入口2 页/registry 用 project-owner,其余 universal)
 */
import type { Locale } from '@/lib/i18n/types';

export type ForbiddenScope = 'universal' | 'project-owner';

/** A 层:全站绝对禁词(收益/回报 + 客户/线索/买家 类绝对承诺) */
export const UNIVERSAL_FORBIDDEN_WORDS: Record<Locale, string[]> = {
  zh: ['保证收益', '保收益', '承诺收益', '承诺回报', '保证回报', '保证客户线索', '保证线索', '保证客户', '保证买家'],
  en: [
    'guaranteed returns',
    'guarantee returns',
    'promised returns',
    'guaranteed leads',
    'guaranteed clients',
    'guaranteed buyers',
    'guaranteed customers'
  ]
};

/** B 层:仅入口 2(项目方)强制的经纪/募资/卖房类禁词 */
export const PROJECT_OWNER_FORBIDDEN_WORDS: Record<Locale, string[]> = {
  zh: [
    '卖房',
    '帮你卖',
    '帮卖',
    '募资',
    '帮你募',
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
  en: [
    'sell your property',
    'sell properties',
    'raise capital',
    'raise funds',
    'commission split',
    'split commissions',
    'success-based compensation',
    'public offering',
    'solicit investors',
    'find investors for you',
    'we will find investors',
    'we will raise capital',
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

function matchList(text: string, lower: string, list: string[]): string[] {
  return list.filter((w) => (/[a-z]/i.test(w) ? lower.includes(w.toLowerCase()) : text.includes(w)));
}

/**
 * 找出文案中命中的禁词。
 * @param text   待检查文案
 * @param scope  'universal'(仅 A 层)| 'project-owner'(A 层 + B 层,最严)
 * @param locale 'zh' | 'en' | 'all'(默认中英都扫)
 */
export function findForbiddenWords(
  text: string,
  scope: ForbiddenScope = 'project-owner',
  locale: Locale | 'all' = 'all'
): string[] {
  const lower = text.toLowerCase();
  const langs: Locale[] = locale === 'all' ? ['zh', 'en'] : [locale];

  const hits: string[] = [];
  for (const lang of langs) {
    hits.push(...matchList(text, lower, UNIVERSAL_FORBIDDEN_WORDS[lang]));
    if (scope === 'project-owner') {
      hits.push(...matchList(text, lower, PROJECT_OWNER_FORBIDDEN_WORDS[lang]));
    }
  }
  return hits;
}

/** 是否通过(默认按最严 project-owner) */
export function isCopyClean(text: string, scope: ForbiddenScope = 'project-owner'): boolean {
  return findForbiddenWords(text, scope).length === 0;
}
