import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import { ArticleHero } from '@/components/sections/research/ArticleHero';
import { ArticleSection } from '@/components/sections/research/ArticleSection';
import { RelatedResearch } from '@/components/sections/research/RelatedResearch';
import { OpeningJudgment } from '@/components/sections/research/OpeningJudgment';
import { ResearchMap } from '@/components/sections/research/ResearchMap';
import { PullQuote } from '@/components/sections/research/PullQuote';
import { MidArticleCTA } from '@/components/sections/research/MidArticleCTA';
import { ConversionBlock } from '@/components/sections/research/ConversionBlock';

export const metadata: Metadata = createPageMetadata({
  title: 'EB-5是什么？2026年值不值得投？SAREC完整解析',
  description:
    'EB-5投资移民全面指南：政策现状、投资金额、排期、风险与SAREC专家判断。适合正在评估EB-5的中国投资人。',
  path: '/zh/research/eb5',
  type: 'article'
});

const tags = ['SAREC Insights', 'EB-5', '投资移民', '区域中心', '跨境合规'];

const section01Paragraphs = [
  'EB-5（Employment-Based Fifth Preference）是美国国会于1990年设立的投资移民项目。投资人将资金投入美国商业项目，创造一定数量的就业岗位，换取美国绿卡。',
  '本质上，EB-5是一种附带移民属性的私募股权投资：你投的是一个美国房地产或商业开发项目，回报是绿卡，而不是现金分红（虽然有些项目也给利息）。'
];

const section02Table = [
  { label: '普通投资额', value: '$1,050,000' },
  { label: 'TEA区域投资额', value: '$800,000' },
  { label: '每年签证配额', value: '约10,000个（含家属）' },
  { label: '中国大陆排期', value: '当前约2-3年（视政策）' },
  { label: '投资结构', value: '通过区域中心（Regional Center）' }
];

const section03OrderedItems = [
  '选择项目与区域中心：核查区域中心合法性（USCIS注册），审查项目可行性报告和财务结构，律师审查认购协议',
  '资金准备与合规：证明资金合法来源（Source of Funds），完成跨境资金转移合规安排',
  '提交I-526申请：由移民律师准备申请材料，审批周期约12-24个月，批准后进入排期等待',
  '获得有条件绿卡：中国大陆申请人等排期，通常1-3年，排期到后签证面谈，入境获2年有条件绿卡',
  '申请I-829移除条件：项目完工 + 就业创造证明，移除绿卡条件，获永久绿卡'
];

const section04OrderedItems = [
  '项目失败：如开发商破产，投资本金可能无法收回。',
  '排期延长：中国大陆申请人排期历史上最长达10年以上，存在政策变动风险。',
  '就业创造未达标：如项目未能创造足够就业，I-829可能被拒，绿卡条件无法移除。',
  '区域中心合规问题：历史上有区域中心因欺诈被SEC调查，投资人损失全部本金。'
];

const section05Bullets = [
  '有移民美国需求，愿意以投资换绿卡路径的高净值人群',
  '投资预算在$80万以上，可接受5-7年锁定期',
  '希望合法合规完成资产美元化配置'
];

const section05NegativeBullets = [
  '纯粹追求投资回报（EB-5回报率通常低于同类私募）',
  '无法接受较长审批周期的申请人'
];

const sarecJudgment =
  'EB-5对于有移民需求的中国高净值人群仍然是最直接的路径，但2022年 RIA 法案之后，项目筛选的门槛显著提高了。区域中心的合规历史和项目本身的可行性，是比投资金额更重要的判断维度。';

const andyObservation =
  '我们见过很多EB-5项目，好的项目开发商有完整的竣工历史，财务结构透明，就业测算保守。差的项目往往在销售PPT上很漂亮，但项目可行性报告是用最乐观假设做的。第一步：找独立律师和顾问做背景调查，不要只看项目方提供的材料。';

const investorInsight =
  'EB-5不是买保险，是一笔真实的私募投资。把它当投资来做尽调，而不是当移民工具来走流程。';

const introParagraphs = [sarecJudgment];

const noticeBody =
  '本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。EB-5 项目同时涉及投资风险与移民结果不确定性 — 本文不保证 I-526 / I-829 获批，不保证移民结果，不保证投资本金安全，不保证投资收益。具体投资额、签证配额、排期、TEA 认定、区域中心资格和审批口径都可能随政策变化。具体事项应结合项目可行性报告、合同文件，并咨询持牌移民律师、证券律师、会计师及税务顾问的独立意见后审慎判断。';

