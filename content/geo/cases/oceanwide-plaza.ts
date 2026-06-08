/**
 * GEO 案例《Oceanwide Plaza / 泛海广场》—— P1-4B 入库(status: 'draft')。
 * ------------------------------------------------------------------
 * 字段值照《P1-4B-Prep Part 2 V0.3》§四;泛海保守口径:收购按"提出/拟议、待破产法院最终文件与
 * 交割确认"表述,不得写成既成事实;quantifiedLoss 为重大账面折价估算、非最终损失认定;
 * legalBoundary 强调以法院文件/公司公告/主流媒体交叉核验为准。
 *
 * ⚠️ status=draft:事实以公开来源核验为准,published 前须钉死 source URL 并经律师终审。
 *
 * 仅 lib/geo/content.ts(accessor 层)允许 import 本文件;页面层不得直接 import。
 */
import type { Case } from '../../../lib/geo/types';

export const oceanwidePlazaCase: Case = {
  slug: 'oceanwide-plaza',
  locale: 'zh',
  cluster: 'chinese-capital-us-re-risk',
  status: 'draft',
  projectName: 'Oceanwide Plaza(泛海广场)',
  aka: ['Graffiti Towers', '涂鸦大厦'],
  location: '美国加州洛杉矶市中心',
  assetType: '综合体(住宅 + 万豪酒店 + 零售 + 户外广告牌)',
  dealType: '自持开发(母公司:泛海控股 / 中泛集团)',
  capitalStack: '自有资金 + EB-5(L.A. Downtown Investment LP)+ 计划中未落地的 Senior Construction Loan',
  failurePoint: '未落实 Senior Construction Loan 即开工,资金链断裂,完工约 60% 停工',
  riskMechanism:
    '“边干边筹钱”→ Senior Construction Loan 谈不下来 → 6 家分包商 1 月内挂 6,250 万美元 Mechanic’s Lien → 触发 EB-5 违约追索 + 贷款违约 → 停工/涂鸦/破产/处置',
  legalNodes: [
    { node: 'Lendlease 非自愿 Ch.11 破产申请(2024)', complianceTag: '公开报道,待法院文件核验' },
    { node: 'EB-5 违约通知(L.A. Downtown Investment,The Real Deal 2023-06)', complianceTag: '公开报道' },
    { node: 'KPC/Lendlease 约 4.7 亿美元收购方案(待破产法院最终批准/交割)', complianceTag: '拟议/待批,以法院文件为准' }
  ],
  legalBoundary:
    '本案信息均来自公开报道(The Real Deal、LA Times、California Construction News、泛海控股公告等),以法院文件 / 公司公告 / 主流媒体交叉核验为准;交易状态以破产法院最终文件、最终批准及交割为准。',
  timeline: [
    { date: '2015 年', event: '泛海集团启动洛杉矶市中心项目并开工(总包 Lendlease,设计 CallisonRTKL),规划主塔+双塔+万豪酒店+广告牌,总建面约 200 万平方英尺' },
    { date: '2018 年', event: '资金链开始紧张,部分 EB-5 资金到位但项目进度落后' },
    { date: '2019 年', event: '资金耗尽,工程全面停工,完工度约 60%' },
    { date: '2020 年 1 月', event: '泛海以约 10.06 亿美元贱卖旧金山组合资产,损失约 19 亿元人民币' },
    { date: '2024 年', event: '外墙至少 25 层被涂鸦("Graffiti Towers");总包商 Lendlease 提交非自愿第 11 章破产申请,启动项目处置' },
    { date: '2026 年 1 月', event: '泛海控股公告未能按期偿还有息债务合计 340.26 亿元人民币(其中境内债券 47.37 亿元)' },
    { date: '2026 年 2 月', event: 'KPC Development 与 Lendlease 联合体提出约 4.7 亿美元收购方案,交易状态以破产法院最终文件、批准及交割为准(加州中区破产法院 Ch.11,案号 24-11057)' }
  ],
  quantifiedLoss:
    '按约 12 亿美元投入与约 4.7 亿美元拟议处置价格粗略比较,出现重大账面折价(约 7 亿美元级别估算);非最终法律损失认定,具体以破产法院文件、最终批准及交割为准。',
  warningSignals: [
    '未签 Senior Construction Loan 即开工',
    'EB-5 占资金主轴',
    '出现 Mechanic’s Lien',
    '母公司境内债务违约'
  ],
  lessons: [
    '动工前资金结构 100% 自洽',
    'Senior Construction Loan 为主轴、EB-5 仅作补充性资金(比例个案判断,非固定标准)',
    '进度款按节点付、防 Lien',
    '美国子公司不得依赖母公司输血'
  ],
  sources: [
    'src-court-oceanwide-bankruptcy-2024',
    'src-news-oceanwide-kpc-lendlease-2026',
    'src-trd-oceanwide-eb5-default-2023',
    'src-ccn-oceanwide-liens-2019',
    'src-china-oceanwide-disclosure-2026'
  ],
  relatedSlugs: ['chinese-capital-us-real-estate-10-traps']
};
