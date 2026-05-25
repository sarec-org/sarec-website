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
  title: '如何判断一个美国房产项目值不值得投？| SAREC判断框架',
  description:
    'SAREC实战项目评估框架，5个维度帮助投资人从公开信息对美国房产项目做出初步判断。',
  path: '/zh/research/framework',
  type: 'article'
});

const tags = ['SAREC Insights', '项目判断框架', '初步筛选', '公开信息核查', '美国房地产'];

const dimensions = [
  {
    title: '维度1：开发商历史项目记录',
    question: '要查的问题：这家开发商过去5年完成了多少个类似项目？有没有按时交付？有没有超预算？有没有未决诉讼或SEC调查记录？',
    method: '查找方法：美国各州的法院公开记录（Pacer等系统）、USCIS对EB-5区域中心的监管记录、LinkedIn + Google搜索关键人员背景',
    redFlag: '红旗信号：开发商无法提供已完成项目列表，或已完成项目寥寥。'
  },
  {
    title: '维度2：土地与许可状态',
    question: '要查的问题：土地是否已经完成产权清晰的收购？开发许可（Entitlement）处于哪个阶段？分区是否支持目标开发类型？',
    redFlag: '红旗信号：土地仍在谈判中，或开发许可尚未启动，但项目已在推进资金安排。'
  },
  {
    title: '维度3：财务结构合理性',
    question: '要查的问题：项目总投资的资金来源构成（自有资金/银行贷款/EB-5/其他）？GP的资金投入比例？（低于10%需警惕）优先回报给谁？回报率假设是否现实？',
    redFlag: '红旗信号：GP几乎无自有资金投入，全靠LP承担风险。'
  },
  {
    title: '维度4：市场可行性',
    question: '要查的问题：项目所在区域的可比项目（Comps）近期成交价是多少？项目的销售/租金假设是否与市场数据匹配？开发完成后的出售对象是谁？',
    method: '查找方法：Zillow、Redfin、CoStar可查可比数据；LA County Assessor可查区域历史成交',
    redFlag: '红旗信号：财务模型使用的售价/租金假设明显高于近期Comps。'
  },
  {
    title: '维度5：退出机制',
    question: '要查的问题：项目计划的退出时间线是多少？是出售、再融资还是持有出租？如果项目延期，LP的权利是什么？',
    redFlag: '红旗信号：退出机制模糊，或合同中没有针对延期的处理条款。'
  }
];

const conclusionBullets = [
  '5个维度全部通过：进入深度尽调',
  '3-4个通过：有条件推进，重点关注未通过维度',
  '2个以下通过：建议放弃'
];

const sarecJudgment =
  '这个框架是初筛工具，不是最终决策依据。通过初筛的项目，还需要专业律师和财务顾问做完整尽调。但用这5个维度做第一轮筛选，至少能淘汰掉70%的问题项目。';

const andyObservation =
  '最容易被忽视的是维度3（财务结构）。很多投资人看了区域、看了渲染图，就被吸引了。但真正决定你能不能拿到回报的，是合同条款里的分配结构。把协议发给一个不认识项目方的独立律师，让他用5分钟告诉你“这个结构对LP公平吗”。';

const investorInsight =
  '花2小时做初判，可能省下几年的麻烦。这个框架的目的不是让你更复杂，而是让你更快找到真正值得深入看的项目。';

const introParagraphs = [sarecJudgment];

const noticeBody =
  '本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。项目初筛、尽调、投资判断、合作结构、税务、贷款、保险和跨境交易均涉及复杂风险。具体事项应结合项目资料、合同文件和相关持牌或专业人士意见审慎判断。';

const relatedLinks = [
  { title: 'SAREC投资风险清单', href: '/zh/research/risk-checklist/' },
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: '美国房地产开发完整流程', href: '/zh/research/us-real-estate-development-process/' },
  { title: '委托SAREC做风控尽调', href: '/zh/services/due-diligence/' }
];

const researchMapKeywords = [
  { keyword: '开发商记录', anchor: 'dimension-01' },
  { keyword: '土地与许可', anchor: 'dimension-02' },
  { keyword: '财务结构', anchor: 'dimension-03' },
  { keyword: '市场可行性', anchor: 'dimension-04' },
  { keyword: '退出机制', anchor: 'dimension-05' }
];

const researchMapItems = researchMapKeywords.map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: dimensions[i].title
}));

const heroAnchors = researchMapKeywords.slice(0, 3).map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: dimensions[i].title
}));

const conversionIntents = [
  { label: '你有具体项目', ctaText: '委托SAREC做风控尽调', href: '/zh/services/due-diligence/' },
  { label: '你想继续研究', ctaText: '返回研究中心', href: '/zh/research' },
  { label: '你想保持联系', ctaText: '联系我们', href: '/zh/contact/' }
];

export default function FrameworkPage() {
  return (
    <main style={{ background: 'var(--ink-deepest)', color: 'var(--ivory)' }}>
      <ArticleHero
        eyebrow="SAREC INSIGHTS · 判断框架"
        title="拿到一个美国房产项目，你应该问哪5个问题？"
        summary="SAREC整理的实战初判框架。用公开信息完成第一轮筛选，再决定是否值得深入尽调。"
        tags={tags}
        heroVideo={{
          src: '/videos/research/framework-hero.mp4',
          poster: '/images/research/framework-poster.jpg'
        }}
        primaryCta={{ label: '委托SAREC做风控尽调', href: '/zh/services/due-diligence/' }}
        secondaryCta={{ label: '查看风险清单', href: '/zh/research/risk-checklist/' }}
        anchors={heroAnchors}
        mediaCaption="JUDGMENT FRAMEWORK / 5 DIMENSIONS / INITIAL SCREENING"
      />

      <OpeningJudgment
        judgment="先做结构化初筛，再决定是否进入深度尽调"
        introParagraphs={introParagraphs}
        variant="compact"
      />

      <ResearchMap
        eyebrow="RESEARCH MAP · 本文导读"
        title="5个判断维度"
        items={researchMapItems}
      />

      <ArticleSection
        id="dimension-01"
        index={1}
        title={dimensions[0].title}
        body={dimensions[0].question}
        note={dimensions[0].method}
        summary={dimensions[0].redFlag}
        width="default"
      />
      <ArticleSection
        id="dimension-02"
        index={2}
        title={dimensions[1].title}
        body={dimensions[1].question}
        summary={dimensions[1].redFlag}
        width="default"
      />
      <ArticleSection
        id="dimension-03"
        index={3}
        title={dimensions[2].title}
        body={dimensions[2].question}
        summary={dimensions[2].redFlag}
        width="default"
      />

      <PullQuote text={andyObservation} attribution="SAREC RESEARCH · FIELD NOTE" variant="long" />

      <MidArticleCTA
        body={investorInsight}
        ctaLabel="委托SAREC做风控尽调"
        ctaHref="/zh/services/due-diligence/"
      />

      <ArticleSection
        id="dimension-04"
        index={4}
        title={dimensions[3].title}
        body={dimensions[3].question}
        note={dimensions[3].method}
        summary={dimensions[3].redFlag}
        width="default"
      />
      <ArticleSection
        id="dimension-05"
        index={5}
        title={dimensions[4].title}
        body={dimensions[4].question}
        summary={dimensions[4].redFlag}
        width="default"
      />

      <ArticleSection
        title="初判结论标准"
        bullets={conclusionBullets}
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
        question="需要先评估项目风险？"
        intents={conversionIntents}
        contactLine="你可以提交项目资料或合作需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。"
      />
    </main>
  );
}
