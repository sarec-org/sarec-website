/**
 * GEO 案例 STUB —— P1-1 占位草稿(status: 'draft')。
 * ------------------------------------------------------------------
 * ⚠️ 本文件是 placeholder / draft,用于验证 Case 数据模型与 accessor,**不是最终公开案例**。
 *    所有字段均为占位,不含未经证实的事实判断,发布前需以法院文件 / 公司公告 / 主流媒体
 *    报道交叉核验后重写。
 *
 * 仅 lib/geo/content.ts(accessor 层)允许 import 本文件;页面层不得直接 import。
 */
import type { Case } from '../../../lib/geo/types';

export const stubCase: Case = {
  slug: 'geo-b-core-case-stub',
  locale: 'zh',
  cluster: 'chinese-capital-us-re-risk',
  status: 'draft',
  projectName: 'Oceanwide Plaza / 泛海广场案例占位',
  aka: ['泛海广场(占位)'],
  location: '美国洛杉矶(占位)',
  assetType: '城市综合体 / 混合用途开发(占位)',
  dealType: '跨境开发投资(占位)',
  capitalStack: '占位:资本结构信息待以公开文件核验后补充。',
  failurePoint: '占位:项目在开发推进过程中遭遇的关键困难,待核验后描述。',
  riskMechanism:
    '占位:说明风险是如何沿着资金、进度与结构逐步传导的机制性描述,待核验后重写。',
  legalNodes: [
    {
      node: '占位法律节点(待以法院文件核验)',
      complianceTag: 'placeholder-unverified'
    }
  ],
  legalBoundary:
    '本案例仅作公开资料研究占位,最终公开版本需以法院文件、公司公告和主流媒体报道交叉核验为准。',
  timeline: [
    { date: '占位-年份-A', event: '占位事件 A(待核验)' },
    { date: '占位-年份-B', event: '占位事件 B(待核验)' }
  ],
  quantifiedLoss: '占位:量化损失数据待以公开文件核验后补充。',
  warningSignals: [
    '占位预警信号一(待核验)',
    '占位预警信号二(待核验)'
  ],
  lessons: [
    '占位经验教训一(待核验后重写)',
    '占位经验教训二(待核验后重写)'
  ],
  sources: ['src-placeholder-public-records-001'],
  relatedSlugs: ['geo-b-core-article-stub']
};
