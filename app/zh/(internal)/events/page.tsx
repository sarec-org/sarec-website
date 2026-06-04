import type { Metadata } from 'next';
import Link from 'next/link';
import { SaImage } from '@/components/shared/SaImage';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata } from '@/lib/seo';
import styles from './events.module.css';
import { EventsHero } from './EventsHero';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 活动与考察｜中美房地产商会',
  description:
    'SAREC 围绕真实项目、市场判断、风险识别和资源协同,组织培训、研讨、闭门分享、行业展会和美国实地考察。活动不只是内容传播 —— 是会员深度参与跨境地产合作的关键场景。',
  path: '/zh/events'
});

const eventTypes = [
  {
    code: '01',
    title: '主题培训',
    body: '围绕真实项目和真实判断设计的培训。',
    listLabel: '主题包括:',
    list: [
      '美国房地产投资判断框架',
      '项目结构与法律边界',
      '财务建模与 IRR 测算实操',
      '跨境投资风险识别清单',
      '美国地产政策与机会(ED1 / EB-5 等)'
    ],
    foot: '适合:希望系统提升美国房地产投资判断能力的人。'
  },
  {
    code: '02',
    title: '项目研讨',
    body: '围绕具体项目或具体行业话题的深度研讨。',
    listLabel: '通常采用:',
    list: ['圆桌讨论', '项目案例分析', '多方互动'],
    foot: '适合:已有具体项目方向或投资需求的人。'
  },
  {
    code: '03',
    title: '闭门分享',
    body: '小范围、高密度、敏感话题的深度分享。',
    listLabel: '涉及:',
    list: ['具体项目操盘经验', '跨境合规与结构设计', '行业内部观察'],
    foot: '仅向常务理事和副会长单位开放。'
  },
  {
    code: '04',
    title: '行业展会与论坛',
    body: '跨境地产投资相关的行业活动。',
    listLabel: '包括:',
    list: [
      'SAREC 主办或联办的展会',
      '与其他机构合作的论坛',
      '跨境行业交流活动'
    ],
    foot: '会员可优先参加。'
  }
];

const tourCards = [
  {
    code: '01',
    title: '项目实地走访',
    body: [
      '参观正在进行的真实项目:',
      '经济适用房(ED1)、精品公寓、跨境股权合作项目等。',
      '现场了解项目背景、进度、合作结构。'
    ]
  },
  {
    code: '02',
    title: '本地华人开发商面对面',
    body: [
      '与有 15 年美国本地经验的合作开发商直接对话。',
      '了解美国地产开发的真实流程、监管环境和合作方式。'
    ]
  },
  {
    code: '03',
    title: '专业服务伙伴见面',
    body: [
      '接触 SAREC 合作的律师、会计师、贷款经纪、Escrow 公司、Title 公司等专业服务伙伴。'
    ]
  },
  {
    code: '04',
    title: '真实项目盘点与问答',
    body: [
      '针对会员关心的项目类型 / 市场区域 / 投资结构,进行深度盘点和问答。'
    ]
  },
  {
    code: '05',
    title: '跨境合作机制讨论',
    body: [
      '了解 SAREC 三类服务入口在实际项目中的落地方式:',
      'LLC 项目公司、Escrow 托管、后端激励等。'
    ]
  }
];

