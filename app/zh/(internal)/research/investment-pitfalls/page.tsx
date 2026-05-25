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
  title: '华人投资美国房产的7个常见风险 | SAREC实战总结',
  description:
    'SAREC整理华人投资美国房产最常见的7类风险，每条都有真实案例背景，帮助投资人在决策前建立风险意识。',
  path: '/zh/research/investment-pitfalls',
  type: 'article'
});

const tags = ['SAREC Insights', '实战陷阱', '跨境投资', '华人投资人', '风险意识'];

const subtitle =
  '不是吓你，是帮你提前想清楚。SAREC从多年陪同客户的实战中总结，每一条都有真实案例背景';

const pitfalls = [
  {
    title: '风险1：合伙人背景没有独立核查',
    body:
      '最常见的失误之一。项目方提供的资料永远是最好看的版本。开发商过去的项目是否按时完工？有没有诉讼记录？关联方是否复杂？这些信息在美国的公开数据库里都能查到，但大多数人没有查。'
  },
  {
    title: '风险2：法律文件没有独立律师审查',
    body:
      '美国项目的认购协议通常几十页，条款里藏着：优先回报给GP的安排（你的收益被稀释）、锁定期条款（你以为可以退出，其实不行）、责任豁免条款（出了问题开发商不负责）。不找独立律师，只看项目方提供的“要点摘要”，等于蒙眼签字。'
  },
  {
    title: '风险3：资金来源合规准备不足',
    body:
      'EB-5申请中，资金合法来源证明（Source of Funds）是最常被拒原因之一。很多申请人低估了USCIS对资金溯源的严格程度：赠与款、出售资产所得、股权转让收入——每一笔都需要文件链条。提前1-2年开始准备，而不是等签约再补材料。'
  },
  {
    title: '风险4：对美国开发周期的预期不现实',
    body:
      '中国的地产开发节奏和美国完全不同。美国的许可审批流程（Entitlement）可能需要2-3年，在此期间资金锁定，市场可能已经变化。进场前，把开发周期按最悲观的估算再乘以1.5倍来计划资金。'
  },
  {
    title: '风险5：选择了错误的投资结构',
    body:
      '并非所有“美国房产投资”都是同一回事：EB-5 ≠ 直接购房 ≠ 房地产基金 ≠ 夹层融资。不同结构的风险、回报、流动性、税务处理完全不同。在决定“投什么项目”之前，先搞清楚“用什么结构投”。'
  },
  {
    title: '风险6：退出机制不清晰',
    body:
      '很多投资人在进场时没有认真想退出问题：什么情况下可以退出？谁来收购你的份额？锁定期多长？如果项目方没有提供清晰的退出安排，这本身就是风险信号。'
  },
  {
    title: '风险7：忽视汇率和资金回流风险',
    body:
      '投资回报最终要回到中国，但跨境资金流动有合规要求。美元对人民币汇率的变化，可能吃掉你的实际回报。提前做好汇率对冲和资金回流的合规安排，是经常被忽视的最后一步。'
  }
];

const sarecJudgment =
  '这7类风险，没有一条是因为市场不好造成的。都是可以通过尽调、合适的结构和独立顾问来规避的。美国市场不缺机会，缺的是有能力帮你做真实判断的伙伴。';

const andyObservation =
  '遇到过一个客户，项目各方面看起来都不错。但在谈合同阶段，项目方拒绝提供某份财务文件，说“这是内部资料”。我建议客户不要投。后来那个项目果然出了问题。一个真正好的项目，不会拒绝独立审查。';

const investorInsight =
  '做尽调不是不信任对方，是保护自己。在美国这个法律体系里，签了字就是你的责任。';

const introParagraphs = [subtitle, sarecJudgment];

const noticeBody =
  '本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。美国房地产投资、项目开发、资金合规、合同审查、税务、贷款、保险、法律和跨境交易均涉及复杂风险。具体事项应结合项目资料、合同文件和相关持牌或专业人士意见审慎判断。';

