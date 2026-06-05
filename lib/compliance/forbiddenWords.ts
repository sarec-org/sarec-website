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

/**
 * A 层:全站绝对禁词(M4-S0 起,撮合/对接/共投/募资类组合词上提至此,全站强制)。
 * ⚠️ 只录组合词/明确短语,绝不录单字「资源/对接/介绍/撮合/匹配/共同/出资/融资/resources/connect/capital」
 *    —— 否则误伤 资源协同 / 落地协同 / 融资可行性 / 资金结构 / content resources 等正常用法。
 */
export const UNIVERSAL_FORBIDDEN_WORDS: Record<Locale, string[]> = {
  zh: [
    // 收益/回报 + 客户/线索/买家 类绝对承诺
    '保证收益', '保收益', '承诺收益', '承诺回报', '保证回报', '保证客户线索', '保证线索', '保证客户', '保证买家',
    // 募资/募集类
    '募资', '募集资金', '代募', '帮你融资',
    // 找/介绍/对接 投资人·买家
    '找投资人', '帮你找投资人', '介绍投资人', '介绍买家', '对接投资人', '投资人对接',
    '帮你介绍投资人', '帮你介绍买家', '帮你对接投资人', '帮你对接买家', '帮你对接资金',
    // 资本/资源/项目/资金 对接 + 匹配
    '资本对接', '资源对接', '项目对接', '资金对接', '买家对接', '对接买家', '对接资金', '资金与项目的匹配',
    // 撮合/牵线/搭桥
    '项目撮合', '撮合交易', '撮合投资人', '撮合买家', '撮合资金', '牵线搭桥', '帮你撮合', '帮你牵线', '帮你搭桥',
    // 共投/联合开发类
    '共投', '项目共投', '联合开发', '联合投资', '共同出资',
    // 分成/GP参与/居间/募集类组合短语(M6 品牌精修补漏;只录组合词,不录裸「分成/佣金/GP」)
    '项目分成', '收益分成', '利润分成', 'GP 参与', 'LP / GP 结构',
    '居间佣金', '成功费', '公开募集', '帮你募资'
  ],
  en: [
    // guaranteed returns / leads 类
    'guaranteed returns', 'guarantee returns', 'promised returns',
    'guaranteed leads', 'guaranteed clients', 'guaranteed buyers', 'guaranteed customers',
    // raise / fundraising
    'raise capital', 'raise funds', 'fundraising', 'capital raising', 'capital raise', 'we will raise capital',
    // find / solicit investors
    'find investors', 'find investors for you', 'we will find investors',
    'secure investors', 'solicit investors', 'investor solicitation',
    // introductions / matchmaking / sourcing / connect
    'investor introductions', 'capital introductions', 'buyer introductions', 'partner introductions',
    'source investors', 'source buyers', 'connect with investors', 'connect you with investors', 'connect with buyers',
    'matchmaking', 'deal facilitation', 'investor sourcing', 'capital sourcing',
    'introduce you to investors', 'introduce investors', 'introduce buyers',
    'match you with investors', 'match you with buyers', 'bring investors', 'bring you investors',
    'relationship introductions', 'investment introductions',
    // co-invest / joint venture
    'co-investment', 'co-invest', 'joint venture', 'co-development', 'fund participation'
  ]
};

/**
 * B 层:仅入口 2(项目方)强制的禁词(对照《入口2 合规边界文档 V1.2》段 B)。
 * ⚠️ 只录组合词,绝不录单字「资源 / 对接 / 介绍 / resources / connect」
 *    —— 否则 includes 会误伤段 A 的 content resources / 市场知识资源 / Chinese-market resources 等正常用法。
 */
export const PROJECT_OWNER_FORBIDDEN_WORDS: Record<Locale, string[]> = {
  // 撮合/对接/共投/募资类组合词已上提 UNIVERSAL(全站强制);此处仅留入口2 专属营销红线。
  zh: [
    '卖房', '帮你卖房', '帮你卖', '帮卖',
    '帮你募', '融资',
    '帮你找买家', '找买家',
    '分成', '按成交分成', '成交分成',
    '公开募集', '面向公众募集',
    '帮你成交', '包成交'
  ],
  en: [
    'sell your property', 'sell property', 'sell properties', 'sell units',
    'find buyers', 'we will find buyers',
    'commission split', 'split commissions', 'success-based compensation',
    'public offering', 'broker-dealer', 'placement agent'
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
