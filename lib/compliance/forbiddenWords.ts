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

/**
 * B 层:仅入口 2(项目方)强制的禁词(对照《入口2 合规边界文档 V1.2》段 B)。
 * ⚠️ 只录组合词,绝不录单字「资源 / 对接 / 介绍 / resources / connect」
 *    —— 否则 includes 会误伤段 A 的 content resources / 市场知识资源 / Chinese-market resources 等正常用法。
 */
export const PROJECT_OWNER_FORBIDDEN_WORDS: Record<Locale, string[]> = {
  zh: [
    // —— 段 B-1 死词 ——
    '卖房',
    '帮你卖房',
    '帮你卖',
    '帮卖',
    '募资',
    '帮你募',
    '募集资金',
    '代募',
    '融资',
    '帮你融资',
    '帮你找投资人',
    '找投资人',
    '帮你找买家',
    '找买家',
    '分成',
    '按成交分成',
    '成交分成',
    '公开募集',
    '面向公众募集',
    '帮你成交',
    '包成交',
    // —— 段 B-2 撮合性组合词(只组合词)——
    '资源对接',
    '投资人对接',
    '资金对接',
    '买家对接',
    '项目撮合',
    '撮合交易',
    '牵线搭桥',
    '介绍投资人',
    '介绍买家',
    '对接投资人',
    '对接买家',
    '对接资金',
    '帮你介绍投资人',
    '帮你介绍买家',
    '帮你对接投资人',
    '帮你对接买家',
    '帮你对接资金',
    '帮你牵线',
    '帮你搭桥',
    '帮你撮合',
    '撮合投资人',
    '撮合买家',
    '撮合资金'
  ],
  en: [
    // —— 段 B-1 死词 ——
    'sell your property',
    'sell property',
    'sell properties',
    'sell units',
    'raise capital',
    'raise funds',
    'fundraising',
    'capital raising',
    'capital raise',
    'we will raise capital',
    'find investors',
    'find investors for you',
    'we will find investors',
    'find buyers',
    'we will find buyers',
    'secure investors',
    'solicit investors',
    'investor solicitation',
    'commission split',
    'split commissions',
    'success-based compensation',
    'public offering',
    'broker-dealer',
    'placement agent',
    // —— 段 B-2 撮合性组合词(只组合词)——
    'investor introductions',
    'capital introductions',
    'buyer introductions',
    'partner introductions',
    'source investors',
    'source buyers',
    'connect with investors',
    'connect you with investors',
    'connect with buyers',
    'matchmaking',
    'deal facilitation',
    'investor sourcing',
    'capital sourcing',
    'introduce you to investors',
    'introduce investors',
    'introduce buyers',
    'match you with investors',
    'match you with buyers',
    'bring investors',
    'bring you investors',
    'relationship introductions',
    'investment introductions'
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