const relatedLinks = [
  { title: '投资风险清单', href: '/zh/research/risk-checklist/' },
  { title: '项目判断框架', href: '/zh/research/framework/' },
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: '华人投资美国房产的7类常见风险', href: '/zh/research/investment-pitfalls/' }
];

const researchMapKeywords = [
  { keyword: 'EB-5 是什么', anchor: 'eb5-01' },
  { keyword: '2026 关键参数', anchor: 'eb5-02' },
  { keyword: '投资流程', anchor: 'eb5-03' },
  { keyword: '主要风险', anchor: 'eb5-04' },
  { keyword: '适合人群', anchor: 'eb5-05' }
];

const sectionTitlesByAnchor: Record<string, string> = {
  'eb5-01': 'EB-5是什么？',
  'eb5-02': '2026年EB-5关键参数',
  'eb5-03': 'EB-5投资流程',
  'eb5-04': 'EB-5主要风险',
  'eb5-05': 'EB-5适合哪些人？'
};

const researchMapItems = researchMapKeywords.map((k) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: sectionTitlesByAnchor[k.anchor]
}));

const heroAnchors = researchMapKeywords.slice(0, 3).map((k) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: sectionTitlesByAnchor[k.anchor]
}));

const conversionIntents = [
  { label: '你有具体项目', ctaText: '预约免费初步咨询', href: '/zh/contact/#investment' },
  { label: '你想继续研究', ctaText: '查看风险清单', href: '/zh/research/risk-checklist/' },
  { label: '你想保持联系', ctaText: '联系我们', href: '/zh/contact/' }
];

export default function Eb5Page() {
  return (
    <main style={{ background: 'var(--ink-deepest)', color: 'var(--ivory)' }}>
      <ArticleHero
        eyebrow="SAREC INSIGHTS · EB-5 解析"
        title="EB-5投资移民：2026年还值不值得投？"
        summary="从政策现状、投资金额、排期、流程和风险出发，理解 EB-5 的投资属性与尽调重点。"
        tags={tags}
        heroVideo={{
          src: '/videos/research/eb5-hero.mp4',
          poster: '/images/research/eb5-poster.jpg'
        }}
        primaryCta={{ label: '预约免费初步咨询', href: '/zh/contact/#investment' }}
        secondaryCta={{ label: '查看风险清单', href: '/zh/research/risk-checklist/' }}
        anchors={heroAnchors}
        mediaCaption="EB-5 / DUE DILIGENCE / INVESTMENT SCRUTINY"
      />

      <OpeningJudgment
        judgment="把 EB-5 当投资来做尽调，而不是当移民工具来走流程"
        introParagraphs={introParagraphs}
        variant="compact"
      />

      <ResearchMap
        eyebrow="RESEARCH MAP · 本文导读"
        title="EB-5 完整解析"
        items={researchMapItems}
      />

      <ArticleSection
        id="eb5-01"
        index={1}
        title="EB-5是什么？"
        paragraphs={section01Paragraphs}
        width="default"
      />

      <ArticleSection
        id="eb5-02"
        index={2}
        title="2026年EB-5关键参数"
        table={section02Table}
        width="default"
      />

      <ArticleSection
        id="eb5-03"
        index={3}
        title="EB-5投资流程"
        orderedItems={section03OrderedItems}
        width="default"
      />

      <PullQuote
        text={andyObservation}
        attribution="SAREC RESEARCH · FIELD NOTE"
        variant="long"
      />

      <MidArticleCTA
        body={investorInsight}
        ctaLabel="预约免费初步咨询"
        ctaHref="/zh/contact/#investment"
      />

      <ArticleSection
        id="eb5-04"
        index={4}
        title="EB-5主要风险"
        orderedItems={section04OrderedItems}
        width="default"
      />

      <ArticleSection
        id="eb5-05"
        index={5}
        title="EB-5适合哪些人？"
        bullets={section05Bullets}
        negativeBullets={section05NegativeBullets}
        width="default"
      />

      <ArticleSection
        title="重要说明"
        body={noticeBody}
        width="default"
      />

      <RelatedResearch
        items={relatedLinks.map((r) => ({
          label: r.title,
          href: r.href,
          eyebrow: 'SAREC RESEARCH'
        }))}
      />

      <ConversionBlock
        question="正在评估EB-5项目？SAREC提供独立的项目背景核查服务。"
        intents={conversionIntents}
        contactLine="你可以提交项目资料或合作需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。"
      />
    </main>
  );
}
