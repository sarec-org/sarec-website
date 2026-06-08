/**
 * GEO 旗舰文章《中国资本在美国搞房地产开发的10大致命陷阱》—— P1-4B 入库(status: 'draft')。
 * ------------------------------------------------------------------
 * 来源:正文按《P1-4B-Prep Part 2 V0.3》§一 块映射,从封存分支 feature/flagship-10traps 的
 *       旗舰定稿(只读提取)机械誊写;A1/A2/A3/B1/张力 五处用 V0.3 改正措辞替换定稿原文;
 *       6 红线措辞照 V0.3 §三;6 个 qaUnit 照 V0.3 §二;泛海金额软化、EB-5 比例软化照 V0.3。
 *
 * ⚠️ status=draft:正文内容保真、6 红线与组合表达由人工 pre-publish 复读 + 律师终审把关。
 *    本文不构成法律/税务/证券/移民/融资/房地产经纪建议。
 *
 * 仅 lib/geo/content.ts(accessor 层)允许 import 本文件;页面层不得直接 import。
 */
import type { Article } from '../../../lib/geo/types';

export const chineseCapitalUsRealEstate10Traps: Article = {
  slug: 'chinese-capital-us-real-estate-10-traps',
  locale: 'zh',
  cluster: 'chinese-capital-us-re-risk',
  tier: 'pillar',
  status: 'draft',
  title: '中国资本在美国搞房地产开发的10大致命陷阱',
  description:
    '从泛海广场烂尾到富力张力伦敦被捕,复盘中国资本在美国房地产开发最常踩的 10 个致命陷阱与避坑路径。',
  audience: '计划进入美国房地产开发市场的中国资本、华人开发商、投资人与新移民企业主',
  intent: '进入美国市场前的项目风险识别与合规初诊',
  author: {
    name: '东哥',
    title: 'SAREC 中美房地产商会创始人'
  },
  publishedAt: '2026-05-01',
  summary: [
    '泛海广场至少踩了 10 个陷阱中的 7 个',
    '美国项目融资逻辑是先把钱安排好再动工,不是边干边筹钱',
    '加州 Entitlement 审批通常 18–36 个月,不是中国的 3–6 个月',
    'EB-5 不宜作主轴资金,主轴须为 Senior Construction Loan',
    '中国总部往往救不了美国子公司'
  ],
  blocks: [
    // ── 引言区 ─────────────────────────────────────────────
    {
      type: 'prose',
      data: {
        md: `2026 年 2 月,洛杉矶市中心三栋被涂鸦覆盖至少 25 层的高楼,迎来了它们的"葬礼定价"——根据破产法院程序,KPC Development 与 Lendlease 提出约 4.7 亿美元的收购方案,交易状态以破产法院最终文件、批准及交割为准(加州中区破产法院 Ch.11,案号 24-11057)。

出售方是已经在国内出现严重流动性危机、有息债务违约合计约 340.26 亿元人民币的中国民营房企——泛海控股。接盘方是加州医疗与地产集团 KPC Development,与澳大利亚建筑商 Lendlease 组成的联合体。`
      }
    },
    {
      type: 'prose',
      data: {
        md: `过去十年,至少有数十家中国房企和华人开发商在美国市场折戟。他们失败的不是项目,是认知。

我做中美房地产 28 年,亲眼看着一拨又一拨拿着中国剧本来美国唱戏的人,把同样的坑踩了一遍又一遍。今天,我把这些坑列出来——共 10 个——每一个都有真实案例支撑,每一个都有可执行的避坑方法。`
      }
    },
    {
      type: 'pullQuote',
      data: { text: '他们失败的不是项目,是认知。', attribution: '东哥 · SAREC' }
    },

    // ── 第一部分:泛海时间线 ─────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '第一部分:泛海广场崩盘时间线', id: 'oceanwide-timeline' }
    },
    {
      type: 'prose',
      data: {
        md: `在我们一个一个拆陷阱之前,先看一下中国房企在美国损失最大的单一项目——Oceanwide Plaza——是怎么走到今天的。`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: 'Oceanwide Plaza 崩盘时间线',
        rows: [
          { label: '2015 年', value: '泛海集团(北京)启动洛杉矶市中心项目,规划 1 栋 55 层主塔(677 英尺)+ 2 栋 40-42 层塔楼(530 英尺)+ 11 层万豪酒店 + 巨型户外电子广告牌,总建筑面积约 200 万平方英尺;工程开工,总包商 Lendlease,设计 CallisonRTKL(RTKL)' },
          { label: '2018 年', value: '资金链开始紧张,部分 EB-5 投资人资金到位但项目进度落后' },
          { label: '2019 年初', value: '原定竣工日期——项目实际未完工' },
          { label: '2019 年', value: '资金耗尽,工程全面停工,完工度约 60%' },
          { label: '2020 年 1 月', value: '泛海同步以 10.06 亿美元贱卖旧金山项目(First Street Tower + Mission Street Tower + 88 First Street 等组合资产),损失约 19 亿元人民币' },
          { label: '2024 年', value: '项目外墙至少 25 层被涂鸦艺术家涂满,被称为 "Graffiti Towers",洛杉矶市政府花约 110 万美元加装围栏、封闭周边、增派警力;总包商 Lendlease 向法院提交非自愿第 11 章破产申请,强制启动项目处置' },
          { label: '2026 年 1 月', value: '泛海控股公告:未能按期偿还有息债务合计 340.26 亿元人民币,其中境内债券 47.37 亿元' },
          { label: '2026 年 2 月', value: 'KPC Development 与 Lendlease 联合体提出约 4.7 亿美元收购方案(含约 7000 万美元现金用于支付欠税和安保等费用),交易状态以破产法院最终文件、批准及交割为准' }
        ]
      }
    },
    {
      type: 'prose',
      data: {
        md: `直接财务影响:按公开报道投入规模(约 12 亿美元)与拟议处置价格(约 4.7 亿美元)估算,项目出现重大账面折价(约 7 亿美元级别估算,非最终损失认定);具体损失、债权清偿与最终处置以破产法院文件、最终批准及交割为准。

间接影响:10 年时间机会成本 + 品牌损毁 + 母公司连锁债务危机 + 数千名 EB-5 投资人的移民身份悬而未决。这个项目失败的根本原因不是市场,也不是金融危机,更不是"美国对中国资本不友好"——`
      }
    },
    { type: 'caseRef', data: { caseSlug: 'oceanwide-plaza' } },
    {
      type: 'callout',
      data: {
        tone: 'note',
        md: `而是用中国地产剧本,演美国地产电影。

下面 10 个陷阱,泛海至少踩了 7 个。其他中国开发商,有的踩了 3 个,有的踩了 5 个,结局都是同一个。`
      }
    },

    // ── 陷阱 1 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 1:未签 Construction Loan 协议先动工——中国打法的最大死结', id: 'trap-1-construction-loan' }
    },
    {
      type: 'prose',
      data: {
        md: `中国式逻辑:在中国做开发,常见流程是土地拍下来 → 拿《国有土地使用证》→ 取得《建设用地规划许可证》→ 部分工程先开干、手续后补 → 银行贷款随后到位 → 边施工边验收。这套打法的核心是"人情+速度+关系",在中国确实可行,而且常见。

美国规则:Construction Loan(建筑贷款)是房地产开发最核心的金融工具。它和中国开发贷有一个根本不同——Construction Loan 协议未签,开发商就动工,等同于自杀。

为什么?一是银行风险逻辑:Construction Loan 基于项目"未来价值",银行需在放款前完成对方案、Permit、Title、Insurance、总包资质、Cost Breakdown 等十几项尽调,一旦动工出现机械师留置权(Mechanic's Lien,见陷阱 7)风险,银行很可能暂缓或撤回放款。二是法律约束:协议会写明"贷款生效日期"和"发放条件",协议生效前的施工绝大多数不能用贷款资金支付,垫款先施工再"报销",银行一旦发现立刻撤回承诺。三是 Title Insurance 风险:未签贷款先动工,会让 Title 公司认为存在已开工的 lien 风险,拒出贷款所需 Title Policy,整个贷款链断裂。`
      }
    },
    {
      type: 'prose',
      data: {
        md: `泛海洛杉矶项目的具体崩盘点:根据 The Real Deal 2023 年 6 月公开报道,泛海项目的 EB-5 投资人(通过有限合伙公司 L.A. Downtown Investment)向泛海发出违约通知,指控泛海"未能按贷款协议完成施工,并且未能获得 senior construction loan(优先建筑贷款)"。

翻译成大白话——泛海当初的资金结构是"自有资金 + EB-5 投资 + 计划中的 Senior Construction Loan",其中自有资金和 EB-5 先到位,Senior Construction Loan 是边干边谈的。结果谈了几年一直没拿下来,同时项目支出已超过 12 亿美元(仅完成 60%),原计划完工还需再投入 12-23 亿美元。

更糟的是——根据 California Construction News 2019 年 2 月报道,仅 2019 年 2 月之前,就已至少有 6 家分包商对项目挂了 Mechanic's Lien,总金额 6,250 万美元,其中总包商 Webcor Builders 一家就挂了 5,280 万美元。这是典型的"边干边筹钱":在美国,Mechanic's Lien 一挂,Senior Construction Loan 的最后一线希望基本断了。接下来的剧本就是必然:FBI 调查、Lendlease 停工、停摆、涂鸦、破产、处置。

启示:美国的项目融资逻辑是"先把所有钱安排好再动工",不是"动工了再筹钱"。Construction Loan 一旦发放,银行会监管 Draw Schedule(拨款时间表),项目可以独立完成。中国开发商最大的认知误区,是以为"自有资金+EB-5+边谈贷款"是灵活安排,实际上是项目还没开始就埋下了崩盘引信。`
      }
    },
    { type: 'caseRef', data: { caseSlug: 'oceanwide-plaza' } },
    {
      type: 'keyPoints',
      data: {
        title: '避坑要点',
        items: [
          'Construction Loan 协议签字+生效+首笔放款之后再动工,没有例外',
          '选择有美国 Construction Loan 经验的本地律师(不是中国律师在美国分所)审协议',
          '项目预算必须留出 15-20% 的 Contingency(应急储备金),不是 5-10%',
          'Construction Loan 的 Draw Schedule 必须和实际施工进度严格匹配,不能"超前施工"'
        ]
      }
    },

    // ── 陷阱 2 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 2:低估 Entitlement 周期——以为美国和中国一样快', id: 'trap-2-entitlement' }
    },
    {
      type: 'prose',
      data: {
        md: `中国开发商的预期:一个 4 层左右的住宅项目,在中国拿地后 3 个月办手续、3 个月开工、12 个月封顶、6 个月装修验收——两年内卖完是行业标配。美国(尤其加州)一个相同规模的项目,真实周期完全不同。`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: '加州 Entitlement 各阶段耗时',
        rows: [
          { label: 'Land Use Review / Zoning Verification', value: '1-3 个月' },
          { label: 'Conditional Use Permit / Variance(如需)', value: '6-12 个月' },
          { label: 'CEQA 环境质量审查', value: '6-24 个月' },
          { label: 'Design Review / Public Hearing', value: '3-9 个月' },
          { label: 'Building Permit / Plan Check', value: '6-18 个月' },
          { label: '各项工程 Permit(电、水、消防等)', value: '3-6 个月' },
          { label: '从拿地到合法开工总计', value: '18-36 个月' }
        ]
      }
    },
    {
      type: 'callout',
      data: {
        tone: 'note',
        md: `以上是没有重大反对意见、没有诉讼的情况。一旦遇到邻居反对、环保组织诉讼,整个周期可以延长 1-3 年。`
      }
    },
    {
      type: 'prose',
      data: {
        md: `真实案例:一个朋友的 6 年改建噩梦。我有个朋友 2019 年在洛杉矶花 70 多万美金买了一套旧 House,打算拆掉重建为 4 个独立的单户住宅(4 个 detached houses)。听起来很简单——一个地块改 4 个独立屋,卖掉获利。

但他没料到:4 个独立屋的方案需要走 Subdivision(地块划分)+ Discretionary Review(自由裁量审批)+ Public Hearing(公开听证)等多个流程,因为涉及改变土地产权结构和分户登记。结果 2025 年,6 年之后,他才把开工手续办下来。

他复盘的核心结论:如果当初选择建成 Condo(共有产权公寓)而不是 4 个独立 House,整个手续大概率 1 年内就能办完。因为 Condo 在加州属于 By-Right 开发,符合 Zoning 即可走 Ministerial Approval(行政许可),不需要 Discretionary Review 和 Public Hearing,流程标准化、时间可预期。

而手续办完后施工噩梦才开始:4 栋独立屋产权要求每栋之间必须物理分隔,最终间距只有约 20 公分,施工架根本搭不进去。最后施工队只能先把墙体在地面平放做完再整体竖起来(类似预制墙板),问题解决了,但工期延长、成本激增。如果当初选 Condo,完全不会有这个问题。`
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          '产品定位决定审批路径:同一块地,建 Condo 还是 detached houses,审批时间可能差 5-6 倍',
          'Entitlement 周期必须计入财务模型:18-36 个月的手续期是巨大的资金时间成本,按中国"6 个月办完"做模型,IRR 必然崩溃',
          '买地之前就聘请有当地实战经验的 Land Use Attorney 做 Entitlement Feasibility Study(审批可行性研究)——几千到几万美元咨询费,能避免几百万美元损失'
        ]
      }
    },

    // ── 陷阱 3 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 3:不懂城市政策差异——美国不是一个国家,是 50 个国家、3000 个城市', id: 'trap-3-local-policy' }
    },
    {
      type: 'prose',
      data: {
        md: `很多中国开发商以为"美国法律是统一的"——错。美国房地产开发高度地方化:联邦法律(FHA 等)只管反歧视和大方向,真正决定一个项目能不能做、怎么做、多大规模的,是州法 + 县法 + 市法 + 学区/特殊区规定。南加州一个 City 的容积率、停车位要求、邻居签字要求,可能跟隔壁 City 完全不一样。

例 1:加州 ADU 政策——州法 vs 城市规定。加州州法目前规定绝大多数住宅地块上可建造最大 1200 平方英尺(约 111 平方米)的独立 ADU(附属独立居住单元),前提是符合至少 4 英尺的侧/后退线。但具体城市可在州法基础上加更严限制:圣地亚哥县允许 1200 平方英尺,洛杉矶县(非市辖区)可能限制在 800 平方英尺,某些小城市限制在 1000 平方英尺——同一个州,ADU 最大允许面积可以差 50%。不研究目标 City 的具体规定就贸然下手,可能出现"以为可以建 1200 尺、实际只批 800 尺"的尴尬。

例 2:洛杉矶市 ED1 政策——加州独此一家的开发红利。2022 年 12 月,时任市长 Karen Bass 签署 Executive Directive 1(ED1,第一号行政命令),针对 100% Affordable Housing(全保障性住房)项目,是目前美国大城市中最激进的住房加速政策。`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: '洛杉矶 ED1 政策(100% 保障性住房)核心激励',
        rows: [
          { label: '审批速度', value: '政策目标 60 天内完成 Pre-construction Review;实际平均 4-6 个月走完 Entitlement、被批准项目平均处理约 22 天(来源:Los Angeles Times / The Real Deal 2025-12,截至 2025 年 11 月共 490 个 ED1 项目走完流程、437 个获批);普通多家庭项目对比 12-18 个月、复杂项目 2-3 年' },
          { label: '环评豁免', value: '政策:100% Affordable 项目豁免 CEQA 自由裁量审查;实际落地但近期出现政策回调争议;普通项目需做 EIR / CEQA Review' },
          { label: '密度奖励', value: '政策:可叠加 State Density Bonus Law,密度大幅突破基础 Zoning;实际激励数量上限被 2023-2024 修订收紧(最多 5 项 incentives + 1 项 waiver);普通项目严格按 Zoning' },
          { label: '停车位要求', value: '政策:大幅降低,最低可至 0 个;实际多数项目零停车位;普通项目按 Zoning 配建(通常 1-2 个/单元)' },
          { label: '听证程序', value: '政策:豁免 Discretionary Review 和邻居听证;实际落地但 Single-family Zones 已被 2023 修订排除;普通项目多数需要听证' }
        ]
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: 'ED1 核心边界(必须严格满足)',
        items: [
          '必须 100% Affordable——单元租金不超过 AMI 的 80%,或混合模式(最多 20% 单元达 120% AMI,其余 ≤80% AMI)',
          '项目至少 5 个单元',
          '仅适用于洛杉矶市辖区内——不适用洛杉矶县其他独立城市(如比佛利山、圣莫尼卡)',
          '2024 年修订中单户住宅区(Single-family Zones)已被排除在 ED1 通道之外',
          '不能拆 LARSO 保护的租金管制楼(12 单元以上的 LARSO 楼已被排除)',
          'ADU 在 ED1 项目内须做产权约束(deed-restricted affordable)',
          '2025 年 12 月,洛杉矶市议会一致通过将 ED1 永久化(Affordable Housing Streamlining Ordinance)'
        ]
      }
    },
    {
      type: 'callout',
      data: {
        tone: 'note',
        md: `ED1 政策自 2022 年 12 月推出以来已修订 3-4 次(2023 年加入 Single-family Zones 排除条款、2024 年加入 LARSO 保护条款、2025 年永久化)。这意味着今天合规的项目,明天政策一变可能就需要重新评估。中国开发商如果按"政策稳定不变"做财务模型,会踩坑。`
      }
    },

    // ── 陷阱 4 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 4:错误的产品定位——同一块地,选错了产品就输了', id: 'trap-4-product-positioning' }
    },
    {
      type: 'prose',
      data: {
        md: `中国开发商习惯了一套思路:拿地之后看市场、看竞品、看利润率,决定建什么——这是市场决策。但在美国,产品定位首先是审批路径决策,其次才是市场决策。选错产品类型,不是少赚一点,而是审批多花 5 年、施工多花 30%、最后可能根本卖不出去。

真实案例:接续陷阱 2 那位朋友。他 2019 年花 70 多万买的旧 House 地块本身没问题,决策是"拆掉建 4 个独立 House"。逻辑看上去很顺:4 个独立屋 = 4 个独立产权 = 4 户买家 = 总价更高 = 利润更大——这是中国开发商的本能算法。但他忽略了 4 件事。`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: '4 个独立屋 vs 1 栋 Condo(审批路径对比)',
        rows: [
          { label: '是否需要 Subdivision(地块划分)', value: '4 独立屋:需要 / Condo:不需要(产权通过 CC&R + HOA 分)' },
          { label: '是否需要 Public Hearing', value: '4 独立屋:通常需要 / Condo:通常不需要' },
          { label: '是否需要 Discretionary Review', value: '4 独立屋:是 / Condo:多数情况下 Ministerial Approval' },
          { label: '邻居能否反对', value: '4 独立屋:可以,且常推迟 1-2 年 / Condo:邻居基本无权干涉' },
          { label: '预期审批周期', value: '4 独立屋:3-6 年(含听证、可能诉讼)/ Condo:9-15 个月' }
        ]
      }
    },
    {
      type: 'prose',
      data: {
        md: `他选了 4 个独立屋,结果手续办了 6 年(2019→2025);如果当初选 Condo,1 年到 1 年半就能开工。

二、施工成本完全不同:4 栋楼之间最终只有 20 公分(约 8 英寸),施工架根本搭不进去,常规外墙施工、保温、防水、外饰面工艺全部失效。最后只能先把整面外墙在地上平放做完、再用吊车整面竖起来(类似预制墙板),施工成本暴涨:多一道墙体整体起吊工序(吊车+起重资质+保险)、工期延长、起吊保险单独算、部分施工许可需重走。保守估算,这部分额外成本至少占总建造预算的 8-15%。

三、销售周期完全不同:独立屋单价高但目标买家更窄(要全款或自住贷款)、需逐栋销售;Condo 可预售、可面向投资客(贷款更容易),销售周期通常缩短 30-50%。

四、未来翻修/出售的灵活性完全不同:4 个独立屋每栋命运独立,不能合并、不能整体出售给基金;Condo 可整栋作为 Multifamily 卖给 REIT 或基金,可做 1031 Exchange(见陷阱 9)。`
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          '拿地之前,先问"用什么产品类型审批最顺、施工最易、退出最灵活"',
          '在加州,Condo 在大多数情况下比 detached houses 审批快 3-5 倍',
          '聘请 Land Use Attorney + 有经验的 Architect 做 Product Feasibility Study,花 1-2 万美金省下 2-3 年时间和数十万美金额外成本',
          '不要被"独立屋单价高"的本能算法迷惑——美国房地产的利润往往不在销售单价,而在审批路径、资金周转、退出灵活性'
        ]
      }
    },

    // ── 陷阱 5 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 5:成本误判——以为中国制造能碾压美国,结果死在关税上', id: 'trap-5-tariffs' }
    },
    {
      type: 'prose',
      data: {
        md: `很多中国开发商进入美国后第一反应是"美国建材这么贵,我从中国进能赚翻"。举个真实对比:某款标准复合木地板,美国本土零售价约 7 美元/平方英尺,中国工厂出厂价约 2 元人民币/平方英尺(折合约 0.30 美元/平方英尺),差价 20 多倍。看到这个数字几乎每个中国开发商都会兴奋——但这是典型的"看表不看里",实际算账必须加上 6 道成本。`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: '中国建材到美国全成本拆解(按 0.30 美元/sqft 出厂价 + 当前关税环境估算)',
        rows: [
          { label: '出厂价', value: '约 0.30 美元' },
          { label: '内陆运输(工厂→中国港口)', value: '约 0.05 美元' },
          { label: '装柜 + 港口费 + 报关', value: '约 0.10 美元' },
          { label: '海运 + 保险', value: '约 0.15-0.25 美元(看船期和港口)' },
          { label: '美国港口卸货 + 仓储 + 内陆运到仓库', value: '约 0.15-0.20 美元' },
          { label: '美国进口关税(核心成本)', value: '见下文——多重叠加关税是真正的杀手' },
          { label: '美国仓储 + 销售管理费', value: '约 0.20-0.30 美元' }
        ]
      }
    },
    {
      type: 'prose',
      data: {
        md: `关税才是真正的杀手。以中国产复合木地板和瓷砖类建材为例,目前进入美国通常需承担多重叠加关税:一是基础进口关税(MFN,最惠国关税)通常 3-8%;二是反倾销税(Anti-dumping Duty, AD),中国木制品、橱柜、瓷砖等品类税率最高可达 200%+;三是反补贴税(Countervailing Duty, CVD)通常额外加 30-100%+;四是 232/301 特别关税,按品类 7.5%-25%+;五是 2025-2026 年加征的"中国对等关税",按品类再叠加。

综合下来,部分品类中国建材到美国的实际综合关税可达 100%-380%+。这意味着 0.30 美元/sqft 的中国地板,进到美国仓库的"全成本价"可能高达 4-7 美元/sqft,和美国本土批发价基本持平甚至更贵。"中国制造碾压全世界"的幻觉,在美国房地产建材领域已经基本破产。

转口逃税:一条看起来很美的死路。很多中国老板想出"绕道东南亚"的招数——把中国货发到马来西亚、越南、印尼,换包装、改产地标签,再发美国享受东南亚低关税。这在美国法律上叫 Transshipment(转运/转口)规避关税,是明确的联邦犯罪。`
      }
    },
    {
      type: 'prose',
      data: {
        md: `真实案例:旧金山 Uni-Tile & Marble 案。2025 年 12 月,美国司法部北加州联邦地区检察官办公室对三名旧金山湾区华人商人和三家公司提起联邦起诉。截至本文发稿,此案仍处于司法程序中,起诉书所列指控尚未经法庭审判最终认定,所有被告依法享有无罪推定。以下仅为对公开起诉文书的转述:被起诉人 Henry Pan(潘新棉)、Nolan Xie(谢华良)、Johnson Wang(王金华);被起诉公司 Uni-Tile & Marble Inc.、Uni-Stone & Cabinet Inc.、深圳 Top & Profit International Forwarding Co. Ltd。指控罪名包括共谋、共谋电信欺诈、电信欺诈、走私、向海关作虚假陈述、国际洗钱。

指控的具体手法是:将中国生产的石英台面、木橱柜、瓷砖(恰好都是被加征反倾销税 + 反补贴税的品类)发到马来西亚,再从马来西亚港口出口到奥克兰港,向美国海关(CBP)谎报"原产地:马来西亚"。每项罪名最高刑期可达 20 年监禁,具体判决以法庭裁定为准。`
      }
    },
    {
      type: 'callout',
      data: {
        tone: 'legal',
        md: `2025 年 12 月美国司法部对相关个人及公司提起联邦起诉;截至本文发稿尚未审判,仍在司法程序中,适用无罪推定,具体以法庭裁定为准。(依据:DOJ NDCA 公开起诉文书)`
      }
    },
    {
      type: 'callout',
      data: {
        tone: 'legal',
        md: `合法路径是 Substantial Transformation(实质性改造)。美国海关(CBP)以 Substantial Transformation 判定原产地——看加工是否使产品在名称、特性或用途上发生实质改变,由 CBP 个案判定,没有固定的百分比门槛。真实供应链转移需当地有真实的原材料采购、主要制造工艺与工厂/工人/生产记录;换标签或简单组装不构成实质性改造。原产地认定是高度专业的法律问题,任何涉及东南亚供应链的安排必须由有经验的海关律师或持牌报关行(customs broker)逐案评估。(依据:CBP Rules of Origin / CROSS ruling)`
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          '进入美国市场,财务模型必须用"全成本到美国仓库的真实价格"算账,不要用中国出厂价幻想',
          '关税不是可以"绕"的,是必须接受的成本——能在这个成本下还有利润的项目,才是真正的好项目',
          '真要用东南亚供应链,必须做合法的供应链转移——这不是几个月的事,是 2-3 年的产业搬迁',
          '管理能力 + 设计创新 + 工艺优化,才是降低成本的合法路径;按美国规则算账还能赚钱的项目,才是好项目'
        ]
      }
    },

    // ── 陷阱 6 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 6:误把 EB-5 当稳定资金来源', id: 'trap-6-eb5' }
    },
    {
      type: 'prose',
      data: {
        md: `EB-5 投资移民项目听起来像开发商的天堂。基本流程是:投资者投入规定金额(目标就业区 TEA 项目约 80 万美元、普通项目约 105 万美元)+ 项目创造至少 10 个全职就业岗位 → 提交 Form I-526E 移民申请(Immigrant Petition by Regional Center Investor,这是一份申请,不是绿卡本身)→ 获批后再经移民签证程序或境内身份调整(I-485)取得 2 年期的有条件永久居留(条件绿卡)→ 2 年期满前提交 I-829 申请解除条件 → 获得正式(无条件)绿卡;时间不固定,受排期与项目进度影响。

从开发商角度看 EB-5 资金似乎很美:资金成本低(年化 0.5%-2%)、不需要还本(5-7 年项目结束归还本金)、不需要个人担保、来源稳定。很多中国开发商把 EB-5 当作"低成本+稳定+无担保"的核心资金来源——这是巨大的认知错误。

EB-5 的真实风险结构:它看起来稳定,实际是整个房地产资金链中最不稳定的部分。风险 1——EB-5 投资人的核心目标不是收益,是绿卡:一旦项目延误、岗位不达标、I-526E 被 USCIS 拒绝,投资人会立刻发起集体诉讼要求退还本金,他们不在乎项目能不能继续,在乎自己的绿卡。风险 2——退出有"硬期限":普通银行贷款可谈延期重组,EB-5 不行,投资人 5 年到期等绿卡,时间窗口固定,项目延期就要求退本金,往往是引发挤兑、崩盘的导火索。`
      }
    },
    {
      type: 'prose',
      data: {
        md: `风险 3——项目失败 → 集体诉讼 → 母公司连锁。泛海洛杉矶项目就是教科书级案例:根据 The Real Deal 2023 年 6 月报道,EB-5 投资人通过 L.A. Downtown Investment 有限合伙公司对泛海发出违约通知,指控泛海未能按贷款协议完成施工、未能获得 Senior Construction Loan、项目被挂多项 Mechanic's Lien(违反贷款协议)、未维持全险保险,并拖欠至少 1,180 万美元利息 + 5,600 万美元本金。

EB-5 投资人不只是债权人,他们同时是面临移民身份风险的家庭。项目崩盘时他们所有渠道同时启动:联邦法院民事诉讼 + USCIS 投诉 + 媒体曝光 + 政治施压。对开发商而言这是最难处理的危机——因为对手不是商业谈判对手,是在为家庭的未来而战。`
      }
    },
    { type: 'caseRef', data: { caseSlug: 'oceanwide-plaza' } },
    {
      type: 'callout',
      data: {
        tone: 'legal',
        md: `Form I-526E 是区域中心投资人提交的移民申请(Immigrant Petition)。获批后,投资人还需要通过移民签证程序或身份调整程序取得有条件永久居留;之后再通过 I-829 申请解除条件。(依据:USCIS I-526E 说明)`
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          'EB-5 仅作补充性资金、不作主轴(比例个案判断,非固定标准),主轴须为 Senior Construction Loan',
          '必须有 Senior Construction Loan 作为主轴融资——这是 EB-5 不能替代的',
          'EB-5 项目必须聘请有 USCIS 经验的移民律师 + 证券律师双重把关,尤其是 PPM(私募备忘录)和 Subscription Agreement',
          '项目进度必须严格按 Job Creation Schedule 跑——这直接关系到 EB-5 投资人的 I-526E 批准率',
          '不要把 EB-5 投资人当成"沉默的钱"——他们是最积极的债权人'
        ]
      }
    },

    // ── 陷阱 7 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: "陷阱 7:忽视 Mechanic's Lien 的杀伤力", id: 'trap-7-mechanics-lien' }
    },
    {
      type: 'prose',
      data: {
        md: `Mechanic's Lien(机械师留置权,又译工程留置权)是美国房地产领域最强的债权人保护工具之一,但在中国房地产行业完全没有对应概念。简单说:任何为项目提供过劳务或材料的人(总包、分包、供应商、甚至个体工人),如果开发商拖欠工程款,可以单方面在县记录处(County Recorder's Office)提交一份 Mechanic's Lien,这个 Lien 立刻成为项目的法定债务,附着在土地和建筑物上;直到 Lien 被清偿,项目不能转让、不能再融资、不能交付。

致命之处有四:一、单方申请、门槛极低——不需法院裁定、不需开发商同意,分包商觉得你欠钱就能挂,反诉"虚假 Lien"需数月到数年,期间 Lien 一直挂着。二、Title Insurance 必查 Lien——任何交易、再融资、Permit 申请,Title 公司都必须检查是否有 Lien,一旦有,所有交易冻结。三、一个 Lien 引发连锁——第一个分包商挂 Lien 后,其他分包商立刻跟进,这就是泛海洛杉矶项目 6 家分包商 1 个月内挂 6,250 万美元 Lien 的原因,这是雪崩。四、Lien 会触发贷款协议违约——绝大多数 Construction Loan 协议明确"项目出现 Mechanic's Lien 即构成违约事件",泛海 EB-5 违约通知中专门提到"允许 Mechanic's Lien 被挂在项目上,违反了贷款协议"。

中国开发商的本能是"工程款先拖一拖,回头一起结",在中国分包商不敢撕破脸,在美国分包商第二天就来挂 Lien。`
      }
    },
    { type: 'caseRef', data: { caseSlug: 'oceanwide-plaza' } },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          '进度款必须按合同节点准时支付——逾期 30 天就是 Lien 红线',
          '要求所有分包商签 Lien Waiver(Conditional 与 Unconditional Lien Release),每次付款时收一份',
          '设立 Construction Disbursement Account 由第三方(Title Company 或 Disbursement Agent)管理,确保工程款专款专用',
          'Lien 一旦出现立刻处理(支付、Lien Bond、或起诉移除),拖延就是死亡'
        ]
      }
    },

    // ── 陷阱 8 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 8:走捷径行贿——五眼联盟的代价', id: 'trap-8-fcpa-bribery' }
    },
    {
      type: 'prose',
      data: {
        md: `中国房地产行业的运作中,"打点关系"是一种常见甚至必要的能力:给政府官员送礼、安排吃饭、提供方便。很多中国开发商进入美国后本能地试图用同样方式打开局面——加快审批、争取容积率、协调反对意见。这是最致命的赌博:在美国,这叫 Bribery of a Public Official(贿赂公职人员),是联邦重罪。

真实案例:富力地产张力案。张力是广州富力地产联合创始人、联席董事长,曾任广州市政府官员,1993 年下海,1994 年与香港富商李思廉创办富力地产。以下事件均为公开报道事实(来源包括彭博社、南华早报、SF Standard、Mingtiandi、SCMP 及美国司法部公开文书)。`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: '富力张力案时间线',
        rows: [
          { label: '2014-2015 年', value: '张力个人控股的加州公司 Z&L Properties Inc.(与上市公司富力地产无股权关系)启动旧金山 555 Fulton Street 住宅+商业综合开发项目' },
          { label: '2018 年', value: '旧金山公共工程局局长 Mohammed Nuru 应邀访问中国,张力为其支付五星级酒店住宿,在私宅接待时赠送约 2,070 美元的酒及一些可疑钻石原石;Nuru 未按美国法律要求申报这些礼物' },
          { label: '2020 年 1 月', value: 'FBI 对 Mohammed Nuru 启动调查并逮捕 Nuru' },
          { label: '2021 年 12 月', value: '美国司法部公开对张力提起刑事指控(行贿者在文书中标识为 "Developer 1",后经多方媒体报道确认为张力)' },
          { label: '2022 年 11 月 30 日', value: '张力在英国伦敦希思罗机场被英国警方逮捕(当时从新加坡乘飞机抵达);被捕原因是美国对张力提起刑事指控后向英国提出引渡请求,依据美英引渡条约(bilateral extradition,双边引渡),不是 Interpol 国际通缉' },
          { label: '2022 年 12 月 12 日', value: '张力以 1,500 万英镑保释金获保释(约合 1840 万美元,是英国法院历史上最高保释金之一)' },
          { label: '保释期间', value: '张力被监视居住于伦敦塔桥附近一处与富力地产关联的公寓 43 层,由前军事人员每 12 小时轮班看守,禁用任何上网设备' },
          { label: '2023 年 6 月', value: '张力同意接受引渡(撤回此前抗辩)' },
          { label: '2023 年 7 月', value: '张力被引渡至美国旧金山;随后与美国检察官达成 DPA(Deferred Prosecution Agreement,延期起诉协议)——3 年后撤销针对本人的指控(须履行所有协议条件),返回中国' },
          { label: '2023 年 8 月', value: 'Mohammed Nuru 因 honest services wire fraud(诚信服务电信欺诈)被判 7 年监禁' },
          { label: '2023 年 10 月', value: '张力旗下 Z&L Properties Inc. 公司认罪(共谋欺诈),被罚款 100 万美元,并须建立企业合规计划' }
        ]
      }
    },
    {
      type: 'callout',
      data: {
        tone: 'legal',
        md: `很多人误以为张力被"国际通缉"——这是不准确的。准确情况是:美国对张力提起刑事指控(criminal charges)后向英国提出引渡请求,英国警方依据美英引渡条约(bilateral extradition,双边引渡)将其逮捕,不是 Interpol 国际通缉。(依据:DOJ NDCA 公开新闻稿 2023;DOJ 记录为 complaint/Information/DPA)`
      }
    },
    {
      type: 'prose',
      data: {
        md: `这个案例的核心教训有四。教训 1:美国司法的"长臂管辖"远超想象——行贿行为发生在中国,但因对方是美国公职人员、动机是为美国项目利益,美国仍有管辖权。教训 2:美国通过引渡条约的全球追索能力——美国对张力提起刑事指控后向英国提出引渡请求,张力 2022 年 11 月从新加坡飞抵伦敦时被英国警方依据美英引渡条约逮捕,这是双边引渡的执行,不是 Interpol 国际通缉,但效果一样。美国与全球 100+ 个国家有引渡条约,包括五眼联盟(英、加、澳、新)、欧盟主要国家、日韩菲、墨西哥巴西阿根廷等。张力的最大失误是以为"不进入美国"就安全,事实上任何与美国有引渡条约的国家都是风险区。

教训 3:行贿金额低不等于事情小——张力涉案直接行贿金额(含酒、礼物估值约 2,000+ 美元加酒店住宿等)初步估算不超过几万美元,但后果是被美国提起刑事指控、伦敦机场被捕、1,500 万英镑保释、伦敦监视居住 7 个月、引渡羁押、Z&L 被罚 100 万美元、数百万美元法律费用、富力地产股价当日深跌 14%、个人声誉永久受损。美国 FCPA 和相关反贿赂法律对金额不敏感、对行为本身极敏感。教训 4:DPA 也不是"赢"——DPA 条件包括承认相关行为(不是无罪释放)、3 年观察期、配合调查、未来 3 年内违反任何美国法律则 DPA 自动失效原起诉恢复、公司缴 100 万美元罚款、建立合规计划;而被贿赂官员 Nuru 被判 7 年监禁,两边代价都不轻。`
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          '进入美国市场前必须接受美国合规培训(FCPA Compliance)——这是所有跨国公司的标配',
          '任何形式的"礼物/招待/费用支付/咨询费"给到美国公职人员或其家属,都可能构成行贿,金额无关大小',
          '不要相信"在中国做的事情美国管不到"——美国的长臂管辖真实存在',
          '不要相信"不进入美国就没事"——美国与全球 100+ 国家有引渡条约,五眼联盟是最紧密的一层',
          '如果项目审批遇到困难,正确路径是聘请有政府关系的律师事务所和合规游说(Lobbyist),这是合法的且通常更有效'
        ]
      }
    },

    // ── 陷阱 9 ─────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 9:逃税而不是合理避税——错过 1031 Exchange 的几百万', id: 'trap-9-1031' }
    },
    {
      type: 'prose',
      data: {
        md: `中国开发商常见两个极端:极端一,完全不研究美国税法,项目卖出后被税"扒一层皮",实际净利润比预期少 30-40%;极端二,研究了税法但走偏,想通过虚增建安成本、虚列人工、阴阳合同等手段"逃税",被 IRS 抓到,巨额罚款 + 刑事责任。真正聪明的是中间路径——合理避税(Tax Planning),而不是逃税(Tax Evasion)。

1031 Exchange 是美国房地产投资重要的合法递延税工具。Internal Revenue Code Section 1031 允许为生产经营或投资目的而持有(held for productive use in a trade or business or for investment)的房地产,在出售后将收益再投入同类(like-kind)房地产,递延(defer)资本利得税。`
      }
    },
    {
      type: 'callout',
      data: {
        tone: 'legal',
        md: `1031 必须是投资性房地产——不含自住房、库存商品房(dealer property / inventory)。根据税法第 1031(a)(2) 条,"为在正常经营过程中向客户转售而主要持有的财产(property held primarily for sale)"属于存货,不适用 1031。一个盖了房子就卖的开发商(spec homes、分割地块出售),其待售房产很可能被 IRS 认定为 dealer property / inventory,不能做 1031,且出售利得按普通所得税率(ordinary income)征税;长期持有用于出租或投资的房产才更可能符合 held for investment。"是 dealer 还是 investor"由 IRS 根据持有意图、时长、开发与营销行为等事实逐案判定,没有一刀切的公式。(依据:IRS Like-kind exchanges 税务指引)`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: '情景 A(不用 1031)vs 情景 B(用 1031,符合条件时)——以长期持有的出租型投资物业为例(原始成本基础 500 万、出售价 1,200 万、资本利得约 700 万)',
        rows: [
          { label: '情景 A:不做 1031(直接缴税)', value: '联邦长期资本利得税约 20% + 加州州税最高约 13.3% + Net Investment Income Tax 约 3.8% + 此前折旧的 Depreciation Recapture(折旧追回,税率最高 25%);综合税负可能达数十万至上百万美元量级,具体取决于折旧、持有结构、州税等' },
          { label: '情景 B:做 1031 Exchange(符合条件时)', value: '出售后 45 天内书面识别替代物业(有数量/价值限制)+ 180 天内完成置换交割 + 必须通过 Qualified Intermediary(合格中介)处理资金;满足全部条件时资本利得税可递延,资金可更完整投入下一个项目' }
        ]
      }
    },
    {
      type: 'prose',
      data: {
        md: `注意:1031 是"递延(defer)",不是"免除(eliminate)",递延的税在未来处置时仍可能产生,除非通过后续规划处理。

关于"递延 + Step-up in Basis"的长期规划:一种长期策略是通过连续合规的 1031 置换持续递延、持有至身故,由继承人通过 Step-up in Basis(继承时计税基础重置)调整资产计税基础,从而在特定条件下降低或消除部分未实现资本利得的所得税影响。但必须强调:这不等于"完全免税"——Step-up 只针对所得税层面的未实现增值,还需综合考虑联邦遗产税、赠与税、投资人税务居民身份、州税规则及未来税法变化;对非美国税务居民、跨境持有结构情况更复杂;这是一套需要跨境 CPA + 税务律师 + 遗产规划律师共同设计的方案。

逃税的低级错误(不要犯):虚增建安成本(美国施工方都开 W-9 + 1099,IRS 交叉比对极易发现)、虚列人工成本(IRS + 劳工部 + 移民局多重交叉验证)、阴阳合同(Title Company 和 Escrow 须 1099-S 报送)、现金交易绕开申报(FinCEN 对房地产现金交易有 GTO 地理目标令专项监控)、离岸壳公司藏收入(CRS + FATCA 使这类操作风险极高)。`
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          '进入美国市场前聘请一位有跨境经验的 CPA——专业税务规划带来的合法节税往往远超其费用',
          '1031 是合法递延工具,但要先搞清楚自己的房产是"投资性"还是"经销存货"——开发即售的项目很可能不符合 1031 资格',
          '房产持有结构(个人 / LLC / C-Corp / Trust)必须在买地前就和专业人士设计好,不同结构税务待遇差别巨大,且影响 1031 与遗产规划',
          '永远不要为了省税违法——美国 IRS 的稽查工具和数据库远超想象'
        ]
      }
    },

    // ── 陷阱 10 ────────────────────────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '陷阱 10:以为中国总部能救美国子公司——母子公司隔离的残酷现实', id: 'trap-10-corporate-veil' }
    },
    {
      type: 'prose',
      data: {
        md: `中国开发商进入美国时最常说的一句话是:"放心,钱不够中国总部还能调过来。"这句话在中国房地产行业语境里是真的——母公司是子公司的"无限信用背书"。但在美国,这句话至少有 3 重错误。

错误 1:中国资本管制让钱出不来。中国国家外汇管理局对资本项下外汇出境有严格管制:个人每年合法换汇额度 5 万美元;企业境外投资必须通过 ODI 审批(发改委 + 商务部 + 外管局三道关);房地产类境外投资自 2017 年起被国务院列入"限制类",审批极严;紧急驰援境外子公司几乎没有合法快速通道。真实场景:泛海控股境内有 340 亿元人民币的债务正在违约,即使想救洛杉矶项目,也无法把钱合法调出去。

错误 2:美国法律对母子公司的"独立性"要求极严。中国习惯中母子公司资金、人员、决策"一锅炖"("集团一盘棋");在美国,这种做法等于主动放弃母子公司之间的法律隔离(Piercing the Corporate Veil 的反向操作)。这意味着如果母公司确实可以无限输血,那么子公司的债务也可以追溯到母公司。中国开发商往往两边都想要:母公司可以救子公司、子公司出问题母公司不担责——美国法律不允许两边都拿,你必须选一边。

错误 3:母公司本身正在出问题。中国房地产行业自 2021 年起进入深度调整周期,绝大多数曾经的"千亿级"开发商都已或正在陷入流动性危机:恒大境内境外全面违约,碧桂园、融创、富力海外债重组,泛海境内 340 亿违约 + 美国资产处置,大部分二三线房企保交楼困难、停工。当中国总部自身难保时,美国子公司就是孤儿。`
      }
    },
    {
      type: 'dataTable',
      data: {
        caption: "泛海控股“国内 + 美国”双重崩盘",
        rows: [
          { label: '国内境内债券违约', value: '47.37 亿元人民币(截至 2026 年 1 月)' },
          { label: '国内有息债务违约总额', value: '340.26 亿元人民币(截至 2026 年 1 月)' },
          { label: '境外美元债延期', value: '5 月份美元债剩余本金 1.34 亿美元,2026 年 3 月未能兑付,延期至 9 月' },
          { label: '美国洛杉矶项目', value: '重大账面折价(约 7 亿美元级别估算,非最终损失认定);投入约 12 亿、拟议处置约 4.7 亿,以破产法院文件为准' },
          { label: '美国旧金山项目', value: '约 19 亿元人民币损失(2020 年贱卖时)' }
        ]
      }
    },
    {
      type: 'prose',
      data: {
        md: `公开可见规模:仅美国部分账面折价估算 + 境内可见违约部分,公开可见规模超过 500 亿元人民币级别(美国部分为账面折价估算,非最终损失认定,以破产法院文件为准)。而这一切的开始,仅仅是 2018 年洛杉矶项目"边干边筹钱"那个看似无关紧要的决策。`
      }
    },
    { type: 'caseRef', data: { caseSlug: 'oceanwide-plaza' } },
    {
      type: 'keyPoints',
      data: {
        title: '教训',
        items: [
          '进入美国市场前必须假设"中国总部一分钱都调不出来"——这是合规底线,也是风险底线',
          '美国项目的资金结构必须 100% 自洽——所有的钱(自有 + EB-5 + Senior Construction Loan + 投资人)在项目启动前就必须落实',
          '保留 15-20% 的 Contingency——市场会波动、成本会超支、工期会延误,必须有缓冲',
          '不要让美国子公司过度依赖母公司——既保护母公司,也保护子公司',
          '如果在中国本身正面临行业调整压力,那不是进入美国扩张的好时机,是收缩巩固的时机'
        ]
      }
    },

    // ── 第二部分:5 步合规 Checklist ─────────────────────────
    {
      type: 'sectionHeading',
      data: { text: '第二部分:5 步合规进入美国市场', id: 'five-step-checklist' }
    },
    {
      type: 'prose',
      data: {
        md: `如果你看完了 10 大陷阱,并且仍然决定进入美国房地产开发市场——以下是 SAREC 推荐的 5 步合规作战路径。`
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: 'Step 1 · 启动前 3-6 个月:合规结构搭建',
        items: [
          '选择正确的实体结构(LLC / LP / C-Corp / S-Corp)',
          '完成 EIN 注册、ITIN 申请(外国投资人)',
          '在加州/德州/佛州等目标州完成 Foreign Entity Registration',
          '聘请 4 位关键专业人士:跨境 CPA + Land Use Attorney + Corporate Attorney + Tax Attorney',
          '完成 FCPA Compliance Training(反海外腐败法合规培训)'
        ]
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: 'Step 2 · 拿地前 1-3 个月:项目可行性研究',
        items: [
          '完成 Entitlement Feasibility Study(审批可行性研究)',
          '完成 Product Feasibility Study(产品类型可行性研究——Condo vs Townhouse vs Detached House)',
          '完成 Zoning Analysis + Specific Plan Review',
          '评估 ED1 / Density Bonus / TOC 等政策红利的适用性',
          'Phase 1 Environmental Site Assessment(环境评估)'
        ]
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: 'Step 3 · 动工前必须 100% 完成:资金结构落实',
        items: [
          '自有资金到位',
          'EB-5 资金(如使用)的 Subscription Agreement 全部签署 + 资金 escrow 完成',
          'Senior Construction Loan 协议签署 + 首笔放款条件全部满足',
          'Title Insurance 出具;All Risk Insurance 投保',
          'Performance Bond 和 Payment Bond 落实',
          'Contingency Fund(15-20%)单独账户'
        ]
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: 'Step 4 · 建设期 18-36 个月:施工与现金流管理',
        items: [
          "严格按 Draw Schedule 支付工程款(避免 Mechanic's Lien)",
          '每次付款收 Conditional Lien Release / Unconditional Lien Release',
          '通过 Disbursement Agent 管理建筑账户',
          '月度财务对账 + 季度独立审计',
          '每月汇报给 EB-5 投资人(如使用)+ 银行'
        ]
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: 'Step 5 · 销售前 6-12 个月规划:退出与税务优化',
        items: [
          '评估销售 vs 长期持有',
          '如选择销售,提前规划 1031 Exchange(识别下一个项目)',
          '评估 Opportunity Zone 等额外税收激励',
          '评估资产转入 Family Trust 的可能性(长期持有策略)',
          '准备好下一个项目,让资金不停转'
        ]
      }
    },

    // ── qaUnit 区(首批 6 个,照 V0.3 §二)──────────────────
    {
      type: 'qaUnit',
      data: {
        id: 'qa-china-dev-fail-reasons',
        question: '中国房企/华人开发商在美国做房地产开发,最常见的失败原因是什么?',
        judgment:
          '三大主因——资金结构不完整就动工(缺 Senior Construction Loan)、低估 Entitlement(把 18–36 个月当 3–6 个月)、误以为母公司能无限输血;泛海三错全踩,出现重大账面折价(约 7 亿美元级别估算,以破产法院最终文件为准)。',
        evidence: ['src-trd-oceanwide-eb5-default-2023', 'src-ccn-oceanwide-liens-2019'],
        boundary: '基于公开报道与从业观察,非投资、法律、移民、税务建议。',
        riskNote: '个案差异大,需逐项目尽调。'
      }
    },
    {
      type: 'qaUnit',
      data: {
        id: 'qa-1031-dealer-property',
        question: '1031 交换适用于开发转售的房产吗?',
        judgment:
          '1031 适用投资性持有的同类房地产;不适用自住房,也不适用作为库存/转售的开发商存货(dealer property/inventory);须 45 天识别、180 天交割、经合格中介。',
        evidence: ['src-irc-1031'],
        boundary: '非税务、法律、移民、投资建议,具体适用以 CPA/税务律师判定。',
        riskNote: 'dealer 身份判定按个案,误用风险高。'
      }
    },
    {
      type: 'qaUnit',
      data: {
        id: 'qa-i526e-is-petition',
        question: 'EB-5 的 I-526E 是绿卡吗?投资后多久拿身份?',
        judgment:
          'I-526E 是移民申请(petition,Form I-526E, Immigrant Petition by Regional Center Investor),不是绿卡;获批后经移民签证/调整身份取得有条件永久居留(2 年条件绿卡),再以 I-829 解除条件得永久绿卡;时间不固定,受排期与项目进度影响。',
        evidence: ['src-uscis-eb5-i526e'],
        boundary: '非移民、法律、投资、税务建议,以 USCIS 规则与移民律师为准。',
        riskNote: '项目延期/岗位不达标会影响审批。'
      }
    },
    {
      type: 'qaUnit',
      data: {
        id: 'qa-eb5-not-primary-funding',
        question: 'EB-5 资金能当美国房地产开发的主轴资金吗?',
        judgment:
          '不能;EB-5 投资人首要目标是绿卡而非收益,退出有硬期限、项目出问题易引发集体诉讼;EB-5 不宜作为项目资金主轴,应作为资本结构中的补充性资金,主轴须为 Senior Construction Loan;具体比例需结合 Senior Construction Loan、GP equity、项目阶段与证券/移民合规由专业团队个案判断(非法律标准、非固定比例)。',
        evidence: ['src-trd-oceanwide-eb5-default-2023', 'src-uscis-eb5-i526e'],
        boundary: '非投资、证券、法律、移民、税务建议。',
        riskNote: 'EB-5 涉证券合规,须证券律师把关 PPM/认购协议。'
      }
    },
    {
      type: 'qaUnit',
      data: {
        id: 'qa-substantial-transformation',
        question: '中国建材经东南亚转口到美国能合法"避税(关税)"吗?',
        judgment:
          '换标签/简单组装的转口属 Transshipment Fraud(联邦犯罪);合法路径是真实供应链转移——以海关 Substantial Transformation 标准判定,看产品在名称、特性或用途(name, character, or use)上是否发生实质改变,由 CBP 个案判定,无固定百分比门槛。',
        evidence: ['src-cbp-substantial-transformation', 'src-doj-unitile-indictment-2025'],
        boundary: '非法律、海关合规、投资、移民、税务建议。',
        riskNote: 'Uni-Tile 案在司法程序中,适用无罪推定。'
      }
    },
    {
      type: 'qaUnit',
      data: {
        id: 'qa-oceanwide-warning',
        question: '泛海广场(Oceanwide Plaza)这类项目对中国投资人有什么警示?',
        judgment:
          '核心病根是"边干边筹钱"——自有+EB-5 先到位、Senior Construction Loan 边谈,叠加 Mechanic’s Lien 与母公司债务危机,导致停工烂尾;当前该项目处置:KPC/Lendlease 提出约 4.7 亿美元收购方案,以破产法院最终文件、批准及交割为准。',
        evidence: [
          'src-court-oceanwide-bankruptcy-2024',
          'src-news-oceanwide-kpc-lendlease-2026',
          'src-trd-oceanwide-eb5-default-2023',
          'src-china-oceanwide-disclosure-2026'
        ],
        boundary: '基于公开报道,非投资、法律、移民、税务建议;交易状态以法院文件为准。',
        riskNote: '破产程序状态可能变化。'
      }
    },

    // ── 结尾 / CTA(A3 合规改写,删撮合/连接/枢纽)──────────
    {
      type: 'sectionHeading',
      data: { text: '给想做美国房地产开发的你', id: 'cta' }
    },
    {
      type: 'prose',
      data: {
        md: `SAREC(Sino-American Real Estate Chamber,中美房地产商会)面向想做美国房地产开发的中国资本(华人华侨、准备来美的中国人、中国开发商/投资人、高净值家庭、房地产相关产业从业者),提供:跨境合规咨询、房地产开发风险咨询、项目可行性研究(Pre-Development Study)、项目风险初诊,以及企业家交流学习社群。`
      }
    },
    {
      type: 'callout',
      data: {
        tone: 'note',
        md: `SAREC 是中美房地产开发的研究与咨询智库,只接有真实意向的客户。`
      }
    },
    {
      type: 'cta',
      data: {
        intent: 'risk-review',
        label: '预约一次项目风险初步沟通',
        sourceSlug: 'chinese-capital-us-real-estate-10-traps'
      }
    }
  ],
  sources: [
    'src-uscis-eb5-i526e',
    'src-cbp-substantial-transformation',
    'src-irc-1031',
    'src-doj-zhangli-charges-2023',
    'src-doj-zhangli-dpa-2023',
    'src-doj-unitile-indictment-2025',
    'src-court-oceanwide-bankruptcy-2024',
    'src-news-oceanwide-kpc-lendlease-2026',
    'src-trd-oceanwide-eb5-default-2023',
    'src-ccn-oceanwide-liens-2019',
    'src-china-oceanwide-disclosure-2026'
  ],
  relatedSlugs: [],
  cta: {
    intent: 'risk-review',
    label: '预约一次项目风险初步沟通',
    sourceSlug: 'chinese-capital-us-real-estate-10-traps'
  }
};
