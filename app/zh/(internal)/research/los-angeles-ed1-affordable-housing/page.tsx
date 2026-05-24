import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import { ArticleHero } from '@/components/sections/research/ArticleHero';
import { ArticleSection } from '@/components/sections/research/ArticleSection';
import { RelatedResearch } from '@/components/sections/research/RelatedResearch';
import { OpeningJudgment } from '@/components/sections/research/OpeningJudgment';
import { ResearchMap } from '@/components/sections/research/ResearchMap';
import { AssetBreak } from '@/components/sections/research/AssetBreak';
import { PullQuote } from '@/components/sections/research/PullQuote';
import { MidArticleCTA } from '@/components/sections/research/MidArticleCTA';
import { RiskLedger } from '@/components/sections/research/RiskLedger';
import { ProjectEvidenceStrip } from '@/components/sections/research/ProjectEvidenceStrip';
import { SarecFramework } from '@/components/sections/research/SarecFramework';
import { ConversionBlock } from '@/components/sections/research/ConversionBlock';
import styles from './ed1.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '洛杉矶 ED1 与经济适用房开发观察｜SAREC Insights',
  description:
    '本文从政策背景、审批效率、项目筛选、融资可行性、建设成本、租赁运营、退出路径和风险控制等角度，分析洛杉矶 ED1 与 100% 经济适用房开发项目中的机会与风险。',
  path: '/zh/research/los-angeles-ed1-affordable-housing',
  type: 'article'
});

const tags = ['SAREC Insights', '洛杉矶 ED1', '经济适用房开发', 'Affordable Housing', '项目判断'];

