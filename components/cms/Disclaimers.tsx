/**
 * CMS V2 合规免责组件 —— 文案写死,无 props,内容编辑不可关闭、不可改写。
 * ------------------------------------------------------------------
 * ⚠️ 三段文案属法律措辞,一字不动。要改必须走合规审阅,不在 CMS 后台开放。
 * ⚠️ 视觉不新造:用详情页模板 /zh/case-studies/4136-rosewood 既有的 .insightNote
 *    规格(斜体 + 金色左边线 + 淡金底),并由调用页放进该页自己的
 *    .overviewInner / .ed1Inner 内,与页面其余段落左缘对齐。
 *    早先用 research 文章页的 Disclaimer 组件会带来 48px vs 86.4px 的左缘错位(截图实测)。
 */
import styles from './detail.module.css';

const NEWS_TEXT =
  '本文为商会及会员相关信息记录，不构成投资、法律、税务建议，也不构成对相关项目或机构的推荐或背书。';

const EVENT_RECAP_TEXT =
  '本文为活动纪要，仅供信息参考，不构成投资、法律、税务建议。';

const MEMBER_TEXT =
  '本页面为商会会员业务信息展示，不构成投资邀约、收益承诺或任何证券推介；项目合作请通过商会正式流程对接（info@sinoamericanrec.org）。';

/** 单模板 —— 所有 news 详情页强制渲染。 */
export function NewsDisclaimer() {
  return <p className={styles.insightNote}>{NEWS_TEXT}</p>;
}

/** 属 events 而非 news —— eventStatus=completed 且有回顾正文时渲染。 */
export function EventRecapDisclaimer() {
  return <p className={styles.insightNote}>{EVENT_RECAP_TEXT}</p>;
}

/** 所有会员项目详情页强制渲染,内容编辑不可关闭。 */
export function MemberDisclaimer() {
  return <p className={styles.insightNote}>{MEMBER_TEXT}</p>;
}