const relatedLinks = [
  { title: '下载：SAREC投资风险清单', href: '/zh/research/risk-checklist/' },
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: '项目判断框架', href: '/zh/research/framework/' },
  { title: '了解SAREC风控尽调服务', href: '/zh/services/due-diligence/' }
];

const researchMapKeywords = [
  { keyword: '合伙人核查', anchor: 'pitfall-01' },
  { keyword: '律师审查', anchor: 'pitfall-02' },
  { keyword: '资金合规', anchor: 'pitfall-03' },
  { keyword: '周期预期', anchor: 'pitfall-04' },
  { keyword: '投资结构', anchor: 'pitfall-05' },
  { keyword: '退出机制', anchor: 'pitfall-06' },
  { keyword: '汇率回流', anchor: 'pitfall-07' }
];

const researchMapItems = researchMapKeywords.map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: pitfalls[i].title
}));

const heroAnchors = researchMapKeywords.slice(0, 3).map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: pitfalls[i].title
}));

const conversionIntents = [
  { label: '你有具体项目', ctaText: '委托SAREC做风控尽调', href: '/zh/services/due-diligence/' },
  { label: '你想继续研究', ctaText: '查看风险清单', href: '/zh/research/risk-checklist/' },
  { label: '你想保持联系', ctaText: '联系我们', href: '/zh/contact/' }
];

export default function InvestmentPitfallsPage() {
  return (
    <main style={{ background: 'var(--ink-deepest)', color: 'var(--ivory)' }}>
      <ArticleHero
        eyebrow="SAREC INSIGHTS · 实战陷阱"
        title="华人投资美国房产，这7类风险最容易被忽视"
        summary={subtitle}
        tags={tags}
        heroVideo={{
          src: '/videos/research/investment-pitfalls-hero.mp4',
          poster: '/images/research/investment-pitfalls-poster.jpg'
        }}
        primaryCta={{ label: '委托SAREC做风控尽调', href: '/zh/services/due-diligence/' }}
        secondaryCta={{ label: '查看风险清单', href: '/zh/research/risk-checklist/' }}
        anchors={heroAnchors}
        mediaCaption="COMMON PITFALLS / CROSS-BORDER RISK / FIELD-TESTED"
      />

      <OpeningJudgment
        judgment="先识别常见陷阱，再决定是否进入深度尽调"
        introParagraphs={introParagraphs}
        variant="compact"
      />

      <ResearchMap
        eyebrow="RESEARCH MAP · 本文导读"
        title="七类最容易被忽视的风险"
        items={researchMapItems}
      />

      <ArticleSection
        id="pitfall-01"
        index={1}
        title={pitfalls[0].title}
        body={pitfalls[0].body}
        width="default"
      />
      <ArticleSection
        id="pitfall-02"
        index={2}
        title={pitfalls[1].title}
        body={pitfalls[1].body}
        width="default"
      />
      <ArticleSection
        id="pitfall-03"
        index={3}
        title={pitfalls[2].title}
        body={pitfalls[2].body}
        width="default"
      />
      <ArticleSection
        id="pitfall-04"
        index={4}
        title={pitfalls[3].title}
        body={pitfalls[3].body}
        width="default"
      />

      <PullQuote
        text={andyObservation}
        attribution="SAREC RESEARCH · FIELD NOTE"
        variant="long"
      />

      <MidArticleCTA
        body={investorInsight}
        ctaLabel="委托SAREC做风控尽调"
        ctaHref="/zh/services/due-diligence/"
      />

      <ArticleSection
        id="pitfall-05"
        index={5}
        title={pitfalls[4].title}
        body={pitfalls[4].body}
        width="default"
      />
      <ArticleSection
        id="pitfall-06"
        index={6}
        title={pitfalls[5].title}
        body={pitfalls[5].body}
        width="default"
      />
      <ArticleSection
        id="pitfall-07"
        index={7}
        title={pitfalls[6].title}
        body={pitfalls[6].body}
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