const sections = [
  {
    title: '1. ED1 的核心意义：提高审批效率，但不是替代项目判断',
    body:
      'ED1 的重要意义在于，它为符合条件的 100% 经济适用房项目提供更高效的审批路径。对于洛杉矶这样的高成本、高规则密度城市而言，审批时间本身就是项目成本的一部分。',
    pointsTitle: 'ED1 的价值可能体现在',
    points: ['缩短部分审批周期', '减少部分 discretionary review 的不确定性', '提高土地利用效率', '激活部分原本开发效率较低的地块', '推动开发商重新评估 affordable housing 项目'],
    note: '审批效率提高，不代表项目风险消失。一个项目仍然要面对土地限制、图纸深化、部门协调、融资、施工、运营和退出市场。',
    summary: 'ED1 改变的是审批路径，但项目成败仍取决于完整开发能力。'
  },
  {
    title: '2. 为什么 ED1 会吸引开发商？',
    body:
      '在传统开发模式下，洛杉矶很多项目面临漫长审批、不确定听证、社区阻力和高持有成本。ED1 让部分 100% 经济适用房项目获得更可预期的审批路径，从而改变项目早期可行性判断。',
    pointsTitle: '开发商关注 ED1 的原因',
    points: ['审批周期可能缩短', '土地利用效率可能提高', '项目确定性可能增强', '政策目标与住房供给需求一致', '可形成新的 affordable housing 开发模式'],
    note: '这些优势必须结合具体地块判断。并不是所有土地都适合做 ED1，也不是所有 ED1 项目都有合理经济性。',
    summary: 'ED1 是政策工具，不是项目筛选的替代品。'
  },
  {
    title: '3. 看 ED1 项目，第一步不是看收益，而是看土地是否真正适用',
    body:
      '很多投资人容易先看开发后规模、预计租金、退出价值或项目测算。但 ED1 项目首先要看的是土地条件和政策适用性。',
    pointsTitle: '需要判断',
    points: ['地块是否位于合适的 zoning 和规划条件下', '项目是否符合 100% affordable housing 要求', '是否存在租户保护、历史资源、环境或高火险等限制', '是否涉及单户区、低密度区或其他政策限制', '地块形状、面积、临街条件和公用事业是否支持开发', '是否存在消防、停车、交通、无障碍或公用事业瓶颈', '周边社区和租赁需求是否支持项目定位'],
    summary: 'ED1 的起点不是“能不能多建”，而是“这块地是否真的适合按这个路径推进”。'
  },
  {
    title: '4. 审批加速不等于无审批',
    body:
      'ED1 项目可能在某些环节获得更高效处理，但仍然需要满足设计、建筑、安全、消防、公用事业、环保、租户保护和城市部门要求。',
    pointsTitle: '项目方需要关注',
    points: ['Entitlement 是否真正明确', 'Plan Check 是否完成', 'Corrections 是否已回复', '是否已进入 RTI Ready', 'Permit 是否已经领取', 'Department clearance 是否完整', 'LADBS、LAFD、LADWP 等部门是否仍有未解决事项', '施工图是否足够支持 GC 报价'],
    summary: '审批加速只能降低部分时间和程序不确定性，不能替代技术审查和施工准备。'
  },
  {
    title: '5. 融资：政策支持不等于银行自动贷款',
    body:
      'ED1 项目即使审批路径更清楚，也仍然需要资金结构支持。建筑贷款机构通常会看项目预算、开发商经验、资金来源、担保能力、租金或收入假设、退出路径和市场风险。',
    pointsTitle: '需要判断',
    points: ['建筑贷款是否已有 term sheet 或明确沟通', '贷款机构是否理解 affordable housing 收入结构', '股权资金是否充足', '利息储备是否合理', '项目是否需要额外补贴、税收优惠或其他资金来源', '高利率环境下现金流是否承压', '如果贷款条件变化，项目如何应对'],
    summary: '融资不是政策审批之后才考虑的问题，而是 ED1 项目能否真正落地的关键条件。'
  },
  {
    title: '6. 建设成本：ED1 项目仍然要面对真实施工市场',
    body:
      '无论政策路径多高效，项目最终都要回到施工成本。洛杉矶的人工、材料、保险、结构、消防、公用事业和施工管理成本，都会直接影响项目经济性。',
    pointsTitle: '需要关注',
    points: ['是否有多个 GC 报价', '报价是否基于完整施工图', '是否存在 excluded items', '是否有合理 contingency', '是否考虑 Type I / Type III 等结构成本差异', '是否考虑利息、保险、permit、school fee、linkage fee 等软成本', '工期是否合理', '变更单如何控制'],
    summary: 'ED1 可能压缩审批时间，但不能自动压缩建设成本。'
  },
  {
    title: '7. 100% 经济适用房不是只看单位数，也要看长期运营',
    body:
      'Affordable housing 项目不是建成后就自动稳定。项目还需要考虑租户资格、租金限制、运营成本、管理能力、维护支出、合规记录和长期持有逻辑。',
    pointsTitle: '需要判断',
    points: ['租金限制和收入限制如何影响 NOI', '租户资格审核机制', '物业管理成本', '维修和储备', '保险和税费', '空置率和出租速度', '长期 compliance 要求', '未来出售或再融资时买家如何看这类资产'],
    summary: 'ED1 项目不仅是开发项目，也是长期运营和合规管理项目。'
  },
  {
    title: '8. ED1 项目的退出路径不能过度简化',
    body:
      'ED1 项目可能通过出售、再融资或长期持有实现退出。但具体结果取决于项目收入、租金限制、市场 cap rate、买家需求、融资环境和合规要求。',
    pointsTitle: '需要提前讨论',
    points: ['是建成后出售，还是稳定运营后出售', '是否计划再融资', '退出买家是谁', '买家如何评估 affordable housing 资产', '租金限制是否影响估值', 'cap rate 假设是否合理', '如果市场变差，是否能长期持有', 'LP / GP 如何决定退出'],
    summary: '退出不能只写在模型最后一行，而应该从项目开始时就设计。'
  }
];

const mistakes = [
  '以为 ED1 等于自动批准',
  '以为审批快就等于项目安全',
  '只看单位数增加，不看建设成本',
  '只看政策红利，不看融资可行性',
  '只看地块面积，不看消防、公用事业和技术限制',
  '只看开发价值，不看长期 affordable housing 运营约束',
  '只看退出估值，不看买家和 cap rate',
  '只看项目方介绍，不看完整资料和合作结构'
];

const sarecFramework = [
  '地块是否真正适合 ED1 路径',
  '政策适用性是否清楚',
  '审批阶段是否真实',
  'Plan Check、RTI、Permit 是否有明确进展',
  '公用事业、消防、停车、交通等问题是否解决',
  '建设成本是否有依据',
  '建筑贷款是否可验证',
  '租赁和运营逻辑是否成立',
  '退出路径是否现实',
  'LP / GP 合作结构和信息披露是否清晰'
];

const relatedLinks = [
  { title: '美国房地产开发完整流程', href: '/zh/research/us-real-estate-development-process/' },
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: '案例研究', href: '/zh/case-studies/' },
  { title: '风险披露', href: '/zh/legal/risk-disclosure/' }
];