export default function EventsPage() {
  return (
    <main>
      {/* E01 — Cinematic Hero(LA skyline 全屏 + 文字 overlay)*/}
      <EventsHero />

      {/* E02 — 活动类型 5 类(numbered card 2x2 + 第 5 张指向 E03) */}
      <section className={styles.typesSection}>
        <div className={styles.typesInner}>
          <span className={styles.eyebrow}>EVENT TYPES · 活动类型</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            5 类活动
          </RevealOnView>
          <p className={styles.sectionLead}>
            SAREC 活动分为五种类型,对应不同深度的参与和合作。
          </p>
          <div className={styles.typesGrid}>
            {eventTypes.map((ev) => (
              <article key={ev.code} className={styles.typeCard}>
                <span className={styles.typeNum}>{ev.code}</span>
                <h3 className={styles.typeH3}>{ev.title}</h3>
                <p className={styles.typeBody}>{ev.body}</p>
                <p className={styles.typeSubLabel}>{ev.listLabel}</p>
                <ul className={styles.typeSubList}>
                  {ev.list.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className={styles.typeFoot}>{ev.foot}</p>
              </article>
            ))}
            <article className={`${styles.typeCard} ${styles.typeCardLink}`}>
              <span className={styles.typeNum}>05</span>
              <h3 className={styles.typeH3}>美国实地考察</h3>
              <p className={styles.typeBody}>
                <Link href="#us-project-tours" className={styles.inlineLink}>
                  详见下一区块 →
                </Link>
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* E03 — 美国实地考察(核心区块:左 5 卡 + 右 LA 项目图 full-bleed) */}
      <section
        className={styles.toursSection}
        id="us-project-tours"
      >
        <div className={styles.toursGrid}>
          <div className={styles.toursText}>
            <span className={styles.eyebrow}>
              US PROJECT TOURS · 美国实地考察
            </span>
            <RevealOnView as="h2" className={styles.sectionH2}>
              美国实地考察
            </RevealOnView>
            <p className={styles.sectionLead}>
              美国实地考察是 SAREC 会员服务的核心环节之一。不是观光,不是商务旅游 —— 是直接接触本地华人开发商、专业服务伙伴和真实项目现场的深度行程。
            </p>
            <ol className={styles.tourList}>
              {tourCards.map((t) => (
                <li key={t.code} className={styles.tourItem}>
                  <span className={styles.tourNum}>{t.code}</span>
                  <div>
                    <h3 className={styles.tourH3}>{t.title}</h3>
                    {t.body.map((line, i) => (
                      <p key={i} className={styles.tourBody}>
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <div className={styles.tourFrequency}>
              <p className={styles.tourFreqBody}>
                SAREC 将根据项目进度和会员需求,组织美国实地考察、项目走访和专题交流。
              </p>
              <p className={styles.tourFreqBody}>
                考察是会员服务的一部分,非会员可单次报名(需符合资格审核)。
              </p>
              <p className={styles.complianceNote}>
                具体考察时间、内容和费用,在报名沟通后提供。
              </p>
            </div>
          </div>
          <div className={styles.toursMedia}>
            <div className={styles.toursImageBox}>
              <SaImage
                src="/images/projects/1340-glendale-triangle.webp"
                alt="SAREC 项目实地考察 — 1340 Glendale Triangle"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                filterIntensity="none"
                className={styles.toursImage}
              />
            </div>
          </div>
        </div>
      </section>

      {/* E04 — 报名机制(会员 / 非会员 双列对比) */}
      <section className={styles.registerSection}>
        <div className={styles.registerInner}>
          <span className={styles.eyebrow}>HOW TO REGISTER · 如何报名</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            两种参与机制
          </RevealOnView>
          <p className={styles.sectionLead}>
            SAREC 活动的参与机制根据会员身份和活动类型而定。
          </p>
          <div className={styles.registerGrid}>
            <div className={styles.registerImageBox}>
              <SaImage
                src="/images/projects/316-street.webp"
                alt="SAREC 项目实景 — 316 Street"
                fill
                sizes="(max-width: 1024px) 100vw, 28vw"
                filterIntensity="none"
                className={styles.registerImage}
              />
            </div>
            <div className={styles.registerDivider} aria-hidden="true" />
            <div className={styles.registerCol}>
              <h3 className={styles.registerH3}>会员 / Members</h3>
              <p className={styles.registerBody}>
                会员可参加全部活动,包括:
              </p>
              <ul className={styles.registerList}>
                <li>主题培训</li>
                <li>项目研讨</li>
                <li>行业展会与论坛</li>
                <li>美国实地考察(按级别)</li>
              </ul>
              <p className={styles.registerBody}>
                常务理事和副会长单位可参加:
              </p>
              <ul className={styles.registerList}>
                <li>闭门分享</li>
                <li>优先实地考察名额</li>
              </ul>
              <p className={styles.registerBody}>
                详见 →{' '}
                <Link href="/zh/membership" className={styles.inlineLink}>
                  /zh/membership
                </Link>
              </p>
            </div>
            <div className={styles.registerDivider} aria-hidden="true" />
            <div className={styles.registerCol}>
              <h3 className={styles.registerH3}>非会员 / Single Registration</h3>
              <p className={styles.registerBody}>部分公开活动可单次报名。</p>
              <p className={styles.registerLabel}>申请流程:</p>
              <ol className={styles.registerSteps}>
                <li>
                  <span className={styles.registerStepNum}>01</span>
                  <span>提交活动报名表单</span>
                </li>
                <li>
                  <span className={styles.registerStepNum}>02</span>
                  <span>SAREC 团队审核资格(1 个工作日内回复)</span>
                </li>
                <li>
                  <span className={styles.registerStepNum}>03</span>
                  <span>资格通过后,提供活动详情和参与方式</span>
                </li>
              </ol>
              <p className={styles.registerBody}>
                非会员通常无法参加闭门分享和深度考察 —— 这类活动仅向会员开放。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* E05 — FAQ 3 题(<details>/<summary> 同 Membership M06) */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
          <span className={styles.eyebrow}>FAQ · 常见问题</span>
          <RevealOnView as="h2" className={styles.sectionH2}>
            活动常见问题
          </RevealOnView>
          <div className={styles.faqList}>
            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q1</span>
                <span className={styles.faqQText}>活动费用怎么收?</span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>
                  会员可参加大部分活动,不另外付费。美国实地考察等深度活动可能涉及考察成本(差旅、住宿等),按单独协议约定。
                </p>
                <p>非会员单次报名活动按活动类型收费。</p>
                <p>具体费用在报名沟通后提供。</p>
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q2</span>
                <span className={styles.faqQText}>活动多久举办一次?</span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>SAREC 不设固定频次。</p>
                <p>
                  活动根据项目进度、会员需求、行业动态组织。会员可获得活动安排的优先通知。
                </p>
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                <span className={styles.faqQNum}>Q3</span>
                <span className={styles.faqQText}>
                  中国大陆的客户可以报名吗?
                </span>
                <span className={styles.faqChevron} aria-hidden="true">
                  +
                </span>
              </summary>
              <div className={styles.faqAnswer}>
                <p>可以。</p>
                <p>
                  SAREC 会员和活动面向全球华人房地产相关客户,包括美国本地、中国大陆、海外华人圈。
                </p>
                <p>
                  中国大陆客户报名美国实地考察时,建议提前安排签证和行程。
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* E06 — CTA Banner(上下金线 + 3 CTA,与 Founder F07 同款) */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <RevealOnView as="h2" className={styles.ctaH2}>
            准备好参加 SAREC 活动了吗
          </RevealOnView>
          <p className={styles.ctaSubtitle}>活动不是入门,是合作的开始。</p>
          <div className={styles.ctaRow}>
            <Link href="/zh/contact" className={styles.ctaPrimary}>
              报名活动 / 参加考察团
            </Link>
            <Link href="/zh/membership" className={styles.ctaSecondary}>
              加入会员,参与全部活动
            </Link>
            <Link href="/zh/services" className={styles.ctaSecondary}>
              查看服务入口
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