const introParagraphs = [
  '洛杉矶长期面临住房供应不足和住房可负担性压力。为了加快住房建设，洛杉矶推出了 ED1 等审批加速工具，重点支持符合条件的 100% 经济适用房项目。',
  '对项目方而言，ED1 可能改变一个项目的审批效率和土地利用逻辑；对投资人而言，它也可能让原本看起来不具备开发价值的土地，突然出现新的项目可能性。',
  '但 ED1 不是项目成功的保证，也不是融资、施工、出租和退出的替代品。真正专业的判断，是把政策红利放进完整开发链条中，逐项验证项目是否成立。'
];

const frameworkIntroBody =
  'ED1 后续政策和执行口径可能变化，洛杉矶也在持续推进更广泛的 permitting reform。本文只做一般观察，不构成任何政策承诺。涉及 zoning、entitlement、permit、affordable housing covenant、贷款、税务、法律、证券、EB-5 等事项，应咨询相应专业人士。';

const caseLensParagraphs = [
  '4136 Rosewood 用于说明 ED1 经济适用房开发项目如何从土地、审批、成本、融资、租赁和退出进行系统判断。',
  '3434 Chesapeake 适合说明 ED1 政策下的 RTI Ready、审批效率、土地利用提升和项目推进能力。',
  '2215 Wellesley 适合说明复杂规划区、Plan Check、公用事业协调、LADWP / LAFD 技术问题和跨部门推进能力。'
];

const caseLensCases = [
  { name: '4136 Rosewood', body: '用于说明 ED1 经济适用房开发项目如何从土地、审批、成本、融资、租赁和退出进行系统判断。' },
  { name: '3434 Chesapeake', body: '适合说明 ED1 政策下的 RTI Ready、审批效率、土地利用提升和项目推进能力。' },
  { name: '2215 Wellesley', body: '适合说明复杂规划区、Plan Check、公用事业协调、LADWP / LAFD 技术问题和跨部门推进能力。' }
];

const sarecFrameworkBody =
  'SAREC 不把 ED1 看成简单的政策红利，而是把它放进完整开发链条中判断。我们关注的不只是项目是否符合政策，而是政策能否真正转化为项目推进能力。合作结构也应结合 LP / GP 合作结构 和 指标假设 一起判断。';

const conclusionParagraphs = [
  'ED1 改变了洛杉矶部分 100% 经济适用房项目的审批效率，也为开发商和投资人带来了新的项目观察窗口。但政策本身不能替代项目判断。',
  '对于中国投资人、美国华人投资人和项目方而言，真正重要的是看懂：这个项目是否符合政策，审批是否真实推进，融资是否可落实，建设成本是否可控，运营和退出是否可验证，合作结构是否清楚。',
  'SAREC 希望帮助跨境客户把政策机会转化为可讨论、可验证、可推进的项目判断，而不是只停留在政策红利想象中。'
];

const noticeBody =
  '本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。ED1、经济适用房、房地产开发、项目投资、融资、税务、保险、法律和跨境交易均涉及复杂风险。具体事项应结合最新政策、项目资料、合同文件和相关持牌或专业人士意见审慎判断。';

const pullQuotes = [
  '审批不是形式问题，而是项目是否真实可推进的核心问题。',
  'ED1 改变的是审批路径，但项目成败仍取决于完整开发能力。'
];

const researchMapKeywords = [
  { keyword: 'ED1 核心', anchor: 'section-01' },
  { keyword: '开发商动机', anchor: 'section-02' },
  { keyword: '土地适用性', anchor: 'section-03' },
  { keyword: '审批节奏', anchor: 'section-04' },
  { keyword: '融资可行性', anchor: 'section-05' },
  { keyword: '建设成本', anchor: 'section-06' },
  { keyword: '长期运营', anchor: 'section-07' },
  { keyword: '退出路径', anchor: 'section-08' }
];

const researchMapItems = researchMapKeywords.map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: sections[i].title
}));

const heroAnchors = researchMapKeywords.slice(0, 3).map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: sections[i].title
}));

const projectEvidenceCases = [
  { name: '4136 Rosewood', tag: 'ED1 / Development', body: caseLensCases[0].body, href: '/zh/case-studies/' },
  { name: '3434 Chesapeake', tag: 'RTI / Entitlement', body: caseLensCases[1].body, href: '/zh/case-studies/' },
  { name: '2215 Wellesley', tag: 'Utilities / Coordination', body: caseLensCases[2].body, href: '/zh/case-studies/' }
];

const conversionIntents = [
  { label: '你有具体项目', ctaText: '提交项目初筛', href: '/zh/contact?intent=project' },
  { label: '你想继续研究', ctaText: '返回研究中心', href: '/zh/research' },
  { label: '你想保持联系', ctaText: '订阅研究简报', href: '/zh/contact?intent=newsletter' }
];

export default function LosAngelesEd1AffordableHousingPage() {
  return (
    <main className={styles.page}>
      <ArticleHero
        eyebrow="ED1 · 政策深度 · LA"
        title="洛杉矶 ED1 与经济适用房开发观察"
        summary="ED1 改变了洛杉矶部分 100% 经济适用房项目的审批节奏，也吸引了大量开发商和投资人关注。但政策红利并不等于项目安全，真正的判断仍然要回到土地、分区、审批、融资、建设、运营和退出。"
        tags={tags}
        heroVideo={{
          src: '/videos/research-ed1-hero.mp4',
          poster: '/images/research/research-ed1-poster.jpg'
        }}
        primaryCta={{ label: '查看案例研究', href: '/zh/case-studies/' }}
        secondaryCta={{ label: '提交项目初筛', href: '/zh/services/strategy/' }}
        anchors={heroAnchors}
      />

      <OpeningJudgment
        judgment="政策机会越明显，越需要冷静判断"
        introParagraphs={introParagraphs}
      />

      <ResearchMap
        eyebrow="RESEARCH MAP · 本文导读"
        title="从政策工具回到项目判断"
        items={researchMapItems}
      />

      <div className={styles.body}>
        <ArticleSection
          id="section-01"
          index={1}
          {...sections[0]}
          width="default"
        />
        <ArticleSection
          id="section-02"
          index={2}
          {...sections[1]}
          width="default"
        />
      </div>

      <AssetBreak
        videoSrc="/videos/research-ed1-asset-break-01.mp4"
        videoPoster="/images/research/research-ed1-asset-break-01-poster.jpg"
        leftEyebrow="项目证据 · 从案例看 ED1"
        leftTitle="政策机会要落到真实项目推进能力"
        leftBody="这一段用于把前文的项目判断，从文字讨论拉回到真实城市、住宅密度和项目推进场景。"
      />

      <div className={styles.body}>
        <ArticleSection
          id="section-03"
          index={3}
          {...sections[2]}
          width="default"
        />
        <ArticleSection
          id="section-04"
          index={4}
          {...sections[3]}
          width="default"
        />
      </div>

      <PullQuote text={pullQuotes[0]} attribution="SAREC RESEARCH" />

      <MidArticleCTA
        body="如果你正在判断一个 ED1 或经济适用房开发项目，可以先从项目阶段和资料完整度开始。"
        ctaLabel="提交项目初筛"
        ctaHref="/zh/services/strategy/"
      />

      <div className={styles.body}>
        <ArticleSection
          id="section-05"
          index={5}
          {...sections[4]}
          width="default"
        />
        <ArticleSection
          id="section-06"
          index={6}
          {...sections[5]}
          width="default"
        />
        <ArticleSection
          id="section-07"
          index={7}
          {...sections[6]}
          width="default"
        />
        <ArticleSection
          id="section-08"
          index={8}
          {...sections[7]}
          width="default"
        />
      </div>

      <PullQuote text={pullQuotes[1]} attribution="SAREC RESEARCH" />

      <RiskLedger
        eyebrow="RISK LEDGER · 常见误区"
        title="ED1 项目常见的 8 个误区"
        items={mistakes}
      />

      <ProjectEvidenceStrip
        eyebrow="PROJECT EVIDENCE · 从案例看 ED1"
        title="政策机会要落到真实项目推进能力"
        cases={projectEvidenceCases}
      />

      <SarecFramework
        eyebrow="SAREC FRAMEWORK · 机构方法论"
        title="SAREC 的 ED1 项目判断框架"
        body={sarecFrameworkBody}
        bottomTag="STRUCTURE ASSESSMENT"
        items={sarecFramework}
      />

      <section className={styles.finalCopyBlock}>
        <div className={styles.finalCopyInner}>
          <h2>ED1 带来机会，但真正的价值来自专业判断</h2>
          {conclusionParagraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section className={styles.finalCopyBlock}>
        <div className={styles.finalCopyInner}>
          <h2>重要说明</h2>
          <p>{noticeBody}</p>
        </div>
      </section>

      <RelatedResearch
        items={relatedLinks.map((r) => ({
          label: r.title,
          href: r.href,
          eyebrow: 'SAREC RESEARCH'
        }))}
      />

      <ConversionBlock
        question="你现在最需要做什么决定?"
        intents={conversionIntents}
        contactLine="无论你处于哪个阶段，SAREC 都可以提供一次具体的对话窗口。"
      />
    </main>
  );
}
